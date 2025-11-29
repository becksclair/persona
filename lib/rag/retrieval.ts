import { db } from "@/lib/db";
import { knowledgeBaseFiles, conversations } from "@/lib/db/schema";
import type { RAGMode } from "@/lib/types";
import { eq, and, sql } from "drizzle-orm";
import { RAGConfigSvc } from "./config";
import { generateEmbedding } from "./embedding";

/**
 * RAG retrieval service for fetching relevant memory items during chat.
 * Uses parameterized queries to prevent SQL injection.
 */

export interface RetrievedMemory {
  id: string;
  content: string;
  sourceType: string;
  sourceId: string | null;
  similarity: number;
  tags: string[] | null;
}

export interface RetrievalResult {
  memories: RetrievedMemory[];
  query: string;
  topK: number;
}

/**
 * Retrieve relevant memory items for a chat turn.
 * Excludes archived conversations and respects visibility policies.
 * Uses safe parameterized queries throughout.
 */
export async function retrieveRelevantMemories(options: {
  userId: string;
  characterId?: string | null;
  conversationId?: string | null;
  query: string;
  topK?: number;
  ragMode?: RAGMode;
  tagFilters?: string[];
}): Promise<RetrievalResult> {
  const { userId, characterId, query } = options;
  const ragMode = options.ragMode ?? "heavy";
  const baseTopK = options.topK ?? RAGConfigSvc.getDefaultTopK();
  const effectiveTopK = ragMode === "light" ? Math.max(1, Math.round(baseTopK / 2)) : baseTopK;
  const topK = Math.min(effectiveTopK, RAGConfigSvc.getMaxTopK());
  const minScore = RAGConfigSvc.getMinSimilarityScore();
  const activeTagFilters =
    options.tagFilters?.map((t) => t.trim()).filter((t) => t.length > 0) ?? [];

  // RAG explicitly disabled for this character
  if (ragMode === "ignore") {
    return { memories: [], query, topK: 0 };
  }

  // Guard against malformed characterId to avoid UUID cast errors / injection attempts
  const isValidUuid =
    typeof characterId === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      characterId,
    );
  const useCharacterId = !!characterId && isValidUuid;

  // Generate query embedding
  let queryEmbedding: number[];
  try {
    const result = await generateEmbedding(query);
    queryEmbedding = result.embedding;
  } catch (error) {
    console.error("[RAG] Failed to generate query embedding:", error);
    return { memories: [], query, topK };
  }

  try {
    // Get IDs of archived conversations to exclude
    const archivedConvs = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.isArchived, true)));
    const archivedIds = archivedConvs.map((c) => c.id);

    // Get paused files to exclude
    const pausedFiles = await db
      .select({ id: knowledgeBaseFiles.id })
      .from(knowledgeBaseFiles)
      .where(and(eq(knowledgeBaseFiles.userId, userId), eq(knowledgeBaseFiles.status, "paused")));
    const pausedFileIds = pausedFiles.map((f) => f.id);

    // Build embedding vector string for pgvector (safe - only numbers)
    const embeddingLiteral = `[${queryEmbedding.join(",")}]`;

    // Execute parameterized similarity search
    // Using sql template with proper parameter binding
    // __low_priority items get a 0.15 similarity penalty to rank them lower
    const LOW_PRIORITY_PENALTY = 0.15;
    const results = await db.execute<{
      id: string;
      content: string;
      source_type: string;
      source_id: string | null;
      tags: string[] | null;
      similarity: number;
    }>(sql`
      SELECT
        id,
        content,
        source_type,
        source_id,
        tags,
        1 - (embedding <=> ${embeddingLiteral}::vector)
          - CASE WHEN tags @> '["__low_priority"]'::jsonb THEN ${LOW_PRIORITY_PENALTY} ELSE 0 END
          as similarity
      FROM memory_items
      WHERE
        embedding IS NOT NULL
        AND visibility_policy != 'exclude_from_rag'
        AND (
          (owner_type = 'user' AND owner_id = ${userId}::uuid)
          ${
            useCharacterId
              ? sql`OR (owner_type = 'character' AND owner_id = ${characterId}::uuid)`
              : sql``
          }
          ${
            useCharacterId
              ? sql`
                OR (
                  owner_type = 'relationship'
                  AND owner_id = ${userId}::uuid
                  AND tags @> ${JSON.stringify([characterId])}::jsonb
                )`
              : sql``
          }
        )
        ${
          archivedIds.length > 0
            ? sql`AND NOT (source_type = 'message' AND source_id IN (
              SELECT id FROM messages WHERE conversation_id = ANY(${archivedIds}::uuid[])
            ))`
            : sql``
        }
        ${
          pausedFileIds.length > 0
            ? sql`AND NOT (source_type = 'file' AND source_id = ANY(${pausedFileIds}::uuid[]))`
            : sql``
        }
        ${
          activeTagFilters.length > 0
            ? sql`AND tags @> ${JSON.stringify(activeTagFilters)}::jsonb`
            : sql``
        }
        AND 1 - (embedding <=> ${embeddingLiteral}::vector) >= ${minScore}
      ORDER BY
        embedding <=> ${embeddingLiteral}::vector
        + CASE WHEN tags @> '["__low_priority"]'::jsonb THEN ${LOW_PRIORITY_PENALTY} ELSE 0 END
      LIMIT ${topK}
    `);

    const memories: RetrievedMemory[] = (
      results as unknown as Array<{
        id: string;
        content: string;
        source_type: string;
        source_id: string | null;
        tags: string[] | null;
        similarity: number;
      }>
    ).map((row) => ({
      id: row.id,
      content: row.content,
      sourceType: row.source_type,
      sourceId: row.source_id,
      similarity: row.similarity,
      tags: row.tags,
    }));

    return { memories, query, topK };
  } catch (error) {
    console.error("[RAG] Retrieval failed:", error);
    return { memories: [], query, topK };
  }
}

/**
 * Format retrieved memories for prompt injection.
 * Returns a compact "Relevant past info" block.
 */
export function formatMemoriesForPrompt(memories: RetrievedMemory[]): string {
  if (memories.length === 0) return "";

  const formatted = memories
    .map((m, i) => `[${i + 1}] ${m.content.slice(0, 300)}${m.content.length > 300 ? "..." : ""}`)
    .join("\n");

  return `<relevant_context>
The following relevant information was retrieved from your knowledge base:

${formatted}

Use this context naturally in your response when relevant.
</relevant_context>`;
}

/**
 * Get memory item IDs for logging purposes
 */
export function getMemoryItemIds(memories: RetrievedMemory[]): string[] {
  return memories.map((m) => m.id);
}
