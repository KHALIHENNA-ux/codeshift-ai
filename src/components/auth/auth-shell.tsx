import Link from "next/link"
import { Logo } from "@/components/logo"
import { Card } from "@/components/ui/card"

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="bg-grid absolute inset-0 -z-10" />
      <div className="glow absolute inset-x-0 top-0 -z-10 h-[500px]" />
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <Card className="border-gradient p-8">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </Card>
      </div>
    </div>
  )
}

export function Field({
  name,
  type,
  label,
  placeholder,
}: {
  name: string
  type: string
  label: string
  placeholder: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
      />
    </label>
  )
}
