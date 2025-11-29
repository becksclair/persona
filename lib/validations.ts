import { z } from "zod";
import { LIMITS } from "./constants";

// ─────────────────────────────────────────────────────────────
// Shared Schemas (reusable components)
// ─────────────────────────────────────────────────────────────

export const ragModeSchema = z.enum(["heavy", "light", "ignore"]);

export const ragOverridesSchema = z
  .object({
    enabled: z.boolean().optional(),
    mode: ragModeSchema.optional(),
    tagFilters: z.array(z.string()).max(LIMITS.maxTagFilters).optional(),
  })
  .nullable()
  .optional();

export const messageMetaSchema = z
  .object({
    memoryItemsUsed: z.array(z.string().uuid()).optional(),
  })
  .nullable()
  .optional();

// ─────────────────────────────────────────────────────────────
// Character Schemas
// ─────────────────────────────────────────────────────────────

export const createCharacterSchema = z.object({
  name: z.string().min(1, "Name is required").max(LIMITS.characterName),
  avatar: z.string().url().optional().nullable(),
  tagline: z.string().max(LIMITS.tagline).optional().nullable(),
  systemRole: z.string().optional().nullable(),
  description: z.string().max(LIMITS.description).optional().nullable(),
  personality: z.string().optional().nullable(),
  background: z.string().optional().nullable(),
  lifeHistory: z.string().optional().nullable(),
  currentContext: z.string().optional().nullable(),
  toneStyle: z.string().optional().nullable(),
  boundaries: z.string().optional().nullable(),
  roleRules: z.string().optional().nullable(),
  greeting: z.string().optional().nullable(),
  exampleDialogue: z.string().optional().nullable(),
  customInstructionsLocal: z.string().optional().nullable(),
  ragMode: ragModeSchema.optional().nullable(),
  defaultModelId: z.string().optional().nullable(),
  defaultTemperature: z.number().min(0).max(2).optional().nullable(),
});

export const updateCharacterSchema = createCharacterSchema.partial();

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;

// ─────────────────────────────────────────────────────────────
// Conversation Schemas
// ─────────────────────────────────────────────────────────────

export const createConversationSchema = z.object({
  characterId: z.string().uuid().optional().nullable(),
  title: z.string().max(LIMITS.conversationTitle).optional().nullable(),
  ragOverrides: ragOverridesSchema,
});

export const updateConversationSchema = z.object({
  title: z.string().max(LIMITS.conversationTitle).optional().nullable(),
  isArchived: z.boolean().optional(),
  modelIdOverride: z.string().optional().nullable(),
  temperatureOverride: z.number().min(0).max(2).optional().nullable(),
  ragOverrides: ragOverridesSchema,
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;

// ─────────────────────────────────────────────────────────────
// Message Schemas
// ─────────────────────────────────────────────────────────────

export const createMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1, "Content is required"),
  meta: messageMetaSchema,
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;

// ─────────────────────────────────────────────────────────────
// Chat Request Schema
// ─────────────────────────────────────────────────────────────

export const chatRequestSchema = z.object({
  messages: z.array(z.any()).min(1, "At least one message is required"),
  conversationId: z.string().uuid().optional(),
  characterId: z.string().uuid().optional(),
  modelSettings: z
    .object({
      model: z.string().optional(),
      provider: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
    })
    .optional(),
  enableRAG: z.boolean().optional(),
  ragMode: ragModeSchema.optional(),
  tagFilters: z.array(z.string()).max(LIMITS.maxTagFilters).optional(),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

// ─────────────────────────────────────────────────────────────
// Knowledge Base Schemas
// ─────────────────────────────────────────────────────────────

export const updateKnowledgeBaseFileSchema = z.object({
  tags: z.array(z.string()).optional(),
  status: z.enum(["ready", "paused"]).optional(),
});

export type UpdateKnowledgeBaseFileInput = z.infer<typeof updateKnowledgeBaseFileSchema>;

// ─────────────────────────────────────────────────────────────
// Memory Item Feedback Schema
// ─────────────────────────────────────────────────────────────

export const memoryFeedbackSchema = z.object({
  action: z.enum(["exclude", "lower_priority", "restore"]),
});

export type MemoryFeedbackInput = z.infer<typeof memoryFeedbackSchema>;

// ─────────────────────────────────────────────────────────────
// Validation Helper
// ─────────────────────────────────────────────────────────────

export type ValidationResult<T> = { success: true; data: T } | { success: false; error: string };

/**
 * Validate request body against a Zod schema.
 * Returns a typed result with either the validated data or a user-friendly error message.
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    // Format the first error for user-friendly message
    const firstError = result.error.issues[0];
    const path = firstError.path.length > 0 ? `${firstError.path.join(".")}: ` : "";
    return {
      success: false,
      error: `${path}${firstError.message}`,
    };
  }

  return { success: true, data: result.data };
}
