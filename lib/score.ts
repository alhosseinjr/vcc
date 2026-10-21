import type { Issue, Severity } from "./types";

const WEIGHT: Record<Severity, number> = { info: 0, low: 1, medium: 5, high: 12, critical: 30 };
const LOW_CAP = 10; // cap lows so dozens of trivial issues don't tank the score
/** Curve constant: the larger it is, the kinder the mid-range. See README/Help for the readable explanation. */
const CURVE = 45;

/**
 * 100 = clean. Penalty is driven by the *average* severity points per file that has
 * issues, mapped through a soft exponential curve.
 *
 * Why per-file average: a raw subtraction (`100 - 30 x criticals`) reaches 0 for any
 * realistic project — a GitHub repo with one flagged line in 40 files scores 0, so the
 * number stops meaning anything. Averaging keeps small scans honest (one file, one
 * critical -> ~51) while a repo where every file has one minor issue reads as "mostly
 * fine, needs a pass" rather than a flat 0.
 */
export function healthScore(issues: Issue[]): number {
  if (issues.length === 0) return 100;
  const bySev: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const i of issues) bySev[i.severity]++;
  const lowPenalty = Math.min(bySev.low * WEIGHT.low, LOW_CAP);
  const total =
    bySev.critical * WEIGHT.critical + bySev.high * WEIGHT.high + bySev.medium * WEIGHT.medium + lowPenalty;
  const filesTouched = new Set(issues.map((i) => i.file)).size;
  const avgPenalty = total / Math.max(1, filesTouched);
  const penalty = 100 * (1 - Math.exp(-avgPenalty / CURVE));
  return Math.round(Math.max(0, 100 - penalty));
}
