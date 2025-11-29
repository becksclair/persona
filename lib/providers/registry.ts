import type { ModelProvider, ProviderType, ProviderConfig, ProviderStatus } from "./types";
import { createOpenAIProvider } from "./openai";
import { createLMStudioProvider } from "./lmstudio";

/**
 * Provider registry - manages all model providers.
 * Provides a single point of access for creating and managing providers.
 */
class ProviderRegistryImpl {
  private providers: Map<ProviderType, ModelProvider> = new Map();

  /**
   * Get or create a provider instance.
   * Providers are cached for reuse.
   */
  getProvider(type: ProviderType, config?: ProviderConfig): ModelProvider {
    // Check cache first
    const cached = this.providers.get(type);
    if (cached) return cached;

    // Create new provider
    const provider = this.createProvider(type, config);
    this.providers.set(type, provider);
    return provider;
  }

  /**
   * Create a new provider instance.
   */
  private createProvider(type: ProviderType, config?: ProviderConfig): ModelProvider {
    switch (type) {
      case "openai":
        return createOpenAIProvider(config);
      case "lmstudio":
        return createLMStudioProvider(config);
      case "anthropic":
        // TODO: Implement Anthropic provider
        throw new Error("Anthropic provider not yet implemented");
      case "google":
        // TODO: Implement Google provider
        throw new Error("Google provider not yet implemented");
      case "ollama":
        // TODO: Implement Ollama provider
        throw new Error("Ollama provider not yet implemented");
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Check status of all registered providers.
   */
  async checkAllProviders(): Promise<ProviderStatus[]> {
    // Ensure core providers are registered
    this.getProvider("openai");
    this.getProvider("lmstudio");

    const statuses = await Promise.all(
      Array.from(this.providers.values()).map((p) => p.checkStatus()),
    );

    return statuses;
  }

  /**
   * Get model instance from appropriate provider.
   */
  getModel(provider: ProviderType, modelId: string) {
    return this.getProvider(provider).getModel(modelId);
  }

  /**
   * Clear cached providers (useful for testing).
   */
  clearCache(): void {
    this.providers.clear();
  }

  /**
   * List all supported provider types.
   */
  getSupportedProviders(): ProviderType[] {
    return ["openai", "lmstudio", "anthropic", "google", "ollama"];
  }

  /**
   * Check if a provider type is implemented.
   */
  isImplemented(type: ProviderType): boolean {
    return type === "openai" || type === "lmstudio";
  }
}

/**
 * Singleton provider registry instance.
 */
export const ProviderRegistry = new ProviderRegistryImpl();
