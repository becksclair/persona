/**
 * RAG System Constants
 *
 * Single source of truth for embedding dimensions and model configurations.
 * Update this file when changing embedding models.
 */

/**
 * Supported embedding models and their configurations
 */
export const EMBEDDING_MODELS = {
  "text-embedding-bge-m3": {
    dimensions: 1024,
    provider: "lmstudio" as const,
    description: "BGE-M3 multilingual embedding model",
  },
  "text-embedding-nomic-embed-text-v1.5": {
    dimensions: 768,
    provider: "lmstudio" as const,
    description: "Nomic Embed Text v1.5",
  },
  "jina-embeddings-v3": {
    dimensions: 1024,
    provider: "lmstudio" as const,
    description: "Jina Embeddings v3 (slow, use bge-m3 instead)",
  },
  "text-embedding-3-small": {
    dimensions: 1536,
    provider: "openai" as const,
    description: "OpenAI text-embedding-3-small",
  },
  "text-embedding-3-large": {
    dimensions: 3072,
    provider: "openai" as const,
    description: "OpenAI text-embedding-3-large",
  },
} as const;

export type EmbeddingModelId = keyof typeof EMBEDDING_MODELS;

/**
 * Default embedding model
 * This is the primary model used when LM Studio is available
 */
export const DEFAULT_EMBEDDING_MODEL: EmbeddingModelId = "text-embedding-bge-m3";

/**
 * Get dimensions for the default embedding model
 * This is the value used in the database schema
 */
export const DEFAULT_EMBEDDING_DIMENSIONS = EMBEDDING_MODELS[DEFAULT_EMBEDDING_MODEL].dimensions;

/**
 * Fallback embedding model (when primary is unavailable)
 */
export const FALLBACK_EMBEDDING_MODEL: EmbeddingModelId = "text-embedding-3-small";
export const FALLBACK_EMBEDDING_DIMENSIONS = EMBEDDING_MODELS[FALLBACK_EMBEDDING_MODEL].dimensions;

/**
 * Get dimensions for a specific model
 */
export function getModelDimensions(modelId: string): number {
  const model = EMBEDDING_MODELS[modelId as EmbeddingModelId];
  if (model) return model.dimensions;
  // Default to the primary model dimensions if unknown
  return DEFAULT_EMBEDDING_DIMENSIONS;
}

/**
 * Retry configuration
 * Can be overridden via environment variables for testing
 */
export const RETRY_CONFIG = {
  get attempts(): number {
    const envVal = process.env.TEST_RETRY_ATTEMPTS;
    return envVal ? parseInt(envVal, 10) : 3;
  },
  get delayMs(): number {
    const envVal = process.env.TEST_RETRY_DELAY_MS;
    return envVal ? parseInt(envVal, 10) : 1000;
  },
  get maxDelayMs(): number {
    return this.delayMs * Math.pow(2, this.attempts - 1);
  },
};

/**
 * LM Studio configuration
 * Supports separate embedding provider via EMBEDDING_BASE_URL (e.g., KoboldCpp)
 */
export const LM_STUDIO_CONFIG = {
  get baseUrl(): string {
    return process.env.LM_STUDIO_BASE_URL || "http://localhost:1234/v1";
  },
  get embeddingBaseUrl(): string {
    return process.env.EMBEDDING_BASE_URL || this.baseUrl;
  },
  get embeddingsEndpoint(): string {
    return `${this.embeddingBaseUrl}/embeddings`;
  },
  get modelsEndpoint(): string {
    return `${this.baseUrl}/models`;
  },
};
