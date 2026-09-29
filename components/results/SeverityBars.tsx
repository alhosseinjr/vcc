import { SEVERITY_ICON, SEVERITY_ORDER, type Issue, type Severity } from "@/lib/types";
const COLOR: Record<Severity, string> = { critical: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-blue-500", info: "bg-gray-400" };

/** Horizontal bars; each row also has text, so color is never the only signal. */
export function SeverityBars({ issues }: { issues: Issue[] }) {
  const counts = SEVERITY_ORDER.map((s) => [s, issues.filter((i) => i.severity === s).length] as const);
  const max = Math.max(1, ...counts.map(([, n]) => n));
  return (
    <div className="w-48 space-y-1 text-xs" role="img" aria-label={counts.map(([s, n]) => `${n} ${s}`).join(", ")}>
      {counts.map(([s, n]) => (
        <div key={s} className="flex items-center gap-2"><span className="w-20">{SEVERITY_ICON[s]} {s}</span>
          <div className="h-2 flex-1 rounded bg-border"><div className={`h-2 rounded ${COLOR[s]}`} style={{ width: `${(n / max) * 100}%` }} /></div><span className="w-4 text-right">{n}</span></div>
      ))}
    </div>
  );
}
