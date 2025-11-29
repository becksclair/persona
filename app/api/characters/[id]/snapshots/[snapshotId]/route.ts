import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { personaSnapshots } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string; snapshotId: string }>;
}

// DELETE /api/characters/[id]/snapshots/[snapshotId]
export async function DELETE(_req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, snapshotId } = await context.params;

  try {
    const result = await db
      .delete(personaSnapshots)
      .where(
        and(
          eq(personaSnapshots.id, snapshotId),
          eq(personaSnapshots.characterId, id),
          eq(personaSnapshots.userId, user.userId),
        ),
      )
      .returning({ id: personaSnapshots.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: snapshotId });
  } catch (error) {
    console.error("[snapshots] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete snapshot" }, { status: 500 });
  }
}
