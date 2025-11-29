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
  sourceFileName?: string;
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
    // Left join with knowledge_base_files to get source file names
    const LOW_PRIORITY_PENALTY = 0.15;
    const results = await db.execute<{
      id: string;
      content: string;
      source_type: string;
      source_id: string | null;
      source_file_name: string | null;
      tags: string[] | null;
      similarity: number;
    }>(sql`
      SELECT
        m.id,
        m.content,
        m.source_type,
        m.source_id,
        COALESCE(kbf.file_name, NULL) as source_file_name,
        m.tags,
        1 - (m.embedding <=> ${embeddingLiteral}::vector)
          - CASE WHEN m.tags @> '["__low_priority"]'::jsonb THEN ${LOW_PRIORITY_PENALTY} ELSE 0 END
          as similarity
      FROM memory_items m
      LEFT JOIN knowledge_base_files kbf ON m.source_type = 'file' AND m.source_id = kbf.id::text
      WHERE
        m.embedding IS NOT NULL
        AND m.visibility_policy != 'exclude_from_rag'
        AND (
          (m.owner_type = 'user' AND m.owner_id = ${userId}::uuid)
          ${
            useCharacterId
              ? sql`OR (m.owner_type = 'character' AND m.owner_id = ${characterId}::uuid)`
              : sql``
          }
          ${
            useCharacterId
              ? sql`
                OR (
                  m.owner_type = 'relationship'
                  AND m.owner_id = ${userId}::uuid
                  AND m.tags @> ${JSON.stringify([characterId])}::jsonb
                )`
              : sql``
          }
        )
        ${
          archivedIds.length > 0
            ? sql`AND NOT (m.source_type = 'message' AND m.source_id IN (
              SELECT id FROM messages WHERE conversation_id = ANY(${archivedIds}::uuid[])
            ))`
            : sql``
        }
        ${
          pausedFileIds.length > 0
            ? sql`AND NOT (m.source_type = 'file' AND m.source_id = ANY(${pausedFileIds}::uuid[]))`
            : sql``
        }
        ${
          activeTagFilters.length > 0
            ? sql`AND m.tags @> ${JSON.stringify(activeTagFilters)}::jsonb`
            : sql``
        }
        AND 1 - (m.embedding <=> ${embeddingLiteral}::vector) >= ${minScore}
      ORDER BY
        m.embedding <=> ${embeddingLiteral}::vector
        + CASE WHEN m.tags @> '["__low_priority"]'::jsonb THEN ${LOW_PRIORITY_PENALTY} ELSE 0 END
      LIMIT ${topK}
    `);

    const memories: RetrievedMemory[] = (
      results as unknown as Array<{
        id: string;
        content: string;
        source_type: string;
        source_id: string | null;
        source_file_name: string | null;
        tags: string[] | null;
        similarity: number;
      }>
    ).map((row) => ({
      id: row.id,
      content: row.content,
      sourceType: row.source_type,
      sourceId: row.source_id,
      sourceFileName: row.source_file_name ?? undefined,
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
 * Escape XML special characters in text content
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Format retrieved memories for prompt injection.
 * Uses structured XML format with metadata for better LLM comprehension.
 *
 * Format:
 * <retrieved_memories count="N">
 *   <memory id="uuid" source="filename" type="file" relevance="0.87">
 *     Content here...
 *   </memory>
 * </retrieved_memories>
 */
export function formatMemoriesForPrompt(memories: RetrievedMemory[]): string {
  if (memories.length === 0) return "";

  const memoryTags = memories
    .map((m) => {
      // Build attribute string
      const attrs: string[] = [`id="${m.id}"`];

      // Source info - prefer filename, fallback to type
      if (m.sourceFileName) {
        attrs.push(`source="${escapeXml(m.sourceFileName)}"`);
      }
      attrs.push(`type="${m.sourceType}"`);

      // Relevance score (rounded to 2 decimals)
      attrs.push(`relevance="${m.similarity.toFixed(2)}"`);

      // Tags (exclude internal tags starting with __)
      const visibleTags = m.tags?.filter((t) => !t.startsWith("__")) ?? [];
      if (visibleTags.length > 0) {
        attrs.push(`tags="${escapeXml(visibleTags.join(","))}"`);
      }

      // Truncate content for prompt efficiency (preserve full content for high-relevance items)
      const maxLength = m.similarity > 0.8 ? 500 : 300;
      const content =
        m.content.length > maxLength ? `${m.content.slice(0, maxLength)}...` : m.content;

      return `  <memory ${attrs.join(" ")}>\n${escapeXml(content)}\n  </memory>`;
    })
    .join("\n");

  return `<retrieved_memories count="${memories.length}">
${memoryTags}
</retrieved_memories>

Use the retrieved memories above when relevant to the conversation. Reference them naturally without mentioning the XML structure.`;
}

/**
 * Get memory item IDs for logging purposes
 */
export function getMemoryItemIds(memories: RetrievedMemory[]): string[] {
  return memories.map((m) => m.id);
}
