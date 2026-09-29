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
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1];
    let branch = "HEAD";
    let path = "";
    if (parts.length >= 4 && parts[2] === "tree") {
      branch = parts[3];
      path = parts.slice(4).join("/");
    }
    return { owner, repo, branch, path };
  } catch {
    return null;
  }
}

export async function fetchGitHubTree(owner: string, repo: string, branch: string, token?: string, signal?: AbortSignal): Promise<GitHubTreeItem[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `token ${token}`;

  const res = await fetch(url, { headers, signal });
  if (res.status === 404) throw new Error("Repository or branch not found. If it is private, provide a GitHub token in settings.");
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    const msg = reset ? `Rate limit exceeded. Resets at ${new Date(Number(reset) * 1000).toLocaleTimeString()}. Add a GitHub token to increase limits.` : "Rate limit exceeded. Please add a GitHub token in settings.";
    throw new Error(msg);
  }
  if (!res.ok) throw new Error(`GitHub API error: ${res.statusText}`);
  
  const data = await res.json() as { tree: GitHubTreeItem[], truncated: boolean };
  if (data.truncated) console.warn("GitHub tree is truncated");
  return data.tree;
}

export async function fetchGitHubFile(owner: string, repo: string, branch: string, path: string, token?: string, signal?: AbortSignal): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `token ${token}`;

  const res = await fetch(url, { headers, signal });
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.statusText}`);
  return res.text();
}

/** Determines if a file is likely text based on its extension to avoid fetching heavy binaries */
export function isLikelyText(path: string): boolean {
  const binaries = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|mp4|webm|pdf|zip|tar|gz|bin|exe|dll|so|dylib)$/i;
  return !binaries.test(path);
}
