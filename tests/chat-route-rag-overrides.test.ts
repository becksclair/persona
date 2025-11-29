// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      conversations: {
        findFirst: vi.fn(),
      },
      characters: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock("@/lib/rag", () => {
  const isValidRagMode = (mode: unknown): mode is "heavy" | "light" | "ignore" =>
    typeof mode === "string" && ["heavy", "light", "ignore"].includes(mode);

  const normalizeTags = (source: unknown): string[] | undefined => {
    if (!Array.isArray(source)) return undefined;
    const cleaned = source.map((t) => String(t).trim()).filter((t) => t.length > 0);
    return cleaned.length > 0 ? cleaned : undefined;
  };

  const computeEffectiveRagConfig = (
    sources:
      | {
          request?: { ragMode?: unknown; tagFilters?: unknown } | null;
          conversation?: { mode?: unknown; tagFilters?: unknown } | null;
          character?: { ragMode?: unknown } | null;
          global?: { tagFilters?: unknown } | null;
        }
      | null
      | undefined,
  ) => {
    const { request, conversation, character, global } = sources ?? {};

    const requestMode = request?.ragMode;
    const convMode = conversation?.mode;
    const charMode = character?.ragMode;

    let ragMode: "heavy" | "light" | "ignore" = "heavy";
    if (isValidRagMode(requestMode)) {
      ragMode = requestMode;
    } else if (isValidRagMode(convMode)) {
      ragMode = convMode;
    } else if (isValidRagMode(charMode)) {
      ragMode = charMode as "heavy" | "light" | "ignore";
    }

    const requestTags = normalizeTags(request?.tagFilters);
    const convTags = normalizeTags(conversation?.tagFilters);
    const globalTags = normalizeTags(global?.tagFilters);

    const tagFilters = (requestTags ?? convTags ?? globalTags) as string[] | undefined;

    return { ragMode, tagFilters };
  };

  return {
    computeEffectiveRagConfig,
    retrieveRelevantMemories: vi.fn(),
    formatMemoriesForPrompt: vi.fn(() => ""),
    getMemoryItemIds: vi.fn(() => []),
  };
});

vi.mock("@/lib/model-service", () => ({
  ModelService: {
    resolveModelSettings: vi.fn(() => ({
      modelId: "test-model",
      temperature: 0.1,
      model: { provider: "test-provider" },
    })),
    getProviderInstance: vi.fn(() => ({})),
  },
}));

vi.mock("@/lib/prompts", () => ({
  buildSystemPrompt: vi.fn(() => "You are a test assistant."),
}));

vi.mock("@/lib/api-errors", () => ({
  Errors: {
    unauthorized: vi.fn(
      () => new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
    ),
    invalidJson: vi.fn(
      () => new Response(JSON.stringify({ error: "invalid json" }), { status: 400 }),
    ),
    invalidRequest: vi.fn(
      (msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 }),
    ),
    internal: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
  },
}));

vi.mock("@/lib/validations", () => ({
  validateRequest: vi.fn((schema: unknown, data: unknown) => ({ success: true, data })),
  chatRequestSchema: {},
}));

vi.mock("@/lib/constants", () => ({
  DEFAULT_SYSTEM_PROMPT: "You are a helpful AI assistant.",
}));

vi.mock("ai", () => ({
  streamText: vi.fn(() => ({
    toUIMessageStreamResponse: () => new Response("ok"),
  })),
  convertToModelMessages: vi.fn(() => []),
}));

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as ChatRoute from "@/app/api/chat/route";
import * as Rag from "@/lib/rag";

type MockFn = ReturnType<typeof vi.fn>;

const mockGetCurrentUser = getCurrentUser as unknown as MockFn;

const mockDb = db as unknown as {
  query: {
    conversations: { findFirst: MockFn };
    characters: { findFirst: MockFn };
  };
};

const mockRetrieveRelevantMemories = Rag.retrieveRelevantMemories as unknown as MockFn;

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/chat RAG overrides", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetCurrentUser.mockResolvedValue({ userId: "user-123" });
  });

  it("uses conversation ragOverrides.mode and tagFilters when enabled", async () => {
    mockDb.query.conversations.findFirst.mockResolvedValue({
      modelIdOverride: null,
      temperatureOverride: null,
      ragOverrides: {
        enabled: true,
        mode: "ignore",
        tagFilters: ["project-x"],
      },
    });

    mockDb.query.characters.findFirst.mockResolvedValue({
      id: "char-1",
      name: "Sam",
      defaultModelId: null,
      defaultTemperature: 0.7,
      ragMode: "heavy",
    });

    mockRetrieveRelevantMemories.mockResolvedValue({
      memories: [],
      query: "hi",
      topK: 0,
    });

    const req = buildRequest({
      messages: [
        {
          role: "user",
          parts: [{ type: "text", text: "hi" }],
        },
      ],
      conversationId: "conv-1",
      characterId: "char-1",
      enableRAG: true,
    });

    await ChatRoute.POST(req);

    expect(mockRetrieveRelevantMemories).toHaveBeenCalledTimes(1);
    const arg = mockRetrieveRelevantMemories.mock.calls[0][0];
    expect(arg.ragMode).toBe("ignore");
    expect(arg.tagFilters).toEqual(["project-x"]);
  });

  it("disables RAG when conversation overrides enabled=false even if enableRAG is true", async () => {
    mockDb.query.conversations.findFirst.mockResolvedValue({
      modelIdOverride: null,
      temperatureOverride: null,
      ragOverrides: {
        enabled: false,
        mode: "heavy",
        tagFilters: ["global"],
      },
    });

    mockDb.query.characters.findFirst.mockResolvedValue({
      id: "char-1",
      name: "Sam",
      defaultModelId: null,
      defaultTemperature: 0.7,
      ragMode: "heavy",
    });

    const req = buildRequest({
      messages: [
        {
          role: "user",
          parts: [{ type: "text", text: "hi" }],
        },
      ],
      conversationId: "conv-1",
      characterId: "char-1",
      enableRAG: true,
    });

    await ChatRoute.POST(req);

    expect(mockRetrieveRelevantMemories).not.toHaveBeenCalled();
  });
});
