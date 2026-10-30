"use server";

import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { expensesCollection, sharesCollection } from "@/lib/db";
import { isValidDate } from "@/lib/dates";
import { parseAmount } from "@/lib/expenses";
import { requireUser } from "@/lib/session";
import { isUser, type User } from "@/lib/users";

function text(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Create a new entry, or update one when the form has an `id`. */
export async function saveExpense(formData: FormData) {
  const user = await requireUser();

  const date = formData.get("date");
  const dueRaw = formData.get("dueDate");
  const owner = formData.get("owner");
  const budget = parseAmount(formData.get("budget"));
  const advance = parseAmount(formData.get("advance"));
  const vendor = text(formData.get("vendor"), 200);
  const category = text(formData.get("category"), 100);

  if (!isValidDate(date) || budget === null || advance === null) return;
  if (!vendor && !category) return;

  const fields = {
    owner: isUser(owner) ? owner : user,
    date,
    category,
    vendor,
    budget,
    advance,
    dueDate: isValidDate(dueRaw) ? dueRaw : null,
    paid: formData.get("paid") === "on",
    remarks: text(formData.get("remarks"), 1000),
    updatedAt: new Date(),
  };

  const id = formData.get("id");
  if (typeof id === "string" && ObjectId.isValid(id)) {
    await expensesCollection().updateOne({ _id: new ObjectId(id) }, { $set: fields });
  } else {
    await expensesCollection().insertOne({
      _id: new ObjectId(),
      ...fields,
      createdBy: user,
      createdAt: new Date(),
    });
  }
  revalidatePath("/expenses");
}

export async function deleteExpense(id: string) {
  await requireUser();
  if (!ObjectId.isValid(id)) return;
  await expensesCollection().deleteOne({ _id: new ObjectId(id) });
  revalidatePath("/expenses");
}

/**
 * Get (or create) the read-only link for one person's entries.
 * With `reset`, the old link stops working and a new one is made.
 */
export async function shareLink(owner: string, reset = false): Promise<string | null> {
  await requireUser();
  if (!isUser(owner)) return null;

  if (!reset) {
    const existing = await sharesCollection().findOne({ owner });
    if (existing) return existing.token;
  }

  const token = randomBytes(18).toString("base64url"); // 24 characters, unguessable
  await sharesCollection().deleteMany({ owner: owner as User });
  await sharesCollection().insertOne({
    _id: new ObjectId(),
    owner: owner as User,
    token,
    createdAt: new Date(),
  });
  revalidatePath("/expenses");
  return token;
}
