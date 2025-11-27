import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    // Run tests sequentially to avoid overwhelming LM Studio
    fileParallelism: false,
    // Environment variables for tests
    env: {
      DATABASE_URL: "postgresql://persona:persona_dev@localhost:5432/persona_test",
      LM_STUDIO_BASE_URL: "http://localhost:1234/v1",
      // Faster retries for tests (see lib/rag/constants.ts)
      TEST_RETRY_ATTEMPTS: "2",
      TEST_RETRY_DELAY_MS: "500",
    },
    // Longer timeout for embedding tests (LM Studio can be slow)
    testTimeout: 120000,
    hookTimeout: 60000,
    coverage: {
      reporter: ["text", "html"],
      include: ["lib/**/*.ts", "components/**/*.tsx"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
