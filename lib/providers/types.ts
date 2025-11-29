import type { LanguageModel } from "ai";

/**
 * Supported model providers.
 */
export type ProviderType = "openai" | "lmstudio" | "anthropic" | "google" | "ollama";

/**
 * Provider configuration options.
 */
export interface ProviderConfig {
  baseUrl?: string;
  apiKey?: string;
}

/**
 * Provider status for availability checks.
 */
export interface ProviderStatus {
  provider: ProviderType;
  available: boolean;
  baseUrl?: string;
  models?: string[];
  error?: string;
}

/**
 * Abstract model provider interface.
 * All providers must implement this interface.
 */
export interface ModelProvider {
  /**
   * The provider type identifier.
   */
  readonly type: ProviderType;

  /**
   * Whether this provider runs locally (no API calls to external services).
   */
  readonly isLocal: boolean;

  /**
   * Get an AI SDK language model instance for the given model ID.
   */
  getModel(modelId: string): LanguageModel;

  /**
   * Check if this provider is available and configured.
   */
  checkStatus(): Promise<ProviderStatus>;

  /**
   * Get list of available models from this provider (if supported).
   */
  listModels?(): Promise<string[]>;
}

/**
 * Provider factory function type.
 */
export type ProviderFactory = (config?: ProviderConfig) => ModelProvider;
