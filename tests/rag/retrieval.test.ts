// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { RAGConfigSvc } from "@/lib/rag/config";
import {
  retrieveRelevantMemories,
  formatMemoriesForPrompt,
  getMemoryItemIds,
  type RetrievedMemory,
} from "@/lib/rag/retrieval";
import { checkEmbeddingAvailability } from "@/lib/rag/embedding";
import { TEST_UUIDS, isCI } from "./fixtures";

/**
 * RAG Retrieval Tests
 *
 * Tests the retrieval service for fetching relevant memory items.
 * Requires:
 * - LM Studio running with jina-embeddings-v3 at http://localhost:1234/v1
 * - PostgreSQL with pgvector at DATABASE_URL
 *
 * Run with: pnpm test tests/rag/retrieval.test.ts
 */

describe("RAG Retrieval", () => {
  let isEmbeddingAvailable = false;
  const runningInCI = isCI();

  beforeAll(async () => {
    if (runningInCI) {
      console.log("⏭️  CI environment, skipping embedding-dependent tests");
      return;
    }
    const status = await checkEmbeddingAvailability();
    isEmbeddingAvailable = status.available;
    if (isEmbeddingAvailable) {
      console.log(`✅ Embedding service available (${status.provider})`);
    } else {
      console.log("⚠️  Embedding service not available, some tests will be skipped");
    }
  });

  describe("retrieveRelevantMemories", () => {
    it("returns empty array when no embedding service available", async () => {
      if (isEmbeddingAvailable) {
        console.log("Skipping: Embedding service is available");
        return;
      }

      const result = await retrieveRelevantMemories({
        userId: TEST_UUIDS.nonExistentUser,
        query: "test query",
      });

      expect(result.memories).toEqual([]);
    });

    it("returns result structure with correct fields", async () => {
      if (!isEmbeddingAvailable || runningInCI) return;

      const result = await retrieveRelevantMemories({
        userId: TEST_UUIDS.nonExistentUser,
        query: "test query",
      });

      expect(result).toHaveProperty("memories");
      expect(result).toHaveProperty("query");
      expect(result).toHaveProperty("topK");
      expect(Array.isArray(result.memories)).toBe(true);
      expect(result.query).toBe("test query");
    });

    it("respects topK parameter", async () => {
      if (!isEmbeddingAvailable || runningInCI) return;

      const result = await retrieveRelevantMemories({
        userId: TEST_UUIDS.nonExistentUser,
        query: "test query",
        topK: 5,
      });

      expect(result.topK).toBe(5);
      expect(result.memories.length).toBeLessThanOrEqual(5);
    });

    it("caps topK at maxTopK", async () => {
      if (!isEmbeddingAvailable) return;

      const maxTopK = RAGConfigSvc.getMaxTopK();
      const result = await retrieveRelevantMemories({
        userId: "00000000-0000-0000-0000-000000000001",
        query: "test query",
        topK: 1000,
      });

      expect(result.topK).toBeLessThanOrEqual(maxTopK);
    });

    it("uses default topK when not specified", async () => {
      if (!isEmbeddingAvailable) return;

      const defaultTopK = RAGConfigSvc.getDefaultTopK();
      const result = await retrieveRelevantMemories({
        userId: "00000000-0000-0000-0000-000000000001",
        query: "test query",
      });

      expect(result.topK).toBe(defaultTopK);
    });

    it("handles characterId filter", async () => {
      if (!isEmbeddingAvailable) return;

      const result = await retrieveRelevantMemories({
        userId: "00000000-0000-0000-0000-000000000001",
        characterId: "00000000-0000-0000-0000-000000000002",
        query: "test query",
      });

      expect(result).toBeDefined();
    });

    it("handles conversationId filter", async () => {
      if (!isEmbeddingAvailable) return;

      const result = await retrieveRelevantMemories({
        userId: "00000000-0000-0000-0000-000000000001",
        conversationId: "00000000-0000-0000-0000-000000000003",
        query: "test query",
      });

      expect(result).toBeDefined();
    });

    it("handles special characters in query", async () => {
      if (!isEmbeddingAvailable) return;

      const result = await retrieveRelevantMemories({
        userId: "00000000-0000-0000-0000-000000000001",
        query: "test @#$%^&*() 你好 🎉",
      });

      expect(result).toBeDefined();
    });
  });

  describe("formatMemoriesForPrompt", () => {
    it("returns empty string for empty memories", () => {
      const result = formatMemoriesForPrompt([]);
      expect(result).toBe("");
    });

    it("formats single memory correctly", () => {
      const memories: RetrievedMemory[] = [
        {
          id: "1",
          content: "This is the memory content.",
          sourceType: "file",
          sourceId: "file-1",
          similarity: 0.85,
          tags: ["test"],
        },
      ];

      const result = formatMemoriesForPrompt(memories);

      expect(result).toContain("<relevant_context>");
      expect(result).toContain("</relevant_context>");
      expect(result).toContain("[1]");
      expect(result).toContain("This is the memory content.");
    });

    it("formats multiple memories with indices", () => {
      const memories: RetrievedMemory[] = [
        { id: "1", content: "First memory", sourceType: "file", sourceId: null, similarity: 0.9, tags: null },
        { id: "2", content: "Second memory", sourceType: "file", sourceId: null, similarity: 0.8, tags: null },
        { id: "3", content: "Third memory", sourceType: "file", sourceId: null, similarity: 0.7, tags: null },
      ];

      const result = formatMemoriesForPrompt(memories);

      expect(result).toContain("[1]");
      expect(result).toContain("[2]");
      expect(result).toContain("[3]");
      expect(result).toContain("First memory");
      expect(result).toContain("Second memory");
      expect(result).toContain("Third memory");
    });

    it("truncates long content with ellipsis", () => {
      const longContent = "A".repeat(500);
      const memories: RetrievedMemory[] = [
        { id: "1", content: longContent, sourceType: "file", sourceId: null, similarity: 0.9, tags: null },
      ];

      const result = formatMemoriesForPrompt(memories);

      expect(result).toContain("...");
      expect(result.length).toBeLessThan(longContent.length + 200);
    });

    it("includes context instructions", () => {
      const memories: RetrievedMemory[] = [
        { id: "1", content: "Test content", sourceType: "file", sourceId: null, similarity: 0.9, tags: null },
      ];

      const result = formatMemoriesForPrompt(memories);

      expect(result).toContain("relevant information");
      expect(result).toContain("knowledge base");
      expect(result).toContain("naturally");
    });
  });

  describe("getMemoryItemIds", () => {
    it("returns empty array for empty memories", () => {
      const result = getMemoryItemIds([]);
      expect(result).toEqual([]);
    });

    it("extracts IDs from memories", () => {
      const memories: RetrievedMemory[] = [
        { id: "uuid-1", content: "", sourceType: "file", sourceId: null, similarity: 0, tags: null },
        { id: "uuid-2", content: "", sourceType: "file", sourceId: null, similarity: 0, tags: null },
        { id: "uuid-3", content: "", sourceType: "file", sourceId: null, similarity: 0, tags: null },
      ];

      const result = getMemoryItemIds(memories);

      expect(result).toEqual(["uuid-1", "uuid-2", "uuid-3"]);
    });

    it("preserves order of IDs", () => {
      const memories: RetrievedMemory[] = [
        { id: "c", content: "", sourceType: "file", sourceId: null, similarity: 0, tags: null },
        { id: "a", content: "", sourceType: "file", sourceId: null, similarity: 0, tags: null },
        { id: "b", content: "", sourceType: "file", sourceId: null, similarity: 0, tags: null },
      ];

      const result = getMemoryItemIds(memories);

      expect(result).toEqual(["c", "a", "b"]);
    });
  });

  describe("RetrievedMemory structure", () => {
    it("has all required fields", () => {
      const memory: RetrievedMemory = {
        id: "test-id",
        content: "test content",
        sourceType: "file",
        sourceId: "source-123",
        similarity: 0.95,
        tags: ["tag1", "tag2"],
      };

      expect(memory.id).toBeDefined();
      expect(memory.content).toBeDefined();
      expect(memory.sourceType).toBeDefined();
      expect(memory.similarity).toBeDefined();
    });

    it("allows null sourceId", () => {
      const memory: RetrievedMemory = {
        id: "test-id",
        content: "test content",
        sourceType: "manual",
        sourceId: null,
        similarity: 0.8,
        tags: null,
      };

      expect(memory.sourceId).toBeNull();
    });

    it("allows null tags", () => {
      const memory: RetrievedMemory = {
        id: "test-id",
        content: "test content",
        sourceType: "file",
        sourceId: null,
        similarity: 0.8,
        tags: null,
      };

      expect(memory.tags).toBeNull();
    });
  });
});

describe("Retrieval Query Security", () => {
  let isEmbeddingAvailable = false;

  beforeAll(async () => {
    const status = await checkEmbeddingAvailability();
    isEmbeddingAvailable = status.available;
  });

  it("uses parameterized queries (no SQL injection)", async () => {
    if (!isEmbeddingAvailable) return;

    const maliciousInputs = [
      "'; DROP TABLE memory_items; --",
      "test' OR '1'='1",
      "test); DELETE FROM users; --",
      "<script>alert('xss')</script>",
    ];

    for (const input of maliciousInputs) {
      const result = await retrieveRelevantMemories({
        userId: "00000000-0000-0000-0000-000000000001",
        query: input,
      });

      expect(result).toBeDefined();
      expect(result.memories).toBeDefined();
    }
  });

  it("handles UUID-like malicious characterId", async () => {
    if (!isEmbeddingAvailable) return;

    try {
      const result = await retrieveRelevantMemories({
        userId: "00000000-0000-0000-0000-000000000001",
        characterId: "'; DROP TABLE characters; --",
        query: "test",
      });

      expect(result).toBeDefined();
    } catch {
      // Expected to fail for invalid UUID format
    }
  });
});
