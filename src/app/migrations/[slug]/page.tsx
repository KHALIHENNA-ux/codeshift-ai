import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, Check, ScanSearch, GitBranch, Wand2, ShieldCheck } from "lucide-react"
import { LandingNav } from "@/components/landing/nav"
import { Footer } from "@/components/landing/sections"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MIGRATION_PATHS, getPath } from "@/lib/migration-paths"
import { MIGRATION_SEO, SLUG_TO_ID, SITE } from "@/lib/seo"
import { JsonLd, faqPageLd } from "@/components/seo/json-ld"

export function generateStaticParams() {
  return Object.values(MIGRATION_SEO).map((seo) => ({ slug: seo.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const id = SLUG_TO_ID[params.slug]
  const seo = id ? MIGRATION_SEO[id] : undefined
  if (!seo) return {}
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: `/migrations/${seo.slug}` },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${SITE.url}/migrations/${seo.slug}`,
      type: "website",
    },
  }
}

const ENGINE_STEPS = [
  {
    icon: ScanSearch,
    title: "Analyze",
    body: "The whole repository is scanned: framework and version detected, every dependency mapped, risks flagged before a line is touched.",
  },
  {
    icon: GitBranch,
    title: "Plan",
    body: "A dependency-aware migration plan orders files leaves-first, so everything a file imports is migrated before the file itself.",
  },
  {
    icon: Wand2,
    title: "Rewrite",
    body: "Each file is restructured into modern, idiomatic architecture — streamed live, with already-migrated symbols kept consistent across files.",
  },
  {
    icon: ShieldCheck,
    title: "Verify",
    body: "Every file passes structural checks and an adversarial behavior-parity review; failures are repaired automatically before you see them.",
  },
]

export default function MigrationLandingPage({ params }: { params: { slug: string } }) {
  const id = SLUG_TO_ID[params.slug]
  const path = id ? getPath(id) : undefined
  const seo = id ? MIGRATION_SEO[id] : undefined
  if (!path || !seo) notFound()

  const others = MIGRATION_PATHS.filter((p) => p.id !== id)

  return (
    <>
      <LandingNav />
      <main className="pb-24 pt-32">
        {/* Hero */}
        <section className="container">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/migrations" className="hover:text-foreground">Migrations</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{path.label}</span>
          </nav>
          <div className="max-w-3xl">
            <div className="mb-5 flex items-center gap-3">
              <Badge variant="outline" className="font-mono">{path.from}</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge
                style={{ backgroundColor: `${path.accent}22`, color: path.accent }}
                className="font-mono"
              >
                {path.to}
              </Badge>
            </div>
            <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              {seo.h1}
            </h1>
            {seo.intro.map((para) => (
              <p key={para.slice(0, 40)} className="mt-5 text-lg leading-relaxed text-muted-foreground">
                {para}
              </p>
            ))}
            <p className="mt-5 font-mono text-sm text-foreground/80">Target stack: {path.toStack}</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild variant="gradient" size="lg">
                <Link href="/register">Migrate my codebase free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/migrations">All migration paths</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              First migration on us · No credit card required
            </p>
          </div>
        </section>

        {/* What changes */}
        <section className="container mt-24">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            What actually gets modernized
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {seo.changes.map(([from, to]) => (
              <Card key={from} className="p-5">
                <p className="text-sm text-muted-foreground line-through decoration-border">{from}</p>
                <div className="my-2 flex items-center gap-2 text-emerald-400">
                  <Check className="h-4 w-4" />
                  <p className="text-sm font-medium text-foreground">{to}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* How the engine works */}
        <section className="container mt-24">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            How the migration engine works
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {ENGINE_STEPS.map((s, i) => (
              <Card key={s.title} className="relative overflow-hidden p-6">
                <span className="absolute right-4 top-4 font-mono text-5xl font-bold text-secondary">
                  {i + 1}
                </span>
                <s.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="container mt-24">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {path.label}: frequently asked questions
          </h2>
          <div className="mt-6 max-w-3xl divide-y divide-border/50">
            {seo.faq.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Other paths */}
        <section className="container mt-24">
          <h2 className="text-xl font-semibold tracking-tight">Other supported migrations</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {others.map((p) => (
              <Link
                key={p.id}
                href={`/migrations/${MIGRATION_SEO[p.id].slug}`}
                className="rounded-full border border-border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {p.label}
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mt-24">
          <Card className="border-gradient relative overflow-hidden p-12 text-center">
            <div className="glow absolute inset-0" />
            <h2 className="text-balance text-3xl font-bold tracking-tight">
              Ready to modernize your {path.from} codebase?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Upload it or import from GitHub — analysis is free and takes minutes.
            </p>
            <div className="mt-8">
              <Button asChild variant="gradient" size="lg">
                <Link href="/register">Start your free migration</Link>
              </Button>
            </div>
          </Card>
        </section>
      </main>
      <Footer />

      <JsonLd data={faqPageLd(seo.faq)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
            { "@type": "ListItem", position: 2, name: "Migrations", item: `${SITE.url}/migrations` },
            { "@type": "ListItem", position: 3, name: path.label, item: `${SITE.url}/migrations/${seo.slug}` },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: `${path.label} migration`,
          serviceType: "AI code migration",
          description: seo.description,
          provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
          areaServed: "Worldwide",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            description: "First migration free; subsequent projects priced $500–$2,000 by size and complexity.",
          },
        }}
      />
    </>
  )
}
