"use client";
import { useState } from "react";
import { Button } from "../ui/Button";
import { useScanInput } from "@/store/scan-store";
import { detectLanguage } from "@/lib/utils";
import { Code2, ChevronDown } from "lucide-react";

const EXTS = [".ts", ".tsx", ".js", ".jsx", ".py", ".html", ".css", ".sql"] as const;

export function CodeEditor() {
  const addFiles = useScanInput((s) => s.addFiles);
  const [code, setCode] = useState("");
  const [ext, setExt] = useState<(typeof EXTS)[number]>(".ts");
  const [n, setN] = useState(1);
  const [isFocused, setIsFocused] = useState(false);

  const add = () => {
    if (!code.trim()) return;
    const name = `pasted-${n}${ext}`;
    addFiles([{ name, language: detectLanguage(name), content: code, size: code.length }]);
    setCode(""); setN(n + 1);
  };
  
  return (
    <section aria-label="Paste code" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Code2 size={18} />
        </div>
        <h2 className="text-lg font-semibold tracking-tight">Or paste code</h2>
        
        <div className="relative ml-auto">
          <select 
            aria-label="Language" 
            value={ext} 
            onChange={(e) => setExt(e.target.value as (typeof EXTS)[number])} 
            className="appearance-none rounded-lg border border-border/50 bg-card/50 pl-3 pr-8 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-card hover:border-border focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {EXTS.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>
      </div>
      
      <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${isFocused ? 'border-accent shadow-[0_0_15px_rgba(var(--accent),0.15)] bg-card/80' : 'border-border/50 bg-card/30 hover:border-border hover:bg-card/50'}`}>
        
        <textarea 
          className="w-full min-h-[260px] resize-y bg-transparent p-5 font-mono text-sm leading-relaxed text-fg placeholder:text-muted/50 focus:outline-none"
          value={code} 
          onChange={(e) => setCode(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={`// Paste your ${ext} code here...\\\n\\\nfunction example() {\\\n  console.log("Ready to scan!");\\\n}`}
          spellCheck={false}
        />
        
        {/* Subtle gradient overlay at the bottom to blend with background if text is long */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card/80 to-transparent" />
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={add} 
          disabled={!code.trim()}
          className="relative overflow-hidden shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          Add pasted code
        </Button>
      </div>
    </section>
  );
}
