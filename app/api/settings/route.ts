import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, getUserSettings, updateUserSettings } from "@/lib/auth";

// Zod schema for settings validation
const ThemeSchema = z.enum(["light", "dark", "system"]);

const SettingsUpdateSchema = z
  .object({
    enterSendsMessage: z.boolean().optional(),
    theme: ThemeSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// GET /api/settings - Get current user settings
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getUserSettings(user.userId);
    return NextResponse.json(settings ?? { enterSendsMessage: true, theme: "system" });
  } catch (error) {
    console.error("[settings] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PATCH /api/settings - Update user settings
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Validate with Zod
    const result = SettingsUpdateSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: `Invalid settings: ${errorMessage}` }, { status: 400 });
    }

    const updates = result.data;
    await updateUserSettings(user.userId, updates);

    const settings = await getUserSettings(user.userId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[settings] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
