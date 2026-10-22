// Date helpers. Dates are stored as "YYYY-MM-DD" strings in India time (IST),
// so "today" means today in India no matter where the server runs.
// Safe to import from both server and client code.

const TIME_ZONE = "Asia/Kolkata";

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS = [1, 2, 3, 4, 5];

const isoFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}); // en-CA formats as YYYY-MM-DD

/** Today's date in IST as "YYYY-MM-DD". */
export function todayIST(now: Date = new Date()) {
  return isoFormat.format(now);
}

/** The IST calendar date of a timestamp, as "YYYY-MM-DD". */
export function dateOf(timestamp: Date) {
  return isoFormat.format(timestamp);
}

function parse(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parse(value);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

export function addDays(date: string, days: number) {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(date: string) {
  return parse(date).getUTCDay();
}

const shortFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "Fri, 24 Oct" */
export function formatDay(date: string) {
  return shortFormat.format(parse(date));
}

export function normalizeDays(days: number[] | undefined) {
  if (!days || days.length === 0) return ALL_DAYS;
  return [...new Set(days)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
}

/** "Daily", "Weekdays", "Weekends" or "Mon, Wed, Fri" */
export function scheduleLabel(days: number[] | undefined) {
  const d = normalizeDays(days);
  if (d.length === 7) return "Daily";
  if (d.join() === WEEKDAYS.join()) return "Weekdays";
  if (d.join() === "0,6") return "Weekends";
  return d.map((i) => DAY_SHORT[i]).join(", ");
}
