import { parse } from "@babel/parser";
import type { Node } from "@babel/types";
import type { Issue } from "../types";

const LOOPS = new Set(["ForStatement", "ForInStatement", "ForOfStatement", "WhileStatement", "DoWhileStatement"]);
const FUNCS = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression", "ObjectMethod", "ClassMethod"]);
const BRANCHES = new Set(["IfStatement", "ConditionalExpression", "ForStatement", "ForInStatement", "ForOfStatement", "WhileStatement", "DoWhileStatement", "CatchClause"]);
const DB_CALL = /fetch|query|find|select|insert|update|delete|axios|supabase|prisma|\.from\(/i;
export const COMPLEXITY_LIMIT = 10;

const isNode = (v: unknown): v is Node => typeof v === "object" && v !== null && typeof (v as { type?: unknown }).type === "string";

/** Depth-first walk. `path` holds ancestors so visitors can ask "am I inside a loop?". */
function walk(node: Node, visit: (n: Node, path: Node[]) => void, path: Node[] = []): void {
  visit(node, path);
  for (const [key, val] of Object.entries(node)) {
    if (key === "loc" || key.endsWith("Comments")) continue;
    const kids = Array.isArray(val) ? val : [val];
    for (const k of kids) if (isNode(k)) walk(k, visit, [...path, node]);
  }
}

/** Cyclomatic complexity of one function, not counting nested functions. */
function complexity(fn: Node): number {
  let score = 1;
  const inner = (n: Node, top: boolean): void => {
    if (!top && FUNCS.has(n.type)) return;
    if (BRANCHES.has(n.type)) score++;
    if (n.type === "SwitchCase" && n.test) score++;
    if (n.type === "LogicalExpression") score++;
    for (const [k, v] of Object.entries(n)) {
      if (k === "loc") continue;
      for (const c of Array.isArray(v) ? v : [v]) if (isNode(c)) inner(c, false);
    }
  };
  inner(fn, true);
  return score;
}

/** Semantic checks on JS/TS: N+1 queries, empty catch blocks, over-complex functions, unguarded async code. Never throws. */
export function astAnalyze(file: string, content: string): Issue[] {
  if (!/\.(jsx?|tsx?)$/.test(file)) return [];
  let ast: Node;
  try { ast = parse(content, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true }).program; } catch { return []; }
  const lines = content.split("\n");
  const out: Issue[] = [];
  const add = (n: Node, i: Omit<Issue, "id" | "file" | "line" | "snippet" | "source">): void => {
    const line = n.loc?.start.line ?? 0;
    out.push({ ...i, id: `ast:${i.title}:${file}:${line}`, file, line, snippet: (lines[line - 1] ?? "").trim().slice(0, 160), source: "rules" });
  };

  walk(ast, (n, path) => {
    if (n.type === "CatchClause" && n.body.body.length === 0)
      add(n, { severity: "medium", category: "best-practice", confidence: "high", title: "Errors silently ignored",
        explanation: "This catch block is empty, so when something fails nobody finds out and the app keeps going in a broken state.",
        analogy: "Like a smoke alarm with the battery removed.", fix: "catch (err) {\n  console.error(err); // or send to an error tracker\n  // show the user a friendly message\n}" });

    if (n.type === "AwaitExpression") {
      let inLoop = false;
      for (let i = path.length - 1; i >= 0; i--) { if (FUNCS.has(path[i].type)) break; if (LOOPS.has(path[i].type)) { inLoop = true; break; } }
      const src = content.slice(n.start ?? 0, n.end ?? 0);
      if (inLoop && DB_CALL.test(src))
        add(n, { severity: "high", category: "performance", confidence: "medium", title: "Database or network call inside a loop (N+1)",
          explanation: "The app makes one request per item, one after another. With 100 items that's 100 slow round trips.",
          analogy: "Like driving to the store once for each grocery item.", fix: "// Fetch everything at once\nconst results = await Promise.all(items.map((i) => fetchItem(i)));\n// or use a single query: .in('id', ids)" });
    }

    if (FUNCS.has(n.type)) {
      const score = complexity(n);
      if (score > COMPLEXITY_LIMIT)
        add(n, { severity: "low", category: "best-practice", confidence: "high", title: `Function is very complex (score ${score})`,
          explanation: "This function has many branches, so it's hard to understand and likely hides bugs.",
          analogy: "Like a recipe with 20 'if this, then that' notes.", fix: "Split it into smaller functions that each do one thing, and return early to avoid deep nesting." });
      const fn = n as Node & { async?: boolean };
      if (fn.async) {
        let hasAwait = false, hasTry = false;
        walk(n, (c) => { if (c.type === "AwaitExpression") hasAwait = true; if (c.type === "TryStatement") hasTry = true; });
        if (hasAwait && !hasTry)
          add(n, { severity: "low", category: "best-practice", confidence: "low", title: "Async code without error handling",
            explanation: "If any awaited step fails, this function crashes with no friendly message.",
            analogy: "Like a tightrope walker with no net.", fix: "try {\n  // your await calls\n} catch (err) {\n  // handle or report the error\n}" });
      }
    }
  });
  return out;
}
