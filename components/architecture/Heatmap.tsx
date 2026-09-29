"use client";
import { useMemo } from "react";
import type { Issue } from "@/lib/types";

interface HeatmapProps {
  files: string[];
  issues: Issue[];
  onFileClick: (path: string) => void;
  dark: boolean;
}

export default function Heatmap({ files, issues, onFileClick, dark }: HeatmapProps) {
  const data = useMemo(() => {
    const map = new Map<string, { path: string; score: number; crit: number; high: number; med: number; low: number }>();
    
    // Initialize files
    for (const f of files) {
      map.set(f, { path: f, score: 0, crit: 0, high: 0, med: 0, low: 0 });
    }

    // Accumulate issues
    for (const i of issues) {
      const entry = map.get(i.file);
      if (entry) {
        if (i.severity === "critical") { entry.crit++; entry.score += 10; }
        if (i.severity === "high") { entry.high++; entry.score += 5; }
        if (i.severity === "medium") { entry.med++; entry.score += 2; }
        if (i.severity === "low") { entry.low++; entry.score += 1; }
      }
    }

    const arr = Array.from(map.values());
    
    // Group by folder
    const folders = new Map<string, typeof arr>();
    for (const item of arr) {
      const folder = item.path.includes("/") ? item.path.substring(0, item.path.lastIndexOf("/")) : "/";
      if (!folders.has(folder)) folders.set(folder, []);
      folders.get(folder)!.push(item);
    }
    
    // Sort folders alphabetically, files by score descending
    const sortedFolders = Array.from(folders.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [, items] of sortedFolders) {
      items.sort((a, b) => b.score - a.score);
    }
    
    const maxScore = Math.max(1, ...arr.map(a => a.score));
    
    // Top 10 global hotspots
    const top10 = [...arr].sort((a, b) => b.score - a.score).slice(0, 10).filter(x => x.score > 0);
    
    return { folders: sortedFolders, maxScore, top10 };
  }, [files, issues]);

  const getHeatColor = (score: number, maxScore: number) => {
    if (score === 0) return dark ? "#2a2a2a" : "#f5f5f5";
    
    // Colorblind-safe palette (yellow to red gradient based on intensity)
    const intensity = Math.max(0.1, Math.min(1, score / maxScore));
    
    if (dark) {
      // Dark mode: dim yellow to bright red
      const r = Math.floor(200 + (55 * intensity));
      const g = Math.floor(200 * (1 - intensity));
      const b = 50;
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Light mode: pale yellow to deep red
      const r = Math.floor(255);
      const g = Math.floor(255 - (200 * intensity));
      const b = Math.floor(200 * (1 - intensity));
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-col gap-8">
          {data.folders.map(([folder, items]) => (
            <div key={folder}>
              <h3 className="text-sm font-semibold text-muted mb-2 font-mono break-all">{folder}</h3>
              <div className="flex flex-wrap gap-1">
                {items.map(item => (
                  <button
                    key={item.path}
                    onClick={() => onFileClick(item.path)}
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-[2px] transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent"
                    style={{ backgroundColor: getHeatColor(item.score, data.maxScore) }}
                    title={`${item.path.split('/').pop()}\nScore: ${item.score}\n(Crit: ${item.crit}, High: ${item.high}, Med: ${item.med}, Low: ${item.low})`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="w-full md:w-64 border-l border-border bg-card/50 p-4 shrink-0 overflow-y-auto">
        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">Top Hotspots</h3>
        {data.top10.length === 0 ? (
          <p className="text-xs text-muted">No issues found to generate hotspots.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.top10.map(item => (
              <li key={item.path}>
                <button 
                  onClick={() => onFileClick(item.path)}
                  className="w-full text-left p-2 rounded-lg hover:bg-bg border border-transparent hover:border-border transition-colors group flex items-center justify-between"
                >
                  <span className="text-xs font-mono truncate mr-2 group-hover:text-accent transition-colors">
                    {item.path.split('/').pop()}
                  </span>
                  <span className="text-xs font-bold rounded-full bg-red-500/10 text-red-500 px-2 py-0.5">
                    {item.score}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        
        <div className="mt-8 pt-4 border-t border-border">
          <h4 className="text-xs font-semibold text-muted mb-2">Legend (Score)</h4>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-[2px]" style={{ backgroundColor: getHeatColor(0, 1) }}></div> 0
          </div>
          <div className="flex items-center gap-2 text-xs mt-1">
            <div className="w-4 h-4 rounded-[2px]" style={{ backgroundColor: getHeatColor(data.maxScore * 0.3, data.maxScore) }}></div> Low
          </div>
          <div className="flex items-center gap-2 text-xs mt-1">
            <div className="w-4 h-4 rounded-[2px]" style={{ backgroundColor: getHeatColor(data.maxScore, data.maxScore) }}></div> High
          </div>
        </div>
      </div>
    </div>
  );
}
