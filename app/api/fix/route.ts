import { NextResponse } from "next/server";
import { groqFix } from "@/lib/llm/groq-client";

export const maxDuration = 30;
interface Body { title?: unknown; explanation?: unknown; file?: unknown; line?: unknown; context?: unknown }

export async function POST(req: Request) {
  let b: Body;
  try { b = (await req.json()) as Body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof b.title !== "string" || typeof b.context !== "string" || b.context.length === 0 || b.context.length > 4000)
    return NextResponse.json({ error: "Missing or oversized code context." }, { status: 400 });
  const key = req.headers.get("x-groq-key") || process.env.GROQ_API_KEY || "";
  if (!key) return NextResponse.json({ error: "Add a free Groq key in Settings to generate AI fixes." }, { status: 503 });
  const r = await groqFix(key, { title: b.title.slice(0, 200), explanation: String(b.explanation ?? "").slice(0, 500), file: String(b.file ?? ""), line: Number(b.line) || 0, context: b.context });
  if (r.rateLimited) return NextResponse.json({ error: "The free AI service is busy. Try again in a minute." }, { status: 429 });
  if (!r.fix) return NextResponse.json({ error: "Couldn't generate a fix this time. Try again." }, { status: 502 });
  return NextResponse.json({ fix: r.fix });
}
