"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeShareHash, type Annotation } from "@/lib/annotations";
import { Button } from "@/components/ui/Button";

export default function ShareLandingPage() {
  const router = useRouter();
  const [data, setData] = useState<{ v: string; g?: string; a: Annotation[]; i?: any[] } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) {
      router.replace("/");
      return;
    }
    
    const decoded = decodeShareHash(hash);
    if (!decoded) {
      alert("Invalid or broken share link.");
      router.replace("/");
      return;
    }
    setData(decoded);
  }, [router]);

  if (!data) return <div className="p-8 text-center">Loading shared view...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-4">
      <h1 className="text-2xl font-bold">Shared Code Review</h1>
      
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        {data.g ? (
          <div>
            <p className="text-sm text-muted">This review was generated from a GitHub repository:</p>
            <p className="font-mono text-sm my-2 break-all bg-bg p-2 rounded">{data.g}</p>
            <p className="text-sm mb-4">To view the full architecture diagram, heatmap, and treemap, you need to scan this repository locally.</p>
            <Button onClick={() => {
              // We could automatically trigger a scan, but it's better to send them to home with the URL pre-filled if possible, 
              // or just tell them to copy it. For simplicity, just copy to clipboard and send to home.
              navigator.clipboard.writeText(data.g!);
              alert("GitHub URL copied to clipboard! Paste it in the GitHub Scanner on the home page.");
              router.push("/");
            }}>Copy URL & Go to Scanner</Button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted">This review was generated from local files. You will need the original files to perform a full scan and view the architecture diagrams.</p>
          </div>
        )}
      </div>
      
      {data.a && data.a.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Annotations ({data.a.length})</h2>
          <div className="space-y-4">
            {data.a.map(a => (
              <div key={a.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="font-mono text-xs truncate max-w-[70%]">{a.targetId}</span>
                  <span className="text-xs text-muted">{new Date(a.timestamp).toLocaleDateString()} by {a.author}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{a.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.i && data.i.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Included Issues ({data.i.length})</h2>
          <div className="space-y-2">
            {data.i.map((iss, idx) => (
              <div key={idx} className="rounded border border-border p-3 text-sm flex gap-3">
                <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${iss.severity === 'critical' ? 'bg-red-500' : iss.severity === 'high' ? 'bg-orange-500' : iss.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                <div>
                  <p className="font-semibold">{iss.title}</p>
                  <p className="text-xs font-mono text-muted">{iss.file}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
