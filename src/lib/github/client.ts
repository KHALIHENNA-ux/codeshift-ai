import "server-only"

const API_BASE = "https://api.github.com"

/** The user's token was rejected by GitHub (expired, revoked, or missing scope). */
export class GitHubAuthError extends Error {
  constructor() {
    super("GitHub rejected the access token")
    this.name = "GitHubAuthError"
  }
}

/** Any other non-OK GitHub API response. Carries the status, never the body. */
export class GitHubApiError extends Error {
  constructor(public readonly status: number) {
    super(`GitHub API responded with ${status}`)
    this.name = "GitHubApiError"
  }
}

/**
 * Authenticated fetch against the GitHub REST API. Throws GitHubAuthError on
 * 401 so callers can tell "reconnect GitHub" apart from other failures.
 * Error messages never include the token or GitHub response bodies.
 */
export async function ghFetch(token: string, path: string): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      // GitHub rejects requests without a User-Agent.
      "User-Agent": "codeshift-app",
    },
  })
  if (res.status === 401) throw new GitHubAuthError()
  return res
}
