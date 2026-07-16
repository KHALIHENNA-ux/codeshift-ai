import "server-only"
import { ghFetch, GitHubApiError } from "@/lib/github/client"
import { parseTarGz, CodebaseTooLargeError } from "@/lib/parsers/tarball"
import type { ParsedFile } from "@/lib/parsers/zip"

// GitHub's `size` field is the repo's approximate disk usage in KB. Reject
// obviously huge repos before downloading anything — the in-memory caps in
// parseTarGz are the real guard, this just saves the bandwidth.
const MAX_REPO_SIZE_KB = 150_000 // ~150 MB

const FULL_NAME_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

export interface RepoCodebase {
  files: ParsedFile[]
  defaultBranch: string
  repoName: string
}

/**
 * Fetch a repository's source as the migration engine expects it: resolve the
 * default branch, download the tarball through the GitHub API with the user's
 * token, and extract text source files entirely in memory (Workers have no
 * filesystem and no git).
 */
export async function fetchRepoCodebase(token: string, fullName: string): Promise<RepoCodebase> {
  if (!FULL_NAME_RE.test(fullName)) {
    throw new GitHubApiError(400)
  }

  const metaRes = await ghFetch(token, `/repos/${fullName}`)
  if (!metaRes.ok) throw new GitHubApiError(metaRes.status)
  const meta = (await metaRes.json()) as {
    name: string
    default_branch: string
    size: number
  }

  if (meta.size > MAX_REPO_SIZE_KB) {
    throw new CodebaseTooLargeError(
      "This repository is too large to import from GitHub. Upload a .zip of the relevant subfolder instead.",
    )
  }

  // Redirects to codeload.github.com with a pre-signed URL; fetch follows it.
  const tarRes = await ghFetch(
    token,
    `/repos/${fullName}/tarball/${encodeURIComponent(meta.default_branch)}`,
  )
  if (!tarRes.ok) throw new GitHubApiError(tarRes.status)

  const files = await parseTarGz(await tarRes.arrayBuffer())
  return { files, defaultBranch: meta.default_branch, repoName: meta.name }
}
