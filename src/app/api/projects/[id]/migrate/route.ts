import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { runMigration } from "@/lib/ai/migrator"
import type { EngineEvent } from "@/types"

export const maxDuration = 800

// Streaming migration. Returns Server-Sent Events; the client renders the live
// rewrite (tokens, per-file diffs, progress) and we persist results as we go.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const designStyle = (body.designStyle as string) || "keep"
  const overridePath = body.pathId as string | undefined

  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { files: true, analysis: true },
  })
  if (!project) return new Response("Not found", { status: 404 })

  const pathId = overridePath || project.sourcePath || project.analysis?.recommendedPath
  if (!pathId) {
    return new Response("Project must be analyzed first.", { status: 400 })
  }

  // Reset any prior migration for a clean re-run.
  const migration = await prisma.migration.upsert({
    where: { projectId: project.id },
    create: { projectId: project.id, status: "PLANNING", startedAt: new Date() },
    update: {
      status: "PLANNING",
      progress: 0,
      startedAt: new Date(),
      finishedAt: null,
      files: { deleteMany: {} },
    },
  })
  await prisma.project.update({
    where: { id: project.id },
    data: { status: "MIGRATING", designStyle },
  })

  const sourceByPath = new Map(project.files.map((f) => [f.path, f.id]))
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: EngineEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))

      try {
        for await (const event of runMigration({
          pathId,
          designStyle,
          files: project.files.map((f) => ({ path: f.path, content: f.content })),
        })) {
          send(event)

          // Persist as the engine emits — survives a dropped connection.
          if (event.type === "plan") {
            await prisma.migration.update({
              where: { id: migration.id },
              data: { plan: event.plan as object, status: "REWRITING" },
            })
          } else if (event.type === "file_done") {
            const f = event.file
            await prisma.migratedFile.create({
              data: {
                migrationId: migration.id,
                sourceFileId: f.replaces ? sourceByPath.get(f.replaces) ?? null : null,
                path: f.path,
                content: f.content,
                language: f.language,
                explanation: f.explanation,
                isNew: f.isNew,
                testContent: f.test,
                verified: f.verification?.verified ?? false,
                confidence: f.verification?.confidence ?? 0,
                behaviorParity: f.verification?.behaviorParity ?? 0,
                repairRounds: f.verification?.rounds ?? 0,
                diagnostics: (f.verification?.diagnostics ?? []) as object,
              },
            })
          } else if (event.type === "progress") {
            await prisma.migration.update({
              where: { id: migration.id },
              data: { progress: event.progress, currentStep: event.step },
            })
          } else if (event.type === "docs") {
            await prisma.migration.update({
              where: { id: migration.id },
              data: { readme: event.readme, apiDocs: event.apiDocs, status: "DOCUMENTING" },
            })
          } else if (event.type === "usage") {
            await prisma.migration.update({
              where: { id: migration.id },
              data: { tokensUsed: event.tokens, cacheReadTokens: event.cacheReadTokens },
            })
          } else if (event.type === "done") {
            await prisma.migration.update({
              where: { id: migration.id },
              data: { status: "DONE", progress: 100, finishedAt: new Date() },
            })
            await prisma.project.update({
              where: { id: project.id },
              data: { status: "COMPLETED" },
            })
          }
        }
      } catch (e) {
        send({ type: "error", message: (e as Error).message })
        await prisma.migration.update({
          where: { id: migration.id },
          data: { status: "FAILED" },
        })
        await prisma.project.update({ where: { id: project.id }, data: { status: "FAILED" } })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
