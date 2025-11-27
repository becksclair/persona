import { db } from "./db";
import { users, sessions, userSettings } from "./db/schema";
import { eq, gt, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { hashPassword, verifyPassword } from "./auth/password";

// Re-export password utilities
export { hashPassword, verifyPassword } from "./auth/password";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const SESSION_COOKIE_NAME = "persona_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─────────────────────────────────────────────────────────────
// Session Management
// ─────────────────────────────────────────────────────────────
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bufferToHex(bytes.buffer as ArrayBuffer);
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

export async function validateSession(token: string): Promise<{
  userId: string;
  email: string;
} | null> {
  const result = await db
    .select({
      userId: sessions.userId,
      email: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return result[0] ?? null;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

// ─────────────────────────────────────────────────────────────
// Cookie Helpers
// ─────────────────────────────────────────────────────────────
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// ─────────────────────────────────────────────────────────────
// Auth Helpers
// ─────────────────────────────────────────────────────────────
export async function getCurrentUser(): Promise<{
  userId: string;
  email: string;
} | null> {
  const token = await getSessionCookie();
  if (!token) return null;
  return validateSession(token);
}

export async function requireAuth(): Promise<{ userId: string; email: string }> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

// ─────────────────────────────────────────────────────────────
// User Operations
// ─────────────────────────────────────────────────────────────
export async function createUser(
  email: string,
  password: string,
): Promise<{ id: string; email: string }> {
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase().trim(),
      passwordHash,
    })
    .returning({ id: users.id, email: users.email });

  // Create default user settings
  await db.insert(userSettings).values({
    userId: user.id,
    enterSendsMessage: true,
    theme: "system",
  });

  return user;
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<{ id: string; email: string } | null> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email };
}

export async function getUserById(userId: string): Promise<{
  id: string;
  email: string;
} | null> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function getUserSettings(userId: string) {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return settings ?? null;
}

export async function updateUserSettings(
  userId: string,
  updates: Partial<{ enterSendsMessage: boolean; theme: string }>,
) {
  await db
    .update(userSettings)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(userSettings.userId, userId));
}
