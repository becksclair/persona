import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { characters, personaSnapshots } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { characterToSnapshotData, isSnapshotKind } from "@/lib/snapshots";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function buildDefaultLabel(name: string) {
  const date = new Date();
  const stamp = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${name || "Character"} – ${stamp}`;
}

// GET /api/characters/[id]/snapshots
export async function GET(_req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const results = await db
      .select()
      .from(personaSnapshots)
      .where(and(eq(personaSnapshots.userId, user.userId), eq(personaSnapshots.characterId, id)))
      .orderBy(desc(personaSnapshots.createdAt));

    return NextResponse.json(results);
  } catch (error) {
    console.error("[snapshots] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch snapshots" }, { status: 500 });
  }
}

// POST /api/characters/[id]/snapshots
export async function POST(req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const body = await req.json();
    const rawLabel = (body.label as string | undefined)?.trim() ?? "";
    const notes = (body.notes as string | undefined)?.trim() || null;
    const kind = isSnapshotKind(body.kind) ? body.kind : "manual";

    const [character] = await db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, user.userId)))
      .limit(1);

    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const label = rawLabel || buildDefaultLabel(character.name ?? "Character");
    const data = characterToSnapshotData(character);

    const [snapshot] = await db
      .insert(personaSnapshots)
      .values({
        userId: user.userId,
        characterId: id,
        label,
        notes,
        kind,
        data,
        characterUpdatedAt: character.updatedAt,
      })
      .returning();

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error("[snapshots] POST error:", error);
    return NextResponse.json({ error: "Failed to create snapshot" }, { status: 500 });
  }
}
