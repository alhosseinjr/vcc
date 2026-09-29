import type { Category, Issue, Severity } from "../types";

// NOTE: this is a line + indentation analyzer, not a real Python AST (no Python parser runs in the browser/serverless JS runtime).
interface PyRule { re: RegExp; severity: Severity; category: Category; title: string; explanation: string; analogy: string; fix: string }
const RULES: PyRule[] = [
  { re: /^\s*except\s*(Exception\s*)?:/, severity: "medium", category: "best-practice", title: "Catch-all error handler",
    explanation: "This except block catches every error, including ones you never expected, and can hide real bugs.", analogy: "Like ignoring every alarm in the building because one was false.", fix: "except ValueError as err:  # name the error you expect\n    logger.error(err)" },
  { re: /\b(?:exec|eval)\s*\(/, severity: "high", category: "security", title: "exec() or eval() runs text as code",
    explanation: "exec or eval turns text into running code, so tricky input can take over your app.", analogy: "Like obeying any note someone slips under your door.", fix: "Remove exec/eval. Call a normal function or use ast.literal_eval() for data." },
  { re: /os\.system\(|subprocess\.\w+\([^)]*shell\s*=\s*True/, severity: "high", category: "security", title: "Shell command built from text",
    explanation: "Running commands through a shell lets attackers add their own commands to yours.", analogy: "Like letting a stranger finish your sentence to the bank teller.", fix: "subprocess.run([\"ls\", user_dir], check=True)  # list form, no shell" },
  { re: /pickle\.loads?\(/, severity: "high", category: "security", title: "Unsafe data loading (pickle)",
    explanation: "Loading pickle data from anywhere untrusted can run attacker code on your server.", analogy: "Like opening a package without checking who sent it.", fix: "Use json.loads(data) for data you receive." },
  { re: /yaml\.load\((?![^)]*Loader\s*=\s*(yaml\.)?SafeLoader)/, severity: "medium", category: "security", title: "Unsafe YAML loading",
    explanation: "yaml.load without a safe loader can run code hidden in the file.", analogy: "Like trusting a recipe that says 'also burn the kitchen'.", fix: "yaml.safe_load(text)" },
  { re: /\bdebug\s*=\s*True/, severity: "medium", category: "security", title: "Debug mode switched on",
    explanation: "Debug mode shows internal details and, in some frameworks, lets visitors run code.", analogy: "Like leaving the back office door open with the lights on.", fix: "app.run(debug=os.environ.get('DEBUG') == '1')" },
  { re: /verify\s*=\s*False/, severity: "high", category: "security", title: "Secure connection check turned off",
    explanation: "verify=False makes your app accept fake websites, so attackers can read or change the traffic.", analogy: "Like accepting any ID without looking at it.", fix: "Remove verify=False. If you use a private certificate, pass verify='/path/to/ca.pem'." },
  { re: /execute\(\s*f["']|execute\([^)]*["']\s*%\s|execute\([^)]*["']\s*\+\s*\w/, severity: "critical", category: "security", title: "Database query built from raw text",
    explanation: "User input is glued into a database command. Attackers can type commands that read or delete your data.", analogy: "Like letting a stranger write the last line of your bank transfer form.", fix: "cursor.execute(\"SELECT * FROM users WHERE id = %s\", (user_id,))" },
  { re: /\bhashlib\.md5\(/, severity: "medium", category: "security", title: "Weak hashing algorithm (MD5)",
    explanation: "MD5 is obsolete and vulnerable to collision attacks.", analogy: "Like using a combination lock with only 10 numbers.", fix: "hashlib.sha256(data).hexdigest()" },
  { re: /^\s*assert\s+/, severity: "low", category: "best-practice", title: "Assert used for logic",
    explanation: "Assertions are completely removed when Python runs in optimized mode (-O), so they should not be used for data validation or security checks.", analogy: "Like a lock that disappears when you're not looking.", fix: "if not condition:\n    raise ValueError('Invalid')" },
  { re: /app\.config\['SECRET_KEY'\]\s*=\s*['"][^'"]{5,}['"]/, severity: "critical", category: "security", title: "Hardcoded secret key",
    explanation: "The secret key is written directly in the code. If someone sees the code, they can forge session cookies.", analogy: "Like putting the master key in the window display.", fix: "app.config['SECRET_KEY'] = os.environ['SECRET_KEY']" },
  { re: /random\.randint\(|random\.choice\(/, severity: "low", category: "security", title: "Insecure random number generator",
    explanation: "The standard random module is predictable and should not be used for tokens, passwords, or cryptography.", analogy: "Like a magician using a marked deck of cards.", fix: "import secrets\nsecrets.choice(string.ascii_letters)" },
];
const LOOP_CALL = /\.execute\(|requests\.(get|post|put|delete)\(|httpx\.\w+\(|\.query\(|\.objects\.(get|filter)\(/;

/** Pattern + indentation checks for .py files, including database/network calls inside loops (N+1). Never throws. */
export function pythonAnalyze(file: string, content: string): Issue[] {
  if (!file.endsWith(".py")) return [];
  const out: Issue[] = [];
  const loops: number[] = []; // indentation of each enclosing for/while
  const add = (line: number, text: string, r: Omit<PyRule, "re">, confidence: Issue["confidence"], source = "rules" as const) =>
    out.push({ id: `py:${r.title}:${file}:${line}`, severity: r.severity, category: r.category, file, line, snippet: text.trim().slice(0, 160), title: r.title,
      explanation: r.explanation, analogy: r.analogy, fix: r.fix, confidence, source });

  content.split("\n").forEach((text, i) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith("#") || text.length > 500) return;
    const indent = text.length - text.trimStart().length;
    while (loops.length && indent <= loops[loops.length - 1]) loops.pop();
    for (const r of RULES) if (r.re.test(text)) add(i + 1, text, r, "medium");
    if (/^(for|while)\b.*:\s*$/.test(trimmed)) { loops.push(indent); return; }
    if (loops.length && LOOP_CALL.test(text))
      add(i + 1, text, { severity: "high", category: "performance", title: "Database or network call inside a loop (N+1)",
        explanation: "The app makes one request per item, one after another. With 100 items that's 100 slow round trips.", analogy: "Like driving to the store once for each grocery item.",
        fix: "# Fetch everything at once, e.g. Django: Model.objects.filter(id__in=ids)\n# or SQL: WHERE id = ANY(%s)" }, "medium");
  });
  return out;
}
