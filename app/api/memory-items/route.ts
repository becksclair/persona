import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Errors } from "@/lib/api-errors";
import { LIMITS } from "@/lib/constants";

/**
 * GET /api/memory-items?ids=id1,id2,id3
 * Fetch memory item details for the Memory Inspector panel.
 * Returns content, source info, tags, and visibility status.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Errors.unauthorized();
  }

  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids");

  if (!idsParam) {
    return Errors.invalidRequest("ids parameter required");
  }

  // Parse and validate UUIDs, cap at limit
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter((id) => uuidRegex.test(id))
    .slice(0, LIMITS.maxMemoryItemsPerRequest);

  if (ids.length === 0) {
    return Response.json([]);
  }

  try {
    // Query memory items with source file names via LEFT JOIN
    const results = await db.execute<{
      id: string;
      content: string;
      source_type: string;
      source_id: string | null;
      tags: string[] | null;
      visibility_policy: string;
      created_at: Date;
      source_file_name: string | null;
    }>(sql`
      SELECT
        mi.id,
        mi.content,
        mi.source_type,
        mi.source_id,
        mi.tags,
        mi.visibility_policy,
        mi.created_at,
        kbf.file_name as source_file_name
      FROM memory_items mi
      LEFT JOIN knowledge_base_files kbf
        ON mi.source_id = kbf.id AND mi.source_type = 'file'
      WHERE mi.id = ANY(${ids}::uuid[])
        AND (
          (mi.owner_type = 'user' AND mi.owner_id = ${user.userId}::uuid)
          OR mi.owner_type = 'character'
        )
    `);

    return Response.json(results);
  } catch (error) {
    console.error("[memory-items] GET error:", error);
    return Errors.internal("Failed to fetch memory items");
  }
}
