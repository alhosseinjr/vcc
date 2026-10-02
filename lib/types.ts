export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type Category = "security" | "performance" | "best-practice" | "style" | "accessibility";
export interface Issue {
  id: string; severity: Severity; category: Category; file: string; line: number; snippet: string;
  title: string; explanation: string; analogy: string; fix: string;
  confidence: "high" | "medium" | "low"; source: "rules" | "ai"; ruleId?: string; evidence?: string;
  /** Set when a safe one-line replacement exists: original line and its fixed version. */
  original?: string; patched?: string;
}
export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];
export const SEVERITY_ICON: Record<Severity, string> = { critical: "🔴", high: "🟠", medium: "🟡", low: "🔵", info: "⚪" };
