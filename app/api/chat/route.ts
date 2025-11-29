import { streamText, convertToModelMessages } from "ai";
import { db } from "@/lib/db";
import { characters, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildSystemPrompt, FALLBACK_PROMPTS } from "@/lib/prompts";
import { ModelService } from "@/lib/model-service";
import { getCurrentUser } from "@/lib/auth";
import {
  retrieveRelevantMemories,
  formatMemoriesForPrompt,
  getMemoryItemIds,
  computeEffectiveRagConfig,
} from "@/lib/rag";
import type { ConversationRagOverrides, ModelSettings, RAGMode } from "@/lib/types";

/**
 * Chat API Route - Handles both OpenAI and LM Studio providers
 *
 * Model selection priority (highest to lowest):
 * 1. Per-chat overrides (conversationId → conversations.modelIdOverride)
 * 2. Per-character defaults (character.defaultModelId)
 * 3. Global config defaults (config/models.json → defaultModelId)
 *
 * System prompts are built server-side from Character entities in the database.
 *
 * Smoke test (LM Studio):
 * ```
 * curl -X POST http://localhost:3000/api/chat \
 *   -H "Content-Type: application/json" \
 *   -d '{"messages":[{"role":"user","parts":[{"type":"text","text":"hi"}]}],"characterId":"sam"}'
 * ```
 */

// Allow streaming responses up to 60 seconds for local models
export const maxDuration = 60;

export async function POST(req: Request) {
  // Get current user for RAG scoping (optional - RAG works without auth for dev)
  const user = await getCurrentUser();

  let body: {
    messages?: unknown;
    conversationId?: string;
    characterId?: string;
    personalityId?: string; // Legacy support
    modelSettings?: ModelSettings; // Client-side override (legacy, lowest priority)
    enableRAG?: boolean; // Explicitly enable/disable RAG for this request
    ragMode?: RAGMode; // Optional per-request override
    tagFilters?: string[]; // Optional KB tag filters for this chat turn
  };

  try {
    body = await req.json();
  } catch {
    return Response.json(
      { code: "INVALID_JSON", message: "Invalid JSON body", retryable: false },
      { status: 400 },
    );
  }

  const { messages, conversationId, modelSettings, enableRAG = true } = body;
  // Support both characterId and legacy personalityId
  const characterId = body.characterId ?? body.personalityId;

  if (!messages || !Array.isArray(messages)) {
    return Response.json(
      { code: "MISSING_MESSAGES", message: "messages array required", retryable: false },
      { status: 400 },
    );
  }

  // Fetch conversation and character data for model + RAG resolution
  let conversation: {
    modelIdOverride: string | null;
    temperatureOverride: number | null;
    ragOverrides?: {
      enabled?: boolean;
      mode?: RAGMode;
      tagFilters?: string[];
    } | null;
  } | null = null;

  let character: {
    id: string;
    name: string;
    defaultModelId: string | null;
    defaultTemperature: number | null;
    ragMode?: string | null;
    [key: string]: unknown;
  } | null = null;

  try {
    // Fetch conversation if ID provided (for per-chat overrides)
    if (conversationId) {
      conversation =
        (await db.query.conversations.findFirst({
          where: eq(conversations.id, conversationId),
          columns: { modelIdOverride: true, temperatureOverride: true, ragOverrides: true },
        })) ?? null;
    }

    // Fetch character for defaults and system prompt
    if (characterId) {
      character =
        (await db.query.characters.findFirst({
          where: eq(characters.id, characterId),
        })) ?? null;
    }
  } catch (dbError) {
    console.warn("[chat] DB fetch failed, using defaults:", dbError);
  }

  // Build system prompt from character (server-side)
  let systemPrompt: string;
  if (character) {
    systemPrompt = buildSystemPrompt(character);
  } else if (characterId) {
    // Fallback to legacy prompts for backward compatibility
    systemPrompt = FALLBACK_PROMPTS[characterId] ?? FALLBACK_PROMPTS.sam;
  } else {
    systemPrompt = FALLBACK_PROMPTS.sam;
  }

  // RAG: Retrieve relevant memories and inject into prompt
  // memoryItemsUsed captured for logging and future inspector tools (TODO: persist in message meta)
  let _memoryItemsUsed: string[] = [];
  const convRag = (conversation?.ragOverrides ?? null) as ConversationRagOverrides | null;
  const effectiveEnableRAG = enableRAG && convRag?.enabled !== false;

  if (effectiveEnableRAG && user) {
    try {
      // Extract the last user message as the query
      const lastUserMessage = [...messages]
        .reverse()
        .find(
          (m: { role: string; parts?: Array<{ type: string; text?: string }> }) =>
            m.role === "user",
        );
      const queryText =
        lastUserMessage?.parts
          ?.filter((p: { type: string }) => p.type === "text")
          ?.map((p: { text?: string }) => p.text)
          ?.join(" ") ?? "";

      if (queryText) {
        const { ragMode, tagFilters } = computeEffectiveRagConfig({
          request: { ragMode: body.ragMode, tagFilters: body.tagFilters },
          conversation: convRag,
          character,
        });

        const ragResult = await retrieveRelevantMemories({
          userId: user.userId,
          characterId: character?.id ?? null,
          conversationId: conversationId ?? null,
          query: queryText,
          ragMode,
          tagFilters,
        });

        if (ragResult.memories.length > 0) {
          const ragContext = formatMemoriesForPrompt(ragResult.memories);
          systemPrompt = `${systemPrompt}\n\n${ragContext}`;
          _memoryItemsUsed = getMemoryItemIds(ragResult.memories);
          console.log(`[chat] RAG: Retrieved ${ragResult.memories.length} memories for query`);
        }
      }
    } catch (ragError) {
      console.warn("[chat] RAG retrieval failed, continuing without context:", ragError);
    }
  }

  void _memoryItemsUsed;

  // Resolve effective model settings using priority chain:
  // 1. Per-chat overrides (conversation.modelIdOverride)
  // 2. Per-character defaults (character.defaultModelId)
  // 3. Client-side modelSettings (legacy, for backward compat)
  // 4. Global config defaults (config/models.json)
  const resolved = ModelService.resolveModelSettings({
    chatModelId: conversation?.modelIdOverride ?? modelSettings?.model,
    chatTemperature: conversation?.temperatureOverride ?? modelSettings?.temperature,
    characterModelId: character?.defaultModelId,
    characterTemperature: character?.defaultTemperature,
  });

  const { modelId, temperature, model: modelDef } = resolved;
  const provider = modelDef.provider;

  try {
    // Get provider instance from ModelService (uses env var for LM Studio URL)
    const model = ModelService.getProviderInstance(provider, modelId);

    // AI SDK v5: Convert UIMessage[] to ModelMessage[] for streamText
    const modelMessages = convertToModelMessages(messages);

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      temperature,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[chat] ${provider}/${modelId} error:`, message);

    // Return structured error for client-side handling
    return Response.json(
      {
        code: "CHAT_ERROR",
        message,
        provider,
        model: modelId,
        retryable: true,
      },
      { status: 500 },
    );
  }
}
