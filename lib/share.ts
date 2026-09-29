import { SEVERITY_ORDER, type Issue } from "./types";

export type SharedIssue = Pick<Issue, "severity" | "category" | "file" | "line" | "title" | "explanation" | "analogy" | "fix">;
export interface SharedReport { v: 1; score: number; at: number; exp: number | null; issues: SharedIssue[] }
export const MAX_SHARED_ISSUES = 50;

function toB64Url(u: Uint8Array): string {
  let s = ""; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64Url(t: string): Uint8Array {
  const s = atob(t.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream)).arrayBuffer());
}

/** Build a share token. Everything lives in the URL hash, which browsers never send to servers. Source snippets are deliberately left out. */
export async function encodeReport(issues: Issue[], score: number, days: number | null): Promise<string> {
  const slim: SharedIssue[] = [...issues].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)).slice(0, MAX_SHARED_ISSUES)
    .map(({ severity, category, file, line, title, explanation, analogy, fix }) => ({ severity, category, file, line, title, explanation, analogy, fix }));
  const report: SharedReport = { v: 1, score, at: Date.now(), exp: days ? Date.now() + days * 86_400_000 : null, issues: slim };
  return toB64Url(await pipe(new TextEncoder().encode(JSON.stringify(report)), new CompressionStream("deflate-raw")));
}

/** Returns the report, "expired", or null if the token is malformed. Never throws. */
export async function decodeReport(token: string): Promise<SharedReport | "expired" | null> {
  try {
    const r = JSON.parse(new TextDecoder().decode(await pipe(fromB64Url(token), new DecompressionStream("deflate-raw")))) as SharedReport;
    if (r.v !== 1 || !Array.isArray(r.issues)) return null;
    return r.exp && Date.now() > r.exp ? "expired" : r;
  } catch { return null; }
}
