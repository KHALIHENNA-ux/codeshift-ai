import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseZip } from "@/lib/parsers/zip"
import { quickDetect } from "@/lib/ai/analyzer"

export const maxDuration = 120

// Accepts a .zip of a legacy codebase, parses it into source files, runs a
// fast framework pre-detection, and creates a Project.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get("file")
  const name = (form.get("name") as string | null)?.trim()

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 })
  }
  if (!file.name.endsWith(".zip")) {
    return NextResponse.json({ error: "Please upload a .zip archive." }, { status: 400 })
  }

  let files
  try {
    files = await parseZip(await file.arrayBuffer())
  } catch {
    return NextResponse.json({ error: "Could not read the archive." }, { status: 400 })
  }
  if (files.length === 0) {
    return NextResponse.json(
      { error: "No source files found in the archive." },
      { status: 400 },
    )
  }

  // Fast, cheap framework detection so the project card shows something useful
  // immediately, before the full analysis runs.
  let detected: { framework: string; language: string; confidence: string } | null = null
  try {
    detected = await quickDetect(files)
  } catch {
    // non-fatal — full analysis will detect properly
  }

  const totalBytes = files.reduce((s, f) => s + f.bytes, 0)

  const project = await prisma.project.create({
    data: {
      userId: session.user.id,
      name: name || file.name.replace(/\.zip$/i, ""),
      status: "UPLOADED",
      fileCount: files.length,
      totalBytes,
      detectedStack: detected ?? undefined,
      files: {
        create: files.map((f) => ({
          path: f.path,
          content: f.content,
          language: f.language,
          bytes: f.bytes,
        })),
      },
    },
  })

  return NextResponse.json({ projectId: project.id, fileCount: files.length, detected })
}
