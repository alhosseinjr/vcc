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

export const maxDuration = 20;

const MAX_FILES = 25;
const MAX_FILE_BYTES = 1_048_576; // 1MB per file
const MAX_TOTAL_BYTES = 15 * 1024 * 1024; // 15MB total
const MAX_PATH_LENGTH = 240;

const fileSchema = z.object({
  name: z.string().trim().min(1).max(MAX_PATH_LENGTH),
  content: z.string().max(MAX_FILE_BYTES),
});

const bodySchema = z.object({
  files: z.array(fileSchema).min(1).max(MAX_FILES),
});

const safeName = (name: string) => {
  if (name.length > MAX_PATH_LENGTH) return false;
  if (name.includes("..") || name.startsWith("/") || name.startsWith("\\")) return false;
  const parts = name.split(/[\\/]+/).filter(Boolean);
  if (!parts.length) return false;
  return !parts.some((part) => part === "" || part === "." || part === "..");
};

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input. Too many files or oversized payload." }, { status: 400 });
  }

  const files = parsed.data.files.filter((f) => safeName(f.name));
  if (files.length === 0) {
    return NextResponse.json({ error: "No valid files were provided." }, { status: 400 });
  }

  let totalBytes = 0;
  for (const file of files) {
    totalBytes += new TextEncoder().encode(file.content).length;
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "Project is too large for static analysis." }, { status: 413 });
  }

  const key = process.env.GROQ_API_KEY || "";
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
    const priority = candidates
      .filter((f) => /(?:auth|login|middleware|route|api|db|config|env|secret|jwt|token|session)/i.test(f.name))
      .concat(candidates.filter((f) => !/(?:auth|login|middleware|route|api|db|config|env|secret|jwt|token|session)/i.test(f.name)));

    const targets = priority.slice(0, 8);
    let limited = false;

    for (let i = 0; i < targets.length; i += 4) {
      const batch = await Promise.all(
        targets.slice(i, i + 4).map((f) => groqReview(key, f.name, f.content))
      );
      batch.forEach((b) => {
        issues.push(...b.issues);
        limited ||= b.rateLimited;
      });
      if (limited) break;
    }

    if (limited) {
      aiNote = "AI review is partial because the provider is rate-limited. Deterministic checks are complete.";
    }
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
}
