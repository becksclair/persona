import { RAGConfigSvc } from "./config";
import { DEFAULT_EMBEDDING_DIMENSIONS, RETRY_CONFIG, LM_STUDIO_CONFIG } from "./constants";

/**
 * Embedding service for generating vector embeddings using local LM Studio
 * or OpenAI as fallback. Includes retry logic and dimension normalization.
 */

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  provider: "lmstudio" | "openai";
  dimensions: number;
}

export interface EmbeddingServiceStatus {
  available: boolean;
  provider?: "lmstudio" | "openai";
  model?: string;
  error?: string;
  latencyMs?: number;
}

// Use constant from single source of truth
const TARGET_DIMENSIONS = DEFAULT_EMBEDDING_DIMENSIONS;

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize embedding to target dimensions (truncate or pad)
 */
function normalizeEmbedding(embedding: number[], targetDims: number): number[] {
  if (embedding.length === targetDims) return embedding;

  if (embedding.length > targetDims) {
    // Truncate (loses information but maintains compatibility)
    console.warn(`[Embedding] Truncating ${embedding.length}D → ${targetDims}D`);
    return embedding.slice(0, targetDims);
  }

  // Pad with zeros (not ideal but maintains compatibility)
  console.warn(`[Embedding] Padding ${embedding.length}D → ${targetDims}D`);
  const padding = Array.from({ length: targetDims - embedding.length }, () => 0);
  return [...embedding, ...padding];
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { attempts: number; delayMs: number; name: string },
): Promise<T> {
  const { attempts, delayMs, name } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < attempts) {
        const backoff = delayMs * Math.pow(2, attempt - 1);
        console.warn(
          `[Embedding] ${name} attempt ${attempt}/${attempts} failed, retrying in ${backoff}ms:`,
          lastError.message,
        );
        await sleep(backoff);
      }
    }
  }

  throw lastError ?? new Error(`${name} failed after ${attempts} attempts`);
}

/**
 * Generate embeddings for a single text string with retry and fallback
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const provider = RAGConfigSvc.getEmbeddingProvider();
  const model = RAGConfigSvc.getEmbeddingModel();
  // Use RETRY_CONFIG which respects TEST_RETRY_* env vars for faster tests
  const retryAttempts = RETRY_CONFIG.attempts;
  const retryDelayMs = RETRY_CONFIG.delayMs;

  try {
    return await withRetry(() => callEmbeddingApi(provider, model, text), {
      attempts: retryAttempts,
      delayMs: retryDelayMs,
      name: `${provider}/${model}`,
    });
  } catch (error) {
    // Try fallback if configured
    const fallbackProvider = RAGConfigSvc.getFallbackEmbeddingProvider();
    const fallbackModel = RAGConfigSvc.getFallbackEmbeddingModel();

    if (fallbackProvider && fallbackModel) {
      console.warn(
        `[Embedding] Primary ${provider}/${model} failed after retries, trying fallback ${fallbackProvider}/${fallbackModel}:`,
        error instanceof Error ? error.message : error,
      );
      return await withRetry(() => callEmbeddingApi(fallbackProvider, fallbackModel, text), {
        attempts: retryAttempts,
        delayMs: retryDelayMs,
        name: `${fallbackProvider}/${fallbackModel}`,
      });
    }

    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch with concurrency limit
 */
export async function generateEmbeddings(
  texts: string[],
  options?: { concurrency?: number },
): Promise<EmbeddingResult[]> {
  const concurrency = options?.concurrency ?? 2; // Conservative for local models
  const results: EmbeddingResult[] = [];

  // Process in batches
  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((text) => generateEmbedding(text)));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Call the embedding API for a specific provider
 */
async function callEmbeddingApi(
  provider: "lmstudio" | "openai",
  model: string,
  text: string,
): Promise<EmbeddingResult> {
  if (provider === "lmstudio") {
    return callLmStudioEmbedding(model, text);
  }
  return callOpenAIEmbedding(model, text);
}

/**
 * LM Studio embedding API (OpenAI-compatible)
 */
async function callLmStudioEmbedding(model: string, text: string): Promise<EmbeddingResult> {
  const response = await fetch(LM_STUDIO_CONFIG.embeddingsEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LM Studio embedding failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  const embedding = data.data?.[0]?.embedding;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Invalid embedding response from LM Studio");
  }

  // Normalize to target dimensions
  const normalized = normalizeEmbedding(embedding, TARGET_DIMENSIONS);

  return {
    embedding: normalized,
    model,
    provider: "lmstudio",
    dimensions: normalized.length,
  };
}

/**
 * OpenAI embedding API
 */
async function callOpenAIEmbedding(model: string, text: string): Promise<EmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  const embedding = data.data?.[0]?.embedding;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Invalid embedding response from OpenAI");
  }

  // Normalize to target dimensions (OpenAI models may differ)
  const normalized = normalizeEmbedding(embedding, TARGET_DIMENSIONS);

  return {
    embedding: normalized,
    model,
    provider: "openai",
    dimensions: normalized.length,
  };
}

/**
 * Check if embedding service is available with detailed status
 */
export async function checkEmbeddingAvailability(): Promise<EmbeddingServiceStatus> {
  const provider = RAGConfigSvc.getEmbeddingProvider();
  const model = RAGConfigSvc.getEmbeddingModel();

  if (provider === "lmstudio") {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(LM_STUDIO_CONFIG.modelsEndpoint, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        return { available: true, provider: "lmstudio", model, latencyMs };
      }
      return {
        available: false,
        provider: "lmstudio",
        model,
        error: `HTTP ${response.status}`,
        latencyMs,
      };
    } catch (error) {
      // Check fallback
      const fallback = RAGConfigSvc.getFallbackEmbeddingProvider();
      if (fallback === "openai" && process.env.OPENAI_API_KEY) {
        return {
          available: true,
          provider: "openai",
          model: RAGConfigSvc.getFallbackEmbeddingModel(),
        };
      }
      return {
        available: false,
        provider: "lmstudio",
        model,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    return { available: true, provider: "openai", model };
  }
  return { available: false, provider: "openai", model, error: "OPENAI_API_KEY not configured" };
}
