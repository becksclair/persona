import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Errors } from "@/lib/api-errors";
import { validateRequest, createMessageSchema } from "@/lib/validations";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id]/messages - Get messages for a conversation
export async function GET(_req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
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
      return Errors.conversationNotFound();
    }

    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));

    return Response.json(result);
  } catch (error) {
    console.error("[conversations/id/messages] GET error:", error);
    return Errors.internal("Failed to fetch messages");
  }
}

// POST /api/conversations/[id]/messages - Add a message to conversation
export async function POST(req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Errors.invalidJson();
  }

  const validation = validateRequest(createMessageSchema, body);
  if (!validation.success) {
    return Errors.invalidRequest(validation.error);
  }

  const { role, content, meta } = validation.data;

  try {
    // Verify ownership
    const [conversation] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.userId)))
      .limit(1);

    if (!conversation) {
      return Errors.conversationNotFound();
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
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, id));

    return Response.json(message, { status: 201 });
  } catch (error) {
    console.error("[conversations/id/messages] POST error:", error);
    return Errors.internal("Failed to create message");
  }
}
