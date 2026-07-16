// Bindings and secrets available on the Cloudflare env at request time.
// Set these in the Cloudflare dashboard (Workers → Settings → Variables), not
// in .env — .env only covers local `next dev` / `opennextjs-cloudflare preview`.
interface CloudflareEnv {
  ASSETS: Fetcher

  DATABASE_URL: string
  ANTHROPIC_API_KEY: string
  AUTH_SECRET: string
  NEXTAUTH_URL: string
  NEXT_PUBLIC_APP_URL: string

  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string

  GITHUB_ID?: string
  GITHUB_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}
