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
          <li key={s.id}><Link href={`/scan/${s.id}`} className="flex justify-between px-4 py-3 text-sm hover:bg-card">
            <span>{new Date(s.at).toLocaleString()} · {s.fileCount} file{s.fileCount > 1 ? "s" : ""}</span>
            <span>Score {s.score} · {s.issues.length} issues</span></Link></li>
        ))}
      </ul>
    </section>
  );
}
