import { SEVERITY_ICON, type Issue } from "../types";
export function toMarkdown(issues: Issue[], score: number): string {
  const body = issues.map((i) => `### ${SEVERITY_ICON[i.severity]} ${i.title}\n\`${i.file}:${i.line}\` · ${i.category}\n\n${i.explanation}\n\n_${i.analogy}_\n\n**Fix:**\n\`\`\`\n${i.fix}\n\`\`\``).join("\n\n");
  return `# Vibe-Coded Cleanup Report\n\nHealth score: **${score}/100** · ${issues.length} issues\n\n${body}\n`;
}
export function download(name: string, text: string, type: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
