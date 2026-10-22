"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { tasksCollection, type Task } from "@/lib/db";
import { deleteSession, requireUser } from "@/lib/session";

const MAX_TEXT = 500;
const MAX_NOTE = 5000;

function readText(value: FormDataEntryValue | null, max: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.slice(0, max);
}

function chainIdOf(task: Task) {
  return task.chainId ?? task._id;
}

async function findTask(id: string) {
  if (!ObjectId.isValid(id)) return null;
  return tasksCollection().findOne({ _id: new ObjectId(id) });
}

// Only the newest step in a chain can be reopened, removed, or followed.
async function isLatestStep(task: Task) {
  const next = await tasksCollection().findOne(
    { parentId: task._id },
    { projection: { _id: 1 } },
  );
  return next === null;
}

/** Start a brand-new chain. */
export async function createTask(formData: FormData) {
  const user = await requireUser();
  const text = readText(formData.get("text"), MAX_TEXT);
  if (!text) return;

  const _id = new ObjectId();
  const now = new Date();
  await tasksCollection().insertOne({
    _id,
    chainId: _id,
    parentId: null,
    step: 1,
    text,
    status: "pending",
    createdBy: user,
    createdAt: now,
    updatedAt: now,
  });
  revalidatePath("/");
  // Redirect after saving, so refreshing the page can never re-submit the form.
  redirect("/");
}

/** Mark a step complete, with an optional note on how it was done. */
export async function completeStep(id: string, formData: FormData) {
  const user = await requireUser();
  const task = await findTask(id);
  if (!task || task.status === "complete") return;

  const note = readText(formData.get("note"), MAX_NOTE);
  const now = new Date();
  await tasksCollection().updateOne(
    { _id: task._id },
    {
      $set: {
        status: "complete",
        note: note || null,
        completedBy: user,
        completedAt: now,
        updatedAt: now,
      },
    },
  );
  revalidatePath("/");
}

/** Complete a step and turn the typed entry into the next step of the same chain. */
export async function completeAndAddNext(id: string, formData: FormData) {
  const user = await requireUser();
  const text = readText(formData.get("note"), MAX_TEXT);
  if (!text) return;

  const task = await findTask(id);
  if (!task || task.status === "complete") return;
  if (!(await isLatestStep(task))) return;

  const now = new Date();
  await tasksCollection().updateOne(
    { _id: task._id },
    {
      $set: {
        status: "complete",
        completedBy: user,
        completedAt: now,
        updatedAt: now,
      },
    },
  );
  await tasksCollection().insertOne({
    _id: new ObjectId(),
    chainId: chainIdOf(task),
    parentId: task._id,
    step: (task.step ?? 1) + 1,
    text,
    status: "pending",
    createdBy: user,
    createdAt: now,
    updatedAt: now,
  });
  revalidatePath("/");
}

/** Undo "complete" on the newest step. The note is kept so it can be edited. */
export async function reopenStep(id: string) {
  await requireUser();
  const task = await findTask(id);
  if (!task || task.status !== "complete") return;
  if (!(await isLatestStep(task))) return;

  await tasksCollection().updateOne(
    { _id: task._id },
    {
      $set: {
        status: "pending",
        completedBy: null,
        completedAt: null,
        updatedAt: new Date(),
      },
    },
  );
  revalidatePath("/");
}

/** Add the next step after a completed one. */
export async function addNextStep(parentId: string, formData: FormData) {
  const user = await requireUser();
  const text = readText(formData.get("text"), MAX_TEXT);
  if (!text) return;

  const parent = await findTask(parentId);
  if (!parent || parent.status !== "complete") return;
  if (!(await isLatestStep(parent))) return;

  const now = new Date();
  await tasksCollection().insertOne({
    _id: new ObjectId(),
    chainId: chainIdOf(parent),
    parentId: parent._id,
    step: (parent.step ?? 1) + 1,
    text,
    status: "pending",
    createdBy: user,
    createdAt: now,
    updatedAt: now,
  });
  revalidatePath("/");
}

/** Remove the newest step (not the first one — delete the whole chain instead). */
export async function removeStep(id: string) {
  await requireUser();
  const task = await findTask(id);
  if (!task || !task.parentId) return;
  if (!(await isLatestStep(task))) return;

  await tasksCollection().deleteOne({ _id: task._id });
  revalidatePath("/");
}

/** Delete a whole chain: the first step and every step after it. */
export async function deleteChain(chainId: string) {
  await requireUser();
  if (!ObjectId.isValid(chainId)) return;

  const _id = new ObjectId(chainId);
  await tasksCollection().deleteMany({ $or: [{ _id }, { chainId: _id }] });
  revalidatePath("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}