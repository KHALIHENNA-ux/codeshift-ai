import Stripe from "stripe"

let _stripe: Stripe | null = null

// Lazily initialized so the app boots without Stripe configured (credits still
// work). Billing endpoints surface a clear error if the key is missing.
export function stripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured.")
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
    })
  }
  return _stripe
}

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY)
