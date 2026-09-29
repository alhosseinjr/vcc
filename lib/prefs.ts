import type { Language } from "./utils";
import type { Severity } from "./types";

export interface Prefs { minSeverity: Severity; includeStyle: boolean; languages: Language[] }
export const ALL_LANGUAGES: Language[] = ["javascript", "typescript", "python", "html", "css", "sql"];
export const DEFAULT_PREFS: Prefs = { minSeverity: "info", includeStyle: true, languages: ALL_LANGUAGES };
const KEY = "vcc:prefs";

export function loadPrefs(): Prefs {
  try { return { ...DEFAULT_PREFS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>) }; } catch { return DEFAULT_PREFS; }
}
export function savePrefs(p: Prefs): void { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ } }
