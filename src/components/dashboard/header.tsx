import Link from "next/link"
import { signOut } from "@/lib/auth"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LayoutGrid, Plus, LogOut, Coins } from "lucide-react"

// Shared authenticated chrome: dashboard pages and /credits both render it.
export function DashboardHeader({ balance }: { balance: number }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <LayoutGrid className="h-4 w-4" /> Projects
              </Link>
            </Button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/credits" title="Buy credits & view history">
            <Badge variant="outline" className="gap-1.5 transition-colors hover:border-accent">
              <Coins className="h-3.5 w-3.5 text-accent" />
              {balance} credit{balance === 1 ? "" : "s"}
            </Badge>
          </Link>
          <Button asChild variant="gradient" size="sm">
            <Link href="/dashboard/projects/new">
              <Plus className="h-4 w-4" /> New project
            </Link>
          </Button>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/" })
            }}
          >
            <Button variant="ghost" size="icon" type="submit" title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
