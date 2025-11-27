import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/characters/[id] - Get a single character
export async function GET(_req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const [character] = await db
      .select()
      .from(characters)
      .where(
        and(
          eq(characters.id, id),
          or(eq(characters.userId, user.userId), eq(characters.isBuiltIn, true))
        )
      )
      .limit(1);

    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    return NextResponse.json(character);
  } catch (error) {
    console.error("[characters/id] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch character" }, { status: 500 });
  }
}

// PATCH /api/characters/[id] - Update character
export async function PATCH(req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    // Verify ownership (can't edit built-in characters)
    const [existing] = await db
      .select({ id: characters.id, isBuiltIn: characters.isBuiltIn })
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, user.userId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Character not found or not editable" }, { status: 404 });
    }

    const body = await req.json();
    const allowedFields = [
      "name",
      "avatar",
      "tagline",
      "systemRole",
      "description",
      "personality",
      "background",
      "lifeHistory",
      "currentContext",
      "toneStyle",
      "boundaries",
      "roleRules",
      "customInstructionsLocal",
      "defaultModelId",
      "defaultTemperature",
      "maxContextWindow",
      "evolveEnabled",
      "nsfwEnabled",
      "isArchived",
    ];

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const [updated] = await db
      .update(characters)
      .set(updates)
      .where(eq(characters.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[characters/id] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update character" }, { status: 500 });
  }
}

// DELETE /api/characters/[id] - Delete character
export async function DELETE(_req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    // Verify ownership (can't delete built-in characters)
    const [existing] = await db
      .select({ id: characters.id, isBuiltIn: characters.isBuiltIn })
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, user.userId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    if (existing.isBuiltIn) {
      return NextResponse.json({ error: "Cannot delete built-in characters" }, { status: 403 });
    }

    await db.delete(characters).where(eq(characters.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[characters/id] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete character" }, { status: 500 });
  }
}
