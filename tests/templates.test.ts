import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TEMPLATE_FIELDS,
  TEMPLATE_ARRAY_FIELDS,
  TEMPLATE_NUMBER_FIELDS,
  TEMPLATE_BOOLEAN_FIELDS,
  applyTemplateToForm,
  extractPersonaData,
  getTemplatePreview,
  TEMPLATE_ICONS,
} from "@/lib/templates";
import type { CharacterTemplate } from "@/lib/hooks/use-templates";

// Mock fetch for API tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Templates API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/templates", () => {
    it("should return empty array when no templates exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const res = await fetch("/api/templates");
      const data = await res.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it("should return user templates", async () => {
      const mockTemplates = [
        { id: "1", name: "Test Template", icon: "📝" },
        { id: "2", name: "Another Template", icon: "💡" },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      const res = await fetch("/api/templates");
      const data = await res.json();

      expect(data.length).toBe(2);
      expect(data[0].name).toBe("Test Template");
    });
  });

  describe("POST /api/templates", () => {
    it("should create a template from character", async () => {
      const newTemplate = {
        id: "new-1",
        name: "My Template",
        icon: "🔥",
        personality: "Friendly and helpful",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => newTemplate,
      });

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromCharacterId: "char-123",
          name: "My Template",
          icon: "🔥",
        }),
      });
      const data = await res.json();

      expect(data.name).toBe("My Template");
      expect(data.icon).toBe("🔥");
    });

    it("should require name when creating template directly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "name is required" }),
      });

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icon: "📝" }),
      });

      expect(res.ok).toBe(false);
    });
  });

  describe("PATCH /api/templates/:id", () => {
    it("should update template name and icon", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "1",
          name: "Updated Name",
          icon: "⭐",
        }),
      });

      const res = await fetch("/api/templates/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name", icon: "⭐" }),
      });
      const data = await res.json();

      expect(data.name).toBe("Updated Name");
      expect(data.icon).toBe("⭐");
    });
  });

  describe("DELETE /api/templates/:id", () => {
    it("should delete a template", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const res = await fetch("/api/templates/1", { method: "DELETE" });
      const data = await res.json();

      expect(data.success).toBe(true);
    });

    it("should return 404 for non-existent template", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Template not found" }),
      });

      const res = await fetch("/api/templates/non-existent", { method: "DELETE" });

      expect(res.ok).toBe(false);
    });
  });
});

describe("Template Utilities", () => {
  describe("TEMPLATE_FIELDS", () => {
    it("should contain all expected string fields", () => {
      expect(TEMPLATE_FIELDS).toContain("personality");
      expect(TEMPLATE_FIELDS).toContain("toneStyle");
      expect(TEMPLATE_FIELDS).toContain("boundaries");
      expect(TEMPLATE_FIELDS).toContain("roleRules");
      expect(TEMPLATE_FIELDS).toContain("description");
      expect(TEMPLATE_FIELDS).toContain("background");
    });

    it("should have array fields defined", () => {
      expect(TEMPLATE_ARRAY_FIELDS).toContain("tags");
    });

    it("should have number fields defined", () => {
      expect(TEMPLATE_NUMBER_FIELDS).toContain("defaultTemperature");
    });

    it("should have boolean fields defined", () => {
      expect(TEMPLATE_BOOLEAN_FIELDS).toContain("nsfwEnabled");
      expect(TEMPLATE_BOOLEAN_FIELDS).toContain("evolveEnabled");
    });
  });

  describe("applyTemplateToForm", () => {
    it("should apply string fields from template", () => {
      const setValue = vi.fn();
      const template: Partial<CharacterTemplate> = {
        personality: "Friendly",
        toneStyle: "Casual",
        nsfwEnabled: false,
        evolveEnabled: false,
      };

      applyTemplateToForm(template as CharacterTemplate, setValue);

      expect(setValue).toHaveBeenCalledWith("personality", "Friendly");
      expect(setValue).toHaveBeenCalledWith("toneStyle", "Casual");
    });

    it("should clone array fields to avoid mutation", () => {
      const setValue = vi.fn();
      const originalTags = ["Work", "Technical"];
      const template: Partial<CharacterTemplate> = {
        tags: originalTags,
        nsfwEnabled: false,
        evolveEnabled: false,
      };

      applyTemplateToForm(template as CharacterTemplate, setValue);

      const setValueCall = setValue.mock.calls.find((call) => call[0] === "tags");
      expect(setValueCall).toBeDefined();
      expect(setValueCall![1]).not.toBe(originalTags); // Should be a clone
      expect(setValueCall![1]).toEqual(originalTags);
    });

    it("should always set boolean fields even if false", () => {
      const setValue = vi.fn();
      const template: Partial<CharacterTemplate> = {
        nsfwEnabled: false,
        evolveEnabled: true,
      };

      applyTemplateToForm(template as CharacterTemplate, setValue);

      expect(setValue).toHaveBeenCalledWith("nsfwEnabled", false);
      expect(setValue).toHaveBeenCalledWith("evolveEnabled", true);
    });
  });

  describe("extractPersonaData", () => {
    it("should extract all persona fields from source", () => {
      const source = {
        id: "123",
        name: "Test",
        personality: "Friendly",
        toneStyle: "Casual",
        nsfwEnabled: true,
        evolveEnabled: false,
      };

      const result = extractPersonaData(source);

      expect(result.personality).toBe("Friendly");
      expect(result.toneStyle).toBe("Casual");
      expect(result.nsfwEnabled).toBe(true);
      expect(result.evolveEnabled).toBe(false);
    });

    it("should default missing fields to null or false", () => {
      const source = {};

      const result = extractPersonaData(source);

      expect(result.personality).toBeNull();
      expect(result.tags).toBeNull();
      expect(result.nsfwEnabled).toBe(false);
      expect(result.evolveEnabled).toBe(false);
    });
  });

  describe("getTemplatePreview", () => {
    it("should return description if available", () => {
      const template: Partial<CharacterTemplate> = {
        description: "A helpful coding assistant",
        nsfwEnabled: false,
        evolveEnabled: false,
      };

      const preview = getTemplatePreview(template as CharacterTemplate);

      expect(preview).toContain("A helpful coding assistant");
    });

    it("should fall back to personality if no description", () => {
      const template: Partial<CharacterTemplate> = {
        personality: "Friendly and patient",
        nsfwEnabled: false,
        evolveEnabled: false,
      };

      const preview = getTemplatePreview(template as CharacterTemplate);

      expect(preview).toContain("Friendly and patient");
    });

    it("should truncate long descriptions", () => {
      const longDesc = "A".repeat(150);
      const template: Partial<CharacterTemplate> = {
        description: longDesc,
        nsfwEnabled: false,
        evolveEnabled: false,
      };

      const preview = getTemplatePreview(template as CharacterTemplate);

      expect(preview.length).toBeLessThan(longDesc.length);
      expect(preview).toContain("...");
    });

    it("should include tags in preview", () => {
      const template: Partial<CharacterTemplate> = {
        description: "Test",
        tags: ["Work", "Technical"],
        nsfwEnabled: false,
        evolveEnabled: false,
      };

      const preview = getTemplatePreview(template as CharacterTemplate);

      expect(preview).toContain("Tags: Work, Technical");
    });

    it("should indicate NSFW when enabled", () => {
      const template: Partial<CharacterTemplate> = {
        description: "Test",
        nsfwEnabled: true,
        evolveEnabled: false,
      };

      const preview = getTemplatePreview(template as CharacterTemplate);

      expect(preview).toContain("NSFW enabled");
    });
  });

  describe("TEMPLATE_ICONS", () => {
    it("should contain common emoji icons", () => {
      expect(TEMPLATE_ICONS).toContain("📝");
      expect(TEMPLATE_ICONS).toContain("💡");
      expect(TEMPLATE_ICONS).toContain("🔥");
      expect(TEMPLATE_ICONS.length).toBeGreaterThan(10);
    });
  });
});
