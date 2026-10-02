"use client";
import { useEffect, useState } from "react";
import { getLesson } from "@/lib/learn";
import { Button } from "../ui/Button";

const KEY = "vcc:learnHidden";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]; } catch { return []; } };

/** Mini tutorial for the issue type, with a "don't show again" option. */
export function LearnPanel({ title }: { title: string }) {
  const lesson = getLesson(title);
  const [hidden, setHidden] = useState(false);
  useEffect(() => { if (lesson) setHidden(read().includes(lesson.match)); }, [lesson]);
  if (!lesson || hidden) return null;
  const hide = () => { try { localStorage.setItem(KEY, JSON.stringify([...read(), lesson.match])); } catch { /* ignore */ } setHidden(true); };
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <strong>📚 Learn: {lesson.name}</strong>
      <p>{lesson.what}</p><p className="text-muted">Why it matters: {lesson.why}</p>
      <pre className="overflow-x-auto rounded-lg bg-bg p-2 text-xs"><code>{lesson.good}</code></pre>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {lesson.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="text-accent underline">{l.label}</a>)}
        <Button variant="ghost" onClick={hide}>Don&apos;t show this again</Button>
      </div>
    </div>
  );
}
