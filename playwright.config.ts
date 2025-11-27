import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 *
 * Run commands:
 *   pnpm test:e2e         - All tests except @openai
 *   pnpm test:e2e:openai  - Only @openai tests
 *   pnpm test:e2e:all     - All tests
 *   pnpm test:e2e:ui      - Interactive UI mode
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60000, // 60s timeout for local LLM tests
  expect: {
    timeout: 10000, // Default expect timeout
  },
  reporter: [
    ["list"], // Console output
    ["html", { open: "never" }], // HTML report (don't auto-open)
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure", // Capture screenshot on test failure
    video: "retain-on-failure", // Keep video on failure for debugging
    // Start each test with clean storage
    storageState: undefined,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: "ignore", // Don't clutter test output
    stderr: "pipe",
  },
});
