import { authenticateUser, createSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);

    return Response.json({ id: user.id, email: user.email });
  } catch (error) {
    console.error("[auth/login]", error);
    return Response.json({ error: "Failed to sign in" }, { status: 500 });
  }
}
