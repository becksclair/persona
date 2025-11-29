import { createUser, createSession, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check if user already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing) {
      return Response.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const user = await createUser(email, password);
    const token = await createSession(user.id);
    await setSessionCookie(token);

    return Response.json({ id: user.id, email: user.email });
  } catch (error) {
    console.error("[auth/register]", error);
    return Response.json({ error: "Failed to create account" }, { status: 500 });
  }
}
