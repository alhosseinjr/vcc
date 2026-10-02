"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { decodeReport, type SharedReport } from "@/lib/share";
import { SEVERITY_ICON } from "@/lib/types";

export default function SharedPage() {
  const [r, setR] = useState<SharedReport | "expired" | null | undefined>(undefined);
  useEffect(() => { void decodeReport(location.hash.slice(1)).then(setR); }, []);
  if (r === undefined) return <div aria-busy="true" className="h-24 animate-pulse rounded-xl bg-card" />;
  if (r === null) return <p>This link isn&apos;t valid. Ask the sender for a fresh one.</p>;
  if (r === "expired") return <p>This shared report has expired. Ask the sender for a new link.</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Shared report <span className="text-sm font-normal text-muted">score {r.score}/100 · {r.issues.length} issues · {new Date(r.at).toLocaleDateString()}</span></h1>
      <p className="text-sm text-muted">Read-only. Contains issue descriptions and suggested fixes, not the source files. <Link href="/" className="text-accent underline">Scan your own code</Link></p>
      {r.issues.map((i, n) => (
        <details key={n} className="rounded-xl border border-border bg-card p-4">
          <summary className="cursor-pointer font-medium">{SEVERITY_ICON[i.severity]} {i.title} <span className="text-xs text-muted">{i.file}:{i.line}</span></summary>
          <div className="mt-2 space-y-2 text-sm"><p>{i.explanation}</p><p className="italic text-muted">💡 {i.analogy}</p><pre className="overflow-x-auto rounded-lg bg-bg p-3 text-xs"><code>{i.fix}</code></pre></div>
        </details>
      ))}
    </div>
  );
}
