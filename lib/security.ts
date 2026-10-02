export const MAX_REQUEST_BYTES = 25 * 1024 * 1024;
export const MAX_TEXT_FILE_BYTES = 1_048_576;
export const MAX_TOTAL_PROJECT_BYTES = 15 * 1024 * 1024;
export const MAX_ARCHIVE_ENTRIES = 500;
export const MAX_PATH_SEGMENTS = 32;

export function normalizeRelativePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

export function isSafeRelativePath(value: string, { maxLength = 240, allowRoot = false } = {}): boolean {
  if (!value || value.length > maxLength) return false;
  if (value.includes("\0")) return false;

  const normalized = normalizeRelativePath(value);
  if (!normalized) return allowRoot;
  if (normalized === "." || normalized === "..") return false;
  if (normalized.includes("//") || normalized.includes("../") || normalized.startsWith("../") || normalized.endsWith("/..")) {
    return false;
  }
  if (normalized.includes("..")) return false;
  if (normalized.startsWith("/") || normalized.startsWith("\\")) return false;

  const segments = normalized.split("/");
  if (segments.length > MAX_PATH_SEGMENTS) return false;
  return segments.every((segment) => {
    if (!segment || segment === "." || segment === "..") return false;
    if (segment.length > 255) return false;
    if (/[<>:"|?*]/.test(segment)) return false;
    return true;
  });
}

export function looksLikeBinary(content: Uint8Array | string): boolean {
  const sample = typeof content === "string" ? new TextEncoder().encode(content.slice(0, 4096)) : content.slice(0, 4096);
  let binaryScore = 0;
  for (let i = 0; i < sample.length; i += 1) {
    const byte = sample[i];
    if (byte === 0) return true;
    if (byte < 9 || (byte > 13 && byte < 32)) binaryScore += 1;
  }
  return binaryScore > 32;
}

export function isPrivateGitHubHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1") return true;
  if (host.startsWith("127.")) return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  if (host.startsWith("169.254.")) return true;
  if (host.startsWith("172.")) {
    const match = host.match(/^172\.(\d+)\./);
    if (!match) return false;
    const octet = Number(match[1]);
    return octet >= 16 && octet <= 31;
  }
  return false;
}

export function isGitHubAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    if (parsed.hostname === "github.com" || parsed.hostname === "www.github.com") {
      return !isPrivateGitHubHost(parsed.hostname);
    }
    return false;
  } catch {
    return false;
  }
}
