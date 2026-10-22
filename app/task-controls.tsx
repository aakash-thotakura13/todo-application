"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  addNextStep,
  completeAndAddNext,
  completeRepeating,
  completeStep,
  removeStep,
  reopenStep,
  undoRepeating,
} from "./actions";
import { PlacePicker } from "./place-picker";
import { CancelButton, dateInputClass, inputClass, SubmitButton } from "./ui";

function focusNewTask() {
  const input = document.getElementById("new-task");
  input?.scrollIntoView({ behavior: "smooth", block: "center" });
  input?.focus();
}

function Circle({
  done,
  label,
  onClick,
}: {
  done: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={done || !onClick}
      onClick={onClick}
      aria-label={label}
      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-xs ${
        done
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-zinc-400 hover:border-blue-600"
      }`}
    >
      {done && "✓"}
    </button>
  );
}

function StepText({
  text,
  meta,
  done,
  note,
  prominent,
}: {
  text: string;
  meta: string;
  done: boolean;
  note: string | null;
  prominent: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p
        className={`${prominent ? "font-semibold" : ""} ${
          done ? "text-zinc-500 line-through" : "text-zinc-900 dark:text-zinc-100"
        }`}
      >
        {text}
      </p>
      <p className="mt-0.5 text-xs text-zinc-400">{meta}</p>
      {done && note && (
        <p className="mt-2 rounded-md bg-zinc-50 p-2 text-sm whitespace-pre-wrap text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
          {note}
        </p>
      )}
    </div>
  );
}

/* ---------- One-time task: the current step of a chain ---------- */

type CurrentStepProps = {
  id: string;
  text: string;
  meta: string;
  done: boolean;
  note: string | null;
  canRemove: boolean; // false for the first step of a chain
  prominent: boolean; // true when this step is also the card's heading
  today: string;
};

type Mode = "idle" | "completing" | "adding";

export function CurrentStep({
  id,
  text,
  meta,
  done,
  note,
  canRemove,
  prominent,
  today,
}: CurrentStepProps) {
  const [mode, setMode] = useState<Mode>("idle");

  return (
    <div>
      <div className="flex items-start gap-3">
        <Circle
          done={done}
          label={done ? "Completed" : `Complete "${text}"`}
          onClick={() => setMode(mode === "completing" ? "idle" : "completing")}
        />
        <StepText text={text} meta={meta} done={done} note={note} prominent={prominent} />
      </div>

      {mode === "completing" && !done && (
        <CompleteBox
          initialNote={note ?? ""}
          today={today}
          onComplete={(formData) => completeStep(id, formData)}
          onAddTask={(formData) => completeAndAddNext(id, formData)}
          onClose={() => setMode("idle")}
        />
      )}

      {done && mode === "idle" && (
        <div className="mt-3 ml-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("adding")}
            className="font-medium text-blue-600 hover:underline"
          >
            + Add next step
          </button>
          <button
            type="button"
            onClick={focusNewTask}
            className="text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Start a new task
          </button>
          <form action={reopenStep.bind(null, id)}>
            <button type="submit" className="text-zinc-400 hover:underline">
              Reopen
            </button>
          </form>
        </div>
      )}

      {mode === "adding" && (
        <form
          action={async (formData) => {
            await addNextStep(id, formData);
            setMode("idle");
          }}
          className="mt-3 ml-8 space-y-2"
        >
          <input
            name="text"
            required
            maxLength={500}
            autoFocus
            placeholder="Next step, e.g. Apply client changes"
            className={inputClass}
          />
          <PlacePicker />
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              name="dueDate"
              required
              defaultValue={today}
              aria-label="Date for the next step"
              className={dateInputClass}
            />
            <SubmitButton>Add</SubmitButton>
            <CancelButton onClick={() => setMode("idle")} />
          </div>
        </form>
      )}

      {!done && canRemove && mode === "idle" && (
        <form action={removeStep.bind(null, id)} className="mt-2 ml-8">
          <button
            type="submit"
            onClick={(e) => {
              if (!confirm(`Remove the step "${text}"?`)) e.preventDefault();
            }}
            className="text-xs text-zinc-400 hover:text-red-600"
          >
            Remove this step
          </button>
        </form>
      )}
    </div>
  );
}

/* ---------- Repeating task: today's tick ---------- */

export function RepeatingStep({
  id,
  text,
  meta,
  done,
  note,
}: {
  id: string;
  text: string;
  meta: string;
  done: boolean;
  note: string | null;
}) {
  const [completing, setCompleting] = useState(false);

  return (
    <div>
      <div className="flex items-start gap-3">
        <Circle
          done={done}
          label={done ? "Done today" : `Tick "${text}" for today`}
          onClick={() => setCompleting(!completing)}
        />
        <StepText text={text} meta={meta} done={done} note={note} prominent />
      </div>

      {completing && !done && (
        <CompleteBox
          initialNote=""
          onComplete={(formData) => completeRepeating(id, formData)}
          onClose={() => setCompleting(false)}
        />
      )}

      {done && (
        <form action={undoRepeating.bind(null, id)} className="mt-2 ml-8">
          <button type="submit" className="text-xs text-zinc-400 hover:underline">
            Undo today&apos;s tick
          </button>
        </form>
      )}
    </div>
  );
}

/* ---------- The box that opens when you tap the circle ---------- */

function CompleteBox({
  initialNote,
  today,
  onComplete,
  onAddTask,
  onClose,
}: {
  initialNote: string;
  today?: string;
  onComplete: (formData: FormData) => Promise<void>;
  onAddTask?: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [entry, setEntry] = useState(initialNote);

  return (
    <form
      // ✓ (or Ctrl+Enter) completes with the entry as a note.
      action={async (formData) => {
        await onComplete(formData);
        onClose();
      }}
      className="mt-3 ml-8 space-y-2"
    >
      <textarea
        name="note"
        rows={3}
        maxLength={5000}
        value={entry}
        onChange={(e) => setEntry(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
        }}
        autoFocus
        aria-label={onAddTask ? "Note or next task" : "Note"}
        placeholder={
          onAddTask
            ? "Write how it was done (✓), or type the next task (Add Task)…"
            : "How did it go today? (optional)"
        }
        className={inputClass}
      />
      {onAddTask && entry.trim() && (
        // Only relevant for "Add Task": where the next task happens.
        <PlacePicker placeholder="📍 Place for the next task (optional)" />
      )}
      <CompleteBoxButtons
        canAddTask={entry.trim().length > 0}
        today={today}
        onAddTask={
          onAddTask &&
          (async (formData) => {
            await onAddTask(formData);
            onClose();
          })
        }
        onClose={onClose}
      />
    </form>
  );
}

function CompleteBoxButtons({
  canAddTask,
  today,
  onAddTask,
  onClose,
}: {
  canAddTask: boolean;
  today?: string;
  onAddTask?: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const { pending } = useFormStatus();
  const iconButton =
    "flex size-8 shrink-0 items-center justify-center rounded-lg text-base disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onAddTask && (
        <>
          <input
            type="date"
            name="dueDate"
            defaultValue={today}
            aria-label="Date for the next task"
            title="Date for the next task"
            className={dateInputClass}
          />
          <button
            type="submit"
            formAction={onAddTask}
            disabled={pending || !canAddTask}
            title="Complete this step and add the entry as the next task"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Add Task
          </button>
        </>
      )}
      <button
        type="submit"
        disabled={pending}
        aria-label="Mark complete"
        title="Mark complete (entry saved as a note)"
        className={`${iconButton} bg-green-600 text-white hover:bg-green-700`}
      >
        ✓
      </button>
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        aria-label="Close"
        title="Close"
        className={`${iconButton} text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800`}
      >
        ✕
      </button>
      {pending && <span className="text-xs text-zinc-400">Saving…</span>}
    </div>
  );
}

/* ---------- Delete with confirmation ---------- */

export function DeleteButton({
  action,
  label,
  message,
}: {
  action: () => Promise<void>;
  label: string;
  message: string;
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm(message)) e.preventDefault();
        }}
        aria-label={label}
        title={label}
        className="rounded px-2 text-zinc-400 hover:text-red-600"
      >
        ✕
      </button>
    </form>
  );
}
