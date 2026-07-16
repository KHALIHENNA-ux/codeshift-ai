"use client"

import type { ComponentProps } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { GitHubLogo } from "@/components/icons/github-logo"

interface Props {
  label?: string
  className?: string
  size?: ComponentProps<typeof Button>["size"]
  variant?: ComponentProps<typeof Button>["variant"]
}

export function GitHubSignInButton({
  label = "Sign in with GitHub",
  className,
  size,
  variant = "outline",
}: Props) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
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
