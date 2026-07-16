import "server-only"
import { getToken } from "next-auth/jwt"

/**
 * Read the GitHub access token from the encrypted NextAuth JWT cookie.
 * Server-side only: the token is never placed on the session object, so it
 * never reaches the browser via /api/auth/session.
 */
export async function getGithubToken(req: Request): Promise<string | null> {
  // The cookie is "__Secure-authjs.session-token" when Auth.js runs in secure
  // mode (production, or local dev with an https NEXTAUTH_URL) and
  // "authjs.session-token" otherwise — the request protocol alone doesn't
  // decide it, so try both names.
  for (const secureCookie of [true, false]) {
    const jwt = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie })
    const token = jwt?.githubAccessToken
    if (typeof token === "string" && token.length > 0) return token
  }
  return null
}
