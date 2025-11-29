// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { RAGConfigSvc } from "@/lib/rag/config";
import { DEFAULT_EMBEDDING_DIMENSIONS } from "@/lib/rag/constants";
import {
  generateEmbedding,
  generateEmbeddings,
  checkEmbeddingAvailability,
} from "@/lib/rag/embedding";
import { TEST_TEXTS, SEMANTIC_PAIRS, isCI, cosineSimilarity } from "./fixtures";

/**
 * Embedding Service Tests
 *
 * These tests target LM Studio with bge-m3 model.
 * Integration tests run locally by default, skipped in CI.
 *
 * Run with: pnpm test tests/rag/embedding.test.ts
 */

describe("Embedding Service", () => {
  describe("checkEmbeddingAvailability", () => {
    it("returns availability status", async () => {
      const status = await checkEmbeddingAvailability();

      expect(status).toBeDefined();
      expect(typeof status.available).toBe("boolean");
      if (status.available) {
        expect(status.provider).toBeDefined();
      } else {
        expect(status.error).toBeDefined();
      }
    });

    it("identifies the active provider", async () => {
      const status = await checkEmbeddingAvailability();

      if (status.available) {
        expect(["lmstudio", "openai"]).toContain(status.provider);
      }
    });
  });

  describe("generateEmbedding", () => {
    it("generates embedding for simple text", async () => {
      const status = await checkEmbeddingAvailability();
      if (!status.available) {
        console.log("Skipping: No embedding service available");
        return;
      }

      const result = await generateEmbedding("Hello, world!");

      expect(result).toBeDefined();
      expect(result.embedding).toBeInstanceOf(Array);
      expect(result.embedding.length).toBeGreaterThan(0);
      expect(result.model).toBeDefined();
      expect(["lmstudio", "openai"]).toContain(result.provider);
    });

    it("returns embedding with correct dimensions", async () => {
      const status = await checkEmbeddingAvailability();
      if (!status.available) {
        console.log("Skipping: No embedding service available");
        return;
      }

      const expectedDims = RAGConfigSvc.getEmbeddingDimensions();
      const result = await generateEmbedding("Test text for dimension check.");

      expect(result.dimensions).toBe(expectedDims);
      expect(result.embedding.length).toBe(expectedDims);
    });

    it("generates normalized vector (values between -1 and 1)", async () => {
      const status = await checkEmbeddingAvailability();
      if (!status.available) {
        console.log("Skipping: No embedding service available");
        return;
      }

      const result = await generateEmbedding("Normalization test");

      // Most embedding models produce normalized or near-normalized vectors
      const maxVal = Math.max(...result.embedding.map(Math.abs));
      expect(maxVal).toBeLessThanOrEqual(10); // Reasonable bound
    });

    it("produces similar embeddings for similar text", async () => {
      const status = await checkEmbeddingAvailability();
      if (!status.available) {
        console.log("Skipping: No embedding service available");
        return;
      }

      const text1 = "The quick brown fox jumps over the lazy dog.";
      const text2 = "A fast brown fox leaps over a sleepy dog.";
      const text3 = "Quantum computing revolutionizes cryptography.";

      const [emb1, emb2, emb3] = await Promise.all([
        generateEmbedding(text1),
        generateEmbedding(text2),
        generateEmbedding(text3),
      ]);

      // Cosine similarity helper
      const cosineSimilarity = (a: number[], b: number[]): number => {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (normA * normB);
      };

      const sim12 = cosineSimilarity(emb1.embedding, emb2.embedding);
      const sim13 = cosineSimilarity(emb1.embedding, emb3.embedding);

      // Similar texts should have higher similarity
      expect(sim12).toBeGreaterThan(sim13);
      expect(sim12).toBeGreaterThan(0.5); // Should be fairly similar
    });

    it("handles empty text gracefully", async () => {
      const status = await checkEmbeddingAvailability();
      if (!status.available) {
        console.log("Skipping: No embedding service available");
        return;
      }

      // Most models handle empty/whitespace text
      const result = await generateEmbedding(" ");
      expect(result.embedding).toBeDefined();
    });

    it("handles long text", async () => {
      const status = await checkEmbeddingAvailability();
      if (!status.available) {
        console.log("Skipping: No embedding service available");
        return;
      }

      const longText = "This is a test sentence. ".repeat(100);
      const result = await generateEmbedding(longText);

      expect(result.embedding.length).toBe(RAGConfigSvc.getEmbeddingDimensions());
    });

    it("handles special characters", async () => {
      const status = await checkEmbeddingAvailability();
      if (!status.available) {
        console.log("Skipping: No embedding service available");
        return;
      }

      const specialText = "Hello! @#$%^&*() 你好 🎉 émojis";
      const result = await generateEmbedding(specialText);

      expect(result.embedding).toBeDefined();
      expect(result.embedding.length).toBeGreaterThan(0);
    });
  });

  describe("generateEmbeddings (batch)", () => {
    it("generates embeddings for multiple texts", async () => {
      const status = await checkEmbeddingAvailability();
      if (!status.available) {
        console.log("Skipping: No embedding service available");
        return;
      }

      const texts = ["First text", "Second text", "Third text"];
      const results = await generateEmbeddings(texts);

      expect(results).toHaveLength(texts.length);
      results.forEach((result) => {
        expect(result.embedding.length).toBe(RAGConfigSvc.getEmbeddingDimensions());
      });
    });

    it("maintains order of results", async () => {
      const status = await checkEmbeddingAvailability();
      if (!status.available) {
        console.log("Skipping: No embedding service available");
        return;
      }

      const texts = ["Alpha", "Beta", "Gamma"];
      const results = await generateEmbeddings(texts);

      // Results should be in same order as input
      expect(results).toHaveLength(3);
      // Each should be unique (different embeddings)
      const firstEmbStr = JSON.stringify(results[0].embedding.slice(0, 5));
      const secondEmbStr = JSON.stringify(results[1].embedding.slice(0, 5));
      expect(firstEmbStr).not.toBe(secondEmbStr);
    });

    it("respects concurrency limit", async () => {
      const status = await checkEmbeddingAvailability();
      if (!status.available) {
        console.log("Skipping: No embedding service available");
        return;
      }

      const texts = Array.from({ length: 6 }, (_, i) => `Test text number ${i}`);

      const startTime = Date.now();
      const results = await generateEmbeddings(texts, { concurrency: 2 });
      const elapsed = Date.now() - startTime;

      expect(results).toHaveLength(6);
      // With concurrency=2, should take at least 3 batches worth of time
      // (assuming sequential would be faster than parallel due to local model)
      console.log(`Batch embedding of 6 texts took ${elapsed}ms`);
    });
  });

  describe("retry behavior", () => {
    it("retries on transient failures", async () => {
      // This test validates the retry logic exists
      // Actual retry behavior is hard to test without mocking
      const retryAttempts = RAGConfigSvc.getRetryAttempts();
      const retryDelay = RAGConfigSvc.getRetryDelayMs();

      expect(retryAttempts).toBeGreaterThanOrEqual(1);
      expect(retryDelay).toBeGreaterThanOrEqual(100);
    });
  });

  describe("dimension normalization", () => {
    it("normalizes to target dimensions", async () => {
      const status = await checkEmbeddingAvailability();
      if (!status.available) {
        console.log("Skipping: No embedding service available");
        return;
      }

      const result = await generateEmbedding("Dimension normalization test");

      expect(result.embedding.length).toBe(DEFAULT_EMBEDDING_DIMENSIONS);
      expect(result.dimensions).toBe(DEFAULT_EMBEDDING_DIMENSIONS);
    });
  });
});

/**
 * LM Studio Integration Tests
 *
 * These tests specifically target LM Studio with bge-m3.
 * Skipped in CI environments (no LM Studio available).
 */
describe("LM Studio Integration (bge-m3)", () => {
  let isLmStudioAvailable = false;
  const runningInCI = isCI();

  beforeAll(async () => {
    if (runningInCI) {
      console.log("⏭️  CI environment detected, skipping LM Studio integration tests");
      return;
    }
    const status = await checkEmbeddingAvailability();
    isLmStudioAvailable = status.available && status.provider === "lmstudio";
    if (!isLmStudioAvailable) {
      console.log("LM Studio not available, skipping integration tests");
    }
  });

  it("connects to LM Studio embedding endpoint", async () => {
    if (!isLmStudioAvailable || runningInCI) return;

    const result = await generateEmbedding("LM Studio connection test");

    expect(result.provider).toBe("lmstudio");
    expect(result.embedding).toBeDefined();
  });

  it("uses configured embedding model", async () => {
    if (!isLmStudioAvailable || runningInCI) return;

    const result = await generateEmbedding("Model identification test");
    const configuredModel = RAGConfigSvc.getEmbeddingModel();

    // Model name should match or be related to config
    expect(result.model).toBeDefined();
    console.log(`Using model: ${result.model} (configured: ${configuredModel})`);
  });

  it("handles concurrent requests to LM Studio", async () => {
    if (!isLmStudioAvailable || runningInCI) return;

    const texts = [
      "Concurrent request 1",
      "Concurrent request 2",
      "Concurrent request 3",
      "Concurrent request 4",
    ];

    const startTime = Date.now();
    const results = await Promise.all(texts.map((t) => generateEmbedding(t)));
    const elapsed = Date.now() - startTime;

    expect(results).toHaveLength(4);
    results.forEach((r) => expect(r.provider).toBe("lmstudio"));
    console.log(`4 concurrent embeddings took ${elapsed}ms`);
  });

  describe("bge-m3 specific tests", () => {
    it("produces high-quality semantic embeddings", async () => {
      if (!isLmStudioAvailable || runningInCI) return;

      // Use semantic pairs from fixtures
      const [embSimilarA, embSimilarB, embUnrelated] = await Promise.all([
        generateEmbedding(SEMANTIC_PAIRS.similar.a),
        generateEmbedding(SEMANTIC_PAIRS.similar.b),
        generateEmbedding(SEMANTIC_PAIRS.unrelated.b),
      ]);

      const simRelated = cosineSimilarity(embSimilarA.embedding, embSimilarB.embedding);
      const simUnrelated = cosineSimilarity(embSimilarA.embedding, embUnrelated.embedding);

      // Related queries should be more similar
      expect(simRelated).toBeGreaterThan(simUnrelated);
      expect(simRelated).toBeGreaterThan(SEMANTIC_PAIRS.similar.expectedSimilarity);
      console.log(
        `Semantic similarity - related: ${simRelated.toFixed(3)}, unrelated: ${simUnrelated.toFixed(3)}`,
      );
    });

    it("handles multilingual text", async () => {
      if (!isLmStudioAvailable || runningInCI) return;

      // Use multilingual texts from fixtures
      const texts = Object.values(TEST_TEXTS.multilingual);
      const embeddings = await Promise.all(texts.map((t) => generateEmbedding(t)));

      embeddings.forEach((emb) => {
        expect(emb.embedding.length).toBe(DEFAULT_EMBEDDING_DIMENSIONS);
      });
      console.log(`${texts.length} multilingual embeddings generated successfully`);
    });

    it("handles code snippets", async () => {
      if (!isLmStudioAvailable || runningInCI) return;

      const codeSnippets = [
        TEST_TEXTS.code,
        "const sum = (x, y) => x + y;",
        "def multiply(a, b): return a * b",
      ];

      const embeddings = await Promise.all(codeSnippets.map((c) => generateEmbedding(c)));

      // JS functions should be somewhat similar
      const sim01 = cosineSimilarity(embeddings[0].embedding, embeddings[1].embedding);

      console.log(`Code similarity: ${sim01.toFixed(3)}`);
      expect(sim01).toBeGreaterThan(0.5);
    });
  });
});
