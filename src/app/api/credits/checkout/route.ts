import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { stripe, isStripeConfigured } from "@/lib/stripe"
import { CREDIT_PACKS, type CreditPackKey } from "@/lib/credits"

// Creates a Stripe Checkout session (one-time payment) for a credit pack.
// The pack — and therefore the credited amount — is resolved server-side;
// the client only ever names a pack key.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured. Set STRIPE_SECRET_KEY." },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const packKey = body.pack as CreditPackKey | undefined
  const pack = packKey ? CREDIT_PACKS[packKey] : undefined
  if (!pack) {
    return NextResponse.json({ error: "Unknown pack. Use starter | pro | scale." }, { status: 400 })
  }

  const priceId = process.env[pack.priceEnv]
  if (!priceId) {
    return NextResponse.json(
      { error: `Pack not configured: set ${pack.priceEnv} to a Stripe Price ID.` },
      { status: 503 },
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    success_url: `${appUrl}/credits?purchase=success`,
    cancel_url: `${appUrl}/credits?purchase=cancelled`,
    client_reference_id: session.user.id,
    // The webhook credits from this metadata after verifying the signature.
    metadata: { userId: session.user.id, credits: String(pack.credits) },
    line_items: [{ price: priceId, quantity: 1 }],
  })

  return NextResponse.json({ url: checkout.url })
}
