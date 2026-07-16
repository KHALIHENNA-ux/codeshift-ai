import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getGithubToken } from "@/lib/github/token"
import { ghFetch, GitHubAuthError } from "@/lib/github/client"

export interface RepoSummary {
  name: string
  fullName: string
  private: boolean
  language: string | null
  /** Approximate repo size in KB, as reported by GitHub. */
  sizeKb: number
  pushedAt: string | null
  defaultBranch: string
}

const PER_PAGE = 100
// Hard cap so a user with thousands of repos can't make the worker spin:
// 10 pages = the user's 1000 most recently pushed repos.
const MAX_PAGES = 10

// Lists the signed-in user's GitHub repositories, most recently pushed first.
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = await getGithubToken(req)
  if (!token) {
    return NextResponse.json(
      {
        error: "No GitHub account connected. Sign in with GitHub to list your repositories.",
        code: "github_not_connected",
      },
      { status: 401 },
    )
  }

  try {
    const repos: RepoSummary[] = []
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await ghFetch(
        token,
        `/user/repos?per_page=${PER_PAGE}&sort=pushed&direction=desc&page=${page}`,
      )
      if (!res.ok) {
        return NextResponse.json(
          { error: "GitHub API request failed. Please try again." },
          { status: 502 },
        )
      }
      const batch = (await res.json()) as Array<{
        name: string
        full_name: string
        private: boolean
        language: string | null
        size: number
        pushed_at: string | null
        default_branch: string
      }>
      repos.push(
        ...batch.map((r) => ({
          name: r.name,
          fullName: r.full_name,
          private: r.private,
          language: r.language,
          sizeKb: r.size,
          pushedAt: r.pushed_at,
          defaultBranch: r.default_branch,
        })),
      )
      if (batch.length < PER_PAGE) break
    }
    return NextResponse.json({ repos })
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
    return NextResponse.json(
      { error: "Could not reach GitHub. Please try again." },
      { status: 502 },
    )
  }
}
