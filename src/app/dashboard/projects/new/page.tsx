"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UploadCloud, FileArchive, Loader2, X } from "lucide-react"
import { GitHubLogo } from "@/components/icons/github-logo"
import { GithubRepoPicker } from "@/components/dashboard/github-repo-picker"
import { formatBytes, cn } from "@/lib/utils"
import type { RepoSummary } from "@/app/api/github/repos/route"

type Source = "zip" | "github"

export default function NewProjectPage() {
  const router = useRouter()
  const [source, setSource] = useState<Source>("zip")
  const [file, setFile] = useState<File | null>(null)
  const [repo, setRepo] = useState<RepoSummary | null>(null)
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

  function selectRepo(r: RepoSummary | null) {
    setError("")
    setRepo(r)
    if (r && !name) setName(r.name)
  }

  async function submit() {
    setError("")
    setStage("uploading")

    let res: Response
    if (source === "zip") {
      if (!file) return
      const fd = new FormData()
      fd.append("file", file)
      fd.append("name", name || file.name)
      res = await fetch("/api/upload", { method: "POST", body: fd })
    } else {
      if (!repo) return
      res = await fetch("/api/github/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: repo.fullName, name: name || repo.name }),
      })
    }

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Import failed." }))
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
  const ready = source === "zip" ? !!file : !!repo

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New project</h1>
        <p className="mt-1 text-muted-foreground">
          Upload a .zip of your legacy codebase, or import one of your GitHub repositories.
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

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-secondary/50 p-1">
          {(
            [
              { key: "zip", label: "Upload .zip", icon: <UploadCloud className="h-4 w-4" /> },
              { key: "github", label: "From GitHub", icon: <GitHubLogo className="h-4 w-4" /> },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              disabled={busy}
              onClick={() => {
                setError("")
                setSource(tab.key)
              }}
              className={cn(
                "flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
                source === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {source === "zip" ? (
          !file ? (
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
          )
        ) : (
          <GithubRepoPicker selected={repo} onSelect={selectRepo} disabled={busy} />
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <Button
          variant="gradient"
          className="mt-6 w-full"
          disabled={!ready || busy}
          onClick={submit}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {stage === "uploading"
            ? source === "zip"
              ? "Uploading…"
              : "Importing from GitHub…"
            : stage === "analyzing"
              ? "Analyzing codebase…"
              : source === "zip"
                ? "Upload & analyze"
                : "Import & analyze"}
        </Button>
        {stage === "uploading" && source === "github" && (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Fetching {repo?.fullName} and extracting source files…
          </p>
        )}
        {stage === "analyzing" && (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            The engine is scanning your repo — this can take a minute for large projects.
          </p>
        )}
      </Card>
    </div>
  )
}
