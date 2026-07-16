// Imported from the generated client's WASM entry rather than "@prisma/client":
// that package re-exports through `#main-entry-point`, whose conditions the
// bundler resolves as `node` → the native engine. This path is unambiguous.
import { PrismaClient } from ".prisma/client/wasm"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { getCloudflareContext } from "@opennextjs/cloudflare"

// Workers have no filesystem, so Prisma's binary query engine can't run there.
// The pg driver adapter talks to Postgres over a TCP socket instead, which
// workerd provides under the nodejs_compat flag.

function connectionString(): string {
  // On Workers the value comes from the Cloudflare env at request time. Reading
  // process.env here would inline whatever was set during `next build` — a
  // build-time secret baked into the bundle, and wrong on every deploy after.
  try {
    const url = getCloudflareContext().env.DATABASE_URL
    if (url) return url
  } catch {
    // Not in a Cloudflare request context: `tsx` scripts, prisma seed, tests.
  }
  const local = process.env.DATABASE_URL
  if (!local) {
    throw new Error("DATABASE_URL is not set (Cloudflare env or .env).")
  }
  return local
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function makeClient(): PrismaClient {
  const pool = new Pool({ connectionString: connectionString() })
  return new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

// One client per request on Workers. A TCP socket must not outlive the request
// that opened it: workerd cancels ("script hung") any request that awaits I/O
// owned by an earlier one, so a globally cached pool poisons every other
// DB-touching request. The ExecutionContext is unique per request and keys the
// cache; sockets die with their request, which the Supabase pooler is built for.
const perRequest = new WeakMap<object, PrismaClient>()

function client(): PrismaClient {
  let ctx: object | undefined
  try {
    ctx = getCloudflareContext().ctx
  } catch {
    // Not in a Cloudflare request: `tsx` scripts, prisma seed, next build.
  }
  if (ctx) {
    let c = perRequest.get(ctx)
    if (!c) {
      c = makeClient()
      perRequest.set(ctx, c)
    }
    return c
  }
  if (!globalForPrisma.prisma) globalForPrisma.prisma = makeClient()
  return globalForPrisma.prisma
}

// Construction is deferred to first property access: `getCloudflareContext()`
// throws outside a request, so building the client at module scope would crash
// the worker on import. The proxy keeps the existing `prisma.user.findMany()`
// call sites unchanged.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client()
    const value = Reflect.get(c, prop, c)
    return typeof value === "function" ? value.bind(c) : value
  },
})
