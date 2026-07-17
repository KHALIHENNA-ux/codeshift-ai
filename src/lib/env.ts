import { getCloudflareContext } from "@opennextjs/cloudflare"

// Runtime env lookup that works on Workers. Dynamic `process.env[name]`
// reads miss Cloudflare bindings (only statically-referenced vars survive
// the build), so prefer the Cloudflare env and fall back to process.env
// for plain-Node contexts (scripts, seed, next build).
export function runtimeEnv(name: string): string | undefined {
  try {
    const v = (getCloudflareContext().env as unknown as Record<string, unknown>)[name]
    if (typeof v === "string" && v) return v
  } catch {
    // Not in a Cloudflare request context.
  }
  return process.env[name]
}
