import { NextResponse } from "next/server";
import { z } from "zod";
import { groqFix } from "@/lib/llm/groq-client";

export const maxDuration = 20;

const fixSchema = z.object({
  title: z.string().trim().min(1).max(200),
  explanation: z.string().max(1000).optional(),
  evidence: z.string().max(500).optional(),
  file: z.string().trim().min(1).max(240).refine((value) => !value.includes("..") && !value.startsWith("/")),
  line: z.number().int().min(1).max(20000),
  context: z.string().min(1).max(12000),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = fixSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fix request." }, { status: 400 });
  }

  const envKey = process.env.GROQ_API_KEY || "";
  const byokKey = process.env.ALLOW_USER_GROQ_KEY === "true"
    ? req.headers.get("x-groq-key") || undefined
    : undefined;

  const apiKey = byokKey || envKey;
  if (!apiKey) {
    return NextResponse.json({ error: "AI fix generation is unavailable." }, { status: 503 });
  }

  const result = await groqFix(apiKey, {
    title: parsed.data.title,
    explanation: parsed.data.explanation ?? "",
    evidence: parsed.data.evidence ?? "",
    file: parsed.data.file,
    line: parsed.data.line,
    context: parsed.data.context,
  });

  if (result.rateLimited) {
    return NextResponse.json({ error: "The AI service is currently rate-limited. Try again later." }, { status: 429 });
  }

  if (!result.fix) {
    return NextResponse.json({ error: "AI fix generation failed. No safe patch was produced." }, { status: 502 });
  }

  return NextResponse.json({ fix: result.fix });
}
