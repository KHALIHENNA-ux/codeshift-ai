import { languageFromPath } from "@/lib/utils"
import { shouldIgnore, commonRoot, looksBinary, type ParsedFile } from "@/lib/parsers/zip"

// Per-file and total-source budgets for GitHub imports. Everything happens in
// worker memory (no filesystem on Cloudflare Workers), so these caps are what
// keep us far away from the 128 MB isolate limit.
const MAX_FILE_BYTES = 500_000
const MAX_TOTAL_SOURCE_BYTES = 20_000_000 // 20 MB of kept source text
const MAX_ARCHIVE_BYTES = 64_000_000 // decompressed tar stream, pre-filtering
const MAX_FILES = 400 // same engine-wide cap as the .zip path

export class CodebaseTooLargeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CodebaseTooLargeError"
  }
}

/**
 * Parse a gzipped tarball (as served by GitHub's tarball API) entirely in
 * memory: gunzip via the platform-native DecompressionStream, then walk the
 * tar structure in pure JS. No filesystem, no child processes — Workers-safe.
 *
 * Applies the same source filters as the .zip upload path (dependency dirs,
 * binaries, oversized files) and strips the `owner-repo-sha/` root folder
 * GitHub prepends to every entry.
 */
export async function parseTarGz(gzipped: ArrayBuffer): Promise<ParsedFile[]> {
  const tar = await gunzipCapped(gzipped)
  const entries = readTarEntries(tar)

  const root = commonRoot(entries.map((e) => e.path))
  const decoder = new TextDecoder("utf-8", { fatal: false })
  const files: ParsedFile[] = []
  let totalBytes = 0

  for (const entry of entries) {
    let path = entry.path
    if (root) path = path.slice(root.length)
    if (!path || shouldIgnore(path)) continue

    const bytes = entry.data.byteLength
    if (bytes === 0 || bytes > MAX_FILE_BYTES) continue

    const content = decoder.decode(entry.data)
    if (looksBinary(content)) continue

    totalBytes += bytes
    if (totalBytes > MAX_TOTAL_SOURCE_BYTES) {
      throw new CodebaseTooLargeError(
        `This repository has more than ${Math.round(MAX_TOTAL_SOURCE_BYTES / 1_000_000)} MB of source text. Try a smaller repository, or upload a .zip of the relevant subfolder.`,
      )
    }

    files.push({ path, content, language: languageFromPath(path), bytes })
    if (files.length >= MAX_FILES) break
  }

  return files.sort((a, b) => a.path.localeCompare(b.path))
}

// Gunzip with a hard cap on decompressed size, so a huge archive fails with a
// clear error instead of exhausting worker memory.
async function gunzipCapped(gzipped: ArrayBuffer): Promise<Uint8Array> {
  const stream = new Blob([gzipped]).stream().pipeThrough(new DecompressionStream("gzip"))
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_ARCHIVE_BYTES) {
      await reader.cancel().catch(() => {})
      throw new CodebaseTooLargeError(
        "This repository's archive is too large to import from GitHub. Upload a .zip of the relevant subfolder instead.",
      )
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

interface TarEntry {
  path: string
  data: Uint8Array
}

const BLOCK = 512

/**
 * Minimal tar reader: regular files only. Handles the two long-path schemes
 * found in the wild — PAX extended headers (`x`, what `git archive` emits) and
 * GNU LongName (`L`) — plus ustar name+prefix splitting.
 */
function readTarEntries(tar: Uint8Array): TarEntry[] {
  const entries: TarEntry[] = []
  const ascii = new TextDecoder("utf-8")
  let pos = 0
  let overrideName: string | null = null

  while (pos + BLOCK <= tar.length) {
    const header = tar.subarray(pos, pos + BLOCK)
    // Two all-zero blocks mark end-of-archive; one is enough to stop reading.
    if (header.every((b) => b === 0)) break

    const size = parseOctal(header, 124, 12)
    const typeflag = header[156]
    const dataStart = pos + BLOCK
    const dataEnd = dataStart + size
    if (dataEnd > tar.length) break // truncated archive — keep what we have
    pos = dataStart + Math.ceil(size / BLOCK) * BLOCK

    const type = String.fromCharCode(typeflag)
    if (type === "x") {
      // PAX extended header for the NEXT entry: "len key=value\n" records.
      const paxPath = parsePaxPath(ascii.decode(tar.subarray(dataStart, dataEnd)))
      if (paxPath) overrideName = paxPath
      continue
    }
    if (type === "L") {
      // GNU LongName: the data IS the next entry's path (NUL-terminated).
      overrideName = cString(tar.subarray(dataStart, dataEnd), 0, size)
      continue
    }
    if (type === "g") continue // PAX global header (GitHub puts the commit sha here)

    let name = overrideName ?? ustarName(header)
    overrideName = null
    if (!name) continue

    // '0' and NUL are regular files; everything else (dirs, links, fifos…) is skipped.
    if (typeflag === 48 || typeflag === 0) {
      entries.push({ path: name, data: tar.subarray(dataStart, dataEnd) })
    }
  }
  return entries
}

function ustarName(header: Uint8Array): string {
  const name = cString(header, 0, 100)
  const magic = cString(header, 257, 6)
  if (magic.startsWith("ustar")) {
    const prefix = cString(header, 345, 155)
    if (prefix) return `${prefix}/${name}`
  }
  return name
}

function cString(buf: Uint8Array, start: number, maxLen: number): string {
  let end = start
  const stop = Math.min(start + maxLen, buf.length)
  while (end < stop && buf[end] !== 0) end++
  return new TextDecoder("utf-8").decode(buf.subarray(start, end))
}

function parseOctal(buf: Uint8Array, start: number, len: number): number {
  const raw = cString(buf, start, len).trim()
  if (!raw) return 0
  const n = parseInt(raw, 8)
  return Number.isFinite(n) ? n : 0
}

// PAX records are "<decimal length> <key>=<value>\n", length covering the whole record.
function parsePaxPath(block: string): string | null {
  let i = 0
  while (i < block.length) {
    const sp = block.indexOf(" ", i)
    if (sp === -1) break
    const len = parseInt(block.slice(i, sp), 10)
    if (!Number.isFinite(len) || len <= 0) break
    const record = block.slice(sp + 1, i + len - 1) // strip trailing \n
    const eq = record.indexOf("=")
    if (eq !== -1 && record.slice(0, eq) === "path") return record.slice(eq + 1)
    i += len
  }
  return null
}
