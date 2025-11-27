import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/characters/[id]/duplicate - Duplicate a character
export async function POST(_req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    // Get the source character
    const [source] = await db
      .select()
      .from(characters)
      .where(
        and(
          eq(characters.id, id),
          or(eq(characters.userId, user.userId), eq(characters.isBuiltIn, true))
        )
      )
      .limit(1);

    if (!source) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // Create a copy with a new name
    const [duplicate] = await db
      .insert(characters)
      .values({
        userId: user.userId,
        name: `${source.name} (Copy)`,
        avatar: source.avatar,
        tagline: source.tagline,
        systemRole: source.systemRole,
        description: source.description,
        personality: source.personality,
        background: source.background,
        lifeHistory: source.lifeHistory,
        currentContext: source.currentContext,
        toneStyle: source.toneStyle,
        boundaries: source.boundaries,
        roleRules: source.roleRules,
        customInstructionsLocal: source.customInstructionsLocal,
        defaultModelId: source.defaultModelId,
        defaultTemperature: source.defaultTemperature,
        maxContextWindow: source.maxContextWindow,
        evolveEnabled: source.evolveEnabled,
        nsfwEnabled: source.nsfwEnabled,
        isBuiltIn: false,
        isArchived: false,
      })
      .returning();

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    console.error("[characters/id/duplicate] POST error:", error);
    return NextResponse.json({ error: "Failed to duplicate character" }, { status: 500 });
  }
}
