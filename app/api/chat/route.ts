import { streamText, convertToModelMessages } from "ai";
import { db } from "@/lib/db";
import { characters, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildSystemPrompt, FALLBACK_PROMPTS } from "@/lib/prompts";
import { ModelService } from "@/lib/model-service";
import type { ModelSettings } from "@/lib/types";

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
  let body: {
    messages?: unknown;
    conversationId?: string;
    characterId?: string;
    personalityId?: string; // Legacy support
    modelSettings?: ModelSettings; // Client-side override (legacy, lowest priority)
  };

  try {
    body = await req.json();
  } catch {
    return Response.json(
      { code: "INVALID_JSON", message: "Invalid JSON body", retryable: false },
      { status: 400 }
    );
  }

  const { messages, conversationId, modelSettings } = body;
  // Support both characterId and legacy personalityId
  const characterId = body.characterId ?? body.personalityId;

  if (!messages || !Array.isArray(messages)) {
    return Response.json(
      { code: "MISSING_MESSAGES", message: "messages array required", retryable: false },
      { status: 400 }
    );
  }

  // Fetch conversation and character data for model resolution
  let conversation: { modelIdOverride: string | null; temperatureOverride: number | null } | null = null;
  let character: {
    id: string;
    name: string;
    defaultModelId: string | null;
    defaultTemperature: number | null;
    [key: string]: unknown;
  } | null = null;

  try {
    // Fetch conversation if ID provided (for per-chat overrides)
    if (conversationId) {
      conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        columns: { modelIdOverride: true, temperatureOverride: true },
      }) ?? null;
    }

    // Fetch character for defaults and system prompt
    if (characterId) {
      character = await db.query.characters.findFirst({
        where: eq(characters.id, characterId),
      }) ?? null;
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
      { status: 500 }
    );
  }
}
