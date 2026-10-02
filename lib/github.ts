export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubParseResult {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

const FORBIDDEN_HOST_PREFIXES = [
  "localhost",
  "127.",
  "0.0.0.0",
  "::1",
  "10.",
  "192.168.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "169.254.",
  "fc00:",
  "fe80:",
];

const isForbiddenHost = (host: string): boolean => {
  const normalized = host.toLowerCase();
  return FORBIDDEN_HOST_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix));
};

export function parseGitHubUrl(url: string): GitHubParseResult | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    if (parsed.hash) return null;

    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "github.com" || isForbiddenHost(host)) return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    if (!owner || !repo || /\.\.|^\.|\/$/.test(owner) || /\.\.|^\.|\/$/.test(repo)) {
      return null;
    }

    let branch = "HEAD";
    let path = "";

    if (parts.length >= 4 && (parts[2] === "tree" || parts[2] === "blob")) {
      branch = parts[3];
      path = parts.slice(4).join("/");
      if (path.includes("..") || path.startsWith("/") || path.includes("\\")) return null;
    }

    return { owner, repo, branch, path };
  } catch {
    return null;
  }
}

function githubHeaders(token?: string, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function githubFetch(url: string, headers: Record<string, string>, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(url, {
      headers,
      signal: signal ?? controller.signal,
      redirect: "manual",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function throwGitHubHttp(res: Response, notFound: string): void {
  if (res.status === 404) throw new Error(notFound);
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    const msg = reset
      ? `Rate limit exceeded. Resets at ${new Date(Number(reset) * 1000).toLocaleTimeString()}.`
      : "Rate limit exceeded. Please add a GitHub token.";
    throw new Error(msg);
  }
  if (!res.ok) throw new Error(`GitHub request failed: ${res.statusText}`);
}

export async function resolveDefaultBranch(owner: string, repo: string, token?: string, signal?: AbortSignal): Promise<string> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const res = await githubFetch(url, githubHeaders(token, { Accept: "application/vnd.github.v3+json" }), signal);
  throwGitHubHttp(res, "Repository not found.");
  const data = (await res.json()) as { default_branch: string };
  return data.default_branch;
}

export async function fetchGitHubTree(owner: string, repo: string, branch: string, token?: string, signal?: AbortSignal): Promise<GitHubTreeItem[]> {
  const resolvedBranch = branch === "HEAD" ? await resolveDefaultBranch(owner, repo, token, signal) : branch;
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(resolvedBranch)}?recursive=1`;
  const res = await githubFetch(url, githubHeaders(token, { Accept: "application/vnd.github.v3+json" }), signal);
  throwGitHubHttp(res, "Repository or branch not found.");
  const data = (await res.json()) as { tree: GitHubTreeItem[]; truncated: boolean };
  if (data.truncated) {
    throw new Error("GitHub repository tree is too large to analyze safely.");
  }
  return data.tree.filter((item) => !item.path.includes("..") && !item.path.startsWith("/")).slice(0, 2000);
}

export async function fetchGitHubFile(owner: string, repo: string, branch: string, path: string, token?: string, signal?: AbortSignal): Promise<string> {
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) {
    throw new Error("Unsafe GitHub file path.");
  }

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const resolvedBranch = branch === "HEAD" ? "HEAD" : branch;

  const url = token
    ? `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(resolvedBranch)}`
    : `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(resolvedBranch)}/${encodedPath}`;

  const headers = token ? githubHeaders(token, { Accept: "application/vnd.github.raw" }) : {};
  const res = await githubFetch(url, headers, signal);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.statusText}`);
  return res.text();
}

export function isLikelyText(path: string): boolean {
  const binaries = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|mp4|webm|pdf|zip|tar|gz|bin|exe|dll|so|dylib)$/i;
  return !binaries.test(path);
}
