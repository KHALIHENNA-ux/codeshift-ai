// Central SEO config: site constants + per-migration-path landing-page content.
// Every migration path gets a dedicated, keyword-targeted landing page at
// /migrations/<slug>; the copy here is what those pages (and their JSON-LD) render.

export const SITE = {
  name: "CodeShift",
  url: "https://codeshift.vip",
  title: "CodeShift — AI Code Modernization & Legacy Code Migration Engine",
  description:
    "CodeShift is an AI code modernization engine that migrates legacy codebases automatically: PHP to Laravel, jQuery to React, WordPress to Next.js, Python 2 to 3 and more — analyzed, rewritten, verified and tested in hours, not months.",
  twitter: "@codeshift",
} as const

export interface MigrationSeo {
  slug: string
  /** <title> for the landing page (≤ 60 chars where possible) */
  title: string
  /** meta description (~150–160 chars) */
  description: string
  /** H1 on the page */
  h1: string
  intro: string[]
  /** "What actually changes" bullets: [legacy pattern, modern replacement] */
  changes: [string, string][]
  faq: { q: string; a: string }[]
  keywords: string[]
}

export const MIGRATION_SEO: Record<string, MigrationSeo> = {
  PHP_TO_LARAVEL: {
    slug: "php-to-laravel",
    title: "Convert PHP to Laravel Automatically — AI Migration Tool",
    description:
      "Migrate legacy PHP to Laravel 11 with AI. CodeShift converts procedural PHP, raw mysqli and mixed HTML/logic into Eloquent models, controllers and Blade/Inertia views — tested and verified.",
    h1: "Convert legacy PHP to Laravel — automatically",
    intro: [
      "Legacy PHP is the most common codebase businesses are afraid to touch: procedural scripts, raw mysqli queries, HTML tangled into business logic, and no tests. A manual rewrite to a modern framework routinely takes months and risks breaking behavior nobody documented.",
      "CodeShift migrates PHP to Laravel 11 automatically. Its AI engine reads your whole repository first, maps every include and dependency, then rewrites file-by-file in dependency order into idiomatic Laravel — Eloquent models, controllers, migrations, form requests, and Blade or Inertia (React) views. Every rewritten file is then verified against the original for behavior parity and repaired automatically if the check fails.",
    ],
    changes: [
      ["Procedural scripts & includes", "Controllers, services and routes"],
      ["Raw mysqli / mysql_* queries", "Eloquent models & query builder"],
      ["Mixed HTML + PHP templates", "Blade or Inertia (React) views"],
      ["Hand-rolled auth & sessions", "Laravel auth scaffolding"],
      ["No schema management", "Versioned database migrations"],
      ["Untested spaghetti", "Auto-generated test suite"],
    ],
    faq: [
      {
        q: "Can AI really convert a legacy PHP site to Laravel?",
        a: "Yes. CodeShift doesn't do line-by-line translation — it analyzes the entire codebase, plans the target architecture, and restructures your PHP into idiomatic Laravel 11 with Eloquent, controllers, and views. Each file is verified for behavior parity against the original and automatically repaired if verification fails.",
      },
      {
        q: "What versions of PHP can be migrated?",
        a: "Anything from PHP 5.x upward, including procedural code with mysql_*/mysqli calls, mixed HTML and logic, and custom frameworks. The engine detects the version and patterns automatically during analysis.",
      },
      {
        q: "Does the migrated Laravel app keep my database?",
        a: "Yes — your schema is preserved and expressed as versioned Laravel migrations, with raw queries rewritten to Eloquent models and the query builder on top of the same data.",
      },
      {
        q: "How long does a PHP to Laravel migration take?",
        a: "Hours, not months. A typical small-to-medium codebase is analyzed, rewritten, verified and documented in a single run; you review a side-by-side diff of every file before shipping.",
      },
    ],
    keywords: [
      "PHP to Laravel",
      "convert PHP to Laravel",
      "PHP to Laravel migration tool",
      "modernize legacy PHP",
      "AI PHP converter",
      "migrate PHP website to Laravel",
    ],
  },
  JQUERY_TO_REACT: {
    slug: "jquery-to-react",
    title: "Convert jQuery to React Automatically — AI Migration Tool",
    description:
      "Rewrite jQuery to React 18 with AI. CodeShift turns imperative DOM manipulation and event spaghetti into typed, component-based React with hooks — verified for behavior parity.",
    h1: "Convert jQuery to React — automatically",
    intro: [
      "jQuery powered the web for fifteen years, and millions of production apps still depend on it — selectors mutating the DOM, event handlers bound in ready() blocks, state scattered across data attributes. Rewriting that by hand into React means re-discovering every implicit behavior the hard way.",
      "CodeShift converts jQuery codebases to React 18 + TypeScript automatically. The engine maps your scripts, plugins and DOM touchpoints, then rewrites them as declarative function components with hooks, typed props, and predictable state — not a mechanical wrapper, a real re-architecture. Every file is verified against the original for behavior parity, and the output ships with tests and a full diff.",
    ],
    changes: [
      ["$(selector) DOM manipulation", "Declarative JSX components"],
      ["ready() blocks & event soup", "Hooks & typed event handlers"],
      ["State in data-* attributes", "useState / useReducer state"],
      ["jQuery plugins", "Maintained React equivalents"],
      ["Global scripts", "ES modules bundled by Vite"],
      ["No types, no tests", "TypeScript + generated tests"],
    ],
    faq: [
      {
        q: "Can jQuery code be converted to React automatically?",
        a: "Yes. CodeShift analyzes your jQuery code's DOM manipulation, events and implicit state, then rewrites it as component-based React 18 with hooks and TypeScript. It's a re-architecture into idiomatic React, not a find-and-replace, and every file is verified for behavior parity.",
      },
      {
        q: "What happens to jQuery plugins?",
        a: "The engine identifies each plugin's role and replaces it with a maintained React equivalent or a small typed component, flagging anything that needs a human decision in the migration plan before rewriting starts.",
      },
      {
        q: "Do I get TypeScript?",
        a: "Yes — the default jQuery migration target is React 18 + TypeScript + Vite, with typed props and state throughout.",
      },
      {
        q: "Will the new React app behave the same as the old site?",
        a: "Each rewritten file passes a behavior-parity verification step against the original, is auto-repaired if it fails, and ships with generated tests plus a side-by-side diff so you can confirm every decision.",
      },
    ],
    keywords: [
      "jQuery to React",
      "convert jQuery to React",
      "jQuery to React migration",
      "rewrite jQuery in React",
      "AI JavaScript modernization",
      "migrate jQuery app",
    ],
  },
  WORDPRESS_TO_NEXTJS: {
    slug: "wordpress-to-nextjs",
    title: "WordPress to Next.js Migration — Automatic & AI-Powered",
    description:
      "Convert WordPress themes to a headless Next.js 14 site with AI. CodeShift rewrites PHP templates into App Router server components with ISR and a typed content layer.",
    h1: "Migrate WordPress to Next.js — automatically",
    intro: [
      "WordPress themes accumulate years of PHP template overrides, shortcodes and plugin glue. Moving to a modern headless stack usually means a from-scratch rebuild — and quietly losing behavior buried in the template hierarchy.",
      "CodeShift converts WordPress themes into headless Next.js 14 sites automatically. It reads your theme's template hierarchy, custom post types and queries, then generates an App Router project — server components, incremental static regeneration, and a typed content layer — that renders the same content model. The output is verified file-by-file, documented, and ready to deploy on any modern host.",
    ],
    changes: [
      ["PHP template hierarchy", "App Router layouts & pages"],
      ["The Loop & WP_Query", "Typed content-layer queries"],
      ["Shortcodes & template tags", "Reusable server components"],
      ["Full page reloads", "ISR + streaming server rendering"],
      ["Theme functions.php glue", "Typed utilities & config"],
      ["Plugin-dependent behavior", "Explicit, documented code"],
    ],
    faq: [
      {
        q: "Can a WordPress theme be converted to Next.js automatically?",
        a: "Yes. CodeShift parses the theme's template hierarchy, custom post types, and queries, then rewrites them as a Next.js 14 App Router project with server components and a typed content layer that mirrors your existing content model.",
      },
      {
        q: "Does my WordPress content survive the migration?",
        a: "Yes — the migrated site is headless: your content stays in WordPress (or exports to a typed content layer), and the new Next.js frontend queries it. Nothing about the content itself is rewritten.",
      },
      {
        q: "Why move from WordPress to Next.js?",
        a: "Speed, security, and Core Web Vitals: static and ISR-rendered pages served from the edge instead of PHP rendering on every request, no plugin attack surface, and a modern developer workflow with TypeScript and Git.",
      },
      {
        q: "What about SEO during the switch?",
        a: "The generated site preserves URL structure, metadata, and semantic markup from your theme, and Next.js server rendering keeps every page fully crawlable — typically improving rankings because the pages get dramatically faster.",
      },
    ],
    keywords: [
      "WordPress to Next.js",
      "convert WordPress to Next.js",
      "headless WordPress Next.js",
      "WordPress theme to React",
      "WordPress migration tool",
      "modernize WordPress site",
    ],
  },
  PYTHON2_TO_PYTHON3: {
    slug: "python-2-to-python-3",
    title: "Python 2 to Python 3 Converter — AI Migration Tool",
    description:
      "Migrate Python 2 to Python 3.12 with AI — beyond 2to3. CodeShift rewrites old-style classes, print statements and 2.x stdlib calls into typed, idiomatic modern Python, verified per file.",
    h1: "Migrate Python 2 to Python 3 — beyond 2to3",
    intro: [
      "Python 2 reached end-of-life in 2020, yet critical systems still run on it. The official 2to3 tool only handles mechanical syntax, leaving the hard parts — bytes/str semantics, integer division, iterator changes, dead stdlib modules — for you to find in production.",
      "CodeShift migrates Python 2 codebases to idiomatic Python 3.12, not just syntactically valid Python 3. The engine understands the whole codebase, rewrites in dependency order, and modernizes as it goes: type hints, f-strings, pathlib, dataclasses where they fit. Every file is verified for behavior parity against the original — including the bytes/str and division semantics 2to3 silently gets wrong — and repaired automatically when a check fails.",
    ],
    changes: [
      ["print statements", "print() and f-strings"],
      ["Old-style classes", "Modern classes & dataclasses"],
      ["bytes/str ambiguity", "Explicit str vs bytes handling"],
      ["Integer division surprises", "Correct / vs // semantics"],
      ["Dead 2.x stdlib modules", "Their 3.x replacements"],
      ["No annotations", "Full type hints (3.12)"],
    ],
    faq: [
      {
        q: "How is CodeShift better than 2to3 or futurize?",
        a: "2to3 does mechanical syntax fixes and ignores semantics — bytes/str boundaries, integer division, iterator behavior. CodeShift's AI engine reasons about what the code does, rewrites it as idiomatic Python 3.12 with type hints, and then verifies each file for behavior parity against the Python 2 original.",
      },
      {
        q: "Does it handle the bytes vs str problem?",
        a: "Yes — that's precisely where AI migration beats rule-based tools. The engine infers whether each value is text or binary from how it's used and makes the encoding boundaries explicit in the Python 3 code.",
      },
      {
        q: "Will my dependencies be updated too?",
        a: "The analysis phase flags Python-2-only packages and the migration swaps them for maintained Python 3 equivalents, with every substitution listed in the migration plan and final report.",
      },
      {
        q: "Is the output tested?",
        a: "Every migration ships with an auto-generated test suite plus per-file verification results, confidence scores, and a side-by-side diff of old versus new.",
      },
    ],
    keywords: [
      "Python 2 to 3",
      "Python 2 to Python 3 converter",
      "migrate Python 2 to Python 3",
      "2to3 alternative",
      "AI Python migration",
      "upgrade Python 2 codebase",
    ],
  },
  ANGULARJS_TO_REACT: {
    slug: "angularjs-to-react",
    title: "AngularJS to React Migration — Automatic & AI-Powered",
    description:
      "Convert AngularJS 1.x to React 18 with AI. CodeShift rewrites controllers, $scope and directives into function components and hooks — typed, tested and verified for parity.",
    h1: "Migrate AngularJS to React — automatically",
    intro: [
      "AngularJS 1.x has been officially unsupported since 2022, and every year on it adds security exposure and hiring pain. But its two-way binding, $scope inheritance, and directive lifecycle make manual migration notoriously treacherous — behavior hides in digest-cycle ordering.",
      "CodeShift converts AngularJS applications to React 18 + TypeScript automatically. The engine maps modules, controllers, services, and directives, then rewrites them as function components with hooks and a predictable unidirectional data flow. Services become typed modules, directives become components, and $scope state becomes explicit props and state. Each file is verified for behavior parity and repaired automatically if verification fails.",
    ],
    changes: [
      ["Controllers + $scope", "Function components & hooks"],
      ["Two-way binding", "Unidirectional data flow"],
      ["Custom directives", "Reusable typed components"],
      ["$http / $q services", "fetch + async/await modules"],
      ["Digest-cycle updates", "React's predictable rendering"],
      ["ng-* template logic", "Plain JSX and TypeScript"],
    ],
    faq: [
      {
        q: "Why migrate off AngularJS now?",
        a: "AngularJS reached end-of-life in January 2022 — no security patches, shrinking plugin ecosystem, and increasingly hard hiring. Every year of delay raises both the risk and the eventual migration cost.",
      },
      {
        q: "Can AngularJS directives be converted to React components?",
        a: "Yes. CodeShift analyzes each directive's template, scope bindings, and link/controller logic and rewrites it as a typed React component with equivalent behavior, verified against the original.",
      },
      {
        q: "What happens to $scope and two-way binding?",
        a: "Implicit $scope state becomes explicit React state and props with unidirectional flow. The engine traces where each scope value is read and written so nothing silently disappears in the rewrite.",
      },
      {
        q: "Do I have to migrate everything at once?",
        a: "No — you choose the scope of each run. Many teams migrate a feature area at a time; the dependency-aware ordering keeps each batch internally consistent.",
      },
    ],
    keywords: [
      "AngularJS to React",
      "convert AngularJS to React",
      "AngularJS migration tool",
      "AngularJS end of life migration",
      "rewrite AngularJS app",
      "AngularJS to React 18",
    ],
  },
  VANILLA_TO_VUE: {
    slug: "vanilla-js-to-vue-3",
    title: "Convert Vanilla JavaScript to Vue 3 — AI Migration Tool",
    description:
      "Turn hand-rolled JavaScript into a Vue 3 app with AI. CodeShift rewrites DOM scripts into single-file components with the Composition API, reactive state and Vite tooling.",
    h1: "Convert vanilla JavaScript to Vue 3 — automatically",
    intro: [
      "Hand-rolled JavaScript apps grow one querySelector at a time until state lives everywhere and nowhere: in the DOM, in globals, in closures. Adding features means archaeology, and onboarding a new developer takes weeks.",
      "CodeShift converts vanilla JavaScript codebases to Vue 3 automatically. The engine maps your scripts, event listeners, and DOM state, then rewrites them as single-file components using the Composition API — reactive state, computed values, and typed props — on modern Vite tooling. The structure of your UI is preserved; the architecture underneath becomes maintainable. Every file is verified for behavior parity and the output ships with tests.",
    ],
    changes: [
      ["querySelector spaghetti", "Single-file components"],
      ["State in the DOM & globals", "Reactive refs & stores"],
      ["addEventListener wiring", "Declarative template bindings"],
      ["Manual DOM updates", "Reactivity-driven rendering"],
      ["Script tags & globals", "ES modules + Vite"],
      ["No structure, no tests", "Composition API + generated tests"],
    ],
    faq: [
      {
        q: "Can plain JavaScript be converted to Vue 3 automatically?",
        a: "Yes. CodeShift traces your DOM manipulation, event listeners, and implicit state, then rewrites them as Vue 3 single-file components with the Composition API — reactive state and declarative templates that do what your imperative code did, verified file-by-file.",
      },
      {
        q: "Why Vue 3 for a vanilla JS app?",
        a: "Vue's template syntax is the shortest conceptual hop from hand-written HTML + JS: your markup structure survives mostly intact while state and events become reactive and declarative. CodeShift also supports React as a target if you prefer.",
      },
      {
        q: "Does it use the Options API or Composition API?",
        a: "The Composition API with <script setup> — the modern, recommended style — plus TypeScript and Vite tooling out of the box.",
      },
      {
        q: "Will the app look the same afterwards?",
        a: "Yes by default: CodeShift preserves your existing layout and styling unless you opt into a frontend redesign during migration, in which case you pick the style and it rebuilds the UI too.",
      },
    ],
    keywords: [
      "vanilla JS to Vue",
      "convert JavaScript to Vue 3",
      "JavaScript to Vue migration",
      "modernize JavaScript app",
      "Vue 3 Composition API migration",
      "AI JavaScript refactor",
    ],
  },
}

export const SLUG_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(MIGRATION_SEO).map(([id, seo]) => [seo.slug, id])
)

export function migrationSlug(id: string): string {
  return MIGRATION_SEO[id]?.slug ?? id.toLowerCase().replace(/_/g, "-")
}
