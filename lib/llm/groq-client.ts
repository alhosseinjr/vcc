import { createHash } from "node:crypto";
import { chunkLines } from "./chunking";
import type { Issue } from "../types";

const URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
export const MAX_CHUNKS_PER_FILE = 3;

const REVIEW_SYSTEM = `You are a senior security engineer reviewing AI-generated code for a NON-TECHNICAL user.
Return ONLY JSON: {"issues":[{"line":number,"severity":"critical|high|medium|low","category":"security|performance|best-practice","title":string,"explanation":"2 plain sentences, no jargon","analogy":"real-world comparison","fix":"corrected code","confidence":"high|medium|low"}]}
Focus on missing auth checks, N+1 queries, missing validation, missing rate limiting, exposed data. Max 8 issues. No markdown.`;
const FIX_SYSTEM = `You fix one problem in code for a non-technical user. Return ONLY the corrected replacement code for the shown lines, with short inline comments. No markdown fences, no prose.`;

interface ChatResult { text: string | null; rateLimited: boolean }
const cache = new Map<string, string>(); // same code + same prompt = same answer, saves free-tier quota

/** One Groq call with response caching and 429 retry (respects retry-after, max ~3s per wait). Never throws. */
async function groqChat(apiKey: string, system: string, user: string, maxTokens: number, json: boolean): Promise<ChatResult> {
  const ck = createHash("sha256").update(system + user).digest("hex");
  const hit = cache.get(ck);
  if (hit !== undefined) return { text: hit, rateLimited: false };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: MODEL, temperature: 0.1, max_tokens: maxTokens, ...(json && { response_format: { type: "json_object" } }),
          messages: [{ role: "system", content: system }, { role: "user", content: user }] }) });
      if (res.status === 429) {
        if (attempt === 2) return { text: null, rateLimited: true };
        await new Promise((r) => setTimeout(r, Math.min(Number(res.headers.get("retry-after")) || 1, 3) * 1000));
        continue;
      }
      if (!res.ok) return { text: null, rateLimited: false };
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content ?? null;
      if (text !== null) { if (cache.size > 200) cache.clear(); cache.set(ck, text); }
      return { text, rateLimited: false };
    } catch { return { text: null, rateLimited: false }; }
  }
  return { text: null, rateLimited: true };
}

/** Deep review of one file, chunked. Rule-based results still show if this returns nothing. */
export async function groqReview(apiKey: string, file: string, content: string): Promise<{ issues: Issue[]; rateLimited: boolean }> {
  const lines = content.split("\n");
  const issues: Issue[] = [];
  const seen = new Set<string>();
  let rateLimited = false;
  for (const chunk of chunkLines(content).slice(0, MAX_CHUNKS_PER_FILE)) {
    const numbered = chunk.text.split("\n").map((l, i) => `${chunk.start + i}: ${l}`).join("\n");
    const r = await groqChat(apiKey, REVIEW_SYSTEM, `File: ${file}\n${numbered}`, 2048, true);
    if (r.rateLimited) { rateLimited = true; break; }
    let parsed: { issues?: Partial<Issue>[] } = {};
    try { parsed = JSON.parse(r.text ?? "{}") as { issues?: Partial<Issue>[] }; } catch { continue; }
    for (const x of parsed.issues ?? []) {
      const line = Number(x.line) || 0;
      const key = `${line}:${x.title}`;
      if (seen.has(key)) continue; // chunks overlap, so the same finding can appear twice
      seen.add(key);
      issues.push({ id: `ai:${file}:${line}:${issues.length}`, severity: x.severity ?? "medium", category: x.category ?? "best-practice", file, line,
        snippet: (lines[line - 1] ?? "").trim().slice(0, 160), title: x.title ?? "Possible issue", explanation: x.explanation ?? "",
        analogy: x.analogy ?? "", fix: x.fix ?? "", confidence: x.confidence ?? "medium", source: "ai" });
    }
  }
  return { issues, rateLimited };
}

/** Generate replacement code for a single issue from the lines around it. */
export async function groqFix(apiKey: string, p: { title: string; explanation: string; file: string; line: number; context: string }): Promise<{ fix: string | null; rateLimited: boolean }> {
  const r = await groqChat(apiKey, FIX_SYSTEM, `Problem: ${p.title}\nWhy: ${p.explanation}\nFile: ${p.file} (around line ${p.line})\nCode:\n${p.context}`, 1024, false);
  const fix = r.text?.replace(/^```\w*\n?|```\s*$/gm, "").trim() || null;
  return { fix, rateLimited: r.rateLimited };
}
