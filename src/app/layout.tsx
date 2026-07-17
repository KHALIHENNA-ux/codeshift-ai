import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { SITE } from "@/lib/seo"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || SITE.url),
  title: {
    default: SITE.title,
    template: "%s | CodeShift",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "AI code modernization",
    "legacy code migration",
    "code migration tool",
    "modernize legacy code",
    "AI code converter",
    "PHP to Laravel",
    "jQuery to React",
    "WordPress to Next.js",
    "Python 2 to 3",
    "AngularJS to React",
    "automatic code rewrite",
    "legacy application modernization",
  ],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    url: SITE.url,
    title: SITE.title,
    description: SITE.description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "CodeShift — AI Code Modernization Engine" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
