import { describe, it, expect } from "vitest";
import {
  ModelService,
  getAvailableModels,
  getModelById,
  getModelProfiles,
  getProfileById,
  getDefaultModelId,
  getDefaultTemperature,
  resolveModelSettings,
  formatContextWindow,
  getSpeedIndicator,
  getCostIndicator,
  ModelDefinitionSchema,
  ModelProviderSchema,
} from "@/lib/model-service";

// Alias for backward compat with tests
const getModelsConfig = () => ModelService.getConfig();

describe("Models Configuration", () => {
  describe("getModelsConfig", () => {
    it("loads valid configuration", () => {
      const config = getModelsConfig();
      expect(config.version).toBeDefined();
      expect(config.models).toBeInstanceOf(Array);
      expect(config.models.length).toBeGreaterThan(0);
      expect(config.defaultModelId).toBeDefined();
    });

    it("caches configuration", () => {
      const config1 = getModelsConfig();
      const config2 = getModelsConfig();
      expect(config1).toBe(config2); // Same reference
    });
  });

  describe("getAvailableModels", () => {
    it("contains OpenAI cloud models", () => {
      const models = getAvailableModels();
      const cloudModels = models.filter((m) => !m.isLocal);
      expect(cloudModels.length).toBeGreaterThan(0);
      expect(cloudModels.some((m) => m.provider === "openai")).toBe(true);
    });

    it("contains local LM Studio models", () => {
      const models = getAvailableModels();
      const localModels = models.filter((m) => m.isLocal);
      expect(localModels.length).toBeGreaterThan(0);
      expect(localModels.some((m) => m.provider === "lmstudio")).toBe(true);
    });

    it("all models have valid schema", () => {
      getAvailableModels().forEach((model) => {
        const result = ModelDefinitionSchema.safeParse(model);
        expect(result.success, `Invalid model: ${model.id}`).toBe(true);
      });
    });

    it("all models have context window defined", () => {
      getAvailableModels().forEach((model) => {
        expect(model.contextWindow, `Missing contextWindow: ${model.id}`).toBeDefined();
        expect(model.contextWindow).toBeGreaterThan(0);
      });
    });
  });

  describe("getModelById", () => {
    it("returns correct model for valid id", () => {
      const model = getModelById("gpt-4.1");
      expect(model).toBeDefined();
      expect(model?.name).toBe("GPT-4.1");
      expect(model?.provider).toBe("openai");
      expect(model?.isLocal).toBe(false);
    });

    it("returns local model for qwen/qwen3-8b", () => {
      const model = getModelById("qwen/qwen3-8b");
      expect(model).toBeDefined();
      expect(model?.provider).toBe("lmstudio");
      expect(model?.isLocal).toBe(true);
    });

    it("returns undefined for unknown model", () => {
      const model = getModelById("unknown-model");
      expect(model).toBeUndefined();
    });
  });

  describe("getModelProfiles", () => {
    it("returns profiles array", () => {
      const profiles = getModelProfiles();
      expect(profiles).toBeInstanceOf(Array);
    });

    it("profiles have valid model references", () => {
      const profiles = getModelProfiles();
      profiles.forEach((profile) => {
        const model = getModelById(profile.defaultModelId);
        expect(model, `Profile ${profile.id} references missing model ${profile.defaultModelId}`).toBeDefined();
      });
    });
  });

  describe("getProfileById", () => {
    it("returns profile for valid id", () => {
      const profiles = getModelProfiles();
      if (profiles.length > 0) {
        const profile = getProfileById(profiles[0].id);
        expect(profile).toBeDefined();
        expect(profile?.id).toBe(profiles[0].id);
      }
    });

    it("returns undefined for unknown profile", () => {
      const profile = getProfileById("unknown-profile");
      expect(profile).toBeUndefined();
    });
  });

  describe("getDefaultModelId / getDefaultTemperature", () => {
    it("returns valid default model id", () => {
      const defaultId = getDefaultModelId();
      expect(defaultId).toBeDefined();
      const model = getModelById(defaultId);
      expect(model, `Default model ${defaultId} not found`).toBeDefined();
    });

    it("returns valid default temperature", () => {
      const temp = getDefaultTemperature();
      expect(temp).toBeGreaterThanOrEqual(0);
      expect(temp).toBeLessThanOrEqual(2);
    });
  });
});

describe("Model Resolution", () => {
  describe("resolveModelSettings", () => {
    it("uses chat override when provided", () => {
      const result = resolveModelSettings({
        chatModelId: "gpt-4.1",
        chatTemperature: 0.5,
        characterModelId: "gpt-4.1-mini",
        characterTemperature: 0.7,
      });

      expect(result.modelId).toBe("gpt-4.1");
      expect(result.temperature).toBe(0.5);
    });

    it("falls back to character defaults when no chat override", () => {
      const result = resolveModelSettings({
        chatModelId: null,
        chatTemperature: null,
        characterModelId: "gpt-4.1-mini",
        characterTemperature: 0.8,
      });

      expect(result.modelId).toBe("gpt-4.1-mini");
      expect(result.temperature).toBe(0.8);
    });

    it("falls back to global defaults when no overrides", () => {
      const result = resolveModelSettings({
        chatModelId: null,
        chatTemperature: null,
        characterModelId: null,
        characterTemperature: null,
      });

      expect(result.modelId).toBe(getDefaultModelId());
      expect(result.temperature).toBe(getDefaultTemperature());
    });

    it("returns model definition with resolved settings", () => {
      const result = resolveModelSettings({
        chatModelId: "qwen/qwen3-8b",
        chatTemperature: 0.9,
        characterModelId: null,
        characterTemperature: null,
      });

      expect(result.model).toBeDefined();
      expect(result.model.id).toBe("qwen/qwen3-8b");
      expect(result.model.isLocal).toBe(true);
      expect(result.model.provider).toBe("lmstudio");
    });

    it("handles partial overrides", () => {
      // Chat has model but not temperature
      const result = resolveModelSettings({
        chatModelId: "gpt-4.1",
        chatTemperature: null,
        characterModelId: "gpt-4.1-mini",
        characterTemperature: 0.6,
      });

      expect(result.modelId).toBe("gpt-4.1");
      expect(result.temperature).toBe(0.6); // Falls back to character temp
    });
  });
});

describe("Display Helpers", () => {
  describe("formatContextWindow", () => {
    it("formats large numbers as K", () => {
      expect(formatContextWindow(128000)).toBe("128K");
      expect(formatContextWindow(32000)).toBe("32K");
      expect(formatContextWindow(8000)).toBe("8K");
    });

    it("handles undefined", () => {
      expect(formatContextWindow(undefined)).toBe("—");
    });

    it("handles small numbers", () => {
      expect(formatContextWindow(500)).toBe("500");
    });
  });

  describe("getSpeedIndicator", () => {
    it("returns correct indicators", () => {
      expect(getSpeedIndicator("very-fast")).toBe("⚡⚡");
      expect(getSpeedIndicator("fast")).toBe("⚡");
      expect(getSpeedIndicator("medium")).toBe("●");
      expect(getSpeedIndicator("slow")).toBe("🐢");
    });

    it("handles undefined", () => {
      expect(getSpeedIndicator(undefined)).toBe("—");
    });
  });

  describe("getCostIndicator", () => {
    it("returns correct indicators", () => {
      expect(getCostIndicator("free")).toBe("Free");
      expect(getCostIndicator("low")).toBe("$");
      expect(getCostIndicator("medium")).toBe("$$");
      expect(getCostIndicator("high")).toBe("$$$");
      expect(getCostIndicator("very-high")).toBe("$$$$");
    });

    it("handles undefined", () => {
      expect(getCostIndicator(undefined)).toBe("—");
    });
  });
});

describe("ModelProviderSchema", () => {
  it("accepts valid providers", () => {
    expect(ModelProviderSchema.safeParse("openai").success).toBe(true);
    expect(ModelProviderSchema.safeParse("lmstudio").success).toBe(true);
    expect(ModelProviderSchema.safeParse("anthropic").success).toBe(true);
    expect(ModelProviderSchema.safeParse("google").success).toBe(true);
  });

  it("rejects invalid providers", () => {
    expect(ModelProviderSchema.safeParse("invalid").success).toBe(false);
    expect(ModelProviderSchema.safeParse("").success).toBe(false);
  });
});
