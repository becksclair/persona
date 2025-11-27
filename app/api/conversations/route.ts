import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conversations, messages, characters } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

// GET /api/conversations - List conversations for current user
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const includeArchived = url.searchParams.get("archived") === "true";
  const characterId = url.searchParams.get("characterId");

  try {
    const whereConditions = [eq(conversations.userId, user.userId)];

    if (!includeArchived) {
      whereConditions.push(eq(conversations.isArchived, false));
    }

    if (characterId) {
      whereConditions.push(eq(conversations.characterId, characterId));
    }

    const result = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        characterId: conversations.characterId,
        characterName: characters.name,
        characterAvatar: characters.avatar,
        isArchived: conversations.isArchived,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .leftJoin(characters, eq(conversations.characterId, characters.id))
      .where(and(...whereConditions))
      .orderBy(desc(conversations.updatedAt));

    // Get last message preview for each conversation
    const conversationsWithPreview = await Promise.all(
      result.map(async (conv) => {
        const [lastMessage] = await db
          .select({ content: messages.content, role: messages.role })
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        return {
          ...conv,
          lastMessage: lastMessage?.content?.slice(0, 100) ?? null,
          lastMessageRole: lastMessage?.role ?? null,
        };
      })
    );

    return NextResponse.json(conversationsWithPreview);
  } catch (error) {
    console.error("[conversations] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { characterId, title } = body;

    const [conversation] = await db
      .insert(conversations)
      .values({
        userId: user.userId,
        characterId: characterId ?? null,
        title: title ?? null,
      })
      .returning();

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("[conversations] POST error:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
