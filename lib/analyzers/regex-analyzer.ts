import type { Category, Issue, Severity } from "../types";

interface Rule { id: string; re: RegExp; severity: Severity; category: Category; title: string; explanation: string; analogy: string; fix: string; confidence: Issue["confidence"]; langs?: string[] }

export const RULES: Rule[] = [
  /* ── 1 ── */ {
    id: "hardcoded-secret", re: /(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"\s]{8,}['"]/i, severity: "critical", category: "security", confidence: "medium",
    title: "Secret written directly in code", explanation: "A password or key is typed into your code. Anyone who sees the code (or your GitHub repo) can use it.",
    analogy: "Like taping your house key to the front door.", fix: "Move it to an environment variable: const key = process.env.MY_API_KEY; then add it in your host's settings and rotate the leaked one."
  },
  /* ── 2 ── */ {
    id: "sql-concat", re: /(SELECT|INSERT|UPDATE|DELETE)\b[^;\n]*(\+\s*\w|\$\{)/i, severity: "critical", category: "security", confidence: "medium",
    title: "Database query built from raw text", explanation: "User input is glued into a database command. Attackers can type commands that read or delete your data.",
    analogy: "Like letting a stranger write the last line of your bank transfer form.", fix: "Use placeholders: db.query('SELECT * FROM users WHERE id = $1', [id])"
  },
  /* ── 3 ── */ {
    id: "plain-password", re: /password\s*={2,3}\s*[\w.'"\[\]]+/i, severity: "high", category: "security", confidence: "medium",
    title: "Password compared as plain text", explanation: "Passwords seem to be stored and compared unscrambled. If your database leaks, every password leaks.",
    analogy: "Like keeping everyone's PIN on a sticky note.", fix: "Hash with bcrypt: await bcrypt.hash(pw, 12) to save, await bcrypt.compare(pw, hash) to check."
  },
  /* ── 4 ── */ {
    id: "eval", re: /\beval\s*\(/, severity: "high", category: "security", confidence: "high",
    title: "eval() runs text as code", explanation: "eval turns any text into running code, so tricky input can take over your app.",
    analogy: "Like obeying any note someone slips under your door.", fix: "Remove eval. Use JSON.parse for data or a normal function for logic."
  },
  /* ── 5 ── */ {
    id: "inner-html", re: /dangerouslySetInnerHTML|\.innerHTML\s*=/, severity: "high", category: "security", confidence: "medium",
    title: "Raw HTML inserted into the page", explanation: "If this HTML contains user text, attackers can inject scripts that steal logins.",
    analogy: "Like printing whatever a visitor hands you on your shop sign.", fix: "Render as plain text ({value}) or clean it first with DOMPurify.sanitize(value)."
  },
  /* ── 6 ── */ {
    id: "weak-hash", re: /createHash\(\s*['"](?:md5|sha1)['"]\s*\)/i, severity: "high", category: "security", confidence: "high",
    title: "Weak scrambling method", explanation: "MD5/SHA1 are old and easy to crack, so they shouldn't protect anything important.",
    analogy: "Like a padlock that opens with a paperclip.", fix: "Use bcrypt/argon2 for passwords, or createHash('sha256') for non-secret checksums."
  },
  /* ── 7 ── */ {
    id: "cors-wildcard", re: /origin\s*:\s*['"]?\*['"]?|Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]?\*['"]/i, severity: "medium", category: "security", confidence: "high",
    title: "Any website can call your API", explanation: "CORS is set to '*', so any site can talk to your server from a visitor's browser.",
    analogy: "Like leaving your shop open to anyone who walks by.", fix: "Allow only your own site: cors({ origin: 'https://your-site.com' })"
  },
  /* ── 8 ── */ {
    id: "no-await-catch", re: /\.then\([^)]*\)\s*;?\s*$/, severity: "low", category: "best-practice", confidence: "low",
    title: "Promise without error handling", explanation: "If this request fails, nothing tells the user and the app may silently break.",
    analogy: "Like mailing a letter and never checking if it arrived.", fix: "Add .catch(err => showError(err)) or wrap the code in try/catch with await."
  },
  /* ── 9 ── */ {
    id: "console-log", re: /console\.log\(/, severity: "low", category: "style", confidence: "high",
    title: "Debug message left in code", explanation: "console.log can leak private data into the browser console.",
    analogy: "Like leaving your notes on the counter.", fix: "Delete it, or use a logger that is off in production."
  },
  /* ── 10 ── */ {
    id: "img-alt", re: /<img\b(?![^>]*\balt\s*=)[^>]*>/i, severity: "low", category: "accessibility", confidence: "medium",
    title: "Image without description", explanation: "This image has no alt text, so screen readers can't describe it and some visitors miss the content.",
    analogy: "Like a photo in a book with no caption for blind readers.", fix: '<img src="..." alt="Short description of the image" />'
  },
  /* ── 11 ── */ {
    id: "document-write", re: /document\.write\s*\(/, severity: "high", category: "security", confidence: "high",
    title: "document.write() can overwrite the page", explanation: "document.write replaces the entire page content after it has loaded, and can inject attacker-controlled scripts if the argument is not trusted.",
    analogy: "Like letting someone erase and rewrite your entire whiteboard.", fix: "Use element.textContent = value or DOM manipulation instead of document.write()."
  },
  /* ── 12 ── */ {
    id: "http-url", re: /['"]http:\/\/(?!localhost\b|127\.0\.0\.1\b)[^'"]+['"]/i, severity: "medium", category: "security", confidence: "low",
    title: "Insecure HTTP URL in code", explanation: "Using http:// instead of https:// means data travels unencrypted. Anyone on the same network can read or change it.",
    analogy: "Like sending a postcard instead of a sealed letter.", fix: "Change http:// to https:// — almost all services support it now.", langs: ["javascript", "typescript"]
  },
  /* ── 13 ── */ {
    id: "localstorage-sensitive", re: /localStorage\.setItem\s*\(\s*['"][^'"]*(?:token|password|secret|session|jwt|auth)[^'"]*['"]/i, severity: "medium", category: "security", confidence: "medium",
    title: "Sensitive data stored in localStorage", explanation: "localStorage is readable by any script on the page. If an attacker injects code (XSS), they can steal tokens or passwords stored there.",
    analogy: "Like leaving your wallet on a park bench.", fix: "Use httpOnly cookies for auth tokens, or sessionStorage for short-lived data. Never store passwords in the browser."
  },
  /* ── 14 ── */ {
    id: "new-function", re: /new\s+Function\s*\(/, severity: "high", category: "security", confidence: "high",
    title: "new Function() creates code from text", explanation: "new Function() is similar to eval — it turns a string into executable code. If the string comes from user input, attackers can run anything they want.",
    analogy: "Like hiring someone sight unseen based on a stranger's recommendation.", fix: "Use a normal function definition or a lookup table instead of dynamically creating functions."
  },
  /* ── 15 ── */ {
    id: "regex-dos", re: /\/\([^)]*[+*]\)[+*]\/|\/\([^)]*\|[^)]*\)\{|(\([^)]*[+*]\))\1/, severity: "medium", category: "security", confidence: "low",
    title: "Regex may cause slowdowns (ReDoS)", explanation: "This regular expression has nested repeating groups that can make it run extremely slowly on certain inputs, freezing your app.",
    analogy: "Like asking someone to count every grain of sand on a beach — some inputs take forever.", fix: "Simplify the regex: avoid nested quantifiers like (a+)+ or (a|b)*. Test at https://redos-checker.surge.sh"
  },
  /* ── 16 ── */ {
    id: "no-input-maxlength", re: /<input\b(?![^>]*(?:maxLength|maxlength)\s*=)[^>]*type\s*=\s*['"]text['"][^>]*>/i, severity: "low", category: "security", confidence: "low",
    title: "Text input without length limit", explanation: "Without a maxLength, users can paste extremely long text that might crash your app or overflow your database.",
    analogy: "Like a mailbox with no size limit — someone could stuff a mattress in it.", fix: '<input type="text" maxLength={200} />'
  },
  /* ── 17 ── */ {
    id: "unhandled-promise", re: /\basync\s+\w+\s*\([^)]*\)\s*\{(?:(?!try\b)[\s\S])*\bawait\b/, severity: "low", category: "best-practice", confidence: "low",
    title: "Async function without try/catch", explanation: "If any awaited step fails, this function crashes with no friendly message for the user.",
    analogy: "Like a tightrope walker with no net.", fix: "Wrap the await calls in try { ... } catch (err) { showError(err); }"
  },
  /* ── 18 ── */ {
    id: "alert-usage", re: /\balert\s*\(/, severity: "low", category: "style", confidence: "high",
    title: "alert() used for user messages", explanation: "alert() blocks the entire page and looks unprofessional. It's fine for quick debugging but should never ship in production.",
    analogy: "Like shouting across a restaurant instead of walking over to the table.", fix: "Use a toast notification or modal dialog instead."
  },
  /* ── 19 ── */ {
    id: "hsts-missing", re: /Strict-Transport-Security/i, severity: "info", category: "security", confidence: "low",
    title: "Strict-Transport-Security header referenced", explanation: "HSTS tells browsers to always use HTTPS. Make sure the max-age is at least 31536000 (1 year).",
    analogy: "Like telling the post office to always use registered mail for your address.", fix: "Strict-Transport-Security: max-age=31536000; includeSubDomains"
  },
  /* ── 20 ── */ {
    id: "jwt-none", re: /algorithm\s*[:=]\s*['"]none['"]/i, severity: "critical", category: "security", confidence: "high",
    title: "JWT algorithm set to 'none'", explanation: "Setting the JWT algorithm to 'none' means tokens are not signed at all — anyone can forge them.",
    analogy: "Like accepting unsigned checks.", fix: "Use a strong algorithm: { algorithm: 'HS256' } or 'RS256' with a proper secret."
  },
  /* ── 21 ── */ {
    id: "open-redirect", re: /res\.redirect\s*\(\s*req\.(query|body|params)\./i, severity: "medium", category: "security", confidence: "medium",
    title: "Open redirect from user input", explanation: "Redirecting to a URL from user input lets attackers send your users to a fake version of your site to steal their credentials.",
    analogy: "Like a building receptionist sending visitors wherever a stranger tells them to go.", fix: "Validate the redirect URL against an allowlist of trusted domains before redirecting."
  },
  /* ── 22 ── */ {
    id: "path-traversal", re: /(?:readFile|readFileSync|createReadStream|writeFile|writeFileSync)\s*\([^)]*(?:req\.|params\.|query\.|body\.)/i, severity: "high", category: "security", confidence: "medium",
    title: "File path from user input (path traversal)", explanation: "Reading or writing files using paths from user input lets attackers access files outside the intended folder, like passwords or config files.",
    analogy: "Like letting a visitor choose which room to enter in your house, including the safe room.", fix: "Use path.resolve() and verify the result is inside your allowed directory: if (!resolved.startsWith(allowedDir)) throw new Error('Invalid path');"
  },
  /* ── 23 ── */ {
    id: "command-injection", re: /(?:exec|execSync|spawn|spawnSync)\s*\([^)]*(?:req\.|params\.|query\.|body\.|`[^`]*\$\{)/i, severity: "critical", category: "security", confidence: "medium",
    title: "Command injection risk", explanation: "Running shell commands with user input lets attackers execute anything on your server.",
    analogy: "Like letting a stranger type commands on your computer.", fix: "Use spawn() with an array of arguments (no shell): spawn('ls', [userDir]) — never pass user input through a shell."
  },
  /* ── 24 ── */ {
    id: "hardcoded-ip", re: /['"](?:\d{1,3}\.){3}\d{1,3}(?::\d+)?['"]/i, severity: "low", category: "best-practice", confidence: "low",
    title: "Hardcoded IP address", explanation: "IP addresses in code break when the server moves. Use a hostname or environment variable instead.",
    analogy: "Like writing directions to a friend's house by GPS coordinates instead of the street address — they won't work if they move.", fix: "Use an environment variable: const host = process.env.API_HOST || 'localhost';"
  },
  /* ── 25 ── */ {
    id: "todo-fixme", re: /\/\/\s*(?:TODO|FIXME|HACK|XXX)\b/i, severity: "info", category: "best-practice", confidence: "high",
    title: "TODO/FIXME comment left in code", explanation: "This is a reminder to fix something later. Make sure it's resolved before shipping to users.",
    analogy: "Like a sticky note on a construction site saying 'finish wiring later'.", fix: "Resolve the TODO or create a ticket to track it, then remove the comment."
  },
  /* ── 26 ── */ {
    id: "csrf-missing", re: /app\.(post|put|patch|delete)\s*\(/i, severity: "low", category: "security", confidence: "low",
    title: "State-changing route may need CSRF protection", explanation: "POST/PUT/DELETE routes can be triggered by malicious sites if there's no CSRF token. This lets attackers make requests on behalf of logged-in users.",
    analogy: "Like someone forging your signature on a form.", fix: "Add CSRF middleware: npm install csurf, then app.use(csrf({ cookie: true })). Or use SameSite cookies."
  },
];

/** One-line automatic fixes, keyed by rule id. Rules without an entry only get advice text. */
const PATCHES: Record<string, (line: string) => string> = {
  "hardcoded-secret": (l) => l.replace(/([\w-]+)(\s*[:=]\s*)['"][^'"\s]{8,}['"]/i, (_m, name: string, sep: string) => `${name}${sep}process.env.${name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`),
  eval: (l) => l.replace(/\beval\s*\(/, "JSON.parse("),
  "console-log": () => "",
  "cors-wildcard": (l) => l.replace(/['"]?\*['"]?/, "'https://your-site.com'"),
  "weak-hash": (l) => l.replace(/(md5|sha1)/i, "sha256"),
  "inner-html": (l) => l.replace(/\.innerHTML\s*=/, ".textContent ="),
  "document-write": (l) => l.replace(/document\.write\s*\(/, "document.body.textContent = ("),
  "new-function": (l) => l.replace(/new\s+Function\s*\(/, "/* removed new Function */ (("),
  "alert-usage": (l) => l.replace(/\balert\s*\(/, "console.warn("),
  "http-url": (l) => l.replace(/['"]http:\/\//g, "'https://"),
};

/** Scan one file line by line against RULES. Pure function, easy to test. */
export function regexAnalyze(file: string, content: string): Issue[] {
  const issues: Issue[] = [];
  content.split("\n").forEach((text, i) => {
    if (text.length > 500) return;
    for (const r of RULES) {
      if (!r.re.test(text)) continue;
      const patched = PATCHES[r.id]?.(text);
      issues.push({
        id: `${r.id}:${file}:${i + 1}`, severity: r.severity, category: r.category, file, line: i + 1, snippet: text.trim().slice(0, 160),
        title: r.title, explanation: r.explanation, analogy: r.analogy, fix: r.fix, confidence: r.confidence, source: "rules", ...(patched !== undefined && patched !== text ? { original: text, patched } : {})
      });
    }
  });
  return issues;
}
