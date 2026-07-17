// One-time backfill after the credits-ledger migration: every user without a
// SIGNUP_BONUS transaction gets one (replaces the dropped User.credits column).
// Run: node --env-file=.env scripts/backfill-signup-bonus.mjs

import { PrismaClient } from "@prisma/client"

const SIGNUP_BONUS_CREDITS = 3
const prisma = new PrismaClient()

const users = await prisma.user.findMany({
  where: { creditTransactions: { none: { type: "SIGNUP_BONUS" } } },
  select: { id: true, email: true },
})

for (const user of users) {
  await prisma.creditTransaction.create({
    data: { userId: user.id, amount: SIGNUP_BONUS_CREDITS, type: "SIGNUP_BONUS" },
  })
  console.log(`+${SIGNUP_BONUS_CREDITS} credits → ${user.email}`)
}
console.log(users.length === 0 ? "Nothing to backfill." : `Backfilled ${users.length} user(s).`)
await prisma.$disconnect()
