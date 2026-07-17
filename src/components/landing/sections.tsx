import Link from "next/link"
import {
  ScanSearch,
  GitBranch,
  Wand2,
  Palette,
  FlaskConical,
  GitCompare,
  ShieldCheck,
  FileText,
  Rocket,
  Check,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GitHubSignInButton } from "@/components/auth/github-button"
import { MIGRATION_PATHS } from "@/lib/migration-paths"
import { migrationSlug } from "@/lib/seo"

export function HowItWorks() {
  const steps = [
    {
      icon: ScanSearch,
      title: "Analyze",
      body: "CodeShift scans the whole repo, detects the framework and version, maps dependencies, and flags risks before touching a line.",
    },
    {
      icon: GitBranch,
      title: "Plan",
      body: "It proposes a dependency-aware migration plan and the ideal target stack — scaffolding, data layer, logic, UI, tests.",
    },
    {
      icon: Wand2,
      title: "Rewrite",
      body: "The engine restructures your code into modern, idiomatic architecture — not a line-by-line port — streaming it live.",
    },
    {
      icon: Rocket,
      title: "Ship",
      body: "You get a tested, documented, deployable project with a side-by-side diff explaining every decision.",
    },
  ]
  return (
    <section id="how" className="container py-24">
      <SectionHeading
        eyebrow="The workflow"
        title="From scary to shippable in four moves"
        subtitle="No manual rewrite. No month-long project. Upload, review, deploy."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <Card key={s.title} className="card-hover relative overflow-hidden p-6">
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
  )
}

export function Paths() {
  return (
    <section id="paths" className="container py-24">
      <SectionHeading
        eyebrow="Migration paths"
        title="Modern stacks, on rails"
        subtitle="Battle-tested routes today — more added continuously."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {MIGRATION_PATHS.map((p) => (
          <Link key={p.id} href={`/migrations/${migrationSlug(p.id)}`} className="group">
            <Card className="card-hover h-full p-6">
              <div className="mb-4 flex items-center gap-3">
                <Badge variant="outline" className="font-mono">{p.from}</Badge>
                <Badge style={{ backgroundColor: `${p.accent}22`, color: p.accent }} className="font-mono">
                  {p.to}
                </Badge>
              </div>
              <h3 className="mb-2 font-semibold">{p.label}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{p.description}</p>
              <p className="mt-4 font-mono text-xs text-foreground/80">{p.toStack}</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function Features() {
  const features = [
    { icon: ScanSearch, title: "Smart Codebase Analysis", body: "Maps dependencies, detects the framework, and flags risks before any code is touched." },
    { icon: Wand2, title: "Intelligent Rewriting", body: "Restructures following clean architecture and current conventions — not just syntax translation." },
    { icon: Palette, title: "Frontend Redesign on Demand", body: "Rebuild the UI while migrating — modern, responsive, accessible, in the style you pick." },
    { icon: FlaskConical, title: "Auto-Generated Tests", body: "Every migration ships with a test suite, so you know the new code behaves like the old." },
    { icon: GitCompare, title: "Side-by-Side Diff Viewer", body: "Old vs. new, line by line, with an explanation for every decision the engine made." },
    { icon: ShieldCheck, title: "Dependency Modernization", body: "Swaps outdated, vulnerable libraries for secure, maintained alternatives." },
    { icon: FileText, title: "Documentation Generator", body: "Full docs for the migrated codebase — README, API docs, inline comments." },
    { icon: Rocket, title: "One-Click Deploy", body: "Push the modernized app straight to Vercel, Netlify, or your own server." },
  ]
  return (
    <section id="features" className="relative py-24">
      <div className="glow absolute inset-x-0 top-1/4 -z-10 h-[400px] opacity-50" />
      <div className="container">
        <SectionHeading
          eyebrow="Everything in the box"
          title="A full modernization team, automated"
          subtitle="The work of an agency engagement — analysis, rewrite, tests, docs, deploy — in one engine."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="card-hover p-6">
              <f.icon className="mb-4 h-7 w-7 text-accent" />
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Pricing() {
  return (
    <section id="pricing" className="container py-24">
      <SectionHeading
        eyebrow="Pricing"
        title="Pay per migration. No subscriptions."
        subtitle="Priced on codebase size and complexity. Your first migration is free."
      />
      <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
        <Card className="p-8">
          <Badge variant="secondary">Starter</Badge>
          <p className="mt-4 text-4xl font-bold">Free</p>
          <p className="mt-1 text-sm text-muted-foreground">Your first migration, on us.</p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Full codebase analysis", "One complete migration", "Auto-generated tests", "Diff viewer & docs"].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" /> {f}
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" className="mt-8 w-full">
            <Link href="/register">Start free</Link>
          </Button>
          <GitHubSignInButton label="Sign up with GitHub" className="mt-3 w-full" />
        </Card>

        <Card className="border-gradient relative p-8">
          <Badge variant="default">Per project</Badge>
          <p className="mt-4 text-4xl font-bold">
            $500<span className="text-lg font-normal text-muted-foreground">–$2,000</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Based on size & complexity.</p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Everything in Starter",
              "Unlimited file count",
              "Frontend redesign on demand",
              "Dependency modernization",
              "One-click deploy",
              "Priority engine throughput",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" /> {f}
              </li>
            ))}
          </ul>
          <Button asChild variant="gradient" className="mt-8 w-full">
            <Link href="/register">Modernize a project</Link>
          </Button>
          <GitHubSignInButton label="Sign up with GitHub" className="mt-3 w-full" />
        </Card>
      </div>
    </section>
  )
}

export function FinalCTA() {
  return (
    <section className="container py-24">
      <Card className="border-gradient relative overflow-hidden p-12 text-center">
        <div className="glow absolute inset-0" />
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          The code you're scared to touch,
          <br />
          turned into something you're <span className="text-gradient">proud to ship.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Built for freelancers, agencies, and teams sitting on aging code. Stop dreading the rewrite.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild variant="gradient" size="lg">
            <Link href="/register">
              Start your free migration
            </Link>
          </Button>
          <GitHubSignInButton size="lg" />
        </div>
      </Card>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="container">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="font-semibold">CodeShift</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The AI code modernization engine. Legacy codebases analyzed, rewritten, verified and
              tested — in hours, not months.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Migrations</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {MIGRATION_PATHS.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/migrations/${migrationSlug(p.id)}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/migrations" className="transition-colors hover:text-foreground">All migration paths</Link></li>
              <li><Link href="/pricing" className="transition-colors hover:text-foreground">Pricing</Link></li>
              <li><Link href="/register" className="transition-colors hover:text-foreground">Start free</Link></li>
              <li><Link href="/login" className="transition-colors hover:text-foreground">Sign in</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-6 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} CodeShift. The AI Code Modernization Engine.</p>
          <p className="font-mono text-xs">Runs on Claude Opus 4.8</p>
        </div>
      </div>
    </footer>
  )
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle: string
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">{eyebrow}</p>
      <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-3 text-balance text-muted-foreground">{subtitle}</p>
    </div>
  )
}
