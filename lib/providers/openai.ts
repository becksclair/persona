import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { ModelProvider, ProviderStatus, ProviderConfig } from "./types";

/**
 * OpenAI provider implementation.
 */
export class OpenAIProvider implements ModelProvider {
  readonly type = "openai" as const;
  readonly isLocal = false;

  constructor(_config?: ProviderConfig) {
    // OpenAI uses OPENAI_API_KEY env var automatically
  }

  getModel(modelId: string): LanguageModel {
    return openai(modelId);
  }

  async checkStatus(): Promise<ProviderStatus> {
    const hasKey = !!process.env.OPENAI_API_KEY;
    return {
      provider: "openai",
      available: hasKey,
      error: hasKey ? undefined : "OPENAI_API_KEY not configured",
    };
  }
}

/**
 * Factory function for OpenAI provider.
 */
export function createOpenAIProvider(config?: ProviderConfig): ModelProvider {
  return new OpenAIProvider(config);
}
