"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { MIGRATION_PATHS, DESIGN_STYLES } from "@/lib/migration-paths"
import { Wand2, ArrowRight } from "lucide-react"

export function MigrationLauncher({
  projectId,
  recommendedPath,
  priceCents,
  credits,
}: {
  projectId: string
  recommendedPath: string
  priceCents: number
  credits: number
}) {
  const router = useRouter()
  const [pathId, setPathId] = useState(recommendedPath)
  const [design, setDesign] = useState("keep")

  const dollars = (priceCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })

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

      <div className="flex items-center justify-between border-t border-border pt-5">
        <div className="text-sm">
          {credits > 0 ? (
            <span className="text-emerald-400">First migration free · using 1 credit</span>
          ) : (
            <span className="text-muted-foreground">
              This migration: <span className="font-semibold text-foreground">{dollars}</span>
            </span>
          )}
        </div>
        <Button variant="gradient" onClick={start}>
          Start migration <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
