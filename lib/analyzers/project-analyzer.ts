import type { Issue } from "../types";

export type ProjectId = "nextjs" | "react" | "node-api" | "python" | "static" | "unknown";
export interface ProjectType { id: ProjectId; label: string }
interface F { name: string; content: string }
const LABELS: Record<ProjectId, string> = { nextjs: "Next.js app", react: "React app", "node-api": "Node.js API", python: "Python project", static: "Static website", unknown: "General code" };

function depsOf(files: F[]): Record<string, string> {
  const pkg = files.find((f) => f.name.endsWith("package.json"));
  try { const j = JSON.parse(pkg?.content ?? "{}") as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }; return { ...j.devDependencies, ...j.dependencies }; } catch { return {}; }
}

/** Guess the project kind from package.json and file extensions so the right extra checks run. */
export function detectProjectType(files: F[]): ProjectType {
  const d = depsOf(files);
  const has = (re: RegExp) => files.some((f) => re.test(f.name));
  const id: ProjectId = d.next ? "nextjs" : d.react ? "react" : d.express || d.fastify || d.koa || d.hono ? "node-api"
    : has(/\.py$/) ? "python" : has(/\.html?$/) && !has(/\.(jsx?|tsx?)$/) ? "static" : "unknown";
  return { id, label: LABELS[id] };
}

const mk = (file: string, line: number, snippet: string, i: Pick<Issue, "severity" | "category" | "title" | "explanation" | "analogy" | "fix">): Issue =>
  ({ ...i, id: `proj:${i.title}:${file}:${line}`, file, line, snippet, confidence: "medium", source: "rules" });

/** Template scans: extra checks that only make sense for the detected project type. */
export function projectAnalyze(files: F[]): { type: ProjectType; issues: Issue[] } {
  const type = detectProjectType(files);
  const d = depsOf(files);
  const issues: Issue[] = [];
  const pkgFile = files.find((f) => f.name.endsWith("package.json"))?.name ?? "package.json";
  if (type.id === "node-api") {
    if (!["express-rate-limit", "rate-limiter-flexible", "@fastify/rate-limit", "hono-rate-limiter"].some((p) => p in d))
      issues.push(mk(pkgFile, 1, "(no rate limiting package)", { severity: "medium", category: "security", title: "No rate limiting on your API",
        explanation: "Nothing stops one visitor from calling your API thousands of times, which can crash it or run up your bill.", analogy: "Like a shop with no limit on how many people crowd the door.",
        fix: "npm install express-rate-limit\n\napp.use(rateLimit({ windowMs: 60_000, max: 100 }));" }));
    if (!["helmet", "@fastify/helmet"].some((p) => p in d))
      issues.push(mk(pkgFile, 1, "(no security headers package)", { severity: "low", category: "security", title: "No security headers",
        explanation: "Browsers get no instructions to block common attacks like clickjacking.", analogy: "Like a building with locks but no 'staff only' signs.", fix: "npm install helmet\n\napp.use(helmet());" }));
  }
  for (const f of files) {
    f.content.split("\n").forEach((text, i) => {
      if ((type.id === "nextjs" || type.id === "react") && /(NEXT_PUBLIC|VITE|REACT_APP)_\w*(SECRET|PRIVATE|SERVICE_ROLE|PASSWORD)\w*/.test(text))
        issues.push(mk(f.name, i + 1, text.trim().slice(0, 160), { severity: "critical", category: "security", title: "Secret exposed to the browser",
          explanation: "Variables starting with NEXT_PUBLIC_, VITE_ or REACT_APP_ are copied into the website everyone downloads, so this secret is public.", analogy: "Like printing your safe's combination on the front of the safe.",
          fix: "Rename it without the public prefix (e.g. SERVICE_KEY), use it only in server code or API routes, and rotate the leaked value." }));
    });
    if (type.id === "static" && /\.html?$/.test(f.name) && /<head/i.test(f.content) && !/name=["']viewport["']/i.test(f.content))
      issues.push(mk(f.name, 1, "<head> without viewport meta", { severity: "info", category: "best-practice", title: "Page isn't mobile-friendly",
        explanation: "Without a viewport tag, phones show a tiny zoomed-out desktop page.", analogy: "Like a poster printed at billboard size and hung in a phone booth.", fix: '<meta name="viewport" content="width=device-width, initial-scale=1" />' }));
  }
  return { type, issues };
}
