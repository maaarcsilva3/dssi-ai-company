import { redirect } from "next/navigation";
import { getSessionUser } from "./session";
import type { SessionUser } from "../matters/acl";

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRoles(roles: string[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/403");
  return user;
}