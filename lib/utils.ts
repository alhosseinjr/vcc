import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, resolving Tailwind conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const LIMITS = { perFileBytes: 5 * 1024 * 1024, totalBytes: 50 * 1024 * 1024 } as const;
export const SUPPORTED_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".py", ".html", ".css", ".sql", ".zip"] as const;

export type Language = "javascript" | "typescript" | "python" | "html" | "css" | "sql" | "unknown";

/** Detect language from a file name; falls back to "unknown". */
export function detectLanguage(name: string): Language {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  const map: Record<string, Language> = {
    ".js": "javascript", ".jsx": "javascript", ".ts": "typescript", ".tsx": "typescript",
    ".py": "python", ".html": "html", ".css": "css", ".sql": "sql",
  };
  return map[ext] ?? "unknown";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}
