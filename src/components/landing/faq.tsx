import { JsonLd, faqPageLd } from "@/components/seo/json-ld"

const HOME_FAQ = [
  {
    q: "What is CodeShift?",
    a: "CodeShift is an AI code modernization engine. You upload a legacy codebase (or import a GitHub repo); it analyzes the whole project, plans the migration, rewrites it into a modern stack in dependency order, verifies every file for behavior parity, and hands back a tested, documented application with a side-by-side diff.",
  },
  {
    q: "Which legacy code migrations does CodeShift support?",
    a: "PHP to Laravel 11, jQuery to React 18, WordPress to Next.js 14, Python 2 to Python 3.12, AngularJS to React, and vanilla JavaScript to Vue 3 — with more migration paths added continuously.",
  },
  {
    q: "How is this different from asking ChatGPT to rewrite my code?",
    a: "A chat model rewrites one snippet at a time with no view of the whole system. CodeShift builds a dependency graph of your entire codebase, migrates files in the right order so imports stay consistent, injects already-migrated symbols into each rewrite, and runs a closed-loop verifier that checks behavior parity per file and auto-repairs failures.",
  },
  {
    q: "Is the migrated code actually tested?",
    a: "Yes. Every file passes structural checks and an adversarial AI behavior-parity review, failures are repaired automatically, and the finished migration ships with an auto-generated test suite plus per-file confidence scores.",
  },
  {
    q: "How much does an AI code migration cost?",
    a: "Your first migration is free — no credit card required. After that, pricing is per project based on codebase size and complexity, typically $500–$2,000, with no subscription.",
  },
  {
    q: "Is my source code private and secure?",
    a: "Your code is processed solely to produce your migration, is never used to train models, and GitHub imports request read-only access via OAuth that you can revoke at any time.",
  },
  {
    q: "How long does a migration take?",
    a: "Hours, not months. Analysis takes minutes; the rewrite streams live so you watch files being modernized in real time, and a typical small-to-medium codebase completes the same day.",
  },
]

export function FAQ() {
  return (
    <section id="faq" className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">FAQ</p>
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h2>
        <p className="mt-3 text-balance text-muted-foreground">
          Everything about AI-powered legacy code migration, answered.
        </p>
      </div>
      <div className="mx-auto mt-12 max-w-3xl divide-y divide-border/50">
        {HOME_FAQ.map(({ q, a }) => (
          <details key={q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
              {q}
              <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
      <JsonLd data={faqPageLd(HOME_FAQ)} />
    </section>
  )
}
