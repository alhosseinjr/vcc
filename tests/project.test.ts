import { describe, expect, it } from "vitest";
import { detectProjectType, projectAnalyze, isGeneratedFile } from "../lib/analyzers/project-analyzer";
import { suggestIntegrations } from "../lib/integrations";
const pkg = (deps: object) => ({ name: "package.json", content: JSON.stringify({ dependencies: deps }) });
describe("project templates", () => {
  it("detects project types", () => {
    expect(detectProjectType([pkg({ next: "14" })]).id).toBe("nextjs");
    expect(detectProjectType([pkg({ express: "4" })]).id).toBe("node-api");
    expect(detectProjectType([{ name: "a.py", content: "" }]).id).toBe("python");
    expect(detectProjectType([{ name: "i.html", content: "" }]).id).toBe("static");
  });
  it("detects browser extension from manifest.json with manifest_version", () => {
    const files = [{ name: "manifest.json", content: JSON.stringify({ manifest_version: 3, name: "My Ext", version: "1.0" }) }];
    expect(detectProjectType(files).id).toBe("browser-extension");
    expect(detectProjectType(files).label).toBe("Browser Extension (Manifest V3)");
  });
  it("does not detect browser extension if manifest.json has no manifest_version", () => {
    const files = [{ name: "manifest.json", content: JSON.stringify({ name: "some config" }) }];
    expect(detectProjectType(files).id).not.toBe("browser-extension");
  });
  it("flags missing rate limiting and helmet only when absent", () => {
    expect(projectAnalyze([pkg({ express: "4" })]).issues.map((i) => i.title)).toEqual(["No rate limiting on your API", "No security headers"]);
    expect(projectAnalyze([pkg({ express: "4", helmet: "7", "express-rate-limit": "7" })]).issues).toEqual([]);
  });
  it("flags secrets exposed via public env prefixes", () => {
    const r = projectAnalyze([pkg({ next: "14" }), { name: "a.ts", content: "const k = process.env.NEXT_PUBLIC_STRIPE_SECRET;" }]);
    expect(r.issues[0].title).toBe("Secret exposed to the browser");
  });
  it("suggests tools based on findings", () => {
    const secret = projectAnalyze([pkg({ next: "14" }), { name: "a.ts", content: "NEXT_PUBLIC_X_SECRET" }]).issues;
    expect(suggestIntegrations(secret).map((s) => s.id)).toContain("gitleaks");
    expect(suggestIntegrations([]).map((s) => s.id)).toEqual(["audit"]);
  });
});

describe("isGeneratedFile", () => {
  it("detects *.min.js as generated", () => {
    expect(isGeneratedFile({ name: "bundle.min.js", content: "x" })).toBe(true);
  });
  it("detects files under assets/ as generated", () => {
    expect(isGeneratedFile({ name: "assets/llm-chunk.js", content: "x" })).toBe(true);
  });
  it("detects files under dist/ as generated", () => {
    expect(isGeneratedFile({ name: "dist/index.js", content: "x" })).toBe(true);
  });
  it("detects files with avg line length > 300 as minified", () => {
    const longLine = "a".repeat(500);
    expect(isGeneratedFile({ name: "app.js", content: longLine })).toBe(true);
  });
  it("does not flag normal source files", () => {
    expect(isGeneratedFile({ name: "src/app.js", content: "const x = 1;\nconst y = 2;\n" })).toBe(false);
  });
  it("skips generated files from analysis", () => {
    const files = [
      { name: "assets/llm.js", content: "const x = 1;" },
      { name: "src/app.js", content: 'const apiKey = "sk-live-1234";\n' },
    ];
    const result = projectAnalyze(files);
    expect(result.skippedFiles).toContain("assets/llm.js");
    expect(result.skippedFiles).not.toContain("src/app.js");
  });
});
