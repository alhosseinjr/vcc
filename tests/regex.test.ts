import { describe, expect, it } from "vitest";
import { regexAnalyze } from "../lib/analyzers/regex-analyzer";
import { healthScore } from "../lib/score";

describe("regexAnalyze", () => {
  it("flags hardcoded secrets", () => {
    const r = regexAnalyze("a.js", 'const apiKey = "sk-live-1234567890";');
    expect(r.some((i) => i.title.includes("Secret"))).toBe(true);
  });
  it("flags SQL built with template strings", () => {
    expect(regexAnalyze("db.ts", "db.query(`SELECT * FROM users WHERE id = ${id}`)")[0].severity).toBe("critical");
  });
  it("flags eval and reports line numbers", () => {
    expect(regexAnalyze("x.js", "ok\neval(input)")[0].line).toBe(2);
  });
  it("returns nothing for clean code", () => { expect(regexAnalyze("c.js", "const a = 1;")).toEqual([]); });
  it("scores clean code 100 and floors at 0", () => {
    expect(healthScore([])).toBe(100);
    const bad = regexAnalyze("a.js", 'eval(x)\n'.repeat(20));
    expect(healthScore(bad)).toBe(0);
  });
});

describe("auto-fix patches", () => {
  it("replaces hardcoded secrets with env vars, keeping indentation", () => {
    const [i] = regexAnalyze("a.js", '  const apiKey = "sk-live-1234567890";');
    expect(i.patched).toBe("  const apiKey = process.env.APIKEY;");
  });
  it("patches eval and removes console.log", () => {
    expect(regexAnalyze("a.js", "eval(x)")[0].patched).toBe("JSON.parse(x)");
    expect(regexAnalyze("a.js", "console.log(1)")[0].patched).toBe("");
  });
  it("gives advice only when no safe patch exists", () => {
    expect(regexAnalyze("a.js", "db.query(`SELECT * FROM t WHERE id = ${id}`)")[0].patched).toBeUndefined();
  });
});
