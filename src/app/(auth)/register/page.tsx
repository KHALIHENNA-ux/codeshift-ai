"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { AuthShell, Field } from "@/components/auth/auth-shell"
import { GitHubSignInButton, AuthDivider } from "@/components/auth/github-button"

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const data = new FormData(e.currentTarget)
    const payload = {
      name: data.get("name"),
      email: data.get("email"),
      password: data.get("password"),
    }
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Something went wrong." }))
      setError(error)
      setLoading(false)
      return
    }
    // auto sign-in after registration
    await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    })
    router.push("/dashboard")
  }

  return (
    <AuthShell title="Create your account" subtitle="Your first migration is free — no card required.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field name="name" type="text" label="Name" placeholder="Ada Lovelace" />
        <Field name="email" type="email" label="Email" placeholder="you@company.com" />
        <Field name="password" type="password" label="Password" placeholder="8+ characters" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>
      <AuthDivider />
      <GitHubSignInButton label="Sign up with GitHub" />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
