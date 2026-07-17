import { prisma } from "@/lib/prisma"
import type { Prisma, PrismaClient } from "@prisma/client"

// ───────────────────────────── Constants ─────────────────────────────

/** Credits granted once at signup. */
export const SIGNUP_BONUS_CREDITS = 3

/** One credit is charged per started slice of source this big. */
export const BYTES_PER_CREDIT = 100 * 1024 // 100 KB

/**
 * The three one-time credit packs. Price IDs come from env (test vs live);
 * `usd` is display-only — the amount actually charged is the Stripe Price.
 */
export const CREDIT_PACKS = {
  starter: { name: "Starter", credits: 25, usd: 29, priceEnv: "STRIPE_PRICE_STARTER" },
  pro: { name: "Pro", credits: 75, usd: 79, priceEnv: "STRIPE_PRICE_PRO" },
  scale: { name: "Scale", credits: 200, usd: 179, priceEnv: "STRIPE_PRICE_SCALE" },
} as const

export type CreditPackKey = keyof typeof CREDIT_PACKS

export class InsufficientCreditsError extends Error {
  constructor(
    public readonly balance: number,
    public readonly cost: number,
  ) {
    super(`Insufficient credits: this migration costs ${cost} credit${cost === 1 ? "" : "s"} but your balance is ${balance}.`)
    this.name = "InsufficientCreditsError"
  }
}

// ───────────────────────────── Reads ─────────────────────────────

type Tx = Prisma.TransactionClient | PrismaClient

// Every write helper takes an optional client so scripts/tests can pass a
// plain-Node PrismaClient (the shared `prisma` is pinned to the Workers wasm
// build, which cannot initialize outside a bundler).
type Client = Pick<PrismaClient, "$transaction" | "creditTransaction">

async function sumBalance(db: Tx, userId: string): Promise<number> {
  const agg = await db.creditTransaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  })
  return agg._sum.amount ?? 0
}

/** A user's balance is the sum of their ledger — never a stored column. */
export function getBalance(userId: string, db: Client = prisma): Promise<number> {
  return sumBalance(db as PrismaClient, userId)
}

/** 1 credit per started 100 KB of source, minimum 1. */
export function estimateCost(codebaseSizeBytes: number): number {
  return Math.max(1, Math.ceil(codebaseSizeBytes / BYTES_PER_CREDIT))
}

// ───────────────────────────── Writes ─────────────────────────────

/**
 * Atomically debit `amount` credits for a migration.
 *
 * The balance check and the CONSUMPTION insert run in ONE DB transaction with
 * the user row locked (SELECT … FOR UPDATE), so two concurrent migrations
 * cannot both pass the check and spend the same credits.
 */
export async function reserveCredits(
  userId: string,
  amount: number,
  migrationId: string,
  db: Client = prisma,
): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`Invalid credit amount: ${amount}`)

  await db.$transaction(async (tx) => {
    // Serialize all credit writes for this user.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`

    const balance = await sumBalance(tx, userId)
    if (balance < amount) throw new InsufficientCreditsError(balance, amount)

    await tx.creditTransaction.create({
      data: { userId, amount: -amount, type: "CONSUMPTION", migrationId },
    })
  })
}

/**
 * Refund whatever a migration consumed and hasn't been refunded yet.
 * Idempotent: calling it twice (or after a partial refund) is a no-op —
 * refundable = -(sum of CONSUMPTION) - (sum of REFUND) for the migration.
 */
export async function refundCredits(migrationId: string, db: Client = prisma): Promise<number> {
  return db.$transaction(async (tx) => {
    const rows = await tx.creditTransaction.findMany({
      where: { migrationId },
      select: { userId: true, amount: true, type: true },
    })
    if (rows.length === 0) return 0

    const userId = rows[0].userId
    // Lock the user row so a concurrent refund/reserve can't interleave.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`

    const fresh = await tx.creditTransaction.findMany({
      where: { migrationId },
      select: { amount: true, type: true },
    })
    const consumed = fresh.filter((r) => r.type === "CONSUMPTION").reduce((s, r) => s + r.amount, 0)
    const refunded = fresh.filter((r) => r.type === "REFUND").reduce((s, r) => s + r.amount, 0)
    const refundable = -consumed - refunded
    if (refundable <= 0) return 0

    await tx.creditTransaction.create({
      data: { userId, amount: refundable, type: "REFUND", migrationId },
    })
    return refundable
  })
}

/** Grant the signup bonus exactly once per user. Safe to call repeatedly. */
export async function grantSignupBonus(userId: string, db: Client = prisma): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
    const existing = await tx.creditTransaction.findFirst({
      where: { userId, type: "SIGNUP_BONUS" },
      select: { id: true },
    })
    if (existing) return
    await tx.creditTransaction.create({
      data: { userId, amount: SIGNUP_BONUS_CREDITS, type: "SIGNUP_BONUS" },
    })
  })
}

/**
 * Credit a Stripe purchase. Idempotent via the unique stripePaymentIntentId:
 * a replayed webhook event inserts nothing and reports `credited: false`.
 */
export async function recordPurchase(
  userId: string,
  credits: number,
  stripePaymentIntentId: string,
  db: Client = prisma,
): Promise<{ credited: boolean }> {
  if (!Number.isInteger(credits) || credits <= 0) throw new Error(`Invalid purchase amount: ${credits}`)
  try {
    await db.creditTransaction.create({
      data: { userId, amount: credits, type: "PURCHASE", stripePaymentIntentId },
    })
    return { credited: true }
  } catch (e) {
    // P2002 = unique violation → this payment intent was already processed.
    if ((e as { code?: string }).code === "P2002") return { credited: false }
    throw e
  }
}
