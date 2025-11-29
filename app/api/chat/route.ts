import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { db } from "@/lib/db";
import { characters, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildSystemPrompt } from "@/lib/prompts";
import { ModelService } from "@/lib/model-service";
import { getCurrentUser } from "@/lib/auth";
import { Errors } from "@/lib/api-errors";
import { validateRequest, chatRequestSchema } from "@/lib/validations";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";
import {
  retrieveRelevantMemories,
  formatMemoriesForPrompt,
  getMemoryItemIds,
  computeEffectiveRagConfig,
} from "@/lib/rag";
import type {
  ConversationForChat,
  CharacterForChat,
  ConversationRagOverrides,
} from "@/lib/api-types";

/**
 * Chat API Route - Handles both OpenAI and LM Studio providers
 *
 * Model selection priority (highest to lowest):
 * 1. Per-chat overrides (conversationId → conversations.modelIdOverride)
 * 2. Per-character defaults (character.defaultModelId)
 * 3. Global config defaults (config/models.json → defaultModelId)
 *
 * System prompts are built server-side from Character entities in the database.
 */

// Allow streaming responses up to 60 seconds for local models
export const maxDuration = 60;

export async function POST(req: Request) {
  // Get current user for RAG scoping (optional - RAG works without auth for dev)
  const user = await getCurrentUser();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Errors.invalidJson();
  }

  const validation = validateRequest(chatRequestSchema, body);
  if (!validation.success) {
    return Errors.invalidRequest(validation.error);
  }

  const {
    messages,
    conversationId,
    characterId,
    modelSettings,
    enableRAG = true,
    ragMode,
    tagFilters,
  } = validation.data;

  // Fetch conversation and character data for model + RAG resolution
  let conversation: ConversationForChat | null = null;
  let character: CharacterForChat | null = null;

  try {
    // Fetch conversation if ID provided (for per-chat overrides)
    if (conversationId) {
      const result = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        columns: { modelIdOverride: true, temperatureOverride: true, ragOverrides: true },
      });
      if (result) {
        conversation = {
          modelIdOverride: result.modelIdOverride,
          temperatureOverride: result.temperatureOverride,
          ragOverrides: result.ragOverrides as ConversationRagOverrides | null,
        };
      }
    }

    // Fetch character for defaults and system prompt
    if (characterId) {
      character = (await db.query.characters.findFirst({
        where: eq(characters.id, characterId),
      })) as CharacterForChat | null;
    }
  } catch (dbError) {
    console.warn("[chat] DB fetch failed, using defaults:", dbError);
  }

  // Build system prompt from character (server-side)
  const systemPrompt = character ? buildSystemPrompt(character) : DEFAULT_SYSTEM_PROMPT;

  // RAG: Retrieve relevant memories and inject into prompt
  let _memoryItemsUsed: string[] = [];
  let finalSystemPrompt = systemPrompt;
  const convRag = conversation?.ragOverrides ?? null;
  const effectiveEnableRAG = enableRAG && convRag?.enabled !== false;

  if (effectiveEnableRAG && user) {
    try {
      // Extract the last user message as the query
      // Type assertion needed since Zod passthrough returns base type
      type MessageWithParts = { role: string; parts?: Array<{ type: string; text?: string }> };
      const lastUserMessage = ([...messages] as MessageWithParts[])
        .reverse()
        .find((m) => m.role === "user");
      const queryText =
        lastUserMessage?.parts
          ?.filter((p) => p.type === "text")
          ?.map((p) => p.text)
          ?.join(" ") ?? "";

      if (queryText) {
        const effectiveRagConfig = computeEffectiveRagConfig({
          request: { ragMode, tagFilters },
          conversation: convRag,
          character,
        });

        const ragResult = await retrieveRelevantMemories({
          userId: user.userId,
          characterId: character?.id ?? null,
          conversationId: conversationId ?? null,
          query: queryText,
          ragMode: effectiveRagConfig.ragMode,
          tagFilters: effectiveRagConfig.tagFilters,
        });

        if (ragResult.memories.length > 0) {
          const ragContext = formatMemoriesForPrompt(ragResult.memories);
          finalSystemPrompt = `${systemPrompt}\n\n${ragContext}`;
          _memoryItemsUsed = getMemoryItemIds(ragResult.memories);
          console.log(`[chat] RAG: Retrieved ${ragResult.memories.length} memories for query`);
        }
      }
    } catch (ragError) {
      console.warn("[chat] RAG retrieval failed, continuing without context:", ragError);
    }
  }

  // Resolve effective model settings using priority chain:
  // 1. Per-chat overrides (conversation.modelIdOverride)
  // 2. Per-character defaults (character.defaultModelId)
  // 3. Global config defaults (config/models.json)
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
    // Cast validated messages to UIMessage[] (passthrough schema preserves SDK fields)
    const modelMessages = convertToModelMessages(messages as unknown as UIMessage[]);

    const result = streamText({
      model,
      system: finalSystemPrompt,
      messages: modelMessages,
      temperature,
    });

    // Include memory item IDs in response header for Memory Inspector
    return result.toUIMessageStreamResponse({
      headers: {
        "X-Memory-Items-Used": JSON.stringify(_memoryItemsUsed),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[chat] ${provider}/${modelId} error:`, message);

    return Errors.internal(message);
  }
}
