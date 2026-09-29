"use client";
import { useState } from "react";
import { Button } from "../ui/Button";
import { useToast } from "../common/ToastProvider";
import { encodeReport } from "@/lib/share";
import type { Issue } from "@/lib/types";

export function ShareButton({ issues, score }: { issues: Issue[]; score: number }) {
  const toast = useToast();
  const [days, setDays] = useState("7");
  async function share() {
    try {
      const url = `${location.origin}/shared#${await encodeReport(issues, score, days === "never" ? null : Number(days))}`;
      await navigator.clipboard.writeText(url);
      toast(url.length > 8000 ? "Link copied (very long, some chat apps may cut it)" : "Share link copied");
    } catch { toast("Couldn't create the link in this browser"); }
  }
  return (
    <span className="inline-flex items-center gap-1">
      <select aria-label="Link expiry" value={days} onChange={(e) => setDays(e.target.value)} className="rounded-lg border border-border bg-bg p-1 text-sm">
        <option value="7">7 days</option><option value="30">30 days</option><option value="never">Forever</option></select>
      <Button variant="outline" onClick={share}>🔗 Share</Button>
    </span>
  );
}
