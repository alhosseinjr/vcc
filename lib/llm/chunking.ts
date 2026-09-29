/** A slice of a file. `start` is the 1-based line number of its first line, so AI answers map back to real line numbers. */
export interface Chunk { start: number; text: string }

/** Split long files into overlapping windows so Groq sees the whole file, not just the top. */
export function chunkLines(content: string, size = 300, overlap = 20): Chunk[] {
  const lines = content.split("\n");
  if (lines.length <= size) return [{ start: 1, text: content }];
  const out: Chunk[] = [];
  for (let s = 0; s < lines.length; s += size - overlap) {
    out.push({ start: s + 1, text: lines.slice(s, s + size).join("\n") });
    if (s + size >= lines.length) break;
  }
  return out;
}
