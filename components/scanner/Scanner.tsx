"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DropZone } from "./DropZone";
import { CodeEditor } from "./CodeEditor";
import { ScanProgress } from "./ScanProgress";
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

  async function scan() {
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
      saveScan({ id, at: Date.now(), fileCount: chosen.length, score: healthScore(data.issues), issues: data.issues, aiUsed: Boolean(data.aiUsed), aiNote: data.aiNote, projectType: data.projectType, skippedFileCount: data.skippedFileCount, skippedFileNames: data.skippedFileNames });
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

  return (
    <div className="space-y-8">
      <DropZone onScan={scan} busy={busy} />
      {busy && <ScanProgress onCancel={() => abort.current?.abort()} />}
      {error && <p role="alert" className="rounded-xl border border-border bg-card p-3 text-sm">⚠️ {error}</p>}
      <CodeEditor />
    </div>
  );
}
