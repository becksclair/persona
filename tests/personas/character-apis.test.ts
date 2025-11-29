// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST, GET } from "@/app/api/characters/route";
import { PATCH } from "@/app/api/characters/[id]/route";
import { POST as EnhancePOST } from "@/app/api/characters/enhance/route";
import { getCurrentUser } from "@/lib/auth";
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
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  characters: {},
  eq: vi.fn(),
}));

vi.mock("@/lib/model-service", () => ({
  ModelService: {
    resolveModelSettings: vi.fn(() => ({ model: { provider: "openai", modelId: "gpt-4" } })),
    getProviderInstance: vi.fn(() => ({ generateText: vi.fn() })),
  },
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

import { generateText } from "ai";

type MockFunction = ReturnType<typeof vi.fn>;
type MockQuery = {
  where: MockFunction;
  $dynamic: MockFunction;
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
type CharacterReturn = {
  id: string;
  [key: string]: unknown;
};

describe("Character CRUD APIs", () => {
  const mockGetCurrentUser = vi.mocked(getCurrentUser) as MockFunction;
  const mockDb = vi.mocked(db);
  const mockGenerateText = generateText as (this: void) => unknown as MockFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ userId: "test-user-id" });
    mockGenerateText.mockResolvedValue({ text: "Enhanced personality trait" });
  });

  describe("GET /api/characters", () => {
    it("returns user characters and built-in characters", async () => {
      const mockCharacters = [
        { id: "1", userId: "test-user-id", name: "User Character", isBuiltIn: false },
        { id: "2", userId: "other-user", name: "Built-in Character", isBuiltIn: true },
      ];

      const mockQuery: MockQuery & { from: MockFunction } = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        $dynamic: vi.fn().mockResolvedValue(mockCharacters),
      };
      mockDb.select.mockReturnValue(mockQuery as unknown as ReturnType<typeof db.select>);

      const request = new NextRequest("http://localhost/api/characters");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCharacters);
      expect(mockQuery.where).toHaveBeenCalled();
    });

    it("includes archived characters when requested", async () => {
      const mockQuery: MockQuery & { from: MockFunction } = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        $dynamic: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockQuery as unknown as ReturnType<typeof db.select>);

      const request = new NextRequest("http://localhost/api/characters?archived=true");
      await GET(request);

      expect(mockQuery.where).toHaveBeenCalled();
    });

    it("filters by search term", async () => {
      const mockCharacters = [
        { id: "1", userId: "test-user-id", name: "Python Expert", tagline: "Coding helper" },
        { id: "2", userId: "test-user-id", name: "Writing Assistant", description: "Creative writing" },
      ];

      const mockQuery: MockQuery & { from: MockFunction } = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        $dynamic: vi.fn().mockResolvedValue(mockCharacters),
      };
      mockDb.select.mockReturnValue(mockQuery as unknown as ReturnType<typeof db.select>);

      const request = new NextRequest("http://localhost/api/characters?search=python");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should filter client-side for "python" (case-insensitive)
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Python Expert");
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/characters");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("handles database errors gracefully", async () => {
      const mockQuery: MockQuery & { from: MockFunction } = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        $dynamic: vi.fn().mockRejectedValue(new Error("Database error")),
      };
      mockDb.select.mockReturnValue(mockQuery as unknown as ReturnType<typeof db.select>);

      const request = new NextRequest("http://localhost/api/characters");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toEqual({ error: "Failed to fetch characters" });
    });
  });

  describe("POST /api/characters", () => {
    it("creates a new character with valid data", async () => {
      const characterData = {
        name: "Test Character",
        description: "A test character",
        personality: "Friendly and helpful",
        tags: ["test", "character"],
      };

      const mockInsert: MockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: "new-char-id", ...characterData }] as CharacterReturn[]),
      };
      mockDb.insert.mockReturnValue(mockInsert as unknown as ReturnType<typeof db.insert>);

      const request = new NextRequest("http://localhost/api/characters", {
        method: "POST",
        body: JSON.stringify(characterData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("new-char-id");
      expect(data.name).toBe("Test Character");
      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "test-user-id",
          name: "Test Character",
          description: "A test character",
          personality: "Friendly and helpful",
          tags: ["test", "character"],
        })
      );
    });

    it("returns 400 when name is missing", async () => {
      const request = new NextRequest("http://localhost/api/characters", {
        method: "POST",
        body: JSON.stringify({ description: "No name provided" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "name is required" });
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/characters", {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("handles database errors during creation", async () => {
      const mockInsert: MockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error("Database error")),
      };
      mockDb.insert.mockReturnValue(mockInsert as unknown as ReturnType<typeof db.insert>);

      const request = new NextRequest("http://localhost/api/characters", {
        method: "POST",
        body: JSON.stringify({ name: "Test Character" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to create character" });
    });
  });

  describe("PATCH /api/characters/[id]", () => {
    it("updates a character with valid data", async () => {
      const updateData = { name: "Updated Name", personality: "Updated personality" };

      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: "char-1", isBuiltIn: false }]),
      };
      mockDb.select.mockReturnValue(mockSelectQuery as unknown as ReturnType<typeof db.select>);

      const mockUpdate: MockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: "char-1", ...updateData }] as CharacterReturn[]),
      };
      mockDb.update.mockReturnValue(mockUpdate as unknown as ReturnType<typeof db.update>);

      const request = new NextRequest("http://localhost/api/characters/char-1", {
        method: "PATCH",
        body: JSON.stringify(updateData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "char-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Name");
      expect(mockUpdate.set).toHaveBeenCalledWith(expect.objectContaining(updateData));
      expect(mockUpdate.where).toHaveBeenCalled();
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/characters/char-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "char-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("handles database errors during update", async () => {
      const mockUpdate: MockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error("Database error")),
      };
      mockDb.update.mockReturnValue(mockUpdate as unknown as ReturnType<typeof db.update>);

      const request = new NextRequest("http://localhost/api/characters/char-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "char-1" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to update character" });
    });
  });

  describe("POST /api/characters/enhance", () => {
    it("enhances character field with AI", async () => {
      const enhanceData = {
        field: "personality",
        prompt: "Generate a friendly personality for a coding assistant",
        currentValue: "Helpful with programming",
      };

      mockGenerateText.mockResolvedValue({ text: "Friendly, patient, and knowledgeable coding mentor" });

      const request = new NextRequest("http://localhost/api/characters/enhance", {
        method: "POST",
        body: JSON.stringify(enhanceData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await EnhancePOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.enhanced).toBe("Friendly, patient, and knowledgeable coding mentor");
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining("character design assistant"),
          prompt: expect.stringContaining("Generate a friendly personality"),
          temperature: 0.8,
        })
      );
    });

    it("handles enhancement without current value", async () => {
      const enhanceData = {
        field: "background",
        prompt: "Create a mysterious backstory",
      };

      mockGenerateText.mockResolvedValue({ text: "Former secret agent turned AI consultant" });

      const request = new NextRequest("http://localhost/api/characters/enhance", {
        method: "POST",
        body: JSON.stringify(enhanceData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await EnhancePOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.enhanced).toBe("Former secret agent turned AI consultant");
    });

    it("returns 400 when field or prompt is missing", async () => {
      const request = new NextRequest("http://localhost/api/characters/enhance", {
        method: "POST",
        body: JSON.stringify({ field: "personality" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await EnhancePOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "field and prompt required" });
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/characters/enhance", {
        method: "POST",
        body: JSON.stringify({ field: "personality", prompt: "test" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await EnhancePOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("handles AI service errors", async () => {
      mockGenerateText.mockRejectedValue(new Error("AI service unavailable"));

      const request = new NextRequest("http://localhost/api/characters/enhance", {
        method: "POST",
        body: JSON.stringify({
          field: "personality",
          prompt: "Generate personality",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await EnhancePOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Enhancement failed" });
    });
  });
});
