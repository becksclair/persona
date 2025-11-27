import { openai, createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildSystemPrompt, FALLBACK_PROMPTS } from "@/lib/prompts";
import type { ModelSettings } from "@/lib/types";

/**
 * Chat API Route - Handles both OpenAI and LM Studio providers
 *
 * System prompts are now built server-side from Character entities in the database.
 * This ensures consistency across clients and prevents prompt manipulation.
 *
 * Smoke test (LM Studio):
 * ```
 * curl -X POST http://localhost:3000/api/chat \
 *   -H "Content-Type: application/json" \
 *   -d '{"messages":[{"role":"user","parts":[{"type":"text","text":"hi"}]}],"characterId":"sam","modelSettings":{"model":"qwen/qwen3-8b","provider":"lmstudio"}}'
 * ```
 */

// Allow streaming responses up to 60 seconds for local models
export const maxDuration = 60;

// Create LM Studio provider (OpenAI-compatible API)
function createLmStudioProvider(baseUrl: string) {
  return createOpenAI({
    baseURL: baseUrl,
    apiKey: "lm-studio", // LM Studio doesn't require a real API key
  });
}

// Get the appropriate model provider based on settings
function getModelProvider(modelSettings: ModelSettings) {
  const provider = modelSettings?.provider || "openai";
  const modelId = modelSettings?.model || "gpt-4.1-mini";

  if (provider === "lmstudio") {
    const lmStudio = createLmStudioProvider(
      modelSettings?.lmStudioBaseUrl || "http://localhost:1234/v1"
    );
    return lmStudio(modelId);
  }

  // Default to OpenAI
  return openai(modelId);
}

export async function POST(req: Request) {
  let body: {
    messages?: unknown;
    characterId?: string;
    personalityId?: string; // Legacy support
    modelSettings?: ModelSettings;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json(
      { code: "INVALID_JSON", message: "Invalid JSON body", retryable: false },
      { status: 400 }
    );
  }

  const { messages, modelSettings } = body;
  // Support both characterId and legacy personalityId
  const characterId = body.characterId ?? body.personalityId;

  if (!messages || !Array.isArray(messages)) {
    return Response.json(
      { code: "MISSING_MESSAGES", message: "messages array required", retryable: false },
      { status: 400 }
    );
  }

  // Build system prompt from character (server-side)
  let systemPrompt: string;
  try {
    if (characterId) {
      const character = await db.query.characters.findFirst({
        where: eq(characters.id, characterId),
      });

      if (character) {
        systemPrompt = buildSystemPrompt(character);
      } else {
        // Fallback to legacy prompts for backward compatibility
        systemPrompt = FALLBACK_PROMPTS[characterId] ?? FALLBACK_PROMPTS.sam;
      }
    } else {
      systemPrompt = FALLBACK_PROMPTS.sam;
    }
  } catch (dbError) {
    console.warn("[chat] Failed to fetch character, using fallback:", dbError);
    systemPrompt = FALLBACK_PROMPTS[characterId ?? "sam"] ?? FALLBACK_PROMPTS.sam;
  }

  const provider = modelSettings?.provider || "openai";
  const modelId = modelSettings?.model || "gpt-4.1-mini";

  try {
    const model = getModelProvider(
      modelSettings ?? {
        model: modelId,
        provider,
        temperature: 0.7,
        maxOutputTokens: 4096,
        streamResponse: true,
        lmStudioBaseUrl: "http://localhost:1234/v1",
      }
    );

    // AI SDK v5: Convert UIMessage[] to ModelMessage[] for streamText
    const modelMessages = convertToModelMessages(messages);

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      temperature: modelSettings?.temperature || 0.7,
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
