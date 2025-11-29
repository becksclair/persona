import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/lib/store";

describe("AppStore", () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState({
      activePersonalityId: "sam",
      modelSettings: {
        model: "qwen/qwen3-8b",
        provider: "lmstudio",
        temperature: 0.7,
        maxOutputTokens: 4096,
        streamResponse: true,
        lmStudioBaseUrl: "http://localhost:1234/v1",
      },
      ragSettings: {
        enabled: false,
        contextRecall: 0.5,
        knowledgeBase: [],
        tagFilters: [],
      },
    });
  });

  describe("Model Settings", () => {
    it("has correct default model settings", () => {
      const state = useAppStore.getState();
      expect(state.modelSettings.model).toBe("qwen/qwen3-8b");
      expect(state.modelSettings.provider).toBe("lmstudio");
    });

    it("updates model and auto-sets provider for OpenAI", () => {
      const { updateModelSettings } = useAppStore.getState();

      updateModelSettings({ model: "gpt-4.1" });

      const state = useAppStore.getState();
      expect(state.modelSettings.model).toBe("gpt-4.1");
      expect(state.modelSettings.provider).toBe("openai");
    });

    it("updates model and auto-sets provider for LM Studio", () => {
      const { updateModelSettings } = useAppStore.getState();

      // First switch to OpenAI
      updateModelSettings({ model: "gpt-4.1" });
      expect(useAppStore.getState().modelSettings.provider).toBe("openai");

      // Then switch back to LM Studio
      updateModelSettings({ model: "qwen/qwen3-8b" });

      const state = useAppStore.getState();
      expect(state.modelSettings.model).toBe("qwen/qwen3-8b");
      expect(state.modelSettings.provider).toBe("lmstudio");
    });

    it("updates temperature", () => {
      const { updateModelSettings } = useAppStore.getState();

      updateModelSettings({ temperature: 0.9 });

      expect(useAppStore.getState().modelSettings.temperature).toBe(0.9);
    });

    it("updates lmStudioBaseUrl", () => {
      const { updateModelSettings } = useAppStore.getState();

      updateModelSettings({ lmStudioBaseUrl: "http://192.168.1.100:1234/v1" });

      expect(useAppStore.getState().modelSettings.lmStudioBaseUrl).toBe(
        "http://192.168.1.100:1234/v1",
      );
    });

    it("rejects invalid temperature (out of range)", () => {
      const { updateModelSettings } = useAppStore.getState();
      const originalTemp = useAppStore.getState().modelSettings.temperature;

      updateModelSettings({ temperature: 3 }); // Invalid: max is 2

      // Should remain unchanged
      expect(useAppStore.getState().modelSettings.temperature).toBe(originalTemp);
    });

    it("preserves other settings when updating one field", () => {
      const { updateModelSettings } = useAppStore.getState();

      updateModelSettings({ temperature: 0.5 });

      const state = useAppStore.getState();
      expect(state.modelSettings.model).toBe("qwen/qwen3-8b");
      expect(state.modelSettings.streamResponse).toBe(true);
      expect(state.modelSettings.maxOutputTokens).toBe(4096);
    });
  });

  describe("Personality Selection", () => {
    it("has default personality set to sam", () => {
      expect(useAppStore.getState().activePersonalityId).toBe("sam");
    });

    it("changes active personality", () => {
      const { setActivePersonality } = useAppStore.getState();

      setActivePersonality("coding-guru");

      expect(useAppStore.getState().activePersonalityId).toBe("coding-guru");
    });

    it("has all default personalities", () => {
      const personalities = useAppStore.getState().personalities;
      const ids = personalities.map((p) => p.id);

      expect(ids).toContain("sam");
      expect(ids).toContain("therapist");
      expect(ids).toContain("coding-guru");
      expect(ids).toContain("creative-writer");
      expect(ids).toContain("data-analyst");
      expect(ids).toContain("custom");
    });
  });

  describe("RAG Settings", () => {
    it("has RAG disabled by default", () => {
      expect(useAppStore.getState().ragSettings.enabled).toBe(false);
    });

    it("updates RAG enabled state", () => {
      const { updateRAGSettings } = useAppStore.getState();

      updateRAGSettings({ enabled: true });

      expect(useAppStore.getState().ragSettings.enabled).toBe(true);
    });

    it("updates context recall", () => {
      const { updateRAGSettings } = useAppStore.getState();

      updateRAGSettings({ contextRecall: 0.8 });

      expect(useAppStore.getState().ragSettings.contextRecall).toBe(0.8);
    });
  });
});
