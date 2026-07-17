"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { EngineEvent, MigrationPlan, RewrittenFile } from "@/types"
import {
  Check,
  Loader2,
  FileCode2,
  GitCompare,
  Download,
  Sparkles,
  CircleDot,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Wrench,
  Link2,
  Network,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Color a 0-100 confidence score for the UI.
function confColor(c: number): string {
  if (c >= 80) return "text-emerald-400"
  if (c >= 55) return "text-amber-400"
  return "text-red-400"
}

const PHASES = ["planning", "rewriting", "documenting"]
const PHASE_LABEL: Record<string, string> = {
  planning: "Planning",
  rewriting: "Rewriting",
  documenting: "Documenting",
}

export default function MigrationPage() {
  const { id } = useParams<{ id: string }>()
  const search = useSearchParams()
  const pathId = search.get("pathId") || undefined
  const design = search.get("design") || "keep"

  const [phase, setPhase] = useState("planning")
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState("")
  const [plan, setPlan] = useState<MigrationPlan | null>(null)
  const [files, setFiles] = useState<RewrittenFile[]>([])
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [liveBuffer, setLiveBuffer] = useState("")
  const [activity, setActivity] = useState("")
  const [order, setOrder] = useState<string[]>([])
  const [coherence, setCoherence] = useState<{
    importsReconciled: number
    symbolsInjected: number
  } | null>(null)
  const [scale, setScale] = useState<{ windows: number } | null>(null)
  const [batch, setBatch] = useState<{ index: number; total: number } | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [refunded, setRefunded] = useState(0)
  const [insufficient, setInsufficient] = useState<{ cost: number; balance: number } | null>(null)
  const started = useRef(false)
  const liveRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    // Run exactly once. We deliberately do NOT abort the request on cleanup:
    // React 18 Strict Mode (dev) mounts → unmounts → remounts, so aborting in
    // the first cleanup would kill the in-flight request while the `started`
    // guard blocks the remount from issuing a new one — leaving the UI stuck
    // at 0%. The migrate route persists progress server-side and survives a
    // dropped connection, so one un-aborted request is the correct model.
    if (started.current) return
    started.current = true

    ;(async () => {
      const res = await fetch(`/api/projects/${id}/migrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathId, designStyle: design }),
      })
      if (res.status === 402) {
        const j = (await res.json().catch(() => null)) as { cost?: number; balance?: number } | null
        setInsufficient({ cost: j?.cost ?? 0, balance: j?.balance ?? 0 })
        return
      }
      if (!res.ok || !res.body) {
        setError(await res.text().catch(() => "Migration failed to start."))
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ""

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split("\n\n")
        buf = parts.pop() ?? ""
        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim()
          if (!line) continue
          let event: EngineEvent
          try {
            event = JSON.parse(line)
          } catch {
            continue
          }
          handle(event)
        }
      }
    })().catch((e) => {
      setError(e.message)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handle(event: EngineEvent) {
    switch (event.type) {
      case "phase":
        setPhase(event.phase)
        break
      case "progress":
        setProgress(event.progress)
        if (event.step) setStep(event.step)
        break
      case "plan":
        setPlan(event.plan)
        break
      case "graph":
        setOrder(event.order)
        break
      case "scale":
        setScale({ windows: event.windows })
        break
      case "window":
        setBatch({ index: event.index, total: event.total })
        setActivity(`Batch ${event.index + 1} of ${event.total} — ${event.files} files loaded into context`)
        break
      case "coherence":
        setCoherence({
          importsReconciled: event.importsReconciled,
          symbolsInjected: event.symbolsInjected,
        })
        break
      case "file_start":
        setCurrentPath(event.path)
        setLiveBuffer("")
        setActivity("")
        break
      case "file_token":
        setLiveBuffer((b) => b + event.text)
        requestAnimationFrame(() => {
          liveRef.current?.scrollTo({ top: liveRef.current.scrollHeight })
        })
        break
      case "verify_start":
        setActivity(
          event.round === 0
            ? "Verifying — behavior parity, imports, completeness…"
            : `Re-verifying after repair (round ${event.round})…`,
        )
        break
      case "verify_result": {
        const r = event.result
        setActivity(
          r.verified
            ? `Verified · ${r.confidence}% confidence`
            : `${r.diagnostics.length} issue(s) found · ${r.confidence}% confidence`,
        )
        break
      }
      case "repair_start":
        setActivity(`Repairing ${event.issues} issue(s) — round ${event.round}…`)
        setLiveBuffer("") // the repair regenerates the file; show it fresh
        break
      case "file_done":
        setFiles((f) => [...f, event.file])
        setCurrentPath(null)
        setLiveBuffer("")
        setActivity("")
        break
      case "done":
        setDone(true)
        break
      case "error":
        setError(event.message)
        break
      case "credits_refunded":
        setRefunded(event.amount)
        break
    }
  }

  const phaseIndex = PHASES.indexOf(phase)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/dashboard/projects/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to project
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="h-5 w-5 text-accent" />
            {done ? "Migration complete" : "Migrating live"}
          </h1>
        </div>
        {done && (
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href={`/dashboard/projects/${id}/diff`}>
                <GitCompare className="h-4 w-4" /> Open diff viewer
              </Link>
            </Button>
            <Button asChild variant="gradient">
              <a href={`/api/projects/${id}/download`}>
                <Download className="h-4 w-4" /> Download
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* progress */}
      <Card>
        <CardContent className="space-y-4 py-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{step || "Starting engine…"}</span>
            <span className="font-mono text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
          {activity && (
            <div className="flex items-center gap-2 text-xs text-accent">
              {activity.startsWith("Repairing") ? (
                <Wrench className="h-3.5 w-3.5 animate-pulse" />
              ) : activity.startsWith("Verified") ? (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" />
              )}
              <span>{activity}</span>
            </div>
          )}
          <div className="flex gap-2">
            {PHASES.map((p, i) => (
              <div
                key={p}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm transition-colors",
                  i < phaseIndex || done
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : i === phaseIndex
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground",
                )}
              >
                {i < phaseIndex || done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : i === phaseIndex ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CircleDot className="h-3.5 w-3.5" />
                )}
                {PHASE_LABEL[p]}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {insufficient && (
        <Card className="border-amber-500/30">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
            <span className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Not enough credits — this migration costs {insufficient.cost} credit
              {insufficient.cost === 1 ? "" : "s"} and you have {insufficient.balance}.
            </span>
            <Button asChild variant="gradient" size="sm">
              <Link href="/credits">Get credits</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-500/30">
          <CardContent className="space-y-1 py-4 text-sm">
            <p className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
            {refunded > 0 && (
              <p className="text-emerald-400">
                Your {refunded} credit{refunded === 1 ? "" : "s"} for this run{" "}
                {refunded === 1 ? "has" : "have"} been refunded.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {done && files.length > 0 && (() => {
        const withV = files.filter((f) => f.verification)
        const verifiedCount = withV.filter((f) => f.verification!.verified).length
        const avg = withV.length
          ? Math.round(withV.reduce((s, f) => s + f.verification!.confidence, 0) / withV.length)
          : 0
        const repaired = withV.filter((f) => (f.verification!.rounds ?? 0) > 0).length
        const openIssues = withV.reduce(
          (s, f) => s + f.verification!.diagnostics.filter((d) => d.severity === "error").length,
          0,
        )
        return (
          <Card className="border-emerald-500/20">
            <CardContent className="space-y-4 py-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="flex items-center gap-1.5 text-2xl font-bold">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  {verifiedCount}/{withV.length}
                </div>
                <p className="text-xs text-muted-foreground">passed verification</p>
              </div>
              <div>
                <div className={cn("text-2xl font-bold", confColor(avg))}>{avg}%</div>
                <p className="text-xs text-muted-foreground">avg. confidence</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-2xl font-bold">
                  <Wrench className="h-4 w-4 text-accent" />
                  {repaired}
                </div>
                <p className="text-xs text-muted-foreground">auto-repaired</p>
              </div>
              <div>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    openIssues === 0 ? "text-emerald-400" : "text-amber-400",
                  )}
                >
                  {openIssues}
                </div>
                <p className="text-xs text-muted-foreground">unresolved errors</p>
              </div>
            </div>
            {coherence && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5 text-accent" /> Cross-file coherence
                </span>
                <span className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-emerald-400" />
                  <strong className="text-foreground">{coherence.importsReconciled}</strong> imports
                  auto-reconciled
                </span>
                <span className="flex items-center gap-1.5">
                  <FileCode2 className="h-3.5 w-3.5 text-primary" />
                  <strong className="text-foreground">{coherence.symbolsInjected}</strong> migrated
                  symbols fed into context
                </span>
              </div>
            )}
            {scale && scale.windows > 1 && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-amber-400" /> Large-codebase mode
                </span>
                <span>
                  migrating in <strong className="text-foreground">{scale.windows}</strong> context
                  batches
                  {batch ? ` · on batch ${batch.index + 1} of ${batch.total}` : ""}
                </span>
              </div>
            )}
            </CardContent>
          </Card>
        )
      })()}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* left: plan + file list */}
        <div className="space-y-6">
          {plan && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Migration plan</CardTitle>
                <p className="font-mono text-xs text-accent">{plan.targetStack}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.steps.map((s, i) => (
                  <div key={s.id} className="flex gap-2 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{i + 1}.</span>
                    <span className="text-muted-foreground">{s.title}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCode2 className="h-4 w-4 text-primary" />
                Rewritten files
                <Badge variant="secondary">
                  {files.length}
                  {order.length ? `/${order.length}` : ""}
                </Badge>
              </CardTitle>
              {order.length > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Network className="h-3 w-3 text-accent" />
                  Dependency order — leaves first
                </p>
              )}
            </CardHeader>
            <CardContent className="max-h-[400px] space-y-1.5 overflow-y-auto">
              {files.length === 0 && !currentPath && (
                <p className="text-sm text-muted-foreground">Waiting for the first file…</p>
              )}
              {files.map((f) => {
                const v = f.verification
                return (
                  <div key={f.path} className="flex items-center gap-2 text-sm">
                    {v?.verified ? (
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : v ? (
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    ) : (
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    )}
                    <span className="truncate font-mono text-xs">{f.path}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-1.5">
                      {f.coherence && f.coherence.importsReconciled > 0 && (
                        <span
                          className="flex items-center gap-0.5 text-[10px] text-accent"
                          title={`${f.coherence.importsReconciled} import(s) auto-reconciled to migrated paths`}
                        >
                          <Link2 className="h-3 w-3" />
                          {f.coherence.importsReconciled}
                        </span>
                      )}
                      {v && v.rounds > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Wrench className="h-3 w-3" />
                          {v.rounds}
                        </span>
                      )}
                      {v && (
                        <span className={cn("font-mono text-[10px]", confColor(v.confidence))}>
                          {v.confidence}%
                        </span>
                      )}
                      {f.isNew && <Badge variant="accent">new</Badge>}
                    </span>
                  </div>
                )
              })}
              {currentPath && (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                  <span className="truncate font-mono text-xs text-primary">{currentPath}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* right: live code stream */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 font-mono text-sm">
              {currentPath ? (
                <>
                  <CircleDot className="h-3.5 w-3.5 animate-pulse text-primary" />
                  {currentPath}
                </>
              ) : done ? (
                "Engine idle — migration finished"
              ) : (
                "Live output"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <pre
              ref={liveRef}
              className="max-h-[560px] overflow-auto bg-[hsl(222_47%_4%)] p-5 font-mono text-xs leading-relaxed text-foreground/90"
            >
              {liveBuffer ||
                (done
                  ? "// All files rewritten. Open the diff viewer to review every change.\n"
                  : "// The engine will stream rewritten code here, file by file…\n")}
              {currentPath && (
                <span className="inline-block h-3.5 w-1.5 animate-pulse bg-primary align-middle" />
              )}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
