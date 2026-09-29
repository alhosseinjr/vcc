import type { Issue, Severity } from "./types";
const WEIGHT: Record<Severity, number> = { critical: 20, high: 10, medium: 4, low: 1, info: 0 };
/** 100 = clean; each issue subtracts by severity (floor 0). */
export function healthScore(issues: Issue[]): number {
  return Math.max(0, 100 - issues.reduce((n, i) => n + WEIGHT[i.severity], 0));
}
