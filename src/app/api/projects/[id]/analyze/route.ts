import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { analyzeCodebase } from "@/lib/ai/analyzer"
import { priceForProject } from "@/lib/migration-paths"
import type { MigrationPath } from "@prisma/client"

export const maxDuration = 300

const VALID_PATHS = new Set([
  "PHP_TO_LARAVEL",
  "JQUERY_TO_REACT",
  "WORDPRESS_TO_NEXTJS",
  "PYTHON2_TO_PYTHON3",
  "ANGULARJS_TO_REACT",
  "VANILLA_TO_VUE",
  "CUSTOM",
])

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { files: true },
  })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.project.update({ where: { id: project.id }, data: { status: "ANALYZING" } })

  try {
    const { report, tokens, cacheReadTokens } = await analyzeCodebase(
      project.files.map((f) => ({ path: f.path, content: f.content })),
    )

    const highRisk = report.risks.some((r) => r.severity === "high" || r.severity === "critical")
    const riskLevel = highRisk ? "HIGH" : report.risks.length > 2 ? "MEDIUM" : "LOW"
    const recommended = VALID_PATHS.has(report.recommendedPath)
      ? (report.recommendedPath as MigrationPath)
      : "CUSTOM"

    await prisma.$transaction([
      prisma.analysis.upsert({
        where: { projectId: project.id },
        create: {
          projectId: project.id,
          summary: report.summary,
          framework: report.framework,
          frameworkVer: report.frameworkVersion,
          language: report.language,
          dependencies: report.dependencies as object,
          risks: report.risks as object,
          dependencyGraph: report.dependencyGraph as object,
          recommendedPath: recommended,
          recommendedStack: report.recommendedStack,
        },
        update: {
          summary: report.summary,
          framework: report.framework,
          frameworkVer: report.frameworkVersion,
          language: report.language,
          dependencies: report.dependencies as object,
          risks: report.risks as object,
          dependencyGraph: report.dependencyGraph as object,
          recommendedPath: recommended,
          recommendedStack: report.recommendedStack,
        },
      }),
      prisma.project.update({
        where: { id: project.id },
        data: {
          status: "ANALYZED",
          riskLevel,
          sourcePath: recommended,
          targetStack: report.recommendedStack,
          priceCents: priceForProject(project.fileCount, riskLevel),
          detectedStack: {
            framework: report.framework,
            version: report.frameworkVersion,
            language: report.language,
          },
        },
      }),
    ])

    return NextResponse.json({ ok: true, report, usage: { tokens, cacheReadTokens } })
  } catch (e) {
    await prisma.project.update({ where: { id: project.id }, data: { status: "FAILED" } })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
