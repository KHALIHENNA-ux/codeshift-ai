import { anthropic, MODEL, textOf } from "./client"
import {
  planSystem,
  rewriteSystem,
  PLAN_SCHEMA,
  renderCodebase,
  ENGINEER_SYSTEM,
} from "./prompts"
import { getPath } from "@/lib/migration-paths"
import { languageFromPath } from "@/lib/utils"
import type { EngineEvent, MigrationPlan, RewrittenFile } from "@/types"

interface MigrateInput {
  pathId: string
  designStyle: string
  files: { path: string; content: string }[]
}

/**
 * Intelligent Code Rewriting — the engine.
 *
 * An async generator that yields EngineEvents the API route streams to the
 * browser as SSE. The flow:
 *   1. Plan      — adaptive thinking, structured output
 *   2. Rewrite   — one streaming call per file; the full legacy codebase is a
 *                  cached system block, so every file after the first reads it
 *                  back at ~0.1x cost instead of re-paying for the whole repo
 *   3. Test      — a generated test per rewritten code file
 *   4. Document  — README + API docs for the modernized project
 */
export async function* runMigration(input: MigrateInput): AsyncGenerator<EngineEvent> {
  const path = getPath(input.pathId)
  if (!path) {
    yield { type: "error", message: `Unknown migration path: ${input.pathId}` }
    return
  }

  const client = anthropic()
  const codebase = renderCodebase(input.files)
  let totalTokens = 0
  let cacheReadTokens = 0

  // The large, stable, cached context shared by every call below. Frozen and
  // byte-identical so the prefix-match cache keeps hitting across files.
  const cachedCodebaseBlock = {
    type: "text" as const,
    text: `Here is the complete legacy codebase being migrated (${input.files.length} files):\n\n${codebase}`,
    cache_control: { type: "ephemeral" as const, ttl: "1h" as const },
  }

  // ───────────────────────── 1. Plan ─────────────────────────
  yield { type: "phase", phase: "planning", message: "Designing the migration plan…" }

  let plan: MigrationPlan
  try {
    const planMsg = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: PLAN_SCHEMA as unknown as Record<string, unknown> },
      },
      system: [{ type: "text", text: planSystem(path) }, cachedCodebaseBlock],
      messages: [
        {
          role: "user",
          content: `Produce an ordered, dependency-aware migration plan to move this codebase to ${path.toStack}. Scaffolding/config first, then data layer, then logic, then presentation, then tests and docs. Each step must name the concrete source files it covers.`,
        },
      ],
    })
    totalTokens += planMsg.usage.input_tokens + planMsg.usage.output_tokens
    cacheReadTokens += planMsg.usage.cache_read_input_tokens ?? 0
    plan = JSON.parse(textOf(planMsg))
  } catch (e) {
    yield { type: "error", message: `Planning failed: ${(e as Error).message}` }
    return
  }

  yield { type: "plan", plan }
  yield { type: "progress", progress: 10, step: "Plan ready" }

  // Which files actually carry logic/markup worth rewriting (skip lockfiles,
  // binaries, vendored assets the engine will replace wholesale).
  const rewritable = input.files.filter(
    (f) =>
      !/(package-lock\.json|composer\.lock|yarn\.lock|\.min\.(js|css)$|\.(png|jpe?g|gif|svg|ico|woff2?|ttf|eot)$)/i.test(
        f.path,
      ),
  )

  const results: RewrittenFile[] = []
  const total = rewritable.length || 1

  // ───────────────────────── 2. Rewrite ─────────────────────────
  yield { type: "phase", phase: "rewriting", message: `Rewriting ${total} files…` }

  for (let i = 0; i < rewritable.length; i++) {
    const file = rewritable[i]
    yield { type: "file_start", path: file.path }

    const sys = rewriteSystem(path, input.designStyle)
    let collected = ""

    try {
      // Stream the rewrite — code files are long outputs; streaming avoids
      // HTTP timeouts and lets the UI render tokens live in the diff viewer.
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 32000,
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        system: [{ type: "text", text: sys }, cachedCodebaseBlock],
        messages: [
          {
            role: "user",
            content: `Rewrite the file "${file.path}" for the ${path.label} migration into ${path.toStack}. Use the full codebase above for context (imports, shared helpers, data models, call sites). Output the complete modernized file contents only — choose the correct new path and idioms for the target stack. Begin the output with a single line comment of the form: NEWPATH: <relative/path/in/new/project>`,
          },
        ],
      })

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          collected += event.delta.text
          yield { type: "file_token", text: event.delta.text }
        }
      }
      const final = await stream.finalMessage()
      totalTokens += final.usage.input_tokens + final.usage.output_tokens
      cacheReadTokens += final.usage.cache_read_input_tokens ?? 0
    } catch (e) {
      yield { type: "error", message: `Rewrite failed for ${file.path}: ${(e as Error).message}` }
      continue
    }

    // Pull the engine-chosen new path off the first line, if present.
    let newPath = file.path
    let body = collected
    const m = collected.match(/^\s*(?:\/\/|#|<!--)\s*NEWPATH:\s*(.+?)\s*(?:-->)?\s*\n/)
    if (m) {
      newPath = m[1].trim()
      body = collected.slice(m[0].length)
    }

    const explanation = await explainChange(client, path.label, file.path, newPath)
    totalTokens += explanation.tokens
    cacheReadTokens += explanation.cacheReadTokens

    const rewritten: RewrittenFile = {
      path: newPath,
      content: body.trim(),
      language: languageFromPath(newPath),
      explanation: explanation.text,
      isNew: newPath !== file.path,
      replaces: file.path,
    }

    // ── 3. Generate a test for code files ──
    if (/\.(ts|tsx|js|jsx|py|php|rb|go|java|vue)$/i.test(newPath)) {
      try {
        rewritten.test = await generateTest(client, path.label, rewritten)
      } catch {
        // tests are best-effort; never fail the migration over a missing test
      }
    }

    results.push(rewritten)
    yield { type: "file_done", file: rewritten }
    yield {
      type: "progress",
      progress: 10 + Math.round((80 * (i + 1)) / total),
      step: `Rewrote ${newPath}`,
    }
  }

  // ───────────────────────── 4. Document ─────────────────────────
  yield { type: "phase", phase: "documenting", message: "Generating documentation…" }
  try {
    const docs = await generateDocs(client, path.label, path.toStack, results)
    totalTokens += docs.tokens
    cacheReadTokens += docs.cacheReadTokens
    yield { type: "docs", readme: docs.readme, apiDocs: docs.apiDocs }
  } catch (e) {
    yield { type: "error", message: `Docs generation failed: ${(e as Error).message}` }
  }

  yield { type: "progress", progress: 100, step: "Migration complete" }
  yield { type: "usage", tokens: totalTokens, cacheReadTokens }
  yield { type: "done", message: `Migrated ${results.length} files to ${path.toStack}.` }
}

// Short rationale for the diff viewer's per-file explanation panel.
async function explainChange(
  client: ReturnType<typeof anthropic>,
  label: string,
  fromPath: string,
  toPath: string,
): Promise<{ text: string; tokens: number; cacheReadTokens: number }> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    output_config: { effort: "low" },
    system: ENGINEER_SYSTEM,
    messages: [
      {
        role: "user",
        content: `In 2-3 sentences, explain the key changes made when rewriting "${fromPath}" to "${toPath}" during a ${label} migration. Focus on the architectural and idiomatic shifts a reviewer should know. No preamble.`,
      },
    ],
  })
  return {
    text: textOf(msg).trim(),
    tokens: msg.usage.input_tokens + msg.usage.output_tokens,
    cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0,
  }
}

async function generateTest(
  client: ReturnType<typeof anthropic>,
  label: string,
  file: RewrittenFile,
): Promise<string> {
  // ~8K tokens is under the streaming threshold, so a plain create is fine.
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "medium" },
    system: ENGINEER_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Write a focused test suite for this modernized file from a ${label} migration. Use the idiomatic test framework for its stack. Test real behavior and edge cases, not trivial getters. Output only the test file contents, no fences.\n\nPATH: ${file.path}\n\n${file.content}`,
      },
    ],
  })
  return textOf(msg).trim()
}

async function generateDocs(
  client: ReturnType<typeof anthropic>,
  label: string,
  stack: string,
  files: RewrittenFile[],
): Promise<{ readme: string; apiDocs: string; tokens: number; cacheReadTokens: number }> {
  const manifest = files.map((f) => `- ${f.path}`).join("\n")
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 12000,
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            readme: { type: "string", description: "Full README.md in markdown." },
            apiDocs: { type: "string", description: "API/usage documentation in markdown." },
          },
          required: ["readme", "apiDocs"],
        },
      },
    },
    system: ENGINEER_SYSTEM,
    messages: [
      {
        role: "user",
        content: `The ${label} migration produced a ${stack} project with these files:\n${manifest}\n\nWrite (1) a complete README.md — overview, prerequisites, install, run, build, and project structure — and (2) API/usage documentation covering the main modules and how to use them. Markdown only.`,
      },
    ],
  })
  const parsed = JSON.parse(textOf(msg)) as { readme: string; apiDocs: string }
  return {
    ...parsed,
    tokens: msg.usage.input_tokens + msg.usage.output_tokens,
    cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0,
  }
}
