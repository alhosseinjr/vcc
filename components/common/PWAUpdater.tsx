"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useToast } from "./ToastProvider";
import { Button } from "../ui/Button";

const DISMISSED_KEY = "vcc:pwa:install-dismissed";

export function PWAUpdater() {
  const toast = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // Check if dismissed previously
    try { setIsDismissed(localStorage.getItem(DISMISSED_KEY) === "true"); } catch {}

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                toast("New update available! Reload to apply.");
              }
            });
          }
        });
      }).catch(err => console.error("SW registration failed:", err));
      
      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      
      window.addEventListener("appinstalled", () => {
        setIsInstallable(false);
        setDeferredPrompt(null);
      });

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }
  }, [toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsInstallable(false);
    try { localStorage.setItem(DISMISSED_KEY, "true"); } catch {}
  };

  if (!isInstallable || isDismissed) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 sm:bottom-4 animate-in slide-in-from-bottom-5 fade-in duration-300 motion-reduce:transition-none motion-reduce:animate-none">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xl">
        <Button onClick={handleInstallClick} className="whitespace-nowrap px-4 py-2 flex items-center gap-2">
          <Download size={16} /> Install App
        </Button>
        <button 
          onClick={handleDismiss} 
          className="text-muted hover:text-fg hover:bg-bg rounded-lg p-2 transition-colors min-h-[44px] flex items-center justify-center"
          aria-label="Dismiss install prompt"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
