import { RecentScans } from "@/components/scanner/RecentScans";
import { Scanner } from "@/components/scanner/Scanner";

const steps = [
  ["1. Add your code", "Drop files or paste code. Nothing is uploaded to our servers."],
  ["2. We inspect it", "Rules and AI look for security holes, slow spots, and risky habits."],
  ["3. Copy the fixes", "Every problem comes with plain-English help and a ready fix."],
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Scan your AI-generated code for hidden issues</h1>
        <p className="mx-auto max-w-2xl text-muted">Like having a senior security engineer look over your app, free and in under 30 seconds.</p>
      </section>
      <Scanner />
      <RecentScans />
      <section aria-labelledby="how" className="space-y-4">
        <h2 id="how" className="text-xl font-semibold">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map(([t, d]) => (
            <div key={t} className="rounded-xl border border-border bg-card p-4"><h3 className="font-medium">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></div>
          ))}
        </div>
      </section>
    </div>
  );
}
