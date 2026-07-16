import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getGithubToken } from "@/lib/github/token"
import { GitHubAuthError, GitHubApiError } from "@/lib/github/client"
import { fetchRepoCodebase } from "@/lib/github/fetch"
import { CodebaseTooLargeError } from "@/lib/parsers/tarball"
import { quickDetect } from "@/lib/ai/analyzer"

export const maxDuration = 120

// Imports a GitHub repository as a new Project — the GitHub-source twin of
// /api/upload. Downloads the default-branch tarball with the user's token and
// extracts source files in memory, then the normal analyze/migrate flow runs.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = await getGithubToken(req)
  if (!token) {
    return NextResponse.json(
      {
        error: "No GitHub account connected. Sign in with GitHub to import a repository.",
        code: "github_not_connected",
      },
      { status: 401 },
    )
  }

  const body = (await req.json().catch(() => null)) as {
    fullName?: string
    name?: string
  } | null
  const fullName = body?.fullName?.trim()
  if (!fullName) {
    return NextResponse.json({ error: "Missing repository name." }, { status: 400 })
  }

  let codebase
  try {
    codebase = await fetchRepoCodebase(token, fullName)
  } catch (err) {
    if (err instanceof GitHubAuthError) {
      return NextResponse.json(
        {
          error:
            "Your GitHub access has expired or was revoked. Please sign in with GitHub again.",
          code: "github_token_invalid",
        },
        { status: 401 },
      )
    }
    if (err instanceof CodebaseTooLargeError) {
      return NextResponse.json({ error: err.message }, { status: 413 })
    }
    if (err instanceof GitHubApiError && err.status === 404) {
      return NextResponse.json(
        { error: "Repository not found or you don't have access to it." },
        { status: 404 },
      )
    }
    return NextResponse.json(
      { error: "Could not fetch the repository from GitHub. Please try again." },
      { status: 502 },
    )
  }

  if (codebase.files.length === 0) {
    return NextResponse.json(
      { error: "No source files found in this repository." },
      { status: 400 },
    )
  }

  // Same fast pre-detection as the .zip path, so the project card shows
  // something useful before full analysis runs.
  let detected: { framework: string; language: string; confidence: string } | null = null
  try {
    detected = await quickDetect(codebase.files)
  } catch {
    // non-fatal — full analysis will detect properly
  }

  const totalBytes = codebase.files.reduce((s, f) => s + f.bytes, 0)

  const project = await prisma.project.create({
    data: {
      userId: session.user.id,
      name: body?.name?.trim() || codebase.repoName,
      status: "UPLOADED",
      fileCount: codebase.files.length,
      totalBytes,
      detectedStack: detected ?? undefined,
      files: {
        create: codebase.files.map((f) => ({
          path: f.path,
          content: f.content,
          language: f.language,
          bytes: f.bytes,
        })),
      },
    },
  })

  return NextResponse.json({
    projectId: project.id,
    fileCount: codebase.files.length,
    detected,
  })
}
