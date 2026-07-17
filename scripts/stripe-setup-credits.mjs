// Creates the three CodeShift credit-pack Products + Prices in Stripe TEST
// mode and prints the env lines to copy. Refuses to run with a live key.
//
// Usage:  STRIPE_SECRET_KEY_TEST=sk_test_... node scripts/stripe-setup-credits.mjs
//    or:  node scripts/stripe-setup-credits.mjs sk_test_...
//
// Live mode is intentionally NOT automated — create the live Products/Prices
// from the Stripe Dashboard and set STRIPE_PRICE_* to the live price IDs.

import Stripe from "stripe"

const key = process.env.STRIPE_SECRET_KEY_TEST || process.argv[2]
if (!key) {
  console.error("Provide a TEST secret key: STRIPE_SECRET_KEY_TEST=sk_test_... node scripts/stripe-setup-credits.mjs")
  process.exit(1)
}
if (!/^(sk|rk)_test_/.test(key)) {
  console.error("Refusing to run: the key is not a TEST key (must start with sk_test_ / rk_test_).")
  process.exit(1)
}

const stripe = new Stripe(key)

// Names are prefixed "CodeShift –" because the Stripe account is shared.
const PACKS = [
  { env: "STRIPE_PRICE_STARTER", name: "CodeShift – Starter (25 credits)", credits: 25, usd: 29 },
  { env: "STRIPE_PRICE_PRO", name: "CodeShift – Pro (75 credits)", credits: 75, usd: 79 },
  { env: "STRIPE_PRICE_SCALE", name: "CodeShift – Scale (200 credits)", credits: 200, usd: 179 },
]

const lines = []
for (const pack of PACKS) {
  // Idempotent-ish: reuse an existing product with the same name if present.
  const existing = (await stripe.products.search({ query: `name:"${pack.name}" AND active:"true"` })).data[0]
  const product =
    existing ??
    (await stripe.products.create({
      name: pack.name,
      description: `${pack.credits} migration credits for CodeShift (one-time purchase).`,
      metadata: { app: "codeshift", credits: String(pack.credits) },
    }))

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 })
  const price =
    prices.data.find((p) => p.unit_amount === pack.usd * 100 && p.currency === "usd") ??
    (await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: pack.usd * 100,
      metadata: { app: "codeshift", credits: String(pack.credits) },
    }))

  console.log(`${pack.name}: product=${product.id} price=${price.id} ($${pack.usd})`)
  lines.push(`${pack.env}=${price.id}`)
}

console.log("\nAdd to .env / .dev.vars (test) — replace with live price IDs in production:\n")
console.log(lines.join("\n"))
