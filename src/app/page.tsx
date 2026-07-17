import type { Metadata } from "next"
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
import { FAQ } from "@/components/landing/faq"
import { JsonLd } from "@/components/seo/json-ld"
import { SITE } from "@/lib/seo"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

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
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE.name,
          url: SITE.url,
          logo: `${SITE.url}/icon.svg`,
          description: SITE.description,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE.name,
          url: SITE.url,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: SITE.name,
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Web",
          url: SITE.url,
          description: SITE.description,
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            description: "First migration free; projects from $500 based on size and complexity.",
          },
          featureList: [
            "Automatic legacy code analysis",
            "Dependency-aware AI code rewriting",
            "Behavior-parity verification per file",
            "Auto-generated test suites",
            "Side-by-side diff viewer",
            "PHP to Laravel, jQuery to React, WordPress to Next.js, Python 2 to 3, AngularJS to React, vanilla JS to Vue 3",
          ],
        }}
      />
    </>
  )
}
