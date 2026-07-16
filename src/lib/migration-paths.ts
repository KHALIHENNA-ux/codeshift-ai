import type { MigrationPathDef } from "@/types"

// The supported modernization routes. `id` matches the Prisma MigrationPath enum.
export const MIGRATION_PATHS: MigrationPathDef[] = [
  {
    id: "PHP_TO_LARAVEL",
    from: "Legacy PHP",
    to: "Laravel 11",
    label: "PHP to Laravel",
    description:
      "Procedural PHP, raw mysqli queries, and mixed HTML/logic become a clean Laravel app with Eloquent models, controllers, migrations, and Blade/Inertia views.",
    fromLang: "php",
    toStack: "Laravel 11 + Eloquent + Inertia (React)",
    accent: "#8B5CF6",
    icon: "Server",
  },
  {
    id: "JQUERY_TO_REACT",
    from: "jQuery",
    to: "React",
    label: "jQuery to React",
    description:
      "Imperative DOM manipulation and spaghetti event handlers become declarative, component-based React with hooks, typed props, and modern state management.",
    fromLang: "javascript",
    toStack: "React 18 + TypeScript + Vite",
    accent: "#06B6D4",
    icon: "Atom",
  },
  {
    id: "WORDPRESS_TO_NEXTJS",
    from: "WordPress",
    to: "Next.js",
    label: "WordPress to Next.js",
    description:
      "PHP themes and the WP template hierarchy become a headless Next.js App Router site — server components, ISR, and a typed content layer.",
    fromLang: "php",
    toStack: "Next.js 14 (App Router) + TypeScript",
    accent: "#10B981",
    icon: "Globe",
  },
  {
    id: "PYTHON2_TO_PYTHON3",
    from: "Python 2",
    to: "Python 3",
    label: "Python 2 to Python 3",
    description:
      "print statements, old-style classes, and 2.x stdlib calls are modernized to idiomatic Python 3.12 with type hints, f-strings, and pathlib.",
    fromLang: "python",
    toStack: "Python 3.12 + type hints",
    accent: "#F59E0B",
    icon: "Terminal",
  },
  {
    id: "ANGULARJS_TO_REACT",
    from: "AngularJS",
    to: "React",
    label: "AngularJS to React",
    description:
      "AngularJS 1.x controllers, $scope, and directives become React function components, hooks, and a predictable unidirectional data flow.",
    fromLang: "javascript",
    toStack: "React 18 + TypeScript + Vite",
    accent: "#EF4444",
    icon: "Atom",
  },
  {
    id: "VANILLA_TO_VUE",
    from: "Vanilla JS",
    to: "Vue 3",
    label: "Vanilla JS to Vue 3",
    description:
      "Hand-rolled DOM scripts become a Vue 3 single-file-component app with the Composition API, reactive state, and Vite tooling.",
    fromLang: "javascript",
    toStack: "Vue 3 + TypeScript + Vite",
    accent: "#22C55E",
    icon: "Layers",
  },
]

export const DESIGN_STYLES = [
  {
    id: "keep",
    name: "Keep existing layout",
    description: "Preserve the original structure — modernize the code, not the look.",
  },
  {
    id: "minimal",
    name: "Clean & Minimal",
    description: "Generous whitespace, neutral palette, system fonts. Calm and professional.",
  },
  {
    id: "modern-saas",
    name: "Modern SaaS",
    description: "Gradient accents, rounded cards, soft shadows. The 2025 product look.",
  },
  {
    id: "bold-editorial",
    name: "Bold Editorial",
    description: "Big serif headlines, strong contrast, confident typography.",
  },
  {
    id: "dark-pro",
    name: "Dark Pro",
    description: "Dark surfaces, vivid accent, mono-flavored UI. For dev tools and dashboards.",
  },
]

export function getPath(id: string): MigrationPathDef | undefined {
  return MIGRATION_PATHS.find((p) => p.id === id)
}

// Per-migration price: base + per-file, clamped to the $500–$2000 band.
export function priceForProject(fileCount: number, riskLevel?: string | null): number {
  const base = 50000 // $500 in cents
  const perFile = 1500 // $15/file
  let cents = base + fileCount * perFile
  if (riskLevel === "HIGH") cents *= 1.3
  return Math.round(Math.min(Math.max(cents, 50000), 200000))
}
