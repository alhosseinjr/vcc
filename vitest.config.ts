import { defineConfig } from "vitest/config";
// Unit tests only; Playwright specs live in tests/e2e and run with `npm run test:e2e`.
export default defineConfig({ test: { include: ["tests/*.test.ts"] } });
