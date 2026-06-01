"use client"

import { useMemo, useState } from "react"
import type { DependencyGraph } from "@/types"

const TYPE_COLOR: Record<string, string> = {
  entry: "hsl(258 90% 66%)",
  module: "hsl(189 94% 55%)",
  vendor: "hsl(38 92% 55%)",
  asset: "hsl(215 20% 55%)",
}

// A lightweight, dependency-free graph: entry nodes anchor the center, modules
// orbit them. Pure SVG — no canvas, no physics lib.
export function DependencyGraphView({ graph }: { graph: DependencyGraph }) {
  const [hover, setHover] = useState<string | null>(null)
  const W = 720
  const H = 420

  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>()
    const entries = graph.nodes.filter((n) => n.type === "entry")
    const others = graph.nodes.filter((n) => n.type !== "entry")

    // entries across the center row
    entries.forEach((n, i) => {
      const x = W / 2 + (i - (entries.length - 1) / 2) * 160
      pos.set(n.id, { x, y: H / 2 })
    })
    // others on a ring
    const R = Math.min(W, H) / 2 - 60
    others.forEach((n, i) => {
      const a = (i / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2
      pos.set(n.id, { x: W / 2 + R * Math.cos(a), y: H / 2 + R * Math.sin(a) })
    })
    if (entries.length === 0 && others.length > 0) {
      // fallback: everything on the ring + one virtual center
      pos.set(others[0].id, { x: W / 2, y: H / 2 })
    }
    return pos
  }, [graph])

  if (!graph?.nodes?.length) {
    return <p className="text-sm text-muted-foreground">No graph data available.</p>
  }

  const connected = (id: string) =>
    graph.edges.some((e) => e.source === id || e.target === id)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[hsl(222_47%_4%)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {/* edges */}
        {graph.edges.map((e, i) => {
          const a = positions.get(e.source)
          const b = positions.get(e.target)
          if (!a || !b) return null
          const active = hover === e.source || hover === e.target
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={active ? "hsl(258 90% 66%)" : "hsl(222 30% 20%)"}
              strokeWidth={active ? 1.8 : 1}
              opacity={hover && !active ? 0.2 : 0.8}
            />
          )
        })}
        {/* nodes */}
        {graph.nodes.map((n) => {
          const p = positions.get(n.id)
          if (!p) return null
          const r = Math.max(6, Math.min(18, 6 + n.size / 4))
          const dim = hover && hover !== n.id && !sharesEdge(graph, hover, n.id)
          return (
            <g
              key={n.id}
              transform={`translate(${p.x},${p.y})`}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer"
              opacity={dim ? 0.35 : 1}
            >
              <circle
                r={r}
                fill={TYPE_COLOR[n.type] ?? TYPE_COLOR.module}
                fillOpacity={0.18}
                stroke={TYPE_COLOR[n.type] ?? TYPE_COLOR.module}
                strokeWidth={1.5}
              />
              {(hover === n.id || n.type === "entry" || connected(n.id)) && (
                <text
                  y={r + 12}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize="10"
                  fontFamily="var(--font-geist-mono)"
                >
                  {n.label.length > 22 ? n.label.slice(0, 20) + "…" : n.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="flex flex-wrap gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground">
        {Object.entries(TYPE_COLOR).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  )
}

function sharesEdge(graph: DependencyGraph, a: string, b: string) {
  return graph.edges.some(
    (e) => (e.source === a && e.target === b) || (e.source === b && e.target === a),
  )
}
