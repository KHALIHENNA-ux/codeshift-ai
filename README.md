<div align="center">

# CodeShift

### The AI Code Modernization Engine

**Turn legacy code into modern, production-ready applications. Automatically.**

Upload your old codebase. CodeShift analyzes it, plans the migration, rewrites the code into a modern stack, tests it, and hands you back a working application — in hours, not months.

Runs on **Claude Opus 4.8** via the Anthropic API.

</div>

---

## What it does

CodeShift is a full SaaS that automates what an agency modernization engagement does manually:

1. **Smart Codebase Analysis** — Scans the entire repo, maps the module dependency graph, detects the framework and version, audits every dependency for risk, and flags migration risks *before* a line is touched.
2. **Migration Planning** — Proposes a dependency-aware plan and the ideal target stack.
3. **Intelligent Code Rewriting** — Restructures code following clean architecture and the conventions of the target stack — a real rewrite, not a line-by-line transliteration — streamed live, token by token.
4. **Frontend Redesign on Demand** — Optionally rebuild the UI in a modern, responsive, accessible style while migrating.
5. **Auto-Generated Tests** — Every migrated code file ships with a generated test suite.
6. **Side-by-Side Diff Viewer** — Old vs. new in a Monaco diff editor, with the engine's rationale for every file.
7. **Dependency Modernization** — Replaces outdated/vulnerable libraries with maintained, secure alternatives.
8. **Documentation Generator** — Produces a full README and API docs for the modernized project.
9. **One-Click Export / Deploy** — Download the modernized project as a ready-to-run zip.

### Supported migration paths

| From | To |
|------|----|
| Legacy PHP | Laravel 11 + Inertia (React) |
| jQuery | React 18 + TypeScript |
| WordPress | Next.js 14 (App Router) |
| Python 2 | Python 3.12 |
| AngularJS | React 18 + TypeScript |
| Vanilla JS | Vue 3 + TypeScript |

---

## How the engine uses Claude

The modernization engine (`src/lib/ai/`) is built on the Anthropic API with the patterns that matter for this workload:

- **Model:** `claude-opus-4-8` — the most capable model, because faithful code understanding and rewriting is the hardest part of the product. A `claude-haiku-4-5` pass handles cheap framework pre-detection at upload.
- **Adaptive thinking** (`thinking: { type: "adaptive" }`) on analysis, planning, and rewriting — these are genuine reasoning tasks, so Claude decides how much to think. Paired with `effort: "high"`.
- **Streaming** on every file rewrite — code files are long outputs; streaming avoids HTTP timeouts and powers the live token-by-token UI.
- **Prompt caching** on the legacy-codebase context. The full repo is rendered once as a cached system block (`ttl: "1h"`, byte-stable, deterministically sorted). The analyzer primes it and the migrator re-reads it for *every* file at ~0.1× cost instead of re-paying for the whole codebase each time — the single biggest cost lever in the pipeline.
- **Structured outputs** (`output_config.format` + JSON schema) for the analysis report, migration plan, and docs, so they drive the UI directly instead of being scraped from prose.

See `src/lib/ai/analyzer.ts` and `src/lib/ai/migrator.ts`.

---

## Tech stack

- **Next.js 14** (App Router, RSC, route handlers with SSE streaming)
- **TypeScript** end to end
- **Tailwind CSS** + custom dark design system
- **Prisma** + PostgreSQL
- **NextAuth v5** (credentials + optional GitHub/Google OAuth)
- **Monaco** diff editor
- **Stripe** for per-migration billing
- **Anthropic SDK** (`@anthropic-ai/sdk`)

---

## Getting started

### Prerequisites

- Node 18+
- A PostgreSQL database
- An Anthropic API key — https://console.anthropic.com

### Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#   → set ANTHROPIC_API_KEY, DATABASE_URL, AUTH_SECRET

# 3. Database
npm run db:generate
npm run db:push
npm run db:seed        # optional: demo@codeshift.dev / demo1234

# 4. Run
npm run dev
```

Open http://localhost:3000.

### Try it

1. Create an account (your first migration is free).
2. **New project** → upload a `.zip` of a legacy codebase.
3. Watch the analysis: framework detection, dependency audit, risk flags, dependency graph.
4. Pick a migration path + optional redesign → **Start migration**.
5. Watch it rewrite live, then open the **diff viewer** and **download** the modernized project.

---

## Project structure

```
src/
├── app/
│   ├── (auth)/            login + register
│   ├── dashboard/         projects, upload, analysis, live migration, diff viewer
│   ├── api/
│   │   ├── upload/        zip ingest + fast framework detection
│   │   ├── projects/[id]/
│   │   │   ├── analyze/   Smart Codebase Analysis
│   │   │   ├── migrate/   SSE streaming migration
│   │   │   ├── download/  zip export of the modernized project
│   │   │   └── checkout/  Stripe checkout
│   │   └── webhooks/stripe/
│   └── page.tsx           landing page
├── lib/
│   ├── ai/                the engine: client, prompts, analyzer, migrator
│   ├── parsers/           zip → source files
│   ├── auth.ts  prisma.ts  stripe.ts  migration-paths.ts  utils.ts
└── components/            ui primitives, landing, dashboard, diff viewer
```

---

## Pricing model

Per-migration, **$500–$2,000**, scaled by file count and complexity (high-risk codebases cost more). First migration free via a signup credit. See `priceForProject()` in `src/lib/migration-paths.ts`.

---

<div align="center">

*The code you're scared to touch, turned into something you're proud to ship.*

</div>
