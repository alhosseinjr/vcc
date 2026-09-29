import { describe, expect, it } from "vitest";
import { compareScans } from "../lib/compare";
import type { Issue } from "../lib/types";

const mk = (title: string, file = "a.js", line = 1, severity: Issue["severity"] = "high"): Issue => ({ id: `${title}${line}`, severity, category: "security", file, line, snippet: "", title, explanation: "", analogy: "", fix: "", confidence: "high", source: "rules" });
describe("compareScans", () => {
  it("splits resolved, added and unchanged; ignores line shifts", () => {
    const r = compareScans([mk("A", "a.js", 1), mk("B")], [mk("A", "a.js", 9), mk("C")]);
    expect(r.resolved.map((i) => i.title)).toEqual(["B"]);
    expect(r.added.map((i) => i.title)).toEqual(["C"]);
    expect(r.unchanged.map((i) => i.title)).toEqual(["A"]);
    expect(r.scoreBefore).toBe(80);
  });
});
