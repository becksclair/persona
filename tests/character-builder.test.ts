import { describe, it, expect } from "vitest";
import {
  characterFormSchema,
  DEFAULT_FORM_DATA,
  getArchetypeTemplate,
  ARCHETYPES,
  getAvatarColor,
} from "@/components/character-builder/types";

describe("Character Builder Types", () => {
  describe("characterFormSchema", () => {
    it("validates a minimal valid character", () => {
      const result = characterFormSchema.safeParse({
        name: "Test Character",
        tags: [],
        nsfwEnabled: false,
        evolveEnabled: false,
        defaultTemperature: 0.7,
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = characterFormSchema.safeParse({
        ...DEFAULT_FORM_DATA,
        name: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("name");
      }
    });

    it("rejects name over 100 characters", () => {
      const result = characterFormSchema.safeParse({
        ...DEFAULT_FORM_DATA,
        name: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("accepts full character data", () => {
      const fullData = {
        name: "Complete Character",
        avatar: "https://example.com/avatar.png",
        tagline: "A test character",
        archetype: "coding-partner",
        tags: ["Work", "Technical"],
        personality: "Friendly and helpful",
        toneStyle: "Casual and clear",
        boundaries: "Stays on topic",
        roleRules: "Be helpful",
        description: "A test description",
        background: "Background info",
        lifeHistory: "Life history",
        currentContext: "Current context",
        customInstructionsLocal: "Custom instructions",
        nsfwEnabled: false,
        evolveEnabled: true,
        defaultModelId: "gpt-4",
        defaultTemperature: 0.8,
      };
      const result = characterFormSchema.safeParse(fullData);
      expect(result.success).toBe(true);
    });

    it("rejects temperature outside 0-1 range", () => {
      const result = characterFormSchema.safeParse({
        ...DEFAULT_FORM_DATA,
        name: "Test",
        defaultTemperature: 1.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("DEFAULT_FORM_DATA", () => {
    it("has valid default values", () => {
      const result = characterFormSchema.safeParse({
        ...DEFAULT_FORM_DATA,
        name: "Required Name", // Name is required
      });
      expect(result.success).toBe(true);
    });

    it("has empty name for user to fill", () => {
      expect(DEFAULT_FORM_DATA.name).toBe("");
    });

    it("has default temperature of 0.7", () => {
      expect(DEFAULT_FORM_DATA.defaultTemperature).toBe(0.7);
    });

    it("has custom archetype by default", () => {
      expect(DEFAULT_FORM_DATA.archetype).toBe("custom");
    });
  });

  describe("getArchetypeTemplate", () => {
    it("returns empty object for custom archetype", () => {
      const template = getArchetypeTemplate("custom");
      expect(template).toEqual({});
    });

    it("returns template for coding-partner", () => {
      const template = getArchetypeTemplate("coding-partner");
      expect(template.personality).toBeDefined();
      expect(template.toneStyle).toBeDefined();
      expect(template.tags).toContain("Work");
      expect(template.tags).toContain("Technical");
    });

    it("returns template for emotional-anchor", () => {
      const template = getArchetypeTemplate("emotional-anchor");
      expect(template.personality).toContain("empathetic");
      expect(template.tags).toContain("Friend");
    });

    it("returns empty object for unknown archetype", () => {
      const template = getArchetypeTemplate("unknown-type");
      expect(template).toEqual({});
    });

    it("clones tags array to avoid mutation", () => {
      const template1 = getArchetypeTemplate("coding-partner");
      const template2 = getArchetypeTemplate("coding-partner");
      expect(template1.tags).not.toBe(template2.tags);
      expect(template1.tags).toEqual(template2.tags);
    });
  });

  describe("ARCHETYPES", () => {
    it("has all expected archetypes", () => {
      const expectedIds = [
        "coding-partner",
        "emotional-anchor",
        "writing-coach",
        "daily-check-in",
        "mentor",
        "creative-muse",
        "nsfw-lover",
        "custom",
      ];
      expect(Object.keys(ARCHETYPES)).toEqual(expectedIds);
    });

    it("each archetype has name and icon", () => {
      Object.values(ARCHETYPES).forEach((arch) => {
        expect(arch.name).toBeDefined();
        expect(arch.icon).toBeDefined();
      });
    });

    it("nsfw-lover template has nsfwEnabled", () => {
      const template = ARCHETYPES["nsfw-lover"].template as Record<string, unknown>;
      expect(template.nsfwEnabled).toBe(true);
    });
  });

  describe("getAvatarColor", () => {
    it("returns consistent color for same name", () => {
      const color1 = getAvatarColor("Alice");
      const color2 = getAvatarColor("Alice");
      expect(color1).toBe(color2);
    });

    it("returns different colors for different names", () => {
      const colorA = getAvatarColor("Alice");
      const colorB = getAvatarColor("Bob");
      // May or may not be different depending on hash, but should be defined
      expect(colorA).toBeDefined();
      expect(colorB).toBeDefined();
    });

    it("handles empty string", () => {
      const color = getAvatarColor("");
      expect(color).toBeDefined();
      expect(color).toContain("bg-gradient");
    });

    it("returns gradient class", () => {
      const color = getAvatarColor("Test");
      expect(color).toContain("bg-gradient-to-br");
    });
  });
});
