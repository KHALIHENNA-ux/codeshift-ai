"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UploadCloud, FileArchive, Loader2, X } from "lucide-react"
import { formatBytes, cn } from "@/lib/utils"

export default function NewProjectPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [stage, setStage] = useState<"idle" | "uploading" | "analyzing">("idle")
  const [error, setError] = useState("")

  const onDrop = useCallback((accepted: File[]) => {
    setError("")
    const f = accepted[0]
    if (f) {
      setFile(f)
      if (!name) setName(f.name.replace(/\.zip$/i, ""))
    }
  }, [name])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/zip": [".zip"], "application/x-zip-compressed": [".zip"] },
    maxFiles: 1,
  })

  async function submit() {
    if (!file) return
    setError("")
    setStage("uploading")
    const fd = new FormData()
    fd.append("file", file)
    fd.append("name", name || file.name)

    const res = await fetch("/api/upload", { method: "POST", body: fd })
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Upload failed." }))
      setError(error)
      setStage("idle")
      return
    }
    const { projectId } = await res.json()

    // Kick off analysis, then land on the project page.
    setStage("analyzing")
    await fetch(`/api/projects/${projectId}/analyze`, { method: "POST" }).catch(() => {})
    router.push(`/dashboard/projects/${projectId}`)
  }

  const busy = stage !== "idle"

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New project</h1>
        <p className="mt-1 text-muted-foreground">
          Upload a .zip of your legacy codebase. We'll analyze it automatically.
        </p>
      </div>

      <Card className="p-6">
        <label className="mb-1.5 block text-sm font-medium">Project name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="legacy-shop"
          disabled={busy}
          className="mb-6 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
        />

        {!file ? (
          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center transition-colors",
              isDragActive && "border-primary bg-primary/5",
            )}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">
              {isDragActive ? "Drop it here" : "Drag & drop your .zip, or click to browse"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Up to 400 source files · binaries and node_modules are skipped automatically
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-xl border border-border bg-secondary/40 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-secondary">
              <FileArchive className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            {!busy && (
              <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <Button
          variant="gradient"
          className="mt-6 w-full"
          disabled={!file || busy}
          onClick={submit}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {stage === "uploading"
            ? "Uploading…"
            : stage === "analyzing"
              ? "Analyzing codebase…"
              : "Upload & analyze"}
        </Button>
        {stage === "analyzing" && (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            The engine is scanning your repo — this can take a minute for large projects.
          </p>
        )}
      </Card>
    </div>
  )
}
