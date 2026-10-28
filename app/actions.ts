"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assigneeOf,
  completionsCollection,
  PRIORITIES,
  tasksCollection,
  type Priority,
  type Task,
} from "@/lib/db";
import { isValidDate, normalizeDays, todayIST } from "@/lib/dates";
import { MapsError, optimizedRoundTrip } from "@/lib/google";
import {
  isLatLng,
  parsePlace,
  TRAVEL_MODES,
  type LatLng,
  type Place,
  type PlanRouteResult,
  type TravelMode,
} from "@/lib/place";
import { deleteSession, requireUser } from "@/lib/session";
import { isAssignee, isFor } from "@/lib/users";

const MAX_TEXT = 500;
const MAX_NOTE = 5000;

function readText(value: FormDataEntryValue | null, max: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.slice(0, max);
}

function readPriority(value: FormDataEntryValue | null, fallback: Priority = "medium") {
  return PRIORITIES.includes(value as Priority) ? (value as Priority) : fallback;
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

/** Insert the step that follows `parent` in its chain. */
async function insertNextStep(
  parent: Task,
  text: string,
  dueDate: string,
  place: Place | null,
  user: Task["createdBy"],
) {
  const now = new Date();
  await tasksCollection().insertOne({
    _id: new ObjectId(),
    kind: "once",
    priority: parent.priority ?? "medium",
    dueDate,
    place,
    chainId: chainIdOf(parent),
    parentId: parent._id,
    step: (parent.step ?? 1) + 1,
    text,
    status: "pending",
    createdBy: user,
    createdAt: now,
    updatedAt: now,
  });
}

/** Create a new one-time (dated) or repeating task. */
export async function createTask(formData: FormData) {
  const user = await requireUser();
  const text = readText(formData.get("text"), MAX_TEXT);
  if (!text) return;

  const priority = readPriority(formData.get("priority"));
  const place = parsePlace(formData.get("place"));
  const _id = new ObjectId();
  const now = new Date();

  if (formData.get("kind") === "repeating") {
    const days = normalizeDays(
      formData.getAll("days").map(Number).filter(Number.isInteger),
    );
    const who = formData.get("assignee");
    await tasksCollection().insertOne({
      _id,
      kind: "repeating",
      priority,
      days,
      assignee: isAssignee(who) ? who : "each",
      place,
      text,
      status: "pending",
      createdBy: user,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    const dueDate = formData.get("dueDate");
    if (!isValidDate(dueDate)) return; // a date is required for one-time tasks
    await tasksCollection().insertOne({
      _id,
      kind: "once",
      priority,
      dueDate,
      place,
      chainId: _id,
      parentId: null,
      step: 1,
      text,
      status: "pending",
      createdBy: user,
      createdAt: now,
      updatedAt: now,
    });
  }

  revalidatePath("/");
}

/* ---------- One-time tasks (chains) ---------- */

/** Mark a step complete, with an optional note on how it was done. */
export async function completeStep(id: string, formData: FormData) {
  const user = await requireUser();
  const task = await findTask(id);
  if (!task || task.kind === "repeating" || task.status === "complete") return;

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
  const dueDate = formData.get("dueDate");
  if (!text || !isValidDate(dueDate)) return;

  const task = await findTask(id);
  if (!task || task.kind === "repeating" || task.status === "complete") return;
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
  await insertNextStep(task, text, dueDate, parsePlace(formData.get("place")), user);
  revalidatePath("/");
}

/** Add the next step after a completed one. */
export async function addNextStep(parentId: string, formData: FormData) {
  const user = await requireUser();
  const text = readText(formData.get("text"), MAX_TEXT);
  const dueDate = formData.get("dueDate");
  if (!text || !isValidDate(dueDate)) return;

  const parent = await findTask(parentId);
  if (!parent || parent.kind === "repeating" || parent.status !== "complete") return;
  if (!(await isLatestStep(parent))) return;

  await insertNextStep(parent, text, dueDate, parsePlace(formData.get("place")), user);
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

/* ---------- Repeating tasks ---------- */

/**
 * Tick a repeating task for today, with an optional note.
 * "Each of us" / "Only …" tasks: every person has their own tick.
 * "Either of us" tasks: the first tick of the day counts for both.
 */
export async function completeRepeating(id: string, formData: FormData) {
  const user = await requireUser();
  const task = await findTask(id);
  if (!task || task.kind !== "repeating") return;

  const assignee = assigneeOf(task);
  if (!isFor(assignee, user)) return; // someone else's personal task

  const date = todayIST();
  if (assignee === "either") {
    const already = await completionsCollection().findOne({ taskId: task._id, date });
    if (already) return;
  }

  const note = readText(formData.get("note"), MAX_NOTE);
  await completionsCollection().updateOne(
    { taskId: task._id, date, completedBy: user },
    { $set: { completedAt: new Date(), note: note || null } },
    { upsert: true },
  );
  revalidatePath("/");
}

/** Untick a repeating task for today (your own tick; for "Either of us", today's tick). */
export async function undoRepeating(id: string) {
  const user = await requireUser();
  const task = await findTask(id);
  if (!task || task.kind !== "repeating") return;

  const date = todayIST();
  await completionsCollection().deleteMany(
    assigneeOf(task) === "either"
      ? { taskId: task._id, date }
      : { taskId: task._id, date, completedBy: user },
  );
  revalidatePath("/");
}

/** Change who a repeating task is for. Past ticks are kept and re-scored. */
export async function setAssignee(id: string, assignee: string) {
  await requireUser();
  if (!ObjectId.isValid(id) || !isAssignee(assignee)) return;

  await tasksCollection().updateOne(
    { _id: new ObjectId(id), kind: "repeating" },
    { $set: { assignee, updatedAt: new Date() } },
  );
  revalidatePath("/");
}

/** Delete a repeating task and its whole daily log. */
export async function deleteRepeating(id: string) {
  await requireUser();
  if (!ObjectId.isValid(id)) return;

  const _id = new ObjectId(id);
  await tasksCollection().deleteOne({ _id, kind: "repeating" });
  await completionsCollection().deleteMany({ taskId: _id });
  revalidatePath("/");
}

/* ---------- Places & route planning ---------- */

/** Set, change or (with an empty value) remove the place on a task. */
export async function setTaskPlace(id: string, formData: FormData) {
  await requireUser();
  if (!ObjectId.isValid(id)) return;

  await tasksCollection().updateOne(
    { _id: new ObjectId(id) },
    { $set: { place: parsePlace(formData.get("place")), updatedAt: new Date() } },
  );
  revalidatePath("/");
}

const MAX_STOPS = 25; // Google's limit for stops in one route

/** Find the best order to visit the given tasks' places, starting and ending at `origin`. */
export async function planRoute(input: {
  origin: LatLng;
  taskIds: string[];
  mode: TravelMode;
}): Promise<PlanRouteResult> {
  await requireUser();

  const { origin, mode } = input;
  if (!isLatLng(origin)) return { ok: false, error: "Invalid starting point." };
  if (!TRAVEL_MODES.includes(mode)) return { ok: false, error: "Invalid travel mode." };

  const ids = [...new Set(input.taskIds)].filter((id) => ObjectId.isValid(id));
  if (ids.length === 0) return { ok: false, error: "Pick at least one task." };
  if (ids.length > MAX_STOPS) {
    return { ok: false, error: `Google can plan up to ${MAX_STOPS} stops at a time.` };
  }

  const tasks = await tasksCollection()
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } })
    .toArray();
  const stops = ids.flatMap((id) => {
    const task = tasks.find((t) => t._id.toString() === id);
    return task?.place ? [{ id, place: task.place }] : [];
  });
  if (stops.length === 0) return { ok: false, error: "None of these tasks have a place." };

  try {
    const route = await optimizedRoundTrip(
      origin,
      stops.map((s) => ({ lat: s.place.lat, lng: s.place.lng })),
      mode,
    );
    return {
      ok: true,
      order: route.order.map((i) => stops[i].id),
      legs: route.legs,
      totalDistanceMeters: route.totalDistanceMeters,
      totalDurationSeconds: route.totalDurationSeconds,
    };
  } catch (error) {
    if (!(error instanceof MapsError)) console.error(error);
    return {
      ok: false,
      error:
        error instanceof MapsError ? error.message : "Couldn't plan the route. Please try again.",
    };
  }
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
