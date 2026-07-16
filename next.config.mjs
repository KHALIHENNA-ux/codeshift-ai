import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  webpack: (config, { isServer }) => {
    config.externals.push({ 'utf-8-validate': 'commonjs utf-8-validate', bufferutil: 'commonjs bufferutil' })

    if (isServer) {
      // Leave the generated WASM client for esbuild/wrangler to bundle: webpack
      // rewrites its `import './query_engine_bg.wasm'` into a runtime file read
      // (static/wasm/*.wasm), which Workers cannot serve — there is no fs.
      config.externals.push({ '.prisma/client/wasm': 'commonjs .prisma/client/wasm' })
    }
    return config
  },
}

// Makes getCloudflareContext() resolve during `next dev`, so lib/prisma.ts
// reads DATABASE_URL the same way locally as it does on Workers.
initOpenNextCloudflareForDev()

export default nextConfig
