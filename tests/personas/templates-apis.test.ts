// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST, GET } from "@/app/api/templates/route";
import { PATCH } from "@/app/api/templates/[id]/route";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  characterTemplates: {},
  characters: {},
  eq: vi.fn(),
  and: vi.fn(),
}));

import { getCurrentUser } from "@/lib/auth";

type MockFunction = ReturnType<typeof vi.fn>;
type MockQuery = {
  from: MockFunction;
  where: MockFunction;
};
type MockInsert = {
  values: MockFunction;
  returning: MockFunction;
};
type MockUpdate = {
  set: MockFunction;
  where: MockFunction;
  returning: MockFunction;
};
type TemplateReturn = {
  id: string;
  [key: string]: unknown;
};

describe("Templates CRUD APIs", () => {
  const mockGetCurrentUser = vi.mocked(getCurrentUser) as MockFunction;
  const mockDb = vi.mocked(db);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ userId: "test-user-id" });
  });

  describe("GET /api/templates", () => {
    it("returns user templates", async () => {
      const mockTemplates = [
        {
          id: "1",
          userId: "test-user-id",
          name: "Coding Partner Template",
          description: "Template for coding assistants",
          personality: "Technical and helpful",
        },
        {
          id: "2",
          userId: "test-user-id",
          name: "Creative Writer Template",
          description: "Template for creative writing characters",
        },
      ];

      const mockQuery: MockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockTemplates),
      };
      mockDb.select.mockReturnValue(mockQuery as unknown as ReturnType<typeof db.select>);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTemplates);
      expect(mockQuery.where).toHaveBeenCalled();
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const response = await GET();

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("handles database errors gracefully", async () => {
      const mockQuery: MockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockRejectedValue(new Error("Database error")),
      };
      mockDb.select.mockReturnValue(mockQuery as unknown as ReturnType<typeof db.select>);

      const response = await GET();

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toEqual({ error: "Failed to fetch templates" });
    });
  });

  describe("POST /api/templates", () => {
    it("creates a new template with valid data", async () => {
      const templateData = {
        name: "Test Template",
        description: "A test template",
        personality: "Friendly and creative",
        tags: ["test", "template"],
        defaultTemperature: 0.8,
      };

      const mockInsert: MockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: "new-template-id", ...templateData }] as TemplateReturn[]),
      };
      mockDb.insert.mockReturnValue(mockInsert as unknown as ReturnType<typeof db.insert>);

      const request = new NextRequest("http://localhost/api/templates", {
        method: "POST",
        body: JSON.stringify(templateData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("new-template-id");
      expect(data.name).toBe("Test Template");
      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "test-user-id",
          name: "Test Template",
          description: "A test template",
          personality: "Friendly and creative",
          tags: ["test", "template"],
          defaultTemperature: 0.8,
        })
      );
    });

    it("creates template from character data", async () => {
      const mockCharacter = {
        id: "char-1",
        userId: "test-user-id",
        name: "Source Character",
        personality: "Analytical and precise",
        toneStyle: "Professional",
        tags: ["coding", "technical"],
        defaultTemperature: 0.7,
      };

      const mockCharacterQuery: MockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockCharacter]),
      };
      const mockTemplateInsert: MockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: "template-from-char", name: "Character Template" }] as TemplateReturn[]),
      };

      // Mock the character lookup
      mockDb.select.mockReturnValue(mockCharacterQuery as unknown as ReturnType<typeof db.select>);
      // Mock the template insertion
      mockDb.insert.mockReturnValue(mockTemplateInsert as unknown as ReturnType<typeof db.insert>);

      const templateData = {
        fromCharacterId: "char-1",
        name: "Character Template",
        icon: "🤖",
      };

      const request = new NextRequest("http://localhost/api/templates", {
        method: "POST",
        body: JSON.stringify(templateData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("template-from-char");
      expect(mockCharacterQuery.where).toHaveBeenCalled();
      expect(mockTemplateInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "test-user-id",
          name: "Character Template",
          icon: "🤖",
          personality: "Analytical and precise",
          toneStyle: "Professional",
          tags: ["coding", "technical"],
          defaultTemperature: 0.7,
        })
      );
    });

    it("returns 404 when source character not found", async () => {
      const mockQuery: MockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockQuery as unknown as ReturnType<typeof db.select>);

      const templateData = {
        fromCharacterId: "nonexistent-char",
        name: "Template from non-existent character",
      };

      const request = new NextRequest("http://localhost/api/templates", {
        method: "POST",
        body: JSON.stringify(templateData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toEqual({ error: "Character not found" });
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/templates", {
        method: "POST",
        body: JSON.stringify({ name: "Test Template" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("handles database errors during creation", async () => {
      const mockInsert: MockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error("Database error")),
      };
      mockDb.insert.mockReturnValue(mockInsert as unknown as ReturnType<typeof db.insert>);

      const request = new NextRequest("http://localhost/api/templates", {
        method: "POST",
        body: JSON.stringify({ name: "Test Template" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toEqual({ error: "Failed to create template" });
    });
  });

  describe("PATCH /api/templates/[id]", () => {
    it("updates a template with valid data", async () => {
      const updateData = { name: "Updated Template", personality: "Updated personality" };

      const mockUpdate: MockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: "template-1", ...updateData }] as TemplateReturn[]),
      };
      mockDb.update.mockReturnValue(mockUpdate as unknown as ReturnType<typeof db.update>);

      const request = new NextRequest("http://localhost/api/templates/template-1", {
        method: "PATCH",
        body: JSON.stringify(updateData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "template-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Template");
      expect(mockUpdate.set).toHaveBeenCalledWith(expect.objectContaining(updateData));
      expect(mockUpdate.where).toHaveBeenCalled();
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/templates/template-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "template-1" }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("handles database errors during update", async () => {
      const mockUpdate: MockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error("Database error")),
      };
      mockDb.update.mockReturnValue(mockUpdate as unknown as ReturnType<typeof db.update>);

      const request = new NextRequest("http://localhost/api/templates/template-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "template-1" }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toEqual({ error: "Failed to update template" });
    });
  });

  describe("Template Data Transfer", () => {
    it("correctly transfers character fields to template", async () => {
      const mockCharacter = {
        id: "char-1",
        userId: "test-user-id",
        name: "Source Character",
        tagline: "A helpful assistant",
        personality: "Friendly and knowledgeable",
        toneStyle: "Casual but professional",
        boundaries: "Respects privacy",
        roleRules: "Always helpful",
        description: "AI assistant for various tasks",
        background: "Created to help users",
        lifeHistory: "Evolved over time",
        currentContext: "Ready to assist",
        customInstructionsLocal: "Be concise",
        tags: ["assistant", "ai"],
        defaultModelId: "gpt-4",
        defaultTemperature: 0.7,
        nsfwEnabled: false,
        evolveEnabled: true,
      };

      const mockCharacterQuery: MockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockCharacter]),
      };
      const mockTemplateInsert: MockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: "template-from-char" }]),
      };

      mockDb.select.mockReturnValue(mockCharacterQuery as unknown as ReturnType<typeof db.select>);
      mockDb.insert.mockReturnValue(mockTemplateInsert as unknown as ReturnType<typeof db.insert>);

      const templateData = {
        fromCharacterId: "char-1",
        name: "Complete Template",
        icon: "🎯",
      };

      const request = new NextRequest("http://localhost/api/templates", {
        method: "POST",
        body: JSON.stringify(templateData),
        headers: { "Content-Type": "application/json" },
      });

      await POST(request);

      // Verify all character fields were transferred to template
      expect(mockTemplateInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "test-user-id",
          name: "Complete Template",
          icon: "🎯",
          tagline: "A helpful assistant",
          personality: "Friendly and knowledgeable",
          toneStyle: "Casual but professional",
          boundaries: "Respects privacy",
          roleRules: "Always helpful",
          description: "AI assistant for various tasks",
          background: "Created to help users",
          lifeHistory: "Evolved over time",
          currentContext: "Ready to assist",
          customInstructionsLocal: "Be concise",
          tags: ["assistant", "ai"],
          defaultModelId: "gpt-4",
          defaultTemperature: 0.7,
          nsfwEnabled: false,
          evolveEnabled: true,
        })
      );
    });

    it("handles character with null fields gracefully", async () => {
      const mockCharacter = {
        id: "char-1",
        userId: "test-user-id",
        name: "Minimal Character",
        tagline: null,
        personality: null,
        toneStyle: null,
        boundaries: null,
        roleRules: null,
        description: null,
        background: null,
        lifeHistory: null,
        currentContext: null,
        customInstructionsLocal: null,
        tags: null,
        defaultModelId: null,
        defaultTemperature: null,
        nsfwEnabled: false,
        evolveEnabled: false,
      };

      const mockCharacterQuery: MockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockCharacter]),
      };
      const mockTemplateInsert: MockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: "minimal-template" }]),
      };

      mockDb.select.mockReturnValue(mockCharacterQuery as unknown as ReturnType<typeof db.select>);
      mockDb.insert.mockReturnValue(mockTemplateInsert as unknown as ReturnType<typeof db.insert>);

      const templateData = {
        fromCharacterId: "char-1",
        name: "Minimal Template",
      };

      const request = new NextRequest("http://localhost/api/templates", {
        method: "POST",
        body: JSON.stringify(templateData),
        headers: { "Content-Type": "application/json" },
      });

      await POST(request);

      // Should handle null fields gracefully
      expect(mockTemplateInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "test-user-id",
          name: "Minimal Template",
          tagline: null,
          personality: null,
          toneStyle: null,
          boundaries: null,
          roleRules: null,
          description: null,
          background: null,
          lifeHistory: null,
          currentContext: null,
          customInstructionsLocal: null,
          tags: null,
          defaultModelId: null,
          defaultTemperature: null,
          nsfwEnabled: false,
          evolveEnabled: false,
        })
      );
    });
  });
});
