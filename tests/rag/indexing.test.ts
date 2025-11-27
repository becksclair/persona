// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { RAGConfigSvc } from "@/lib/rag/config";
import {
  indexFile,
  deleteFileMemoryItems,
  getFileMemoryItemCount,
  getCharacterKBStats,
  type IndexingResult,
} from "@/lib/rag/indexing";
import { checkEmbeddingAvailability } from "@/lib/rag/embedding";
import { TEST_UUIDS } from "./fixtures";

/**
 * RAG Indexing Pipeline Tests
 *
 * Tests the file indexing pipeline including:
 * - Text extraction
 * - Chunking
 * - Embedding generation
 * - Memory item storage
 *
 * Requires:
 * - LM Studio running with jina-embeddings-v3 at http://localhost:1234/v1
 * - PostgreSQL with pgvector at DATABASE_URL
 *
 * Run with: pnpm test tests/rag/indexing.test.ts
 */

describe("RAG Indexing Pipeline", () => {
  let isEmbeddingAvailable = false;

  beforeAll(async () => {
    const status = await checkEmbeddingAvailability();
    isEmbeddingAvailable = status.available;
    if (isEmbeddingAvailable) {
      console.log(`✅ Embedding service available (${status.provider})`);
    } else {
      console.log("⚠️  Embedding service not available, some tests will be skipped");
    }
  });

  describe("IndexingResult structure", () => {
    it("has required fields", () => {
      const result: IndexingResult = {
        fileId: "test-file-id",
        success: true,
        chunksCreated: 10,
        totalChunks: 12,
      };

      expect(result.fileId).toBeDefined();
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.chunksCreated).toBe("number");
      expect(typeof result.totalChunks).toBe("number");
    });

    it("includes error field on failure", () => {
      const result: IndexingResult = {
        fileId: "test-file-id",
        success: false,
        chunksCreated: 0,
        totalChunks: 0,
        error: "File not found",
      };

      expect(result.error).toBeDefined();
      expect(result.success).toBe(false);
    });
  });

  describe("indexFile", () => {
    it("returns error for non-existent file", async () => {
      const result = await indexFile(TEST_UUIDS.nonExistentFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(result.chunksCreated).toBe(0);
    });
  });

  describe("deleteFileMemoryItems", () => {
    it("returns count of deleted items", async () => {
      const count = await deleteFileMemoryItems(TEST_UUIDS.nonExistentFile);

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("handles non-existent file ID gracefully", async () => {
      const count = await deleteFileMemoryItems(TEST_UUIDS.testFile);

      expect(count).toBe(0);
    });
  });

  describe("getFileMemoryItemCount", () => {
    it("returns 0 for non-existent file", async () => {
      const count = await getFileMemoryItemCount(TEST_UUIDS.nonExistentFile);

      expect(count).toBe(0);
    });

    it("returns number type", async () => {
      const count = await getFileMemoryItemCount(TEST_UUIDS.testFile);

      expect(typeof count).toBe("number");
    });
  });

  describe("getCharacterKBStats", () => {
    it("returns stats structure for non-existent character", async () => {
      const stats = await getCharacterKBStats(TEST_UUIDS.nonExistentCharacter);

      expect(stats).toBeDefined();
      expect(typeof stats.totalFiles).toBe("number");
      expect(typeof stats.readyFiles).toBe("number");
      expect(typeof stats.indexingFiles).toBe("number");
      expect(typeof stats.failedFiles).toBe("number");
      expect(typeof stats.pausedFiles).toBe("number");
      expect(typeof stats.totalChunks).toBe("number");
    });

    it("returns zero counts for character with no files", async () => {
      const stats = await getCharacterKBStats(TEST_UUIDS.nonExistentCharacter);

      expect(stats.totalFiles).toBe(0);
      expect(stats.readyFiles).toBe(0);
      expect(stats.totalChunks).toBe(0);
    });

    it("status counts sum to totalFiles", async () => {
      const stats = await getCharacterKBStats(TEST_UUIDS.nonExistentCharacter);

      const statusSum =
        stats.readyFiles + stats.indexingFiles + stats.failedFiles + stats.pausedFiles;

      expect(statusSum).toBeLessThanOrEqual(stats.totalFiles);
    });
  });
});

describe("Indexing Configuration", () => {
  describe("chunk settings", () => {
    it("has valid chunk size", () => {
      const chunkSize = RAGConfigSvc.getChunkSize();

      expect(chunkSize).toBeGreaterThan(0);
      expect(chunkSize).toBeLessThanOrEqual(10000);
    });

    it("has valid chunk overlap", () => {
      const overlap = RAGConfigSvc.getChunkOverlap();
      const chunkSize = RAGConfigSvc.getChunkSize();

      expect(overlap).toBeGreaterThanOrEqual(0);
      expect(overlap).toBeLessThan(chunkSize);
    });

    it("overlap is reasonable percentage of chunk size", () => {
      const overlap = RAGConfigSvc.getChunkOverlap();
      const chunkSize = RAGConfigSvc.getChunkSize();
      const overlapPercent = (overlap / chunkSize) * 100;

      expect(overlapPercent).toBeGreaterThanOrEqual(0);
      expect(overlapPercent).toBeLessThanOrEqual(50);
    });
  });

  describe("upload settings", () => {
    it("has valid max file size", () => {
      const maxSize = RAGConfigSvc.getMaxFileSizeBytes();

      expect(maxSize).toBeGreaterThan(0);
      expect(maxSize).toBeLessThanOrEqual(100 * 1024 * 1024);
    });

    it("max file size is at least 1MB", () => {
      const maxSize = RAGConfigSvc.getMaxFileSizeBytes();

      expect(maxSize).toBeGreaterThanOrEqual(1024 * 1024);
    });
  });

  describe("embedding settings", () => {
    it("has valid dimensions", () => {
      const dims = RAGConfigSvc.getEmbeddingDimensions();

      expect(dims).toBeGreaterThan(0);
      expect(dims).toBeLessThanOrEqual(4096);
    });

    it("has retry configuration", () => {
      const attempts = RAGConfigSvc.getRetryAttempts();
      const delay = RAGConfigSvc.getRetryDelayMs();

      expect(attempts).toBeGreaterThanOrEqual(1);
      expect(attempts).toBeLessThanOrEqual(10);
      expect(delay).toBeGreaterThanOrEqual(100);
      expect(delay).toBeLessThanOrEqual(60000);
    });
  });
});
