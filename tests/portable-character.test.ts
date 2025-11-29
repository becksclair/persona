import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  createPortableExport,
  migrateToCurrentVersion,
  parsePortableMarkdown,
  parsePortableMarkdownBatch,
  portableBatchToMarkdown,
  portableToMarkdown,
  PORTABLE_CHARACTER_VERSION,
  PortableCharacterV1Schema,
  PortableCharacterV1,
  PortableCharacterDataSchema,
  parsePortableCharacter,
  validatePortableCharacter,
  extractPortableFields,
  PORTABLE_FIELDS,
  EXCLUDED_FIELDS,
} from "@/lib/portable-character";
import { parseCharacterMarkdown } from "@/lib/character-loader";

// Mock fetch for API tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("PortableCharacterV1 Schema", () => {
  describe("version constant", () => {
    it("should be PortableCharacterV1", () => {
      expect(PORTABLE_CHARACTER_VERSION).toBe("PortableCharacterV1");
    });
  });

  describe("PORTABLE_FIELDS", () => {
    it("should include all persona fields", () => {
      expect(PORTABLE_FIELDS).toContain("name");
      expect(PORTABLE_FIELDS).toContain("personality");
      expect(PORTABLE_FIELDS).toContain("description");
      expect(PORTABLE_FIELDS).toContain("background");
      expect(PORTABLE_FIELDS).toContain("lifeHistory");
      expect(PORTABLE_FIELDS).toContain("currentContext");
      expect(PORTABLE_FIELDS).toContain("systemRole");
    });

    it("should include behavior rules", () => {
      expect(PORTABLE_FIELDS).toContain("toneStyle");
      expect(PORTABLE_FIELDS).toContain("boundaries");
      expect(PORTABLE_FIELDS).toContain("roleRules");
    });

    it("should include operational fields", () => {
      expect(PORTABLE_FIELDS).toContain("defaultModelId");
      expect(PORTABLE_FIELDS).toContain("defaultTemperature");
      expect(PORTABLE_FIELDS).toContain("maxContextWindow");
    });

    it("should include flags", () => {
      expect(PORTABLE_FIELDS).toContain("nsfwEnabled");
      expect(PORTABLE_FIELDS).toContain("evolveEnabled");
    });
  });

  describe("EXCLUDED_FIELDS", () => {
    it("should exclude user-specific fields", () => {
      expect(EXCLUDED_FIELDS).toContain("id");
      expect(EXCLUDED_FIELDS).toContain("userId");
      expect(EXCLUDED_FIELDS).toContain("createdAt");
      expect(EXCLUDED_FIELDS).toContain("updatedAt");
    });

    it("should exclude internal flags", () => {
      expect(EXCLUDED_FIELDS).toContain("isBuiltIn");
      expect(EXCLUDED_FIELDS).toContain("isArchived");
    });
  });
});

describe("PortableCharacterDataSchema", () => {
  it("should accept valid character data", () => {
    const validData = {
      name: "Test Character",
      personality: "Friendly and helpful",
      tags: ["Work", "Technical"],
    };

    const result = PortableCharacterDataSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should require name field", () => {
    const invalidData = {
      personality: "Friendly",
    };

    const result = PortableCharacterDataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should enforce name max length of 100", () => {
    const tooLongName = { name: "A".repeat(101) };

    const result = PortableCharacterDataSchema.safeParse(tooLongName);
    expect(result.success).toBe(false);
  });

  it("should enforce tagline max length of 200", () => {
    const data = { name: "Test", tagline: "A".repeat(201) };

    const result = PortableCharacterDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("should enforce personality max length of 2000", () => {
    const data = { name: "Test", personality: "A".repeat(2001) };

    const result = PortableCharacterDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("should allow nullable optional fields", () => {
    const data = {
      name: "Test",
      avatar: null,
      tagline: null,
      personality: null,
    };

    const result = PortableCharacterDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should validate temperature range 0-2", () => {
    const validTemp = { name: "Test", defaultTemperature: 0.7 };
    const tooHigh = { name: "Test", defaultTemperature: 3 };
    const tooLow = { name: "Test", defaultTemperature: -1 };

    expect(PortableCharacterDataSchema.safeParse(validTemp).success).toBe(true);
    expect(PortableCharacterDataSchema.safeParse(tooHigh).success).toBe(false);
    expect(PortableCharacterDataSchema.safeParse(tooLow).success).toBe(false);
  });
});

describe("PortableCharacterV1Schema", () => {
  it("should validate complete export structure", () => {
    const validExport = {
      version: "PortableCharacterV1",
      exportedAt: "2024-01-15T10:30:00.000Z",
      character: {
        name: "Test Character",
      },
    };

    const result = PortableCharacterV1Schema.safeParse(validExport);
    expect(result.success).toBe(true);
  });

  it("should require version to be exactly PortableCharacterV1", () => {
    const wrongVersion = {
      version: "PortableCharacterV2",
      exportedAt: "2024-01-15T10:30:00.000Z",
      character: { name: "Test" },
    };

    const result = PortableCharacterV1Schema.safeParse(wrongVersion);
    expect(result.success).toBe(false);
  });

  it("should require exportedAt to be ISO datetime", () => {
    const invalidDate = {
      version: "PortableCharacterV1",
      exportedAt: "not-a-date",
      character: { name: "Test" },
    };

    const result = PortableCharacterV1Schema.safeParse(invalidDate);
    expect(result.success).toBe(false);
  });

  it("should reject unsupported schemaVersion", () => {
    const invalidVersion = {
      version: "PortableCharacterV1",
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
      exportedAt: "2024-01-15T10:30:00.000Z",
      character: { name: "Test" },
    };

    const result = PortableCharacterV1Schema.safeParse(invalidVersion);
    expect(result.success).toBe(false);
  });
});

describe("parsePortableCharacter", () => {
  it("should parse valid export data", () => {
    const validExport = {
      version: "PortableCharacterV1",
      exportedAt: "2024-01-15T10:30:00.000Z",
      character: {
        name: "Test Character",
        personality: "Friendly",
      },
    };

    const result = parsePortableCharacter(validExport);
    expect(result.character.name).toBe("Test Character");
    expect(result.character.personality).toBe("Friendly");
  });

  it("should throw on invalid data", () => {
    const invalidData = { version: "wrong" };

    expect(() => parsePortableCharacter(invalidData)).toThrow();
  });
});

describe("validatePortableCharacter", () => {
  it("should return success true for valid data", () => {
    const validExport = {
      version: "PortableCharacterV1",
      exportedAt: "2024-01-15T10:30:00.000Z",
      character: { name: "Test" },
    };

    const result = validatePortableCharacter(validExport);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("should return error for invalid data", () => {
    const invalidData = { version: "wrong" };

    const result = validatePortableCharacter(invalidData);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("migrateToCurrentVersion", () => {
  it("throws when schemaVersion is unsupported", () => {
    const exportData: PortableCharacterV1 = {
      version: "PortableCharacterV1",
      schemaVersion: 999,
      exportedAt: "2024-01-15T10:30:00.000Z",
      character: { name: "Test" },
    };

    expect(() => migrateToCurrentVersion(exportData)).toThrow("Unsupported schemaVersion");
  });

  it("returns data when schemaVersion matches current", () => {
    const exportData = {
      version: PORTABLE_CHARACTER_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: "2024-01-15T10:30:00.000Z",
      character: { name: "Test" },
    };

    const migrated = migrateToCurrentVersion(exportData);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.character.name).toBe("Test");
  });
});

describe("createPortableExport", () => {
  it("should create export with correct version", () => {
    const characterData = { name: "Test Character" };

    const result = createPortableExport(characterData);

    expect(result.version).toBe("PortableCharacterV1");
  });

  it("should include ISO timestamp", () => {
    const characterData = { name: "Test Character" };

    const result = createPortableExport(characterData);

    expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("should include character data", () => {
    const characterData = {
      name: "Test Character",
      personality: "Friendly",
      tags: ["Work"],
    };

    const result = createPortableExport(characterData);

    expect(result.character.name).toBe("Test Character");
    expect(result.character.personality).toBe("Friendly");
    expect(result.character.tags).toEqual(["Work"]);
  });
});

describe("markdown portability helpers", () => {
  it("exports and parses markdown roundtrip", () => {
    const portable = createPortableExport({
      name: "Markdown Bot",
      personality: "Chill",
      systemRole: "assistant",
      description: "Docs test",
    });

    const md = portableToMarkdown(portable);
    const parsed = parsePortableMarkdown(md);

    expect(parsed.character.name).toBe("Markdown Bot");
    expect(parsed.character.personality).toBe("Chill");
    expect(parsed.character.systemRole).toBe("assistant");
  });

  it("parses concatenated markdown batch", () => {
    const batch = [
      createPortableExport({ name: "One" }),
      createPortableExport({ name: "Two", systemRole: "helper" }),
    ];

    const md = portableBatchToMarkdown(batch);
    const parsed = parsePortableMarkdownBatch(md);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].character.name).toBe("One");
    expect(parsed[1].character.systemRole).toBe("helper");
  });
});

describe("extractPortableFields", () => {
  it("should extract all portable fields", () => {
    const fullCharacter = {
      id: "123",
      userId: "user-456",
      name: "Test",
      personality: "Friendly",
      toneStyle: "Casual",
      tags: ["Work"],
      defaultTemperature: 0.8,
      isBuiltIn: true,
      isArchived: false,
      createdAt: new Date(),
    };

    const result = extractPortableFields(fullCharacter);

    expect(result.name).toBe("Test");
    expect(result.personality).toBe("Friendly");
    expect(result.toneStyle).toBe("Casual");
    expect(result.tags).toEqual(["Work"]);
    expect(result.defaultTemperature).toBe(0.8);
  });

  it("should not include excluded fields", () => {
    const fullCharacter = {
      id: "123",
      userId: "user-456",
      name: "Test",
      isBuiltIn: true,
      createdAt: new Date(),
    };

    const result = extractPortableFields(fullCharacter);

    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("isBuiltIn");
    expect(result).not.toHaveProperty("createdAt");
  });

  it("should convert undefined to null", () => {
    const character = {
      name: "Test",
      personality: undefined,
      avatar: undefined,
    };

    const result = extractPortableFields(character);

    expect(result.personality).toBeNull();
    expect(result.avatar).toBeNull();
  });
});

describe("Import API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/characters/import", () => {
    it("should import valid character data", async () => {
      const exportData = {
        version: "PortableCharacterV1",
        exportedAt: "2024-01-15T10:30:00.000Z",
        character: {
          name: "Imported Character",
          personality: "Helpful",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          character: {
            id: "new-123",
            name: "Imported Character",
            personality: "Helpful",
          },
          renamed: false,
        }),
      });

      const res = await fetch("/api/characters/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportData),
      });
      const data = await res.json();

      expect(res.ok).toBe(true);
      expect(data.character.name).toBe("Imported Character");
      expect(data.renamed).toBe(false);
    });

    it("should auto-rename on conflict", async () => {
      const exportData = {
        version: "PortableCharacterV1",
        exportedAt: "2024-01-15T10:30:00.000Z",
        character: {
          name: "Existing Character",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          character: {
            id: "new-456",
            name: "Existing Character (Imported)",
          },
          renamed: true,
          originalName: "Existing Character",
        }),
      });

      const res = await fetch("/api/characters/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportData),
      });
      const data = await res.json();

      expect(data.renamed).toBe(true);
      expect(data.originalName).toBe("Existing Character");
      expect(data.character.name).toBe("Existing Character (Imported)");
    });

    it("should reject invalid format", async () => {
      const invalidData = {
        version: "WrongVersion",
        character: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: "Invalid character format",
          details: [{ path: "version", message: "Invalid literal value" }],
        }),
      });

      const res = await fetch("/api/characters/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      expect(res.ok).toBe(false);
    });
  });
});

describe("Character Markdown Loader", () => {
  describe("parseCharacterMarkdown", () => {
    it("should parse basic frontmatter", () => {
      const content = `---
id: "test-123"
name: Test Character
tagline: A test character
---

## Personality

Friendly and helpful.
`;

      const result = parseCharacterMarkdown(content);

      expect(result.id).toBe("test-123");
      expect(result.name).toBe("Test Character");
      expect(result.tagline).toBe("A test character");
      expect(result.personality).toBe("Friendly and helpful.");
    });

    it("should parse all frontmatter fields", () => {
      const content = `---
id: "char-456"
name: Full Character
tagline: Complete example
systemRole: helpful assistant
toneStyle: Professional
boundaries: No personal advice
roleRules: Be concise
tags: ["Work", "Technical"]
defaultTemperature: 0.5
nsfwEnabled: false
evolveEnabled: true
---

## Description

A complete test character.
`;

      const result = parseCharacterMarkdown(content);

      expect(result.toneStyle).toBe("Professional");
      expect(result.boundaries).toBe("No personal advice");
      expect(result.roleRules).toBe("Be concise");
      expect(result.tags).toEqual(["Work", "Technical"]);
      expect(result.defaultTemperature).toBe(0.5);
      expect(result.nsfwEnabled).toBe(false);
      expect(result.evolveEnabled).toBe(true);
      expect(result.description).toBe("A complete test character.");
    });

    it("should parse multiple markdown sections", () => {
      const content = `---
id: "multi-section"
name: Multi Section
---

## Personality

Trait one.
Trait two.

## Description

Full description here.

## Background

Born in a test file.

## Life History

- Event 1
- Event 2

## Current Context

Currently being tested.
`;

      const result = parseCharacterMarkdown(content);

      expect(result.personality).toContain("Trait one");
      expect(result.personality).toContain("Trait two");
      expect(result.description).toBe("Full description here.");
      expect(result.background).toBe("Born in a test file.");
      expect(result.lifeHistory).toContain("Event 1");
      expect(result.currentContext).toBe("Currently being tested.");
    });

    it("should throw if id is missing", () => {
      const content = `---
name: No ID Character
---

## Personality

Test
`;

      expect(() => parseCharacterMarkdown(content)).toThrow("missing required 'id'");
    });

    it("should throw if name is missing", () => {
      const content = `---
id: "has-id"
---

## Personality

Test
`;

      expect(() => parseCharacterMarkdown(content)).toThrow("missing required 'name'");
    });

    it("should prefer markdown body over frontmatter for text fields", () => {
      const content = `---
id: "override-test"
name: Override Test
personality: Frontmatter personality
---

## Personality

Body personality wins.
`;

      const result = parseCharacterMarkdown(content);

      expect(result.personality).toBe("Body personality wins.");
    });
  });
});
