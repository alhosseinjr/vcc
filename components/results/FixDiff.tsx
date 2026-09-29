"use client";
import dynamic from "next/dynamic";

// Loaded lazily: the diff library is only needed once someone opens an issue.
const Viewer = dynamic(() => import("react-diff-viewer-continued"), { ssr: false, loading: () => <p className="text-xs text-muted">Loading diff…</p> });

/** Before/after view for a one-line fix. */
export function FixDiff({ before, after }: { before: string; after: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border text-xs" aria-label="Before and after comparison">
      <Viewer oldValue={before} newValue={after} splitView={false} hideLineNumbers useDarkTheme leftTitle="Before → After" />
    </div>
  );
}
