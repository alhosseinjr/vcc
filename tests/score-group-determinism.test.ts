import { describe, expect, it } from "vitest";
import { healthScore } from "../lib/score";
import { groupIssues } from "../lib/group-issues";
import { regexAnalyze } from "../lib/analyzers/regex-analyzer";
import type { Issue, Severity } from "../lib/types";

function fakeIssue(severity: Severity, overrides?: Partial<Issue>): Issue {
  return {
    id: `test:${severity}:${Math.random()}`, severity, category: "security", file: "test.js", line: 1,
    snippet: "", title: "Test issue", explanation: "", analogy: "", fix: "", confidence: "high", source: "rules",
    ...overrides,
  };
}

describe("healthScore", () => {
  it("scores 100 for zero issues", () => {
    expect(healthScore([])).toBe(100);
  });

  it("single-file scan follows the raw penalty through the curve: 3 high, 2 med, 39 low", () => {
    const issues: Issue[] = [
      ...Array.from({ length: 3 }, () => fakeIssue("high")),
      ...Array.from({ length: 2 }, () => fakeIssue("medium")),
      ...Array.from({ length: 39 }, () => fakeIssue("low")),
    ];
    // all in one file, so avg = raw penalty: crit*30 + high*12 + med*5 + min(low,10) = 0 + 36 + 10 + 10 = 56
    // penalty = 100 * (1 - e^(-56/45)) ≈ 71.2 → score ≈ 29
    expect(healthScore(issues)).toBe(29);
  });

  it("caps low penalty at 10 regardless of count", () => {
    const issues: Issue[] = Array.from({ length: 100 }, () => fakeIssue("low"));
    // min(100, 10) = 10 → avg 10 → penalty ≈ 19.9 → score ≈ 80
    expect(healthScore(issues)).toBe(80);
  });

  it("never collapses below 0 and stays proportional", () => {
    const issues: Issue[] = Array.from({ length: 5 }, () => fakeIssue("critical"));
    // 5 combined criticals in one file = 150 raw pts → penalty ≈ 96.4 → score ≈ 4, not hard 0
    expect(healthScore(issues)).toBeGreaterThan(0);
  });

  it("spreads the same raw penalty across more files for a higher score", () => {
    // 40 mediums concentrated in one file vs one per each of 40 files
    const concentrated = Array.from({ length: 40 }, () => fakeIssue("medium"));
    const spread = Array.from({ length: 40 }, (_, f) => fakeIssue("medium", { file: `src/f${f}.ts` }));
    expect(healthScore(spread)).toBeGreaterThan(healthScore(concentrated));
  });

  it("a repo with one small issue per file is not zeroed out", () => {
    // Regression: GitHub scans where every file trips one low/medium rule used to score 0
    const issues = Array.from({ length: 40 }, (_, f) => fakeIssue("medium", { file: `src/f${f}.ts` }));
    expect(healthScore(issues)).toBeGreaterThanOrEqual(80);
  });

  it("info issues have zero weight", () => {
    const issues: Issue[] = Array.from({ length: 50 }, () => fakeIssue("info"));
    expect(healthScore(issues)).toBe(100);
  });
});

describe("groupIssues", () => {
  it("groups same title + same file into one card with instanceCount", () => {
    const issues = [
      fakeIssue("low", { title: "Async code without error handling", file: "assets/llm.js", line: 5 }),
      fakeIssue("low", { title: "Async code without error handling", file: "assets/llm.js", line: 12 }),
      fakeIssue("low", { title: "Async code without error handling", file: "assets/llm.js", line: 20 }),
      fakeIssue("medium", { title: "Different issue", file: "assets/llm.js", line: 1 }),
    ];
    const grouped = groupIssues(issues);
    expect(grouped).toHaveLength(2);
    const asyncGroup = grouped.find((g) => g.title === "Async code without error handling");
    expect(asyncGroup?.instanceCount).toBe(3);
    expect(asyncGroup?.instanceLines).toEqual([5, 12, 20]);
  });

  it("does not group issues from different files", () => {
    const issues = [
      fakeIssue("low", { title: "Same issue", file: "a.js", line: 1 }),
      fakeIssue("low", { title: "Same issue", file: "b.js", line: 1 }),
    ];
    const grouped = groupIssues(issues);
    expect(grouped).toHaveLength(2);
  });
});

describe("determinism", () => {
  it("produces identical rule-based results for identical input", () => {
    const code = 'const apiKey = "sk-live-1234567890";\neval(userInput);\ntry { run(); } catch (e) {}\n';
    const run1 = regexAnalyze("app.js", code);
    const run2 = regexAnalyze("app.js", code);
    // Same number of issues
    expect(run1.length).toBe(run2.length);
    // Same titles in same order
    expect(run1.map((i) => i.title)).toEqual(run2.map((i) => i.title));
    // Same severities in same order
    expect(run1.map((i) => i.severity)).toEqual(run2.map((i) => i.severity));
    // Same lines in same order
    expect(run1.map((i) => i.line)).toEqual(run2.map((i) => i.line));
  });
});
