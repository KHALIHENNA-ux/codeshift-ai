import { LandingNav } from "@/components/landing/nav"
import { Pricing, Footer } from "@/components/landing/sections"

export const metadata = { title: "Pricing — CodeShift" }

export default function PricingPage() {
  return (
    <>
      <LandingNav />
      <main className="pt-24">
        <Pricing />
      </main>
      <Footer />
    </>
  )
}
