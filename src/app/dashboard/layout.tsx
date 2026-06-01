import { redirect } from "next/navigation"
import Link from "next/link"
import { auth, signOut } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LayoutGrid, Plus, LogOut, Coins } from "lucide-react"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true, name: true, email: true },
  })

  return (
    <div className="min-h-screen">
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
            <Badge variant="outline" className="gap-1.5">
              <Coins className="h-3.5 w-3.5 text-accent" />
              {user?.credits ?? 0} free {user?.credits === 1 ? "migration" : "migrations"}
            </Badge>
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
      <main className="container py-10">{children}</main>
    </div>
  )
}
