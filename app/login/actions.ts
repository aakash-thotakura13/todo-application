"use server";

import { redirect } from "next/navigation";
import { checkPin, createSession } from "@/lib/session";
import { isUser } from "@/lib/users";

export type LoginState = { error?: string; user?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const user = formData.get("user");
  const pin = String(formData.get("pin") ?? "");

  if (!isUser(user)) return { error: "Choose who you are." };
  if (!/^\d{4}$/.test(pin)) return { error: "PIN must be 4 digits.", user };

  if (!checkPin(user, pin)) {
    // Slow down guessing a little.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { error: "Wrong PIN.", user };
  }

  await createSession(user);
  redirect("/");
}
