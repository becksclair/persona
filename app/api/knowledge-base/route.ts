import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { knowledgeBaseFiles, characters } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Errors } from "@/lib/api-errors";
import { getFileMemoryItemCount } from "@/lib/rag";

/**
 * GET /api/knowledge-base
 * List knowledge base files for a character
 *
 * Query params:
 * - characterId: string (required)
 * - status?: 'pending' | 'indexing' | 'ready' | 'failed' | 'paused'
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
  }

  const url = new URL(req.url);
  const characterId = url.searchParams.get("characterId");
  const status = url.searchParams.get("status");

  if (!characterId) {
    return Errors.invalidRequest("characterId is required");
  }

  try {
    // Verify character ownership
    const [character] = await db
      .select({ id: characters.id })
      .from(characters)
      .where(and(eq(characters.id, characterId), eq(characters.userId, user.userId)))
      .limit(1);

    if (!character) {
      return Errors.characterNotFound();
    }

    // Build query conditions
    const conditions = [
      eq(knowledgeBaseFiles.userId, user.userId),
      eq(knowledgeBaseFiles.characterId, characterId),
    ];

    if (status) {
      conditions.push(eq(knowledgeBaseFiles.status, status));
    }

    const files = await db
      .select()
      .from(knowledgeBaseFiles)
      .where(and(...conditions))
      .orderBy(knowledgeBaseFiles.createdAt);

    // Get chunk counts for each file
    const filesWithStats = await Promise.all(
      files.map(async (file) => ({
        ...file,
        chunkCount: await getFileMemoryItemCount(file.id),
      }))
    );

    return NextResponse.json(filesWithStats);
  } catch (error) {
    console.error("[knowledge-base] GET error:", error);
    return Errors.internal("Failed to fetch knowledge base files");
  }
}
