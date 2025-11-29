// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  retrieveRelevantMemories,
  formatMemoriesForPrompt,
  type RetrievedMemory,
} from "@/lib/rag/retrieval";
import { TEST_UUIDS } from "./fixtures";

describe("Enhanced RAG Retrieval Features", () => {
  describe("formatMemoriesForPrompt with Enhanced Features", () => {
    it("excludes internal tags starting with __ from formatted output", () => {
      const memories: RetrievedMemory[] = [
        {
          id: "1",
          content: "Public content",
          sourceType: "file",
          sourceId: "file-1",
          similarity: 0.9,
          tags: ["public", "__low_priority", "__internal"],
        },
        {
          id: "2",
          content: "Another content",
          sourceType: "manual",
          sourceId: null,
          similarity: 0.8,
          tags: ["__low_priority", "visible"],
        },
      ];

      const result = formatMemoriesForPrompt(memories);

      // Should not include internal tags in the formatted output
      expect(result).toContain('tags="public"');
      expect(result).toContain('tags="visible"');
      expect(result).not.toContain("__low_priority");
      expect(result).not.toContain("__internal");
    });

    it("handles memory items with no tags gracefully", () => {
      const memories: RetrievedMemory[] = [
        {
          id: "1",
          content: "Content without tags",
          sourceType: "file",
          sourceId: "file-1",
          similarity: 0.9,
          tags: null,
        },
      ];

      const result = formatMemoriesForPrompt(memories);

      expect(result).toContain("Content without tags");
      expect(result).not.toContain("tags=");
    });

    it("includes source file name when available", () => {
      const memories: RetrievedMemory[] = [
        {
          id: "1",
          content: "File content",
          sourceType: "file",
          sourceId: "file-1",
          sourceFileName: "documentation.pdf",
          similarity: 0.9,
          tags: null,
        },
      ];

      const result = formatMemoriesForPrompt(memories);

      expect(result).toContain('source="documentation.pdf"');
      expect(result).toContain('type="file"');
    });

    it("uses source type when source file name not available", () => {
      const memories: RetrievedMemory[] = [
        {
          id: "1",
          content: "Manual content",
          sourceType: "manual",
          sourceId: null,
          similarity: 0.9,
          tags: null,
        },
      ];

      const result = formatMemoriesForPrompt(memories);

      expect(result).not.toContain("source=");
      expect(result).toContain('type="manual"');
    });
  });

  describe("Retrieval Parameter Validation", () => {
    it("handles empty tag filters array", async () => {
      // This tests the tag filtering logic without requiring full DB setup
      const result = await retrieveRelevantMemories({
        userId: TEST_UUIDS.user1,
        query: "test query",
        tagFilters: [],
      });

      expect(result).toBeDefined();
      expect(result.query).toBe("test query");
      expect(Array.isArray(result.memories)).toBe(true);
    });

    it("handles null tag filters", async () => {
      const result = await retrieveRelevantMemories({
        userId: TEST_UUIDS.user1,
        query: "test query",
        tagFilters: undefined,
      });

      expect(result).toBeDefined();
      expect(result.query).toBe("test query");
      expect(Array.isArray(result.memories)).toBe(true);
    });

    it("handles whitespace-only tag filters", async () => {
      const result = await retrieveRelevantMemories({
        userId: TEST_UUIDS.user1,
        query: "test query",
        tagFilters: ["  ", "\t", "\n", ""],
      });

      expect(result).toBeDefined();
      expect(result.query).toBe("test query");
      expect(Array.isArray(result.memories)).toBe(true);
    });

    it("validates and rejects malformed characterId", async () => {
      const result = await retrieveRelevantMemories({
        userId: TEST_UUIDS.user1,
        characterId: "not-a-uuid",
        query: "test query",
      });

      expect(result).toBeDefined();
      expect(result.memories).toHaveLength(0);
      expect(result.query).toBe("test query");
      expect(Array.isArray(result.memories)).toBe(true);
      // Should not throw or crash
    });

    it("handles extreme topK values", async () => {
      const result1 = await retrieveRelevantMemories({
        userId: TEST_UUIDS.user1,
        query: "test query",
        topK: 0,
      });

      const result2 = await retrieveRelevantMemories({
        userId: TEST_UUIDS.user1,
        query: "test query",
        topK: -1,
      });

      expect(result1).toBeDefined();
      expect(result1.memories.length).toBe(0); // or expect clamping behavior
      expect(result1.topK).toBe(0); // verify how topK=0 is handled

      expect(result2).toBeDefined();
      expect(result2.topK).toBeGreaterThanOrEqual(0); // verify negative is clamped
    });
  });

  describe("RAG Mode Behavior", () => {
    it("returns empty result when ragMode is ignore", async () => {
      const result = await retrieveRelevantMemories({
        userId: TEST_UUIDS.user1,
        query: "test query",
        ragMode: "ignore",
        topK: 10,
      });

      expect(result.topK).toBe(0);
      expect(result.memories).toEqual([]);
      expect(result.query).toBe("test query");
    });

    it("reduces topK when ragMode is light", async () => {
      const result = await retrieveRelevantMemories({
        userId: TEST_UUIDS.user1,
        query: "test query",
        ragMode: "light",
        topK: 10,
      });

      expect(result).toBeDefined();
      expect(result.query).toBe("test query");
      // topK should be reduced from 10 to around 5 (half)
      expect(result.topK).toBeLessThanOrEqual(5);
      expect(result.topK).toBeGreaterThanOrEqual(1);
    });

    it("uses full topK when ragMode is heavy", async () => {
      const result = await retrieveRelevantMemories({
        userId: TEST_UUIDS.user1,
        query: "test query",
        ragMode: "heavy",
        topK: 10,
      });

      expect(result).toBeDefined();
      expect(result.query).toBe("test query");
      expect(result.topK).toBe(10);
    });
  });

  describe("Special Query Handling", () => {
    it("handles empty queries gracefully", async () => {
      const result = await retrieveRelevantMemories({
        userId: TEST_UUIDS.user1,
        query: "",
      });

      expect(result).toBeDefined();
      expect(result.query).toBe("");
      expect(Array.isArray(result.memories)).toBe(true);
    });

    it("handles special characters in queries", async () => {
      const specialQueries = [
        "test @#$%^&*()",
        "query with 'quotes' and \"double quotes\"",
        "multiline\nquery\nwith\nnewlines",
        "query with emoji 🎉 and unicode 你好",
        "query with <script>alert('xss')</script>",
        "'; DROP TABLE users; --",
      ];

      for (const query of specialQueries) {
        const result = await retrieveRelevantMemories({
          userId: TEST_UUIDS.user1,
          query,
        });

        expect(result).toBeDefined();
        expect(result.query).toBe(query);
        expect(Array.isArray(result.memories)).toBe(true);
      }
    });
  });

  describe("Result Structure Validation", () => {
    it("always returns consistent result structure", async () => {
      const result = await retrieveRelevantMemories({
        userId: TEST_UUIDS.user1,
        query: "test",
      });

      // Should always have these properties
      expect(result).toHaveProperty("memories");
      expect(result).toHaveProperty("query");
      expect(result).toHaveProperty("topK");

      // Memories should always be an array
      expect(Array.isArray(result.memories)).toBe(true);

      // Query should match input
      expect(result.query).toBe("test");

      // topK should be a positive number or 0
      expect(typeof result.topK).toBe("number");
      expect(result.topK).toBeGreaterThanOrEqual(0);

      it("retrieves memories without errors", async () => {
        const result = await retrieveRelevantMemories({
          userId: TEST_UUIDS.user1,
          query: "test",
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result.memories)).toBe(true);
      });

      expect(Array.isArray(result.memories)).toBe(true);
    });
  });
});
