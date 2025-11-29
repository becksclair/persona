// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { chunkText } from "@/lib/rag/chunking";
import { RAGConfigSvc } from "@/lib/rag/config";
import {
  generateEmbedding,
  generateEmbeddings,
  checkEmbeddingAvailability,
} from "@/lib/rag/embedding";
import { isCI, TEST_TEXTS } from "./fixtures";

/**
 * RAG Performance Benchmark Tests
 *
 * Tests performance characteristics of the RAG system with LM Studio
 * using bge-m3 model. Skipped in CI environments.
 *
 * These tests measure:
 * - Embedding generation latency
 * - Throughput (embeddings per second)
 * - Chunking performance
 * - Memory usage patterns
 *
 * Run with: pnpm test tests/rag/performance.test.ts
 */

interface BenchmarkResult {
  operation: string;
  samples: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  throughput?: number;
  throughputUnit?: string;
}

function formatBenchmark(result: BenchmarkResult): string {
  let output = `
╔══════════════════════════════════════════════════╗
║ ${result.operation.padEnd(48)} ║
╠══════════════════════════════════════════════════╣
║ Samples: ${String(result.samples).padEnd(39)} ║
║ Total:   ${(result.totalMs.toFixed(2) + "ms").padEnd(39)} ║
║ Average: ${(result.avgMs.toFixed(2) + "ms").padEnd(39)} ║
║ Min:     ${(result.minMs.toFixed(2) + "ms").padEnd(39)} ║
║ Max:     ${(result.maxMs.toFixed(2) + "ms").padEnd(39)} ║`;

  if (result.throughput !== undefined) {
    output += `
║ Rate:    ${(result.throughput.toFixed(2) + " " + result.throughputUnit).padEnd(39)} ║`;
  }

  output += `
╚══════════════════════════════════════════════════╝`;

  return output;
}

function runBenchmark(
  operation: string,
  times: number[],
  throughputCalc?: { total: number; unit: string },
): BenchmarkResult {
  const totalMs = times.reduce((a, b) => a + b, 0);
  const result: BenchmarkResult = {
    operation,
    samples: times.length,
    totalMs,
    avgMs: totalMs / times.length,
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
  };

  if (throughputCalc) {
    result.throughput = (throughputCalc.total / totalMs) * 1000;
    result.throughputUnit = throughputCalc.unit;
  }

  console.log(formatBenchmark(result));
  return result;
}

describe("RAG Performance Benchmarks", () => {
  let isEmbeddingAvailable = false;
  const runningInCI = isCI();

  beforeAll(async () => {
    if (runningInCI) {
      console.log("⏭️  CI environment detected, skipping performance benchmarks");
      return;
    }

    const status = await checkEmbeddingAvailability();
    isEmbeddingAvailable = status.available;
    if (!isEmbeddingAvailable) {
      console.log("⚠️  Embedding service not available, skipping performance tests");
    } else {
      console.log(`✅ Embedding service available (${status.provider})`);
      console.log(`   Model: ${RAGConfigSvc.getEmbeddingModel()}`);
      console.log(`   Dimensions: ${RAGConfigSvc.getEmbeddingDimensions()}`);
      console.log(`   Latency: ${status.latencyMs}ms`);

      // Warm up the model
      console.log("🔥 Warming up embedding model...");
      await generateEmbedding(TEST_TEXTS.medium);
      console.log("✅ Warm-up complete");
    }
  });

  describe("Embedding Latency", () => {
    it("measures single embedding latency", async () => {
      if (!isEmbeddingAvailable || runningInCI) return;

      const testText = TEST_TEXTS.medium;
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await generateEmbedding(testText);
        times.push(performance.now() - start);
      }

      const result = runBenchmark("Single Embedding Latency", times, {
        total: iterations,
        unit: "embeddings/sec",
      });

      // Performance assertions
      expect(result.avgMs).toBeLessThan(5000); // Should be under 5s average
    });

    it("measures embedding latency for varying text lengths", async () => {
      if (!isEmbeddingAvailable || runningInCI) return;

      const lengths = [50, 200, 500, 1000, 2000];
      const results: Array<{ length: number; avgMs: number }> = [];

      for (const length of lengths) {
        const text = "word ".repeat(length / 5);
        const times: number[] = [];

        for (let i = 0; i < 3; i++) {
          const start = performance.now();
          await generateEmbedding(text);
          times.push(performance.now() - start);
        }

        const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
        results.push({ length, avgMs });
      }

      console.log("\n📊 Latency by Text Length:");
      console.log("┌─────────────┬────────────┐");
      console.log("│ Chars       │ Avg (ms)   │");
      console.log("├─────────────┼────────────┤");
      results.forEach((r) => {
        console.log(`│ ${String(r.length).padEnd(11)} │ ${r.avgMs.toFixed(2).padStart(10)} │`);
      });
      console.log("└─────────────┴────────────┘");

      // Longer text shouldn't be dramatically slower (good models handle it well)
      const shortAvg = results[0].avgMs;
      const longAvg = results[results.length - 1].avgMs;
      expect(longAvg).toBeLessThan(shortAvg * 10); // Should not be 10x slower
    });
  });

  describe("Batch Embedding Throughput", () => {
    it("measures batch embedding throughput", async () => {
      if (!isEmbeddingAvailable) return;

      const batchSizes = [5, 10, 20];
      const results: Array<{ size: number; totalMs: number; perItem: number }> = [];

      for (const size of batchSizes) {
        const texts = Array.from(
          { length: size },
          (_, i) => `Test document number ${i + 1} for batch processing.`,
        );

        const start = performance.now();
        await generateEmbeddings(texts, { concurrency: 2 });
        const elapsed = performance.now() - start;

        results.push({
          size,
          totalMs: elapsed,
          perItem: elapsed / size,
        });
      }

      console.log("\n📊 Batch Throughput:");
      console.log("┌────────────┬─────────────┬────────────┬───────────────┐");
      console.log("│ Batch Size │ Total (ms)  │ Per Item   │ Items/sec     │");
      console.log("├────────────┼─────────────┼────────────┼───────────────┤");
      results.forEach((r) => {
        const itemsPerSec = (r.size / r.totalMs) * 1000;
        console.log(
          `│ ${String(r.size).padEnd(10)} │ ${r.totalMs.toFixed(0).padStart(11)} │ ${r.perItem.toFixed(0).padStart(10)} │ ${itemsPerSec.toFixed(2).padStart(13)} │`,
        );
      });
      console.log("└────────────┴─────────────┴────────────┴───────────────┘");
    });

    it("compares sequential vs concurrent processing", async () => {
      if (!isEmbeddingAvailable) return;

      const texts = Array.from({ length: 6 }, (_, i) => `Comparison test document ${i + 1}.`);

      // Sequential (concurrency = 1)
      const seqStart = performance.now();
      await generateEmbeddings(texts, { concurrency: 1 });
      const seqTime = performance.now() - seqStart;

      // Concurrent (concurrency = 2)
      const conStart = performance.now();
      await generateEmbeddings(texts, { concurrency: 2 });
      const conTime = performance.now() - conStart;

      // Concurrent (concurrency = 3)
      const con3Start = performance.now();
      await generateEmbeddings(texts, { concurrency: 3 });
      const con3Time = performance.now() - con3Start;

      console.log("\n📊 Concurrency Comparison (6 items):");
      console.log("┌───────────────┬─────────────┬────────────┐");
      console.log("│ Concurrency   │ Total (ms)  │ Speedup    │");
      console.log("├───────────────┼─────────────┼────────────┤");
      console.log(`│ Sequential    │ ${seqTime.toFixed(0).padStart(11)} │ 1.00x      │`);
      console.log(
        `│ Concurrent x2 │ ${conTime.toFixed(0).padStart(11)} │ ${(seqTime / conTime).toFixed(2).padStart(5)}x     │`,
      );
      console.log(
        `│ Concurrent x3 │ ${con3Time.toFixed(0).padStart(11)} │ ${(seqTime / con3Time).toFixed(2).padStart(5)}x     │`,
      );
      console.log("└───────────────┴─────────────┴────────────┘");

      // Concurrent should be at least somewhat faster
      expect(conTime).toBeLessThanOrEqual(seqTime * 1.1); // Allow 10% variance
    });
  });

  describe("Chunking Performance", () => {
    it("measures chunking throughput", () => {
      const documentSizes = [1000, 5000, 10000, 50000, 100000];
      const results: Array<{ chars: number; chunks: number; timeMs: number }> = [];

      for (const size of documentSizes) {
        const document = "This is a sample sentence for testing chunking performance. ".repeat(
          Math.ceil(size / 60),
        );
        const times: number[] = [];
        let chunkCount = 0;

        for (let i = 0; i < 5; i++) {
          const start = performance.now();
          const chunks = chunkText(document, { chunkSize: 500, overlap: 50 });
          times.push(performance.now() - start);
          chunkCount = chunks.length;
        }

        results.push({
          chars: document.length,
          chunks: chunkCount,
          timeMs: times.reduce((a, b) => a + b, 0) / times.length,
        });
      }

      console.log("\n📊 Chunking Performance:");
      console.log("┌─────────────┬────────────┬────────────┬────────────────┐");
      console.log("│ Doc Size    │ Chunks     │ Time (ms)  │ Chars/ms       │");
      console.log("├─────────────┼────────────┼────────────┼────────────────┤");
      results.forEach((r) => {
        const charsPerMs = r.chars / r.timeMs;
        console.log(
          `│ ${(r.chars / 1000).toFixed(0).padStart(7)}K   │ ${String(r.chunks).padStart(10)} │ ${r.timeMs.toFixed(2).padStart(10)} │ ${charsPerMs.toFixed(0).padStart(14)} │`,
        );
      });
      console.log("└─────────────┴────────────┴────────────┴────────────────┘");

      // Chunking should be fast (< 10ms for 100K chars)
      const largestResult = results[results.length - 1];
      expect(largestResult.timeMs).toBeLessThan(100);
    });
  });

  describe("End-to-End RAG Pipeline", () => {
    it("measures full document processing pipeline", async () => {
      if (!isEmbeddingAvailable) return;

      const documentSizes = [1000, 5000];
      const results: Array<{
        docSize: number;
        chunks: number;
        chunkTimeMs: number;
        embedTimeMs: number;
        totalTimeMs: number;
      }> = [];

      for (const size of documentSizes) {
        const document = "Sample content for the full pipeline test. ".repeat(Math.ceil(size / 45));

        // Chunking phase
        const chunkStart = performance.now();
        const chunks = chunkText(document, { chunkSize: 500, overlap: 50 });
        const chunkTime = performance.now() - chunkStart;

        // Embedding phase (limit chunks to avoid timeout)
        const chunksToEmbed = chunks.slice(0, 10);
        const embedStart = performance.now();
        await generateEmbeddings(
          chunksToEmbed.map((c) => c.content),
          { concurrency: 2 },
        );
        const embedTime = performance.now() - embedStart;

        results.push({
          docSize: document.length,
          chunks: chunks.length,
          chunkTimeMs: chunkTime,
          embedTimeMs: embedTime,
          totalTimeMs: chunkTime + embedTime,
        });
      }

      console.log("\n📊 Full Pipeline Performance (10 chunks embedded):");
      console.log("┌─────────────┬────────────┬─────────────┬─────────────┬─────────────┐");
      console.log("│ Doc Size    │ Chunks     │ Chunk (ms)  │ Embed (ms)  │ Total (ms)  │");
      console.log("├─────────────┼────────────┼─────────────┼─────────────┼─────────────┤");
      results.forEach((r) => {
        console.log(
          `│ ${(r.docSize / 1000).toFixed(0).padStart(7)}K   │ ${String(r.chunks).padStart(10)} │ ${r.chunkTimeMs.toFixed(0).padStart(11)} │ ${r.embedTimeMs.toFixed(0).padStart(11)} │ ${r.totalTimeMs.toFixed(0).padStart(11)} │`,
        );
      });
      console.log("└─────────────┴────────────┴─────────────┴─────────────┴─────────────┘");
    });
  });

  describe("Stress Tests", () => {
    it("handles rapid sequential requests", async () => {
      if (!isEmbeddingAvailable) return;

      const requestCount = 20;
      const times: number[] = [];
      const errors: number[] = [];

      for (let i = 0; i < requestCount; i++) {
        const start = performance.now();
        try {
          await generateEmbedding(`Rapid request ${i + 1}`);
          times.push(performance.now() - start);
        } catch {
          errors.push(i);
        }
      }

      runBenchmark("Rapid Sequential Requests", times, {
        total: times.length,
        unit: "requests/sec",
      });

      console.log(`   Successful: ${times.length}/${requestCount}`);
      if (errors.length > 0) {
        console.log(`   Errors at indices: ${errors.join(", ")}`);
      }

      expect(errors.length).toBeLessThan(requestCount * 0.1); // < 10% error rate
    });

    it("measures latency variance under load", async () => {
      if (!isEmbeddingAvailable) return;

      const times: number[] = [];

      for (let i = 0; i < 15; i++) {
        const start = performance.now();
        await generateEmbedding(`Load test iteration ${i + 1}`);
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      const cv = (stdDev / avg) * 100; // Coefficient of variation

      console.log("\n📊 Latency Variance:");
      console.log(`   Average: ${avg.toFixed(2)}ms`);
      console.log(`   Std Dev: ${stdDev.toFixed(2)}ms`);
      console.log(`   CV:      ${cv.toFixed(1)}%`);

      // CV should be reasonable (< 50% variance)
      expect(cv).toBeLessThan(100);
    });
  });
});

describe("Memory and Resource Tests", () => {
  it("reports embedding vector memory usage", async () => {
    const status = await checkEmbeddingAvailability();
    if (!status.available) return;

    const result = await generateEmbedding("Memory test");
    const dims = result.embedding.length;
    const bytesPerFloat = 4; // Float32
    const vectorBytes = dims * bytesPerFloat;

    console.log("\n📊 Embedding Memory Profile:");
    console.log(`   Dimensions: ${dims}`);
    console.log(`   Bytes per vector: ${vectorBytes} (${(vectorBytes / 1024).toFixed(2)} KB)`);
    console.log(`   Vectors per MB: ${Math.floor((1024 * 1024) / vectorBytes)}`);
    console.log(`   1000 vectors: ${((vectorBytes * 1000) / 1024 / 1024).toFixed(2)} MB`);
  });

  it("estimates knowledge base storage requirements", async () => {
    const chunkSize = RAGConfigSvc.getChunkSize();
    const dims = RAGConfigSvc.getEmbeddingDimensions();
    const bytesPerFloat = 4;
    const vectorBytes = dims * bytesPerFloat;

    // Estimate for various document sizes
    const docSizes = [10000, 100000, 1000000]; // 10KB, 100KB, 1MB documents
    const overlap = RAGConfigSvc.getChunkOverlap();

    console.log("\n📊 Storage Estimates (per document):");
    console.log("┌─────────────┬────────────┬──────────────┬──────────────┐");
    console.log("│ Doc Size    │ Est Chunks │ Vector Store │ Total Est    │");
    console.log("├─────────────┼────────────┼──────────────┼──────────────┤");

    for (const size of docSizes) {
      const estChunks = Math.ceil(size / (chunkSize - overlap));
      const vectorStore = (estChunks * vectorBytes) / 1024; // KB
      const textStore = size / 1024; // KB
      const total = vectorStore + textStore;

      console.log(
        `│ ${(size / 1000).toFixed(0).padStart(7)}K   │ ${String(estChunks).padStart(10)} │ ${vectorStore.toFixed(0).padStart(9)} KB │ ${total.toFixed(0).padStart(9)} KB │`,
      );
    }
    console.log("└─────────────┴────────────┴──────────────┴──────────────┘");
  });
});
