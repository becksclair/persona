import { test, expect } from "@playwright/test";
import {
  isLmStudioRunning,
  resetPageState,
  sendChatMessage,
  selectModel,
  waitForAssistantResponse,
} from "./helpers";

/**
 * Chat E2E tests
 * - Uses qwen/qwen3-8b (LM Studio) for local model testing
 * - Uses gpt-5-nano for remote OpenAI tests (tagged with @openai)
 */

test.describe("Chat Interface", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("displays chat input", async ({ page }) => {
    const input = page.getByPlaceholder(/message|type|ask/i);
    await expect(input).toBeVisible();
  });

  test("displays send button", async ({ page }) => {
    // Look for send button (could be an icon button)
    const sendButton = page.locator("button").filter({ hasText: /send/i }).or(
      page.locator('button[type="submit"]')
    );
    await expect(sendButton.first()).toBeVisible();
  });
});

test.describe("Chat with LM Studio (qwen3-8b)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await resetPageState(page);
    await selectModel(page, /Qwen3 8B/i);
  });

  test("sends message and receives response from local model", async ({ page }) => {
    // Skip if LM Studio is not running
    const lmStudioRunning = await isLmStudioRunning();
    if (!lmStudioRunning) {
      test.skip(true, "LM Studio not running on localhost:1234");
      return;
    }

    await sendChatMessage(page, "Say just 'Hi'");

    // Wait for assistant response (60s timeout for local models)
    const gotResponse = await waitForAssistantResponse(page, 60000);
    expect(gotResponse).toBe(true);
  });
});

test.describe("Chat with OpenAI (gpt-5-nano)", () => {
  // Run with: pnpm test:e2e:openai
  // Note: gpt-5-nano must be a valid model in your OpenAI account

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await resetPageState(page);
    await selectModel(page, /GPT-5 Nano/i);
  });

  test("@openai sends message and receives response from OpenAI", async ({ page }) => {
    await sendChatMessage(page, "Hello, respond with just 'Hi'");

    // Wait for assistant response (20s timeout for cloud API)
    const gotResponse = await waitForAssistantResponse(page, 20000);
    expect(gotResponse).toBe(true);
  });
});

test.describe("Chat State Persistence", () => {
  test("preserves model selection after page reload", async ({ page }) => {
    await page.goto("/");
    // Use exact match to avoid matching GPT-4.1-mini
    await page.getByRole("button", { name: /GPT-4\.1 Cloud$/i }).click();
    await page.waitForTimeout(100);

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // GPT-4.1 should still be selected
    const modelButton = page.getByRole("button", { name: /GPT-4\.1 Cloud$/i });
    await expect(modelButton).toHaveClass(/bg-sidebar-accent/);
  });
});
