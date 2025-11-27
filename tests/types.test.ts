import { describe, it, expect } from "vitest";
import {
  AVAILABLE_MODELS,
  getModelById,
  ModelSettingsSchema,
  ModelDefinitionSchema,
  ModelProviderSchema,
} from "@/lib/types";

describe("Model Types (Legacy Compatibility)", () => {
  describe("AVAILABLE_MODELS", () => {
    it("contains OpenAI cloud models", () => {
      const openAiModels = AVAILABLE_MODELS.filter((m) => m.provider === "openai");
      const modelIds = openAiModels.map((m) => m.id);

      expect(modelIds).toContain("gpt-4.1");
      expect(modelIds).toContain("gpt-4.1-mini");
    });

    it("contains LM Studio local model", () => {
      const lmStudioModels = AVAILABLE_MODELS.filter((m) => m.provider === "lmstudio");
      const modelIds = lmStudioModels.map((m) => m.id);

      expect(modelIds).toContain("qwen/qwen3-8b");
    });

    it("has valid model definitions", () => {
      AVAILABLE_MODELS.forEach((model) => {
        const result = ModelDefinitionSchema.safeParse(model);
        expect(result.success).toBe(true);
      });
    });

    it("all models have context window defined", () => {
      AVAILABLE_MODELS.forEach((model) => {
        expect(model.contextWindow).toBeDefined();
        expect(model.contextWindow).toBeGreaterThan(0);
      });
    });

    it("all models have isLocal flag", () => {
      AVAILABLE_MODELS.forEach((model) => {
        expect(typeof model.isLocal).toBe("boolean");
      });
    });
  });

  describe("getModelById", () => {
    it("returns correct model for valid id", () => {
      const model = getModelById("gpt-4.1");
      expect(model).toBeDefined();
      expect(model?.name).toBe("GPT-4.1");
      expect(model?.provider).toBe("openai");
    });

    it("returns local model for qwen/qwen3-8b", () => {
      const model = getModelById("qwen/qwen3-8b");
      expect(model).toBeDefined();
      expect(model?.provider).toBe("lmstudio");
    });

    it("returns undefined for unknown model", () => {
      const model = getModelById("unknown-model");
      expect(model).toBeUndefined();
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
    });
  });

  describe("ModelSettingsSchema", () => {
    it("validates complete settings", () => {
      const settings = {
        model: "gpt-5-pro",
        provider: "openai",
        temperature: 0.7,
        maxOutputTokens: 4096,
        streamResponse: true,
        lmStudioBaseUrl: "http://localhost:1234/v1",
      };

      const result = ModelSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    });

    it("applies defaults for optional fields", () => {
      const settings = {
        model: "gpt-5-pro",
        temperature: 0.7,
        maxOutputTokens: 4096,
        streamResponse: true,
      };

      const result = ModelSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe("openai");
        expect(result.data.lmStudioBaseUrl).toBe("http://localhost:1234/v1");
      }
    });

    it("validates LM Studio settings", () => {
      const settings = {
        model: "qwen3-8b",
        provider: "lmstudio",
        temperature: 0.7,
        maxOutputTokens: 4096,
        streamResponse: true,
        lmStudioBaseUrl: "http://localhost:1234/v1",
      };

      const result = ModelSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    });

    it("rejects invalid temperature", () => {
      const settings = {
        model: "gpt-5-pro",
        provider: "openai",
        temperature: 3, // Invalid: max is 2
        maxOutputTokens: 4096,
        streamResponse: true,
      };

      const result = ModelSettingsSchema.safeParse(settings);
      expect(result.success).toBe(false);
    });
  });
});
