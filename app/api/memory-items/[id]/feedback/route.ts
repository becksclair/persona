import { db } from "@/lib/db";
import { memoryItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Errors } from "@/lib/api-errors";
import { validateRequest, memoryFeedbackSchema } from "@/lib/validations";
import { INTERNAL_TAGS, VISIBILITY_POLICY } from "@/lib/constants";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/memory-items/[id]/feedback
 * Apply feedback to a memory item (exclude, lower priority, or restore).
 */
export async function POST(req: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
  }

  const { id } = await context.params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(id)) {
    return Errors.invalidRequest("Invalid memory item ID");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Errors.invalidJson();
  }

  const validation = validateRequest(memoryFeedbackSchema, body);
  if (!validation.success) {
    return Errors.invalidRequest(validation.error);
  }

  const { action } = validation.data;

  try {
    // Fetch the memory item to verify access and get current state
    const [item] = await db.select().from(memoryItems).where(eq(memoryItems.id, id)).limit(1);

    if (!item) {
      return Errors.notFound("Memory item");
    }

    // Verify ownership: user-owned items require matching userId
    if (item.ownerType === "user" && item.ownerId !== user.userId) {
      return Errors.forbidden();
    }

    // Apply feedback action
    if (action === "exclude") {
      await db
        .update(memoryItems)
        .set({ visibilityPolicy: VISIBILITY_POLICY.excludeFromRag })
        .where(eq(memoryItems.id, id));
    } else if (action === "lower_priority") {
      // Add __low_priority tag for weighted retrieval penalty
      const currentTags: string[] = (item.tags as string[]) ?? [];
      if (!currentTags.includes(INTERNAL_TAGS.lowPriority)) {
        await db
          .update(memoryItems)
          .set({ tags: [...currentTags, INTERNAL_TAGS.lowPriority] })
          .where(eq(memoryItems.id, id));
      }
    } else if (action === "restore") {
      // Restore to normal visibility and remove priority tag
      const currentTags = ((item.tags as string[]) ?? []).filter(
        (t) => t !== INTERNAL_TAGS.lowPriority,
      );
      await db
        .update(memoryItems)
        .set({
          visibilityPolicy: VISIBILITY_POLICY.normal,
          tags: currentTags.length > 0 ? currentTags : null,
        })
        .where(eq(memoryItems.id, id));
    }

    return Response.json({ success: true, action });
  } catch (error) {
    console.error("[memory-items/feedback] POST error:", error);
    return Errors.internal("Failed to apply feedback");
  }
}
