import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Errors } from "@/lib/api-errors";
import { validateRequest, createConversationSchema } from "@/lib/validations";
import { LIMITS } from "@/lib/constants";
import type { ConversationWithPreview } from "@/lib/api-types";

/**
 * GET /api/conversations - List conversations for current user
 * Uses a single query with lateral join to fetch last message (fixes N+1 problem)
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
  }

  const url = new URL(req.url);
  const includeArchived = url.searchParams.get("archived") === "true";
  const characterId = url.searchParams.get("characterId");

  try {
    // Build WHERE conditions
    const archivedCondition = includeArchived ? sql`true` : sql`c.is_archived = false`;
    const characterCondition = characterId ? sql`AND c.character_id = ${characterId}::uuid` : sql``;

    // Single query with lateral join for last message (O(1) instead of O(n) queries)
    const result = await db.execute<{
      id: string;
      title: string | null;
      character_id: string | null;
      character_name: string | null;
      character_avatar: string | null;
      is_archived: boolean;
      rag_overrides: Record<string, unknown> | null;
      created_at: Date;
      updated_at: Date;
      last_message: string | null;
      last_message_role: string | null;
    }>(sql`
      SELECT
        c.id,
        c.title,
        c.character_id,
        ch.name as character_name,
        ch.avatar as character_avatar,
        c.is_archived,
        c.rag_overrides,
        c.created_at,
        c.updated_at,
        lm.content as last_message,
        lm.role as last_message_role
      FROM conversations c
      LEFT JOIN characters ch ON c.character_id = ch.id
      LEFT JOIN LATERAL (
        SELECT content, role
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON true
      WHERE c.user_id = ${user.userId}::uuid
        AND ${archivedCondition}
        ${characterCondition}
      ORDER BY c.updated_at DESC
    `);

    // Map to API response type
    const conversationsWithPreview: ConversationWithPreview[] = (
      result as unknown as Array<{
        id: string;
        title: string | null;
        character_id: string | null;
        character_name: string | null;
        character_avatar: string | null;
        is_archived: boolean;
        rag_overrides: Record<string, unknown> | null;
        created_at: Date;
        updated_at: Date;
        last_message: string | null;
        last_message_role: string | null;
      }>
    ).map((row) => ({
      id: row.id,
      title: row.title,
      characterId: row.character_id,
      characterName: row.character_name,
      characterAvatar: row.character_avatar,
      isArchived: row.is_archived,
      ragOverrides: row.rag_overrides as ConversationWithPreview["ragOverrides"],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessage: row.last_message?.slice(0, LIMITS.messagePreview) ?? null,
      lastMessageRole: row.last_message_role as "user" | "assistant" | null,
    }));

    return Response.json(conversationsWithPreview);
  } catch (error) {
    console.error("[conversations] GET error:", error);
    return Errors.internal("Failed to fetch conversations");
  }
}

/**
 * POST /api/conversations - Create a new conversation
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Errors.invalidJson();
  }

  const validation = validateRequest(createConversationSchema, body);
  if (!validation.success) {
    return Errors.invalidRequest(validation.error);
  }

  const { characterId, title, ragOverrides } = validation.data;

  try {
    const [conversation] = await db
      .insert(conversations)
      .values({
        userId: user.userId,
        characterId: characterId ?? null,
        title: title ?? null,
        ragOverrides: ragOverrides ?? null,
      })
      .returning();

    return Response.json(conversation, { status: 201 });
  } catch (error) {
    console.error("[conversations] POST error:", error);
    return Errors.internal("Failed to create conversation");
  }
}
