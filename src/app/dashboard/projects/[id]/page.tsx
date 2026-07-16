import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AnalysisView } from "@/components/dashboard/analysis-view"
import { MigrationLauncher } from "@/components/dashboard/migration-launcher"
import { AnalyzeTrigger } from "@/components/dashboard/analyze-trigger"
import { formatBytes } from "@/lib/utils"
import { getPath } from "@/lib/migration-paths"
import type { DependencyFinding, RiskFinding, DependencyGraph } from "@/types"
import { FileCode2, Cpu, ShieldCheck, GitCompare, FileText, Target } from "lucide-react"

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const session = await auth()
  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: session!.user.id },
    include: { analysis: true, migration: true },
  })
  if (!project) notFound()

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { credits: true },
  })

  const stack = project.detectedStack as { framework?: string; version?: string; language?: string } | null
  const recommended = getPath(project.analysis?.recommendedPath ?? project.sourcePath ?? "")

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          All projects
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {project.fileCount} files · {formatBytes(project.totalBytes)}
              {stack?.framework ? ` · ${stack.framework} ${stack.version ?? ""}` : ""}
            </p>
          </div>
          <Badge variant="outline" className="text-sm">{project.status.toLowerCase()}</Badge>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat icon={FileCode2} label="Files" value={String(project.fileCount)} />
        <Stat icon={Cpu} label="Language" value={stack?.language ?? "—"} />
        <Stat
          icon={ShieldCheck}
          label="Risk level"
          value={project.riskLevel ?? "—"}
          tone={project.riskLevel === "HIGH" ? "danger" : project.riskLevel === "MEDIUM" ? "warning" : "ok"}
        />
        <Stat icon={Target} label="Target" value={recommended?.to ?? "—"} />
      </div>

      {/* Body by status */}
      {project.status === "UPLOADED" && <AnalyzeTrigger projectId={project.id} />}

      {project.status === "ANALYZING" && (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-4 font-medium">Analyzing your codebase…</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Detecting framework, auditing dependencies, mapping risks. Refresh in a moment.
            </p>
          </CardContent>
        </Card>
      )}

      {project.status === "FAILED" && (
        <Card className="border-red-500/30 py-12">
          <CardContent className="text-center">
            <p className="font-medium text-red-400">Something went wrong.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The engine hit an error. You can re-run the analysis.
            </p>
            <div className="mt-4">
              <AnalyzeTrigger projectId={project.id} label="Retry analysis" />
            </div>
          </CardContent>
        </Card>
      )}

      {project.analysis &&
        (project.status === "ANALYZED" ||
          project.status === "MIGRATING" ||
          project.status === "COMPLETED") && (
          <>
            {project.status === "COMPLETED" && project.migration && (
              <Card className="border-gradient">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
                  <div>
                    <p className="font-semibold">Migration complete 🎉</p>
                    <p className="text-sm text-muted-foreground">
                      {project.targetStack} · {project.migration.tokensUsed.toLocaleString()} tokens used
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button asChild variant="outline">
                      <Link href={`/dashboard/projects/${project.id}/diff`}>
                        <GitCompare className="h-4 w-4" /> View diff
                      </Link>
                    </Button>
                    <Button asChild variant="gradient">
                      <a href={`/api/projects/${project.id}/download`}>
                        <FileText className="h-4 w-4" /> Download project
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
              <AnalysisView
                summary={project.analysis.summary}
                risks={(project.analysis.risks as unknown as RiskFinding[]) ?? []}
                dependencies={(project.analysis.dependencies as unknown as DependencyFinding[]) ?? []}
                graph={(project.analysis.dependencyGraph as unknown as DependencyGraph) ?? { nodes: [], edges: [] }}
              />
              <div className="space-y-6">
                {project.status !== "COMPLETED" && (
                  <MigrationLauncher
                    projectId={project.id}
                    recommendedPath={project.analysis.recommendedPath ?? "CUSTOM"}
                    priceCents={project.priceCents}
                    credits={user?.credits ?? 0}
                  />
                )}
                {project.status === "MIGRATING" && (
                  <Card>
                    <CardContent className="py-5 text-center text-sm text-muted-foreground">
                      A migration is in progress.{" "}
                      <Link
                        href={`/dashboard/projects/${project.id}/migration`}
                        className="text-primary hover:underline"
                      >
                        Watch it live
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ElementType
  label: string
  value: string
  tone?: "default" | "ok" | "warning" | "danger"
}) {
  const toneClass = {
    default: "text-foreground",
    ok: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-red-400",
  }[tone]
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`font-semibold ${toneClass}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
