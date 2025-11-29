import { db } from "@/lib/db";
import { memoryItems, knowledgeBaseFiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { processFileForIndexing, type TextChunk } from "./chunking";
import { generateEmbedding } from "./embedding";
import { checkEmbeddingAvailability } from "./embedding";

/**
 * Indexing pipeline for knowledge base files.
 * Chunks files, generates embeddings, and stores memory items.
 * Uses transactions for atomic operations.
 */

export interface IndexingResult {
  fileId: string;
  success: boolean;
  chunksCreated: number;
  totalChunks: number;
  error?: string;
}

interface EmbeddedChunk {
  chunk: TextChunk;
  embedding: number[];
}

/**
 * Index a single knowledge base file.
 * This runs synchronously in the request for MVP.
 * TODO: Refactor to async job queue in later phase.
 */
export async function indexFile(fileId: string, signal?: AbortSignal): Promise<IndexingResult> {
  // Check for cancellation
  if (signal?.aborted) {
    return { fileId, success: false, chunksCreated: 0, totalChunks: 0, error: "Operation cancelled" };
  }

  // Get file info
  const [file] = await db
    .select()
    .from(knowledgeBaseFiles)
    .where(eq(knowledgeBaseFiles.id, fileId))
    .limit(1);

  if (!file) {
    return { fileId, success: false, chunksCreated: 0, totalChunks: 0, error: "File not found" };
  }

  // Check for cancellation before starting expensive operations
  if (signal?.aborted) {
    return { fileId, success: false, chunksCreated: 0, totalChunks: 0, error: "Operation cancelled" };
  }

  // Check embedding service availability before starting
  const embeddingStatus = await checkEmbeddingAvailability();
  if (!embeddingStatus.available) {
    await db
      .update(knowledgeBaseFiles)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(knowledgeBaseFiles.id, fileId));
    return {
      fileId,
      success: false,
      chunksCreated: 0,
      totalChunks: 0,
      error: `Embedding service unavailable: ${embeddingStatus.error ?? "No provider configured"}`,
    };
  }

  // Update status to indexing
  await db
    .update(knowledgeBaseFiles)
    .set({ status: "indexing", updatedAt: new Date() })
    .where(eq(knowledgeBaseFiles.id, fileId));

  try {
    // Extract text and chunk
    if (signal?.aborted) {
      throw new Error("Operation cancelled during processing");
    }
    const chunks = await processFileForIndexing(file.storagePath, file.fileType);

    if (chunks.length === 0) {
      await db
        .update(knowledgeBaseFiles)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(knowledgeBaseFiles.id, fileId));
      return {
        fileId,
        success: false,
        chunksCreated: 0,
        totalChunks: 0,
        error: "No text content extracted",
      };
    }

    // Generate embeddings first (outside transaction to avoid long-running txn)
    const embeddedChunks: EmbeddedChunk[] = [];
    const failedChunks: number[] = [];

    for (const chunk of chunks) {
      if (signal?.aborted) {
        throw new Error("Operation cancelled during embedding generation");
      }
      
      try {
        const embeddingResult = await generateEmbedding(chunk.content);
        embeddedChunks.push({ chunk, embedding: embeddingResult.embedding });
      } catch (error) {
        console.error(`[Indexing] Failed to embed chunk ${chunk.index}:`, error);
        failedChunks.push(chunk.index);
      }
    }

    if (embeddedChunks.length === 0) {
      await db
        .update(knowledgeBaseFiles)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(knowledgeBaseFiles.id, fileId));
      return {
        fileId,
        success: false,
        chunksCreated: 0,
        totalChunks: chunks.length,
        error: "All chunks failed to embed",
      };
    }

    // Use transaction for atomic delete + insert
    if (signal?.aborted) {
      throw new Error("Operation cancelled before database transaction");
    }
    
    await db.transaction(async (tx) => {
      // Delete existing memory items for this file (for re-indexing)
      await tx
        .delete(memoryItems)
        .where(and(eq(memoryItems.sourceType, "file"), eq(memoryItems.sourceId, fileId)));

      // Insert all embedded chunks
      for (const { chunk, embedding } of embeddedChunks) {
        await tx.insert(memoryItems).values({
          ownerType: file.characterId ? "character" : "user",
          ownerId: file.characterId ?? file.userId,
          sourceType: "file",
          sourceId: fileId,
          content: chunk.content,
          embedding,
          tags: file.tags ?? [],
          visibilityPolicy: "normal",
        });
      }
    });

    // Update file status
    const finalStatus = embeddedChunks.length > 0 ? "ready" : "failed";
    await db
      .update(knowledgeBaseFiles)
      .set({ status: finalStatus, updatedAt: new Date() })
      .where(eq(knowledgeBaseFiles.id, fileId));

    if (failedChunks.length > 0) {
      console.warn(
        `[Indexing] ${failedChunks.length}/${chunks.length} chunks failed for file ${fileId}`,
      );
    }

    return {
      fileId,
      success: embeddedChunks.length > 0,
      chunksCreated: embeddedChunks.length,
      totalChunks: chunks.length,
    };
  } catch (error) {
    console.error("[Indexing] File indexing failed:", error);

    await db
      .update(knowledgeBaseFiles)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(knowledgeBaseFiles.id, fileId));

    return {
      fileId,
      success: false,
      chunksCreated: 0,
      totalChunks: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete all memory items associated with a file
 */
export async function deleteFileMemoryItems(fileId: string): Promise<number> {
  const result = await db
    .delete(memoryItems)
    .where(and(eq(memoryItems.sourceType, "file"), eq(memoryItems.sourceId, fileId)))
    .returning({ id: memoryItems.id });

  return result.length;
}

/**
 * Get memory item count for a file
 */
export async function getFileMemoryItemCount(fileId: string): Promise<number> {
  const items = await db
    .select({ id: memoryItems.id })
    .from(memoryItems)
    .where(and(eq(memoryItems.sourceType, "file"), eq(memoryItems.sourceId, fileId)));

  return items.length;
}

/**
 * Get stats for a character's knowledge base
 */
export async function getCharacterKBStats(characterId: string): Promise<{
  totalFiles: number;
  readyFiles: number;
  indexingFiles: number;
  failedFiles: number;
  pausedFiles: number;
  totalChunks: number;
}> {
  const files = await db
    .select({
      id: knowledgeBaseFiles.id,
      status: knowledgeBaseFiles.status,
    })
    .from(knowledgeBaseFiles)
    .where(eq(knowledgeBaseFiles.characterId, characterId));

  const items = await db
    .select({ id: memoryItems.id })
    .from(memoryItems)
    .where(
      and(
        eq(memoryItems.ownerType, "character"),
        eq(memoryItems.ownerId, characterId),
        eq(memoryItems.sourceType, "file"),
      ),
    );

  return {
    totalFiles: files.length,
    readyFiles: files.filter((f) => f.status === "ready").length,
    indexingFiles: files.filter((f) => f.status === "indexing").length,
    failedFiles: files.filter((f) => f.status === "failed").length,
    pausedFiles: files.filter((f) => f.status === "paused").length,
    totalChunks: items.length,
  };
}
