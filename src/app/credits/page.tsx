import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBalance, CREDIT_PACKS, BYTES_PER_CREDIT, type CreditPackKey } from "@/lib/credits"
import { DashboardHeader } from "@/components/dashboard/header"
import { BuyButton } from "@/components/credits/buy-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Coins, ShoppingCart, RotateCcw, Gift, Wand2, CheckCircle2, XCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Credits",
  robots: { index: false },
}

const TX_META: Record<string, { label: string; icon: React.ElementType; tone: string }> = {
  PURCHASE: { label: "Pack purchase", icon: ShoppingCart, tone: "text-emerald-400" },
  CONSUMPTION: { label: "Migration", icon: Wand2, tone: "text-foreground" },
  REFUND: { label: "Refund (failed migration)", icon: RotateCcw, tone: "text-emerald-400" },
  SIGNUP_BONUS: { label: "Welcome bonus", icon: Gift, tone: "text-accent" },
}

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: { purchase?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const userId = session.user.id

  const [balance, transactions] = await Promise.all([
    getBalance(userId),
    prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ])

  const kb = Math.round(BYTES_PER_CREDIT / 1024)

  return (
    <div className="min-h-screen">
      <DashboardHeader balance={balance} />
      <main className="container max-w-5xl space-y-8 py-10">
        {searchParams.purchase === "success" && (
          <Card className="border-emerald-500/30">
            <CardContent className="flex items-center gap-2 py-4 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Payment received — your credits will appear within a few seconds. Refresh if needed.
            </CardContent>
          </Card>
        )}
        {searchParams.purchase === "cancelled" && (
          <Card className="border-amber-500/30">
            <CardContent className="flex items-center gap-2 py-4 text-sm text-amber-400">
              <XCircle className="h-4 w-4" />
              Checkout cancelled — you have not been charged.
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Credits</h1>
            <p className="mt-1 text-muted-foreground">
              1 credit per {kb} KB of source code, minimum 1 per migration. Failed migrations are
              refunded automatically.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3">
            <Coins className="h-5 w-5 text-accent" />
            <span className="text-2xl font-bold">{balance}</span>
            <span className="text-sm text-muted-foreground">credit{balance === 1 ? "" : "s"}</span>
          </div>
        </div>

        {/* Packs */}
        <div className="grid gap-5 md:grid-cols-3">
          {(Object.entries(CREDIT_PACKS) as [CreditPackKey, (typeof CREDIT_PACKS)[CreditPackKey]][]).map(
            ([key, pack]) => {
              const configured = Boolean(process.env[pack.priceEnv])
              const highlight = key === "pro"
              return (
                <Card key={key} className={highlight ? "border-gradient relative p-6" : "p-6"}>
                  <Badge variant={highlight ? "default" : "secondary"}>{pack.name}</Badge>
                  <p className="mt-4 text-4xl font-bold">
                    {pack.credits}
                    <span className="ml-1 text-lg font-normal text-muted-foreground">credits</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ${pack.usd} · ${(pack.usd / pack.credits).toFixed(2)}/credit · one-time
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    ≈ {Math.floor((pack.credits * kb) / 1024)} MB of legacy source migrated.
                  </p>
                  <div className="mt-6">
                    <BuyButton pack={key} variant={highlight ? "gradient" : "outline"} disabled={!configured} />
                    {!configured && (
                      <p className="mt-2 text-xs text-amber-400">Temporarily unavailable.</p>
                    )}
                  </div>
                </Card>
              )
            },
          )}
        </div>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction history</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {transactions.map((t) => {
                  const meta = TX_META[t.type] ?? TX_META.CONSUMPTION
                  const Icon = meta.icon
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-3 text-sm">
                      <Icon className={`h-4 w-4 shrink-0 ${meta.tone}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{meta.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.createdAt.toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      <span
                        className={`font-mono font-semibold ${
                          t.amount > 0 ? "text-emerald-400" : "text-foreground"
                        }`}
                      >
                        {t.amount > 0 ? `+${t.amount}` : t.amount}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
