# Vibe-Coded Cleanup 🧹✨

A free, instantly-available code review tool built specifically for non-technical creators using AI coding assistants.

When you use AI (like ChatGPT, Claude, or Cursor) to build an app, it often takes shortcuts. It leaves secrets in the code, creates security vulnerabilities, and writes slow database queries. **Vibe-Coded Cleanup** finds these hidden issues and explains them in plain English, providing safe, copy-paste fixes so you can confidently launch your app.

---

## 🌟 Features

- **No installation required**: Runs entirely in your browser.
- **100% Free**: Leverages free-tier APIs (Groq) and local storage so it costs nothing to run.
- **Plain English**: No jargon. Every issue includes a real-world analogy.
- **Auto-Fixes**: Click a button to get corrected code, or download a patched ZIP.
- **Compare Scans**: Track your progress over time and watch your Health Score improve.
- **Learning Center**: Build your knowledge with bite-sized, interactive security lessons.
- **Offline Capable**: Install it as a PWA and scan rule-based issues without an internet connection!

---

## 🚀 How to use

1. Go to [vibe-coded-cleanup.vercel.app](https://vibe-coded-cleanup.vercel.app)
2. Drag and drop your project folder (or a ZIP file) into the browser.
3. Review the issues and click "Fix all" to download a patched, secure version of your app.

---

## 🏗️ Architecture & Stack

Vibe-Coded Cleanup is built for speed, privacy, and simplicity.

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: Zustand
- **Editor**: Monaco Editor (lazy-loaded)
- **AI Integration**: Groq API (Llama 3 70B)
- **Testing**: Playwright (E2E), Vitest (Unit)

### Core Systems

1. **Two-Layer Analysis Engine**:
   - **Rule-based (Client & Edge)**: Extremely fast regex, AST, and indentation parsing using deterministic rules (`lib/analyzers/`). Fully offline-capable.
   - **Semantic AI (Edge API)**: Passes complex logic through Llama 3 on Groq (`/api/analyze`) with aggressive chunking to stay within free-tier rate limits.
2. **Ephemeral Storage Architecture**:
   - User code is **never** saved to a database. It is processed in memory on Vercel Edge functions and immediately discarded.
   - History, preferences, and API keys are stored strictly in `localStorage` / `IndexedDB` on the user's device.
3. **Progressive Web App (PWA)**:
   - Registers a Service Worker (`sw.js`) to aggressively cache assets.
   - Includes a native "Install App" button for desktop/mobile.
4. **Virtualization**:
   - Uses `@tanstack/react-virtual` to ensure 60fps scrolling even if an AI generation spits out thousands of issues.

---

## 📂 Project Structure

\`\`\`
vcc/
├── app/                  # Next.js App Router (Pages, API routes, SEO)
│   ├── api/              # Serverless API routes (Groq integration)
│   ├── compare/          # Compare historical scans view
│   ├── learn/            # Learning center view
│   └── scan/             # Individual scan results view
├── components/           # React Components
│   ├── common/           # Shared UI (Header, Toasts, PWA updater)
│   ├── results/          # Issue cards, virtualized lists, fix-all dialog
│   ├── scanner/          # Drag & Drop zone, Monaco paste editor
│   └── ui/               # Base design system (Buttons, inputs)
├── lib/                  # Core Business Logic
│   ├── analyzers/        # Rule definitions (Regex, Python, AST)
│   ├── llm/              # Groq client wrapper and chunking logic
│   └── reporters/        # Markdown & HTML export generators
├── tests/                # Vitest unit tests & Playwright E2E tests
└── public/               # Static assets, PWA manifest, SEO images
\`\`\`

---

## 💻 Running Locally

1. Clone the repository: \`git clone https://github.com/your-username/vibe-coded-cleanup.git\`
2. Install dependencies: \`npm install\`
3. (Optional) Set up your `.env.local` with \`GROQ_API_KEY=your_key\` to bypass the client-side key requirement.
4. Run the development server: \`npm run dev\`
5. Open [http://localhost:3000](http://localhost:3000)

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to add new security rules, run tests, and improve the project.

## 📄 License

MIT License.
