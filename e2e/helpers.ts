import type { Page } from "@playwright/test";

/**
 * Check if LM Studio is running by querying its models endpoint
 * Called from Node.js context (not browser)
 */
export async function isLmStudioRunning(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:1234/v1/models");
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get available models from LM Studio
 * Returns empty array if LM Studio is not running
 */
export async function getLmStudioModels(): Promise<string[]> {
  try {
    const res = await fetch("http://localhost:1234/v1/models");
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.map((m: { id: string }) => m.id) || [];
  } catch {
    return [];
  }
}

/**
 * Clear browser storage and reload for clean test state
 */
export async function resetPageState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
}

/**
 * Wait for chat response with proper timeout handling
 */
export async function waitForAssistantResponse(page: Page, timeoutMs = 30000): Promise<boolean> {
  try {
    await page.locator('[data-testid="assistant-message"]').waitFor({
      state: "visible",
      timeout: timeoutMs,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Send a chat message and wait for it to appear
 */
export async function sendChatMessage(page: Page, message: string): Promise<void> {
  const input = page.getByPlaceholder(/message/i);
  await input.fill(message);
  await page.keyboard.press("Enter");

  // Wait for user message to appear
  await page.locator('[data-testid="user-message"]').waitFor({
    state: "visible",
    timeout: 5000,
  });
}

/**
 * Select a model by name pattern
 */
export async function selectModel(page: Page, namePattern: RegExp): Promise<void> {
  await page.getByRole("button", { name: namePattern }).click();
  await page.waitForTimeout(100); // Allow state to settle
}
