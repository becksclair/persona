import type { InferSelectModel } from "drizzle-orm";
import type {
  characters,
  conversations,
  messages,
  knowledgeBaseFiles,
  memoryItems,
} from "./db/schema";
import type { RAGMode } from "./constants";

// ─────────────────────────────────────────────────────────────
// Base DB Model Types (inferred from schema)
// ─────────────────────────────────────────────────────────────

export type Character = InferSelectModel<typeof characters>;
export type Conversation = InferSelectModel<typeof conversations>;
export type Message = InferSelectModel<typeof messages>;
export type KnowledgeBaseFile = InferSelectModel<typeof knowledgeBaseFiles>;
export type MemoryItem = InferSelectModel<typeof memoryItems>;

// ─────────────────────────────────────────────────────────────
// RAG Types
// ─────────────────────────────────────────────────────────────

export interface ConversationRagOverrides {
  enabled?: boolean;
  mode?: RAGMode;
  tagFilters?: string[];
}

export interface MessageMeta {
  memoryItemsUsed?: string[];
}

// ─────────────────────────────────────────────────────────────
// API-specific Types (views with resolved relations)
// ─────────────────────────────────────────────────────────────

/**
 * Character fields needed for chat prompt building.
 * Use Partial to allow any subset of Character fields.
 * The full Character type from DB will satisfy this.
 */
export interface CharacterForChat {
  id: string;
  name: string;
  defaultModelId: string | null;
  defaultTemperature: number | null;
  ragMode: string | null;
  // Prompt fields (all optional since buildSystemPrompt handles missing fields)
  systemRole?: string | null;
  tagline?: string | null;
  description?: string | null;
  personality?: string | null;
  background?: string | null;
  lifeHistory?: string | null;
  currentContext?: string | null;
  toneStyle?: string | null;
  boundaries?: string | null;
  roleRules?: string | null;
  greeting?: string | null;
  exampleDialogue?: string | null;
  customInstructionsLocal?: string | null;
}

/**
 * Conversation fields needed for chat model/RAG resolution.
 */
export interface ConversationForChat {
  modelIdOverride: string | null;
  temperatureOverride: number | null;
  ragOverrides: ConversationRagOverrides | null;
}

/**
 * Conversation with preview data for list views.
 */
export interface ConversationWithPreview {
  id: string;
  title: string | null;
  characterId: string | null;
  characterName: string | null;
  characterAvatar: string | null;
  isArchived: boolean;
  ragOverrides: ConversationRagOverrides | null;
  createdAt: Date;
  updatedAt: Date;
  lastMessage: string | null;
  lastMessageRole: "user" | "assistant" | null;
}

/**
 * Memory item with resolved source info for Memory Inspector.
 */
export interface MemoryItemWithSource {
  id: string;
  content: string;
  sourceType: string;
  sourceId: string | null;
  sourceFileName: string | null;
  tags: string[] | null;
  visibilityPolicy: string;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────────────────────────

/**
 * Structured API error response.
 */
export interface ApiErrorResponse {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

/**
 * Success response with data.
 */
export interface ApiSuccessResponse<T> {
  data: T;
}

/**
 * Paginated response wrapper (offset-based).
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

/**
 * Cursor-based paginated response (for infinite scroll).
 * Uses timestamp cursors for efficient keyset pagination.
 */
export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}
