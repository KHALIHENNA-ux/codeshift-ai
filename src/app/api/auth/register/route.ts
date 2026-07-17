import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { SIGNUP_BONUS_CREDITS } from "@/lib/credits"

const Body = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 })
  }
  const { name, email, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  // The signup bonus rides in the same create — impossible to grant twice.
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      creditTransactions: {
        create: { amount: SIGNUP_BONUS_CREDITS, type: "SIGNUP_BONUS" },
      },
    },
  })

  return NextResponse.json({ ok: true })
}
