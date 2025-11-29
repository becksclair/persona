/**
 * Centralized application constants.
 * For RAG-specific config, see lib/rag/config.ts which loads from config/rag.json
 */

// Model defaults (fallback when no character/conversation override)
export const MODEL_DEFAULTS = {
  temperature: 0.7,
  maxOutputTokens: 4096,
} as const;

// UI/Validation limits
export const LIMITS = {
  characterName: 100,
  tagline: 200,
  description: 2000,
  conversationTitle: 200,
  messagePreview: 100,
  maxTagFilters: 20,
  maxMemoryItemsPerRequest: 50,
} as const;

// Visibility policies for memory items
export const VISIBILITY_POLICY = {
  normal: "normal",
  sensitive: "sensitive",
  excludeFromRag: "exclude_from_rag",
} as const;

export type VisibilityPolicy = (typeof VISIBILITY_POLICY)[keyof typeof VISIBILITY_POLICY];

// Internal tags (prefixed with __ to distinguish from user tags)
export const INTERNAL_TAGS = {
  lowPriority: "__low_priority",
} as const;

// RAG priority penalty for low-priority items
export const LOW_PRIORITY_PENALTY = 0.15;

// Default system prompt when no character is available
export const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant.";

// Message roles
export const MESSAGE_ROLES = {
  user: "user",
  assistant: "assistant",
  system: "system",
} as const;

export type MessageRole = (typeof MESSAGE_ROLES)[keyof typeof MESSAGE_ROLES];

// Knowledge base file statuses
export const KB_FILE_STATUS = {
  pending: "pending",
  indexing: "indexing",
  ready: "ready",
  failed: "failed",
  paused: "paused",
} as const;

export type KBFileStatus = (typeof KB_FILE_STATUS)[keyof typeof KB_FILE_STATUS];

// RAG modes
export const RAG_MODES = {
  heavy: "heavy",
  light: "light",
  ignore: "ignore",
} as const;

export type RAGMode = (typeof RAG_MODES)[keyof typeof RAG_MODES];
