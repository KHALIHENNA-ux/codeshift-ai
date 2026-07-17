import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { recordPurchase } from "@/lib/credits"
import type Stripe from "stripe"

// Stripe sends raw bytes; we must verify the signature against the raw body.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })

  const sig = req.headers.get("stripe-signature")
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 })

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret)
  } catch (e) {
    return NextResponse.json({ error: `Signature verification failed: ${(e as Error).message}` }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const cs = event.data.object as Stripe.Checkout.Session

    // Legacy per-project payment flow.
    const projectId = cs.metadata?.projectId
    if (projectId) {
      await prisma.project.update({
        where: { id: projectId },
        data: { paid: true },
      })
    }

    // Credit-pack purchase. The amount comes exclusively from the metadata we
    // set server-side at session creation, behind the verified signature.
    const userId = cs.metadata?.userId
    const credits = Number(cs.metadata?.credits)
    if (userId && Number.isInteger(credits) && credits > 0 && !projectId) {
      if (cs.payment_status !== "paid") {
        return NextResponse.json({ received: true, credited: false, reason: "not_paid" })
      }
      const paymentIntentId =
        typeof cs.payment_intent === "string" ? cs.payment_intent : cs.payment_intent?.id
      if (!paymentIntentId) {
        return NextResponse.json({ error: "Missing payment intent" }, { status: 400 })
      }
      // Idempotent: stripePaymentIntentId is unique, replayed events are no-ops.
      const { credited } = await recordPurchase(userId, credits, paymentIntentId)
      return NextResponse.json({ received: true, credited })
    }
  }

  return NextResponse.json({ received: true })
}
