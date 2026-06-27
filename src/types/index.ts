// Shared domain types used across the engine, API, and UI.

export type DependencyStatus = "ok" | "outdated" | "vulnerable" | "deprecated"

export interface DependencyFinding {
  name: string
  version: string
  status: DependencyStatus
  replacement?: string
  note?: string
}

export type RiskSeverity = "low" | "medium" | "high" | "critical"

export interface RiskFinding {
  severity: RiskSeverity
  title: string
  detail: string
  files: string[]
}

export interface GraphNode {
  id: string
  label: string
  type: "entry" | "module" | "vendor" | "asset"
  size: number
}

export interface GraphEdge {
  source: string
  target: string
}

export interface DependencyGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface AnalysisReport {
  summary: string
  framework: string | null
  frameworkVersion: string | null
  language: string | null
  dependencies: DependencyFinding[]
  risks: RiskFinding[]
  dependencyGraph: DependencyGraph
  recommendedPath: string
  recommendedStack: string
}

export interface MigrationStep {
  id: string
  title: string
  detail: string
  files: string[]
  status: "pending" | "active" | "done"
}

export interface MigrationPlan {
  targetStack: string
  steps: MigrationStep[]
  estimatedFiles: number
}

// ─────────────────────────── Verification ───────────────────────────
// The closed-loop verifier inspects every rewritten file (deterministic
// structural checks + an AI behavior-parity review), and the engine repairs
// failures before the file is accepted. This is what makes output "proven".

export type DiagnosticSeverity = "error" | "warning" | "info"

export type DiagnosticCategory =
  | "structure" // truncation, placeholders, leftover fences (deterministic)
  | "syntax" // unbalanced brackets / parse failure (deterministic)
  | "behavior" // observable behavior drifted from the legacy source
  | "imports" // broken / inconsistent imports or module references
  | "types" // type errors or unsound typing
  | "security" // a vulnerability introduced or left unfixed
  | "idiom" // not idiomatic for the target stack

export interface Diagnostic {
  severity: DiagnosticSeverity
  category: DiagnosticCategory
  message: string
  suggestion?: string
  line?: number
}

export interface VerificationResult {
  verified: boolean // accepted: no errors and confidence over threshold
  confidence: number // 0-100, combined structural + behavior-parity score
  behaviorParity: number // 0-100, how faithfully behavior is preserved
  diagnostics: Diagnostic[]
  rounds: number // self-repair rounds taken to reach this state
}

// ─────────────────────────── Cross-file coherence ───────────────────────────
// The coherence engine migrates in dependency order and feeds each file the
// already-migrated exports/paths of its dependencies, so imports resolve against
// the migrated world on the first try instead of generating fresh mismatches.

export interface ModuleExport {
  name: string
  kind:
    | "function"
    | "class"
    | "const"
    | "type"
    | "interface"
    | "enum"
    | "component"
    | "default"
    | "variable"
  signature?: string
}

export interface CoherenceInfo {
  dependenciesInjected: number // migrated deps whose interface was fed into context
  importsReconciled: number // import paths auto-rewritten to the migrated targets
  deps: string[] // new paths of the migrated dependencies referenced
}

export interface RewrittenFile {
  path: string
  content: string
  language: string
  explanation: string
  isNew: boolean
  test?: string
  replaces?: string // source path
  verification?: VerificationResult
  coherence?: CoherenceInfo
}

// Streaming events emitted by the engine to the client (SSE).
export type EngineEvent =
  | { type: "phase"; phase: string; message: string }
  | { type: "progress"; progress: number; step?: string }
  | { type: "plan"; plan: MigrationPlan }
  | { type: "graph"; order: string[] } // dependency-ordered (leaves-first) rewrite sequence
  | { type: "scale"; windows: number; totalTokens: number; budget: number } // pillar #3: repo split into context windows
  | { type: "window"; index: number; total: number; files: number; tokens: number } // entering a context window/batch
  | { type: "coherence"; importsReconciled: number; symbolsInjected: number }
  | { type: "file_start"; path: string }
  | { type: "file_token"; text: string }
  | { type: "verify_start"; path: string; round: number }
  | { type: "verify_result"; path: string; round: number; result: VerificationResult }
  | { type: "repair_start"; path: string; round: number; issues: number }
  | { type: "file_done"; file: RewrittenFile }
  | { type: "docs"; readme?: string; apiDocs?: string }
  | { type: "usage"; tokens: number; cacheReadTokens: number }
  | { type: "done"; message: string }
  | { type: "error"; message: string }

export interface MigrationPathDef {
  id: string
  from: string
  to: string
  label: string
  description: string
  fromLang: string
  toStack: string
  accent: string
  icon: string
}
