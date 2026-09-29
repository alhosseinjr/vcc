"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "../ui/Button";

const STAGES = ["Checking for security issues…", "Analyzing performance…", "Reviewing best practices…", "Generating fixes…"];

/** Inline progress card. Stages rotate on a timer (the server call is one request, so this is honest "activity", not exact %). */
export function ScanProgress({ onCancel }: { onCancel: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((n) => Math.min(n + 1, STAGES.length - 1)), 2500); return () => clearInterval(t); }, []);
  return (
    <div role="status" aria-live="polite" className="space-y-4 rounded-xl border border-border bg-card p-6 text-center">
      <motion.div className="mx-auto h-3 w-3 rounded-full bg-accent" animate={{ scale: [1, 1.8, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
      <AnimatePresence mode="wait">
        <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="font-medium">{STAGES[i]}</motion.p>
      </AnimatePresence>
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
    </div>
  );
}
