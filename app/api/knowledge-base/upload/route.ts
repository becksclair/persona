import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { knowledgeBaseFiles, characters } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Errors } from "@/lib/api-errors";
import { FileStorage, getMimeType, RAGConfigSvc, indexFile } from "@/lib/rag";

/**
 * POST /api/knowledge-base/upload
 * Upload a file to a character's knowledge base
 *
 * Request: multipart/form-data with:
 * - file: File
 * - characterId: string
 * - tags?: string (comma-separated)
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const characterId = formData.get("characterId") as string | null;
    const tagsStr = formData.get("tags") as string | null;

    if (!file) {
      return Errors.invalidRequest("No file provided");
    }

    if (!characterId) {
      return Errors.invalidRequest("characterId is required");
    }

    // Validate file size
    const maxSize = RAGConfigSvc.getMaxFileSizeBytes();
    if (file.size > maxSize) {
      return Errors.invalidRequest(
        `File size exceeds limit (${RAGConfigSvc.formatFileSize(maxSize)})`,
      );
    }

    // Verify character ownership
    const [character] = await db
      .select({ id: characters.id })
      .from(characters)
      .where(and(eq(characters.id, characterId), eq(characters.userId, user.userId)))
      .limit(1);

    if (!character) {
      return Errors.characterNotFound();
    }

    // Store file
    const storedFile = await FileStorage.store(user.userId, characterId, file, file.name);

    // Parse tags
    const tags = tagsStr
      ? tagsStr
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    // Create database record
    const [kbFile] = await db
      .insert(knowledgeBaseFiles)
      .values({
        userId: user.userId,
        characterId,
        fileName: storedFile.originalName,
        fileType: getMimeType(storedFile.originalName),
        fileSizeBytes: storedFile.sizeBytes,
        storagePath: storedFile.path,
        status: "pending",
        tags,
      })
      .returning();

    // Start indexing (synchronous for MVP)
    // TODO: Move to background job queue in later phase
    const indexResult = await indexFile(kbFile.id);

    // Refetch to get updated status
    const [updatedFile] = await db
      .select()
      .from(knowledgeBaseFiles)
      .where(eq(knowledgeBaseFiles.id, kbFile.id))
      .limit(1);

    return NextResponse.json(
      {
        file: updatedFile,
        indexing: indexResult,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[knowledge-base/upload] POST error:", error);
    return Errors.internal("Failed to upload file");
  }
}
