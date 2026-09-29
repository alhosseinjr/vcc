"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "../ui/Button";
import { useScanInput } from "@/store/scan-store";
import { detectLanguage } from "@/lib/utils";

// Monaco is heavy, so it loads only when this component renders (keeps initial bundle small).
const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: () => <p className="p-4 text-sm text-muted">Loading editor…</p> });
const EXTS = [".ts", ".tsx", ".js", ".jsx", ".py", ".html", ".css", ".sql"] as const;
const MONACO_LANG: Record<string, string> = { ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript", ".py": "python", ".html": "html", ".css": "css", ".sql": "sql" };

export function CodeEditor() {
  const addFiles = useScanInput((s) => s.addFiles);
  const [code, setCode] = useState("");
  const [ext, setExt] = useState<(typeof EXTS)[number]>(".ts");
  const [n, setN] = useState(1);

  const add = () => {
    if (!code.trim()) return;
    const name = `pasted-${n}${ext}`;
    addFiles([{ name, language: detectLanguage(name), content: code, size: code.length }]);
    setCode(""); setN(n + 1);
  };
  return (
    <section aria-label="Paste code" className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">Or paste code</h2>
        <select aria-label="Language" value={ext} onChange={(e) => setExt(e.target.value as (typeof EXTS)[number])} className="rounded-lg border border-border bg-bg p-1 text-sm">
          {EXTS.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <Monaco height="240px" language={MONACO_LANG[ext]} value={code} onChange={(v) => setCode(v ?? "")} theme="vs-dark" options={{ minimap: { enabled: false }, fontSize: 13 }} />
      </div>
      <Button variant="outline" onClick={add} disabled={!code.trim()}>Add pasted code</Button>
    </section>
  );
}
