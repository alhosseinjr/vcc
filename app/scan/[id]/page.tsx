"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ResultsView } from "@/components/results/ResultsView";
import { getScan, loadScanFiles, type SavedScan } from "@/lib/storage";

export default function ScanResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<SavedScan | null | undefined>(undefined); // undefined = still loading
  const [files, setFiles] = useState<{ name: string; content: string }[] | null>(null);
  useEffect(() => { setScan(getScan(id)); setFiles(loadScanFiles(id)); }, [id]);

  if (scan === undefined) return <div aria-busy="true" className="space-y-3">{[80, 40, 40, 40].map((h, i) => <div key={i} style={{ height: h }} className="animate-pulse rounded-xl bg-card" />)}</div>;
  if (scan === null) return <div className="space-y-3 text-center"><p>We couldn't find that scan. It may have been cleared.</p><Link href="/" className="text-accent underline">Start a new scan</Link></div>;
  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-accent underline">← New scan</Link>
      <h1 className="text-2xl font-semibold">Scan results <span className="text-sm font-normal text-muted">{new Date(scan.at).toLocaleString()} · {scan.fileCount} files</span></h1>
      <ResultsView scan={scan} files={files} />
    </div>
  );
}
