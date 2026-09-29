"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DropZone } from "./DropZone";
import { CodeEditor } from "./CodeEditor";
import { GitHubScanner } from "./GitHubScanner";
import { ScanProgress } from "./ScanProgress";
import { Button } from "../ui/Button";
import { useToast } from "../common/ToastProvider";
import { useScanInput } from "@/store/scan-store";
import { healthScore } from "@/lib/score";
import { saveScan, saveScanFiles } from "@/lib/storage";
import { loadPrefs } from "@/lib/prefs";
import type { Issue } from "@/lib/types";

export function Scanner() {
  const router = useRouter();
  const toast = useToast();
  const files = useScanInput((s) => s.files);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function scan(githubUrl?: string) {
    setBusy(true); setError(null);
    const ctrl = new AbortController(); abort.current = ctrl;
    const timeoutId = setTimeout(() => ctrl.abort(new Error("timeout")), 60000);
    try {
      let key = ""; try { key = localStorage.getItem("vcc:groqKey") ?? ""; } catch { /* ignore */ }
      const prefs = loadPrefs();
      const chosen = files.filter((f) => f.name.endsWith("package.json") || prefs.languages.includes(f.language));
      if (chosen.length === 0) throw new Error("None of your files match the languages enabled in Settings.");
      const payload = chosen.map(({ name, content }) => ({ name, content }));
      const res = await fetch("/api/analyze", { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json", ...(key && { "x-groq-key": key }) }, body: JSON.stringify({ files: payload }) });
      const data = (await res.json()) as { issues?: Issue[]; aiUsed?: boolean; aiNote?: string; projectType?: string; skippedFileCount?: number; skippedFileNames?: string[]; error?: string };
      if (!res.ok || !data.issues) throw new Error(data.error ?? "Scan failed.");
      const id = crypto.randomUUID();
      saveScan({ id, at: Date.now(), fileCount: chosen.length, score: healthScore(data.issues), issues: data.issues, aiUsed: Boolean(data.aiUsed), aiNote: data.aiNote, projectType: data.projectType, skippedFileCount: data.skippedFileCount, skippedFileNames: data.skippedFileNames, githubUrl });
      saveScanFiles(id, payload);
      router.push(`/scan/${id}`);
    } catch (e: any) {
      if (e?.message === "timeout") setError("Scan timed out after 60 seconds. Try scanning fewer or smaller files.");
      else if (e instanceof DOMException && e.name === "AbortError") toast("Scan cancelled");
      else setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally { 
      clearTimeout(timeoutId);
      setBusy(false); 
    }
  }

  const [tab, setTab] = useState<"zip" | "github" | "editor">("zip");

  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        <Button variant={tab === "zip" ? "primary" : "outline"} onClick={() => setTab("zip")}>Upload ZIP / Folder</Button>
        <Button variant={tab === "github" ? "primary" : "outline"} onClick={() => setTab("github")}>GitHub URL</Button>
        <Button variant={tab === "editor" ? "primary" : "outline"} onClick={() => setTab("editor")}>Paste Code</Button>
      </div>

      {tab === "zip" && <DropZone onScan={scan} busy={busy} />}
      {tab === "github" && <GitHubScanner onScan={scan} busy={busy} />}
      {tab === "editor" && <CodeEditor />}

      {busy && <ScanProgress onCancel={() => abort.current?.abort()} />}
      {error && <p role="alert" className="rounded-xl border border-border bg-card p-3 text-sm text-red-500">⚠️ {error}</p>}
      
      {files.length > 0 && (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-2">
          <ul className="divide-y divide-border rounded-xl border border-border">
            {files.map((f) => (
              <li key={f.name} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{f.name} <span className="text-muted">· {f.language} · {(f.size / 1024).toFixed(1)} KB</span></span>
                <button aria-label={`Remove ${f.name}`} onClick={() => useScanInput.getState().removeFile(f.name)} className="rounded p-1 hover:bg-card">×</button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => scan()} disabled={busy}>{busy ? "Scanning…" : `Scan ${files.length} file${files.length > 1 ? "s" : ""}`}</Button>
            <Button variant="outline" onClick={() => useScanInput.getState().clear()}>Clear</Button>
          </div>
        </div>
      )}
    </div>
  );
}
