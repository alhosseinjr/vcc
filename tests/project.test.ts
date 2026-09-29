import { describe, expect, it } from "vitest";
import { detectProjectType, projectAnalyze } from "../lib/analyzers/project-analyzer";
import { suggestIntegrations } from "../lib/integrations";
const pkg = (deps: object) => ({ name: "package.json", content: JSON.stringify({ dependencies: deps }) });
describe("project templates", () => {
  it("detects project types", () => {
    expect(detectProjectType([pkg({ next: "14" })]).id).toBe("nextjs");
    expect(detectProjectType([pkg({ express: "4" })]).id).toBe("node-api");
    expect(detectProjectType([{ name: "a.py", content: "" }]).id).toBe("python");
    expect(detectProjectType([{ name: "i.html", content: "" }]).id).toBe("static");
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
