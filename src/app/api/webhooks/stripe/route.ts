import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
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
    const projectId = cs.metadata?.projectId
    if (projectId) {
      await prisma.project.update({
        where: { id: projectId },
        data: { paid: true },
      })
    }
  }

  return NextResponse.json({ received: true })
}
