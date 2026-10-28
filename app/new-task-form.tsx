"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBoard, type SectionId } from "./board-shell";
import { PlacePicker } from "./place-picker";
import { addDays, ALL_DAYS, DAY_SHORT, formatDay, weekdayOf, WEEKDAYS } from "@/lib/dates";
import type { Priority } from "@/lib/db";
import { DISPLAY_NAMES, isFor, otherUser, type Assignee, type User } from "@/lib/users";

type Kind = "once" | "repeating";

const PRIORITY_OPTIONS: { value: Priority; label: string; dot: string; on: string }[] = [
  { value: "low", label: "Low", dot: "bg-zinc-400", on: "bg-zinc-600 text-white dark:bg-zinc-500" },
  { value: "medium", label: "Medium", dot: "bg-amber-500", on: "bg-amber-500 text-white" },
  { value: "high", label: "High", dot: "bg-red-500", on: "bg-red-600 text-white" },
];

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
      {children}
    </p>
  );
}

const pill =
  "rounded-full px-3.5 py-1.5 text-sm font-medium transition active:scale-95";
const pillOff =
  "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";
const pillOn = "bg-blue-600 text-white";

/** The "New task" pop-up: a bottom sheet on phones, a centred card on larger screens. */
export function NewTaskDialog({ today, me }: { today: string; me: User }) {
  const { composing, setComposing, addTask } = useBoard();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [formKey, setFormKey] = useState(0);

  // Open/close the native dialog when `composing` changes.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (composing && !dialog.open) {
      setFormKey((k) => k + 1); // a fresh, empty form every time
      dialog.showModal();
    } else if (!composing && dialog.open) {
      dialog.close();
    }
  }, [composing]);

  return (
    <dialog
      ref={dialogRef}
      onClose={() => setComposing(false)}
      // Tap on the dimmed background closes it.
      onClick={(e) => {
        if (e.target === e.currentTarget) setComposing(false);
      }}
      aria-labelledby="new-task-title"
      className="animate-sheet mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-full overflow-y-auto rounded-t-3xl bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px] sm:mb-auto sm:max-w-md sm:rounded-3xl dark:bg-zinc-900 dark:text-zinc-100"
    >
      <NewTaskForm
        key={formKey}
        today={today}
        me={me}
        onCancel={() => setComposing(false)}
        onSubmit={(formData, text, lands) => {
          setComposing(false);
          addTask(formData, text, lands);
        }}
      />
    </dialog>
  );
}

function NewTaskForm({
  today,
  me,
  onCancel,
  onSubmit,
}: {
  today: string;
  me: User;
  onCancel: () => void;
  onSubmit: (formData: FormData, text: string, lands: SectionId) => void;
}) {
  const tomorrow = addDays(today, 1);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Kind>("once");
  const [dueDate, setDueDate] = useState(today);
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignee, setAssignee] = useState<Assignee>("each");

  const whoOptions: { value: Assignee; icon: string; label: string; hint: string }[] = [
    { value: "each", icon: "👥", label: "Each of us", hint: "both tick their own" },
    { value: "either", icon: "🤝", label: "Either of us", hint: "one tick is enough" },
    { value: me, icon: "👤", label: "Only me", hint: DISPLAY_NAMES[me] },
    { value: otherUser(me), icon: "👤", label: `Only ${DISPLAY_NAMES[otherUser(me)]}`, hint: "just them" },
  ];

  const sameDays = (preset: number[]) => days.join() === preset.join();
  const toggleDay = (day: number) =>
    setDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b),
    );

  const canSave =
    text.trim().length > 0 && (kind === "once" ? dueDate !== "" : days.length > 0);

  // Which section the new task will show up in.
  const lands: SectionId =
    kind === "once"
      ? dueDate <= today
        ? "today"
        : "upcoming"
      : days.includes(weekdayOf(today)) && isFor(assignee, me)
        ? "today"
        : "repeating";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave) return;
        onSubmit(new FormData(e.currentTarget), text.trim(), lands);
      }}
    >
      {/* Grab handle (phones) + title */}
      <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-zinc-300 sm:hidden dark:bg-zinc-700" />
      <div className="flex items-center justify-between px-5 pt-4 sm:pt-5">
        <h2 id="new-task-title" className="text-base font-semibold">
          New task
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="flex size-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6 px-5 pt-3 pb-5">
        {/* What */}
        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter saves; Shift+Enter adds a new line.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          required
          maxLength={500}
          rows={2}
          autoFocus
          placeholder="What needs to be done?"
          className="w-full resize-none border-0 bg-transparent p-0 text-xl font-medium outline-none placeholder:text-zinc-400"
        />

        {/* Type */}
        <div>
          <input type="hidden" name="kind" value={kind} />
          <div className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            {(
              [
                ["once", "📅", "One-time"],
                ["repeating", "↻", "Repeating"],
              ] as const
            ).map(([value, icon, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                aria-pressed={kind === value}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
                  kind === value
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                <span aria-hidden>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* When */}
        {kind === "once" ? (
          <div>
            <Label>When</Label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDueDate(today)}
                className={`${pill} ${dueDate === today ? pillOn : pillOff}`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDueDate(tomorrow)}
                className={`${pill} ${dueDate === tomorrow ? pillOn : pillOff}`}
              >
                Tomorrow
              </button>
              <label
                className={`${pill} relative cursor-pointer ${
                  dueDate !== today && dueDate !== tomorrow ? pillOn : pillOff
                }`}
              >
                {dueDate !== today && dueDate !== tomorrow && dueDate
                  ? formatDay(dueDate)
                  : "Pick a date…"}
                <input
                  type="date"
                  name="dueDate"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  aria-label="Date"
                  className="absolute inset-0 cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </label>
            </div>
          </div>
        ) : (
          <div>
            <Label>Repeats on</Label>
            {days.map((d) => (
              <input key={d} type="hidden" name="days" value={d} />
            ))}
            <div className="flex justify-between gap-1">
              {DAY_SHORT.map((label, day) => {
                const on = days.includes(day);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-pressed={on}
                    aria-label={label}
                    className={`flex size-10 items-center justify-center rounded-full text-sm font-semibold transition active:scale-90 ${
                      on ? pillOn : pillOff
                    }`}
                  >
                    {label.slice(0, 2)}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {(
                [
                  ["Every day", ALL_DAYS],
                  ["Weekdays", WEEKDAYS],
                  ["Weekends", [0, 6]],
                ] as const
              ).map(([label, preset]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDays([...preset])}
                  className={`rounded-full px-3 py-1 font-medium transition ${
                    sameDays([...preset])
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30"
                      : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {days.length === 0 && (
              <p className="mt-2 text-xs text-red-600">Pick at least one day.</p>
            )}
          </div>
        )}

        {/* Who (repeating only) */}
        {kind === "repeating" && (
          <div>
            <Label>Who does it</Label>
            <input type="hidden" name="assignee" value={assignee} />
            <div className="grid grid-cols-2 gap-2">
              {whoOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setAssignee(o.value)}
                  aria-pressed={assignee === o.value}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left transition active:scale-95 ${
                    assignee === o.value ? pillOn : pillOff
                  }`}
                >
                  <span aria-hidden className="text-base">
                    {o.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span
                      className={`block truncate text-[11px] ${
                        assignee === o.value ? "text-white/80" : "text-zinc-500"
                      }`}
                    >
                      {o.hint}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Priority */}
        <div>
          <Label>Priority</Label>
          <input type="hidden" name="priority" value={priority} />
          <div className="grid grid-cols-3 gap-2">
            {PRIORITY_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                aria-pressed={priority === p.value}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition active:scale-95 ${
                  priority === p.value ? p.on : pillOff
                }`}
              >
                {priority !== p.value && <span className={`size-2 rounded-full ${p.dot}`} />}
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Where */}
        <div>
          <Label>Place</Label>
          <PlacePicker placeholder="Search Google Maps (optional)" />
        </div>
      </div>

      {/* Actions */}
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
          disabled={!canSave}
          className="flex-[2] rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-40"
        >
          Add task
        </button>
      </div>
    </form>
  );
}
