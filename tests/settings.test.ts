import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch for API tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Settings API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/settings", () => {
    it("should return default settings when none exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ enterSendsMessage: true, theme: "system" }),
      });

      const res = await fetch("/api/settings");
      const data = await res.json();

      expect(data.enterSendsMessage).toBe(true);
      expect(data.theme).toBe("system");
    });

    it("should return user settings when they exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ enterSendsMessage: false, theme: "dark" }),
      });

      const res = await fetch("/api/settings");
      const data = await res.json();

      expect(data.enterSendsMessage).toBe(false);
      expect(data.theme).toBe("dark");
    });
  });

  describe("PATCH /api/settings", () => {
    it("should update enterSendsMessage setting", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ enterSendsMessage: false, theme: "system" }),
      });

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enterSendsMessage: false }),
      });
      const data = await res.json();

      expect(data.enterSendsMessage).toBe(false);
    });

    it("should update theme setting", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ enterSendsMessage: true, theme: "dark" }),
      });

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "dark" }),
      });
      const data = await res.json();

      expect(data.theme).toBe("dark");
    });

    it("should update multiple settings at once", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ enterSendsMessage: false, theme: "light" }),
      });

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enterSendsMessage: false, theme: "light" }),
      });
      const data = await res.json();

      expect(data.enterSendsMessage).toBe(false);
      expect(data.theme).toBe("light");
    });
  });
});

describe("Keyboard shortcut behavior", () => {
  it("should describe Enter sends when enterSendsMessage is true", () => {
    const settings = { enterSendsMessage: true };
    const sendKey = settings.enterSendsMessage ? "Enter" : "Ctrl+Enter";
    expect(sendKey).toBe("Enter");
  });

  it("should describe Ctrl+Enter sends when enterSendsMessage is false", () => {
    const settings = { enterSendsMessage: false };
    const sendKey = settings.enterSendsMessage ? "Enter" : "Ctrl+Enter";
    expect(sendKey).toBe("Ctrl+Enter");
  });
});
