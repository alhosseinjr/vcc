import { NextResponse } from "next/server";
import { astAnalyze } from "@/lib/analyzers/ast-analyzer";
import { dependencyAnalyze } from "@/lib/analyzers/dependency-analyzer";
import { pythonAnalyze } from "@/lib/analyzers/python-analyzer";
import { projectAnalyze } from "@/lib/analyzers/project-analyzer";
import { regexAnalyze } from "@/lib/analyzers/regex-analyzer";
import { groqReview } from "@/lib/llm/groq-client";
import type { Issue } from "@/lib/types";

export const maxDuration = 30;
const AI_FILE_CAP = 8; // keeps a scan inside the time limit and the free Groq quota
interface Body { files: { name: string; content: string }[] }

export async function POST(req: Request) {
  let body: Body;
  try { body = (await req.json()) as Body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!Array.isArray(body.files) || body.files.length === 0 || body.files.length > 100)
    return NextResponse.json({ error: "Send between 1 and 100 files." }, { status: 400 });

  const key = req.headers.get("x-groq-key") || process.env.GROQ_API_KEY || ""; // never logged
  const files = body.files.slice(0, 50);
  const issues: Issue[] = files.flatMap((f) => f.name.endsWith("package.json") ? dependencyAnalyze(f.name, f.content) : [...regexAnalyze(f.name, f.content), ...astAnalyze(f.name, f.content), ...pythonAnalyze(f.name, f.content)]);
  const project = projectAnalyze(files);
  issues.push(...project.issues);

  let aiNote: string | undefined;
  if (key) {
    const candidates = files.filter((f) => !f.name.endsWith("package.json"));
    const targets = candidates.slice(0, AI_FILE_CAP);
    let limited = false;
    for (let i = 0; i < targets.length; i += 4) { // 4 files at a time
      const batch = await Promise.all(targets.slice(i, i + 4).map((f) => groqReview(key, f.name, f.content)));
      batch.forEach((b) => { issues.push(...b.issues); limited ||= b.rateLimited; });
      if (limited) break;
    }
    if (limited) aiNote = "The free AI service was busy, so AI review is partial. Rule-based results are complete. Try again in a minute.";
    else if (candidates.length > AI_FILE_CAP) aiNote = `AI review covered the first ${AI_FILE_CAP} of ${candidates.length} files. Rule-based checks covered all of them.`;
  }
  return NextResponse.json({ issues, aiUsed: Boolean(key), aiNote, projectType: project.type.label });
}
