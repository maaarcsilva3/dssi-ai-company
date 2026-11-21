import type { User, Matter } from "../db/schema";

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "departmentId">;

export function isLegalRole(role: string): boolean {
  return ["legal", "assigner", "manager", "admin"].includes(role);
}

export function canReadMatter(user: SessionUser, matter: Matter): boolean {
  if (user.role === "manager" || user.role === "admin") return true;
  if (user.role === "legal" || user.role === "assigner") return true;
  if (user.role === "requester") {
    return matter.departmentId === user.departmentId;
  }
  return false;
}

export function canWriteMatter(user: SessionUser): boolean {
  return ["legal", "assigner", "admin"].includes(user.role);
}

export function canAssign(user: SessionUser): boolean {
  return ["legal", "assigner", "admin"].includes(user.role);
}