import { test, expect } from "@playwright/test";

test.describe("Model Selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for hydration
    await page.waitForTimeout(500);
  });

  test("displays all available models", async ({ page }) => {
    // Check for OpenAI models
    await expect(page.getByRole("button", { name: /GPT-5 Pro/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /GPT-5 Nano/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /GPT-4\.1 Cloud/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /GPT-4\.1-mini/i })).toBeVisible();

    // Check for LM Studio model
    await expect(page.getByRole("button", { name: /Qwen3 8B/i })).toBeVisible();
  });

  test("shows Cloud tag for OpenAI models", async ({ page }) => {
    // The Cloud tags should be visible
    const cloudTags = page.getByText("Cloud");
    await expect(cloudTags.first()).toBeVisible();
  });

  test("shows Local tag for LM Studio model", async ({ page }) => {
    const localButton = page.getByRole("button", { name: /Qwen3 8B.*Local/i });
    await expect(localButton).toBeVisible();
  });

  test("selects a model when clicked", async ({ page }) => {
    // Click on GPT-5 Pro
    await page.getByText("GPT-5 Pro").click();

    // The button should now be selected (has different styling)
    const modelButton = page.getByRole("button", { name: /GPT-5 Pro/i });
    await expect(modelButton).toHaveClass(/bg-sidebar-accent/);
  });

  test("switches between OpenAI and LM Studio models", async ({ page }) => {
    // Select an OpenAI model
    await page.getByText("GPT-4.1-mini").click();
    await page.waitForTimeout(100);

    // Then select LM Studio model
    await page.getByText("Qwen3 8B (Local)").click();

    // LM Studio model should be selected
    const localButton = page.getByRole("button", { name: /Qwen3 8B/i });
    await expect(localButton).toHaveClass(/bg-sidebar-accent/);
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
