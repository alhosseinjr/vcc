import { NextResponse } from "next/server";
import { z } from "zod";
import { groqFix } from "@/lib/llm/groq-client";

export const maxDuration = 30;

const RequestSchema = z.object({
  title: z.string().max(200),
  explanation: z.string().max(500).optional(),
  file: z.string().max(255),
  line: z.coerce.number().min(0),
  context: z.string().min(1).max(4000),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => null);
    if (!rawBody) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const key = req.headers.get("x-groq-key") || process.env.GROQ_API_KEY || "";
    if (!key) return NextResponse.json({ error: "Add a free Groq key in Settings to generate AI fixes." }, { status: 503 });

    const r = await groqFix(key, {
      title: parsed.data.title,
      explanation: parsed.data.explanation || "",
      file: parsed.data.file,
      line: parsed.data.line,
      context: parsed.data.context,
    });

    if (r.rateLimited) return NextResponse.json({ error: "The free AI service is busy. Try again in a minute." }, { status: 429 });
    if (!r.fix) return NextResponse.json({ error: "Couldn't generate a fix this time. Try again." }, { status: 502 });

    return NextResponse.json({ fix: r.fix });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
