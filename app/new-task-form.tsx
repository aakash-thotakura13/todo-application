"use client";

import { useState } from "react";
import { createTask } from "./actions";
import { PlacePicker } from "./place-picker";
import { inputClass, SubmitButton } from "./ui";
import { ALL_DAYS, DAY_SHORT, WEEKDAYS } from "@/lib/dates";

type Kind = "once" | "repeating";

const chip =
  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors border";
const chipOn = "border-blue-600 bg-blue-600 text-white";
const chipOff =
  "border-zinc-300 text-zinc-600 hover:border-blue-500 dark:border-zinc-700 dark:text-zinc-400";

export function NewTaskForm({ today }: { today: string }) {
  const [kind, setKind] = useState<Kind>("once");
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [formKey, setFormKey] = useState(0);

  function toggleDay(day: number) {
    setDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  const sameDays = (preset: number[]) => days.join() === preset.join();

  return (
    // Submitted through JavaScript only, so a page refresh can never re-add a task.
    <form
      action={async (formData) => {
        await createTask(formData);
        setFormKey((k) => k + 1);
      }}
      className="mb-8 space-y-3"
    >
      <div className="flex gap-2">
        <input
          id="new-task"
          name="text"
          required
          maxLength={500}
          placeholder="Start a new task…"
          className={`${inputClass} flex-1 text-base`}
        />
        <SubmitButton disabled={kind === "repeating" && days.length === 0}>
          Add
        </SubmitButton>
      </div>

      {/* key: clears the picked place after the task is added */}
      <PlacePicker key={formKey} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {/* One-time or repeating */}
        <input type="hidden" name="kind" value={kind} />
        <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
          {(["once", "repeating"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                kind === k
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500"
              }`}
            >
              {k === "once" ? "One-time" : "Repeating"}
            </button>
          ))}
        </div>

        {/* Date, or which days it repeats */}
        {kind === "once" ? (
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            Date
            <input
              type="date"
              name="dueDate"
              required
              defaultValue={today}
              className="rounded-lg border border-zinc-300 bg-transparent px-2 py-1 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:text-zinc-100 dark:[color-scheme:dark]"
            />
          </label>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {days.map((d) => (
              <input key={d} type="hidden" name="days" value={d} />
            ))}
            <button
              type="button"
              onClick={() => setDays(ALL_DAYS)}
              className={`${chip} ${sameDays(ALL_DAYS) ? chipOn : chipOff}`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setDays(WEEKDAYS)}
              className={`${chip} ${sameDays(WEEKDAYS) ? chipOn : chipOff}`}
            >
              Mon–Fri
            </button>
            <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
            {DAY_SHORT.map((label, day) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={days.includes(day)}
                aria-label={label}
                className={`${chip} w-8 px-0 ${days.includes(day) ? chipOn : chipOff}`}
              >
                {label[0]}
              </button>
            ))}
          </div>
        )}

        {/* Priority */}
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          Priority
          <select
            name="priority"
            defaultValue="medium"
            className="rounded-lg border border-zinc-300 bg-transparent px-2 py-1 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>

      {kind === "repeating" && days.length === 0 && (
        <p className="text-xs text-red-600">Pick at least one day.</p>
      )}
    </form>
  );
}
