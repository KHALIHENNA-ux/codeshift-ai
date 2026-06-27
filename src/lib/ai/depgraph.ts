// Dependency analysis for the cross-file coherence engine.
//
// Parses imports out of the legacy codebase, resolves them to project files,
// builds a module dependency graph, and topologically sorts it leaves-first so
// the migrator rewrites a file only after every module it imports is already
// migrated. Language-aware enough for the supported source stacks (JS/TS, PHP,
// Python). Deterministic and dependency-free — no AST libraries, no model calls.

export type SourceLang = "javascript" | "typescript" | "php" | "python" | "other"

export function langOf(path: string): SourceLang {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  if (["js", "jsx", "mjs", "cjs"].includes(ext)) return "javascript"
  if (["ts", "tsx"].includes(ext)) return "typescript"
  if (ext === "php") return "php"
  if (ext === "py") return "python"
  return "other"
}

// ─────────────────────────── path helpers ───────────────────────────
// All paths are normalized to forward slashes with no leading "./".

export function norm(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/")
}

function dirname(p: string): string {
  const i = norm(p).lastIndexOf("/")
  return i === -1 ? "" : p.slice(0, i)
}

function join(base: string, rel: string): string {
  const parts = (base ? base.split("/") : []).concat(rel.split("/"))
  const out: string[] = []
  for (const part of parts) {
    if (part === "" || part === ".") continue
    if (part === "..") out.pop()
    else out.push(part)
  }
  return out.join("/")
}

// ─────────────────────────── import extraction ───────────────────────────

interface ImportSite {
  spec: string // the raw specifier as written ("./api", "../js/api", "services.api")
  pre: string // text before the specifier (for reconstruction)
  post: string // text after the specifier
  full: string // the whole matched substring
}

// Per-language import-statement matchers. Each captures (pre)(spec)(post) so a
// reconciler can swap the spec while preserving surrounding syntax.
const PATTERNS: Record<SourceLang, RegExp[]> = {
  javascript: jsPatterns(),
  typescript: jsPatterns(),
  php: [
    /(\b(?:require|include)(?:_once)?\s*\(?\s*['"])([^'"]+)(['"])/g,
  ],
  python: [
    /^(\s*from\s+)([.\w]+)(\s+import\b)/gm,
    /^(\s*import\s+)([.\w]+)/gm,
  ],
  other: [],
}

function jsPatterns(): RegExp[] {
  return [
    // import ... from "spec"  /  export ... from "spec"
    /(\b(?:import|export)\b[^;\n]*?\bfrom\s*['"])([^'"]+)(['"])/g,
    // bare:  import "spec"
    /(\bimport\s*['"])([^'"]+)(['"])/g,
    // require("spec") / import("spec")
    /(\b(?:require|import)\s*\(\s*['"])([^'"]+)(['"]\s*\))/g,
  ]
}

function importSites(content: string, lang: SourceLang): ImportSite[] {
  const sites: ImportSite[] = []
  for (const re of PATTERNS[lang]) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) {
      sites.push({ pre: m[1], spec: m[2], post: m[3] ?? "", full: m[0] })
    }
  }
  return sites
}

/**
 * Rewrite import specifiers in-place via a callback. The callback receives each
 * specifier and returns a replacement, or null to leave it untouched. Returns
 * the new content and how many specifiers were changed. Shared by the graph
 * builder (collect only) and the coherence import reconciler (rewrite).
 */
export function transformImports(
  content: string,
  lang: SourceLang,
  fn: (spec: string) => string | null,
): { content: string; count: number } {
  let count = 0
  let out = content
  for (const re of PATTERNS[lang]) {
    re.lastIndex = 0
    out = out.replace(re, (full, pre: string, spec: string, post = "") => {
      const next = fn(spec)
      if (next && next !== spec) {
        count++
        return `${pre}${next}${post}`
      }
      return full
    })
  }
  return { content: out, count }
}

// ─────────────────────────── import resolution ───────────────────────────

const EXTS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".php", ".py"]
const INDEXES = ["/index.ts", "/index.tsx", "/index.js", "/index.jsx", "/__init__.py"]

/**
 * Resolve an import specifier (written in file `from`) to a concrete project
 * file path, or null if it points outside the project (a real package). Handles
 * relative paths, root-relative paths, the "@/" → "src/" alias, and Python
 * dotted modules. `paths` is the set of normalized project file paths.
 */
export function resolveImport(
  spec: string,
  from: string,
  paths: Set<string>,
  lang: SourceLang,
): string | null {
  const candidates: string[] = []

  if (lang === "python") {
    // Dotted module → slash path, relative to the file's package or root.
    const dotted = spec.replace(/^\.+/, "")
    const slash = dotted.replace(/\./g, "/")
    const leadingDots = spec.match(/^\.+/)?.[0].length ?? 0
    if (leadingDots > 0) {
      let base = dirname(from)
      for (let i = 1; i < leadingDots; i++) base = dirname(base)
      candidates.push(join(base, slash))
    }
    candidates.push(slash)
  } else if (spec.startsWith(".")) {
    candidates.push(join(dirname(from), spec))
  } else if (spec.startsWith("@/")) {
    candidates.push(join("src", spec.slice(2)))
    candidates.push(spec.slice(2))
  } else {
    // Could be root-relative ("js/api") or a real package. Try as root-relative.
    candidates.push(norm(spec))
  }

  for (const c of candidates) {
    for (const ext of EXTS) {
      if (paths.has(c + ext)) return c + ext
    }
    for (const idx of INDEXES) {
      if (paths.has(c + idx)) return c + idx
    }
  }
  return null
}

// ─────────────────────────── graph + ordering ───────────────────────────

export interface DepGraph {
  // file → set of project files it imports (its dependencies)
  dependsOn: Map<string, Set<string>>
  // file → set of project files that import it (its dependents)
  dependents: Map<string, Set<string>>
}

export function buildDependencyGraph(
  files: { path: string; content: string }[],
): DepGraph {
  const paths = new Set(files.map((f) => norm(f.path)))
  const dependsOn = new Map<string, Set<string>>()
  const dependents = new Map<string, Set<string>>()
  for (const f of files) {
    dependsOn.set(norm(f.path), new Set())
    dependents.set(norm(f.path), new Set())
  }

  for (const f of files) {
    const from = norm(f.path)
    const lang = langOf(from)
    if (lang === "other") continue
    for (const site of importSites(f.content, lang)) {
      const target = resolveImport(site.spec, from, paths, lang)
      if (target && target !== from) {
        dependsOn.get(from)!.add(target)
        dependents.get(target)!.add(from)
      }
    }
  }

  return { dependsOn, dependents }
}

/**
 * Leaves-first topological order over the given files: a file appears only after
 * all of its (in-scope) dependencies. Kahn's algorithm, ties broken by path for
 * determinism. Files in an import cycle are appended in stable order so a cycle
 * can never drop a file — any residual breakage is left to the verifier.
 */
export function topoOrder(
  files: { path: string }[],
  graph: DepGraph,
): string[] {
  const scope = new Set(files.map((f) => norm(f.path)))
  const scopeList = Array.from(scope)
  // Count only dependencies that are themselves in scope (rewritable).
  const indeg = new Map<string, number>()
  for (const p of scopeList) {
    const deps = Array.from(graph.dependsOn.get(p) ?? []).filter((d) => scope.has(d) && d !== p)
    indeg.set(p, deps.length)
  }

  const order: string[] = []
  const placed = new Set<string>()
  const ready = scopeList.filter((p) => (indeg.get(p) ?? 0) === 0).sort()
  const queued = new Set(ready)

  while (ready.length) {
    const p = ready.shift()!
    order.push(p)
    placed.add(p)
    const dependentsOfP = Array.from(graph.dependents.get(p) ?? [])
      .filter((d) => scope.has(d))
      .sort()
    for (const d of dependentsOfP) {
      indeg.set(d, (indeg.get(d) ?? 0) - 1)
      if ((indeg.get(d) ?? 0) <= 0 && !queued.has(d) && !placed.has(d)) {
        queued.add(d)
        ready.push(d)
      }
    }
    ready.sort()
  }

  // Anything left is in a cycle — append deterministically.
  if (order.length < scope.size) {
    for (const p of scopeList.sort()) {
      if (!placed.has(p)) {
        order.push(p)
        placed.add(p)
      }
    }
  }
  return order
}
