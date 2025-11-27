import { getSessionCookie, deleteSession, clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    const token = await getSessionCookie();

    if (token) {
      await deleteSession(token);
    }

    await clearSessionCookie();

    return Response.json({ success: true });
  } catch (error) {
    console.error("[auth/logout]", error);
    // Clear cookie even if session deletion fails
    await clearSessionCookie();
    return Response.json({ success: true });
  }
}
