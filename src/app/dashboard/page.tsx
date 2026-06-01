import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatBytes, relativeTime } from "@/lib/utils"
import { FileCode2, Plus, ArrowRight, Boxes } from "lucide-react"

const STATUS_VARIANT: Record<string, "secondary" | "default" | "accent" | "success" | "warning" | "danger"> = {
  UPLOADED: "secondary",
  ANALYZING: "warning",
  ANALYZED: "accent",
  MIGRATING: "warning",
  COMPLETED: "success",
  FAILED: "danger",
}

export default async function DashboardPage() {
  const session = await auth()
  const projects = await prisma.project.findMany({
    where: { userId: session!.user.id },
    orderBy: { updatedAt: "desc" },
    include: { analysis: true },
  })

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your projects</h1>
          <p className="mt-1 text-muted-foreground">
            Upload a legacy codebase to analyze and modernize it.
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="border-gradient flex flex-col items-center justify-center py-20 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-secondary">
            <Boxes className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-6 text-xl font-semibold">No projects yet</h2>
          <p className="mt-2 max-w-sm text-muted-foreground">
            Drop in a .zip of the code you're scared to touch. We'll handle the rest.
          </p>
          <Button asChild variant="gradient" className="mt-6">
            <Link href="/dashboard/projects/new">
              <Plus className="h-4 w-4" /> New project
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const stack = p.detectedStack as { framework?: string; language?: string } | null
            return (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
                <Card className="card-hover h-full p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary">
                      <FileCode2 className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"}>
                      {p.status.toLowerCase()}
                    </Badge>
                  </div>
                  <h3 className="truncate text-lg font-semibold">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stack?.framework ? `${stack.framework} · ` : ""}
                    {p.fileCount} files · {formatBytes(p.totalBytes)}
                  </p>
                  {p.targetStack && (
                    <p className="mt-3 truncate font-mono text-xs text-accent">→ {p.targetStack}</p>
                  )}
                  <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{relativeTime(p.updatedAt)}</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
