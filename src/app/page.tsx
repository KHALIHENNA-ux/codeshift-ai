import { LandingNav } from "@/components/landing/nav"
import { Hero } from "@/components/landing/hero"
import {
  HowItWorks,
  Paths,
  Features,
  Pricing,
  FinalCTA,
  Footer,
} from "@/components/landing/sections"

export default function HomePage() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <Paths />
        <Features />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
