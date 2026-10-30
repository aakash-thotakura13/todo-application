import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ExpenseCard, SummaryTiles } from "@/app/expenses/expense-view";
import { formatDay, todayIST } from "@/lib/dates";
import { sortExpenses } from "@/lib/expenses";
import { loadExpenses, ownerForToken } from "@/lib/expenses-server";
import { DISPLAY_NAMES } from "@/lib/users";

// Public, read-only. No login needed; the link itself is the key.
export const metadata: Metadata = {
  title: "Shared expenses",
  robots: { index: false, follow: false },
};

export default function SharedExpensesPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <main className="min-h-dvh bg-zinc-100 px-4 pt-6 pb-16 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl">
        <Suspense fallback={<p className="py-20 text-center text-sm text-zinc-400">Loading…</p>}>
          <Shared params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Shared({ params }: { params: Promise<{ token: string }> }) {
  await connection(); // always read fresh data
  const { token } = await params;
  const owner = await ownerForToken(token);

  if (!owner) {
    return (
      <div className="py-24 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          This link isn&apos;t valid
        </h1>
        <p className="mt-1 text-sm text-zinc-500">It may have been reset. Ask for a new link.</p>
      </div>
    );
  }

  const today = todayIST();
  const rows = sortExpenses(await loadExpenses(owner));

  return (
    <>
      <header className="mb-5">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Shared · view only
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {DISPLAY_NAMES[owner]}&apos;s expenses
        </h1>
        <p className="text-sm text-zinc-500">As of {formatDay(today)}</p>
      </header>

      <SummaryTiles rows={rows} today={today} />

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-400">No entries yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {rows.map((row, i) => (
            <li key={row.id}>
              <ExpenseCard row={row} sno={i + 1} today={today} showOwner={false} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
