# Contributing to Vibe-Coded Cleanup

Thanks for helping make the web safer for AI-assisted creators! 

## Philosophy

This project is built for **non-technical users**. 
- Never use jargon in user-facing text (e.g. use "Any website can call your API" instead of "CORS Wildcard").
- Always include an analogy for security issues.
- Keep the UI simple, fast, and accessible.

## Adding new Rules

We use a two-layer scanning approach:
1. **Rule-based (Regex/AST/Indentation)**: Fast, offline, deterministic.
2. **AI-based (Groq + Llama 3)**: Deeper semantic understanding.

To add a new rule, add it to one of the analyzers in `lib/analyzers/`. 
For example, to add a new regex rule for JavaScript, edit `lib/analyzers/regex-analyzer.ts`:

\`\`\`typescript
{ 
  id: "my-new-rule", 
  re: /bad_code_pattern/i, 
  severity: "high", 
  category: "security", 
  confidence: "medium",
  title: "Plain English Title", 
  explanation: "What this means in simple terms.",
  analogy: "Like leaving your keys in the ignition.", 
  fix: "The code to fix it." 
}
\`\`\`

## Running tests

\`\`\`bash
npm run typecheck
npm run test:e2e
\`\`\`
