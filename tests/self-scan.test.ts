import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { regexAnalyze } from "../lib/analyzers/regex-analyzer";

/**
 * Meta regression gate: the scanner must not flag its own rule definitions, lesson
 * prose or demo strings. These files legitimately contain the dangerous patterns
 * (as rule regexes and teaching text); only live code should trip rules.
 * Info-level findings are allowed (they carry no score weight).
 */
describe("self-scan", () => {
  for (const f of ["analyzers/regex-analyzer.ts", "analyzers/python-analyzer.ts", "analyzers/ast-analyzer.ts", "learn.ts"]) {
    it(`lib/${f} produces no scored issues`, () => {
      const src = readFileSync(join(process.cwd(), "lib", f), "utf8");
      const issues = regexAnalyze(f, src);
      expect(issues.filter((i) => i.severity !== "info")).toEqual([]);
    });
  }
  it("still flags a genuinely vulnerable line", () => {
    expect(regexAnalyze("a.js", 'const apiKey = "sk-live-1234567890";').length).toBeGreaterThan(0);
  });
});
