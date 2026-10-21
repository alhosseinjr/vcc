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
  it("does not flag batched awaits (Promise.all built via .map)", () => {
    expect(titles("async function f(chunks){ for (const c of chunks) { await Promise.all(c.map(async (f) => await fetch(f))); } }"))
      .not.toContain("Database or network call inside a loop (N+1)");
  });
  it("does not flag loops that return on success (retry / find-first)", () => {
    expect(titles("async function call(){ for (let attempt = 0; attempt < 3; attempt++) { try { const res = await fetch(URL); if (res.ok) return res; } catch (e) { log(e); } } }"))
      .not.toContain("Database or network call inside a loop (N+1)");
  });
  it("detects empty catch blocks", () => { expect(titles("try { a(); } catch (e) {}")).toContain("Errors silently ignored"); });
  it("does not flag comment-only catch blocks (documented deliberate ignore)", () => {
    expect(titles("try { a(); } catch (e) { /* ignore */ }")).not.toContain("Errors silently ignored");
    expect(titles("try { a(); }\ncatch (e) {\n  // nothing sensible to do here\n}")).not.toContain("Errors silently ignored");
  });
  it("flags very complex functions", () => {
    const body = Array.from({ length: 12 }, (_, i) => `if (x === ${i}) return ${i};`).join("\n");
    expect(titles(`function f(x){ ${body} }`).some((t) => t.startsWith("Function is very complex"))).toBe(true);
  });
  it("skips non-JS files and survives syntax errors", () => {
    expect(astAnalyze("a.py", "print(1)")).toEqual([]);
    expect(() => astAnalyze("a.js", "function (((")).not.toThrow();
  });
});
