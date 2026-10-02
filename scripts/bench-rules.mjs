// Benchmark for the rule-based analysis layer (no network, no AI).
//
//   npm run bench
//
// Runs the same pipeline as app/api/analyze/route.ts (project detection, regex, Python and
// dependency analyzers, issue grouping) over this repository's own source code, which makes
// the corpus real and reproducible. It needs Node 22.6+ because it imports the .ts files
// directly (type stripping), so there are no extra dependencies.
//
// Not covered: the Babel AST pass (lib/analyzers/ast-analyzer.ts) and the Groq AI review.
// The AST pass would need @babel/parser installed; the AI review is network-bound.
// Per-request limits (20 files, 1 MB each, 10 MB total) are enforced in the route, not here.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import os from "node:os";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const lib = (p) => new URL(`../lib/${p}`, import.meta.url).href;
const { regexAnalyze } = await import(lib("analyzers/regex-analyzer.ts"));
const { pythonAnalyze } = await import(lib("analyzers/python-analyzer.ts"));
const { dependencyAnalyze } = await import(lib("analyzers/dependency-analyzer.ts"));
const { projectAnalyze } = await import(lib("analyzers/project-analyzer.ts"));
const { healthScore } = await import(lib("score.ts"));
const { groupIssues } = await import(lib("group-issues.ts"));

const SKIP = new Set(["node_modules", ".git", ".next", "scripts"]);
function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?|json)$/.test(name) && name !== "package-lock.json") out.push(p);
  }
  return out;
}

const corpus = walk(ROOT).map((p) => ({ name: relative(ROOT, p), content: readFileSync(p, "utf8") }));
const byteLen = (files) => files.reduce((n, f) => n + Buffer.byteLength(f.content), 0);
const lineCount = (files) => files.reduce((n, f) => n + f.content.split("\n").length, 0);

function scan(files) {
  const project = projectAnalyze(files);
  const scannable = files.filter((f) => !project.skippedFiles.includes(f.name));
  const issues = scannable.flatMap((f) =>
    f.name.endsWith("package.json")
      ? dependencyAnalyze(f.name, f.content)
      : [...regexAnalyze(f.name, f.content), ...pythonAnalyze(f.name, f.content)]);
  issues.push(...project.issues);
  return groupIssues(issues);
}

const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
function measure(label, files, reps) {
  scan(files); scan(files); // warm-up
  const times = [];
  let out;
  for (let i = 0; i < reps; i++) {
    const t0 = performance.now();
    out = scan(files);
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const median = pct(times, 0.5);
  return {
    label, files: files.length, kb: byteLen(files) / 1e3, lines: lineCount(files),
    medianMs: median, p95Ms: pct(times, 0.95), mbPerS: byteLen(files) / 1e6 / (median / 1000),
    issues: out.length, score: healthScore(out),
    requestKb: Buffer.byteLength(JSON.stringify({ files })) / 1e3,
  };
}

const scaled = (k) => Array.from({ length: k }, (_, i) => corpus.map((f) => ({ name: `copy${i}/${f.name}`, content: f.content }))).flat();
const rows = [
  measure("20 files (the per-request cap in /api/analyze)", corpus.slice(0, 20), 25),
  measure(`all ${corpus.length} files`, corpus, 25),
  measure(`${corpus.length * 5} files (corpus x5)`, scaled(5), 8),
  measure(`${corpus.length * 20} files (corpus x20)`, scaled(20), 5),
];

console.log(`node ${process.version} | ${os.cpus()[0].model.trim()} x${os.cpus().length} | ${process.platform}\n`);
console.log("| Scan | Files | Size | Lines | Median | p95 | Throughput | Request body | Issues |");
console.log("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
for (const r of rows)
  console.log(`| ${r.label} | ${r.files} | ${r.kb.toFixed(0)} KB | ${r.lines.toLocaleString("en-US")} | ${r.medianMs.toFixed(1)} ms | ${r.p95Ms.toFixed(1)} ms | ${r.mbPerS.toFixed(1)} MB/s | ${r.requestKb.toFixed(0)} KB | ${r.issues} |`);
