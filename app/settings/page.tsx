"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/common/ToastProvider";
import { useTheme, type Theme } from "@/components/common/ThemeProvider";
import { clearAll } from "@/lib/storage";
import { ALL_LANGUAGES, DEFAULT_PREFS, loadPrefs, savePrefs, type Prefs } from "@/lib/prefs";
import { SEVERITY_ORDER, type Severity } from "@/lib/types";

export default function SettingsPage() {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const [key, setKey] = useState("");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => { try { setKey(localStorage.getItem("vcc:groqKey") ?? ""); } catch { /* ignore */ } setPrefs(loadPrefs()); }, []);
  const update = (p: Prefs) => { setPrefs(p); savePrefs(p); };
  const saveKey = () => { try { localStorage.setItem("vcc:groqKey", key.trim()); toast("API key saved"); } catch { toast("Couldn't save (storage blocked)"); } };

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <section className="space-y-2">
        <label htmlFor="theme" className="block text-sm font-medium">Theme</label>
        <select id="theme" value={theme} onChange={(e) => setTheme(e.target.value as Theme)} className="rounded-lg border border-border bg-bg p-2"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select>
      </section>
      <section className="space-y-2">
        <label htmlFor="k" className="block text-sm font-medium">Groq API key (optional, free at console.groq.com)</label>
        <input id="k" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} className="w-full rounded-xl border border-border bg-bg p-2" placeholder="gsk_..." />
        <p className="text-xs text-muted">Stored only in this browser. Sent only with your request so Groq can review your code.</p>
        <Button onClick={saveKey}>Save key</Button>
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Scan preferences</h2>
        <fieldset className="space-y-1"><legend className="text-xs text-muted">Languages to scan</legend>
          {ALL_LANGUAGES.map((l) => <label key={l} className="mr-4 inline-flex items-center gap-1 text-sm"><input type="checkbox" checked={prefs.languages.includes(l)}
            onChange={(e) => update({ ...prefs, languages: e.target.checked ? [...prefs.languages, l] : prefs.languages.filter((x) => x !== l) })} />{l}</label>)}
        </fieldset>
        <label className="block text-sm">Show issues down to: <select value={prefs.minSeverity} onChange={(e) => update({ ...prefs, minSeverity: e.target.value as Severity })} className="ml-1 rounded-lg border border-border bg-bg p-1">{SEVERITY_ORDER.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prefs.includeStyle} onChange={(e) => update({ ...prefs, includeStyle: e.target.checked })} />Include style issues (like leftover console.log)</label>
      </section>
      <Button variant="outline" onClick={() => { clearAll(); setKey(""); setPrefs(DEFAULT_PREFS); toast("All local data cleared"); }}>Clear all local data</Button>
    </div>
  );
}
