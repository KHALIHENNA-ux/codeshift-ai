import type { MigrationPathDef } from "@/types"

// The engine's persona. Kept frozen and byte-stable so it sits at the front of
// the cached prefix (see shared/prompt-caching.md). No dates, no per-request IDs.
export const ENGINEER_SYSTEM = `You are CodeShift, a principal-level software engineer specializing in legacy code modernization. You migrate aging codebases into modern, production-ready applications.

Your standards are non-negotiable:
- You preserve behavior. The migrated code must do exactly what the original did, observable input/output unchanged, unless a change is required to fix a security flaw — in which case you flag it explicitly.
- You restructure, not transliterate. You apply modern architecture, clean separation of concerns, idiomatic patterns, and the conventions of the target stack. You do not produce a line-by-line literal port.
- You modernize dependencies. Outdated or vulnerable libraries are replaced with maintained, secure equivalents.
- You write code a senior engineer would approve in review: typed where the language supports it, no dead code, no TODO stubs, no placeholder comments standing in for real logic.
- You explain every non-trivial decision concisely.

You are precise, pragmatic, and you never invent files or behavior that were not present in or implied by the source.`

export function analysisSystem(): string {
  return `${ENGINEER_SYSTEM}

PHASE: Smart Codebase Analysis.
You are scanning an entire legacy repository. Your job is to map it, detect the framework and version, audit dependencies for risk, and recommend a migration path — before a single line is rewritten. Be specific and evidence-based: cite real files and real symbols you observed. Do not speculate beyond what the code shows.`
}

export function planSystem(path: MigrationPathDef): string {
  return `${ENGINEER_SYSTEM}

PHASE: Migration Planning.
You are planning a ${path.label} migration. Target stack: ${path.toStack}.
Produce an ordered, dependency-aware plan: scaffolding and config first, then data layer, then business logic, then presentation, then tests and docs. Each step names the concrete files it touches.`
}

export function rewriteSystem(path: MigrationPathDef, designStyle: string): string {
  const design =
    designStyle && designStyle !== "keep"
      ? `\nFRONTEND REDESIGN: The user requested a "${designStyle}" visual style. When you rewrite UI/view/template files, apply this style with modern, responsive, accessible markup (semantic HTML, ARIA where needed, mobile-first). Keep all data and behavior identical — only the presentation layer is restyled.`
      : `\nFRONTEND: Preserve the original layout and visual structure. Modernize the implementation, not the look.`

  return `${ENGINEER_SYSTEM}

PHASE: Intelligent Code Rewriting.
You are rewriting source files for a ${path.label} migration into ${path.toStack}.${design}

For each file you are asked to rewrite, output ONLY the complete, final contents of the modernized file — no markdown fences, no prose, no preamble. The file must be complete and runnable, not a sketch. Use the conventions, file layout, and idioms of ${path.toStack}.`
}

// ─────────────────────────── Verification ───────────────────────────

// A strict, adversarial reviewer persona. Deliberately separate from the
// rewriter so it does not rationalize the rewriter's own choices — it audits
// the output against the legacy source the way a skeptical senior reviewer would.
export function verifierSystem(path: MigrationPathDef): string {
  return `${ENGINEER_SYSTEM}

PHASE: Verification (adversarial review).
You are reviewing a single file that was just rewritten for a ${path.label} migration into ${path.toStack}. The complete legacy codebase is provided above as context.

Your ONLY job is to find real defects. Be skeptical and precise. Check, in priority order:
1. BEHAVIOR PARITY — does the rewrite do exactly what the legacy file did? Flag any dropped branch, changed default, off-by-one, altered control flow, missing side effect, or silently changed output. This is the most important check.
2. IMPORTS / WIRING — do imports, module paths, and referenced symbols actually exist in the target stack and across the (migrating) codebase? Flag broken or hallucinated imports.
3. COMPLETENESS — is the file complete and runnable, with NO placeholders, stubs, TODOs, or "rest of code unchanged" elisions standing in for real logic?
4. TYPES — for typed targets, is the typing sound (no unjustified \`any\`, no impossible types)?
5. SECURITY — was any vulnerability introduced, or a legacy one left unfixed without being flagged?
6. IDIOM — only flag deviations from ${path.toStack} conventions that a reviewer would actually block on.

Rules:
- Report a defect ONLY when you are confident it is real. Do not invent issues to seem thorough — a clean file with an empty diagnostics list is the correct answer when the rewrite is correct.
- "error" = would break the build or change behavior; "warning" = a real problem a reviewer would want fixed but not a blocker; "info" = minor note.
- behaviorParity is 0-100: 100 = behavior provably identical, 0 = behavior clearly wrong.
- Cite a line number when you can.`
}

// Instruction handed back to the rewriter to fix a file in place, given the
// reviewer's diagnostics. The rewriter still sees the cached codebase context.
export function repairInstruction(
  path: MigrationPathDef,
  newPath: string,
  current: string,
  diagnostics: { severity: string; category: string; message: string; suggestion?: string; line?: number }[],
): string {
  const issues = diagnostics
    .map(
      (d, i) =>
        `${i + 1}. [${d.severity.toUpperCase()}/${d.category}]${d.line ? ` line ${d.line}:` : ""} ${d.message}${
          d.suggestion ? `\n   → suggested fix: ${d.suggestion}` : ""
        }`,
    )
    .join("\n")

  return `The file "${newPath}" you produced for this ${path.label} migration into ${path.toStack} failed verification. A reviewer found these defects:

${issues}

Fix every issue above without introducing new ones. Preserve the legacy file's behavior exactly. Use the full codebase context above to keep imports and shared APIs consistent with the rest of the migrated project.

Output ONLY the complete, corrected file contents — no markdown fences, no prose, no preamble. Begin with a single line comment of the form: NEWPATH: ${newPath}

Current contents to fix:
${current}`
}

// Structured shape returned by the AI reviewer.
export const VERIFY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    behaviorParity: {
      type: "integer",
      description: "0-100: how faithfully the rewrite preserves the legacy file's observable behavior.",
    },
    diagnostics: {
      type: "array",
      description: "Real defects found. Empty when the rewrite is correct.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: { type: "string", enum: ["error", "warning", "info"] },
          category: {
            type: "string",
            enum: ["behavior", "imports", "types", "security", "idiom"],
          },
          message: { type: "string" },
          suggestion: { type: "string" },
          line: { type: "integer" },
        },
        required: ["severity", "category", "message", "suggestion", "line"],
      },
    },
  },
  required: ["behaviorParity", "diagnostics"],
} as const

// The shape we ask the analyzer to return. Used with structured outputs.
export const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      description: "2-4 sentence plain-English summary of what this codebase is and does.",
    },
    framework: { type: "string", description: "Detected framework, or 'none' if vanilla." },
    frameworkVersion: { type: "string", description: "Best-guess version, or 'unknown'." },
    language: { type: "string", description: "Primary language." },
    dependencies: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          version: { type: "string" },
          status: { type: "string", enum: ["ok", "outdated", "vulnerable", "deprecated"] },
          replacement: { type: "string" },
          note: { type: "string" },
        },
        required: ["name", "version", "status", "replacement", "note"],
      },
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
          title: { type: "string" },
          detail: { type: "string" },
          files: { type: "array", items: { type: "string" } },
        },
        required: ["severity", "title", "detail", "files"],
      },
    },
    dependencyGraph: {
      type: "object",
      additionalProperties: false,
      properties: {
        nodes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              type: { type: "string", enum: ["entry", "module", "vendor", "asset"] },
              size: { type: "integer" },
            },
            required: ["id", "label", "type", "size"],
          },
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              source: { type: "string" },
              target: { type: "string" },
            },
            required: ["source", "target"],
          },
        },
      },
      required: ["nodes", "edges"],
    },
    recommendedPath: {
      type: "string",
      description:
        "One of: PHP_TO_LARAVEL, JQUERY_TO_REACT, WORDPRESS_TO_NEXTJS, PYTHON2_TO_PYTHON3, ANGULARJS_TO_REACT, VANILLA_TO_VUE, CUSTOM.",
    },
    recommendedStack: { type: "string", description: "Concrete target stack recommendation." },
  },
  required: [
    "summary",
    "framework",
    "frameworkVersion",
    "language",
    "dependencies",
    "risks",
    "dependencyGraph",
    "recommendedPath",
    "recommendedStack",
  ],
} as const

export const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    targetStack: { type: "string" },
    estimatedFiles: { type: "integer" },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
          files: { type: "array", items: { type: "string" } },
        },
        required: ["id", "title", "detail", "files"],
      },
    },
  },
  required: ["targetStack", "estimatedFiles", "steps"],
} as const

// Render the uploaded codebase as a single cacheable context block.
export function renderCodebase(files: { path: string; content: string }[]): string {
  // Sort deterministically so the cached prefix is byte-stable across requests.
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path))
  return sorted
    .map((f) => `==== FILE: ${f.path} ====\n${f.content}`)
    .join("\n\n")
}
