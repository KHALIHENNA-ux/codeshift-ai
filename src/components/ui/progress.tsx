"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function Progress({
  value = 0,
  className,
}: {
  value?: number
  className?: string
}) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className="h-full rounded-full transition-all duration-500 ease-out [background-image:linear-gradient(90deg,hsl(var(--primary)),hsl(var(--accent)))]"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
