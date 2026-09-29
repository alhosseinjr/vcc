"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { SEVERITY_ICON, type Issue } from "@/lib/types";
import { Button } from "../ui/Button";
import { FixDiff } from "./FixDiff";
import { LearnPanel } from "./LearnPanel";
import { useToast } from "../common/ToastProvider";

export type Status = "open" | "fixed" | "ignored";

export function IssueCard({ issue, status, onMark, context }: { issue: Issue & { instanceCount?: number; instanceLines?: number[] }; status: Status; onMark: (s: Status) => void; context?: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const [aiFix, setAiFix] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function generate() {
    setLoading(true);
    try {
      let key = ""; try { key = localStorage.getItem("vcc:groqKey") ?? ""; } catch { /* ignore */ }
      const res = await fetch("/api/fix", { method: "POST", headers: { "Content-Type": "application/json", ...(key && { "x-groq-key": key }) },
        body: JSON.stringify({ title: issue.title, explanation: issue.explanation, file: issue.file, line: issue.line, context }) });
      const data = (await res.json()) as { fix?: string; error?: string };
      if (!res.ok || !data.fix) throw new Error(data.error ?? "Couldn't generate a fix.");
      setAiFix(data.fix); toast("AI fix generated");
    } catch (e) { toast(e instanceof Error ? e.message : "Couldn't generate a fix."); } finally { setLoading(false); }
  }
  const hasPatch = issue.patched !== undefined && issue.original !== undefined;
  const copy = async () => {
    try { await navigator.clipboard.writeText(hasPatch ? (issue.patched as string) : (aiFix ?? issue.fix)); setCopied(true); toast("Fix copied to clipboard"); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };
  return (
    <details className={`rounded-xl border border-border bg-card p-4 ${status === "fixed" ? "opacity-60" : ""}`}>
      <summary className="cursor-pointer font-medium">
        {status === "fixed" ? "✅" : SEVERITY_ICON[issue.severity]} {issue.title}
        {(issue.instanceCount ?? 1) > 1 && <span className="ml-1.5 inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">×{issue.instanceCount}</span>}
        <span className="ml-2 text-xs text-muted">{issue.file}:{issue.line} · {issue.category} · {issue.source === "ai" ? "AI" : "rules"} · {issue.confidence} confidence</span>
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        {!hasPatch && issue.snippet && <pre className="overflow-x-auto rounded-lg bg-bg p-3 text-xs"><code>{issue.snippet}</code></pre>}
        <p>{issue.explanation}</p>
        <p className="italic text-muted">💡 {issue.analogy}</p>
        {hasPatch && <FixDiff before={issue.original as string} after={issue.patched as string} />}
        <div>
          <div className="mb-1 flex items-center justify-between"><strong>{hasPatch ? "Fixed line" : "How to fix it"}</strong>
            <Button variant="outline" onClick={copy} aria-label="Copy fix">{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}</Button></div>
          {hasPatch
            ? <pre className="overflow-x-auto rounded-lg bg-bg p-3 text-xs"><code>{issue.patched || "(delete this line)"}</code></pre>
            : <pre className="overflow-x-auto rounded-lg bg-bg p-3 text-xs"><code>{aiFix ?? issue.fix}</code></pre>}
          {!hasPatch && context && <Button variant="outline" className="mt-2" onClick={generate} disabled={loading}>{loading ? "Generating…" : aiFix ? "Regenerate AI fix" : "✨ Generate AI fix"}</Button>}
          <p className="mt-1 text-xs text-muted">Test it: run your app and repeat the action that uses this line, then re-scan to confirm it's gone.</p>
        </div>
        <LearnPanel title={issue.title} />
        <div className="flex gap-2">
          {status === "fixed" ? <Button variant="outline" onClick={() => onMark("open")}>Undo</Button> : <Button variant="outline" onClick={() => onMark("fixed")}>Mark as fixed</Button>}
          <Button variant="ghost" onClick={() => onMark("ignored")}>Ignore</Button>
        </div>
      </div>
    </details>
  );
}
