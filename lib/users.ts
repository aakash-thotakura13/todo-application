// Safe to import from both server and client code.
// Each user's PIN lives in .env under the same name ("ish", "ishah").
export const USERS = ["ish", "ishah"] as const;
export type User = (typeof USERS)[number];

export const DISPLAY_NAMES: Record<User, string> = {
  ish: "Ish",
  ishah: "Ishah",
};

export function isUser(value: unknown): value is User {
  return typeof value === "string" && (USERS as readonly string[]).includes(value);
}
