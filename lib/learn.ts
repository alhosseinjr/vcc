export interface Lesson { match: string; name: string; what: string; why: string; good: string; links: { label: string; url: string }[] }

/** Short tutorials shown under matching issues. `match` is compared against the issue title. */
export const LESSONS: Lesson[] = [
  { match: "Secret", name: "Keeping secrets out of code", what: "Secrets (API keys, passwords) should live outside your code, in environment variables.",
    why: "Code gets copied, shared and pushed to GitHub. A key in code is a key in public.", good: "const key = process.env.STRIPE_KEY; // set it in your host's settings",
    links: [{ label: "The Twelve-Factor App: Config", url: "https://12factor.net/config" }] },
  { match: "Database query built from raw text", name: "SQL injection", what: "Attackers type database commands into forms. If you paste that text into a query, the database runs them.",
    why: "It can expose or erase every record you have.", good: "db.query('SELECT * FROM users WHERE id = $1', [id]) // the value can never become a command",
    links: [{ label: "OWASP: SQL Injection", url: "https://owasp.org/www-community/attacks/SQL_Injection" }] },
  { match: "Password compared as plain text", name: "Storing passwords safely", what: "Never store the password itself. Store a one-way scramble (a hash) and compare scrambles.",
    why: "If your database leaks, hashed passwords are useless to thieves; plain ones are not.", good: "const ok = await bcrypt.compare(input, user.passwordHash);",
    links: [{ label: "OWASP Password Storage Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html" }] },
  { match: "eval", name: "Why eval is dangerous", what: "eval runs any text as code.", why: "If a user can influence that text, they control your app.",
    good: "const data = JSON.parse(text); // reads data without running it", links: [{ label: "MDN: eval()", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval" }] },
  { match: "Raw HTML inserted", name: "Cross-site scripting (XSS)", what: "Inserting untrusted HTML lets attackers run their own scripts in your visitors' browsers.",
    why: "They can steal logins or impersonate users.", good: "<p>{userText}</p> // React escapes this for you", links: [{ label: "OWASP: XSS", url: "https://owasp.org/www-community/attacks/xss/" }] },
  { match: "Any website can call your API", name: "CORS", what: "CORS decides which websites may talk to your server from a browser.", why: "'*' means every website, including malicious ones.",
    good: "cors({ origin: 'https://your-site.com' })", links: [{ label: "MDN: CORS", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS" }] },
  { match: "Database or network call inside a loop", name: "The N+1 problem", what: "One request per item is slow: 100 items means 100 round trips.", why: "Pages get slower as your data grows, and hosting costs rise.",
    good: "const rows = await db.from('items').select().in('id', ids); // one request", links: [] },
  { match: "Errors silently ignored", name: "Handling errors", what: "Catch errors, then report them and tell the user something helpful.", why: "Silent failures hide bugs until customers complain.",
    good: "catch (err) { report(err); showMessage('Something went wrong'); }", links: [{ label: "MDN: try...catch", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch" }] },
  { match: "No rate limiting", name: "Rate Limiting", what: "Rate limiting restricts how many requests one person can make in a short time.", why: "Without it, attackers can overload your server (DoS), brute-force passwords, or rack up your cloud bill.",
    good: "app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })); // 100 requests per 15 minutes", links: [{ label: "OWASP: Denial of Service", url: "https://owasp.org/www-community/attacks/Denial_of_Service" }] },
  { match: "Debug message left", name: "Information Exposure", what: "Console.log or debug messages often contain sensitive data or internal application details.", why: "Attackers can read the browser console. Leaving logs in production exposes information that helps them plan an attack.",
    good: "logger.info('User logged in'); // only goes to server logs, not the browser", links: [{ label: "OWASP: Information Exposure", url: "https://owasp.org/Top10/A01_2021-Broken_Access_Control/" }] },
  { match: "Insecure HTTP URL", name: "HTTPS Enforcement", what: "HTTP sends data in plain text, meaning anyone on the network (like public Wi-Fi) can read it.", why: "HTTPS encrypts the data so only the user and your server can see it.",
    good: "fetch('https://api.example.com/data')", links: [{ label: "Why HTTPS Matters", url: "https://developers.google.com/search/docs/crawling-indexing/https" }] },
  { match: "Text input without length", name: "Input Validation", what: "Validating input means checking that the user's data is the right type, format, and length before using it.", why: "Too-long input can crash your server or database, and unvalidated input leads to almost every major security flaw.",
    good: "const parsed = z.string().max(200).parse(input); // using Zod to enforce a max length", links: [{ label: "OWASP: Input Validation", url: "https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html" }] },
  { match: "State-changing route", name: "Authentication and Authorization", what: "Authentication verifies who the user is, and authorization checks if they are allowed to do that action.", why: "Without these checks, any visitor can delete data, change passwords, or access private pages.",
    good: "if (!user || user.role !== 'admin') throw new Error('Unauthorized');", links: [{ label: "OWASP: Broken Access Control", url: "https://owasp.org/Top10/A01_2021-Broken_Access_Control/" }] }
];

export const getLesson = (title: string): Lesson | undefined => LESSONS.find((l) => title.startsWith(l.match));
