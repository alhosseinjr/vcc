"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import type { Issue } from "@/lib/types";

/** Review step for "Fix all": every auto-fix is listed with before/after and can be unchecked. */
export function FixAllDialog({ issues, onApply, onClose }: { issues: Issue[]; onApply: (ids: string[]) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set(issues.map((i) => i.id)));
  useEffect(() => { ref.current?.showModal(); }, []);
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="fixall-title" className="w-full max-w-2xl rounded-xl border border-border bg-bg p-5 text-fg backdrop:bg-black/50">
      <h2 id="fixall-title" className="text-lg font-semibold">Review {issues.length} automatic fixes</h2>
      <p className="mb-3 text-sm text-muted">Uncheck any you don't want. You'll get a ZIP of the patched files. Test your app before deploying.</p>
      <ul className="max-h-80 space-y-2 overflow-y-auto">
        {issues.map((i) => (
          <li key={i.id} className="rounded-lg border border-border p-2 text-xs">
            <label className="flex items-start gap-2"><input type="checkbox" checked={picked.has(i.id)} onChange={() => toggle(i.id)} className="mt-1" />
              <span className="min-w-0"><strong className="text-sm">{i.title}</strong> <span className="text-muted">{i.file}:{i.line}</span>
                <pre className="mt-1 overflow-x-auto rounded bg-red-500/10 p-1"><code>- {i.original}</code></pre>
                <pre className="overflow-x-auto rounded bg-green-500/10 p-1"><code>+ {i.patched || "(line removed)"}</code></pre></span></label>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => ref.current?.close()}>Cancel</Button>
        <Button disabled={picked.size === 0} onClick={() => onApply([...picked])}>Download {picked.size} fix{picked.size === 1 ? "" : "es"}</Button>
      </div>
    </dialog>
  );
}
