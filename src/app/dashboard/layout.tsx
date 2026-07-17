import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getBalance } from "@/lib/credits"
import { DashboardHeader } from "@/components/dashboard/header"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const balance = await getBalance(session.user.id)

  return (
    <div className="min-h-screen">
      <DashboardHeader balance={balance} />
      <main className="container py-10">{children}</main>
    </div>
  )
}
