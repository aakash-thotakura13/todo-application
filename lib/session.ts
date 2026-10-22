import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isUser, type User } from "./users";

export const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function sign(payload: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set in .env");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function checkPin(user: User, pin: string) {
  const expected = process.env[user];
  if (!expected) return false;
  return safeEqual(pin, expected);
}

export async function createSession(user: User) {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${user}.${expires}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return null;

  const [user, expires, signature] = value.split(".");
  if (!user || !expires || !signature) return null;
  if (!safeEqual(signature, sign(`${user}.${expires}`))) return null;

  // Tell Next.js this check runs per request, so reading the clock is allowed.
  await connection();
  if (Number(expires) < Date.now()) return null;

  return isUser(user) ? user : null;
}

// Use in pages and server actions: returns the user or sends them to /login.
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}