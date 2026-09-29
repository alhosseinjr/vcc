import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))", fg: "hsl(var(--fg))", muted: "hsl(var(--muted))",
        card: "hsl(var(--card))", border: "hsl(var(--border))",
        accent: "hsl(var(--accent))", "accent-fg": "hsl(var(--accent-fg))",
      },
      borderRadius: { xl: "0.9rem" },
    },
  },
  plugins: [],
};
export default config;
