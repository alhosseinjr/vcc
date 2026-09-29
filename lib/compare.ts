import { healthScore } from "./score";
import type { Issue } from "./types";

export interface Comparison { resolved: Issue[]; added: Issue[]; unchanged: Issue[]; scoreBefore: number; scoreAfter: number }
/** Issues match by title + file (not line), so a fix that shifts line numbers still counts as "same issue". */
const keyOf = (i: Issue) => `${i.title}|${i.file}`;

export function compareScans(before: Issue[], after: Issue[]): Comparison {
  const b = new Set(before.map(keyOf)), a = new Set(after.map(keyOf));
  return { resolved: before.filter((i) => !a.has(keyOf(i))), added: after.filter((i) => !b.has(keyOf(i))), unchanged: after.filter((i) => b.has(keyOf(i))),
    scoreBefore: healthScore(before), scoreAfter: healthScore(after) };
}
