import type { Issue } from "./types";

export interface SavedScan {
  id: string;
  at: number;
  fileCount: number;
  score: number;
  issues: Issue[];
  aiUsed?: boolean;
  aiNote?: string;
  projectType?: string;
  skippedFileCount?: number;
  skippedFileNames?: string[];
}

const HISTORY_KEY = "vcc:history";
const MARKS_KEY = "vcc:marks";

const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

export function loadHistory(): SavedScan[] {
  try {
    return safeJsonParse<SavedScan[]>(localStorage.getItem(HISTORY_KEY), []);
  } catch {
    return [];
  }
}

export function saveScan(s: SavedScan): void {
  try {
    const history = loadHistory();
    const next = [s, ...history].slice(0, 25);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota issues; do not persist raw source files.
  }
}

export function clearAll(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(MARKS_KEY);
  } catch {
    // ignore
  }
}

export function deleteScan(id: string): void {
  try {
    const history = loadHistory().filter((s) => s.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    sessionStorage.removeItem(`vcc:files:${id}`);
  } catch {
    // ignore
  }
}

export interface Marks {
  fixed: string[];
  ignored: string[];
}

export function loadMarks(): Marks {
  try {
    return { fixed: [], ignored: [], ...(safeJsonParse<Partial<Marks>>(localStorage.getItem(MARKS_KEY), {})) };
  } catch {
    return { fixed: [], ignored: [] };
  }
}

export function saveMarks(m: Marks): void {
  try {
    localStorage.setItem(MARKS_KEY, JSON.stringify(m));
  } catch {
    // ignore
  }
}

export function getScan(id: string): SavedScan | null {
  return loadHistory().find((s) => s.id === id) ?? null;
}

export type StoredFile = { name: string; content: string };

export function saveScanFiles(id: string, files: StoredFile[]): void {
  try {
    sessionStorage.setItem(`vcc:files:${id}`, JSON.stringify(files.slice(0, 100)));
  } catch {
    // Too large for browser storage; do not persist raw source data.
  }
}

export function loadScanFiles(id: string): StoredFile[] | null {
  try {
    return safeJsonParse<StoredFile[] | null>(sessionStorage.getItem(`vcc:files:${id}`), null);
  } catch {
    return null;
  }
}
