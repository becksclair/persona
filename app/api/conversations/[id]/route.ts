import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Errors } from "@/lib/api-errors";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id] - Get a single conversation with messages
export async function GET(_req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
  }

  const { id } = await context.params;

  try {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.userId)))
      .limit(1);

    if (!conversation) {
      return Errors.conversationNotFound();
    }

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json({
      ...conversation,
      messages: conversationMessages,
    });
  } catch (error) {
    console.error("[conversations/id] GET error:", error);
    return Errors.internal("Failed to fetch conversation");
  }
}

// PATCH /api/conversations/[id] - Update conversation (rename, archive)
export async function PATCH(req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
  }

  const { id } = await context.params;

  try {
    const body = await req.json();
    const { title, isArchived, characterId, modelIdOverride, temperatureOverride, ragOverrides } =
      body;

    // Verify ownership
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.userId)))
      .limit(1);

    if (!existing) {
      return Errors.conversationNotFound();
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (isArchived !== undefined) updates.isArchived = isArchived;
    if (characterId !== undefined) updates.characterId = characterId;
    if (modelIdOverride !== undefined) updates.modelIdOverride = modelIdOverride;
    if (temperatureOverride !== undefined) updates.temperatureOverride = temperatureOverride;
    if (ragOverrides !== undefined) updates.ragOverrides = ragOverrides;

    const [updated] = await db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[conversations/id] PATCH error:", error);
    return Errors.internal("Failed to update conversation");
  }
}

// DELETE /api/conversations/[id] - Hard delete conversation and messages
export async function DELETE(_req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
  }

  const { id } = await context.params;

  try {
    // Verify ownership
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.userId)))
      .limit(1);

    if (!existing) {
      return Errors.conversationNotFound();
    }

    // Messages are cascade deleted via FK constraint
    await db.delete(conversations).where(eq(conversations.id, id));

    // TODO: Delete associated embeddings from memory_items when RAG is implemented

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[conversations/id] DELETE error:", error);
    return Errors.internal("Failed to delete conversation");
  }
}
