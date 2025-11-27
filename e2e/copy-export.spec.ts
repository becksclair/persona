import { test, expect } from "@playwright/test";
import { isLmStudioRunning, sendChatMessage, waitForAssistantResponse, selectModel } from "./helpers";

/**
 * E2E tests for copy and export functionality.
 */

test.describe("Message Copy", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("shows copy button on message hover", async ({ page }) => {
    // Skip if no LM Studio
    const lmStudioRunning = await isLmStudioRunning();
    if (!lmStudioRunning) {
      test.skip(true, "LM Studio not running");
      return;
    }

    await selectModel(page, /Qwen3 8B/i);
    await sendChatMessage(page, "Say just 'Hello'");
    await waitForAssistantResponse(page, 60000);

    // Hover over assistant message
    const assistantMessage = page.getByTestId("assistant-message").first();
    await assistantMessage.hover();

    // Copy button should appear
    const copyButton = assistantMessage.getByRole("button", { name: /copy/i });
    await expect(copyButton).toBeVisible();
  });

  test("copy button shows checkmark after clicking", async ({ page }) => {
    const lmStudioRunning = await isLmStudioRunning();
    if (!lmStudioRunning) {
      test.skip(true, "LM Studio not running");
      return;
    }

    await selectModel(page, /Qwen3 8B/i);
    await sendChatMessage(page, "Say just 'Test'");
    await waitForAssistantResponse(page, 60000);

    const assistantMessage = page.getByTestId("assistant-message").first();
    await assistantMessage.hover();

    const copyButton = assistantMessage.getByRole("button", { name: /copy/i });
    await copyButton.click();

    // Should show checkmark (aria-label changes to "Copied")
    await expect(assistantMessage.getByRole("button", { name: /copied/i })).toBeVisible();
  });
});

test.describe("Chat Export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("export button hidden when no messages", async ({ page }) => {
    const exportButton = page.getByRole("button", { name: /export/i });
    await expect(exportButton).not.toBeVisible();
  });

  test("export button visible after sending message", async ({ page }) => {
    const lmStudioRunning = await isLmStudioRunning();
    if (!lmStudioRunning) {
      test.skip(true, "LM Studio not running");
      return;
    }

    await selectModel(page, /Qwen3 8B/i);
    await sendChatMessage(page, "Hi");
    await waitForAssistantResponse(page, 60000);

    const exportButton = page.getByRole("button", { name: /export/i });
    await expect(exportButton).toBeVisible();
  });

  test("export menu shows markdown and JSON options", async ({ page }) => {
    const lmStudioRunning = await isLmStudioRunning();
    if (!lmStudioRunning) {
      test.skip(true, "LM Studio not running");
      return;
    }

    await selectModel(page, /Qwen3 8B/i);
    await sendChatMessage(page, "Hi");
    await waitForAssistantResponse(page, 60000);

    const exportButton = page.getByRole("button", { name: /export/i });
    await exportButton.click();

    await expect(page.getByText(/export as markdown/i)).toBeVisible();
    await expect(page.getByText(/export as json/i)).toBeVisible();
  });
});

test.describe("Keyboard Shortcuts", () => {
  test("Escape blurs input", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    const input = page.getByPlaceholder(/message/i);
    await input.focus();
    await expect(input).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(input).not.toBeFocused();
  });

  test("Enter sends message when enterSendsMessage is true", async ({ page }) => {
    const lmStudioRunning = await isLmStudioRunning();
    if (!lmStudioRunning) {
      test.skip(true, "LM Studio not running");
      return;
    }

    await page.goto("/");
    await selectModel(page, /Qwen3 8B/i);

    const input = page.getByPlaceholder(/message/i);
    await input.fill("Test message");
    await page.keyboard.press("Enter");

    // User message should appear
    await expect(page.getByTestId("user-message")).toBeVisible();
  });
});
