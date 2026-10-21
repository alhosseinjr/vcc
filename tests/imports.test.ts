import { describe, expect, it } from "vitest";
import { extractDependencies, findCircularDependencies } from "../lib/analyzers/imports";

describe("extractDependencies", () => {
  it("extracts ES6 and CommonJS imports accurately, mapping relative paths", () => {
    const files = [
      { name: "src/index.ts", content: `import { x } from './utils';\nrequire('../lib/auth');` },
      { name: "src/utils.ts", content: `export const x = 1;` },
      { name: "lib/auth.js", content: `module.exports = {};` }
    ];
    
    const graph = extractDependencies(files);
    expect(graph.nodes).toContain("src/index.ts");
    expect(graph.nodes).toContain("src/utils.ts");
    expect(graph.nodes).toContain("lib/auth.js");
    
    expect(graph.edges).toEqual(expect.arrayContaining([
      { source: "src/index.ts", target: "src/utils.ts" },
      { source: "src/index.ts", target: "lib/auth.js" }
    ]));
  });
});

describe("findCircularDependencies", () => {
  it("detects basic cycles", () => {
    const nodes = ["a", "b", "c"];
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
      { source: "c", target: "a" }
    ];
    
    const cycles = findCircularDependencies(nodes, edges);
    expect(cycles.length).toBeGreaterThan(0);
    // Specifically c -> a closes the loop
    expect(cycles).toContainEqual(["c", "a"]);
  });

  it("reports each cycle only once", () => {
    // a <-> b is a cycle readable as a->b and b->a; neither direction should duplicate
    const cycles = findCircularDependencies(
      ["a", "b"],
      [{ source: "a", target: "b" }, { source: "b", target: "a" }]
    );
    expect(cycles).toHaveLength(1);
  });
});
