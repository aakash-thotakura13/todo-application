// Server-only helpers for expenses (reads the database).
import { expensesCollection, sharesCollection, type Expense } from "./db";
import type { ExpenseRow } from "./expenses";
import type { User } from "./users";

export function toRow(e: Expense): ExpenseRow {
  return {
    id: e._id.toString(),
    owner: e.owner,
    date: e.date,
    category: e.category,
    vendor: e.vendor,
    budget: e.budget,
    advance: e.advance,
    dueDate: e.dueDate ?? null,
    paid: Boolean(e.paid),
    remarks: e.remarks ?? "",
    createdAt: e.createdAt.getTime(),
  };
}

export async function loadExpenses(owner?: User): Promise<ExpenseRow[]> {
  const rows = await expensesCollection()
    .find(owner ? { owner } : {})
    .toArray();
  return rows.map(toRow);
}

/** The current share token for each person (null if never shared). */
export async function loadShareTokens(): Promise<Record<User, string | null>> {
  const links = await sharesCollection().find().toArray();
  return {
    ish: links.find((l) => l.owner === "ish")?.token ?? null,
    ishah: links.find((l) => l.owner === "ishah")?.token ?? null,
  };
}

/** Which person's entries a share token opens, or null if the link is invalid. */
export async function ownerForToken(token: string): Promise<User | null> {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const link = await sharesCollection().findOne({ token });
  return link?.owner ?? null;
}
