import type { Issue } from "./types";

/** Groups duplicate issues (same rule title + same file) into one card with an instanceCount. */
export function groupIssues(issues: Issue[]): (Issue & { instanceCount: number; instanceLines: number[] })[] {
  const map = new Map<string, Issue & { instanceCount: number; instanceLines: number[] }>();
  for (const issue of issues) {
    const key = `${issue.title}::${issue.file}::${issue.source}`;
    const existing = map.get(key);
    if (existing) {
      existing.instanceCount++;
      existing.instanceLines.push(issue.line);
    } else {
      map.set(key, { ...issue, instanceCount: 1, instanceLines: [issue.line] });
    }
  }
  return Array.from(map.values());
}
