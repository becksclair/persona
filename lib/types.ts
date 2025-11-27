import { z } from "zod";

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
  temperature: z.number().min(0).max(2),
  maxOutputTokens: z.number().min(1).max(32000),
  streamResponse: z.boolean(),
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
