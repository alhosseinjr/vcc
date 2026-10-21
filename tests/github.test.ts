import { describe, expect, it, vi } from "vitest";
import { parseGitHubUrl, isLikelyText, resolveBranchAndPath } from "../lib/github";

describe("parseGitHubUrl", () => {
  it("parses base repo url", () => {
    const res = parseGitHubUrl("https://github.com/facebook/react");
    expect(res).toEqual({ owner: "facebook", repo: "react", branch: "HEAD", path: "" });
  });
  
  it("parses url without protocol", () => {
    const res = parseGitHubUrl("github.com/facebook/react");
    expect(res).toEqual({ owner: "facebook", repo: "react", branch: "HEAD", path: "" });
  });

  it("parses branch and path", () => {
    const res = parseGitHubUrl("https://github.com/facebook/react/tree/main/packages/react");
    expect(res).toEqual({ owner: "facebook", repo: "react", branch: "main", path: "packages/react" });
  });

  it("strips .git, www, and blob file paths", () => {
    expect(parseGitHubUrl("https://www.github.com/facebook/react.git")).toEqual({
      owner: "facebook", repo: "react", branch: "HEAD", path: "",
    });
    expect(parseGitHubUrl("https://github.com/facebook/react/blob/main/packages/react/index.js")).toEqual({
      owner: "facebook", repo: "react", branch: "main", path: "packages/react/index.js",
    });
  });

  it("returns null for non-github urls", () => {
    expect(parseGitHubUrl("https://gitlab.com/facebook/react")).toBeNull();
  });
});

describe("resolveBranchAndPath", () => {
  const refUrl = (repo: string, ref: string) =>
    `https://api.github.com/repos/acme/${repo}/git/ref/heads/${ref}`;

  function mockFetch(responses: Record<string, number>) {
    const calls: string[] = [];
    const fetchMock = ((url: string) => {
      calls.push(url);
      const status = responses[url] ?? 404;
      return Promise.resolve({ ok: status < 400, status, headers: new Headers(), json: () => Promise.resolve({}) } as unknown as Response);
    }) as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);
    return calls;
  }

  it("resolves a multi-segment branch (branch names can contain '/')", async () => {
    mockFetch({ [refUrl("app", "feature")]: 404, [refUrl("app", "feature/auth")]: 200 });
    const res = await resolveBranchAndPath("acme", "app", ["feature", "auth"]);
    expect(res).toEqual({ branch: "feature/auth", path: "" });
  });

  it("splits branch and path when only the single-segment branch exists", async () => {
    mockFetch({ [refUrl("app", "main")]: 200 });
    const res = await resolveBranchAndPath("acme", "app", ["main", "src", "lib"]);
    expect(res).toEqual({ branch: "main", path: "src/lib" });
  });

  it("returns null when no prefix is an existing branch", async () => {
    mockFetch({});
    const res = await resolveBranchAndPath("acme", "app", ["main", "src"]);
    expect(res).toBeNull();
  });

  it("propagates rate-limit errors instead of treating them as 'branch missing'", async () => {
    mockFetch({ [refUrl("app", "main")]: 403 });
    await expect(resolveBranchAndPath("acme", "app", ["main", "src"])).rejects.toThrow(/Rate limit/);
  });
});

describe("isLikelyText", () => {
  it("returns true for code files", () => {
    expect(isLikelyText("app.js")).toBe(true);
    expect(isLikelyText("package.json")).toBe(true);
    expect(isLikelyText("README.md")).toBe(true);
  });
  it("returns false for binary files", () => {
    expect(isLikelyText("image.png")).toBe(false);
    expect(isLikelyText("video.mp4")).toBe(false);
    expect(isLikelyText("archive.zip")).toBe(false);
  });
});
