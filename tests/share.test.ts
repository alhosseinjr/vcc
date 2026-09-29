import { describe, expect, it } from "vitest";
import { decodeReport, encodeReport } from "../lib/share";
import type { Issue } from "../lib/types";

const issue: Issue = { id: "1", severity: "high", category: "security", file: "a.js", line: 3, snippet: "SECRET CODE", title: "T", explanation: "E", analogy: "A", fix: "F", confidence: "high", source: "rules" };
describe("share links", () => {
  it("round-trips a report and leaves source snippets out", async () => {
    const token = await encodeReport([issue], 90, 7);
    const r = await decodeReport(token);
    expect(r).not.toBeNull(); expect(r).not.toBe("expired");
    expect(JSON.stringify(r)).not.toContain("SECRET CODE");
    expect(typeof r === "object" && r?.issues[0].title).toBe("T");
  });
  it("rejects garbage tokens", async () => { expect(await decodeReport("not-a-token")).toBeNull(); });
});
