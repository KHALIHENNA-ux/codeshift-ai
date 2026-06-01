import { cn } from "@/lib/utils"

// The CodeShift mark: two chevrons shifting forward, in the brand gradient.
export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative grid h-8 w-8 place-items-center rounded-lg border-gradient bg-card">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <defs>
            <linearGradient id="cs-g" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="hsl(258 90% 66%)" />
              <stop offset="100%" stopColor="hsl(189 94% 55%)" />
            </linearGradient>
          </defs>
          <path
            d="M8 7l-4 5 4 5M16 7l4 5-4 5"
            stroke="url(#cs-g)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="text-lg font-semibold tracking-tight">
        Code<span className="text-gradient">Shift</span>
      </span>
    </div>
  )
}
