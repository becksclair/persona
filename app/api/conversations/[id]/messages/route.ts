import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq, and, asc, desc, lt, gt } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Errors, getOrCreateRequestId } from "@/lib/api-errors";
import { validateRequest, createMessageSchema } from "@/lib/validations";
import type { CursorPaginatedResponse, Message } from "@/lib/api-types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Parse cursor string into timestamp.
 * Cursor format: ISO timestamp
 */
function parseCursor(cursor: string | null): Date | null {
  if (!cursor) return null;
  try {
    const date = new Date(cursor);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * GET /api/conversations/[id]/messages - Get messages with cursor-based pagination
 *
 * Query params:
 * - cursor: ISO timestamp to fetch messages after (for forward pagination)
 * - before: ISO timestamp to fetch messages before (for backward pagination / initial load)
 * - limit: Number of messages to fetch (default 50, max 100)
 * - direction: 'asc' (oldest first) or 'desc' (newest first, default for initial load)
 */
export async function GET(req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const requestId = getOrCreateRequestId(req);

  if (!user) {
    return Errors.unauthorized({ requestId });
  }

  const { id } = await context.params;
  const url = new URL(req.url);
  const afterCursor = parseCursor(url.searchParams.get("cursor"));
  const beforeCursor = parseCursor(url.searchParams.get("before"));
  const requestedLimit = parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);

  try {
    // Verify ownership
    const [conversation] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.userId)))
      .limit(1);

    if (!conversation) {
      return Errors.conversationNotFound({ requestId });
    }

    // Build and execute query based on cursor direction
    let result;

    if (afterCursor) {
      // Forward pagination: get messages after cursor (newer messages)
      result = await db
        .select()
        .from(messages)
        .where(and(eq(messages.conversationId, id), gt(messages.createdAt, afterCursor)))
        .orderBy(asc(messages.createdAt))
        .limit(limit + 1); // +1 to check hasMore
    } else if (beforeCursor) {
      // Backward pagination: get messages before cursor (older messages)
      result = await db
        .select()
        .from(messages)
        .where(and(eq(messages.conversationId, id), lt(messages.createdAt, beforeCursor)))
        .orderBy(desc(messages.createdAt))
        .limit(limit + 1); // +1 to check hasMore
    } else {
      // Initial load: get most recent messages
      result = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(desc(messages.createdAt))
        .limit(limit + 1);
    }

    // Check if there are more messages
    const hasMore = result.length > limit;
    const data = hasMore ? result.slice(0, limit) : result;

    // For backward/initial loads, reverse to get chronological order
    if (!afterCursor) {
      data.reverse();
    }

    // Build cursors
    const firstMessage = data[0];
    const lastMessage = data[data.length - 1];

    const response: CursorPaginatedResponse<Message> = {
      data,
      pagination: {
        nextCursor: lastMessage?.createdAt?.toISOString() ?? null,
        prevCursor: firstMessage?.createdAt?.toISOString() ?? null,
        hasMore,
        limit,
      },
    };

    return Response.json(response, {
      headers: { "x-request-id": requestId },
    });
  } catch (error) {
    console.error("[conversations/id/messages] GET error:", error);
    return Errors.internal("Failed to fetch messages", { requestId });
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
