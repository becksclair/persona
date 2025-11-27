import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characterTemplates, characters } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

// GET /api/templates - List templates for current user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await db
      .select()
      .from(characterTemplates)
      .where(eq(characterTemplates.userId, user.userId));

    return NextResponse.json(result);
  } catch (error) {
    console.error("[templates] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// POST /api/templates - Create a new template (or from character)
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { fromCharacterId, ...templateData } = body;

    // If creating from a character, fetch character data
    if (fromCharacterId) {
      const [character] = await db
        .select()
        .from(characters)
        .where(and(eq(characters.id, fromCharacterId), eq(characters.userId, user.userId)));

      if (!character) {
        return NextResponse.json({ error: "Character not found" }, { status: 404 });
      }

      const [template] = await db
        .insert(characterTemplates)
        .values({
          userId: user.userId,
          name: templateData.name || `${character.name} Template`,
          icon: templateData.icon || "📝",
          description: character.description,
          tagline: character.tagline,
          personality: character.personality,
          toneStyle: character.toneStyle,
          boundaries: character.boundaries,
          roleRules: character.roleRules,
          background: character.background,
          lifeHistory: character.lifeHistory,
          currentContext: character.currentContext,
          customInstructionsLocal: character.customInstructionsLocal,
          tags: character.tags,
          defaultModelId: character.defaultModelId,
          defaultTemperature: character.defaultTemperature,
          nsfwEnabled: character.nsfwEnabled,
          evolveEnabled: character.evolveEnabled,
        })
        .returning();

      return NextResponse.json(template, { status: 201 });
    }

    // Create template directly
    const { name, icon, ...data } = templateData;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const [template] = await db
      .insert(characterTemplates)
      .values({
        userId: user.userId,
        name,
        icon: icon || "📝",
        ...data,
      })
      .returning();

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("[templates] POST error:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
