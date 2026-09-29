import JSZip from "jszip";
import { LIMITS, SUPPORTED_EXTENSIONS, detectLanguage } from "./utils";
import type { InputFile } from "@/store/scan-store";

const SKIP = /(^|\/)(node_modules|\.git|\.next|dist|build)\//;

/** Extract supported source files from a ZIP, skipping junk folders and enforcing size limits. */
export async function extractZip(file: File): Promise<InputFile[]> {
  const zip = await JSZip.loadAsync(file);
  const out: InputFile[] = [];
  let total = 0;
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || SKIP.test(entry.name)) continue;
    const ext = entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase();
    const isPkg = entry.name.endsWith("package.json");
    if (!isPkg && (ext === ".zip" || !(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext))) continue;
    const content = await entry.async("string");
    if (content.length > LIMITS.perFileBytes) continue;
    total += content.length;
    if (total > LIMITS.totalBytes) throw new Error("ZIP contents exceed the 50 MB limit.");
    out.push({ name: entry.name, language: detectLanguage(entry.name), content, size: content.length });
  }
  if (out.length === 0) throw new Error("No supported code files found in this ZIP.");
  return out;
}
