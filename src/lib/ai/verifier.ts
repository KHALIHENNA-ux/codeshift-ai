import type Anthropic from "@anthropic-ai/sdk"
import { MODEL, textOf } from "./client"
import { verifierSystem, VERIFY_SCHEMA } from "./prompts"
import type {
  Diagnostic,
  MigrationPathDef,
  VerificationResult,
} from "@/types"

// Files we accept as verified at or above this confidence with no error-level
// diagnostics. Below it, the engine attempts a repair pass.
export const VERIFY_THRESHOLD = 80

type CachedBlock = {
  type: "text"
  text: string
  cache_control: { type: "ephemeral"; ttl: "1h" }
}

interface VerifyInput {
  path: MigrationPathDef
  legacyPath: string
  legacySource: string // the original file contents (may be "" for new files)
  newPath: string
  content: string // the rewritten file contents
  language: string
  cachedCodebaseBlock: CachedBlock
}

export interface VerifyOutput extends VerificationResult {
  tokens: number
  cacheReadTokens: number
}

/**
 * Verify a single rewritten file.
 *
 * Two layers, deliberately ordered cheap → expensive:
 *   1. Deterministic structural checks (free, instant, no LLM) — catch the
 *      classic generation failure modes: truncation, placeholder stubs,
 *      leftover markdown fences, unbalanced brackets. These are the failures an
 *      LLM reviewer is least reliable at noticing, so we catch them with code.
 *   2. AI behavior-parity review (one structured Claude call) — semantic checks
 *      the deterministic layer can't do: did behavior drift, are imports real,
 *      is the typing sound. Runs against the cached legacy codebase context.
 *
 * The two diagnostic sets are merged and scored into a single confidence.
 */
export async function verifyFile(
  client: Anthropic,
  input: VerifyInput,
): Promise<VerifyOutput> {
  const structural = structuralCheck(input.content, input.language)

  // If the file is structurally broken (truncated/placeholder/unbalanced),
  // skip the AI review — it's a waste of tokens; repair first, re-verify later.
  if (structural.some((d) => d.severity === "error")) {
    return finalize(structural, 0, 0, 0)
  }

  const review = await aiReview(client, input)
  const diagnostics = [...structural, ...review.diagnostics]
  return finalize(diagnostics, review.behaviorParity, review.tokens, review.cacheReadTokens)
}

function finalize(
  diagnostics: Diagnostic[],
  behaviorParity: number,
  tokens: number,
  cacheReadTokens: number,
): VerifyOutput {
  const confidence = scoreConfidence(diagnostics, behaviorParity)
  const hasError = diagnostics.some((d) => d.severity === "error")
  return {
    verified: !hasError && confidence >= VERIFY_THRESHOLD,
    confidence,
    behaviorParity,
    diagnostics,
    rounds: 0, // set by the caller as repair rounds accumulate
    tokens,
    cacheReadTokens,
  }
}

/**
 * Combine diagnostics + behavior-parity into a 0-100 confidence.
 * Errors are heavily penalized and cap the score; warnings/info chip away.
 * Behavior parity is blended in so a structurally clean but behaviorally
 * suspect rewrite still scores low.
 */
function scoreConfidence(diagnostics: Diagnostic[], behaviorParity: number): number {
  let penalty = 0
  let hasError = false
  for (const d of diagnostics) {
    if (d.severity === "error") {
      penalty += 35
      hasError = true
    } else if (d.severity === "warning") {
      penalty += 10
    } else {
      penalty += 3
    }
  }
  // When the AI review ran, parity is meaningful; when it didn't (structural
  // failure path), parity is 0 and we rely purely on the penalty.
  const base = behaviorParity > 0 ? Math.round((100 + behaviorParity) / 2) : 100
  let score = Math.max(0, base - penalty)
  if (hasError) score = Math.min(score, 55) // an error means it's not trustworthy
  return score
}

// ─────────────────────── deterministic structural checks ───────────────────────

const BRACE_LANGS = new Set([
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "json",
  "php",
  "java",
  "go",
  "c",
  "cpp",
  "csharp",
  "rust",
  "css",
  "scss",
  "vue",
  "swift",
  "kotlin",
])

// High-signal truncation / placeholder phrases that mean the model stopped
// short and left a gap instead of real code. Kept conservative to avoid
// flagging legitimate comments.
const TRUNCATION_PATTERNS: RegExp[] = [
  /(\/\/|#|\*|<!--)\s*\.\.\.\s*(rest|remaining|the rest|existing|unchanged|same as|previous|other)\b/i,
  /\b(rest|remainder) of (the )?(code|file|implementation|function|logic|method)\b/i,
  /\b(keep|leave|unchanged|same as) (the )?(existing|original|previous)\b/i,
  /\b(implementation|code|logic) (goes|here)\b/i,
  /\byour code here\b/i,
  /\b(omitted|truncated) for brevity\b/i,
  /(\/\/|#)\s*\.\.\.\s*$/m,
  /\bNotImplemented(Error)?\b/,
]

const PLACEHOLDER_PATTERNS: RegExp[] = [/\bTODO\b/, /\bFIXME\b/, /\bXXX\b/, /\bHACK\b/]

export function structuralCheck(content: string, language: string): Diagnostic[] {
  const diags: Diagnostic[] = []
  const trimmed = content.trim()

  if (trimmed.length < 8) {
    diags.push({
      severity: "error",
      category: "structure",
      message: "Output is empty or far too short to be a complete file.",
    })
    return diags
  }

  // Leftover markdown fences mean the model wrapped its output in a code block
  // instead of emitting raw file contents — the downstream zip would be broken.
  if (/^```/m.test(content)) {
    diags.push({
      severity: "error",
      category: "structure",
      message: "Output contains markdown code fences (```), which would corrupt the file.",
      suggestion: "Emit raw file contents only, with no fences.",
    })
  }

  for (const re of TRUNCATION_PATTERNS) {
    const m = content.match(re)
    if (m) {
      diags.push({
        severity: "error",
        category: "structure",
        message: `Looks truncated / placeholder rather than complete code: "${m[0].trim().slice(0, 60)}".`,
        suggestion: "Emit the full, real implementation — no elisions or stubs.",
        line: lineOf(content, m.index ?? 0),
      })
      break // one truncation finding is enough to trigger repair
    }
  }

  for (const re of PLACEHOLDER_PATTERNS) {
    const m = content.match(re)
    if (m) {
      diags.push({
        severity: "warning",
        category: "structure",
        message: `Contains a "${m[0]}" marker — production output should not carry stubs.`,
        line: lineOf(content, m.index ?? 0),
      })
      break
    }
  }

  if (BRACE_LANGS.has(language)) {
    const imbalance = bracketImbalance(content)
    if (imbalance) {
      diags.push({
        severity: "error",
        category: "syntax",
        message: imbalance,
        suggestion: "The file is very likely truncated or has a structural syntax error.",
      })
    }
  }

  return diags
}

function lineOf(text: string, index: number): number {
  let line = 1
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === "\n") line++
  }
  return line
}

/**
 * String/comment-aware bracket balance for C-family languages. Skips contents
 * of strings, template literals, and comments so we don't false-positive on a
 * brace inside a string. Returns a human message, or null when balanced.
 */
function bracketImbalance(src: string): string | null {
  const stack: string[] = []
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" }
  const openers = new Set(["(", "[", "{"])

  let i = 0
  const n = src.length
  let mode: "code" | "line" | "block" | "sq" | "dq" | "bt" = "code"

  while (i < n) {
    const c = src[i]
    const next = src[i + 1]

    switch (mode) {
      case "code":
        if (c === "/" && next === "/") {
          mode = "line"
          i += 2
          continue
        }
        if (c === "/" && next === "*") {
          mode = "block"
          i += 2
          continue
        }
        if (c === "#") {
          // PHP/shell-style line comment; harmless to treat as such for balance.
          mode = "line"
          i++
          continue
        }
        if (c === "'") {
          mode = "sq"
          i++
          continue
        }
        if (c === '"') {
          mode = "dq"
          i++
          continue
        }
        if (c === "`") {
          mode = "bt"
          i++
          continue
        }
        if (openers.has(c)) stack.push(c)
        else if (pairs[c]) {
          if (stack.pop() !== pairs[c]) {
            return `Unbalanced "${c}" at line ${lineOf(src, i)} — brackets do not match.`
          }
        }
        break

      case "line":
        if (c === "\n") mode = "code"
        break
      case "block":
        if (c === "*" && next === "/") {
          mode = "code"
          i += 2
          continue
        }
        break
      case "sq":
        if (c === "\\") {
          i += 2
          continue
        }
        if (c === "'") mode = "code"
        break
      case "dq":
        if (c === "\\") {
          i += 2
          continue
        }
        if (c === '"') mode = "code"
        break
      case "bt":
        if (c === "\\") {
          i += 2
          continue
        }
        if (c === "`") mode = "code"
        break
    }
    i++
  }

  if (stack.length > 0) {
    return `${stack.length} unclosed "${stack[stack.length - 1]}" bracket(s) — the file is likely truncated.`
  }
  return null
}

// ─────────────────────── AI behavior-parity review ───────────────────────

async function aiReview(
  client: Anthropic,
  input: VerifyInput,
): Promise<{ behaviorParity: number; diagnostics: Diagnostic[]; tokens: number; cacheReadTokens: number }> {
  const legacyBlock = input.legacySource
    ? `LEGACY SOURCE (${input.legacyPath}) — the rewrite must preserve this behavior:\n${input.legacySource}\n\n`
    : `This is a NEW file with no direct legacy counterpart; judge it on correctness and consistency with the target stack and the rest of the codebase.\n\n`

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: VERIFY_SCHEMA as unknown as Record<string, unknown> },
    },
    system: [{ type: "text", text: verifierSystem(input.path) }, input.cachedCodebaseBlock],
    messages: [
      {
        role: "user",
        content: `${legacyBlock}REWRITTEN FILE (${input.newPath}):\n${input.content}\n\nReview the rewritten file. Return behaviorParity and the list of real defects (empty if none).`,
      },
    ],
  })

  const parsed = JSON.parse(textOf(msg)) as {
    behaviorParity: number
    diagnostics: Diagnostic[]
  }

  return {
    behaviorParity: clamp(parsed.behaviorParity ?? 0),
    diagnostics: parsed.diagnostics ?? [],
    tokens: msg.usage.input_tokens + msg.usage.output_tokens,
    cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0,
  }
}

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}
