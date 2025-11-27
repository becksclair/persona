import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id]/messages - Get messages for a conversation
export async function GET(_req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    // Verify ownership
    const [conversation] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.userId)))
      .limit(1);

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json(result);
  } catch (error) {
    console.error("[conversations/id/messages] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST /api/conversations/[id]/messages - Add a message to conversation
export async function POST(req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await req.json();
    const { role, content, meta } = body;

    if (!role || !content) {
      return NextResponse.json({ error: "role and content required" }, { status: 400 });
    }

    // Verify ownership
    const [conversation] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.userId)))
      .limit(1);

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const [message] = await db
      .insert(messages)
      .values({
        conversationId: id,
        role,
        content,
        meta: meta ?? null,
      })
      .returning();

    // Update conversation timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, id));

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("[conversations/id/messages] POST error:", error);
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
}
