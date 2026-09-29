import type { Issue } from "./types";
export interface SavedScan { id: string; at: number; fileCount: number; score: number; issues: Issue[]; aiUsed?: boolean; aiNote?: string; projectType?: string }
const KEY = "vcc:history";

export function loadHistory(): SavedScan[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as SavedScan[]; } catch { return []; }
}
/** Keep the last 50 scans, auto-clear oldest if quota exceeded. */
export function saveScan(s: SavedScan): void {
  const history = loadHistory();
  let next = [s, ...history].slice(0, 50);
  while (next.length > 0) {
    try { 
      localStorage.setItem(KEY, JSON.stringify(next)); 
      return; 
    } catch (e: any) { 
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        // Drop the oldest 5 scans and try again
        if (next.length <= 1) break;
        next = next.slice(0, Math.max(1, next.length - 5));
      } else {
        break; // some other error, e.g. blocked
      }
    }
  }
}
export function clearAll(): void { try { localStorage.clear(); } catch { /* ignore */ } }

export interface Marks { fixed: string[]; ignored: string[] }
const MARKS = "vcc:marks";
export function loadMarks(): Marks {
  try { return { fixed: [], ignored: [], ...(JSON.parse(localStorage.getItem(MARKS) ?? "{}") as Partial<Marks>) }; } catch { return { fixed: [], ignored: [] }; }
}
export function saveMarks(m: Marks): void { try { localStorage.setItem(MARKS, JSON.stringify(m)); } catch { /* ignore */ } }

export function getScan(id: string): SavedScan | null { return loadHistory().find((s) => s.id === id) ?? null; }
type StoredFile = { name: string; content: string };
/** Source files live in sessionStorage only (they can be large); "Fix all" needs them, reports don't. */
export function saveScanFiles(id: string, files: StoredFile[]): void { try { sessionStorage.setItem(`vcc:files:${id}`, JSON.stringify(files)); } catch { /* too big: Fix all disabled */ } }
export function loadScanFiles(id: string): StoredFile[] | null { try { return JSON.parse(sessionStorage.getItem(`vcc:files:${id}`) ?? "null") as StoredFile[] | null; } catch { return null; } }
