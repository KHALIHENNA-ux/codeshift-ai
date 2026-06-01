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
