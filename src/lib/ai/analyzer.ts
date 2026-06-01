import { anthropic, MODEL, textOf } from "./client"
import { analysisSystem, ANALYSIS_SCHEMA, renderCodebase } from "./prompts"
import type { AnalysisReport } from "@/types"

interface SourceFileInput {
  path: string
  content: string
}

/**
 * Smart Codebase Analysis.
 *
 * Scans the whole repo in one shot: detects framework + version, audits
 * dependencies, flags risks, builds a dependency graph, and recommends a
 * migration path.
 *
 * Engineering notes:
 * - Adaptive thinking: framework/version inference and risk reasoning are
 *   genuinely hard, so we let Claude decide how much to think.
 * - effort "high": correctness matters more than latency here.
 * - Prompt caching: the rendered codebase is the large, stable prefix. The
 *   migrator re-sends the same codebase per file, so caching it here primes
 *   the cache and the whole pipeline reads from it (~0.1x cost on hits).
 * - Structured output: the report drives the dashboard UI, so it must be
 *   schema-valid JSON, not prose we have to scrape.
 */
export async function analyzeCodebase(
  files: SourceFileInput[],
): Promise<{ report: AnalysisReport; tokens: number; cacheReadTokens: number }> {
  const client = anthropic()
  const codebase = renderCodebase(files)

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA as unknown as Record<string, unknown> },
    },
    system: [
      { type: "text", text: analysisSystem() },
      {
        // The codebase is large and stable — cache it so the rewriting phase
        // reads it back cheaply instead of paying full price per file.
        type: "text",
        text: `Here is the complete legacy codebase to analyze (${files.length} files):\n\n${codebase}`,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    messages: [
      {
        role: "user",
        content:
          "Analyze this codebase. Detect the framework and version, audit every dependency for risk (outdated/vulnerable/deprecated) and propose secure replacements, identify the top migration risks with the specific files involved, build a dependency graph of the main modules, and recommend the single best migration path and target stack. Be concrete and cite real files.",
      },
    ],
  })

  const raw = textOf(msg)
  const report = JSON.parse(raw) as AnalysisReport

  const usage = msg.usage
  return {
    report,
    tokens: usage.input_tokens + usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
  }
}

/**
 * A fast, cheap pre-scan used at upload time to label files and give the user
 * an instant read on the project before the full analysis runs.
 */
export async function quickDetect(
  files: SourceFileInput[],
): Promise<{ framework: string; language: string; confidence: string }> {
  const client = anthropic()
  // Only the manifest-ish files matter for detection — keep it cheap.
  const signal = files
    .filter((f) =>
      /package\.json|composer\.json|requirements\.txt|Gemfile|\.csproj|wp-config|angular\.json|bower\.json/i.test(
        f.path,
      ),
    )
    .slice(0, 8)
  const sample = (signal.length ? signal : files.slice(0, 8))
    .map((f) => `FILE ${f.path}:\n${f.content.slice(0, 1500)}`)
    .join("\n\n")

  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            framework: { type: "string" },
            language: { type: "string" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["framework", "language", "confidence"],
        },
      },
    },
    messages: [
      {
        role: "user",
        content: `Identify the primary framework and language of this project from its manifest/config files. Respond with the framework, language, and your confidence.\n\n${sample}`,
      },
    ],
  })
  return JSON.parse(textOf(msg))
}
