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

const DISALLOWED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254",
  "10.0.0.0",
  "192.168.0.0",
  "172.16.0.0",
];

const isPrivateHost = (host: string): boolean => {
  const normalized = host.toLowerCase();
  if (normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1") return true;
  if (normalized.startsWith("127.")) return true;
  if (normalized.startsWith("10.")) return true;
  if (normalized.startsWith("192.168.")) return true;
  if (normalized.startsWith("172.")) {
    const octet = Number(normalized.split(".")[1]);
    return octet >= 16 && octet <= 31;
  }
  if (normalized.startsWith("169.254.")) return true;
  return false;
};

export function parseGitHubUrl(url: string): GitHubParseResult | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    if (parsed.hash) return null;

    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "github.com") return null;
    if (isPrivateHost(host)) return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    let branch = "HEAD";
    let path = "";

    if (parts.length >= 4 && (parts[2] === "tree" || parts[2] === "blob")) {
      branch = parts[3];
      path = parts.slice(4).join("/");
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
  const data = await res.json() as { default_branch: string };
  return data.default_branch;
}

export async function fetchGitHubTree(owner: string, repo: string, branch: string, token?: string, signal?: AbortSignal): Promise<GitHubTreeItem[]> {
  const resolvedBranch = branch === "HEAD" ? await resolveDefaultBranch(owner, repo, token, signal) : branch;
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(resolvedBranch)}?recursive=1`;
  const res = await githubFetch(url, githubHeaders(token, { Accept: "application/vnd.github.v3+json" }), signal);
  throwGitHubHttp(res, "Repository or branch not found.");
  const data = await res.json() as { tree: GitHubTreeItem[]; truncated: boolean };
  if (data.truncated) {
    throw new Error("GitHub repository tree is too large to analyze safely.");
  }
  return data.tree.slice(0, 2000);
}

export async function fetchGitHubFile(owner: string, repo: string, branch: string, path: string, token?: string, signal?: AbortSignal): Promise<string> {
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
