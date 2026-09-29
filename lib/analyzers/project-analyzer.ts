import type { Issue } from "../types";

export type ProjectId = "nextjs" | "react" | "node-api" | "python" | "static" | "browser-extension" | "unknown";
export interface ProjectType { id: ProjectId; label: string }
interface F { name: string; content: string }
const LABELS: Record<ProjectId, string> = {
  nextjs: "Next.js app", react: "React app", "node-api": "Node.js API", python: "Python project",
  static: "Static website", "browser-extension": "Browser Extension (Manifest V3)", unknown: "General code",
};

function depsOf(files: F[]): Record<string, string> {
  const pkg = files.find((f) => f.name.endsWith("package.json"));
  try { const j = JSON.parse(pkg?.content ?? "{}") as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }; return { ...j.devDependencies, ...j.dependencies }; } catch { return {}; }
}

/** Returns true if a file looks like a minified/generated bundle. */
export function isGeneratedFile(f: F): boolean {
  const name = f.name.toLowerCase();
  // Explicit minified extension
  if (/\.min\.(js|css)$/.test(name)) return true;
  // Common build output directories
  if (/^(assets|dist|build|vendor|public\/assets)\//i.test(name)) return true;
  // Average line length > 300 means it's almost certainly minified/bundled
  const lines = f.content.split("\n");
  if (lines.length > 0) {
    const avgLen = f.content.length / lines.length;
    if (avgLen > 300) return true;
  }
  return false;
}

/** Guess the project kind from package.json, manifest.json and file extensions. */
export function detectProjectType(files: F[]): ProjectType {
  const d = depsOf(files);
  const has = (re: RegExp) => files.some((f) => re.test(f.name));

  // Check for browser extension manifest (manifest.json with manifest_version field)
  const manifest = files.find((f) => /^(.*\/)?manifest\.json$/.test(f.name));
  if (manifest) {
    try {
      const m = JSON.parse(manifest.content) as { manifest_version?: number };
      if (m.manifest_version) return { id: "browser-extension", label: LABELS["browser-extension"] };
    } catch { /* not valid JSON, skip */ }
  }

  const id: ProjectId = d.next ? "nextjs" : d.react ? "react" : d.express || d.fastify || d.koa || d.hono ? "node-api"
    : has(/\.py$/) ? "python" : has(/\.html?$/) && !has(/\.(jsx?|tsx?)$/) ? "static" : "unknown";
  return { id, label: LABELS[id] };
}

const mk = (file: string, line: number, snippet: string, i: Pick<Issue, "severity" | "category" | "title" | "explanation" | "analogy" | "fix">): Issue =>
  ({ ...i, id: `proj:${i.title}:${file}:${line}`, file, line, snippet, confidence: "medium", source: "rules" });

/** Template scans: extra checks that only make sense for the detected project type. */
export function projectAnalyze(files: F[]): { type: ProjectType; issues: Issue[]; skippedFiles: string[] } {
  const type = detectProjectType(files);
  const d = depsOf(files);
  const issues: Issue[] = [];
  const skippedFiles: string[] = [];
  const pkgFile = files.find((f) => f.name.endsWith("package.json"))?.name ?? "package.json";

  // Detect generated/minified files to skip
  for (const f of files) {
    if (isGeneratedFile(f)) skippedFiles.push(f.name);
  }

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
    // Skip generated files from template analysis too
    if (skippedFiles.includes(f.name)) continue;
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
  return { type, issues, skippedFiles };
}
