import { describe, expect, it } from "vitest";
import { parseGitHubUrl, isLikelyText } from "../lib/github";

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
