import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: "CodeShift — The AI Code Modernization Engine",
  description:
    "Upload legacy code. CodeShift analyzes it, plans the migration, rewrites it into a modern stack, tests it, and hands you back a working application — in hours, not months.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "CodeShift — Turn legacy code into modern apps. Automatically.",
    description:
      "The code you're scared to touch, turned into something you're proud to ship.",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
