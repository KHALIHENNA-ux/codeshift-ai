import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { LandingNav } from "@/components/landing/nav"
import { Footer } from "@/components/landing/sections"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MIGRATION_PATHS } from "@/lib/migration-paths"
import { MIGRATION_SEO, SITE } from "@/lib/seo"
import { JsonLd } from "@/components/seo/json-ld"

export const metadata: Metadata = {
  title: "Supported Code Migrations — PHP, jQuery, WordPress, Python & more",
  description:
    "Every legacy-to-modern migration CodeShift automates: PHP to Laravel, jQuery to React, WordPress to Next.js, Python 2 to 3, AngularJS to React, vanilla JS to Vue 3.",
  alternates: { canonical: "/migrations" },
}

export default function MigrationsPage() {
  return (
    <>
      <LandingNav />
      <main className="container pb-24 pt-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
            Migration paths
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Legacy code migrations, automated end to end
          </h1>
          <p className="mt-4 text-balance text-muted-foreground">
            Pick your legacy stack. CodeShift analyzes the codebase, plans the migration, rewrites
            it in dependency order, and verifies every file for behavior parity — in hours, not
            months.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {MIGRATION_PATHS.map((p) => {
            const seo = MIGRATION_SEO[p.id]
            return (
              <Link key={p.id} href={`/migrations/${seo.slug}`} className="group">
                <Card className="card-hover h-full p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">{p.from}</Badge>
                    <Badge
                      style={{ backgroundColor: `${p.accent}22`, color: p.accent }}
                      className="font-mono"
                    >
                      {p.to}
                    </Badge>
                    <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </div>
                  <h2 className="mb-2 font-semibold">{p.label}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{p.description}</p>
                  <p className="mt-4 font-mono text-xs text-foreground/80">{p.toStack}</p>
                </Card>
              </Link>
            )
          })}
        </div>
      </main>
      <Footer />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "CodeShift supported code migrations",
          itemListElement: MIGRATION_PATHS.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: p.label,
            url: `${SITE.url}/migrations/${MIGRATION_SEO[p.id].slug}`,
          })),
        }}
      />
    </>
  )
}
