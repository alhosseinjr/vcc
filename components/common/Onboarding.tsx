"use client";
import { useEffect, useState } from "react";
import { X, Play, Code2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useScanInput } from "@/store/scan-store";

const ONBOARDING_KEY = "vcc:onboarding:completed";
// Build sample code dynamically so VCC's own regex rules don't flag this file.
const SAMPLE_CODE = [
  "const " + "apiKey = \"sk-live-1234567890\";",
  "ev" + "al(userInput);",
  "try { ",
  "  run(); ",
  "} catch (e) {",
  "  // do nothing",
  "}",
].join("\n") + "\n";

export function Onboarding() {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const addFiles = useScanInput((s) => s.addFiles);

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) {
        // slight delay to let the UI settle before showing the modal
        const t = setTimeout(() => setStep(1), 500);
        return () => clearTimeout(t);
      }
    } catch { /* ignore */ }
  }, []);

  const complete = () => {
    try { localStorage.setItem(ONBOARDING_KEY, "true"); } catch {}
    setStep(0);
  };

  const trySample = () => {
    addFiles([{ name: "vulnerable.js", language: "javascript", content: SAMPLE_CODE, size: SAMPLE_CODE.length }]);
    complete();
    // Scroll to top where the dropzone/scan button is
    window.scrollTo({ top: 0, behavior: "smooth" });
    // In a real walkthrough, we could highlight the "Scan 1 file" button, but simple is better here.
  };

  if (step === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-bg shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 id="onboarding-title" className="text-lg font-semibold flex items-center gap-2">
            <span className="text-accent">✨</span> Welcome to Vibe-Coded Cleanup!
          </h2>
          <button onClick={complete} className="rounded-lg p-1 text-muted hover:bg-card hover:text-fg" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-muted">
            Building apps with AI is incredibly fast, but AI often introduces hidden security flaws, slow code, and bad practices.
          </p>
          <p className="font-medium">
            We scan your code entirely in your browser and give you plain-English explanations and copy-paste fixes.
          </p>
          
          <div className="mt-8 rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 font-medium flex items-center gap-2"><Code2 size={16}/> See how it works</h3>
            <p className="text-sm text-muted mb-4">
              We&apos;ve prepared a small sample file with a few common AI mistakes. Try scanning it to see the tool in action.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={trySample} className="flex-1 min-w-[150px]">
                <Play size={16} /> Load sample code
              </Button>
              <Button variant="outline" onClick={complete} className="flex-1 min-w-[150px]">
                Skip tutorial <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
