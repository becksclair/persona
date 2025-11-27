import { z } from "zod";

// Model Provider Types
export const ModelProviderSchema = z.enum(["openai", "lmstudio"]);
export type ModelProvider = z.infer<typeof ModelProviderSchema>;

export const ModelDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ModelProviderSchema,
  contextWindow: z.number().optional(),
});
export type ModelDefinition = z.infer<typeof ModelDefinitionSchema>;

/**
 * Available models configuration
 *
 * OpenAI models: Static list of cloud models
 * LM Studio models: The ID must match what's loaded in LM Studio.
 *   Query your LM Studio instance: curl http://localhost:1234/v1/models
 *   Common format: "org/model-name" (e.g., "qwen/qwen3-8b", "mistral/mistral-7b")
 *
 * @see lib/lmstudio.ts for dynamic model discovery utilities
 */
export const AVAILABLE_MODELS: ModelDefinition[] = [
  // OpenAI Models (cloud)
  { id: "gpt-5-pro", name: "GPT-5 Pro", provider: "openai", contextWindow: 128000 },
  { id: "gpt-5-nano", name: "GPT-5 Nano", provider: "openai", contextWindow: 128000 },
  { id: "gpt-4.1", name: "GPT-4.1", provider: "openai", contextWindow: 128000 },
  { id: "gpt-4.1-mini", name: "GPT-4.1-mini", provider: "openai", contextWindow: 128000 },
  // LM Studio Models (local) - Update ID to match your LM Studio installation
  { id: "qwen/qwen3-8b", name: "Qwen3 8B (Local)", provider: "lmstudio", contextWindow: 32000 },
];

// Helper to get model by ID
export function getModelById(id: string): ModelDefinition | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === id);
}

export const PersonalitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  avatar: z.string().optional(),
  systemPrompt: z.string(),
  tone: z.enum(["Professional", "Friendly", "Humorous", "Analytical", "Expert", "Creative"]),
});

export const ModelSettingsSchema = z.object({
  model: z.string(),
  provider: ModelProviderSchema.default("openai"),
  temperature: z.number().min(0).max(2),
  maxOutputTokens: z.number().min(1).max(32000),
  streamResponse: z.boolean(),
  // LM Studio specific
  lmStudioBaseUrl: z.string().default("http://localhost:1234/v1"),
});

export const RAGSettingsSchema = z.object({
  enabled: z.boolean(),
  contextRecall: z.number().min(0).max(1),
  knowledgeBase: z.array(z.string()), // File IDs or names
});

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: z.date(),
});

export const AppStateSchema = z.object({
  personalities: z.array(PersonalitySchema),
  activePersonalityId: z.string(),
  modelSettings: ModelSettingsSchema,
  ragSettings: RAGSettingsSchema,
});

export type Personality = z.infer<typeof PersonalitySchema>;
export type ModelSettings = z.infer<typeof ModelSettingsSchema>;
export type RAGSettings = z.infer<typeof RAGSettingsSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type AppState = z.infer<typeof AppStateSchema>;
