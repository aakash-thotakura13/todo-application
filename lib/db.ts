import { MongoClient, type ObjectId } from "mongodb";
import type { Place } from "./place";
import type { User } from "./users";

export type TaskStatus = "pending" | "complete";
export type TaskKind = "once" | "repeating";
export type Priority = "low" | "medium" | "high";

export const PRIORITIES: Priority[] = ["high", "medium", "low"];

// A task is either:
//  - "once": a dated task. Each one is a step in a chain; the first step's
//    _id is the chainId. Every step has its own date.
//  - "repeating": shows up every day (or on chosen weekdays). Its daily
//    ticks are stored in the separate `completions` collection.
// Older tasks may lack kind/priority/dueDate; they're treated as
// one-time, medium priority, dated on the day they were created.
export type Task = {
  _id: ObjectId;
  kind?: TaskKind;
  priority?: Priority;
  dueDate?: string; // once: "YYYY-MM-DD" (IST)
  days?: number[]; // repeating: 0 = Sun … 6 = Sat
  place?: Place | null; // where the task is done (optional)

  chainId?: ObjectId; // once: _id of the first step in this chain
  parentId?: ObjectId | null; // once: the step this one follows
  step?: number; // once: 1, 2, 3, …

  text: string;
  status: TaskStatus; // once only; repeating tasks use completions
  note?: string | null; // "how it was done", written when completing
  createdBy: User;
  createdAt: Date;
  completedBy?: User | null;
  completedAt?: Date | null;
  updatedAt?: Date;
};

/** One tick of a repeating task on one day. */
export type Completion = {
  _id: ObjectId;
  taskId: ObjectId;
  date: string; // "YYYY-MM-DD" (IST)
  completedBy: User;
  completedAt: Date;
  note?: string | null;
};

// Reuse one client across hot reloads in dev and across requests in prod.
declare global {
  var _mongoClient: MongoClient | undefined;
}

function getClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in .env");
  if (!globalThis._mongoClient) {
    globalThis._mongoClient = new MongoClient(uri);
  }
  return globalThis._mongoClient;
}

function db() {
  return getClient().db(process.env.MONGODB_DB ?? "todo");
}

export function tasksCollection() {
  return db().collection<Task>("tasks");
}

export function completionsCollection() {
  return db().collection<Completion>("completions");
}
