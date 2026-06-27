import { anthropic, MODEL, textOf } from "./client"
import {
  planSystem,
  rewriteSystem,
  repairInstruction,
  PLAN_SCHEMA,
  renderCodebase,
  ENGINEER_SYSTEM,
} from "./prompts"
import { verifyFile, type VerifyOutput } from "./verifier"
import { buildDependencyGraph, topoOrder, norm } from "./depgraph"
import {
  planContext,
  renderWindowBlock,
  estimateTokens,
  type ContextWindow,
} from "./context"
import {
  SymbolMap,
  type SymbolMapEntry,
  extractExports,
  moduleSpecifierFor,
  renderMigratedDeps,
  reconcileImports,
} from "./symbols"
import { getPath } from "@/lib/migration-paths"
import { languageFromPath } from "@/lib/utils"
import type {
  EngineEvent,
  MigrationPlan,
  RewrittenFile,
  VerificationResult,
} from "@/types"

interface MigrateInput {
  pathId: string
  designStyle: string
  files: { path: string; content: string }[]
}

// How many times the engine will try to repair a file that fails verification
// before accepting the best attempt. Bounded so a stubborn file can't stall a run.
const MAX_REPAIR_ROUNDS = 2

type CachedBlock = {
  type: "text"
  text: string
  cache_control: { type: "ephemeral"; ttl: "1h" }
}

// Docs / license / meta files carry no migratable logic. Rewriting them wastes
// model budget — and because they import nothing, the leaves-first order would
// migrate them FIRST, spending the budget before reaching real source. (Surfaced
// by the proof harness: a `six` run exhausted credits on LICENSE/CHANGES/README
// before ever reaching six.py.) The README/API docs are regenerated separately.
function isNonSource(path: string): boolean {
  return /(^|\/)(LICEN[CS]E|COPYING|NOTICE|AUTHORS|CONTRIBUTORS|CHANGES|CHANGELOG|HISTORY|PATENTS|MANIFEST\.in)(\.[\w-]+)?$|\.(md|markdown|rst|txt|adoc|rdoc)$|\.(po|pot|mo)$|(^|\/)\.(gitignore|gitattributes|editorconfig|npmignore|dockerignore|prettierignore|eslintignore)$/i.test(
    path,
  )
}

/**
 * Intelligent Code Rewriting — the engine, now with a closed verification loop.
 *
 * An async generator that yields EngineEvents the API route streams to the
 * browser as SSE. The flow:
 *   1. Plan      — adaptive thinking, structured output
 *   2. Rewrite   — one streaming call per file; the full legacy codebase is a
 *                  cached system block, so every file after the first reads it
 *                  back at ~0.1x cost instead of re-paying for the whole repo
 *   3. Verify    — deterministic structural checks + an adversarial AI review of
 *                  behavior parity, imports, completeness, types, security
 *   4. Repair    — feed the diagnostics back and re-generate the file, then
 *                  re-verify, up to MAX_REPAIR_ROUNDS, tracking convergence.
 *                  Every accepted file carries a confidence score.
 *   5. Test      — a generated test per rewritten code file
 *   6. Document  — README + API docs for the modernized project
 */
export async function* runMigration(input: MigrateInput): AsyncGenerator<EngineEvent> {
  const path = getPath(input.pathId)
  if (!path) {
    yield { type: "error", message: `Unknown migration path: ${input.pathId}` }
    return
  }

  const client = anthropic()
  const usage = { tokens: 0, cacheReadTokens: 0 }

  // Which files actually carry logic/markup worth rewriting (skip lockfiles,
  // binaries, vendored assets the engine will replace wholesale). Computed up
  // front because it also drives the context-window plan below.
  const rewritable = input.files.filter(
    (f) =>
      !/(package-lock\.json|composer\.lock|yarn\.lock|\.min\.(js|css)$|\.(png|jpe?g|gif|svg|ico|woff2?|ttf|eot)$)/i.test(
        f.path,
      ) && !isNonSource(f.path),
  )

  // ── Cross-file coherence: dependency graph + leaves-first rewrite order ──
  // Build the module dependency graph from the legacy code and topologically
  // sort it so a file is only rewritten after every module it imports has been
  // migrated. A target symbol map records the migrated world (new paths/exports)
  // and feeds each file the post-migration interface of its dependencies.
  const graph = buildDependencyGraph(input.files)
  const order = topoOrder(rewritable, graph)

  // ── Scale (pillar #3): partition the rewrite order into context windows that
  // each fit the token budget. A small repo yields ONE window and the original
  // whole-codebase behavior verbatim; a large repo is migrated batch by batch,
  // with the SymbolMap carrying migrated interfaces across window boundaries so
  // coherence survives without ever re-sending the whole codebase. ──
  const ctx = planContext(rewritable, order)
  const allPaths = input.files.map((f) => norm(f.path))

  // The cached context block for a given window. Non-windowed: the entire legacy
  // codebase, byte-identical to the original single-block design so the prefix
  // cache keeps hitting across every call. Windowed: just this batch's files in
  // full, plus a path-only manifest of the rest.
  const blockFor = (w: ContextWindow): CachedBlock => ({
    type: "text",
    text: ctx.windowed
      ? renderWindowBlock(w, rewritable, allPaths)
      : `Here is the complete legacy codebase being migrated (${input.files.length} files):\n\n${renderCodebase(input.files)}`,
    cache_control: { type: "ephemeral", ttl: "1h" },
  })

  // For planning, the model needs the project's shape, not every line. A small
  // repo gets the full codebase (unchanged); a repo too large to fit gets a
  // file/size manifest, so the planning call itself never overflows the window.
  const planBlock: CachedBlock = ctx.windowed
    ? {
        type: "text",
        text: `This is a large legacy codebase (${input.files.length} files) to be migrated in ${ctx.windows.length} dependency-ordered batches. File manifest (path — ~tokens):\n\n${input.files
          .map((f) => `- ${norm(f.path)} (~${estimateTokens(f.content)} tok)`)
          .join("\n")}`,
        cache_control: { type: "ephemeral", ttl: "1h" },
      }
    : blockFor(ctx.windows[0])

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
      system: [{ type: "text", text: planSystem(path) }, planBlock],
      messages: [
        {
          role: "user",
          content: `Produce an ordered, dependency-aware migration plan to move this codebase to ${path.toStack}. Scaffolding/config first, then data layer, then logic, then presentation, then tests and docs. Each step must name the concrete source files it covers.`,
        },
      ],
    })
    addUsage(usage, planMsg)
    plan = JSON.parse(textOf(planMsg))
  } catch (e) {
    yield { type: "error", message: `Planning failed: ${(e as Error).message}` }
    return
  }

  yield { type: "plan", plan }
  yield { type: "progress", progress: 10, step: "Plan ready" }
  yield { type: "graph", order }
  if (ctx.windowed) {
    yield { type: "scale", windows: ctx.windows.length, totalTokens: ctx.totalTokens, budget: ctx.budget }
  }

  // One cached block per window, pre-built so files within a window reuse it
  // (cache hits). `winOf` maps each global rewrite position to its window index;
  // the windows partition `order` consecutively, so the flat loop below just
  // swaps blocks at each batch boundary.
  const blocks = ctx.windows.map((w) => blockFor(w))
  const winOf: number[] = []
  ctx.windows.forEach((w, wi) => w.order.forEach(() => winOf.push(wi)))
  let lastWin = -1

  const byPath = new Map(rewritable.map((f) => [norm(f.path), f]))
  const legacyPaths = new Set(input.files.map((f) => norm(f.path)))
  const symbols = new SymbolMap()
  let totalImportsReconciled = 0
  let totalSymbolsInjected = 0

  const results: RewrittenFile[] = []
  const total = order.length || 1

  // ───────────────────────── 2. Rewrite + Verify + Repair ─────────────────────────
  yield { type: "phase", phase: "rewriting", message: `Rewriting & verifying ${total} files in dependency order…` }

  for (let i = 0; i < order.length; i++) {
    const file = byPath.get(order[i])
    if (!file) continue

    // Select this file's context window. At a batch boundary, announce it — the
    // cached block changes (cache re-primes once per window, then hits within).
    const wi = winOf[i] ?? 0
    const cachedCodebaseBlock = blocks[wi]
    if (ctx.windowed && wi !== lastWin) {
      lastWin = wi
      const w = ctx.windows[wi]
      yield { type: "window", index: w.index, total: ctx.windows.length, files: w.order.length, tokens: w.tokens }
    }

    yield { type: "file_start", path: file.path }

    const sys = rewriteSystem(path, input.designStyle)

    // The already-migrated modules this file imports — feed their NEW paths,
    // exports, and signatures into the prompt so its imports resolve against the
    // migrated world, not the legacy one.
    const depEntries: SymbolMapEntry[] = Array.from(graph.dependsOn.get(order[i]) ?? [])
      .map((t) => symbols.get(t))
      .filter((e): e is SymbolMapEntry => !!e)
    const coherenceContext = renderMigratedDeps(depEntries)
    totalSymbolsInjected += depEntries.reduce((s, e) => s + e.exports.length, 0)

    let newPath = file.path
    let body = ""
    let importsReconciled = 0
    try {
      // Stream the rewrite — code files are long outputs; streaming avoids HTTP
      // timeouts and lets the UI render tokens live in the diff viewer.
      const gen = await streamFile(client, {
        model: MODEL,
        max_tokens: 32000,
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        system: [{ type: "text", text: sys }, cachedCodebaseBlock],
        messages: [
          {
            role: "user",
            content: `Rewrite the file "${file.path}" for the ${path.label} migration into ${path.toStack}. Use the full codebase above for context (imports, shared helpers, data models, call sites). Output the complete modernized file contents only — choose the correct new path and idioms for the target stack. Begin the output with a single line comment of the form: NEWPATH: <relative/path/in/new/project>${coherenceContext}`,
          },
        ],
      })
      const r0 = yield* gen
      addRaw(usage, r0)
      const split = splitNewPath(r0.content, file.path)
      newPath = split.newPath
      // Deterministic safety net: rewrite any import still pointing at a moved
      // legacy module to its new specifier. Minimizes what the verifier must catch.
      const rec = reconcileImports(split.body, file.path, legacyPaths, symbols)
      body = rec.content
      importsReconciled += rec.count
    } catch (e) {
      yield { type: "error", message: `Rewrite failed for ${file.path}: ${(e as Error).message}` }
      continue
    }

    // ── 3 + 4. Verify, then repair until accepted or rounds exhausted ──
    let verification: VerifyOutput
    let round = 0
    try {
      yield { type: "verify_start", path: newPath, round }
      verification = await verifyFile(client, {
        path,
        legacyPath: file.path,
        legacySource: file.content,
        newPath,
        content: body,
        language: languageFromPath(newPath),
        cachedCodebaseBlock,
      })
      addRaw(usage, verification)
      yield { type: "verify_result", path: newPath, round, result: toResult(verification, round) }

      while (!verification.verified && round < MAX_REPAIR_ROUNDS) {
        round++
        const prevErrors = errorCount(verification)
        yield { type: "repair_start", path: newPath, round, issues: verification.diagnostics.length }

        const repairGen = await streamFile(client, {
          model: MODEL,
          max_tokens: 32000,
          thinking: { type: "adaptive" },
          output_config: { effort: "high" },
          system: [{ type: "text", text: sys }, cachedCodebaseBlock],
          messages: [
            {
              role: "user",
              content: repairInstruction(path, newPath, body, verification.diagnostics) + coherenceContext,
            },
          ],
        })
        const rr = yield* repairGen
        addRaw(usage, rr)
        const split = splitNewPath(rr.content, newPath)
        newPath = split.newPath
        const rec = reconcileImports(split.body, file.path, legacyPaths, symbols)
        body = rec.content
        importsReconciled += rec.count

        yield { type: "verify_start", path: newPath, round }
        const next = await verifyFile(client, {
          path,
          legacyPath: file.path,
          legacySource: file.content,
          newPath,
          content: body,
          language: languageFromPath(newPath),
          cachedCodebaseBlock,
        })
        addRaw(usage, next)
        yield { type: "verify_result", path: newPath, round, result: toResult(next, round) }

        // Convergence guard: stop if a repair isn't reducing error-level defects.
        const improving = errorCount(next) < prevErrors || next.verified
        verification = next
        if (!improving) break
      }
    } catch (e) {
      // Verification is best-effort; a failure here must never lose the rewrite.
      yield { type: "error", message: `Verification issue on ${newPath}: ${(e as Error).message}` }
      verification = {
        verified: false,
        confidence: 0,
        behaviorParity: 0,
        diagnostics: [],
        rounds: round,
        tokens: 0,
        cacheReadTokens: 0,
      }
    }

    // Register this file in the target symbol map so files migrated AFTER it
    // (its dependents, which come later in the topo order) see its new exports
    // and import path — the migrated world is now the source of truth.
    symbols.register({
      legacyPath: order[i],
      newPath: norm(newPath),
      moduleSpecifier: moduleSpecifierFor(newPath),
      language: languageFromPath(newPath),
      exports: extractExports(body, newPath),
    })
    totalImportsReconciled += importsReconciled

    const explanation = await explainChange(client, path.label, file.path, newPath)
    usage.tokens += explanation.tokens
    usage.cacheReadTokens += explanation.cacheReadTokens

    const rewritten: RewrittenFile = {
      path: newPath,
      content: body.trim(),
      language: languageFromPath(newPath),
      explanation: explanation.text,
      isNew: newPath !== file.path,
      replaces: file.path,
      verification: toResult(verification, round),
      coherence: {
        dependenciesInjected: depEntries.length,
        importsReconciled,
        deps: depEntries.map((e) => e.newPath),
      },
    }

    // ── 5. Generate a test for code files ──
    if (/\.(ts|tsx|js|jsx|py|php|rb|go|java|vue)$/i.test(newPath)) {
      try {
        rewritten.test = await generateTest(client, path.label, rewritten)
      } catch {
        // tests are best-effort; never fail the migration over a missing test
      }
    }

    results.push(rewritten)
    yield { type: "file_done", file: rewritten }
    // Emit running token totals per file (cumulative). Without this, cost
    // telemetry was only sent once at the very end, so any crash/interruption
    // lost the entire spend record. Consumers treat `usage` as the latest total.
    yield { type: "usage", tokens: usage.tokens, cacheReadTokens: usage.cacheReadTokens }
    yield {
      type: "progress",
      progress: 10 + Math.round((80 * (i + 1)) / total),
      step: `Verified ${newPath} (${rewritten.verification?.confidence ?? 0}% confidence)`,
    }
  }

  // Coherence summary — how much the engine reconciled the migrated world.
  yield {
    type: "coherence",
    importsReconciled: totalImportsReconciled,
    symbolsInjected: totalSymbolsInjected,
  }

  // ───────────────────────── 6. Document ─────────────────────────
  yield { type: "phase", phase: "documenting", message: "Generating documentation…" }
  try {
    const docs = await generateDocs(client, path.label, path.toStack, results)
    usage.tokens += docs.tokens
    usage.cacheReadTokens += docs.cacheReadTokens
    yield { type: "docs", readme: docs.readme, apiDocs: docs.apiDocs }
  } catch (e) {
    yield { type: "error", message: `Docs generation failed: ${(e as Error).message}` }
  }

  const verified = results.filter((r) => r.verification?.verified).length
  yield { type: "progress", progress: 100, step: "Migration complete" }
  yield { type: "usage", tokens: usage.tokens, cacheReadTokens: usage.cacheReadTokens }
  yield {
    type: "done",
    message: `Migrated ${results.length} files to ${path.toStack} — ${verified}/${results.length} passed verification.`,
  }
}

// ─────────────────────────── streaming helper ───────────────────────────

interface RawResult {
  content: string
  tokens: number
  cacheReadTokens: number
}

/**
 * Stream a single generation, yielding file_token events for the live UI and
 * returning the collected text + usage. Used for both the initial rewrite and
 * each repair pass so the user watches fixes happen token by token.
 */
async function streamFile(
  client: ReturnType<typeof anthropic>,
  params: Parameters<ReturnType<typeof anthropic>["messages"]["stream"]>[0],
): Promise<AsyncGenerator<EngineEvent, RawResult>> {
  const stream = client.messages.stream(params)
  async function* gen(): AsyncGenerator<EngineEvent, RawResult> {
    let collected = ""
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        collected += event.delta.text
        yield { type: "file_token", text: event.delta.text }
      }
    }
    const final = await stream.finalMessage()
    return {
      content: collected,
      tokens: final.usage.input_tokens + final.usage.output_tokens,
      cacheReadTokens: final.usage.cache_read_input_tokens ?? 0,
    }
  }
  return gen()
}

// Pull the engine-chosen new path off the first line, if present, and return the
// trimmed body. Falls back to the source path when no NEWPATH line is emitted.
function splitNewPath(collected: string, fallback: string): { newPath: string; body: string } {
  const m = collected.match(/^\s*(?:\/\/|#|<!--)\s*NEWPATH:\s*(.+?)\s*(?:-->)?\s*\n/)
  if (m) {
    return { newPath: m[1].trim(), body: collected.slice(m[0].length).trim() }
  }
  return { newPath: fallback, body: collected.trim() }
}

function errorCount(v: VerifyOutput): number {
  return v.diagnostics.filter((d) => d.severity === "error").length
}

// Strip the usage fields off a VerifyOutput to get the client-facing result,
// stamping in the number of repair rounds taken so far.
function toResult(v: VerifyOutput, rounds: number): VerificationResult {
  return {
    verified: v.verified,
    confidence: v.confidence,
    behaviorParity: v.behaviorParity,
    diagnostics: v.diagnostics,
    rounds,
  }
}

function addUsage(usage: { tokens: number; cacheReadTokens: number }, msg: { usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null } }) {
  usage.tokens += msg.usage.input_tokens + msg.usage.output_tokens
  usage.cacheReadTokens += msg.usage.cache_read_input_tokens ?? 0
}

function addRaw(
  usage: { tokens: number; cacheReadTokens: number },
  r: { tokens: number; cacheReadTokens: number },
) {
  usage.tokens += r.tokens
  usage.cacheReadTokens += r.cacheReadTokens
}

// ─────────────────────────── per-file helpers ───────────────────────────

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
