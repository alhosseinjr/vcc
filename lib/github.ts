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

export function parseGitHubUrl(url: string): GitHubParseResult | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
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
  try {
    return await fetch(url, { headers, signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new Error("Couldn't reach GitHub. Check your connection, or add a token in Settings if the repo is private.");
  }
}

function throwGitHubHttp(res: Response, notFound: string): void {
  if (res.status === 404) throw new Error(notFound);
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    const msg = reset
      ? `Rate limit exceeded. Resets at ${new Date(Number(reset) * 1000).toLocaleTimeString()}. Add a GitHub token to increase limits.`
      : "Rate limit exceeded. Please add a GitHub token in Settings.";
    throw new Error(msg);
  }
  if (!res.ok) throw new Error(`GitHub API error: ${res.statusText}`);
}

/** Resolve the default branch name for a repo (needed because the Trees API doesn't accept 'HEAD'). */
export async function resolveDefaultBranch(owner: string, repo: string, token?: string, signal?: AbortSignal): Promise<string> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const res = await githubFetch(url, githubHeaders(token, { Accept: "application/vnd.github.v3+json" }), signal);
  throwGitHubHttp(res, "Repository not found. If it is private, provide a GitHub token in Settings.");
  const data = await res.json() as { default_branch: string };
  return data.default_branch;
}

export async function fetchGitHubTree(owner: string, repo: string, branch: string, token?: string, signal?: AbortSignal): Promise<GitHubTreeItem[]> {
  // The Trees API requires an actual ref; "HEAD" won't work.
  const resolvedBranch = branch === "HEAD" ? await resolveDefaultBranch(owner, repo, token, signal) : branch;
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${resolvedBranch.split("/").map(encodeURIComponent).join("/")}?recursive=1`;
  const res = await githubFetch(url, githubHeaders(token, { Accept: "application/vnd.github.v3+json" }), signal);
  throwGitHubHttp(res, "Repository or branch not found. If it is private, provide a GitHub token in Settings.");

  const data = await res.json() as { tree: GitHubTreeItem[], truncated: boolean };
  if (data.truncated) console.warn("GitHub tree is truncated");
  return data.tree;
}

export async function fetchGitHubFile(owner: string, repo: string, branch: string, path: string, token?: string, signal?: AbortSignal): Promise<string> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const resolvedBranch = branch === "HEAD" ? "HEAD" : branch;
  // Auth on raw.githubusercontent.com triggers a CORS preflight that GitHub does not allow.
  // Use the Contents API (raw) when a token is present so private files still load.
  const url = token
    ? `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(resolvedBranch)}`
    : `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${resolvedBranch.split("/").map(encodeURIComponent).join("/")}/${encodedPath}`;
  const headers = token
    ? githubHeaders(token, { Accept: "application/vnd.github.raw" })
    : {};
  const res = await githubFetch(url, headers, signal);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.statusText}`);
  return res.text();
}

/** Determines if a file is likely text based on its extension to avoid fetching heavy binaries */
export function isLikelyText(path: string): boolean {
  const binaries = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|mp4|webm|pdf|zip|tar|gz|bin|exe|dll|so|dylib)$/i;
  return !binaries.test(path);
}
