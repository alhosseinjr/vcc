import { describe, expect, it } from "vitest";
import { astAnalyze } from "../lib/analyzers/ast-analyzer";

const titles = (code: string, f = "a.ts") => astAnalyze(f, code).map((i) => i.title);

describe("astAnalyze", () => {
  it("detects N+1 awaits inside loops", () => {
    expect(titles("async function f(ids){ for (const id of ids) { await db.query(id); } }")).toContain("Database or network call inside a loop (N+1)");
  });
  it("does not flag awaits outside loops", () => {
    expect(titles("async function f(){ try { await fetch('/x'); } catch (e) { log(e); } }")).toEqual([]);
  });
  it("detects empty catch blocks", () => { expect(titles("try { a(); } catch (e) {}")).toContain("Errors silently ignored"); });
  it("flags very complex functions", () => {
    const body = Array.from({ length: 12 }, (_, i) => `if (x === ${i}) return ${i};`).join("\n");
    expect(titles(`function f(x){ ${body} }`).some((t) => t.startsWith("Function is very complex"))).toBe(true);
  });
  it("skips non-JS files and survives syntax errors", () => {
    expect(astAnalyze("a.py", "print(1)")).toEqual([]);
    expect(() => astAnalyze("a.js", "function (((")).not.toThrow();
  });
});
