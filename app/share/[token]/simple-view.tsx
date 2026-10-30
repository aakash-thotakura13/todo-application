// Big, plain, high-contrast view of expenses for the read-only share page.
// Written for older readers on phones: large text, full words, full dates,
// no small badges or abbreviations, and status always spelled out in words.
import { formatLongDay } from "@/lib/dates";
import {
  balanceOf,
  formatINR,
  inLakhs,
  paidSoFar,
  summarize,
  type ExpenseRow,
} from "@/lib/expenses";

function Money({ amount, className = "" }: { amount: number; className?: string }) {
  const words = inLakhs(amount);
  return (
    <span className={`text-right tabular-nums ${className}`}>
      {formatINR(amount)}
      {words && <span className="block text-sm font-normal text-zinc-600">({words})</span>}
    </span>
  );
}

function Row({
  label,
  amount,
  strong = false,
  tone = "text-zinc-900",
}: {
  label: string;
  amount: number;
  strong?: boolean;
  tone?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className={`text-lg ${strong ? "font-bold" : "font-medium"} text-zinc-800`}>{label}</span>
      <Money amount={amount} className={`${strong ? "text-2xl font-extrabold" : "text-xl font-bold"} ${tone}`} />
    </div>
  );
}

/** The totals at the top. */
export function SimpleSummary({ rows, today }: { rows: ExpenseRow[]; today: string }) {
  const s = summarize(rows, today);
  const pending = rows.filter((r) => balanceOf(r) > 0);
  const next = pending
    .filter((r) => r.dueDate)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0];

  return (
    <section
      aria-label="Summary"
      className="rounded-3xl border-2 border-zinc-200 bg-white px-5 py-2 shadow-sm"
    >
      <div className="divide-y-2 divide-zinc-100">
        <Row label="Total amount" amount={s.budget} />
        <Row label="Already paid" amount={s.paid} tone="text-green-800" />
        <Row
          label="Still to pay"
          amount={s.balance}
          strong
          tone={s.balance > 0 ? "text-red-700" : "text-green-800"}
        />
      </div>

      <div className="border-t-2 border-zinc-100 py-4 text-lg leading-relaxed text-zinc-800">
        {pending.length === 0 ? (
          <p className="font-bold text-green-800">✓ Everything is fully paid.</p>
        ) : (
          <>
            <p>
              <b>{pending.length}</b> {pending.length === 1 ? "payment is" : "payments are"} still
              pending
              {s.overdue > 0 && (
                <>
                  , <b className="text-red-700">{s.overdue} past the due date</b>
                </>
              )}
              .
            </p>
            {next && (
              <p className="mt-2">
                Next: <b>{next.vendor || next.category}</b> — {formatINR(balanceOf(next))} by{" "}
                <b>{formatLongDay(next.dueDate!)}</b>.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** One entry, spelled out in full. */
export function SimpleEntry({ row, sno, today }: { row: ExpenseRow; sno: number; today: string }) {
  const balance = balanceOf(row);
  const settled = balance === 0;
  const overdue = !settled && row.dueDate !== null && row.dueDate < today;

  return (
    <article
      className={`rounded-3xl border-2 bg-white px-5 py-4 shadow-sm ${
        settled ? "border-green-300" : overdue ? "border-red-400" : "border-zinc-200"
      }`}
    >
      {/* What and who */}
      <p className="text-base font-semibold text-zinc-600">
        No. {sno}
        {row.category && ` · ${row.category}`}
      </p>
      <h2 className="mt-1 text-2xl leading-snug font-bold text-zinc-900">
        {row.vendor || row.category}
      </h2>
      <p className="mt-1 text-base text-zinc-600">Date: {formatLongDay(row.date)}</p>

      {/* Amounts */}
      <div className="mt-3 divide-y-2 divide-zinc-100 border-t-2 border-zinc-100">
        <Row label="Total amount" amount={row.budget} />
        <Row label="Advance paid" amount={row.advance} />
        {settled ? null : <Row label="Still to pay" amount={balance} strong tone="text-red-700" />}
      </div>

      {/* Status, always in words */}
      {settled ? (
        <p className="mt-2 rounded-2xl bg-green-50 px-4 py-3 text-xl font-bold text-green-800">
          ✓ Fully paid
          {paidSoFar(row) > 0 && (
            <span className="block text-base font-medium">
              {formatINR(paidSoFar(row))} paid in total
            </span>
          )}
        </p>
      ) : row.dueDate ? (
        <p
          className={`mt-2 rounded-2xl px-4 py-3 text-lg leading-snug font-semibold ${
            overdue ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"
          }`}
        >
          {overdue ? "⚠ Was due on " : row.dueDate === today ? "Due today, " : "Pay by "}
          <span className="font-bold">{formatLongDay(row.dueDate)}</span>
        </p>
      ) : (
        <p className="mt-2 rounded-2xl bg-zinc-50 px-4 py-3 text-lg font-semibold text-zinc-700">
          No due date set
        </p>
      )}

      {row.remarks && (
        <p className="mt-3 text-lg leading-relaxed whitespace-pre-wrap text-zinc-800">
          <span className="font-semibold">Note: </span>
          {row.remarks}
        </p>
      )}
    </article>
  );
}
