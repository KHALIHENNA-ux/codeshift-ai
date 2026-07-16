"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FileCode2, FilePlus2, Info, FlaskConical, FileText, Code2 } from "lucide-react"

const DiffEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.DiffEditor), {
  ssr: false,
  loading: () => (
    <div className="grid h-[600px] place-items-center bg-[hsl(222_47%_4%)] text-sm text-muted-foreground">
      Loading diff editor…
    </div>
  ),
})

const Editor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
})

export interface DiffFile {
  path: string
  language: string
  newContent: string
  oldContent: string | null
  oldPath: string | null
  explanation: string | null
  isNew: boolean
  test: string | null
}

type Tab = "diff" | "test"

export function DiffViewer({
  files,
  readme,
  apiDocs,
}: {
  files: DiffFile[]
  readme: string | null
  apiDocs: string | null
}) {
  const [active, setActive] = useState(0)
  const [tab, setTab] = useState<Tab>("diff")
  const [docView, setDocView] = useState<"none" | "readme" | "api">("none")
  const file = files[active]

  const monacoTheme = "vs-dark"

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      {/* File tree */}
      <div className="space-y-2">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-sm font-medium">
            Files <Badge variant="secondary">{files.length}</Badge>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {files.map((f, i) => (
              <button
                key={f.path}
                onClick={() => {
                  setActive(i)
                  setDocView("none")
                  setTab("diff")
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  active === i && docView === "none"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/60",
                )}
              >
                {f.isNew ? (
                  <FilePlus2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                ) : (
                  <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate font-mono text-xs">{f.path}</span>
              </button>
            ))}
          </div>
        </Card>

        {(readme || apiDocs) && (
          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-3 text-sm font-medium">Docs</div>
            <div className="p-2">
              {readme && (
                <button
                  onClick={() => setDocView("readme")}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    docView === "readme" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/60",
                  )}
                >
                  <FileText className="h-3.5 w-3.5" /> README.md
                </button>
              )}
              {apiDocs && (
                <button
                  onClick={() => setDocView("api")}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    docView === "api" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/60",
                  )}
                >
                  <FileText className="h-3.5 w-3.5" /> API.md
                </button>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Viewer */}
      <div className="space-y-4">
        {docView !== "none" ? (
          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-3 text-sm font-medium">
              {docView === "readme" ? "README.md" : "docs/API.md"}
            </div>
            <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap bg-[hsl(222_47%_4%)] p-6 font-mono text-xs leading-relaxed text-foreground/90">
              {docView === "readme" ? readme : apiDocs}
            </pre>
          </Card>
        ) : file ? (
          <>
            {/* path header + new/replaces */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-sm">
                {file.oldPath && file.oldPath !== file.path && (
                  <span className="text-muted-foreground line-through">{file.oldPath}</span>
                )}
                <span className="text-foreground">{file.path}</span>
                {file.isNew && <Badge variant="accent">new file</Badge>}
              </div>
              {file.test && (
                <div className="flex gap-1 rounded-lg border border-border p-0.5">
                  <Button
                    size="sm"
                    variant={tab === "diff" ? "secondary" : "ghost"}
                    onClick={() => setTab("diff")}
                  >
                    <Code2 className="h-3.5 w-3.5" /> Diff
                  </Button>
                  <Button
                    size="sm"
                    variant={tab === "test" ? "secondary" : "ghost"}
                    onClick={() => setTab("test")}
                  >
                    <FlaskConical className="h-3.5 w-3.5" /> Test
                  </Button>
                </div>
              )}
            </div>

            {/* explanation */}
            {file.explanation && tab === "diff" && (
              <Card className="border-primary/20 bg-primary/5">
                <div className="flex gap-3 p-4">
                  <Info className="h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm leading-relaxed text-foreground/90">{file.explanation}</p>
                </div>
              </Card>
            )}

            <Card className="overflow-hidden">
              {tab === "diff" ? (
                <DiffEditor
                  height="600px"
                  theme={monacoTheme}
                  language={file.language}
                  original={file.oldContent ?? "// New file — no legacy counterpart.\n"}
                  modified={file.newContent}
                  options={{
                    readOnly: true,
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    fontSize: 12,
                    scrollBeyondLastLine: false,
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                />
              ) : (
                <Editor
                  height="600px"
                  theme={monacoTheme}
                  language={file.language}
                  value={file.test ?? ""}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 12,
                    scrollBeyondLastLine: false,
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                />
              )}
            </Card>
          </>
        ) : (
          <Card className="grid h-[400px] place-items-center text-muted-foreground">
            No files to display.
          </Card>
        )}
      </div>
    </div>
  )
}
