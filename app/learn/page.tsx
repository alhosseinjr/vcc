"use client";
import { useState, useMemo, useEffect } from "react";
import { Search, Bookmark, BookmarkCheck, CheckCircle2, Circle } from "lucide-react";
import { LESSONS, type Lesson } from "@/lib/learn";
import { Button } from "@/components/ui/Button";

const PROGRESS_KEY = "vcc:learn:progress";
const BOOKMARKS_KEY = "vcc:learn:bookmarks";

export default function LearnPage() {
  const [search, setSearch] = useState("");
  const [progress, setProgress] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "bookmarked" | "completed" | "todo">("all");

  useEffect(() => {
    try {
      setProgress(new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || "[]")));
      setBookmarks(new Set(JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]")));
    } catch { /* ignore */ }
  }, []);

  const toggleProgress = (name: string) => {
    const next = new Set(progress);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setProgress(next);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify([...next])); } catch {}
  };

  const toggleBookmark = (name: string) => {
    const next = new Set(bookmarks);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setBookmarks(next);
    try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...next])); } catch {}
  };

  const filteredLessons = useMemo(() => {
    return LESSONS.filter(l => {
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.what.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === "bookmarked" && !bookmarks.has(l.name)) return false;
      if (filter === "completed" && !progress.has(l.name)) return false;
      if (filter === "todo" && progress.has(l.name)) return false;
      return true;
    });
  }, [search, filter, progress, bookmarks]);

  const percentage = Math.round((progress.size / LESSONS.length) * 100) || 0;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Learning Center</h1>
        <p className="text-muted text-lg max-w-2xl">
          Understand why these issues matter and how to prevent them in the future.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-card p-5">
        <div className="flex-1 min-w-[200px]">
          <div className="flex justify-between mb-2 text-sm font-medium">
            <span>Progress: {progress.size} of {LESSONS.length} completed</span>
            <span>{percentage}%</span>
          </div>
          <div className="h-3 w-full bg-border rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all duration-500 ease-out" style={{ width: `${percentage}%` }} />
          </div>
        </div>
        
        <div className="flex items-center gap-2 relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 text-muted h-4 w-4" />
          <input 
            type="text" 
            placeholder="Search topics..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-bg text-sm"
          />
        </div>

        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value as any)}
          className="rounded-xl border border-border bg-bg p-2 text-sm"
        >
          <option value="all">All Topics</option>
          <option value="todo">To Do</option>
          <option value="completed">Completed</option>
          <option value="bookmarked">Bookmarked</option>
        </select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {filteredLessons.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted">
            <p>No topics match your filters.</p>
            <Button variant="ghost" onClick={() => {setSearch(""); setFilter("all");}} className="mt-4">Clear filters</Button>
          </div>
        ) : filteredLessons.map(lesson => (
          <div key={lesson.name} className={`flex flex-col rounded-xl border p-5 transition-all duration-300 ${progress.has(lesson.name) ? "border-green-500/30 bg-green-500/5 opacity-80" : "border-border bg-card"}`}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-semibold">{lesson.name}</h2>
              <button 
                onClick={() => toggleBookmark(lesson.name)}
                className="text-muted hover:text-accent transition-colors"
                aria-label={bookmarks.has(lesson.name) ? "Remove bookmark" : "Add bookmark"}
              >
                {bookmarks.has(lesson.name) ? <BookmarkCheck className="text-accent" /> : <Bookmark />}
              </button>
            </div>
            
            <div className="space-y-4 flex-1">
              <div>
                <strong className="block text-sm mb-1 text-muted">What is it?</strong>
                <p className="text-sm">{lesson.what}</p>
              </div>
              
              <div>
                <strong className="block text-sm mb-1 text-muted">Why does it matter?</strong>
                <p className="text-sm italic">"{lesson.why}"</p>
              </div>
              
              <div>
                <strong className="block text-sm mb-1 text-muted">Good Example:</strong>
                <pre className="overflow-x-auto rounded-lg bg-bg p-3 text-xs"><code>{lesson.good}</code></pre>
              </div>
              
              {lesson.links.length > 0 && (
                <div>
                  <strong className="block text-sm mb-1 text-muted">Read more:</strong>
                  <ul className="flex flex-wrap gap-3">
                    {lesson.links.map(link => (
                      <li key={link.url}>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-xs">
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center">
              <Button 
                variant={progress.has(lesson.name) ? "outline" : "primary"} 
                onClick={() => toggleProgress(lesson.name)}
                className={progress.has(lesson.name) ? "text-green-600 dark:text-green-400 border-green-500/30" : ""}
              >
                {progress.has(lesson.name) ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                {progress.has(lesson.name) ? "Marked as Learned" : "Mark as Learned"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
