import type { Issue } from "../types";

// Small curated list of packages with well-known problems. Not a full CVE database:
// for that, run `npm audit` locally (suggested in the fix text).
const RISKY: Record<string, { why: string; fix: string }> = {
  request: { why: "Deprecated and no longer receives security fixes.", fix: "Use the built-in fetch() or the 'undici' package." },
  "node-uuid": { why: "Deprecated; replaced by 'uuid'.", fix: "npm uninstall node-uuid && npm install uuid" },
  moment: { why: "In maintenance mode and very large.", fix: "Use 'date-fns' or 'dayjs'." },
  "crypto-js": { why: "Unmaintained crypto library; easy to misuse.", fix: "Use Node's built-in 'crypto' or the browser Web Crypto API." },
  "jsonwebtoken": { why: "Old versions (<9) have known signature-bypass bugs.", fix: "Upgrade: npm install jsonwebtoken@latest" },
};

/** Inspect a package.json string. Invalid JSON yields no issues (never throws). */
export function dependencyAnalyze(file: string, content: string): Issue[] {
  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try { pkg = JSON.parse(content); } catch { return []; }
  const deps = { ...pkg.devDependencies, ...pkg.dependencies };
  const issues: Issue[] = [];
  for (const [name, ver] of Object.entries(deps)) {
    const risky = RISKY[name];
    const line = content.split("\n").findIndex((l) => l.includes(`"${name}"`)) + 1;
    const base = { file, line, snippet: `"${name}": "${ver}"`, category: "security" as const, source: "rules" as const, confidence: "medium" as const };
    if (risky) issues.push({ ...base, id: `dep:${name}`, severity: "medium", title: `Risky package: ${name}`, explanation: risky.why,
      analogy: "Like driving on tires the maker stopped inspecting.", fix: risky.fix });
    if (ver === "*" || ver === "latest") issues.push({ ...base, id: `dep-pin:${name}`, severity: "low", category: "best-practice",
      title: `Unpinned version: ${name}`, explanation: `"${ver}" means any future version installs automatically, which can break or compromise your app.`,
      analogy: "Like accepting any package left at your door without checking.", fix: `Pin a version, e.g. "${name}": "^1.2.3", then run npm audit.` });
  }
  return issues;
}
