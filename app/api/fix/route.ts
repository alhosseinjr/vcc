import { NextResponse } from "next/server";
import { z } from "zod";
import { groqFix } from "@/lib/llm/groq-client";
import { structuredLog } from "@/lib/logger";

export const maxDuration = 20;

const fixSchema = z.object({
  title: z.string().trim().min(1).max(200),
  explanation: z.string().max(1000).optional(),
  evidence: z.string().max(500).optional(),
  file: z
    .string()
    .trim()
    .min(1)
    .max(240)
    .refine((value) => !value.includes("..") && !value.startsWith("/") && !value.startsWith("\\") && !value.includes("\0")),
  line: z.number().int().min(1).max(20000),
  context: z.string().min(1).max(10000),
});

const REQUEST_TIMEOUT_MS = 18000;

export async function POST(req: Request) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && Number(contentLength) > 50 * 1024) {
      structuredLog("warning", "Fix request body too large", { requestId, contentLength });
      return NextResponse.json({ error: "Request body exceeds size limit." }, { status: 413 });
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      structuredLog("warning", "Invalid JSON in fix request", { requestId });
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = fixSchema.safeParse(raw);
    if (!parsed.success) {
      structuredLog("warning", "Invalid fix schema", {
        requestId,
        errors: parsed.error.errors.length,
      });
      return NextResponse.json({ error: "Invalid fix request." }, { status: 400 });
    }

    const envKey = process.env.GROQ_API_KEY || "";
    const allowByok = process.env.ALLOW_USER_GROQ_KEY === "true";
    const byokValue = allowByok ? req.headers.get("x-groq-key")?.trim() : undefined;

    if (byokValue && !/^[A-Za-z0-9_-]{16,}$/.test(byokValue)) {
      structuredLog("warning", "Rejected malformed BYOK header", { requestId });
      return NextResponse.json({ error: "Invalid API key format." }, { status: 400 });
    }

    const apiKey = envKey || byokValue;
    if (!apiKey) {
      structuredLog("info", "No API key available for fix generation", { requestId });
      return NextResponse.json({ error: "AI fix generation is unavailable." }, { status: 503 });
    }

    if (byokValue && envKey) {
      structuredLog("info", "Using server Groq key instead of BYOK key", { requestId });
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
      structuredLog("warning", "Groq API rate limited", { requestId });
      return NextResponse.json({ error: "The AI service is currently rate-limited. Try again later." }, { status: 429 });
    }

    if (!result.fix) {
      structuredLog("warning", "No valid fix generated", { requestId });
      return NextResponse.json({ error: "AI fix generation failed. No safe patch was produced." }, { status: 502 });
    }

    const duration = Date.now() - startTime;
    structuredLog("info", "Fix generation successful", { requestId, duration });

    return NextResponse.json({ fix: result.fix });
  } catch (error) {
    const duration = Date.now() - startTime;
    structuredLog("error", "Unhandled error in fix generation", {
      requestId,
      duration,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
