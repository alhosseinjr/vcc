# Vibe-Coded Cleanup

**AI-powered code review and security analysis for apps built with AI coding assistants.**

Vibe-Coded Cleanup helps non-technical creators and AI-assisted developers identify hidden security vulnerabilities, exposed secrets, inefficient database queries, and other issues commonly introduced by AI-generated code.

Instead of overwhelming you with technical jargon, it explains each issue in plain English, shows why it matters, and provides safe, copy-paste fixes — so you can understand, improve, and confidently ship your application.

## Overview

Vibe-Coded Cleanup is a fast code review tool for non-technical users. The interface is a Progressive Web App with virtualized result lists. Analysis runs in a server function: deterministic rule-based checks always run, and an optional AI review (Groq) is added when the host has configured a key. Your files are sent to that server function on every scan; see [What leaves your machine](#what-leaves-your-machine).

![Demo of scanning code](./public/vcc_demo.webp)

AI coding assistants such as ChatGPT, Claude, and Cursor make it easier than ever to build complete applications without being an experienced software engineer.

However, generated code can also introduce problems that are difficult to spot:

* Exposed API keys and secrets
* Insecure configurations
* Potential security vulnerabilities
* Inefficient database queries
* Problematic coding patterns
* Performance issues
* Other common AI-generated code mistakes

**Vibe-Coded Cleanup** acts as a second pair of eyes for your project, combining deterministic code analysis with AI-powered semantic review.

---

## Features

### Browser-Based & GitHub Integration

No installation or complex setup is required. You can drag and drop your project directly from your browser, or **scan any public GitHub repository instantly via URL**.

### Free to Use

The application is designed around free-tier infrastructure, including Groq's API, with user data and scan history stored locally on the user's device.

### Plain-English Explanations

Every detected issue is explained without unnecessary technical jargon and, where useful, includes a real-world analogy to make the underlying concept easier to understand.

### Automated Fixes

Get corrected code directly from the interface, or generate a patched ZIP containing the suggested fixes.

### Architecture & Complexity Visualizations

Vibe-Coded Cleanup automatically maps your project's architecture, rendering an interactive dependency graph (Mermaid), a security severity Heatmap, and an AST-complexity Treemap so you can see exactly where technical debt is accumulating.

### Scan Comparison & Team Collaboration

Compare previous scans to track improvements over time and monitor changes to your project's overall Health Score. 
Share annotated views with your team using URL `#hash` links that require zero backend databases.

### Built-in Learning Center

Learn the fundamentals behind common security and code-quality issues through short, interactive lessons.

### Offline Support

Install Vibe-Coded Cleanup as a Progressive Web App (PWA). Cached pages (home, learning center, settings, help, and pages you have already opened) load offline. **Scanning needs a network connection**, because the checks run in the `/api/analyze` server function, not in the browser.

---

## How It Works

1. Open **[Vibe-Coded Cleanup](https://vibe-coded-cleanup.vercel.app)**.
2. Drag and drop your project folder, upload a ZIP file, or provide a **GitHub URL**.
3. Let the analysis engine scan your codebase.
4. Review detected issues, architectural diagrams, and complexity treemaps.
5. Apply individual fixes or use **Fix All**.
6. Annotate and share the report with your team, or download a patched version of your project.
7. Compare future scans to track your progress.

---

## Architecture

Vibe-Coded Cleanup is designed around three core principles:

**Speed · Privacy · Simplicity**

### Two-Layer Analysis Engine

The analysis pipeline combines deterministic static analysis with AI-powered semantic analysis.

#### 1. Rule-Based Analysis

Runs inside the `/api/analyze` server function using deterministic rules located in `lib/analyzers/`. No AI and no third-party service is involved in this layer.

It uses techniques such as:

* Regular-expression analysis
* AST-based analysis
* Indentation and structural parsing
* Security-focused pattern detection

These checks are fast (see [Performance](#performance)), but they need a connection to the app's server.

#### 2. Semantic AI Analysis

More complex issues are analyzed with `openai/gpt-oss-120b` through the Groq API.

This layer runs **only when the server has `GROQ_API_KEY` set**. A key saved in the browser's Settings page is not used by scans (see [Environment Variables](#environment-variables)). To stay inside free-tier limits and the 20-second function limit, a scan sends at most **6 files** to the model, 2 at a time, preferring paths that look security-relevant (`auth`, `login`, `middleware`, `route`, `api`, `db`, `config`, `env`, `secret`, `jwt`, `token`, `session`). Each file is split into 300-line windows, and at most 3 windows per file are reviewed. Rule-based checks cover every submitted file.

Per request, the server accepts up to **20 files**, **1 MB per file** and **10 MB in total**.

---

## Privacy & Data Architecture

Privacy is a core part of the architecture.

### No Database for User Code

Project source code is **not stored in a database**.

Uploaded code is processed in memory by the `/api/analyze` server function and is discarded after the response. The server's structured logs record request IDs, durations and counts, never file contents, and the logger is a no-op in production builds.

### Local-First Storage

Everything the app remembers stays in your browser. There is no account and no server-side profile.

| What | Where |
| --- | --- |
| Scan history (issues and scores; last 25 scans, kept 30 days), marks, annotations, preferences, Learning Center progress | `localStorage` |
| Your Groq API key and optional GitHub token | `localStorage`, in plain text (readable by any script on the same origin) |
| The first 1,000 characters of up to 25 files from the current scan | `sessionStorage`, cleared when the tab closes |

The app does not use IndexedDB. Clearing site data removes all of the above.

## What leaves your machine

Short version: **your code is sent to this app's server on every scan, and on to Groq only when the server has an AI key.** Every path:

| When | Sent to | What is sent |
| --- | --- | --- |
| You scan a **GitHub URL** | `api.github.com` and `raw.githubusercontent.com`, directly from your browser | The repo, branch and file paths. A GitHub token, if you saved one, goes in the `Authorization` header to GitHub only. |
| **Any scan** (upload, GitHub or pasted code) | This app's `/api/analyze` | Each selected file as `{ name, content }`, i.e. **the full text of your source files** (up to 20 files, 1 MB each). The browser also attaches your saved Groq key as an `x-groq-key` header, which the scan route ignores. |
| **AI review** is on (server has `GROQ_API_KEY`) | `api.groq.com`, from the server | Up to 6 files as 300-line windows (max 3 per file), with the file name. Rule-based checks never leave the server process. |
| You click **Generate AI fix** | This app's `/api/fix`, then `api.groq.com` | The issue title, explanation, file name and line, and up to 10,000 characters of surrounding code. Uses the server's key; your saved key is used only if the host set `ALLOW_USER_GROQ_KEY=true` and has no server key. |
| You open the app or the PWA | This app's own origin | Normal page and asset requests. The code contains no analytics or tracking scripts. |

Things worth knowing:

* **AI review has no per-scan opt-in.** If the host sets `GROQ_API_KEY`, up to 6 files are sent to Groq on every scan, and the results page says whether AI was used. To keep code away from Groq, self-host without `GROQ_API_KEY`.
* **The server caches Groq replies in memory** (prompt hash to reply, about 200 entries, per instance, lost on restart). A reply can quote lines of your code.
* **Treat any saved key as sensitive.** It sits in `localStorage` in plain text.

### Files the tool produces

These are created in your browser and saved to your Downloads folder. The app does not upload them.

| Artifact | Created by | Contains | Does **not** contain |
| --- | --- | --- | --- |
| `report.md`, `report.html` | **.md / .html** buttons on a scan | Health score; per issue: title, `file:line`, category, explanation, analogy, suggested fix text | Source snippets (fix text can still include code from a rule or the AI) |
| `report.json` | **.json** button | Health score and the full issue objects, **including the `snippet` field (the offending source line, up to 160 characters)** for auto-fixable issues the `original` and `patched` lines, and for AI-found issues `ruleId` and `evidence` (the model's description of the offending behavior, which can quote code) | Whole files |
| `comparison.md`, `comparison.html` | Compare page | Same format as the Markdown/HTML reports, for the combined issues of two scans | Source snippets |
| `patched-files.zip` | **Fix all** | The files that received an auto-fix, with the chosen one-line replacements applied. Note: it is built from the 1,000-character copy held in session storage, so large files can come out truncated. | Files that were not changed |
| `annotations-<scanId>.md` | **Export Notes** (architecture page) | Your notes, author names and timestamps, grouped by file or node | Source code |
| Share link `/shared#...` | **Share** button | Up to 50 issues (severity, category, file, line, title, explanation, analogy, fix), with an optional expiry of 7 days, 30 days or never | Source snippets (deliberately left out) |
| Share link `/share#...` | **Share View** (architecture page) | View mode, the GitHub URL (if the scan came from one), your annotations, and with *Include Issues* the file, title and severity of each issue | Source code |

About share links: the report lives **in the URL hash**, which browsers do not send to servers, so there is no backend copy to delete. The flip side is that anyone with the link has the report, and the expiry is only enforced by the viewer's browser. File paths and issue titles can still reveal things about your project.

---

## Progressive Web App

Vibe-Coded Cleanup is built as a Progressive Web App.

The application includes:

* Service Worker support
* Aggressive asset caching
* Offline support for supported rule-based scans
* Native installation support for desktop and mobile
* PWA manifest and application metadata

Users can install the application directly from their browser and use it similarly to a native application.

---

## Performance

Large scan results can contain thousands of detected issues.

To maintain smooth rendering and scrolling, Vibe-Coded Cleanup uses `@tanstack/react-virtual` to virtualize large lists and minimize unnecessary DOM rendering.

The result is a responsive interface even when processing large AI-generated outputs.

### Analysis Benchmark

The rule-based analysis is very fast. Running over a **147 KB (~7000 lines)** code payload on a standard machine yields:

| Analyzer             | Execution Time |
|----------------------|----------------|
| **Regex Analyzer**   | ~7.10 ms       |
| **AST Analyzer**     | ~35.97 ms      |
| **Dependency Checks**| ~0.14 ms       |

#### Reproduce it

`npm run bench` runs the regex, Python and dependency analyzers plus project detection and issue grouping (the same pipeline as `/api/analyze`, without the AST pass or any AI call) over this repository's own source. It needs Node 22.6+ and no extra install.

| Scan | Files | Size | Lines | Median | p95 | Throughput |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 files (per-request cap in `/api/analyze`) | 20 | 78 KB | 1,819 | 3.8 ms | 4.0 ms | 20.4 MB/s |
| All 87 files | 87 | 234 KB | 4,975 | 11.5 ms | 11.9 ms | 20.3 MB/s |
| Corpus ×5 | 435 | 1.2 MB | 24,875 | 56.1 ms | 65.3 ms | 20.9 MB/s |
| Corpus ×20 | 1,740 | 4.7 MB | 99,500 | 234.6 ms | 254.3 ms | 20.0 MB/s |

*Node 22.22 on a 2-vCPU cloud VM (Intel Xeon @ 2.1 GHz), median of 5–25 runs after warm-up. A second run gave 4.1 / 12.4 / 62.3 / 236.1 ms, so expect roughly ±10% on larger inputs and more on small ones. A modern laptop will be faster.*

Cost grows linearly with input (about 50 µs per KB here). In a real scan, wall-clock time is dominated by uploading the files and, when enabled, the AI review, not by the rule engine.

---

## Tech Stack

| Category         | Technology                |
| ---------------- | ------------------------- |
| Framework        | Next.js 14 — App Router   |
| Language         | TypeScript                |
| Styling          | Tailwind CSS              |
| Icons            | Lucide React              |
| State Management | Zustand                   |
| AI               | Groq API                  |
| AI Model         | `openai/gpt-oss-120b` (via Groq) |
| Virtualization   | `@tanstack/react-virtual` |
| Unit Testing     | Vitest                    |
| E2E Testing      | Playwright                |
| Deployment       | Vercel                    |
| Storage          | localStorage / sessionStorage |
| Application Type | Progressive Web App       |

---

## Project Structure

```text
vcc/
├── app/                         # Next.js App Router
│   ├── api/                     # Serverless API routes
│   ├── compare/                 # Historical scan comparison
│   ├── learn/                   # Learning center
│   └── scan/                    # Scan results
│
├── components/                  # React components
│   ├── common/                  # Shared UI components
│   ├── results/                 # Issue cards and result views
│   ├── scanner/                 # Upload and code scanning UI
│   └── ui/                      # Base design system
│
├── lib/                         # Core application logic
│   ├── analyzers/               # Static analysis rules
│   ├── llm/                     # Groq client and AI processing
│   └── reporters/               # Markdown and HTML exporters
│
├── tests/                       # Unit and E2E tests
│
└── public/                      # Static assets and PWA files
```

---

## Getting Started

### Prerequisites

* Node.js
* npm
* A Groq API key if you want the optional AI review (set on the server, see below)

### Installation

Clone the repository:

```bash
git clone https://github.com/alhosseinjr/vcc.git
cd vcc
```

Install dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
GROQ_API_KEY=your_key
ALLOW_USER_GROQ_KEY=false
```

Both are server-only (never prefix them with `NEXT_PUBLIC_`).

* `GROQ_API_KEY` enables the AI review in `/api/analyze` and AI fixes in `/api/fix`. **Without it, only the rule-based layer runs and no code is sent to Groq.**
* `ALLOW_USER_GROQ_KEY=true` additionally lets `/api/fix` accept a key from the browser's Settings page (only when the server has no key of its own). `/api/analyze` never uses a browser-supplied key.

### Run the Development Server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## Testing

Run unit tests with:

```bash
npm run test
```

Run end-to-end tests with:

```bash
npm run test:e2e
```

Run the rule-engine benchmark (Node 22.6+):

```bash
npm run bench
```

---

## Contributing

Contributions are welcome.

You can help improve Vibe-Coded Cleanup by:

* Adding new security rules
* Improving existing analyzers
* Adding language-specific checks
* Improving AI analysis prompts
* Improving the learning content
* Adding test coverage
* Improving performance
* Fixing bugs

Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before submitting a contribution.

---

## License

Vibe-Coded Cleanup is released under the **MIT License**.

See [`LICENSE`](./LICENSE) for the full license text.

---

## Why Vibe-Coded Cleanup?

AI has made software development dramatically more accessible.

But **being able to generate code isn't the same as knowing whether that code is safe, efficient, or production-ready.**

Vibe-Coded Cleanup bridges that gap by turning complex code-review concepts into actionable feedback that anyone can understand.

**Build with AI. Review with confidence. Ship responsibly.**
