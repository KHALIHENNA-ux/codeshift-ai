import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      /** Whether a GitHub access token is present in the JWT (the token itself never reaches the client). */
      githubConnected?: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** GitHub OAuth access token — server-side only, read via getGithubToken(). */
    githubAccessToken?: string
  }
}
