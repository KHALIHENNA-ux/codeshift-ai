import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { DiffViewer, type DiffFile } from "@/components/migration/diff-viewer"
import { Download } from "lucide-react"

export default async function DiffPage({ params }: { params: { id: string } }) {
  const session = await auth()
  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: session!.user.id },
    include: {
      migration: {
        include: { files: { include: { sourceFile: true }, orderBy: { path: "asc" } } },
      },
    },
  })
  if (!project?.migration) notFound()

  const files: DiffFile[] = project.migration.files.map((f) => ({
    path: f.path,
    language: f.language ?? "plaintext",
    newContent: f.content,
    oldContent: f.sourceFile?.content ?? null,
    oldPath: f.sourceFile?.path ?? null,
    explanation: f.explanation,
    isNew: f.isNew,
    test: f.testContent,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/dashboard/projects/${project.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to project
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {project.name} <span className="text-muted-foreground">— diff</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Old vs. new, line by line — with the engine's rationale for each file.
          </p>
        </div>
        <Button asChild variant="gradient">
          <a href={`/api/projects/${project.id}/download`}>
            <Download className="h-4 w-4" /> Download project
          </a>
        </Button>
      </div>

      <DiffViewer
        files={files}
        readme={project.migration.readme}
        apiDocs={project.migration.apiDocs}
      />
    </div>
  )
}
