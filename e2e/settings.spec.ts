import { test, expect } from "@playwright/test";

/**
 * E2E tests for settings dialog and persistence.
 */

test.describe("Settings Dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
  });

  test("opens settings dialog when clicking settings button", async ({ page }) => {
    const settingsButton = page.getByRole("button", { name: /settings/i });
    await settingsButton.click();

    // Settings dialog should be visible
    await expect(page.getByText(/keyboard/i)).toBeVisible();
    await expect(page.getByText(/theme/i)).toBeVisible();
  });

  test("shows keyboard shortcuts section", async ({ page }) => {
    const settingsButton = page.getByRole("button", { name: /settings/i });
    await settingsButton.click();

    // Should show keyboard tab
    const keyboardTab = page.getByRole("button", { name: /keyboard/i });
    await keyboardTab.click();

    // Should show enter sends toggle
    await expect(page.getByText(/enter sends message/i)).toBeVisible();
  });

  test("shows theme selection", async ({ page }) => {
    const settingsButton = page.getByRole("button", { name: /settings/i });
    await settingsButton.click();

    // Click theme tab
    const themeTab = page.getByRole("button", { name: /theme/i });
    await themeTab.click();

    // Should show theme options
    await expect(page.getByText(/light/i)).toBeVisible();
    await expect(page.getByText(/dark/i)).toBeVisible();
    await expect(page.getByText(/system/i)).toBeVisible();
  });

  test("can toggle enter sends message setting", async ({ page }) => {
    const settingsButton = page.getByRole("button", { name: /settings/i });
    await settingsButton.click();

    // Find the toggle switch
    const toggle = page.getByRole("switch");
    const initialState = await toggle.isChecked();

    // Toggle it
    await toggle.click();
    await page.waitForTimeout(500);

    // Should have changed
    const newState = await toggle.isChecked();
    expect(newState).not.toBe(initialState);
  });

  test("theme selection changes theme", async ({ page }) => {
    const settingsButton = page.getByRole("button", { name: /settings/i });
    await settingsButton.click();

    // Click theme tab
    const themeTab = page.getByRole("button", { name: /theme/i });
    await themeTab.click();

    // Select dark theme
    const darkButton = page.getByRole("button", { name: /dark/i }).last();
    await darkButton.click();
    await page.waitForTimeout(500);

    // HTML should have dark class
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");
  });

  test("closes settings with close button", async ({ page }) => {
    const settingsButton = page.getByRole("button", { name: /settings/i });
    await settingsButton.click();

    await expect(page.getByText(/keyboard/i)).toBeVisible();

    // Close button
    const closeButton = page.getByRole("button", { name: /close/i });
    await closeButton.click();

    // Settings should be hidden
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});

test.describe("Settings Persistence", () => {
  test("persists theme preference after reload", async ({ page }) => {
    await page.goto("/");

    // Open settings and set dark theme
    const settingsButton = page.getByRole("button", { name: /settings/i });
    await settingsButton.click();

    const themeTab = page.getByRole("button", { name: /theme/i });
    await themeTab.click();

    const darkButton = page.getByRole("button", { name: /dark/i }).last();
    await darkButton.click();
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Theme should still be dark
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");
  });
});
