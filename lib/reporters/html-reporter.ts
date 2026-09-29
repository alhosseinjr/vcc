import { SEVERITY_ICON, type Issue } from "../types";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

/** Standalone, print-friendly HTML report (use browser Print → Save as PDF). All user text is escaped. */
export function toHtml(issues: Issue[], score: number): string {
  const cards = issues.map((i) => `<section><h3>${SEVERITY_ICON[i.severity]} ${esc(i.title)}</h3><small>${esc(i.file)}:${i.line} · ${i.category}</small>
<p>${esc(i.explanation)}</p><p><em>${esc(i.analogy)}</em></p><pre>${esc(i.fix)}</pre></section>`).join("");
  return `<!doctype html><meta charset="utf-8"><title>Vibe-Coded Cleanup Report</title><style>body{font:16px system-ui;max-width:760px;margin:2rem auto;padding:0 1rem}section{border:1px solid #ddd;border-radius:10px;padding:1rem;margin:1rem 0;break-inside:avoid}pre{background:#f5f5f7;padding:.7rem;overflow:auto;white-space:pre-wrap}</style>
<h1>Vibe-Coded Cleanup Report</h1><p>Health score: <b>${score}/100</b> · ${issues.length} issues</p>${cards}`;
}
