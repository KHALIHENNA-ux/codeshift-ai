// Context-window partitioning for large codebases (pillar #3: scale).
//
// The engine's coherence design puts the legacy codebase into a single cached
// system block shared by every rewrite + verify call. That's optimal while the
// whole repo fits one context window — but a large project (e.g. a 2.9 MB,
// ~750K-token framework) overflows it and every call fails outright.
//
// This module partitions the dependency-ordered rewrite sequence into a series
// of windows, each whose legacy source fits a token budget, and renders a
// per-window cached block. Files migrated in earlier windows reach later windows
// through the target SymbolMap (pillar #2), not by re-sending their source — so
// cross-window coherence is preserved without re-paying for the whole repo.
//
// Deterministic, no model calls — like depgraph.ts and symbols.ts. Residual
// imprecision (token estimate, a cycle straddling a boundary) is caught by the
// verifier + self-repair loop (pillar #1).

import { norm, type DepGraph } from "./depgraph"

// Default token budget for a single cached legacy block. Opus carries a 200K
// context window; we reserve the rest for the system persona, the per-file user
// message (which re-sends the file + its migrated-dep interfaces), the streamed
// output (up to 32K), thinking, and the verifier's second pass over the same
// block. 120K of legacy source leaves comfortable headroom.
export const DEFAULT_CONTEXT_BUDGET = 120_000

export interface FileLite {
  path: string
  content: string
}

export interface TokenBudget {
  maxContextTokens: number
}

export interface ContextWindow {
  index: number // 0-based position in the sequence
  order: string[] // normalized legacy paths to rewrite in this window, in topo order
  tokens: number // estimated tokens of this window's cached block
  oversized: boolean // a single file alone exceeds the budget (can't be split here)
}

export interface ContextPlan {
  // false => the whole repo fits one window; the engine uses the legacy
  // single-block path unchanged. true => multi-window (large-codebase) mode.
  windowed: boolean
  windows: ContextWindow[]
  totalTokens: number
  budget: number
}

/**
 * Estimate the token count of a string. Code tends to tokenize denser than
 * prose, so we divide by 3.5 (rather than the looser ~4 chars/token) to bias
 * toward slightly SMALLER windows — overflowing the context window is a hard
 * failure, undershooting only costs a little cache efficiency.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

function tokensOf(files: FileLite[]): number {
  // Mirror renderCodebase's framing cost (the "==== FILE: path ====" header)
  // so the estimate tracks what actually goes on the wire.
  let total = 0
  for (const f of files) total += estimateTokens(f.content) + estimateTokens(f.path) + 12
  return total
}

/**
 * Partition the rewrite order into budget-bounded windows.
 *
 * Greedy, locality-preserving: it walks the leaves-first topo order and packs
 * consecutive files into a window until the next file would overflow the budget,
 * then opens a new window. Because dependencies precede dependents in the order,
 * consecutive packing keeps a file near the modules it imports. A file larger
 * than the whole budget gets its own (flagged) window — we never silently drop
 * or split it.
 *
 * When everything fits a single window the plan is marked `windowed: false`, and
 * the engine keeps its original single-cached-block behavior verbatim.
 */
export function planContext(
  files: FileLite[],
  order: string[],
  budget: TokenBudget = { maxContextTokens: DEFAULT_CONTEXT_BUDGET },
): ContextPlan {
  const max = budget.maxContextTokens
  const byPath = new Map(files.map((f) => [norm(f.path), f]))
  const totalTokens = tokensOf(order.map((p) => byPath.get(p)).filter((f): f is FileLite => !!f))

  // Whole repo fits — single window, legacy behavior. (Match on the rewritable
  // set, since that's what drives the rewrite block.)
  if (totalTokens <= max) {
    return {
      windowed: false,
      windows: [{ index: 0, order: [...order], tokens: totalTokens, oversized: false }],
      totalTokens,
      budget: max,
    }
  }

  const windows: ContextWindow[] = []
  let cur: string[] = []
  let curTokens = 0

  const flush = (oversized = false) => {
    if (!cur.length) return
    windows.push({ index: windows.length, order: cur, tokens: curTokens, oversized })
    cur = []
    curTokens = 0
  }

  for (const p of order) {
    const f = byPath.get(p)
    if (!f) continue
    const t = tokensOf([f])

    // A single file bigger than the budget can't share a window — give it its
    // own and flag it so the engine/telemetry can surface the risk.
    if (t > max) {
      flush()
      windows.push({ index: windows.length, order: [p], tokens: t, oversized: true })
      continue
    }

    if (curTokens + t > max && cur.length) flush()
    cur.push(p)
    curTokens += t
  }
  flush()

  return { windowed: true, windows, totalTokens, budget: max }
}

/**
 * Render one window's cached block: the full source of the files in this window,
 * plus a path-only manifest of everything else in the project so the model knows
 * those modules exist (and can be referenced) without paying to include them.
 * Byte-stable for a given window so the prefix cache keeps hitting across the
 * files rewritten within it.
 */
export function renderWindowBlock(
  window: ContextWindow,
  files: FileLite[],
  allPaths: string[],
): string {
  const inWindow = new Set(window.order)
  const byPath = new Map(files.map((f) => [norm(f.path), f]))

  const sorted = [...window.order].sort((a, b) => a.localeCompare(b))
  const body = sorted
    .map((p) => byPath.get(p))
    .filter((f): f is FileLite => !!f)
    .map((f) => `==== FILE: ${f.path} ====\n${f.content}`)
    .join("\n\n")

  const others = allPaths
    .map(norm)
    .filter((p) => !inWindow.has(p))
    .sort((a, b) => a.localeCompare(b))

  const manifest = others.length
    ? `\n\n---\nOTHER FILES IN THIS PROJECT (not shown in full in this batch — already-migrated dependencies are provided per-file in the instruction):\n${others
        .map((p) => `- ${p}`)
        .join("\n")}`
    : ""

  return `This is BATCH ${window.index + 1} of a large legacy codebase being migrated in dependency order across multiple batches. The files in this batch are shown in full below; the rest of the project is listed by path only.\n\n${body}${manifest}`
}
