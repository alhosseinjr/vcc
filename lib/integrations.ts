import type { Issue } from "./types";
export interface Suggestion { id: string; title: string; why: string; filename: string; snippet: string }

/** Follow-up tools worth adding, chosen from what the scan found. */
export function suggestIntegrations(issues: Issue[]): Suggestion[] {
  const has = (...starts: string[]) => issues.some((i) => starts.some((s) => i.title.startsWith(s)));
  const out: Suggestion[] = [{ id: "audit", title: "Automatic security check on every push (GitHub Actions)", why: "Catches vulnerable packages before they ship.", filename: ".github/workflows/security.yml",
    snippet: "name: Security\non: [push, pull_request]\njobs:\n  audit:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm audit --audit-level=high" }];
  if (has("Secret written", "Secret exposed")) out.push({ id: "gitleaks", title: "Block secrets before you commit (pre-commit + gitleaks)", why: "You had a secret in code; this stops it happening again.", filename: ".pre-commit-config.yaml",
    snippet: "repos:\n  - repo: https://github.com/gitleaks/gitleaks\n    rev: v8.18.4\n    hooks:\n      - id: gitleaks\n\n# then run: pip install pre-commit && pre-commit install" });
  if (has("Risky package", "Unpinned version", "No rate limiting", "No security headers")) out.push({ id: "dependabot", title: "Automatic dependency updates (Dependabot)", why: "Keeps packages current so known holes get patched.", filename: ".github/dependabot.yml",
    snippet: 'version: 2\nupdates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "weekly"' });
  if (has("Errors silently ignored", "Async code without", "Catch-all error handler")) out.push({ id: "sentry", title: "Error monitoring (Sentry free tier)", why: "Ignored errors become alerts you can actually see.", filename: "terminal",
    snippet: "npx @sentry/wizard@latest -i nextjs   # or follow sentry.io docs for your framework" });
  return out;
}
