import Link from "next/link"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { GitHubSignInButton } from "@/components/auth/github-button"

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="/#how" className="transition-colors hover:text-foreground">How it works</a>
          <Link href="/migrations" className="transition-colors hover:text-foreground">Migrations</Link>
          <a href="/#features" className="transition-colors hover:text-foreground">Features</a>
          <Link href="/pricing" className="transition-colors hover:text-foreground">Pricing</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <GitHubSignInButton size="sm" className="hidden sm:inline-flex" />
          <Button asChild variant="gradient" size="sm">
            <Link href="/register">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
