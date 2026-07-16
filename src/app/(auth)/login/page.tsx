"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { AuthShell, Field } from "@/components/auth/auth-shell"
import { GitHubLogo } from "@/components/icons/github-logo"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const data = new FormData(e.currentTarget)
    const res = await signIn("credentials", {
      email: data.get("email"),
      password: data.get("password"),
      redirect: false,
    })
    setLoading(false)
    if (res?.error) setError("Invalid email or password.")
    else router.push("/dashboard")
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your CodeShift workspace.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field name="email" type="email" label="Email" placeholder="you@company.com" />
        <Field name="password" type="password" label="Password" placeholder="••••••••" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
      >
        <GitHubLogo className="h-4 w-4" />
        Sign in with GitHub
      </Button>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}
