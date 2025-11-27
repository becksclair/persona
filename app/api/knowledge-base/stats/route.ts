import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Errors } from "@/lib/api-errors";
import { getCharacterKBStats, checkEmbeddingAvailability, RAGConfigSvc } from "@/lib/rag";

/**
 * GET /api/knowledge-base/stats
 * Get knowledge base stats for a character
 *
 * Query params:
 * - characterId: string (required)
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
  }

  const url = new URL(req.url);
  const characterId = url.searchParams.get("characterId");

  if (!characterId) {
    return Errors.invalidRequest("characterId is required");
  }

  try {
    // Verify character ownership
    const [character] = await db
      .select({ id: characters.id, name: characters.name })
      .from(characters)
      .where(and(eq(characters.id, characterId), eq(characters.userId, user.userId)))
      .limit(1);

    if (!character) {
      return Errors.characterNotFound();
    }

    const stats = await getCharacterKBStats(characterId);
    const embeddingStatus = await checkEmbeddingAvailability();

    return NextResponse.json({
      characterId,
      characterName: character.name,
      ...stats,
      embeddingService: embeddingStatus,
      config: {
        maxFileSizeBytes: RAGConfigSvc.getMaxFileSizeBytes(),
        defaultTopK: RAGConfigSvc.getDefaultTopK(),
        chunkSize: RAGConfigSvc.getChunkSize(),
      },
    });
  } catch (error) {
    console.error("[knowledge-base/stats] GET error:", error);
    return Errors.internal("Failed to fetch stats");
  }
}
