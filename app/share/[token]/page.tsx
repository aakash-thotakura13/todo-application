import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SimpleEntry, SimpleSummary } from "./simple-view";
import { TextSizeControl } from "./text-size";
import { formatLongDay, todayIST } from "@/lib/dates";
import { sortExpenses } from "@/lib/expenses";
import { loadExpenses, ownerForToken } from "@/lib/expenses-server";
import { DISPLAY_NAMES } from "@/lib/users";

// Public, read-only. No login needed; the link itself is the key.
export const metadata: Metadata = {
  title: "Expenses",
  robots: { index: false, follow: false },
};

// Always light and high-contrast, whatever the phone's dark-mode setting;
// pinch-zoom stays allowed.
export const viewport: Viewport = { colorScheme: "light", themeColor: "#ffffff" };

export default function SharedExpensesPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <main className="min-h-dvh bg-zinc-100 px-4 pt-5 pb-20 text-zinc-900" style={{ colorScheme: "light" }}>
      {/* Larger base text for this page (everything is sized from it). */}
      <style>{"html{font-size:18px}"}</style>
      <div className="mx-auto max-w-2xl">
        <Suspense fallback={<p className="py-24 text-center text-xl text-zinc-600">Loading…</p>}>
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
        <p className="text-5xl" aria-hidden>
          🔒
        </p>
        <h1 className="mt-4 text-2xl font-bold">This link is not working</h1>
        <p className="mt-2 text-lg text-zinc-700">
          It may have been changed. Please ask for a new link.
        </p>
      </div>
    );
  }

  const today = todayIST();
  const rows = sortExpenses(await loadExpenses(owner));

  return (
    <>
      <header className="mb-5">
        <div className="mb-4 flex justify-end">
          <TextSizeControl />
        </div>
        <h1 className="text-3xl leading-tight font-extrabold">
          {DISPLAY_NAMES[owner]}&apos;s expenses
        </h1>
        <p className="mt-1 text-lg text-zinc-700">Updated: {formatLongDay(today)}</p>
        <p className="mt-1 text-base text-zinc-600">This page is for viewing only.</p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-3xl bg-white py-16 text-center text-xl text-zinc-700">
          Nothing has been added yet.
        </p>
      ) : (
        <>
          <SimpleSummary rows={rows} today={today} />

          <h2 className="mt-8 mb-3 text-2xl font-bold">All payments ({rows.length})</h2>
          <ol className="space-y-4">
            {rows.map((row, i) => (
              <li key={row.id}>
                <SimpleEntry row={row} sno={i + 1} today={today} />
              </li>
            ))}
          </ol>

          <p className="mt-8 text-center text-base text-zinc-600">— End of list —</p>
        </>
      )}
    </>
  );
}
