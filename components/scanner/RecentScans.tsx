"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadHistory, type SavedScan } from "@/lib/storage";

export function RecentScans() {
  const [scans, setScans] = useState<SavedScan[]>([]);
  useEffect(() => setScans(loadHistory().slice(0, 5)), []);
  if (scans.length === 0) return null;
  return (
    <section aria-labelledby="recent" className="space-y-2">
      <h2 id="recent" className="text-xl font-semibold">Recent scans</h2>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {scans.map((s) => (
          <li key={s.id} className="flex items-center justify-between hover:bg-card">
            <Link href={`/scan/${s.id}`} className="flex-1 px-4 py-3 text-sm">
              <span>{new Date(s.at).toLocaleString()} · {s.fileCount} file{s.fileCount > 1 ? "s" : ""}</span>
              <span className="ml-4">Score {s.score} · {s.issues.length} issues</span>
            </Link>
            <button 
              onClick={() => {
                import("@/lib/storage").then(({ deleteScan }) => {
                  deleteScan(s.id);
                  setScans((prev) => prev.filter((x) => x.id !== s.id));
                });
              }}
              className="mr-2 rounded p-2 text-muted hover:bg-red-500/10 hover:text-red-500"
              title="Delete scan"
              aria-label="Delete scan"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
