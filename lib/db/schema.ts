import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  real,
  integer,
  jsonb,
  vector,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  enterSendsMessage: boolean("enter_sends_message").default(true).notNull(),
  theme: text("theme").default("system").notNull(), // 'light' | 'dark' | 'system'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────
// Sessions (for auth)
// ─────────────────────────────────────────────────────────────
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_token_idx").on(table.token),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

// ─────────────────────────────────────────────────────────────
// Characters (Constructs)
// ─────────────────────────────────────────────────────────────
export const characters = pgTable("characters", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  avatar: text("avatar"),
  tagline: text("tagline"),
  systemRole: text("system_role"),
  // Persona fields (explicit columns per spec)
  description: text("description"),
  personality: text("personality"),
  background: text("background"),
  lifeHistory: text("life_history"),
  currentContext: text("current_context"),
  // Behavior rules
  toneStyle: text("tone_style"),
  boundaries: text("boundaries"),
  roleRules: text("role_rules"),
  // Custom instructions
  customInstructionsLocal: text("custom_instructions_local"),
  // Operational profile
  defaultModelId: text("default_model_id"),
  defaultTemperature: real("default_temperature").default(0.7),
  maxContextWindow: integer("max_context_window"),
  // Flags
  evolveEnabled: boolean("evolve_enabled").default(false).notNull(),
  nsfwEnabled: boolean("nsfw_enabled").default(false).notNull(),
  isBuiltIn: boolean("is_built_in").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────
// Conversations
// ─────────────────────────────────────────────────────────────
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    characterId: uuid("character_id").references(() => characters.id, { onDelete: "set null" }),
    title: text("title"),
    // Per-chat model overrides
    modelIdOverride: text("model_id_override"),
    temperatureOverride: real("temperature_override"),
    // Status
    isArchived: boolean("is_archived").default(false).notNull(),
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("conversations_user_id_idx").on(table.userId),
    index("conversations_character_id_idx").on(table.characterId),
    index("conversations_archived_idx").on(table.isArchived),
  ],
);

// ─────────────────────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────────────────────
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'user' | 'assistant' | 'system' | 'inner_monologue'
    content: text("content").notNull(),
    // Context and metadata
    contextTags: jsonb("context_tags").$type<string[]>(),
    moodSnapshot: jsonb("mood_snapshot").$type<Record<string, number>>(),
    // Model/provider info
    meta: jsonb("meta").$type<{
      tokens?: number;
      provider?: string;
      model?: string;
      memoryItemsUsed?: string[];
      toolCalls?: unknown[];
    }>(),
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("messages_conversation_id_idx").on(table.conversationId),
    index("messages_role_idx").on(table.role),
    index("messages_created_at_idx").on(table.createdAt),
  ],
);

// ─────────────────────────────────────────────────────────────
// Knowledge Base Files
// ─────────────────────────────────────────────────────────────
export const knowledgeBaseFiles = pgTable(
  "knowledge_base_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    characterId: uuid("character_id").references(() => characters.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type"),
    fileSizeBytes: integer("file_size_bytes"),
    storagePath: text("storage_path").notNull(),
    status: text("status").default("pending").notNull(), // 'pending' | 'indexing' | 'ready' | 'failed' | 'paused'
    tags: jsonb("tags").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("kb_files_user_id_idx").on(table.userId),
    index("kb_files_character_id_idx").on(table.characterId),
    index("kb_files_status_idx").on(table.status),
  ],
);

// ─────────────────────────────────────────────────────────────
// Memory Items (RAG chunks with embeddings)
// ─────────────────────────────────────────────────────────────
export const memoryItems = pgTable(
  "memory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerType: text("owner_type").notNull(), // 'user' | 'character' | 'relationship'
    ownerId: uuid("owner_id").notNull(),
    sourceType: text("source_type").notNull(), // 'message' | 'file' | 'manual'
    sourceId: uuid("source_id"),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }), // OpenAI ada-002 dimensions
    tags: jsonb("tags").$type<string[]>(),
    visibilityPolicy: text("visibility_policy").default("normal").notNull(), // 'normal' | 'sensitive' | 'exclude_from_rag'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("memory_items_owner_idx").on(table.ownerType, table.ownerId),
    index("memory_items_source_idx").on(table.sourceType, table.sourceId),
  ],
);

// ─────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ one, many }) => ({
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  sessions: many(sessions),
  characters: many(characters),
  conversations: many(conversations),
  knowledgeBaseFiles: many(knowledgeBaseFiles),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  user: one(users, {
    fields: [characters.userId],
    references: [users.id],
  }),
  conversations: many(conversations),
  knowledgeBaseFiles: many(knowledgeBaseFiles),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  character: one(characters, {
    fields: [conversations.characterId],
    references: [characters.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const knowledgeBaseFilesRelations = relations(knowledgeBaseFiles, ({ one }) => ({
  user: one(users, {
    fields: [knowledgeBaseFiles.userId],
    references: [users.id],
  }),
  character: one(characters, {
    fields: [knowledgeBaseFiles.characterId],
    references: [characters.id],
  }),
}));
