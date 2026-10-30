"use client";

import {
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { deleteExpense, saveExpense, shareLink } from "./actions";
import { ExpenseCard, SummaryTiles } from "./expense-view";
import { reportSaveError } from "../instant";
import { formatINR, parseAmount, sortExpenses, type ExpenseRow } from "@/lib/expenses";
import { DISPLAY_NAMES, otherUser, USERS, type User } from "@/lib/users";

type Filter = "all" | User;
type Change = { type: "save"; row: ExpenseRow } | { type: "delete"; id: string };

export function ExpenseBoard({
  rows,
  me,
  today,
  shareTokens,
}: {
  rows: ExpenseRow[];
  me: User;
  today: string;
  shareTokens: Record<User, string | null>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<ExpenseRow | "new" | null>(null);
  const [sharing, setSharing] = useState(false);
  const [, startTransition] = useTransition();

  // Instant updates: show changes now, save in the background.
  const [shown, apply] = useOptimistic(rows, (current: ExpenseRow[], change: Change) =>
    change.type === "delete"
      ? current.filter((r) => r.id !== change.id)
      : [...current.filter((r) => r.id !== change.row.id), change.row],
  );

  const visible = useMemo(
    () => sortExpenses(filter === "all" ? shown : shown.filter((r) => r.owner === filter)),
    [shown, filter],
  );
  const categories = useMemo(
    () => [...new Set(shown.map((r) => r.category).filter(Boolean))].sort(),
    [shown],
  );

  function save(formData: FormData, row: ExpenseRow) {
    setEditing(null);
    startTransition(async () => {
      apply({ type: "save", row });
      try {
        await saveExpense(formData);
      } catch (error) {
        reportSaveError(error);
      }
    });
  }

  function remove(row: ExpenseRow) {
    if (!confirm(`Delete "${row.vendor || row.category}"? This can't be undone.`)) return;
    startTransition(async () => {
      apply({ type: "delete", id: row.id });
      try {
        await deleteExpense(row.id);
      } catch (error) {
        reportSaveError(error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Whose entries */}
      <div className="grid grid-cols-3 rounded-xl bg-zinc-200/70 p-1 dark:bg-zinc-800">
        {(["all", ...USERS] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-lg py-2 text-sm font-medium transition ${
              filter === f
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                : "text-zinc-500"
            }`}
          >
            {f === "all" ? "All" : DISPLAY_NAMES[f]}
          </button>
        ))}
      </div>

      <SummaryTiles rows={visible} today={today} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
        >
          + Add entry
        </button>
        <button
          type="button"
          onClick={() => setSharing(true)}
          className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50 active:scale-[0.98] dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700"
        >
          ↗ Share
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-400">
          No entries yet. Tap “Add entry” to start.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((row, i) => (
            <li key={row.id}>
              <ExpenseCard
                row={row}
                sno={i + 1}
                today={today}
                showOwner={filter === "all"}
                actions={
                  row.id.startsWith("new-") ? (
                    <span className="shrink-0 animate-pulse text-xs text-blue-500">saving…</span>
                  ) : (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(row)}
                      aria-label={`Edit ${row.vendor}`}
                      className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      aria-label={`Delete ${row.vendor}`}
                      className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      ✕
                    </button>
                  </div>
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New entry" : "Edit entry"}>
        {editing !== null && (
          <ExpenseForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? null : editing}
            defaultOwner={filter === "all" ? me : filter}
            today={today}
            categories={categories}
            onCancel={() => setEditing(null)}
            onSave={save}
          />
        )}
      </Sheet>

      <Sheet open={sharing} onClose={() => setSharing(false)} title="Share read-only">
        <SharePanel initial={shareTokens} me={me} />
      </Sheet>
    </div>
  );
}

/* ---------- Bottom sheet (pop-up) ---------- */

function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="animate-sheet mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-full overflow-y-auto rounded-t-3xl bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px] sm:max-w-lg dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
      <div className="flex items-center justify-between px-5 pt-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ✕
        </button>
      </div>
      {children}
    </dialog>
  );
}

/* ---------- Add / edit form ---------- */

const field =
  "w-full rounded-xl border-0 bg-zinc-100 px-3 py-2.5 text-base text-zinc-900 outline-none ring-blue-500 placeholder:text-zinc-400 focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 dark:[color-scheme:dark]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function ExpenseForm({
  initial,
  defaultOwner,
  today,
  categories,
  onCancel,
  onSave,
}: {
  initial: ExpenseRow | null;
  defaultOwner: User;
  today: string;
  categories: string[];
  onCancel: () => void;
  onSave: (formData: FormData, row: ExpenseRow) => void;
}) {
  const [owner, setOwner] = useState<User>(initial?.owner ?? defaultOwner);
  const [budget, setBudget] = useState(initial ? String(initial.budget) : "");
  const [advance, setAdvance] = useState(initial ? String(initial.advance) : "");
  const [paid, setPaid] = useState(initial?.paid ?? false);
  const [error, setError] = useState<string | null>(null);

  const budgetN = parseAmount(budget);
  const advanceN = parseAmount(advance);
  const preview =
    budgetN !== null && advanceN !== null ? (paid ? 0 : Math.max(budgetN - advanceN, 0)) : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const vendor = String(formData.get("vendor") ?? "").trim();
        const category = String(formData.get("category") ?? "").trim();
        if (!vendor && !category) return setError("Add a vendor or a category.");
        if (budgetN === null || advanceN === null) return setError("Check the amounts.");

        onSave(formData, {
          id: initial?.id ?? `new-${Date.now()}`,
          owner,
          date: String(formData.get("date")),
          category,
          vendor,
          budget: budgetN,
          advance: advanceN,
          dueDate: String(formData.get("dueDate") ?? "") || null,
          paid,
          remarks: String(formData.get("remarks") ?? "").trim(),
          createdAt: initial?.createdAt ?? Date.now(),
        });
      }}
    >
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="owner" value={owner} />

      <div className="space-y-4 px-5 pt-4 pb-5">
        {/* Whose entry */}
        <div className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          {USERS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setOwner(u)}
              aria-pressed={owner === u}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                owner === u
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-500"
              }`}
            >
              {DISPLAY_NAMES[u]}&apos;s entry
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <input
              name="category"
              list="expense-categories"
              defaultValue={initial?.category}
              maxLength={100}
              placeholder="e.g. Catering"
              className={field}
            />
            <datalist id="expense-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Date">
            <input
              type="date"
              name="date"
              required
              defaultValue={initial?.date ?? today}
              className={field}
            />
          </Field>
        </div>

        <Field label="Vendor">
          <input
            name="vendor"
            defaultValue={initial?.vendor}
            maxLength={200}
            autoFocus={!initial}
            placeholder="Who are you paying?"
            className={field}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget (₹)">
            <input
              name="budget"
              inputMode="decimal"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0"
              className={`${field} tabular-nums`}
            />
          </Field>
          <Field label="Advance paid (₹)">
            <input
              name="advance"
              inputMode="decimal"
              value={advance}
              onChange={(e) => {
                setAdvance(e.target.value);
                const a = parseAmount(e.target.value);
                if (budgetN && a !== null && a >= budgetN) setPaid(true);
              }}
              placeholder="0"
              className={`${field} tabular-nums`}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date (optional)">
            <input type="date" name="dueDate" defaultValue={initial?.dueDate ?? ""} className={field} />
          </Field>
          <div>
            <span className="mb-1 block text-xs font-medium text-zinc-500">Paid in full</span>
            <button
              type="button"
              role="switch"
              aria-checked={paid}
              onClick={() => setPaid(!paid)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                paid
                  ? "bg-green-600 text-white"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {paid ? "✓ Settled" : "Not yet"}
              <span
                className={`relative h-5 w-9 rounded-full transition ${paid ? "bg-white/40" : "bg-zinc-300 dark:bg-zinc-600"}`}
              >
                <span
                  className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${paid ? "left-4.5" : "left-0.5"}`}
                />
              </span>
            </button>
            {paid && <input type="hidden" name="paid" value="on" />}
          </div>
        </div>

        <p className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
          Balance:{" "}
          <b className="tabular-nums">
            {preview === null ? "—" : formatINR(preview)}
          </b>
          {paid && <span className="text-green-700 dark:text-green-400"> · settled</span>}
        </p>

        <Field label="Remarks (optional)">
          <textarea
            name="remarks"
            rows={2}
            maxLength={1000}
            defaultValue={initial?.remarks}
            className={`${field} resize-none`}
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="sticky bottom-0 flex gap-3 border-t border-zinc-100 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-[2] rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]"
        >
          {initial ? "Save changes" : "Add entry"}
        </button>
      </div>
    </form>
  );
}

/* ---------- Share links ---------- */

function SharePanel({ initial, me }: { initial: Record<User, string | null>; me: User }) {
  const [tokens, setTokens] = useState(initial);
  const [busy, setBusy] = useState<User | null>(null);
  const [copied, setCopied] = useState<User | null>(null);

  const urlFor = (token: string) => `${window.location.origin}/share/${token}`;

  async function getLink(owner: User, reset: boolean) {
    if (reset && !confirm(`Reset ${DISPLAY_NAMES[owner]}'s link? The old link will stop working.`)) return;
    setBusy(owner);
    try {
      const token = await shareLink(owner, reset);
      if (token) setTokens((t) => ({ ...t, [owner]: token }));
      return token;
    } catch (error) {
      reportSaveError(error);
    } finally {
      setBusy(null);
    }
  }

  async function copy(owner: User) {
    const token = tokens[owner] ?? (await getLink(owner, false));
    if (!token) return;
    const url = urlFor(token);
    try {
      if (navigator.share) {
        await navigator.share({ title: `${DISPLAY_NAMES[owner]}'s expenses`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(owner);
        setTimeout(() => setCopied(null), 2000);
      }
    } catch {
      // share sheet dismissed — nothing to do
    }
  }

  return (
    <div className="space-y-3 px-5 pt-3 pb-6">
      <p className="text-sm text-zinc-500">
        Anyone with a link can <b>view</b> one person&apos;s entries — nothing else on the site, and
        no editing. Reset a link to stop it working.
      </p>
      {[me, otherUser(me)].map((owner) => (
        <div
          key={owner}
          className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200/70 dark:bg-zinc-800/50 dark:ring-zinc-700"
        >
          <p className="text-sm font-semibold">{DISPLAY_NAMES[owner]}&apos;s entries</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {tokens[owner] ? `/share/${tokens[owner]}` : "No link yet"}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy === owner}
              onClick={() => copy(owner)}
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === owner ? "…" : copied === owner ? "✓ Copied" : tokens[owner] ? "Share link" : "Create link"}
            </button>
            {tokens[owner] && (
              <a
                href={`/share/${tokens[owner]}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700"
              >
                Preview
              </a>
            )}
            {tokens[owner] && (
              <button
                type="button"
                disabled={busy === owner}
                onClick={() => getLink(owner, true)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
