"use client";
import { useRef, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { IssueCard, type Status } from "./IssueCard";
import type { Issue } from "@/lib/types";

export default function VirtualizedIssueList({ 
  issues, 
  statusOf, 
  mark, 
  contextFor 
}: { 
  issues: Issue[];
  statusOf: (id: string) => Status;
  mark: (id: string, s: Status) => void;
  contextFor: (i: { file: string; line: number }) => string | undefined;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Since IssueCard height varies based on content (snippet length, explanations, fixes)
  // we need dynamic measurements. react-virtual handles this well.
  const virtualizer = useVirtualizer({
    count: issues.length,
    getScrollElement: () => document.documentElement, // Window scrolling
    estimateSize: () => 180, // rough estimate of a collapsed IssueCard height
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="w-full relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const i = issues[virtualItem.index];
        return (
          <div
            key={i.id}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            className="absolute top-0 left-0 w-full"
            style={{
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <div className="pb-2">
              <IssueCard
                issue={i}
                status={statusOf(i.id)}
                onMark={(s) => mark(i.id, s)}
                context={contextFor(i)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
