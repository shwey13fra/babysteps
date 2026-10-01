import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mirrors the "@/*" path alias in tsconfig.json. Without it the test imports
  // resolve under tsc but not under vitest.
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    // The engine reads data/rules/*.yaml and data/glossary.de-en.yaml relative to
    // process.cwd(), so tests must run from the repo root.
    root: ".",
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
