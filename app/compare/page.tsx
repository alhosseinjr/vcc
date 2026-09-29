"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { compareScans, type Comparison } from "@/lib/compare";
import { loadHistory, type SavedScan } from "@/lib/storage";
import { SEVERITY_ICON, SEVERITY_ORDER, type Issue, type Severity } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { download, toMarkdown } from "@/lib/reporters/markdown-reporter";
import { toHtml } from "@/lib/reporters/html-reporter";

const label = (s: SavedScan) => `${new Date(s.at).toLocaleString()} · score ${s.score}`;

const IssueRow = ({ issue, type }: { issue: Issue; type: "fixed" | "new" | "unchanged" }) => (
  <li className={`flex gap-3 rounded-lg border p-3 text-sm ${
    type === "fixed" ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400 opacity-70 line-through" : 
    type === "new" ? "border-red-500/30 bg-red-500/5" : "border-border bg-card"
  }`}>
    <div className="flex-none pt-0.5">{SEVERITY_ICON[issue.severity]}</div>
    <div className="min-w-0 flex-1">
      <div className="flex justify-between gap-4">
        <strong className="truncate">{issue.title}</strong>
        <span className="text-xs text-muted shrink-0">{issue.severity} · {issue.category}</span>
      </div>
      <div className="mt-1 flex justify-between gap-4">
        <span className="text-muted truncate">{issue.file}:{issue.line}</span>
        {type === "fixed" && <span className="text-xs font-medium text-green-600 dark:text-green-400">Fixed</span>}
        {type === "new" && <span className="text-xs font-medium text-red-600 dark:text-red-400">New issue</span>}
      </div>
    </div>
  </li>
);

export default function ComparePage() {
  const [scans, setScans] = useState<SavedScan[] | null>(null);
  const [a, setA] = useState(""); 
  const [b, setB] = useState("");
  const [filter, setFilter] = useState<Severity | "all">("all");

  useEffect(() => { 
    const h = loadHistory(); 
    setScans(h); 
    if (h.length > 1) { 
      setB(h[0].id); // newest
      setA(h[1].id); // second newest
    } 
  }, []);

  const result = useMemo(() => {
    const sa = scans?.find((s) => s.id === a), sb = scans?.find((s) => s.id === b);
    return sa && sb ? compareScans(sa.issues, sb.issues) : null;
  }, [scans, a, b]);

  const filteredResult = useMemo(() => {
    if (!result) return null;
    if (filter === "all") return result;
    return {
      ...result,
      resolved: result.resolved.filter((i) => i.severity === filter),
      added: result.added.filter((i) => i.severity === filter),
      unchanged: result.unchanged.filter((i) => i.severity === filter),
    };
  }, [result, filter]);

  if (!scans) return <div aria-busy="true" className="h-24 animate-pulse rounded-xl bg-card" />;
  if (scans.length < 2) return <p>Run at least two scans to compare them. <Link href="/" className="text-accent underline">Scan code</Link></p>;
  
  const Pick = ({ id, set, name }: { id: string; set: (v: string) => void; name: string }) => (
    <label className="block text-sm">{name}
      <select value={id} onChange={(e) => set(e.target.value)} className="ml-2 rounded-lg border border-border bg-bg p-1 max-w-full">
        {scans.map((s) => <option key={s.id} value={s.id}>{label(s)}</option>)}
      </select>
    </label>
  );

  const exportReport = (format: "md" | "html") => {
    if (!result) return;
    const all = [...result.added, ...result.unchanged];
    if (format === "md") download("comparison.md", toMarkdown(all, result.scoreAfter), "text/markdown");
    else download("comparison.html", toHtml(all, result.scoreAfter), "text/html");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Compare scans</h1>
        {result && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportReport("md")}>Export Markdown</Button>
            <Button variant="outline" onClick={() => exportReport("html")}>Export HTML</Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-card p-5">
        <div className="flex-1 space-y-2"><Pick id={a} set={setA} name="Before" /><Pick id={b} set={setB} name="After" /></div>
        {result && (
          <div className="text-center px-6 border-l border-border">
            <div className="text-sm text-muted mb-1">Health Score</div>
            <div className="text-3xl font-bold flex items-center justify-center gap-2">
              <span className={result.scoreBefore >= 80 ? "text-green-500" : result.scoreBefore >= 50 ? "text-yellow-500" : "text-red-500"}>{result.scoreBefore}</span>
              <span className="text-muted text-xl">→</span>
              <span className={result.scoreAfter >= 80 ? "text-green-500" : result.scoreAfter >= 50 ? "text-yellow-500" : "text-red-500"}>{result.scoreAfter}</span>
            </div>
            <div className={`text-sm font-medium ${result.scoreAfter > result.scoreBefore ? "text-green-500" : result.scoreAfter < result.scoreBefore ? "text-red-500" : "text-muted"}`}>
              {result.scoreAfter > result.scoreBefore ? "↗ Improved by " : result.scoreAfter < result.scoreBefore ? "↘ Declined by " : "No change"}
              {Math.abs(result.scoreAfter - result.scoreBefore)} points
            </div>
          </div>
        )}
      </div>

      {result && filteredResult && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-medium">
              You fixed <span className="text-green-600 dark:text-green-400 font-bold">{result.resolved.length}</span> issues, 
              <span className="text-red-600 dark:text-red-400 font-bold"> {result.added.length}</span> new issues appeared, 
              and <span className="text-yellow-600 dark:text-yellow-500 font-bold">{result.unchanged.length}</span> remain.
            </p>
            <label className="text-sm">Filter: 
              <select value={filter} onChange={(e) => setFilter(e.target.value as Severity | "all")} className="ml-2 rounded-lg border border-border bg-bg p-1">
                <option value="all">All</option>
                {SEVERITY_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <section className="space-y-3">
              <h2 className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                ✅ Fixed ({filteredResult.resolved.length})
              </h2>
              {filteredResult.resolved.length === 0 ? <p className="text-sm text-muted">No issues were fixed.</p> : 
                <ul className="space-y-2">{filteredResult.resolved.map((i) => <IssueRow key={i.id} issue={i} type="fixed" />)}</ul>}
            </section>
            <section className="space-y-3">
              <h2 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                ⚠️ New ({filteredResult.added.length})
              </h2>
              {filteredResult.added.length === 0 ? <p className="text-sm text-muted">No new issues found.</p> : 
                <ul className="space-y-2">{filteredResult.added.map((i) => <IssueRow key={i.id} issue={i} type="new" />)}</ul>}
            </section>
            <section className="space-y-3 md:col-span-2 lg:col-span-1">
              <h2 className="font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
                Still open ({filteredResult.unchanged.length})
              </h2>
              {filteredResult.unchanged.length === 0 ? <p className="text-sm text-muted">No open issues remain.</p> : 
                <ul className="space-y-2">{filteredResult.unchanged.map((i) => <IssueRow key={i.id} issue={i} type="unchanged" />)}</ul>}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
