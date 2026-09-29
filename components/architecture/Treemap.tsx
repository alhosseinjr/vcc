"use client";
import { useMemo, useState } from "react";
import * as d3 from "d3-hierarchy";
import type { Issue } from "@/lib/types";

interface TreemapProps {
  files: { name: string; content: string }[];
  issues: Issue[];
  onFileClick: (path: string) => void;
  dark: boolean;
}

interface FileNode {
  name: string;
  path: string;
  value: number; // LOC
  complexity: number;
  issueCount: number;
}

interface DirNode {
  name: string;
  path: string;
  children: (DirNode | FileNode)[];
}

export default function Treemap({ files, issues, onFileClick, dark }: TreemapProps) {
  const [colorMode, setColorMode] = useState<"complexity" | "issues" | "loc">("complexity");

  const data = useMemo(() => {
    // Reconstruct max complexity from issues (e.g. "Function is very complex (score 15)")
    const complexities = new Map<string, number>();
    const issueCounts = new Map<string, number>();

    for (const i of issues) {
      issueCounts.set(i.file, (issueCounts.get(i.file) || 0) + 1);
      
      const m = i.title.match(/\(score (\d+)\)/);
      if (m) {
        const score = parseInt(m[1], 10);
        const max = complexities.get(i.file) || 0;
        if (score > max) complexities.set(i.file, score);
      }
    }

    const root: DirNode = { name: "root", path: "/", children: [] };
    
    // Build tree
    for (const f of files) {
      const parts = f.name.split("/");
      let current = root;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current.children.push({
            name: part,
            path: f.name,
            value: (f.content.match(/\n/g) || []).length + 1, // LOC
            complexity: complexities.get(f.name) || 1, // default score 1
            issueCount: issueCounts.get(f.name) || 0
          });
        } else {
          let next = current.children.find(c => c.name === part && "children" in c) as DirNode;
          if (!next) {
            next = { name: part, path: parts.slice(0, i + 1).join("/"), children: [] };
            current.children.push(next);
          }
          current = next;
        }
      }
    }

    // Compute Treemap layout
    const hierarchy = d3.hierarchy<any>(root)
      .sum((d: any) => d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3.treemap<any>()
      .size([1000, 600]) // Will scale via viewBox
      .paddingTop(24)
      .paddingRight(2)
      .paddingInner(2)
      .paddingOuter(2);

    treemap(hierarchy);

    const maxComp = Math.max(1, ...hierarchy.leaves().map(l => l.data.complexity));
    const maxIss = Math.max(1, ...hierarchy.leaves().map(l => l.data.issueCount));
    const maxLoc = Math.max(1, ...hierarchy.leaves().map(l => l.data.value));

    return { hierarchy, maxComp, maxIss, maxLoc };
  }, [files, issues]);

  const getColor = (node: d3.HierarchyRectangularNode<any>) => {
    if (!node.children) {
      if (colorMode === "complexity") {
        const intensity = Math.min(1, Math.max(0, (node.data.complexity - 1) / 20)); // cap visually at score 21
        return dark ? `rgb(${Math.floor(255 * intensity)}, ${Math.floor(200 * (1 - intensity))}, 50)`
                    : `rgb(${Math.floor(255)}, ${Math.floor(255 - 200 * intensity)}, ${Math.floor(200 * (1 - intensity))})`;
      } else if (colorMode === "issues") {
        const intensity = Math.min(1, Math.max(0, node.data.issueCount / (data.maxIss || 1)));
        return dark ? `rgb(${Math.floor(200 + 55 * intensity)}, 50, 50)`
                    : `rgb(255, ${Math.floor(200 * (1 - intensity))}, ${Math.floor(200 * (1 - intensity))})`;
      } else {
        const intensity = Math.min(1, Math.max(0, node.data.value / (data.maxLoc || 1)));
        return dark ? `rgb(50, ${Math.floor(100 + 155 * intensity)}, 200)`
                    : `rgb(${Math.floor(200 * (1 - intensity))}, 100, 255)`;
      }
    }
    return dark ? "#222" : "#f0f0f0"; // folder background
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-border bg-card/50">
        <h3 className="text-sm font-semibold">Code Complexity (LOC)</h3>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-muted">Color by:</label>
          <select 
            className="rounded border border-border bg-bg p-1 px-2"
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value as any)}
          >
            <option value="complexity">Max Complexity</option>
            <option value="issues">Issue Count</option>
            <option value="loc">Lines of Code</option>
          </select>
        </div>
      </div>
      
      <div className="flex-1 p-4 relative overflow-hidden">
        {data.hierarchy.leaves().length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted">No valid files to display</div>
        ) : (
          <svg viewBox="0 0 1000 600" className="w-full h-full preserve-3d" style={{ minHeight: "400px" }}>
            {data.hierarchy.descendants().map((n, i) => {
              if (n.depth === 0) return null;
              const node = n as d3.HierarchyRectangularNode<any>;
              
              const isLeaf = !node.children;
              const w = Math.max(0, node.x1 - node.x0);
              const h = Math.max(0, node.y1 - node.y0);
              
              if (w < 1 || h < 1) return null;
              
              return (
                <g key={i} transform={`translate(${node.x0},${node.y0})`}>
                  <rect
                    width={w}
                    height={h}
                    fill={getColor(node)}
                    stroke={dark ? "#111" : "#fff"}
                    strokeWidth={isLeaf ? 1 : 2}
                    className={`transition-colors ${isLeaf ? "cursor-pointer hover:opacity-80" : ""}`}
                    onClick={() => isLeaf && onFileClick(node.data.path)}
                  >
                    {isLeaf && (
                      <title>{`${node.data.path}\nLOC: ${node.data.value}\nMax Complexity: ${node.data.complexity}\nIssues: ${node.data.issueCount}`}</title>
                    )}
                  </rect>
                  
                  {/* Folder Label */}
                  {!isLeaf && h > 20 && w > 40 && (
                    <text x={4} y={16} fill={dark ? "#aaa" : "#555"} fontSize="12" fontWeight="bold" className="pointer-events-none font-mono">
                      {node.data.name}
                    </text>
                  )}
                  
                  {/* File Label */}
                  {isLeaf && w > 60 && h > 24 && (
                    <text x={4} y={16} fill={dark ? (colorMode === 'loc' ? "#fff" : "#111") : "#111"} fontSize="10" className="pointer-events-none truncate" style={{ maxWidth: w - 8 }}>
                      {node.data.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
