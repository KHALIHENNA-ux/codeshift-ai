// Exercises the credits ledger end-to-end against the real DB (no AI calls,
// no Stripe network calls — pure ledger logic).
// Run: node --env-file=.env --import tsx scripts/test-credits.ts

// The shared "@/lib/prisma" client is pinned to the Workers wasm build, which
// can't initialize under plain Node — use the native client and inject it.
import { PrismaClient } from "@prisma/client"
import {
  estimateCost,
  getBalance,
  grantSignupBonus,
  reserveCredits,
  refundCredits,
  recordPurchase,
  InsufficientCreditsError,
  SIGNUP_BONUS_CREDITS,
  BYTES_PER_CREDIT,
} from "@/lib/credits"

const prisma = new PrismaClient()

let failures = 0
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`)
  if (!ok) failures++
}

async function main() {
const email = `credits-test-${Date.now()}@codeshift.local`
const user = await prisma.user.create({ data: { email, name: "Credits Test" } })
const MIG_A = `test-mig-a-${Date.now()}`
const MIG_B = `test-mig-b-${Date.now()}`

try {
  // estimateCost (pure)
  check("estimateCost: 0 bytes → 1 (minimum)", estimateCost(0) === 1)
  check("estimateCost: 1 byte → 1", estimateCost(1) === 1)
  check("estimateCost: exactly 100 KB → 1", estimateCost(BYTES_PER_CREDIT) === 1)
  check("estimateCost: 100 KB + 1 byte → 2 (ceil)", estimateCost(BYTES_PER_CREDIT + 1) === 2)
  check("estimateCost: 1 MB → 11", estimateCost(1024 * 1024) === Math.ceil((1024 * 1024) / BYTES_PER_CREDIT))

  // signup bonus, idempotent
  await grantSignupBonus(user.id, prisma)
  await grantSignupBonus(user.id, prisma)
  const afterBonus = await getBalance(user.id, prisma)
  check(`signup bonus granted once (balance=${afterBonus})`, afterBonus === SIGNUP_BONUS_CREDITS)

  // simple reserve
  await reserveCredits(user.id, 1, MIG_A, prisma)
  check("reserve 1 credit", (await getBalance(user.id, prisma)) === SIGNUP_BONUS_CREDITS - 1)

  // insufficient balance → clear error
  let threw = false
  try {
    await reserveCredits(user.id, 999, MIG_A, prisma)
  } catch (e) {
    threw = e instanceof InsufficientCreditsError && e.balance === SIGNUP_BONUS_CREDITS - 1 && e.cost === 999
    check("insufficient error carries balance+cost", threw, (e as Error).message)
  }
  if (!threw) check("insufficient error thrown", false)

  // concurrency: two simultaneous reserves of 2 with balance 2 → exactly one wins
  const bal = await getBalance(user.id, prisma) // 2
  const results = await Promise.allSettled([
    reserveCredits(user.id, bal, MIG_B, prisma),
    reserveCredits(user.id, bal, MIG_B, prisma),
  ])
  const wins = results.filter((r) => r.status === "fulfilled").length
  check(`concurrent double-spend blocked (1 of 2 succeeded, got ${wins})`, wins === 1)
  check("balance is 0 after race", (await getBalance(user.id, prisma)) === 0)

  // refund, idempotent
  const r1 = await refundCredits(MIG_B, prisma)
  const r2 = await refundCredits(MIG_B, prisma)
  check(`refund returns consumed amount (${r1})`, r1 === bal)
  check("second refund is a no-op", r2 === 0)
  check("balance restored after refund", (await getBalance(user.id, prisma)) === bal)

  // purchase, idempotent on payment intent
  const pi = `pi_test_${Date.now()}`
  const p1 = await recordPurchase(user.id, 25, pi, prisma)
  const p2 = await recordPurchase(user.id, 25, pi, prisma)
  check("purchase credited", p1.credited === true)
  check("replayed webhook ignored", p2.credited === false)
  check("balance includes purchase once", (await getBalance(user.id, prisma)) === bal + 25)

  // ledger sanity
  const ledger = await prisma.creditTransaction.findMany({ where: { userId: user.id } })
  const sum = ledger.reduce((s, t) => s + t.amount, 0)
  check(`ledger sum equals balance (${sum})`, sum === (await getBalance(user.id, prisma)))
} finally {
  await prisma.user.delete({ where: { id: user.id } }) // cascades the ledger
  await prisma.$disconnect()
}

console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} TEST(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
