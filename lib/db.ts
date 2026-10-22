import { MongoClient, type ObjectId } from "mongodb";
import type { User } from "./users";

export type TaskStatus = "pending" | "complete";

// Every task is one step in a chain. The first step's _id is the chainId.
// Tasks created before chains existed have no chainId/parentId/step;
// they're treated as step 1 of their own chain.
export type Task = {
  _id: ObjectId;
  chainId?: ObjectId; // _id of the first step in this chain
  parentId?: ObjectId | null; // the step this one follows (null for the first step)
  step?: number; // 1, 2, 3, …
  text: string;
  status: TaskStatus;
  note?: string | null; // "how it was done", written when completing
  createdBy: User;
  createdAt: Date;
  completedBy?: User | null;
  completedAt?: Date | null;
  updatedAt?: Date;
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

export function tasksCollection() {
  return getClient()
    .db(process.env.MONGODB_DB ?? "todo")
    .collection<Task>("tasks");
}
