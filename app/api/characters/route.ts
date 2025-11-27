import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

// GET /api/characters - List characters for current user
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const includeArchived = url.searchParams.get("archived") === "true";
  const search = url.searchParams.get("search")?.toLowerCase();

  try {
    const query = db
      .select()
      .from(characters)
      .where(
        and(
          // Show user's characters or built-in characters
          or(eq(characters.userId, user.userId), eq(characters.isBuiltIn, true)),
          includeArchived ? undefined : eq(characters.isArchived, false)
        )
      )
      .$dynamic();

    const result = await query;

    // Filter by search client-side for simplicity (for MVP)
    let filtered = result;
    if (search) {
      filtered = result.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.tagline?.toLowerCase().includes(search) ||
          c.description?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("[characters] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch characters" }, { status: 500 });
  }
}

// POST /api/characters - Create a new character
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name,
      avatar,
      tagline,
      systemRole,
      description,
      personality,
      background,
      lifeHistory,
      currentContext,
      toneStyle,
      boundaries,
      roleRules,
      customInstructionsLocal,
      tags,
      archetype,
      defaultModelId,
      defaultTemperature,
      maxContextWindow,
      evolveEnabled,
      nsfwEnabled,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const [character] = await db
      .insert(characters)
      .values({
        userId: user.userId,
        name,
        avatar,
        tagline,
        systemRole,
        description,
        personality,
        background,
        lifeHistory,
        currentContext,
        toneStyle,
        boundaries,
        roleRules,
        customInstructionsLocal,
        tags,
        archetype,
        defaultModelId,
        defaultTemperature,
        maxContextWindow,
        evolveEnabled: evolveEnabled ?? false,
        nsfwEnabled: nsfwEnabled ?? false,
        isBuiltIn: false,
      })
      .returning();

    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    console.error("[characters] POST error:", error);
    return NextResponse.json({ error: "Failed to create character" }, { status: 500 });
  }
}
