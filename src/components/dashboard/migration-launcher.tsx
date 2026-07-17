"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { MIGRATION_PATHS, DESIGN_STYLES } from "@/lib/migration-paths"
import { Wand2, Coins, AlertTriangle } from "lucide-react"

export function MigrationLauncher({
  projectId,
  recommendedPath,
  cost,
  balance,
}: {
  projectId: string
  recommendedPath: string
  cost: number
  balance: number
}) {
  const router = useRouter()
  const [pathId, setPathId] = useState(recommendedPath)
  const [design, setDesign] = useState("keep")

  const sufficient = balance >= cost

  function start() {
    const params = new URLSearchParams({ pathId, design })
    router.push(`/dashboard/projects/${projectId}/migration?${params.toString()}`)
  }

  return (
    <Card className="border-gradient p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15">
          <Wand2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Run the migration</h2>
          <p className="text-sm text-muted-foreground">
            Pick a target and an optional redesign. Watch it rewrite live.
          </p>
        </div>
      </div>

      <p className="mb-2 text-sm font-medium">Migration path</p>
      <div className="mb-6 grid gap-2 sm:grid-cols-2">
        {MIGRATION_PATHS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPathId(p.id)}
            className={cn(
              "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
              pathId === p.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/40",
            )}
          >
            <span className="font-medium">{p.label}</span>
            {p.id === recommendedPath && <Badge variant="accent">recommended</Badge>}
          </button>
        ))}
      </div>

      <p className="mb-2 text-sm font-medium">Frontend redesign</p>
      <div className="mb-6 grid gap-2 sm:grid-cols-2">
        {DESIGN_STYLES.map((d) => (
          <button
            key={d.id}
            onClick={() => setDesign(d.id)}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left transition-colors",
              design === d.id
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent/40",
            )}
          >
            <span className="block text-sm font-medium">{d.name}</span>
            <span className="block text-xs text-muted-foreground">{d.description}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-border pt-5">
        {sufficient ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Coins className="h-4 w-4 text-accent" />
              <span>
                This migration will cost{" "}
                <span className="font-semibold text-foreground">
                  {cost} credit{cost === 1 ? "" : "s"}
                </span>{" "}
                <span className="text-muted-foreground">(you have {balance})</span>
              </span>
            </div>
            <Button variant="gradient" onClick={start}>
              Start migration
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Not enough credits — this migration costs{" "}
                <span className="font-semibold">{cost}</span> and you have{" "}
                <span className="font-semibold">{balance}</span>.
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button asChild variant="gradient">
                <Link href="/credits">
                  <Coins className="h-4 w-4" /> Get credits
                </Link>
              </Button>
              <Button variant="outline" disabled title="Buy credits first">
                Start migration
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
