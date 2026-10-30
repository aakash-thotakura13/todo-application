import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ExpenseBoard } from "./expense-board";
import { todayIST } from "@/lib/dates";
import { loadExpenses, loadShareTokens } from "@/lib/expenses-server";
import { requireUser } from "@/lib/session";
import { DISPLAY_NAMES } from "@/lib/users";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    // Built for phones and tablets: one narrow column, two card columns on tablets.
    <main className="min-h-dvh bg-zinc-100 px-4 pt-6 pb-16 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl">
        <Suspense fallback={<Skeleton />}>
          <Content />
        </Suspense>
      </div>
    </main>
  );
}

async function Content() {
  const user = await requireUser(); // also marks the page as per-request
  const today = todayIST();
  const [rows, shareTokens] = await Promise.all([loadExpenses(), loadShareTokens()]);

  return (
    <>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Tasks
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Expenses
          </h1>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          {DISPLAY_NAMES[user]}
        </span>
      </header>
      <ExpenseBoard rows={rows} me={user} today={today} shareTokens={shareTokens} />
    </>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-20 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-36 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
