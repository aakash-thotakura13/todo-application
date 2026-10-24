// Done/missed tracking for repeating tasks.
// Nothing extra is stored: a scheduled day with a tick is "done",
// a scheduled day in the past without one is "missed".
import { addDays, weekdayOf } from "./dates";
import type { User } from "./users";

/**
 * done    – ticked that day
 * missed  – scheduled, day is over, not ticked
 * pending – scheduled today, not ticked yet (not counted as missed)
 * off     – not scheduled that day, or before the task existed
 */
export type DayState = "done" | "missed" | "pending" | "off";

export type RepeatStats = {
  strip: { date: string; state: DayState; by?: User }[]; // last WINDOW days, oldest first
  window: { done: number; due: number }; // within the strip
  week: { done: number; due: number }; // last 7 days
  allTime: { done: number; due: number };
  currentStreak: number; // scheduled days done in a row (today's pending doesn't break it)
  bestStreak: number;
  byUser: Partial<Record<User, number>>; // ticks per person, all time
  lastDone: string | null;
};

export const WINDOW = 30;

export function repeatStats({
  days,
  startDate,
  completions,
  today,
}: {
  days: number[]; // weekdays it's scheduled on, 0 = Sun
  startDate: string; // day the task was created
  completions: { date: string; completedBy: User }[];
  today: string;
}): RepeatStats {
  const doneBy = new Map(completions.map((c) => [c.date, c.completedBy]));
  const windowStart = addDays(today, -(WINDOW - 1));
  const weekStart = addDays(today, -6);

  const stateOf = (date: string): DayState => {
    if (date < startDate) return "off";
    if (doneBy.has(date)) return "done";
    if (!days.includes(weekdayOf(date))) return "off";
    return date === today ? "pending" : "missed";
  };

  const tally = () => ({ done: 0, due: 0 });
  const allTime = tally();
  const window = tally();
  const week = tally();
  let run = 0;
  let bestStreak = 0;

  // Walk every day from the start (or the window start, if earlier) to today.
  const first = startDate < windowStart ? startDate : windowStart;
  const strip: RepeatStats["strip"] = [];
  for (let date = first; date <= today; date = addDays(date, 1)) {
    const state = stateOf(date);

    if (state === "done" || state === "missed") {
      const counts = [allTime];
      if (date >= windowStart) counts.push(window);
      if (date >= weekStart) counts.push(week);
      for (const c of counts) {
        c.due++;
        if (state === "done") c.done++;
      }
    }

    if (state === "done") bestStreak = Math.max(bestStreak, ++run);
    else if (state === "missed") run = 0;

    if (date >= windowStart) strip.push({ date, state, by: doneBy.get(date) });
  }

  const byUser: RepeatStats["byUser"] = {};
  for (const c of completions) byUser[c.completedBy] = (byUser[c.completedBy] ?? 0) + 1;

  const lastDone = completions.reduce<string | null>(
    (latest, c) => (latest === null || c.date > latest ? c.date : latest),
    null,
  );

  return { strip, window, week, allTime, currentStreak: run, bestStreak, byUser, lastDone };
}

export function percent({ done, due }: { done: number; due: number }) {
  return due === 0 ? null : Math.round((done / due) * 100);
}
