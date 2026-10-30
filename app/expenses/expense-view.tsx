// Display-only pieces shared by the private Expenses page and the public share page.
import type { ReactNode } from "react";
import { formatDay } from "@/lib/dates";
import { balanceOf, formatINR, summarize, type ExpenseRow } from "@/lib/expenses";
import { DISPLAY_NAMES } from "@/lib/users";

export function SummaryTiles({ rows, today }: { rows: ExpenseRow[]; today: string }) {
  const s = summarize(rows, today);
  return (
    <div className="grid grid-cols-3 gap-2">
      <Tile label="Total budget" value={formatINR(s.budget)} sub={`${s.count} ${s.count === 1 ? "entry" : "entries"}`} />
      <Tile
        label="Paid so far"
        value={formatINR(s.paid)}
        sub={`${s.settled} settled`}
        tone="text-green-700 dark:text-green-400"
      />
      <Tile
        label="Balance due"
        value={formatINR(s.balance)}
        sub={s.overdue > 0 ? `${s.overdue} overdue` : "nothing overdue"}
        tone={s.balance > 0 ? "text-red-600 dark:text-red-400" : undefined}
        subTone={s.overdue > 0 ? "text-red-600 dark:text-red-400" : undefined}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  tone = "text-zinc-900 dark:text-zinc-100",
  subTone = "text-zinc-400",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: string;
  subTone?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200/70 dark:bg-zinc-900 dark:ring-zinc-800">
      <p className="text-[11px] font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 truncate text-base font-bold tabular-nums sm:text-lg ${tone}`}>{value}</p>
      <p className={`truncate text-[11px] ${subTone}`}>{sub}</p>
    </div>
  );
}

function DueChip({ row, today }: { row: ExpenseRow; today: string }) {
  if (row.paid) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-400">
        ✓ Settled
      </span>
    );
  }
  if (!row.dueDate) return null;
  const overdue = row.dueDate < today && balanceOf(row) > 0;
  const style = overdue
    ? "bg-red-600 text-white"
    : row.dueDate === today
      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400"
      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style}`}>
      {overdue ? "Overdue · " : row.dueDate === today ? "Due today" : "Due "}
      {row.dueDate === today ? "" : formatDay(row.dueDate)}
    </span>
  );
}

/** One expense as a card: S. No, category, vendor, amounts, due date, remarks. */
export function ExpenseCard({
  row,
  sno,
  today,
  showOwner,
  actions,
}: {
  row: ExpenseRow;
  sno: number;
  today: string;
  showOwner: boolean;
  actions?: ReactNode;
}) {
  const balance = balanceOf(row);

  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/70 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 tabular-nums dark:bg-zinc-800 dark:text-zinc-300">
          {sno}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {row.category && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                {row.category}
              </span>
            )}
            <DueChip row={row} today={today} />
            {showOwner && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:bg-sky-500/15 dark:text-sky-400">
                {DISPLAY_NAMES[row.owner]}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {row.vendor || row.category}
          </h3>
          <p className="text-xs text-zinc-500">{formatDay(row.date)}</p>
        </div>
        {actions}
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
        <Amount label="Budget" value={row.budget} />
        <Amount label="Advance" value={row.advance} />
        <Amount
          label="Balance"
          value={balance}
          tone={
            row.paid
              ? "text-green-700 dark:text-green-400"
              : balance > 0
                ? "text-red-600 dark:text-red-400"
                : undefined
          }
        />
      </dl>

      {row.remarks && (
        <p className="mt-3 text-sm whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
          {row.remarks}
        </p>
      )}
    </article>
  );
}

function Amount({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-zinc-500">{label}</dt>
      <dd
        className={`truncate text-sm font-semibold tabular-nums ${tone ?? "text-zinc-900 dark:text-zinc-100"}`}
      >
        {formatINR(value)}
      </dd>
    </div>
  );
}
