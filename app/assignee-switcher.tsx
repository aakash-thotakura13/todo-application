"use client";

import { setAssignee } from "./actions";
import { useInstant } from "./instant";
import { ASSIGNEES, assigneeLabel, type Assignee } from "@/lib/users";

const ICON: Record<string, string> = { each: "👥", either: "🤝" };

/** A small badge-style dropdown to change who a repeating task is for. */
export function AssigneeSwitcher({ taskId, assignee }: { taskId: string; assignee: Assignee }) {
  const { value, isPending, run } = useInstant(assignee);

  return (
    <label
      className="relative inline-flex cursor-pointer items-center gap-1 rounded-full bg-sky-100 py-0.5 pr-1.5 pl-2 text-[11px] font-medium text-sky-700 hover:bg-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:hover:bg-sky-500/25"
      title="Who does this task — tap to change"
    >
      <span aria-hidden>{ICON[value] ?? "👤"}</span>
      {assigneeLabel(value)}
      <span aria-hidden className="text-[9px] opacity-70">
        ▼
      </span>
      {isPending && <span className="animate-pulse">…</span>}
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value as Assignee;
          if (
            next !== value &&
            confirm(
              `Change "${assigneeLabel(value)}" to "${assigneeLabel(next)}"? Past ticks are kept, and the done/missed record is recalculated.`,
            )
          ) {
            run(next, () => setAssignee(taskId, next));
          }
        }}
        aria-label="Who does this task"
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {ASSIGNEES.map((a) => (
          <option key={a} value={a}>
            {assigneeLabel(a)}
          </option>
        ))}
      </select>
    </label>
  );
}
