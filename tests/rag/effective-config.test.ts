import { describe, it, expect } from "vitest";
import { computeEffectiveRagConfig } from "@/lib/rag/effective-config";
import type { ConversationRagOverrides, RAGMode } from "@/lib/types";

describe("computeEffectiveRagConfig", () => {
  it("defaults to heavy mode with no sources", () => {
    const result = computeEffectiveRagConfig({});
    expect(result.ragMode).toBe("heavy");
    expect(result.tagFilters).toBeUndefined();
  });

  it("applies mode precedence: request > conversation > character > default", () => {
    const character = { ragMode: "light" } as { ragMode: string };
    const conversation: ConversationRagOverrides = { mode: "ignore" };

    const fromRequest = computeEffectiveRagConfig({
      request: { ragMode: "light" as RAGMode },
      conversation,
      character,
    });
    expect(fromRequest.ragMode).toBe("light");

    const fromConversation = computeEffectiveRagConfig({
      request: { ragMode: null },
      conversation,
      character,
    });
    expect(fromConversation.ragMode).toBe("ignore");

    const fromCharacter = computeEffectiveRagConfig({
      request: { ragMode: undefined },
      conversation: {},
      character,
    });
    expect(fromCharacter.ragMode).toBe("light");

    const fromDefaults = computeEffectiveRagConfig({
      request: { ragMode: undefined },
      conversation: {},
      character: {},
    });
    expect(fromDefaults.ragMode).toBe("heavy");
  });

  it("ignores invalid ragMode values from any source", () => {
    const result = computeEffectiveRagConfig({
      request: { ragMode: "invalid" as unknown as RAGMode },
      conversation: { mode: "also-invalid" as unknown as RAGMode },
      character: { ragMode: "nope" },
    });

    expect(result.ragMode).toBe("heavy");
  });

  it("normalizes and applies tag filter precedence: request > conversation > global", () => {
    const global = { enabled: true, tagFilters: [" global-1 ", " "] };
    const conversation: ConversationRagOverrides = { tagFilters: [" conv-1", "conv-2 "] };

    const fromRequest = computeEffectiveRagConfig({
      request: { tagFilters: [" req-1 ", "", "req-2"] },
      conversation,
      global,
    });
    expect(fromRequest.tagFilters).toEqual(["req-1", "req-2"]);

    const fromConversation = computeEffectiveRagConfig({
      request: { tagFilters: [] },
      conversation,
      global,
    });
    expect(fromConversation.tagFilters).toEqual(["conv-1", "conv-2"]);

    const fromGlobal = computeEffectiveRagConfig({
      request: { tagFilters: null },
      conversation: { tagFilters: [] },
      global,
    });
    expect(fromGlobal.tagFilters).toEqual(["global-1"]);
  });

  it("returns undefined tagFilters if all sources are empty or missing", () => {
    const result = computeEffectiveRagConfig({
      request: { tagFilters: [] },
      conversation: { tagFilters: [] },
      global: { enabled: true, tagFilters: [] },
    });

    expect(result.tagFilters).toBeUndefined();
  });
});
