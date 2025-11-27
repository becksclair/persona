import { describe, it, expect } from "vitest";
import { RAGConfigSvc, RAGConfigSchema } from "@/lib/rag/config";

describe("RAG Configuration", () => {
  describe("RAGConfigSchema", () => {
    it("validates complete config", () => {
      const config = {
        version: "1.0",
        retrieval: {
          defaultTopK: 8,
          maxTopK: 20,
          minSimilarityScore: 0.5,
        },
        chunking: {
          chunkSize: 500,
          chunkOverlap: 50,
        },
        upload: {
          maxFileSizeBytes: 10485760,
        },
        embedding: {
          provider: "lmstudio",
          model: "jina-embeddings-v3",
          dimensions: 768,
          retryAttempts: 3,
          retryDelayMs: 1000,
        },
      };

      const result = RAGConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("applies defaults for missing fields", () => {
      const minimalConfig = {
        version: "1.0",
        retrieval: {},
      };

      const result = RAGConfigSchema.parse(minimalConfig);
      expect(result.retrieval.defaultTopK).toBe(8);
      expect(result.chunking.chunkSize).toBe(500);
      expect(result.embedding.dimensions).toBe(1024);
      expect(result.embedding.retryAttempts).toBe(3);
    });

    it("validates provider enum", () => {
      const invalidConfig = {
        version: "1.0",
        retrieval: {},
        embedding: {
          provider: "invalid-provider",
        },
      };

      const result = RAGConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it("enforces topK bounds", () => {
      const config = {
        version: "1.0",
        retrieval: {
          defaultTopK: 100, // Too high
        },
      };

      const result = RAGConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("enforces retry attempts bounds", () => {
      const validConfig = {
        version: "1.0",
        retrieval: {},
        embedding: {
          retryAttempts: 5, // Max allowed
        },
      };

      const invalidConfig = {
        version: "1.0",
        retrieval: {},
        embedding: {
          retryAttempts: 10, // Too high
        },
      };

      expect(RAGConfigSchema.safeParse(validConfig).success).toBe(true);
      expect(RAGConfigSchema.safeParse(invalidConfig).success).toBe(false);
    });
  });

  describe("RAGConfigSvc", () => {
    it("loads configuration from file", () => {
      const config = RAGConfigSvc.getConfig();
      expect(config).toBeDefined();
      expect(config.version).toBeDefined();
    });

    it("returns consistent config (caching)", () => {
      const config1 = RAGConfigSvc.getConfig();
      const config2 = RAGConfigSvc.getConfig();
      expect(config1).toBe(config2);
    });

    describe("retrieval settings", () => {
      it("returns default topK", () => {
        const topK = RAGConfigSvc.getDefaultTopK();
        expect(topK).toBeGreaterThan(0);
        expect(topK).toBeLessThanOrEqual(50);
      });

      it("returns max topK", () => {
        const maxTopK = RAGConfigSvc.getMaxTopK();
        expect(maxTopK).toBeGreaterThanOrEqual(RAGConfigSvc.getDefaultTopK());
      });

      it("returns min similarity score between 0 and 1", () => {
        const score = RAGConfigSvc.getMinSimilarityScore();
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    describe("chunking settings", () => {
      it("returns positive chunk size", () => {
        const size = RAGConfigSvc.getChunkSize();
        expect(size).toBeGreaterThan(0);
      });

      it("returns chunk overlap less than chunk size", () => {
        const overlap = RAGConfigSvc.getChunkOverlap();
        const size = RAGConfigSvc.getChunkSize();
        expect(overlap).toBeLessThan(size);
      });
    });

    describe("upload settings", () => {
      it("returns max file size in bytes", () => {
        const maxSize = RAGConfigSvc.getMaxFileSizeBytes();
        expect(maxSize).toBeGreaterThan(0);
        expect(maxSize).toBeLessThanOrEqual(100 * 1024 * 1024); // Max 100MB reasonable
      });
    });

    describe("embedding settings", () => {
      it("returns valid provider", () => {
        const provider = RAGConfigSvc.getEmbeddingProvider();
        expect(["lmstudio", "openai"]).toContain(provider);
      });

      it("returns embedding model name", () => {
        const model = RAGConfigSvc.getEmbeddingModel();
        expect(model).toBeTruthy();
        expect(typeof model).toBe("string");
      });

      it("returns positive dimensions", () => {
        const dims = RAGConfigSvc.getEmbeddingDimensions();
        expect(dims).toBeGreaterThan(0);
      });

      it("returns retry configuration", () => {
        const attempts = RAGConfigSvc.getRetryAttempts();
        const delay = RAGConfigSvc.getRetryDelayMs();
        expect(attempts).toBeGreaterThanOrEqual(1);
        expect(delay).toBeGreaterThanOrEqual(100);
      });
    });

    describe("utilities", () => {
      it("formats file sizes correctly", () => {
        expect(RAGConfigSvc.formatFileSize(500)).toBe("500 B");
        expect(RAGConfigSvc.formatFileSize(1024)).toBe("1.0 KB");
        expect(RAGConfigSvc.formatFileSize(1024 * 1024)).toBe("1.0 MB");
        expect(RAGConfigSvc.formatFileSize(10 * 1024 * 1024)).toBe("10.0 MB");
      });
    });
  });
});
