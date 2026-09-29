"use client";
import { suggestIntegrations } from "@/lib/integrations";
import { useToast } from "../common/ToastProvider";
import { Button } from "../ui/Button";
import type { Issue } from "@/lib/types";

export function IntegrationTips({ issues }: { issues: Issue[] }) {
  const toast = useToast();
  const tips = suggestIntegrations(issues);
  const copy = async (s: string) => { try { await navigator.clipboard.writeText(s); toast("Copied"); } catch { toast("Couldn't copy"); } };
  return (
    <section aria-labelledby="tips" className="space-y-2 pt-4">
      <h2 id="tips" className="text-lg font-semibold">Keep it clean: suggested next steps</h2>
      {tips.map((t) => (
        <details key={t.id} className="rounded-xl border border-border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-medium">{t.title}</summary>
          <p className="mt-2 text-muted">{t.why} Save as <code>{t.filename}</code></p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-bg p-3 text-xs"><code>{t.snippet}</code></pre>
          <Button variant="outline" className="mt-2" onClick={() => void copy(t.snippet)}>Copy</Button>
        </details>
      ))}
    </section>
  );
}
