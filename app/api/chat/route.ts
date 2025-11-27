import { openai, createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";
import type { ModelSettings } from "@/lib/types";

/**
 * Chat API Route - Handles both OpenAI and LM Studio providers
 *
 * Smoke test (LM Studio):
 * ```
 * curl -X POST http://localhost:3000/api/chat \
 *   -H "Content-Type: application/json" \
 *   -d '{"messages":[{"role":"user","parts":[{"type":"text","text":"hi"}]}],"personalityId":"sam","modelSettings":{"model":"qwen/qwen3-8b","provider":"lmstudio"}}'
 * ```
 *
 * Note: AI SDK v5 sends UIMessage[] from useChat. Must convert to ModelMessage[] via convertToModelMessages().
 */

// Allow streaming responses up to 60 seconds for local models
export const maxDuration = 60;

// Personality system prompts
const PERSONALITY_PROMPTS: Record<string, string> = {
  sam: "You are Sam, a friendly and supportive AI companion. You're warm, encouraging, and great at brainstorming. Use casual language and occasional emojis.",
  therapist:
    "You are a compassionate therapist AI. Listen actively, ask thoughtful questions, and help users explore their feelings without judgment. Use techniques from CBT and mindfulness.",
  "coding-guru":
    "You are a senior software engineer with expertise across multiple languages and frameworks. Provide clear code examples, explain concepts thoroughly, and follow best practices.",
  "creative-writer":
    "You are a creative writer with a flair for storytelling. Help users craft compelling narratives, develop characters, and find their unique voice. Be imaginative and inspiring.",
  "data-analyst":
    "You are a data analyst expert. Help users understand data, create visualizations, and derive actionable insights. Be precise, methodical, and data-driven.",
  custom: "You are a helpful AI assistant. Respond thoughtfully and helpfully.",
};

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
    // For LM Studio, use a generic model identifier or the model name
    return lmStudio(modelId);
  }

  // Default to OpenAI
  return openai(modelId);
}

export async function POST(req: Request) {
  let body: { messages?: unknown; personalityId?: string; modelSettings?: ModelSettings };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, personalityId, modelSettings } = body;

  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: "messages array required" }, { status: 400 });
  }

  const systemPrompt = PERSONALITY_PROMPTS[personalityId ?? ""] || PERSONALITY_PROMPTS.sam;
  const provider = modelSettings?.provider || "openai";
  const modelId = modelSettings?.model || "gpt-4.1-mini";

  try {
    const model = getModelProvider(modelSettings ?? { model: modelId, provider, temperature: 0.7, maxOutputTokens: 4096, streamResponse: true, lmStudioBaseUrl: "http://localhost:1234/v1" });

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
      { error: message, provider, model: modelId },
      { status: 500 }
    );
  }
}
