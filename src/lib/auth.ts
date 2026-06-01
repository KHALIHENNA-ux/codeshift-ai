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
  providers.push(GitHub({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET }))
}
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub
      return session
    },
  },
})
