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
} from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const started = useRef(false)
  const liveRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const controller = new AbortController()
    ;(async () => {
      const res = await fetch(`/api/projects/${id}/migrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathId, designStyle: design }),
        signal: controller.signal,
      })
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
      if (e.name !== "AbortError") setError(e.message)
    })

    return () => controller.abort()
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
      case "file_start":
        setCurrentPath(event.path)
        setLiveBuffer("")
        break
      case "file_token":
        setLiveBuffer((b) => b + event.text)
        requestAnimationFrame(() => {
          liveRef.current?.scrollTo({ top: liveRef.current.scrollHeight })
        })
        break
      case "file_done":
        setFiles((f) => [...f, event.file])
        setCurrentPath(null)
        setLiveBuffer("")
        break
      case "done":
        setDone(true)
        break
      case "error":
        setError(event.message)
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
            ← Back to project
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

      {error && (
        <Card className="border-red-500/30">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" /> {error}
          </CardContent>
        </Card>
      )}

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
                <Badge variant="secondary">{files.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[400px] space-y-1.5 overflow-y-auto">
              {files.length === 0 && !currentPath && (
                <p className="text-sm text-muted-foreground">Waiting for the first file…</p>
              )}
              {files.map((f) => (
                <div key={f.path} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span className="truncate font-mono text-xs">{f.path}</span>
                  {f.isNew && <Badge variant="accent" className="ml-auto shrink-0">new</Badge>}
                </div>
              ))}
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
