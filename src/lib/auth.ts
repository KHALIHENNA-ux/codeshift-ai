import NextAuth, { type NextAuthConfig } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(creds) {
      const email = creds?.email as string | undefined
      const password = creds?.password as string | undefined
      if (!email || !password) return null
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user?.passwordHash) return null
      const ok = await bcrypt.compare(password, user.passwordHash)
      if (!ok) return null
      return { id: user.id, name: user.name, email: user.email, image: user.image }
    },
  }),
]

// Only register OAuth providers that are actually configured.
if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      // `repo` lets the migration engine list and fetch the user's repositories.
      // Users who signed in before this scope existed must sign in again to grant it.
      authorization: { params: { scope: "read:user user:email repo" } },
    }),
  )
}
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  )
}

// OAuth tokens live in the encrypted JWT cookie only — never in the database.
const adapter = PrismaAdapter(prisma)
const linkAccount = adapter.linkAccount!.bind(adapter)
adapter.linkAccount = (account) =>
  linkAccount({
    ...account,
    access_token: undefined,
    refresh_token: undefined,
    id_token: undefined,
  })

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  // Self-hosted (Cloudflare Workers): the host comes from the request, not Vercel's env.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, account }) {
      // On GitHub sign-in, keep the access token inside the encrypted JWT
      // cookie. Server routes read it via getGithubToken() — it must never be
      // copied onto `session`, which /api/auth/session sends to the browser.
      if (account?.provider === "github" && account.access_token) {
        token.githubAccessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub
      if (session.user) session.user.githubConnected = Boolean(token.githubAccessToken)
      return session
    },
  },
})
