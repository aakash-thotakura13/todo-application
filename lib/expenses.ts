// Expense entries: types, maths and formatting.
// Safe to import from both server and client code.
import type { User } from "./users";

/** An expense as sent to the page (plain JSON, no database types). */
export type ExpenseRow = {
  id: string;
  owner: User; // whose entry it is (used for sharing)
  date: string; // "YYYY-MM-DD"
  category: string;
  vendor: string;
  budget: number; // ₹
  advance: number; // ₹ paid up front
  dueDate: string | null; // "YYYY-MM-DD"
  paid: boolean; // fully settled
  remarks: string;
  createdAt: number; // ms, for stable ordering
};

export const MAX_AMOUNT = 1_000_000_000; // ₹100 crore — guards against typos

/** What's still owed. A settled ("Paid") entry owes nothing. */
export function balanceOf(e: Pick<ExpenseRow, "budget" | "advance" | "paid">) {
  return e.paid ? 0 : Math.max(e.budget - e.advance, 0);
}

/** How much has gone out so far. A settled entry counts its full budget. */
export function paidSoFar(e: Pick<ExpenseRow, "budget" | "advance" | "paid">) {
  return e.paid ? Math.max(e.budget, e.advance) : e.advance;
}

/** Sheet order: by date, then by when it was entered. */
export function sortExpenses(rows: ExpenseRow[]) {
  return [...rows].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt,
  );
}

export function summarize(rows: ExpenseRow[], today: string) {
  let budget = 0;
  let paid = 0;
  let balance = 0;
  let overdue = 0;
  let settled = 0;
  for (const e of rows) {
    budget += e.budget;
    paid += paidSoFar(e);
    balance += balanceOf(e);
    if (e.paid) settled++;
    else if (e.dueDate && e.dueDate < today && balanceOf(e) > 0) overdue++;
  }
  return { count: rows.length, budget, paid, balance, overdue, settled };
}

const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const inrPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "₹1,50,000", or "₹2,500.50" when there are paise. */
export function formatINR(amount: number) {
  return Number.isInteger(amount) ? inrWhole.format(amount) : inrPaise.format(amount);
}

/** Read a rupee amount typed by a person ("1,50,000", "₹2500.50"). Null if invalid. */
export function parseAmount(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[₹,\s]/g, "");
  if (cleaned === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n <= MAX_AMOUNT ? n : null;
}
