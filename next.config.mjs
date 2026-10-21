// Strict-ish CSP. Next.js needs inline scripts for hydration, so we allow 'unsafe-inline'
// for scripts but never 'unsafe-eval' in production. Groq (AI) and GitHub (repo fetch)
// are the only external APIs; mermaid, d3-hierarchy and the diff viewer are bundled locally.
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://api.groq.com https://api.github.com https://raw.githubusercontent.com",
  "frame-ancestors 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    }];
  },
};
export default nextConfig;
