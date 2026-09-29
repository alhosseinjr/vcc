import Link from "next/link";
import { ShieldCheck, Settings } from "lucide-react";
import { ThemeToggle } from "../common/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <ShieldCheck size={20} className="text-accent" aria-hidden /> Vibe-Coded Cleanup
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/compare" className="rounded-xl px-3 py-2 min-h-[44px] flex items-center text-sm hover:bg-card">Compare</Link>
          <Link href="/learn" className="rounded-xl px-3 py-2 min-h-[44px] flex items-center text-sm hover:bg-card">Learn</Link>
          <Link href="/help" className="rounded-xl px-3 py-2 min-h-[44px] flex items-center text-sm hover:bg-card">Help</Link>
          <Link href="/settings" aria-label="Settings" className="rounded-xl p-2 min-h-[44px] flex items-center hover:bg-card"><Settings size={18} aria-hidden /></Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
