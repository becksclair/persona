import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { knowledgeBaseFiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Errors } from "@/lib/api-errors";
import { FileStorage, deleteFileMemoryItems, indexFile, getFileMemoryItemCount } from "@/lib/rag";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/knowledge-base/[id]
 * Get a single knowledge base file with stats
 */
export async function GET(_req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
  }

  const { id } = await context.params;

  try {
    const [file] = await db
      .select()
      .from(knowledgeBaseFiles)
      .where(and(eq(knowledgeBaseFiles.id, id), eq(knowledgeBaseFiles.userId, user.userId)))
      .limit(1);

    if (!file) {
      return Errors.notFound("Knowledge base file");
    }

    const chunkCount = await getFileMemoryItemCount(id);

    return NextResponse.json({ ...file, chunkCount });
  } catch (error) {
    console.error("[knowledge-base/id] GET error:", error);
    return Errors.internal("Failed to fetch file");
  }
}

/**
 * PATCH /api/knowledge-base/[id]
 * Update file status (pause, resume, reindex) or tags
 *
 * Body:
 * - action: 'pause' | 'resume' | 'reindex' | 'updateTags'
 * - tags?: string[] (required for updateTags, optional for others)
 */
export async function PATCH(req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
  }

  const { id } = await context.params;

  try {
    const body = await req.json();
    const { action, tags } = body;

    // Verify ownership
    const [file] = await db
      .select()
      .from(knowledgeBaseFiles)
      .where(and(eq(knowledgeBaseFiles.id, id), eq(knowledgeBaseFiles.userId, user.userId)))
      .limit(1);

    if (!file) {
      return Errors.notFound("Knowledge base file");
    }

    // Handle actions
    if (action === "pause") {
      await db
        .update(knowledgeBaseFiles)
        .set({ status: "paused", updatedAt: new Date() })
        .where(eq(knowledgeBaseFiles.id, id));
    } else if (action === "resume") {
      // Resume to previous ready/failed state or ready if was paused
      const newStatus = file.status === "paused" ? "ready" : file.status;
      await db
        .update(knowledgeBaseFiles)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(knowledgeBaseFiles.id, id));
    } else if (action === "reindex") {
      // Re-run indexing pipeline
      const result = await indexFile(id);
      if (!result.success) {
        return Errors.internal(result.error ?? "Re-indexing failed");
      }
    } else if (action === "updateTags") {
      // Dedicated tag update - no status change
      if (!Array.isArray(tags)) {
        return Errors.invalidRequest("Tags must be an array");
      }
      await db
        .update(knowledgeBaseFiles)
        .set({ tags, updatedAt: new Date() })
        .where(eq(knowledgeBaseFiles.id, id));
    } else if (tags !== undefined) {
      // Legacy: update tags alongside other actions
      await db
        .update(knowledgeBaseFiles)
        .set({ tags, updatedAt: new Date() })
        .where(eq(knowledgeBaseFiles.id, id));
    }

    // Return updated file
    const [updated] = await db
      .select()
      .from(knowledgeBaseFiles)
      .where(eq(knowledgeBaseFiles.id, id))
      .limit(1);

    const chunkCount = await getFileMemoryItemCount(id);

    return NextResponse.json({ ...updated, chunkCount });
  } catch (error) {
    console.error("[knowledge-base/id] PATCH error:", error);
    return Errors.internal("Failed to update file");
  }
}

/**
 * DELETE /api/knowledge-base/[id]
 * Soft delete (or hard delete if specified)
 *
 * Query params:
 * - hard: 'true' to permanently delete file and embeddings
 */
export async function DELETE(req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
  }

  const { id } = await context.params;
  const url = new URL(req.url);
  const hardDelete = url.searchParams.get("hard") === "true";

  try {
    // Verify ownership
    const [file] = await db
      .select()
      .from(knowledgeBaseFiles)
      .where(and(eq(knowledgeBaseFiles.id, id), eq(knowledgeBaseFiles.userId, user.userId)))
      .limit(1);

    if (!file) {
      return Errors.notFound("Knowledge base file");
    }

    if (hardDelete) {
      // Delete memory items (embeddings)
      const deletedChunks = await deleteFileMemoryItems(id);

      // Delete physical file
      await FileStorage.delete(file.storagePath);

      // Delete database record
      await db.delete(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.id, id));

      return NextResponse.json({ success: true, deletedChunks });
    } else {
      // Soft delete: set status to 'paused' and mark for exclusion
      // In this MVP, we just pause the file (exclude from retrieval)
      await db
        .update(knowledgeBaseFiles)
        .set({ status: "paused", updatedAt: new Date() })
        .where(eq(knowledgeBaseFiles.id, id));

      return NextResponse.json({ success: true, softDeleted: true });
    }
  } catch (error) {
    console.error("[knowledge-base/id] DELETE error:", error);
    return Errors.internal("Failed to delete file");
  }
}
