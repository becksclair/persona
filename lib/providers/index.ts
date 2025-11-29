/**
 * Provider abstraction layer.
 *
 * This module provides a unified interface for different LLM providers.
 * Add new providers by implementing the ModelProvider interface.
 *
 * Usage:
 * ```ts
 * import { ProviderRegistry } from '@/lib/providers';
 *
 * // Get a model from any provider
 * const model = ProviderRegistry.getModel('openai', 'gpt-4o');
 *
 * // Check provider availability
 * const statuses = await ProviderRegistry.checkAllProviders();
 * ```
 */

export * from "./types";
export * from "./registry";
export { createOpenAIProvider } from "./openai";
export { createLMStudioProvider } from "./lmstudio";
