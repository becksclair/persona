import { getCurrentUser, getUserSettings } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const settings = await getUserSettings(user.userId);

    return Response.json({
      id: user.userId,
      email: user.email,
      settings: settings
        ? {
            enterSendsMessage: settings.enterSendsMessage,
            theme: settings.theme,
          }
        : null,
    });
  } catch (error) {
    console.error("[auth/me]", error);
    return Response.json(
      { error: "Failed to get user" },
      { status: 500 },
    );
  }
}
