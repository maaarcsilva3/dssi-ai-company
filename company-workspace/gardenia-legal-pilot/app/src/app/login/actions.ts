"use server";

import { redirect } from "next/navigation";
import { setSessionUser } from "@/lib/auth/session";

export async function loginAction(formData: FormData) {
  const userId = formData.get("userId") as string;
  if (!userId) throw new Error("Missing user");
  await setSessionUser(userId);
  redirect("/");
}