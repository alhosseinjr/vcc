import { describe, expect, it } from "vitest";
import { chunkLines } from "../lib/llm/chunking";

const file = (n: number) => Array.from({ length: n }, (_, i) => `line${i + 1}`).join("\n");
describe("chunkLines", () => {
  it("returns one chunk for short files", () => { expect(chunkLines(file(50))).toEqual([{ start: 1, text: file(50) }]); });
  it("splits long files with overlap and correct start lines", () => {
    const c = chunkLines(file(700), 300, 20);
    expect(c.map((x) => x.start)).toEqual([1, 281, 561]);
    expect(c[1].text.split("\n")[0]).toBe("line281");
  });
  it("covers the final line", () => { expect(chunkLines(file(700)).at(-1)?.text.endsWith("line700")).toBe(true); });
});
