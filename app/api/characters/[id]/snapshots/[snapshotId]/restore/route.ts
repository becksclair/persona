import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { characters, personaSnapshots } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { characterToSnapshotData } from "@/lib/snapshots";
import { portableToCharacterUpdate } from "@/lib/character-adapter";

interface RouteContext {
  params: Promise<{ id: string; snapshotId: string }>;
}

export async function POST(_req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, snapshotId } = await context.params;

  try {
    const [snapshot] = await db
      .select()
      .from(personaSnapshots)
      .where(
        and(
          eq(personaSnapshots.id, snapshotId),
          eq(personaSnapshots.characterId, id),
          eq(personaSnapshots.userId, user.userId),
        ),
      )
      .limit(1);

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    if (!snapshot.data) {
      return NextResponse.json({ error: "Snapshot is missing data" }, { status: 400 });
    }

    const [current] = await db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, user.userId)))
      .limit(1);

    if (!current) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // Guard checkpoint before applying restore
    const [guardSnapshot] = await db
      .insert(personaSnapshots)
      .values({
        userId: user.userId,
        characterId: id,
        label: `Auto before restore → ${snapshot.label}`,
        notes: "Automatically created before restoring a checkpoint",
        kind: "auto",
        data: characterToSnapshotData(current),
        characterUpdatedAt: current.updatedAt,
        sourceSnapshotId: snapshot.id,
      })
      .returning();

    const updates = {
      ...portableToCharacterUpdate(snapshot.data),
      updatedAt: new Date(),
    };

    const [updatedCharacter] = await db
      .update(characters)
      .set(updates)
      .where(and(eq(characters.id, id), eq(characters.userId, user.userId)))
      .returning();

    return NextResponse.json({
      character: updatedCharacter,
      restoredFrom: snapshot.id,
      guardSnapshot,
    });
  } catch (error) {
    console.error("[snapshots] RESTORE error:", error);
    return NextResponse.json({ error: "Failed to restore snapshot" }, { status: 500 });
  }
}
