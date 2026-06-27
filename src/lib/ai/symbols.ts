// Target-state symbol map for the cross-file coherence engine.
//
// As each file is migrated, its public interface (new path, exports, rough
// signatures) and its import specifier are recorded here. This map is the source
// of truth for what the *already-migrated* world looks like, so a later file can
// be generated against the new exports and paths instead of the legacy ones.
//
// Deterministic, no model calls: export extraction is heuristic per target
// language (TS/JS first-class; Python/PHP best-effort). Residual inaccuracy is
// fine — the verifier + self-repair loop (pillar #1) catches anything missed.

import {
  langOf,
  norm,
  resolveImport,
  transformImports,
  type SourceLang,
} from "./depgraph"
import type { ModuleExport } from "@/types"

export interface SymbolMapEntry {
  legacyPath: string
  newPath: string
  moduleSpecifier: string // how other files should import this module
  language: string
  exports: ModuleExport[]
}

export class SymbolMap {
  private byLegacy = new Map<string, SymbolMapEntry>()

  register(entry: SymbolMapEntry) {
    this.byLegacy.set(norm(entry.legacyPath), entry)
  }

  get(legacyPath: string): SymbolMapEntry | undefined {
    return this.byLegacy.get(norm(legacyPath))
  }

  has(legacyPath: string): boolean {
    return this.byLegacy.has(norm(legacyPath))
  }

  get size(): number {
    return this.byLegacy.size
  }

  // The new import specifier for a legacy module, if it was renamed/moved.
  specifierFor(legacyPath: string): string | null {
    return this.byLegacy.get(norm(legacyPath))?.moduleSpecifier ?? null
  }
}

// ─────────────────────────── module specifier ───────────────────────────

const STRIP_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py)$/

// How another file should import this module given its new path + language.
export function moduleSpecifierFor(newPath: string): string {
  const p = norm(newPath)
  const lang = langOf(p)
  if (lang === "python") {
    return p.replace(/\.py$/, "").replace(/\//g, ".").replace(/^src\./, "")
  }
  if (lang === "php") {
    return p // include/require style; Laravel `use` is handled by the model
  }
  // JS/TS (and .vue): drop the extension, prefer the "@/" alias for src/.
  if (p.endsWith(".vue")) {
    return p.startsWith("src/") ? "@/" + p.slice(4) : "./" + p
  }
  const noExt = p.replace(STRIP_EXT, "")
  return noExt.startsWith("src/") ? "@/" + noExt.slice(4) : noExt
}

// ─────────────────────────── export extraction ───────────────────────────

function cap(s: string, n = 120): string {
  const oneLine = s.replace(/\s+/g, " ").trim()
  return oneLine.length > n ? oneLine.slice(0, n) + "…" : oneLine
}

export function extractExports(content: string, newPath: string): ModuleExport[] {
  const lang = langOf(newPath)
  if (lang === "javascript" || lang === "typescript") return extractJsExports(content, newPath)
  if (lang === "python") return extractPyExports(content)
  if (lang === "php") return extractPhpExports(content)
  if (newPath.endsWith(".vue")) return [{ name: componentName(newPath), kind: "component" }]
  return []
}

function componentName(path: string): string {
  const base = norm(path).split("/").pop() ?? path
  return base.replace(/\.[^.]+$/, "")
}

function extractJsExports(content: string, newPath: string): ModuleExport[] {
  const out: ModuleExport[] = []
  const seen = new Set<string>()
  const push = (name: string, kind: ModuleExport["kind"], signature?: string) => {
    const key = `${kind}:${name}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(signature ? { name, kind, signature: cap(signature) } : { name, kind })
  }

  const matchers: [RegExp, ModuleExport["kind"]][] = [
    [/export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)[^{\n]*/g, "function"],
    [/export\s+class\s+([A-Za-z_$][\w$]*)[^{\n]*/g, "class"],
    [/export\s+interface\s+([A-Za-z_$][\w$]*)[^{\n]*/g, "interface"],
    [/export\s+type\s+([A-Za-z_$][\w$]*)[^=\n]*/g, "type"],
    [/export\s+enum\s+([A-Za-z_$][\w$]*)/g, "enum"],
    [/export\s+const\s+([A-Za-z_$][\w$]*)[^=\n]*/g, "const"],
  ]
  for (const [re, kind] of matchers) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) push(m[1], kind, m[0])
  }

  // default export — capture the bound name when there is one
  const def = content.match(
    /export\s+default\s+(?:(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|class\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*))/,
  )
  if (def) {
    push(def[1] || def[2] || def[3] || componentName(newPath), "default")
  } else if (/export\s+default\b/.test(content)) {
    push(componentName(newPath), "default")
  }

  // named export / re-export lists:  export { a, b as c }
  const listRe = /export\s*\{([^}]*)\}/g
  let lm: RegExpExecArray | null
  while ((lm = listRe.exec(content)) !== null) {
    for (const piece of lm[1].split(",")) {
      const name = piece.trim().split(/\s+as\s+/).pop()?.trim()
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) push(name, "variable")
    }
  }

  return out
}

function extractPyExports(content: string): ModuleExport[] {
  const out: ModuleExport[] = []
  const matchers: [RegExp, ModuleExport["kind"]][] = [
    [/^(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\([^)]*\)[^:\n]*/gm, "function"],
    [/^class\s+([A-Za-z_]\w*)[^:\n]*/gm, "class"],
    [/^([A-Za-z_]\w*)\s*[:=]/gm, "variable"],
  ]
  for (const [re, kind] of matchers) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) {
      const name = m[1]
      if (name.startsWith("_")) continue // private by convention
      out.push(kind === "variable" ? { name, kind } : { name, kind, signature: cap(m[0]) })
    }
  }
  return dedupe(out)
}

function extractPhpExports(content: string): ModuleExport[] {
  const out: ModuleExport[] = []
  const matchers: [RegExp, ModuleExport["kind"]][] = [
    [/^\s*(?:abstract\s+|final\s+)?class\s+([A-Za-z_]\w*)[^{\n]*/gm, "class"],
    [/^\s*interface\s+([A-Za-z_]\w*)[^{\n]*/gm, "interface"],
    [/^\s*trait\s+([A-Za-z_]\w*)/gm, "class"],
    [/^\s*function\s+([A-Za-z_]\w*)\s*\([^)]*\)[^{\n]*/gm, "function"],
  ]
  for (const [re, kind] of matchers) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) out.push({ name: m[1], kind, signature: cap(m[0]) })
  }
  return dedupe(out)
}

function dedupe(list: ModuleExport[]): ModuleExport[] {
  const seen = new Set<string>()
  return list.filter((e) => {
    const k = `${e.kind}:${e.name}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// ─────────────────────── migrated-dependency context ───────────────────────

/**
 * Render the "already-migrated dependencies" block injected into a rewrite
 * prompt. Tells the model the NEW import paths, exports, and signatures of the
 * modules this file depends on, so its imports resolve against the migrated
 * world on the first try. Goes in the user message (NOT the cached system
 * block) since it changes per file and must not disturb the cache prefix.
 */
export function renderMigratedDeps(deps: SymbolMapEntry[]): string {
  if (!deps.length) return ""
  const blocks = deps
    .map((d) => {
      const ex = d.exports.length
        ? d.exports.map((e) => `    - ${e.signature ?? `${e.kind} ${e.name}`}`).join("\n")
        : "    - (no public exports detected)"
      const names = d.exports
        .filter((e) => e.kind !== "default")
        .map((e) => e.name)
        .slice(0, 8)
      const hint = names.length
        ? `import { ${names.join(", ")} } from "${d.moduleSpecifier}"`
        : `import x from "${d.moduleSpecifier}"`
      return `• ${d.legacyPath}  →  ${d.newPath}\n  import path: "${d.moduleSpecifier}"\n  exports:\n${ex}\n  e.g. ${hint}`
    })
    .join("\n\n")

  return `\n\nALREADY-MIGRATED DEPENDENCIES — these modules this file imports have already been migrated. Import from their NEW paths/specifiers and use their NEW exports and signatures below. Do NOT reference the legacy filenames or pre-migration APIs:\n\n${blocks}\n`
}

// ─────────────────────────── import reconciliation ───────────────────────────

/**
 * Deterministic safety net: after generation, rewrite any import in the file
 * that still points at a legacy module which has since been moved/renamed, so it
 * targets the module's NEW specifier. Conservative — only rewrites specifiers
 * that demonstrably resolve to a known migrated legacy file, so it can't corrupt
 * a correct import. Returns the patched content and the number of rewrites.
 */
export function reconcileImports(
  content: string,
  legacyFromPath: string,
  legacyPaths: Set<string>,
  symbols: SymbolMap,
): { content: string; count: number } {
  const fromLang: SourceLang = langOf(legacyFromPath)
  if (fromLang === "other") return { content, count: 0 }

  return transformImports(content, fromLang, (spec) => {
    const target = resolveImport(spec, norm(legacyFromPath), legacyPaths, fromLang)
    if (!target) return null
    const newSpec = symbols.specifierFor(target)
    if (newSpec && newSpec !== spec) return newSpec
    return null
  })
}
