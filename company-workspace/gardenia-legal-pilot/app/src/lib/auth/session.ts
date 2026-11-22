import { cookies } from "next/headers";
import { getDb } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import type { SessionUser } from "../matters/acl";

const COOKIE_NAME = "gbpi_session_user_id";

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(COOKIE_NAME)?.value;
  if (!userId) return null;
  const user = getDb().select().from(users).where(eq(users.id, userId)).get();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId,
  };
}

export async function setSessionUser(userId: string) {
  const cookieStore = await cookies();
  const cookiePath =
    process.env.COOKIE_PATH ||
    process.env.NEXT_PUBLIC_BASE_PATH ||
    "/dev/gardenia-legal-pilot";
  cookieStore.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: cookiePath,
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const cookiePath =
    process.env.COOKIE_PATH ||
    process.env.NEXT_PUBLIC_BASE_PATH ||
    "/dev/gardenia-legal-pilot";
  cookieStore.delete({ name: COOKIE_NAME, path: cookiePath });
}

export { COOKIE_NAME };