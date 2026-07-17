import type { Metadata } from "next"
import { LandingNav } from "@/components/landing/nav"
import { Pricing, Footer } from "@/components/landing/sections"

export const metadata: Metadata = {
  title: "Pricing — Pay Per Migration, First One Free",
  description:
    "CodeShift pricing: your first AI code migration is free, no credit card required. After that, pay per project ($500–$2,000 by codebase size and complexity) — no subscriptions.",
  alternates: { canonical: "/pricing" },
}

export default function PricingPage() {
  return (
    <>
      <LandingNav />
      <main className="pt-24">
        <h1 className="sr-only">CodeShift pricing — pay per code migration, first migration free</h1>
        <Pricing />
      </main>
      <Footer />
    </>
  )
}
