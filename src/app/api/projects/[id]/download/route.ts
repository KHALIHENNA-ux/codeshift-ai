import JSZip from "jszip"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/utils"

// Bundles the modernized project (code + tests + docs) into a downloadable zip.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { migration: { include: { files: true } } },
  })
  if (!project?.migration) return new Response("No migration found", { status: 404 })

  const zip = new JSZip()
  for (const f of project.migration.files) {
    zip.file(f.path, f.content)
    if (f.testContent) {
      // co-locate generated tests under a tests/ mirror
      zip.file(`tests/${f.path}`, f.testContent)
    }
  }
  if (project.migration.readme) zip.file("README.md", project.migration.readme)
  if (project.migration.apiDocs) zip.file("docs/API.md", project.migration.apiDocs)

  const blob = await zip.generateAsync({ type: "uint8array" })
  const name = slugify(project.name) || "codeshift-export"

  return new Response(blob as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}-modernized.zip"`,
    },
  })
}
