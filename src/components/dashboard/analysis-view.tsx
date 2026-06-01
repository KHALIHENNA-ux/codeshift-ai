import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DependencyGraphView } from "./dependency-graph"
import type { DependencyFinding, RiskFinding, DependencyGraph } from "@/types"
import { AlertTriangle, ShieldAlert, PackageX, PackageCheck, Network } from "lucide-react"

const RISK_VARIANT: Record<string, "danger" | "warning" | "secondary"> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "secondary",
}

const DEP_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  ok: "success",
  outdated: "warning",
  deprecated: "warning",
  vulnerable: "danger",
}

export function AnalysisView({
  summary,
  risks,
  dependencies,
  graph,
}: {
  summary: string
  risks: RiskFinding[]
  dependencies: DependencyFinding[]
  graph: DependencyGraph
}) {
  const vulnerable = dependencies.filter((d) => d.status === "vulnerable" || d.status === "deprecated")
  const sortedRisks = [...risks].sort(
    (a, b) => order(b.severity) - order(a.severity),
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What this codebase is</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">{summary}</CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-red-400" />
              Risks flagged
              <Badge variant="secondary">{risks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedRisks.length === 0 && (
              <p className="text-sm text-muted-foreground">No significant risks found.</p>
            )}
            {sortedRisks.map((r, i) => (
              <div key={i} className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    {r.title}
                  </span>
                  <Badge variant={RISK_VARIANT[r.severity] ?? "secondary"}>{r.severity}</Badge>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{r.detail}</p>
                {r.files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.files.slice(0, 4).map((f) => (
                      <code key={f} className="rounded bg-background px-1.5 py-0.5 text-xs text-accent">
                        {f}
                      </code>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Dependencies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageX className="h-4 w-4 text-amber-400" />
              Dependency audit
              <Badge variant="secondary">{dependencies.length}</Badge>
              {vulnerable.length > 0 && (
                <Badge variant="danger">{vulnerable.length} need attention</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dependencies.length === 0 && (
              <p className="text-sm text-muted-foreground">No external dependencies detected.</p>
            )}
            {dependencies.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-mono">{d.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{d.version}</span>
                  {d.replacement && d.replacement !== "none" && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-400">
                      <PackageCheck className="h-3 w-3" /> → {d.replacement}
                    </span>
                  )}
                </div>
                <Badge variant={DEP_VARIANT[d.status] ?? "secondary"}>{d.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Dependency graph */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4 text-primary" />
            Module dependency graph
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DependencyGraphView graph={graph} />
        </CardContent>
      </Card>
    </div>
  )
}

function order(s: string) {
  return { critical: 3, high: 2, medium: 1, low: 0 }[s] ?? 0
}
