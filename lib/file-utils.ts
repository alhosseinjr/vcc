import JSZip from "jszip";
import { LIMITS, SUPPORTED_EXTENSIONS, detectLanguage } from "./utils";
import type { InputFile } from "@/store/scan-store";

const SKIP = /(^|\/)(node_modules|\.git|\.next|dist|build)\//;
const DANGEROUS_FILES = /^(?:\.env|\.env\.[A-Za-z0-9_-]+|\.aws|\.ssh|\.git|.*\.pem|.*\.key|.*\.p12|.*\.crt|.*\.csr|.*\.pfx|.*\.jks|secrets\.json|config\.json)$/i;
const MAX_DECOMPRESSED_BYTES = 100 * 1024 * 1024;
const MAX_FILE_COUNT = 1000;
const MAX_COMPRESSION_RATIO = 100;

/** Extract supported source files from a ZIP, with explicit safety checks and bomb protection. */
export async function extractZip(file: File): Promise<InputFile[]> {
  if (file.size > LIMITS.totalBytes) {
    throw new Error(`ZIP file exceeds ${(LIMITS.totalBytes / 1024 / 1024).toFixed(0)}MB limit.`);
  }

  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files);

  if (entries.length > MAX_FILE_COUNT) {
    throw new Error(`ZIP contains too many files (${entries.length} > ${MAX_FILE_COUNT}).`);
  }

  let total = 0;
  let decompressedTotal = 0;
  const out: InputFile[] = [];

  for (const entry of entries) {
    if (entry.dir) continue;

    const normalized = entry.name.replace(/\\/g, "/");
    if (normalized.includes("..") || normalized.startsWith("/")) {
      throw new Error(`Archive contains unsafe path: ${entry.name}`);
    }

    if (entry.unixPermissions && (entry.unixPermissions & 0o170000) === 0o120000) {
      throw new Error(`Archive contains symlinks, which are not allowed.`);
    }

    const fileName = normalized.split("/").pop() ?? "";
    if (DANGEROUS_FILES.test(fileName)) {
      throw new Error(`Archive contains sensitive file: ${fileName}`);
    }

    if (SKIP.test(normalized)) continue;

    const ext = normalized.slice(normalized.lastIndexOf(".")).toLowerCase();
    const isPkg = normalized.endsWith("package.json");
    if (!isPkg && (ext === ".zip" || !(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext))) {
      continue;
    }

    let content: string;
    try {
      content = await entry.async("string");
    } catch (error) {
      throw new Error(`Failed to extract ${entry.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    const contentBytes = new TextEncoder().encode(content).length;
    if (contentBytes > LIMITS.perFileBytes) {
      continue;
    }

    decompressedTotal += contentBytes;
    if (decompressedTotal > MAX_DECOMPRESSED_BYTES) {
      throw new Error(`Archive decompresses to more than ${(MAX_DECOMPRESSED_BYTES / 1024 / 1024).toFixed(0)}MB (ZIP bomb detected).`);
    }

    if (file.size > 0 && decompressedTotal > file.size * MAX_COMPRESSION_RATIO) {
      throw new Error("Archive has a suspicious compression ratio (ZIP bomb detected).");
    }

    total += contentBytes;
    if (total > LIMITS.totalBytes) {
      throw new Error("ZIP contents exceed the 50 MB limit.");
    }

    out.push({
      name: normalized,
      language: detectLanguage(normalized),
      content,
      size: contentBytes,
    });
  }

  if (out.length === 0) {
    throw new Error("No supported code files found in this ZIP.");
  }

  return out;
}
