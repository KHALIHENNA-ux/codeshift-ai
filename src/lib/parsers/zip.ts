import JSZip from "jszip"
import { languageFromPath } from "@/lib/utils"

export interface ParsedFile {
  path: string
  content: string
  language: string
  bytes: number
}

// Files we never want to ingest: build output, deps, binaries, VCS metadata.
const IGNORE = [
  /(^|\/)node_modules\//,
  /(^|\/)vendor\//,
  /(^|\/)\.git\//,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)__pycache__\//,
  /(^|\/)\.next\//,
  /(^|\/)coverage\//,
  /\.(png|jpe?g|gif|bmp|ico|webp|svg|woff2?|ttf|eot|otf)$/i,
  /\.(zip|tar|gz|rar|7z|pdf|mp[34]|mov|avi|exe|dll|so|dylib|class|jar|wasm)$/i,
  /\.DS_Store$/,
]

const MAX_FILE_BYTES = 400_000 // skip enormous generated files
const MAX_FILES = 400 // safety cap on codebase size

export function shouldIgnore(path: string): boolean {
  return IGNORE.some((re) => re.test(path))
}

/**
 * Parse an uploaded .zip of a legacy codebase into text files the engine can
 * read. Strips a common top-level folder (the usual "my-project/" wrapper),
 * skips binaries and dependency dirs, and caps total size.
 */
export async function parseZip(buffer: ArrayBuffer): Promise<ParsedFile[]> {
  const zip = await JSZip.loadAsync(buffer)
  const entries = Object.values(zip.files).filter((f) => !f.dir)

  // Detect and strip a single shared root folder.
  const paths = entries.map((e) => e.name)
  const root = commonRoot(paths)

  const files: ParsedFile[] = []
  for (const entry of entries) {
    let path = entry.name
    if (root) path = path.slice(root.length)
    if (!path || shouldIgnore(path)) continue

    const content = await entry.async("string")
    const bytes = Buffer.byteLength(content, "utf8")
    if (bytes === 0 || bytes > MAX_FILE_BYTES) continue
    if (looksBinary(content)) continue

    files.push({ path, content, language: languageFromPath(path), bytes })
    if (files.length >= MAX_FILES) break
  }

  return files.sort((a, b) => a.path.localeCompare(b.path))
}

export function commonRoot(paths: string[]): string {
  if (paths.length === 0) return ""
  const firstSeg = paths[0].split("/")[0] + "/"
  return paths.every((p) => p.startsWith(firstSeg)) ? firstSeg : ""
}

// Cheap heuristic: a high ratio of null bytes / control chars => binary.
export function looksBinary(s: string): boolean {
  const sample = s.slice(0, 1000)
  let suspicious = 0
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i)
    if (c === 0 || (c < 9 && c !== 0) || (c > 13 && c < 32)) suspicious++
  }
  return suspicious / Math.max(sample.length, 1) > 0.1
}
