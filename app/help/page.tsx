const FAQ: [string, string][] = [
  ["How does the scan work?", "Three layers: pattern rules catch known mistakes instantly, a code-structure check (AST) finds slow loops, ignored errors and tangled functions, and optional AI review (Groq) reads the code for deeper problems."],
  ["Is my code private?", "Files stay in your browser. Scanning sends them to this app's server function, which runs the checks and forgets them. If you add a Groq key, code snippets are also sent to Groq for AI review."],
  ["What does the health score mean?", "100 is clean. Each open issue subtracts points: critical 20, high 10, medium 4, low 1. Fixed and ignored issues don't count."],
  ["What does 'Fix all' change?", "It rewrites only lines with a safe one-line fix and gives you a ZIP of the patched files. Always review and test before deploying. Some fixes are placeholders, for example your real domain for CORS."],
  ["Why is AI review partial?", "The free AI tier has limits. We review the first 8 files, and pause if Groq says it's busy. Rule-based checks always cover everything."],
  ["How do share links work?", "The report is packed into the link itself, so nothing is stored on a server. Anyone with the link can read it until it expires. Source code lines are not included."],
  ["Keyboard shortcuts", "On results: / jumps to the filter, e exports the Markdown report."],
];
export default function HelpPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Help</h1>
      {FAQ.map(([q, a]) => <details key={q} className="rounded-xl border border-border bg-card p-4"><summary className="cursor-pointer font-medium">{q}</summary><p className="mt-2 text-sm">{a}</p></details>)}
    </div>
  );
}
