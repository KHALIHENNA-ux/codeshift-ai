"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function BuyButton({
  pack,
  disabled,
  variant = "outline",
}: {
  pack: string
  disabled?: boolean
  variant?: "outline" | "gradient"
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function buy() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed.")
      window.location.href = data.url
    } catch (e) {
      setError((e as Error).message)
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <Button variant={variant} className="w-full" onClick={buy} disabled={disabled || loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy credits"}
      </Button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
