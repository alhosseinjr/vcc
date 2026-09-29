"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { loadHistory, type SavedScan } from "@/lib/storage";
import { useTheme } from "@/components/common/ThemeProvider";
import { Button } from "@/components/ui/Button";
import type { Annotation } from "@/lib/annotations";

// Lazy load visualization components
const Diagram = dynamic(() => import("@/components/architecture/Diagram"), { ssr: false, loading: () => <div className="p-8 text-center animate-pulse">Loading diagram engine...</div> });
const Heatmap = dynamic(() => import("@/components/architecture/Heatmap"), { ssr: false, loading: () => <div className="p-8 text-center animate-pulse">Loading heatmap...</div> });
const Treemap = dynamic(() => import("@/components/architecture/Treemap"), { ssr: false, loading: () => <div className="p-8 text-center animate-pulse">Loading treemap...</div> });

export default function ArchitecturePage({ params }: { params: { scanId: string } }) {
  const router = useRouter();
  const { theme } = useTheme();
  const [scan, setScan] = useState<SavedScan | null>(null);
  const [files, setFiles] = useState<{ name: string; content: string }[] | null>(null);
  const [tab, setTab] = useState<"diagram" | "heatmap" | "treemap">("diagram");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Annotations state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [noteText, setNoteText] = useState("");
  const [authorName, setAuthorName] = useState("");

  useEffect(() => {
    import("@/lib/annotations").then(({ loadAnnotations }) => {
      setAnnotations(loadAnnotations(params.scanId));
    });
  }, [params.scanId]);

  const handleAddNote = async () => {
    if (!selectedFile || !noteText.trim()) return;
    const author = authorName.trim() || "Anonymous";
    
    const newNote: Annotation = {
      id: crypto.randomUUID(),
      targetId: selectedFile,
      text: noteText.trim(),
      author,
      timestamp: Date.now()
    };
    
    const updated = [...annotations, newNote];
    setAnnotations(updated);
    setNoteText("");
    
    const { saveAnnotations } = await import("@/lib/annotations");
    saveAnnotations(params.scanId, updated);
  };

  const handleDeleteNote = async (noteId: string) => {
    const updated = annotations.filter(a => a.id !== noteId);
    setAnnotations(updated);
    const { saveAnnotations } = await import("@/lib/annotations");
    saveAnnotations(params.scanId, updated);
  };

  const handleShare = async (includeIssues: boolean) => {
    const { encodeShareHash } = await import("@/lib/annotations");
    let minimalIssues = undefined;
    if (includeIssues && scan) {
      minimalIssues = scan.issues.map(i => ({ file: i.file, title: i.title, severity: i.severity }));
    }
    const hash = encodeShareHash(tab, scan?.githubUrl, annotations, minimalIssues);
    const url = `${window.location.origin}/share#${hash}`;
    navigator.clipboard.writeText(url);
    alert("Share link copied to clipboard!");
  };

  useEffect(() => {
    const s = loadHistory().find((x) => x.id === params.scanId);
    if (!s) {
      router.replace("/");
      return;
    }
    setScan(s);
    
    // Load files from session storage
    try {
      const storedFiles = sessionStorage.getItem(`vcc:files:${params.scanId}`);
      if (storedFiles) setFiles(JSON.parse(storedFiles));
      else setFiles([]);
    } catch {
      setFiles([]);
    }
  }, [params.scanId, router]);

  if (!scan || !files) return <div className="p-8 text-center animate-pulse">Loading architecture data...</div>;

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const selectedFileIssues = selectedFile ? scan.issues.filter(i => i.file === selectedFile) : [];

  return (
    <div className="flex min-h-screen flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Architecture View</h1>
          <p className="text-sm text-muted">
            {scan.githubUrl ? `Scanned from ${scan.githubUrl}` : "Scanned from local files"} · {scan.fileCount} files
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Button variant={tab === "diagram" ? "primary" : "outline"} onClick={() => setTab("diagram")}>Diagram</Button>
          <Button variant={tab === "heatmap" ? "primary" : "outline"} onClick={() => setTab("heatmap")}>Heatmap</Button>
          <Button variant={tab === "treemap" ? "primary" : "outline"} onClick={() => setTab("treemap")}>Treemap</Button>
          <Button variant="ghost" onClick={() => router.push(`/scan/${scan.id}`)}>Back to issues</Button>
        </div>
      </header>

      {/* Mobile warning */}
      <div className="md:hidden rounded-lg bg-yellow-500/10 p-4 text-sm text-yellow-600 border border-yellow-500/20">
        <p className="font-semibold">Desktop recommended</p>
        <p>Interactive visualizations are best viewed on larger screens. Pan and zoom capabilities might be limited on mobile.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)] min-h-[600px]">
        {/* Main Vis Area */}
        <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          {tab === "diagram" && (
             <Diagram 
               files={files} 
               issues={scan.issues} 
               skippedFiles={scan.skippedFileNames || []} 
               onFileClick={(path) => setSelectedFile(path)}
               dark={isDark} 
             />
          )}
          {tab === "heatmap" && (
             <Heatmap 
               files={files.map(f => f.name)} 
               issues={scan.issues} 
               onFileClick={(path) => setSelectedFile(path)}
               dark={isDark} 
             />
          )}
          {tab === "treemap" && (
             <Treemap 
               files={files} 
               issues={scan.issues} 
               onFileClick={(path) => setSelectedFile(path)}
               dark={isDark} 
             />
          )}
        </div>

        {/* Details Sidebar */}
        <div className="w-full md:w-80 rounded-xl border border-border bg-card p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          <h2 className="text-lg font-semibold border-b border-border pb-2">File Details</h2>
          {!selectedFile ? (
            <p className="text-sm text-muted text-center py-8">Click a node or cell to view file issues.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium break-all">{selectedFile}</p>
              
              <div className="flex gap-2 flex-wrap">
                <span className="rounded bg-bg px-2 py-1 text-xs">{selectedFileIssues.length} issues</span>
                {scan.skippedFileNames?.includes(selectedFile) && <span className="rounded bg-yellow-500/20 px-2 py-1 text-xs text-yellow-700">Skipped/Minified</span>}
              </div>

              {selectedFileIssues.length > 0 ? (
                <ul className="space-y-2 mt-2">
                  {selectedFileIssues.map(i => (
                    <li key={i.id} className="rounded-lg border border-border p-2 text-xs">
                       <span className={`inline-block w-2 h-2 rounded-full mr-1 ${i.severity === 'critical' ? 'bg-red-500' : i.severity === 'high' ? 'bg-orange-500' : i.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`}></span>
                       <span className="font-semibold">{i.title}</span> (Line {i.line})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-green-600 mt-4">No issues found in this file.</p>
              )}

              <hr className="my-4 border-border" />
              
              <h3 className="text-sm font-semibold">Notes & Annotations</h3>
              {annotations.filter(a => a.targetId === selectedFile).length === 0 ? (
                <p className="text-xs text-muted">No notes on this file yet.</p>
              ) : (
                <ul className="space-y-3">
                  {annotations.filter(a => a.targetId === selectedFile).map(a => (
                    <li key={a.id} className="bg-bg rounded p-3 text-sm relative group">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-xs">{a.author}</span>
                        <span className="text-[10px] text-muted">{new Date(a.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{a.text}</p>
                      <button 
                        onClick={() => handleDeleteNote(a.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-1 rounded"
                        title="Delete note"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              
              <div className="mt-4 flex flex-col gap-2">
                <input 
                  type="text" 
                  placeholder="Your Name" 
                  value={authorName} 
                  onChange={e => setAuthorName(e.target.value)} 
                  className="rounded border border-border bg-bg px-2 py-1 text-xs focus:outline-none focus:border-accent"
                />
                <textarea 
                  placeholder="Add a note..." 
                  value={noteText} 
                  onChange={e => setNoteText(e.target.value)} 
                  className="rounded border border-border bg-bg p-2 text-sm focus:outline-none focus:border-accent min-h-[80px]"
                />
                <Button onClick={handleAddNote} disabled={!noteText.trim()}>Post Note</Button>
              </div>
            </div>
          )}
          
          <div className="mt-auto pt-4 border-t border-border flex flex-col gap-2">
             <Button variant="outline" onClick={() => handleShare(false)}>Share View (Link Only)</Button>
             <Button variant="outline" onClick={() => handleShare(true)}>Share View (Include Issues)</Button>
             <Button variant="ghost" onClick={async () => {
               const { exportAnnotationsMarkdown } = await import("@/lib/annotations");
               const md = exportAnnotationsMarkdown(params.scanId, annotations);
               const blob = new Blob([md], { type: "text/markdown" });
               const url = URL.createObjectURL(blob);
               const a = document.createElement("a");
               a.href = url;
               a.download = `annotations-${params.scanId}.md`;
               a.click();
             }}>Export Notes (.md)</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
