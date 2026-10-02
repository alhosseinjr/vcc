import { NextResponse } from "next/server";
import { z } from "zod";
import { astAnalyze } from "@/lib/analyzers/ast-analyzer";
import { dependencyAnalyze } from "@/lib/analyzers/dependency-analyzer";
import { pythonAnalyze } from "@/lib/analyzers/python-analyzer";
import { projectAnalyze } from "@/lib/analyzers/project-analyzer";
import { regexAnalyze } from "@/lib/analyzers/regex-analyzer";
import { groqReview } from "@/lib/llm/groq-client";
import { groupIssues } from "@/lib/group-issues";
import type { Issue } from "@/lib/types";

export const maxDuration = 30;
const AI_FILE_CAP = 8;
const MAX_FILE_SIZE = 250000;
const MAX_TOTAL_SIZE = 5000000;

// Schema to enforce strict request validation
const RequestSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        content: z.string().max(MAX_FILE_SIZE),
      })
    )
    .min(1)
    .max(100),
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

    const files = parsed.data.files;

    const totalSize = files.reduce((acc, f) => acc + f.content.length, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json({ error: "Total project size exceeds 5MB limit." }, { status: 413 });
    }

    const key = req.headers.get("x-groq-key") || process.env.GROQ_API_KEY || "";

    const project = projectAnalyze(files);
    const scannable = files.filter((f) => !project.skippedFiles.includes(f.name));

    const issues: Issue[] = scannable.flatMap((f) =>
      f.name.endsWith("package.json")
        ? dependencyAnalyze(f.name, f.content)
        : [...regexAnalyze(f.name, f.content), ...astAnalyze(f.name, f.content), ...pythonAnalyze(f.name, f.content)]
    );
    issues.push(...project.issues);

    let aiNote: string | undefined;
    if (key) {
      const candidates = scannable.filter((f) => !f.name.endsWith("package.json"));
      const targets = candidates.slice(0, AI_FILE_CAP);
      let limited = false;
      for (let i = 0; i < targets.length; i += 4) {
        const batch = await Promise.all(targets.slice(i, i + 4).map((f) => groqReview(key, f.name, f.content)));
        batch.forEach((b) => {
          issues.push(...b.issues);
          limited ||= b.rateLimited;
        });
        if (limited) break;
      }
      if (limited)
        aiNote = "The free AI service was busy, so AI review is partial. Rule-based results are complete. Try again in a minute.";
      else if (candidates.length > AI_FILE_CAP)
        aiNote = `AI review covered the first ${AI_FILE_CAP} of ${candidates.length} files. Rule-based checks covered all of them.`;
    }

    const grouped = groupIssues(issues);

    return NextResponse.json({
      issues: grouped,
      aiUsed: Boolean(key),
      aiNote,
      projectType: project.type.label,
      skippedFileCount: project.skippedFiles.length,
      skippedFileNames: project.skippedFiles,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
