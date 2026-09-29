"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import JSZip from "jszip";
import { IssueCard, type Status } from "./IssueCard";
import { IntegrationTips } from "./IntegrationTips";
import { SeverityBars } from "./SeverityBars";
import { ShareButton } from "./ShareButton";
import { FixAllDialog } from "./FixAllDialog";
import { Button } from "../ui/Button";
import { useToast } from "../common/ToastProvider";
import { healthScore } from "@/lib/score";
import { DEFAULT_PREFS, loadPrefs, type Prefs } from "@/lib/prefs";
import { loadMarks, saveMarks, type Marks, type SavedScan } from "@/lib/storage";
import { download, toMarkdown } from "@/lib/reporters/markdown-reporter";
import { toHtml } from "@/lib/reporters/html-reporter";
import { SEVERITY_ORDER, type Severity } from "@/lib/types";

const VirtualList = dynamic(() => import("./VirtualizedIssueList"), {
  ssr: false,
  loading: () => <div className="space-y-2"><div className="h-40 bg-card rounded-xl border border-border animate-pulse"/><div className="h-40 bg-card rounded-xl border border-border animate-pulse"/></div>
});

export function ResultsView({ scan, files }: { scan: SavedScan; files: { name: string; content: string }[] | null }) {
  const toast = useToast();
  const filterRef = useRef<HTMLSelectElement>(null);
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [reviewing, setReviewing] = useState(false);
  const [marks, setMarks] = useState<Marks>({ fixed: [], ignored: [] });
  useEffect(() => setMarks(loadMarks()), []);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => setPrefs(loadPrefs()), []);
  const pool = useMemo(() => scan.issues.filter((i) => SEVERITY_ORDER.indexOf(i.severity) <= SEVERITY_ORDER.indexOf(prefs.minSeverity) && (prefs.includeStyle || i.category !== "style")), [scan, prefs]);
  const contextFor = (i: { file: string; line: number }) => files?.find((f) => f.name === i.file)?.content.split("\n").slice(Math.max(0, i.line - 6), i.line + 5).join("\n");

  const statusOf = (id: string): Status => (marks.ignored.includes(id) ? "ignored" : marks.fixed.includes(id) ? "fixed" : "open");
  const mark = (id: string, s: Status) => {
    const next: Marks = { fixed: marks.fixed.filter((x) => x !== id), ignored: marks.ignored.filter((x) => x !== id) };
    if (s === "fixed") next.fixed.push(id);
    if (s === "ignored") next.ignored.push(id);
    setMarks(next); saveMarks(next); toast(s === "fixed" ? "Marked as fixed ✅" : s === "ignored" ? "Ignored" : "Reopened");
  };

  const open = useMemo(() => pool.filter((i) => statusOf(i.id) === "open"), [pool, marks]); // eslint-disable-line react-hooks/exhaustive-deps
  const score = healthScore(open);
  const shown = useMemo(() => pool.filter((i) => statusOf(i.id) !== "ignored" && (filter === "all" || i.severity === filter))
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)), [pool, filter, marks]); // eslint-disable-line react-hooks/exhaustive-deps
  const patchable = files ? open.filter((i) => i.patched !== undefined && i.original !== undefined) : [];
  const ignoredCount = pool.filter((i) => statusOf(i.id) === "ignored").length;

  const exportMd = () => { download("report.md", toMarkdown(open, score), "text/markdown"); toast("Report downloaded"); };
  // Keyboard shortcuts: "/" jumps to the filter, "e" exports Markdown. Ignored while typing.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === "/") { e.preventDefault(); filterRef.current?.focus(); }
      if (e.key === "e") exportMd();
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  });

  async function downloadPatched(ids: string[]) {
    if (!files) return;
    const lines = new Map(files.map((f) => [f.name, f.content.split("\n")]));
    const touched = new Set<string>();
    for (const i of patchable.filter((x) => ids.includes(x.id))) { const ls = lines.get(i.file); if (ls && ls[i.line - 1] === i.original) { ls[i.line - 1] = i.patched as string; touched.add(i.file); } }
    if (touched.size === 0) { toast("Nothing could be patched automatically"); return; }
    const zip = new JSZip();
    touched.forEach((n) => zip.file(n, (lines.get(n) as string[]).join("\n")));
    const url = URL.createObjectURL(await zip.generateAsync({ type: "blob" }));
    const a = document.createElement("a"); a.href = url; a.download = "patched-files.zip"; a.click(); URL.revokeObjectURL(url);
    toast("Patched files downloaded");
  }

  return (
    <section aria-live="polite" className="space-y-4">
      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-card p-5">
        <div><div className={`text-5xl font-bold ${score >= 80 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500"}`}>{score}</div><div className="text-sm text-muted">Health score / 100</div></div>
        <SeverityBars issues={open} />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button onClick={() => setReviewing(true)} disabled={patchable.length === 0} title={files ? "" : "Original files are only kept for the current browser session"}>Fix all ({patchable.length} auto-fixable)</Button>
          <ShareButton issues={open} score={score} />
          {files && files.length >= 10 && (
            <Button variant="outline" onClick={() => window.location.href = `/architecture/${scan.id}`}>Architecture</Button>
          )}
          <Button variant="outline" onClick={exportMd}>.md</Button>
          <Button variant="outline" onClick={() => download("report.html", toHtml(open, score), "text/html")}>.html</Button>
          <Button variant="outline" onClick={() => download("report.json", JSON.stringify({ score, issues: open }, null, 2), "application/json")}>.json</Button>
          <Button variant="ghost" onClick={() => { import("@/lib/storage").then(({ deleteScan }) => { deleteScan(scan.id); window.location.href = "/"; }); }} title="Delete scan" className="text-red-500 hover:bg-red-500/10">Delete</Button>
        </div>
      </div>
      {scan.projectType && <p className="text-sm text-muted">Detected: {scan.projectType}, with extra checks for that kind of project.</p>}
      {scan.skippedFileCount && scan.skippedFileCount > 0 && (
        <p className="text-sm text-muted">📦 {scan.skippedFileCount} generated/minified file{scan.skippedFileCount > 1 ? "s" : ""} skipped{scan.skippedFileNames && scan.skippedFileNames.length > 0 ? ` (${scan.skippedFileNames.slice(0, 3).join(", ")}${scan.skippedFileNames.length > 3 ? "…" : ""})` : ""}.</p>
      )}
      {reviewing && <FixAllDialog issues={patchable} onClose={() => setReviewing(false)} onApply={(ids) => { setReviewing(false); void downloadPatched(ids); }} />}
      {scan.aiNote ? <p className="text-sm text-muted">{scan.aiNote}</p> : !scan.aiUsed && <p className="text-sm text-muted">Rule-based scan only. Add a free Groq key in Settings for deeper AI review.</p>}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label>Filter: <select ref={filterRef} value={filter} onChange={(e) => setFilter(e.target.value as Severity | "all")} className="rounded-lg border border-border bg-bg p-1">
          <option value="all">All</option>{SEVERITY_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        {ignoredCount > 0 && <Button variant="ghost" onClick={() => { const n = { ...marks, ignored: [] }; setMarks(n); saveMarks(n); }}>Restore {ignoredCount} ignored</Button>}
        <span className="text-muted">Shortcuts: / filter · e export</span>
      </div>
      {shown.length === 0 ? <p>🎉 No issues here.</p> : 
        shown.length > 50 ? (
          <VirtualList issues={shown} statusOf={statusOf} mark={mark} contextFor={contextFor} />
        ) : (
          <div className="space-y-2">{shown.map((i) => <IssueCard key={i.id} issue={i} status={statusOf(i.id)} onMark={(s) => mark(i.id, s)} context={contextFor(i)} />)}</div>
        )
      }
      <IntegrationTips issues={open} />
    </section>
  );
}
