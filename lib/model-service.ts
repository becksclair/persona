import { z } from "zod";
import modelsConfig from "@/config/models.json";
import { ProviderRegistry, type ProviderStatus, type ProviderType } from "./providers";

// ─────────────────────────────────────────────────────────────
// Schema Definitions
// ─────────────────────────────────────────────────────────────

export const ModelProviderSchema = z.enum(["openai", "lmstudio", "anthropic", "google"]);
export type ModelProvider = z.infer<typeof ModelProviderSchema>;

export const SpeedTierSchema = z.enum(["very-fast", "fast", "medium", "slow"]);
export type SpeedTier = z.infer<typeof SpeedTierSchema>;

export const CostTierSchema = z.enum(["free", "low", "medium", "high", "very-high"]);
export type CostTier = z.infer<typeof CostTierSchema>;

export const ModelDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ModelProviderSchema,
  isLocal: z.boolean(),
  contextWindow: z.number().optional(),
  maxOutputTokens: z.number().optional(),
  speed: SpeedTierSchema.optional(),
  cost: CostTierSchema.optional(),
  description: z.string().optional(),
});
export type ModelDefinition = z.infer<typeof ModelDefinitionSchema>;

export const ModelProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  defaultModelId: z.string(),
  defaultTemperature: z.number().min(0).max(2).optional(),
});
export type ModelProfile = z.infer<typeof ModelProfileSchema>;

export const ModelsConfigSchema = z.object({
  version: z.string(),
  models: z.array(ModelDefinitionSchema),
  profiles: z.array(ModelProfileSchema).optional(),
  defaultModelId: z.string(),
  defaultTemperature: z.number().min(0).max(2).optional(),
});
export type ModelsConfig = z.infer<typeof ModelsConfigSchema>;

// ─────────────────────────────────────────────────────────────
// Model Availability Status
// ─────────────────────────────────────────────────────────────

export interface ModelAvailability {
  modelId: string;
  available: boolean;
  latencyMs?: number;
  error?: string;
}

// Re-export ProviderStatus from providers module
export type { ProviderStatus } from "./providers";

// ─────────────────────────────────────────────────────────────
// ModelService - Centralized model management
// ─────────────────────────────────────────────────────────────

class ModelServiceImpl {
  private config: ModelsConfig | null = null;

  // ─────────────────────────────────────────────────────────────
  // Configuration
  // ─────────────────────────────────────────────────────────────

  /**
   * Get the LM Studio base URL from environment
   */
  getLmStudioBaseUrl(): string {
    return process.env.LM_STUDIO_BASE_URL || "http://localhost:1234/v1";
  }

  /**
   * Load and validate models configuration
   */
  getConfig(): ModelsConfig {
    if (this.config) return this.config;

    const result = ModelsConfigSchema.safeParse(modelsConfig);
    if (!result.success) {
      console.error("[ModelService] Invalid config/models.json:", result.error.format());
      // Return minimal fallback
      this.config = {
        version: "1.0",
        models: [
          {
            id: "gpt-4.1-mini",
            name: "GPT-4.1 Mini",
            provider: "openai",
            isLocal: false,
          },
        ],
        defaultModelId: "gpt-4.1-mini",
        defaultTemperature: 0.7,
      };
      return this.config;
    }

    this.config = result.data;
    return this.config;
  }

  // ─────────────────────────────────────────────────────────────
  // Model Accessors
  // ─────────────────────────────────────────────────────────────

  /**
   * Get all available models
   */
  getAvailableModels(): ModelDefinition[] {
    return this.getConfig().models;
  }

  /**
   * Get model by ID
   */
  getModelById(id: string): ModelDefinition | undefined {
    return this.getConfig().models.find((m) => m.id === id);
  }

  /**
   * Get all model profiles
   */
  getModelProfiles(): ModelProfile[] {
    return this.getConfig().profiles ?? [];
  }

  /**
   * Get profile by ID
   */
  getProfileById(id: string): ModelProfile | undefined {
    return this.getConfig().profiles?.find((p) => p.id === id);
  }

  /**
   * Get the default model ID from config
   */
  getDefaultModelId(): string {
    return this.getConfig().defaultModelId;
  }

  /**
   * Get the default temperature from config
   */
  getDefaultTemperature(): number {
    return this.getConfig().defaultTemperature ?? 0.7;
  }

  // ─────────────────────────────────────────────────────────────
  // Model Resolution
  // ─────────────────────────────────────────────────────────────

  /**
   * Resolve effective model settings for a chat turn.
   *
   * Priority (highest to lowest):
   * 1. Per-chat overrides
   * 2. Per-character defaults
   * 3. Global config defaults
   */
  resolveModelSettings(options: {
    chatModelId?: string | null;
    chatTemperature?: number | null;
    characterModelId?: string | null;
    characterTemperature?: number | null;
  }): { modelId: string; temperature: number; model: ModelDefinition } {
    const { chatModelId, chatTemperature, characterModelId, characterTemperature } = options;

    // Resolve model ID: chat override → character default → global default
    const modelId = chatModelId ?? characterModelId ?? this.getDefaultModelId();

    // Resolve temperature: chat override → character default → global default
    const temperature = chatTemperature ?? characterTemperature ?? this.getDefaultTemperature();

    // Get model definition (fallback to first model if not found)
    const model = this.getModelById(modelId) ?? this.getConfig().models[0];

    return { modelId: model.id, temperature, model };
  }

  // ─────────────────────────────────────────────────────────────
  // Provider Management (delegated to ProviderRegistry)
  // ─────────────────────────────────────────────────────────────

  /**
   * Get AI SDK provider instance for a model
   */
  getProviderForModel(modelId: string) {
    const model = this.getModelById(modelId);
    if (!model) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    return this.getProviderInstance(model.provider, modelId);
  }

  /**
   * Get AI SDK provider instance via the provider registry.
   */
  getProviderInstance(provider: ModelProvider, modelId: string) {
    return ProviderRegistry.getModel(provider as ProviderType, modelId);
  }

  // ─────────────────────────────────────────────────────────────
  // Availability Checks (delegated to ProviderRegistry)
  // ─────────────────────────────────────────────────────────────

  /**
   * Check availability of all providers
   */
  async checkAllProviders(): Promise<ProviderStatus[]> {
    return ProviderRegistry.checkAllProviders();
  }

  /**
   * Check which models are actually available to use
   */
  async getAvailableModelsWithStatus(): Promise<(ModelDefinition & { available: boolean })[]> {
    const providers = await this.checkAllProviders();
    const providerMap = new Map(providers.map((p) => [p.provider, p]));

    return this.getAvailableModels().map((model) => {
      const providerStatus = providerMap.get(model.provider);
      let available = providerStatus?.available ?? false;

      // For LM Studio, also check if the specific model is loaded
      if (model.provider === "lmstudio" && providerStatus?.available && providerStatus.models) {
        available = providerStatus.models.some(
          (m) => m === model.id || m.includes(model.id.split("/").pop() ?? ""),
        );
      }

      return { ...model, available };
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Display Helpers
  // ─────────────────────────────────────────────────────────────

  /**
   * Format context window for display (e.g., "128K")
   */
  formatContextWindow(tokens?: number): string {
    if (!tokens) return "—";
    if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
    return `${tokens}`;
  }

  /**
   * Get speed indicator emoji/text
   */
  getSpeedIndicator(speed?: SpeedTier): string {
    switch (speed) {
      case "very-fast":
        return "⚡⚡";
      case "fast":
        return "⚡";
      case "medium":
        return "●";
      case "slow":
        return "🐢";
      default:
        return "—";
    }
  }

  /**
   * Get cost indicator text
   */
  getCostIndicator(cost?: CostTier): string {
    switch (cost) {
      case "free":
        return "Free";
      case "low":
        return "$";
      case "medium":
        return "$$";
      case "high":
        return "$$$";
      case "very-high":
        return "$$$$";
      default:
        return "—";
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────

export const ModelService = new ModelServiceImpl();

// Convenience re-exports for common operations
export const getAvailableModels = () => ModelService.getAvailableModels();
export const getModelById = (id: string) => ModelService.getModelById(id);
export const getModelProfiles = () => ModelService.getModelProfiles();
export const getProfileById = (id: string) => ModelService.getProfileById(id);
export const getDefaultModelId = () => ModelService.getDefaultModelId();
export const getDefaultTemperature = () => ModelService.getDefaultTemperature();
export const resolveModelSettings = ModelService.resolveModelSettings.bind(ModelService);
export const formatContextWindow = ModelService.formatContextWindow.bind(ModelService);
export const getSpeedIndicator = ModelService.getSpeedIndicator.bind(ModelService);
export const getCostIndicator = ModelService.getCostIndicator.bind(ModelService);
