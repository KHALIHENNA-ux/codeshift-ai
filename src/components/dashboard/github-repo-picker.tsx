"use client"

import { useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { GitHubLogo } from "@/components/icons/github-logo"
import { Loader2, Lock, Search } from "lucide-react"
import { cn, relativeTime } from "@/lib/utils"
import type { RepoSummary } from "@/app/api/github/repos/route"

interface Props {
  selected: RepoSummary | null
  onSelect: (repo: RepoSummary | null) => void
  disabled?: boolean
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; repos: RepoSummary[] }
  | { kind: "not_connected" }
  | { kind: "token_invalid"; message: string }
  | { kind: "error"; message: string }

export function GithubRepoPicker({ selected, onSelect, disabled }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" })
  const [query, setQuery] = useState("")

  async function load() {
    setState({ kind: "loading" })
    try {
      const res = await fetch("/api/github/repos")
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setState({ kind: "ready", repos: data.repos ?? [] })
      } else if (data.code === "github_not_connected") {
        setState({ kind: "not_connected" })
      } else if (data.code === "github_token_invalid") {
        setState({ kind: "token_invalid", message: data.error })
      } else {
        setState({ kind: "error", message: data.error ?? "Could not load repositories." })
      }
    } catch {
      setState({ kind: "error", message: "Could not load repositories." })
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function connectGithub() {
    signIn("github", { callbackUrl: "/dashboard/projects/new" })
  }

  if (state.kind === "loading") {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (state.kind === "not_connected" || state.kind === "token_invalid") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-14 text-center">
        <GitHubLogo className="mb-4 h-10 w-10 text-muted-foreground" />
        <p className="font-medium">
          {state.kind === "not_connected"
            ? "Connect your GitHub account"
            : "GitHub access expired"}
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {state.kind === "not_connected"
            ? "Sign in with GitHub to pick one of your repositories and migrate it directly."
            : state.message}
        </p>
        <Button variant="outline" className="mt-5" onClick={connectGithub}>
          <GitHubLogo className="h-4 w-4" />
          {state.kind === "not_connected" ? "Connect GitHub" : "Reconnect GitHub"}
        </Button>
      </div>
    )
  }

  if (state.kind === "error") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border py-14 text-center">
        <p className="text-sm text-red-400">{state.message}</p>
        <Button variant="outline" className="mt-4" onClick={load}>
          Try again
        </Button>
      </div>
    )
  }

  const q = query.trim().toLowerCase()
  const repos = q
    ? state.repos.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          (r.language ?? "").toLowerCase().includes(q),
      )
    : state.repos

  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your repositories…"
          disabled={disabled}
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="max-h-80 overflow-y-auto p-1.5">
        {repos.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {state.repos.length === 0 ? "No repositories found on your account." : "No match."}
          </p>
        ) : (
          repos.map((r) => {
            const active = selected?.fullName === r.fullName
            return (
              <button
                key={r.fullName}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(active ? null : r)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  active ? "bg-primary/10 ring-1 ring-primary/50" : "hover:bg-secondary/60",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {r.name}
                    {r.private && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{r.fullName}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  {r.language && <p className="text-foreground/80">{r.language}</p>}
                  {r.pushedAt && <p>{relativeTime(r.pushedAt)}</p>}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
