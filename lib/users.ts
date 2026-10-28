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

export function otherUser(user: User): User {
  return user === "ish" ? "ishah" : "ish";
}

/* ---------- Who a repeating task is for ---------- */

/**
 * each   – both people do it; each has their own tick and record (e.g. Exercise)
 * either – done once by anyone counts (e.g. Water the plants)
 * ish / ishah – only that person does it
 */
export type Assignee = "each" | "either" | User;
export const ASSIGNEES: Assignee[] = ["each", "either", ...USERS];

export function isAssignee(value: unknown): value is Assignee {
  return value === "each" || value === "either" || isUser(value);
}

export function assigneeLabel(assignee: Assignee) {
  if (assignee === "each") return "Each of us";
  if (assignee === "either") return "Either of us";
  return `Only ${DISPLAY_NAMES[assignee]}`;
}

/** People with their own record for this task, or null when it's shared ("either"). */
export function participants(assignee: Assignee): User[] | null {
  if (assignee === "either") return null;
  if (assignee === "each") return [...USERS];
  return [assignee];
}

/** Whether `user` should see and tick this task. */
export function isFor(assignee: Assignee, user: User) {
  return assignee === "each" || assignee === "either" || assignee === user;
}
