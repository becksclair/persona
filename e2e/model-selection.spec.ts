import { test, expect } from "@playwright/test";

test.describe("Model Selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for hydration
    await page.waitForTimeout(500);
  });

  test("displays available models from config", async ({ page }) => {
    // Check for OpenAI models (from config/models.json)
    await expect(page.getByRole("button", { name: /GPT-4\.1$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /GPT-4\.1 Mini/i })).toBeVisible();

    // Check for LM Studio model
    await expect(page.getByRole("button", { name: /Qwen3 8B/i })).toBeVisible();
  });

  test("shows Cloud tag for OpenAI models", async ({ page }) => {
    // The Cloud tags should be visible
    const cloudTags = page.getByText("Cloud");
    await expect(cloudTags.first()).toBeVisible();
  });

  test("shows Local tag for LM Studio model", async ({ page }) => {
    const localButton = page.getByRole("button", { name: /Qwen3 8B/i });
    await expect(localButton).toBeVisible();
    // Should have Local tag nearby
    await expect(page.getByText("Local").first()).toBeVisible();
  });

  test("displays model metadata (context window, speed, cost)", async ({ page }) => {
    // Models should show context window info
    await expect(page.getByText(/128K/)).toBeVisible();
    // Should show speed indicators
    await expect(page.getByText(/⚡/)).toBeVisible();
    // Should show cost indicators
    await expect(page.getByText(/\$+|Free/)).toBeVisible();
  });

  test("shows availability indicator dot", async ({ page }) => {
    // Each model should have a colored availability dot
    const availabilityDots = page.locator(".w-2.h-2.rounded-full");
    await expect(availabilityDots.first()).toBeVisible();
  });

  test("selects a model when clicked", async ({ page }) => {
    // Click on GPT-4.1
    await page.getByText("GPT-4.1", { exact: false }).first().click();

    // The button should now be selected (has different styling)
    const modelButton = page.getByRole("button", { name: /GPT-4\.1/i }).first();
    await expect(modelButton).toHaveClass(/bg-sidebar-accent/);
  });

  test("switches between OpenAI and LM Studio models", async ({ page }) => {
    // Select an OpenAI model
    await page.getByText("GPT-4.1 Mini").click();
    await page.waitForTimeout(100);

    // Then select LM Studio model
    await page.getByText("Qwen3 8B").click();

    // LM Studio model should be selected
    const localButton = page.getByRole("button", { name: /Qwen3 8B/i });
    await expect(localButton).toHaveClass(/bg-sidebar-accent/);
  });

  test("persists model selection", async ({ page }) => {
    // Select a specific model
    await page.getByText("GPT-4.1 Mini").click();
    await page.waitForTimeout(200);

    // Reload the page
    await page.reload();
    await page.waitForTimeout(500);

    // Model should still be selected (persisted in localStorage)
    const modelButton = page.getByRole("button", { name: /GPT-4\.1 Mini/i });
    await expect(modelButton).toHaveClass(/bg-sidebar-accent/);
  });
});

test.describe("Personality Selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("displays personality selector", async ({ page }) => {
    await expect(page.getByText("Character Profile")).toBeVisible();
  });

  test("shows available personalities in dropdown", async ({ page }) => {
    // Click the personality select
    const selectTrigger = page.locator('[data-slot="select-trigger"]').first();
    await selectTrigger.click();

    // Check for personalities in dropdown
    await expect(page.getByRole("option", { name: /Sam \(Friend\)/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /Therapist/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /Coding Guru/i })).toBeVisible();
  });
});

test.describe("Temperature Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("displays temperature slider", async ({ page }) => {
    await expect(page.getByText("Temperature")).toBeVisible();
  });

  test("shows current temperature value", async ({ page }) => {
    // Default temperature is 0.7
    await expect(page.getByText("0.7")).toBeVisible();
  });
});
