"use client";
import { useCallback, useRef, useState, type DragEvent } from "react";
import { UploadCloud, X } from "lucide-react";
import { LIMITS, SUPPORTED_EXTENSIONS, detectLanguage, formatBytes } from "@/lib/utils";
import { useScanInput, type InputFile } from "@/store/scan-store";
import { Button } from "../ui/Button";
import { extractZip } from "@/lib/file-utils";

/** Reads dropped/selected files, validates type + size, and stages them in the store. ZIP extraction arrives in Phase 3 (jszip). */
export function DropZone({ onScan, busy }: { onScan: () => void; busy: boolean }) {
  const { files, addFiles, removeFile, clear } = useScanInput();
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ingest = useCallback(async (list: FileList | File[]) => {
    setError(null);
    const accepted: InputFile[] = [];
    let total = files.reduce((n, f) => n + f.size, 0);
    for (const file of Array.from(list)) {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
        setError(`"${file.name}" isn't a supported file type. Try ${SUPPORTED_EXTENSIONS.join(", ")}.`); continue;
      }
      if (ext === ".zip") {
        try { accepted.push(...(await extractZip(file))); } catch (err) { setError(err instanceof Error ? err.message : "Couldn't open that ZIP."); }
        continue;
      }
      if (file.size === 0) { setError(`"\${file.name}" is empty.`); continue; }
      if (file.size > LIMITS.perFileBytes) { setError(`"\${file.name}" is over the 5 MB limit (\${formatBytes(file.size)}).`); continue; }
      if (total + file.size > LIMITS.totalBytes) { setError("Total upload size would exceed 50 MB."); break; }
      try {
        const content = await file.text();
        if (content.includes("\\0")) { setError(`"\${file.name}" appears to be a binary file. Only text code files are supported.`); continue; }
        accepted.push({ name: file.name, language: detectLanguage(file.name), content, size: file.size });
        total += file.size;
      } catch { setError(`Couldn't read "\${file.name}". Please try again.`); }
    }
    if (accepted.length) addFiles(accepted);
  }, [files, addFiles]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setOver(false); void ingest(e.dataTransfer.files); };

  return (
    <section aria-label="Upload code" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div role="button" tabIndex={0} aria-label="Drop files here or press Enter to browse"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
        className={`group relative flex cursor-pointer flex-col items-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed p-8 sm:p-16 text-center transition-all duration-300 ${over ? "border-accent bg-accent/5 scale-[1.02] shadow-xl" : "border-border/60 bg-card/20 hover:border-accent/50 hover:bg-card/60 hover:shadow-lg"}`}>
        
        {/* Subtle background glow on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className={`rounded-2xl p-4 transition-all duration-500 ${over ? "bg-accent text-accent-fg scale-110 shadow-lg shadow-accent/20" : "bg-card text-accent group-hover:scale-110 group-hover:shadow-md group-hover:bg-accent/10"}`}>
          <UploadCloud size={42} aria-hidden />
        </div>
        
        <div className="space-y-1 relative z-10">
          <p className="text-xl font-semibold tracking-tight text-fg">Drop your code files here</p>
          <p className="text-sm font-medium text-muted/80">or click to browse <span className="mx-2 text-border/40">|</span> .js .ts .jsx .tsx .py .html .css .sql</p>
        </div>
        
        <input ref={inputRef} type="file" multiple hidden accept={SUPPORTED_EXTENSIONS.join(",")}
          onChange={(e) => e.target.files && void ingest(e.target.files)} />
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500 animate-in fade-in zoom-in-95">⚠️ {error}</p>}
      {files.length > 0 && (
        <div className="mt-4">
          <ul className="divide-y divide-border rounded-xl border border-border">
            {files.map((f) => (
              <li key={f.name} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{f.name} <span className="text-muted">· {f.language} · {formatBytes(f.size)}</span></span>
                <button aria-label={`Remove ${f.name}`} onClick={() => removeFile(f.name)} className="rounded p-1 hover:bg-card"><X size={16} aria-hidden /></button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button onClick={onScan} disabled={busy}>{busy ? "Scanning…" : `Scan ${files.length} file${files.length > 1 ? "s" : ""}`}</Button>
            <Button variant="outline" onClick={clear}>Clear</Button>
          </div>
        </div>
      )}
    </section>
  );
}
