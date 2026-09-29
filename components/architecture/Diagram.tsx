"use client";
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import type { Issue } from "@/lib/types";
import { extractDependencies, findCircularDependencies, type DependencyGraph } from "@/lib/analyzers/imports";
import { SEVERITY_ORDER } from "@/lib/types";
import { Button } from "../ui/Button";

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  securityLevel: "loose",
  themeVariables: {
    fontFamily: "Inter, sans-serif",
  }
});

interface DiagramProps {
  files: { name: string; content: string }[];
  issues: Issue[];
  skippedFiles: string[];
  onFileClick: (path: string) => void;
  dark: boolean;
}

export default function Diagram({ files, issues, skippedFiles, onFileClick, dark }: DiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [cycles, setCycles] = useState<[string, string][]>([]);
  const [svgStr, setSvgStr] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate graph structure
    const g = extractDependencies(files);
    setGraph(g);
    setCycles(findCircularDependencies(g.nodes, g.edges));
  }, [files]);

  useEffect(() => {
    if (!graph || !containerRef.current) return;
    setLoading(true);

    const render = async () => {
      mermaid.initialize({ theme: dark ? "dark" : "default" });

      // Build mermaid source
      let source = "flowchart LR\n";
      
      // Nodes
      const severityColor = (sev: string) => {
        if (sev === "critical") return dark ? "#ff4a4a" : "#ffcccc";
        if (sev === "high") return dark ? "#ff983e" : "#ffe5cc";
        if (sev === "medium") return dark ? "#ffdb3e" : "#fff7cc";
        if (sev === "low") return dark ? "#3e9eff" : "#cce5ff";
        return dark ? "#333333" : "#f0f0f0";
      };

      // Folder clustering if nodes > 50
      const useClustering = graph.nodes.length > 50;
      const clusters = new Map<string, string[]>();

      if (useClustering) {
        for (const node of graph.nodes) {
          const folder = node.includes("/") ? node.substring(0, node.lastIndexOf("/")) : "/";
          if (!clusters.has(folder)) clusters.set(folder, []);
          clusters.get(folder)!.push(node);
        }

        for (const [folder, folderNodes] of clusters.entries()) {
          source += `  subgraph "${folder}"\n`;
          for (const node of folderNodes) {
            const cleanNode = node.replace(/[^a-zA-Z0-9]/g, "_");
            source += `    ${cleanNode}["${node.split('/').pop()}"]\n`;
          }
          source += `  end\n`;
        }
      } else {
        for (const node of graph.nodes) {
          const cleanNode = node.replace(/[^a-zA-Z0-9]/g, "_");
          source += `  ${cleanNode}["${node}"]\n`;
        }
      }

      // Styles
      for (const node of graph.nodes) {
        const cleanNode = node.replace(/[^a-zA-Z0-9]/g, "_");
        if (skippedFiles.includes(node)) {
          source += `  style ${cleanNode} fill:${dark ? "#333" : "#eee"},stroke:#999,color:${dark ? "#999" : "#666"}\n`;
        } else {
          const fileIssues = issues.filter(i => i.file === node);
          if (fileIssues.length > 0) {
            const worst = SEVERITY_ORDER.find(s => fileIssues.some(i => i.severity === s)) || "low";
            source += `  style ${cleanNode} fill:${severityColor(worst)},stroke:#333\n`;
          } else {
            source += `  style ${cleanNode} fill:${dark ? "#1a4d2e" : "#dcfce7"},stroke:#333\n`; // green for zero issues
          }
        }
        source += `  click ${cleanNode} call clickHandler()\n`;
      }

      // Edges
      for (const edge of graph.edges) {
        const cSrc = edge.source.replace(/[^a-zA-Z0-9]/g, "_");
        const cTgt = edge.target.replace(/[^a-zA-Z0-9]/g, "_");
        const isCycle = cycles.some(c => c[0] === edge.source && c[1] === edge.target);
        
        if (isCycle) {
          source += `  ${cSrc} -.-x|Cycle| ${cTgt}\n`;
          source += `  linkStyle ${graph.edges.indexOf(edge)} stroke:red,stroke-width:2px,stroke-dasharray:5 5\n`;
        } else {
          source += `  ${cSrc} --> ${cTgt}\n`;
        }
      }

      try {
        const { svg } = await mermaid.render(`mermaid-${Date.now()}`, source);
        setSvgStr(svg);
        
        // Attach click handlers
        (window as any).clickHandler = (nodeId: string) => {
           // We need to map cleanNode back to real node path. 
           // In actual mermaid click handlers, it passes the nodeId (cleanNode)
           const realNode = graph.nodes.find(n => n.replace(/[^a-zA-Z0-9]/g, "_") === nodeId);
           if (realNode) onFileClick(realNode);
        };
      } catch (e) {
        console.error("Mermaid error", e);
      }
      setLoading(false);
    };

    render();
  }, [graph, dark, issues, skippedFiles, cycles, onFileClick]);

  return (
    <div className="flex flex-col gap-4">
      {cycles.length > 0 && (
        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-500 border border-red-500/20">
          <p className="font-semibold">⚠️ Circular dependencies detected:</p>
          <ul className="list-inside list-disc mt-1">
            {cycles.map((c, i) => <li key={i}>{c[0]} ↔ {c[1]}</li>)}
          </ul>
        </div>
      )}
      
      <div className="relative overflow-auto rounded-xl border border-border bg-card p-4 min-h-[500px]">
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-card/80">Rendering diagram...</div>}
        <div 
          ref={containerRef}
          className="mermaid-container w-full min-w-max flex justify-center" 
          dangerouslySetInnerHTML={{ __html: svgStr }} 
          onClick={(e) => {
             // SVG click delegation for Mermaid nodes
             let target = e.target as HTMLElement;
             while (target && target.tagName !== 'svg') {
               if (target.classList && target.classList.contains('node')) {
                 const id = target.id.replace(/^flowchart-[^a-zA-Z0-9]*-/, ''); // rough extract
                 const realNode = graph?.nodes.find(n => n.replace(/[^a-zA-Z0-9]/g, "_") === id);
                 if (realNode) onFileClick(realNode);
                 break;
               }
               target = target.parentElement as HTMLElement;
             }
          }}
        />
      </div>
    </div>
  );
}
