import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import {
  validatePortableCharacter,
  validatePortableCharacterBatch,
  migrateToCurrentVersion,
  type PortableCharacterData,
} from "@/lib/portable-character";

/**
 * Find a unique name for the imported character.
 * Optimized: Single query to fetch all potentially conflicting names.
 */
async function findUniqueName(
  userId: string,
  baseName: string
): Promise<string> {
  // Escape special characters for LIKE pattern
  const escapedBase = baseName.replace(/[%_\\]/g, "\\$&");

  // Single query: Get base name, "(Imported)" variant, and all "(N)" variants
  const conflictingNames = await db
    .select({ name: characters.name })
    .from(characters)
    .where(
      and(
        eq(characters.userId, userId),
        or(
          eq(characters.name, baseName),
          eq(characters.name, `${baseName} (Imported)`),
          sql`${characters.name} LIKE ${escapedBase + " (%)"} ESCAPE '\\'`
        )
      )
    );

  // Build set of taken names for O(1) lookup
  const takenNames = new Set(conflictingNames.map((c) => c.name));

  // If base name is available, use it
  if (!takenNames.has(baseName)) {
    return baseName;
  }

  // Try "(Imported)" suffix
  const importedName = `${baseName} (Imported)`;
  if (!takenNames.has(importedName)) {
    return importedName;
  }

  // Find first available numeric suffix
  // Extract numbers from existing names like "Name (2)", "Name (3)"
  const numericPattern = /\((\d+)\)$/;
  const usedNumbers = new Set<number>();

  for (const name of takenNames) {
    const match = name.match(numericPattern);
    if (match) {
      usedNumbers.add(parseInt(match[1], 10));
    }
  }

  let num = 2;
  while (usedNumbers.has(num)) {
    num++;
  }

  return `${baseName} (${num})`;
}

/**
 * Import a single character and return the result.
 */
async function importSingleCharacter(
  userId: string,
  importData: PortableCharacterData
): Promise<{ character: typeof characters.$inferSelect; renamed: boolean; originalName?: string }> {
  const uniqueName = await findUniqueName(userId, importData.name);
  const wasRenamed = uniqueName !== importData.name;

  const [character] = await db
    .insert(characters)
    .values({
      userId,
      name: uniqueName,
      avatar: importData.avatar,
      tagline: importData.tagline,
      archetype: importData.archetype,
      systemRole: importData.systemRole,
      description: importData.description,
      personality: importData.personality,
      background: importData.background,
      lifeHistory: importData.lifeHistory,
      currentContext: importData.currentContext,
      toneStyle: importData.toneStyle,
      boundaries: importData.boundaries,
      roleRules: importData.roleRules,
      customInstructionsLocal: importData.customInstructionsLocal,
      tags: importData.tags,
      defaultModelId: importData.defaultModelId,
      defaultTemperature: importData.defaultTemperature ?? 0.7,
      maxContextWindow: importData.maxContextWindow ?? null,
      nsfwEnabled: importData.nsfwEnabled ?? false,
      evolveEnabled: importData.evolveEnabled ?? false,
      isBuiltIn: false,
      isArchived: false,
    })
    .returning();

  return {
    character,
    renamed: wasRenamed,
    originalName: wasRenamed ? importData.name : undefined,
  };
}

// POST /api/characters/import - Import character(s) from PortableCharacterV1 format
// Supports both single character and batch import (array of characters)
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Check if this is a batch import (array) or single import
    const isBatch = Array.isArray(body) || (body.characters && Array.isArray(body.characters));

    if (isBatch) {
      // Batch import
      const items = Array.isArray(body) ? body : body.characters;

      // Validate batch
      const validation = validatePortableCharacterBatch(items);
      if (!validation.success) {
        const errors = validation.error?.issues.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        }));
        return NextResponse.json(
          {
            error: "Invalid character format in batch",
            details: errors,
          },
          { status: 400 }
        );
      }

      const migratedItems = validation.data!.map((item) => migrateToCurrentVersion(item));

      // Import each character
      const results: Array<{
        success: boolean;
        character?: typeof characters.$inferSelect;
        renamed?: boolean;
        originalName?: string;
        error?: string;
      }> = [];

      for (const item of migratedItems) {
        try {
          const result = await importSingleCharacter(user.userId, item.character);
          results.push({
            success: true,
            ...result,
          });
        } catch (err) {
          results.push({
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      return NextResponse.json(
        {
          batch: true,
          total: results.length,
          imported: successCount,
          failed: failCount,
          results,
        },
        { status: failCount === results.length ? 400 : 201 }
      );
    }

    // Single import
    const validation = validatePortableCharacter(body);
    if (!validation.success) {
      const errors = validation.error?.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json(
        {
          error: "Invalid character format",
          details: errors,
        },
        { status: 400 }
      );
    }

    const portable = migrateToCurrentVersion(validation.data!);
    const result = await importSingleCharacter(user.userId, portable.character);

    return NextResponse.json(
      {
        batch: false,
        ...result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[characters/import] POST error:", error);
    return NextResponse.json(
      { error: "Failed to import character" },
      { status: 500 }
    );
  }
}
