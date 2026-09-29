import { describe, expect, it } from "vitest";
import { dependencyAnalyze } from "../lib/analyzers/dependency-analyzer";

describe("dependencyAnalyze", () => {
  it("flags deprecated and unpinned packages", () => {
    const pkg = JSON.stringify({ dependencies: { request: "^2.88.0", lodash: "*" } }, null, 2);
    const titles = dependencyAnalyze("package.json", pkg).map((i) => i.title);
    expect(titles).toContain("Risky package: request");
    expect(titles).toContain("Unpinned version: lodash");
  });
  it("ignores invalid JSON", () => { expect(dependencyAnalyze("package.json", "{oops")).toEqual([]); });
});
