"use client";
import { useState, useRef } from "react";
import { parseGitHubUrl, fetchGitHubTree, fetchGitHubFile, isLikelyText, resolveDefaultBranch } from "@/lib/github";
import { Button } from "../ui/Button";
import { detectLanguage } from "@/lib/utils";
import { useScanInput, type InputFile } from "@/store/scan-store";

export function GitHubScanner({ onScan, busy }: { onScan: (url?: string) => void; busy: boolean }) {
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const addFiles = useScanInput((s) => s.addFiles);
  const clear = useScanInput((s) => s.clear);

  async function handleFetch() {
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      setError("Invalid GitHub URL. Must be github.com/{owner}/{repo}...");
      return;
    }
    setFetching(true);
    setError(null);
    setProgress("Fetching repository tree...");
    
    const ctrl = new AbortController();
    abort.current = ctrl;

    try {
      let token = ""; try { token = localStorage.getItem("vcc:githubToken") ?? ""; } catch {}
      const branch = parsed.branch === "HEAD"
        ? await resolveDefaultBranch(parsed.owner, parsed.repo, token, ctrl.signal)
        : parsed.branch;
      const tree = await fetchGitHubTree(parsed.owner, parsed.repo, branch, token, ctrl.signal);

      let filesToFetch = tree.filter((t) => t.type === "blob" && isLikelyText(t.path));
      if (parsed.path) {
        filesToFetch = filesToFetch.filter((f) => f.path === parsed.path || f.path.startsWith(parsed.path + "/"));
      }

      if (filesToFetch.length > 300) {
        throw new Error(`Repository is too large (${filesToFetch.length} files). Please specify a sub-folder in the URL to scan <300 files.`);
      }
      
      const fetchedFiles = [];
      let i = 0;
      
      // Fetch concurrently in chunks of 10 to avoid overwhelming the browser/API, but fast enough
      for (let c = 0; c < filesToFetch.length; c += 10) {
        const chunk = filesToFetch.slice(c, c + 10);
        const results = await Promise.all(
          chunk.map(async (f) => {
            if (f.size && f.size > 1024 * 1024) return null; // skip >1MB
            try {
              const content = await fetchGitHubFile(parsed.owner, parsed.repo, branch, f.path, token, ctrl.signal);
              i++;
              setProgress(`Fetching file ${i}/${filesToFetch.length}...`);
              return { name: f.path, content };
            } catch {
              return null;
            }
          })
        );
        fetchedFiles.push(...results.filter((x): x is {name:string, content:string} => x !== null));
      }
      
      const typedFiles: InputFile[] = fetchedFiles.map(f => ({
        name: f.name,
        content: f.content,
        size: f.content.length,
        language: detectLanguage(f.name)
      }));
      clear();
      addFiles(typedFiles);
      onScan(url);
    } catch (e: any) {
      if (e.name === "AbortError") setError("Fetch cancelled.");
      else setError(e.message ?? "An error occurred fetching the repository.");
    } finally {
      setFetching(false);
      setProgress("");
    }
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center transition-colors">
      <h2 className="mb-2 text-xl font-semibold">Scan from GitHub URL</h2>
      <p className="mb-6 text-sm text-muted">Paste a link to any public repository or folder.</p>
      
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <input 
          type="url" 
          value={url} 
          onChange={(e) => setUrl(e.target.value)} 
          placeholder="https://github.com/owner/repo" 
          className="w-full flex-1 rounded-lg border border-border bg-bg px-4 py-2 text-fg focus:border-accent focus:outline-none"
          disabled={fetching || busy}
        />
        {fetching ? (
          <Button variant="outline" onClick={() => abort.current?.abort()}>Cancel</Button>
        ) : (
          <Button onClick={handleFetch} disabled={!url || busy}>Fetch</Button>
        )}
      </div>

      {progress && <p className="mt-4 text-sm text-accent animate-pulse">{progress}</p>}
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
    </div>
  );
}
