import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { ModelProvider, ProviderStatus, ProviderConfig } from "./types";

const DEFAULT_BASE_URL = "http://localhost:1234/v1";

/**
 * LM Studio provider implementation.
 * Uses OpenAI-compatible API.
 */
export class LMStudioProvider implements ModelProvider {
  readonly type = "lmstudio" as const;
  readonly isLocal = true;

  private baseUrl: string;
  private provider: ReturnType<typeof createOpenAI>;

  constructor(config?: ProviderConfig) {
    this.baseUrl = config?.baseUrl ?? process.env.LM_STUDIO_BASE_URL ?? DEFAULT_BASE_URL;
    this.provider = createOpenAI({
      baseURL: this.baseUrl,
      apiKey: "lm-studio", // LM Studio doesn't require a real API key
    });
  }

  getModel(modelId: string): LanguageModel {
    return this.provider(modelId);
  }

  async checkStatus(): Promise<ProviderStatus> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/models`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return {
          provider: "lmstudio",
          available: false,
          baseUrl: this.baseUrl,
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const models = data.data?.map((m: { id: string }) => m.id) ?? [];

      return {
        provider: "lmstudio",
        available: true,
        baseUrl: this.baseUrl,
        models,
      };
    } catch (error) {
      return {
        provider: "lmstudio",
        available: false,
        baseUrl: this.baseUrl,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  async listModels(): Promise<string[]> {
    const status = await this.checkStatus();
    return status.models ?? [];
  }
}

/**
 * Factory function for LM Studio provider.
 */
export function createLMStudioProvider(config?: ProviderConfig): ModelProvider {
  return new LMStudioProvider(config);
}
