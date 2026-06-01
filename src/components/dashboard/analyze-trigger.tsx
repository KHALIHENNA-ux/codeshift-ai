"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ScanSearch } from "lucide-react"

export function AnalyzeTrigger({
  projectId,
  label = "Analyze codebase",
}: {
  projectId: string
  label?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function run() {
    setLoading(true)
    setError("")
    const res = await fetch(`/api/projects/${projectId}/analyze`, { method: "POST" })
    setLoading(false)
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Analysis failed." }))
      setError(error)
      return
    }
    router.refresh()
  }

  // Bare button variant for the retry case.
  if (label === "Retry analysis") {
    return (
      <Button variant="outline" onClick={run} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
        {label}
      </Button>
    )
  }

  return (
    <Card className="border-gradient py-12">
      <CardContent className="flex flex-col items-center text-center">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15">
          <ScanSearch className="h-6 w-6 text-primary" />
        </div>
        <p className="mt-4 font-semibold">Ready to analyze</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Run Smart Codebase Analysis to detect the framework, audit dependencies, and get a
          recommended migration path.
        </p>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <Button variant="gradient" className="mt-5" onClick={run} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Analyzing…" : label}
        </Button>
      </CardContent>
    </Card>
  )
}
