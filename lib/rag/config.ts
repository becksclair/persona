import { z } from "zod";
import ragConfig from "@/config/rag.json";

/**
 * RAG Configuration Schema
 */
export const RAGConfigSchema = z.object({
  version: z.string(),
  retrieval: z.object({
    defaultTopK: z.number().int().min(1).max(50).default(8),
    maxTopK: z.number().int().default(20),
    minSimilarityScore: z.number().min(0).max(1).default(0.5),
  }),
  chunking: z
    .object({
      chunkSize: z.number().int().default(500),
      chunkOverlap: z.number().int().default(50),
    })
    .default({ chunkSize: 500, chunkOverlap: 50 }),
  upload: z
    .object({
      maxFileSizeBytes: z.number().int().default(10485760), // 10MB
    })
    .default({ maxFileSizeBytes: 10485760 }),
  embedding: z
    .object({
      provider: z.enum(["lmstudio", "openai"]).default("lmstudio"),
      model: z.string().default("text-embedding-bge-m3"),
      dimensions: z.number().int().default(1024),
      fallbackProvider: z.enum(["lmstudio", "openai"]).optional(),
      fallbackModel: z.string().optional(),
      fallbackDimensions: z.number().int().optional(),
      retryAttempts: z.number().int().min(1).max(5).default(3),
      retryDelayMs: z.number().int().min(100).max(10000).default(1000),
    })
    .default({
      provider: "lmstudio",
      model: "text-embedding-bge-m3",
      dimensions: 1024,
      retryAttempts: 3,
      retryDelayMs: 1000,
    }),
});

export type RAGConfig = z.infer<typeof RAGConfigSchema>;

/**
 * Centralized RAG configuration service
 */
class RAGConfigService {
  private config: RAGConfig | null = null;

  getConfig(): RAGConfig {
    if (this.config) return this.config;

    const result = RAGConfigSchema.safeParse(ragConfig);
    if (!result.success) {
      console.error("[RAGConfig] Invalid config/rag.json:", result.error.format());
      // Return defaults
      this.config = RAGConfigSchema.parse({
        version: "1.0",
        retrieval: {},
        chunking: {},
        upload: {},
        embedding: {},
      });
      return this.config;
    }

    this.config = result.data;
    return this.config;
  }

  // Retrieval settings
  getDefaultTopK(): number {
    return this.getConfig().retrieval.defaultTopK;
  }

  getMaxTopK(): number {
    return this.getConfig().retrieval.maxTopK;
  }

  getMinSimilarityScore(): number {
    return this.getConfig().retrieval.minSimilarityScore;
  }

  // Chunking settings
  getChunkSize(): number {
    return this.getConfig().chunking.chunkSize;
  }

  getChunkOverlap(): number {
    return this.getConfig().chunking.chunkOverlap;
  }

  // Upload settings
  getMaxFileSizeBytes(): number {
    return this.getConfig().upload.maxFileSizeBytes;
  }

  // Embedding settings
  getEmbeddingProvider(): "lmstudio" | "openai" {
    return this.getConfig().embedding.provider;
  }

  getEmbeddingModel(): string {
    return this.getConfig().embedding.model;
  }

  getEmbeddingDimensions(): number {
    return this.getConfig().embedding.dimensions;
  }

  getFallbackEmbeddingProvider(): "lmstudio" | "openai" | undefined {
    return this.getConfig().embedding.fallbackProvider;
  }

  getFallbackEmbeddingModel(): string | undefined {
    return this.getConfig().embedding.fallbackModel;
  }

  getFallbackEmbeddingDimensions(): number | undefined {
    return this.getConfig().embedding.fallbackDimensions;
  }

  getRetryAttempts(): number {
    return this.getConfig().embedding.retryAttempts;
  }

  getRetryDelayMs(): number {
    return this.getConfig().embedding.retryDelayMs;
  }

  // Utilities
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export const RAGConfigSvc = new RAGConfigService();
