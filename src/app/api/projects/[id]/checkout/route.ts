import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe, isStripeConfigured } from "@/lib/stripe"

// Creates a Stripe Checkout session for a single migration. Returns a URL the
// client redirects to. The webhook marks the project paid on completion.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured. Set STRIPE_SECRET_KEY to enable paid migrations." },
      { status: 503 },
    )
  }

  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    success_url: `${appUrl}/dashboard/projects/${project.id}?paid=1`,
    cancel_url: `${appUrl}/dashboard/projects/${project.id}`,
    client_reference_id: project.id,
    metadata: { projectId: project.id, userId: session.user.id },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: project.priceCents,
          product_data: {
            name: `CodeShift migration — ${project.name}`,
            description: project.targetStack ?? "Legacy code modernization",
          },
        },
      },
    ],
  })

  return NextResponse.json({ url: checkout.url })
}
