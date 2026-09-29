import type { Issue, Severity } from "./types";
const WEIGHT: Record<Severity, number> = { critical: 30, high: 12, medium: 5, low: 1, info: 0 };
const LOW_CAP = 10; // cap lows so dozens of trivial issues don't tank the score
/** 100 = clean; each issue subtracts by severity (lows capped at 10 penalty), floor 0. */
export function healthScore(issues: Issue[]): number {
  const bySev = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const i of issues) bySev[i.severity]++;
  const lowPenalty = Math.min(bySev.low * WEIGHT.low, LOW_CAP);
  const rest = bySev.critical * WEIGHT.critical + bySev.high * WEIGHT.high + bySev.medium * WEIGHT.medium;
  return Math.max(0, 100 - rest - lowPenalty);
}
