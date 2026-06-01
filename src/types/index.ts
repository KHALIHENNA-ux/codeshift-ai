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

export interface RewrittenFile {
  path: string
  content: string
  language: string
  explanation: string
  isNew: boolean
  test?: string
  replaces?: string // source path
}

// Streaming events emitted by the engine to the client (SSE).
export type EngineEvent =
  | { type: "phase"; phase: string; message: string }
  | { type: "progress"; progress: number; step?: string }
  | { type: "plan"; plan: MigrationPlan }
  | { type: "file_start"; path: string }
  | { type: "file_token"; text: string }
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
