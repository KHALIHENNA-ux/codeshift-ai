import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-40 pb-24">
      <div className="bg-grid absolute inset-0 -z-10" />
      <div className="glow absolute inset-x-0 top-0 -z-10 h-[600px]" />

      <div className="container flex flex-col items-center text-center">
        <Link
          href="/register"
          className="group mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Powered by Claude Opus — the most capable code model
        </Link>

        <h1 className="max-w-4xl text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          Turn legacy code into
          <br />
          <span className="text-gradient">modern, shippable apps.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          Upload your old codebase. CodeShift analyzes it, plans the migration, rewrites it into a
          modern stack, tests it, and hands you back a working application —{" "}
          <span className="text-foreground">in hours, not months.</span>
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button asChild variant="gradient" size="lg">
            <Link href="/register">
              Modernize a project free
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#how">See how it works</a>
          </Button>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          First migration on us · No credit card required
        </p>

        {/* terminal-style proof */}
        <div className="mt-16 w-full max-w-3xl border-gradient rounded-2xl bg-card/80 p-1 backdrop-blur">
          <div className="rounded-xl bg-[hsl(222_47%_4%)] p-5 text-left font-mono text-sm">
            <div className="mb-4 flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500/70" />
              <span className="h-3 w-3 rounded-full bg-amber-500/70" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
            </div>
            <p className="text-muted-foreground">
              <span className="text-accent">codeshift</span> analyze ./legacy-shop.zip
            </p>
            <p className="mt-2 text-emerald-400">✓ Detected: PHP 5.6 + jQuery 1.9 · 84 files</p>
            <p className="text-amber-400">⚠ 11 outdated deps · 3 SQL-injection risks flagged</p>
            <p className="text-foreground">Recommended path: PHP to Laravel 11 + React</p>
            <p className="mt-2 text-muted-foreground">
              <span className="text-accent">codeshift</span> migrate --design modern-saas
            </p>
            <p className="mt-2 text-primary">
              ⠿ Rewriting controllers/CheckoutController.php as app/Http/Controllers…
              <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
