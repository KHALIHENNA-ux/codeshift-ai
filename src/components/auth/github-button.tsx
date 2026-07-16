"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { GitHubLogo } from "@/components/icons/github-logo"

export function GitHubSignInButton({ label = "Sign in with GitHub" }: { label?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
    >
      <GitHubLogo className="h-4 w-4" />
      {label}
    </Button>
  )
}

export function AuthDivider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
