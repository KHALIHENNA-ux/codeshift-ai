import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// Creates a demo account so you can sign in immediately after setup.
// Login: demo@codeshift.dev / demo1234
async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 12)
  await prisma.user.upsert({
    where: { email: "demo@codeshift.dev" },
    update: {},
    create: {
      email: "demo@codeshift.dev",
      name: "Demo User",
      passwordHash,
      creditTransactions: {
        create: { amount: 3, type: "SIGNUP_BONUS" },
      },
    },
  })
  console.log("✓ Seeded demo user — demo@codeshift.dev / demo1234")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
