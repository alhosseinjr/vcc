import { describe, expect, it } from "vitest";
import { pythonAnalyze } from "../lib/analyzers/python-analyzer";
const t = (code: string) => pythonAnalyze("app.py", code).map((i) => i.title);
describe("pythonAnalyze", () => {
  it("flags catch-all except, exec and debug mode", () => {
    expect(t("try:\n    a()\nexcept:\n    pass")).toContain("Catch-all error handler");
    expect(t("exec(code)")).toContain("exec() or eval() runs text as code");
    expect(t("app.run(debug=True)")).toContain("Debug mode switched on");
  });
  it("flags f-string SQL as critical", () => { expect(pythonAnalyze("a.py", 'cur.execute(f"SELECT * FROM t WHERE id={x}")')[0].severity).toBe("critical"); });
  it("detects calls inside loops but not after them", () => {
    expect(t("for u in users:\n    cur.execute(q, (u,))")).toContain("Database or network call inside a loop (N+1)");
    expect(t("for u in users:\n    print(u)\ncur.execute(q)")).toEqual([]);
  });
  it("ignores non-python files and comments", () => { expect(pythonAnalyze("a.js", "exec(x)")).toEqual([]); expect(t("# exec(x)")).toEqual([]); });
});
