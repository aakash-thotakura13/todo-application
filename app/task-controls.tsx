"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  addNextStep,
  completeAndAddNext,
  completeRepeating,
  completeStep,
  removeStep,
  reopenStep,
  undoRepeating,
} from "./actions";
import { reportSaveError, useCard, useInstant } from "./instant";
import { PlacePicker } from "./place-picker";
import { CancelButton, dateInputClass, inputClass } from "./ui";

function focusNewTask() {
  const input = document.getElementById("new-task");
  input?.scrollIntoView({ behavior: "smooth", block: "center" });
  input?.focus();
}

/** Read a form's fields without letting the browser submit it. */
function formDataOf(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  return new FormData(e.currentTarget);
}

function noteOf(formData: FormData) {
  const note = formData.get("note");
  return typeof note === "string" && note.trim() ? note.trim() : null;
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
      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${
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
  saving,
}: {
  text: string;
  meta: string;
  done: boolean;
  note: string | null;
  prominent: boolean;
  saving: boolean;
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
      <p className="mt-0.5 text-xs text-zinc-400">
        {meta}
        {saving && <span className="ml-1.5 animate-pulse text-blue-500">· saving…</span>}
      </p>
      {done && note && (
        <p className="mt-2 rounded-md bg-zinc-50 p-2 text-sm whitespace-pre-wrap text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
          {note}
        </p>
      )}
    </div>
  );
}

/** A faded placeholder for a next step that's still being saved. */
function PendingNextStep({ text }: { text: string }) {
  return (
    <p className="mt-3 ml-8 animate-pulse rounded-md border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700">
      ↳ Next step: {text} <span className="text-xs">· adding…</span>
    </p>
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

type StepView = {
  done: boolean;
  note: string | null;
  nextStep: string | null; // a next step being added
  removing: boolean;
};

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
  const { value: view, isPending, run } = useInstant<StepView>({
    done,
    note,
    nextStep: null,
    removing: false,
  });

  const shownMeta = view.done && !done ? "Done just now" : !view.done && done ? "Reopened" : meta;

  return (
    <div className={view.removing ? "pointer-events-none opacity-40 transition-opacity" : ""}>
      <div className="flex items-start gap-3">
        <Circle
          done={view.done}
          label={view.done ? "Completed" : `Complete "${text}"`}
          onClick={() => setMode(mode === "completing" ? "idle" : "completing")}
        />
        <StepText
          text={text}
          meta={view.removing ? "Removing…" : shownMeta}
          done={view.done}
          note={view.note}
          prominent={prominent}
          saving={isPending && !view.removing}
        />
      </div>

      {mode === "completing" && !view.done && (
        <CompleteBox
          initialNote={view.note ?? ""}
          today={today}
          onComplete={(formData) => {
            setMode("idle");
            run({ ...view, done: true, note: noteOf(formData) }, () => completeStep(id, formData));
          }}
          onAddTask={(formData) => {
            setMode("idle");
            run({ ...view, done: true, nextStep: noteOf(formData) }, () =>
              completeAndAddNext(id, formData),
            );
          }}
          onClose={() => setMode("idle")}
        />
      )}

      {view.nextStep && <PendingNextStep text={view.nextStep} />}

      {view.done && !view.nextStep && mode === "idle" && (
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
          <button
            type="button"
            onClick={() => run({ ...view, done: false }, () => reopenStep(id))}
            className="text-zinc-400 hover:underline"
          >
            Reopen
          </button>
        </div>
      )}

      {mode === "adding" && (
        <form
          onSubmit={(e) => {
            const formData = formDataOf(e);
            const nextText = String(formData.get("text") ?? "").trim();
            if (!nextText) return;
            setMode("idle");
            run({ ...view, nextStep: nextText }, () => addNextStep(id, formData));
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
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add
            </button>
            <CancelButton onClick={() => setMode("idle")} />
          </div>
        </form>
      )}

      {!view.done && canRemove && mode === "idle" && !view.removing && (
        <button
          type="button"
          onClick={() => {
            if (confirm(`Remove the step "${text}"?`)) {
              run({ ...view, removing: true }, () => removeStep(id));
            }
          }}
          className="mt-2 ml-8 text-xs text-zinc-400 hover:text-red-600"
        >
          Remove this step
        </button>
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
  const { value: view, isPending, run } = useInstant({ done, note });

  const shownMeta = view.done && !done ? "Done today (just now)" : !view.done && done ? "Tick undone" : meta;

  return (
    <div>
      <div className="flex items-start gap-3">
        <Circle
          done={view.done}
          label={view.done ? "Done today" : `Tick "${text}" for today`}
          onClick={() => setCompleting(!completing)}
        />
        <StepText
          text={text}
          meta={shownMeta}
          done={view.done}
          note={view.note}
          prominent
          saving={isPending}
        />
      </div>

      {completing && !view.done && (
        <CompleteBox
          initialNote=""
          onComplete={(formData) => {
            setCompleting(false);
            run({ done: true, note: noteOf(formData) }, () => completeRepeating(id, formData));
          }}
          onClose={() => setCompleting(false)}
        />
      )}

      {view.done && (
        <button
          type="button"
          onClick={() => run({ done: false, note: null }, () => undoRepeating(id))}
          className="mt-2 ml-8 text-xs text-zinc-400 hover:underline"
        >
          Undo today&apos;s tick
        </button>
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
  onComplete: (formData: FormData) => void;
  onAddTask?: (formData: FormData) => void;
  onClose: () => void;
}) {
  const [entry, setEntry] = useState(initialNote);
  const canAddTask = entry.trim().length > 0;
  const iconButton =
    "flex size-8 shrink-0 items-center justify-center rounded-lg text-base disabled:opacity-50";

  return (
    <form
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        const formData = formDataOf(e);
        // "Add Task" button → next task; ✓ or Ctrl+Enter → complete with note.
        if (submitter?.dataset.action === "add-task" && onAddTask) onAddTask(formData);
        else onComplete(formData);
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
      {onAddTask && canAddTask && (
        // Only relevant for "Add Task": where the next task happens.
        <PlacePicker placeholder="📍 Place for the next task (optional)" />
      )}

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
              data-action="add-task"
              disabled={!canAddTask}
              title="Complete this step and add the entry as the next task"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Add Task
            </button>
          </>
        )}
        <button
          type="submit"
          data-action="complete"
          aria-label="Mark complete"
          title="Mark complete (entry saved as a note)"
          className={`${iconButton} bg-green-600 text-white hover:bg-green-700`}
        >
          ✓
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className={`${iconButton} text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800`}
        >
          ✕
        </button>
      </div>
    </form>
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
  const card = useCard();
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm(message)) return;
        if (card) {
          card.remove(action); // the card disappears now; the database catches up
        } else {
          startTransition(async () => {
            try {
              await action();
            } catch (error) {
              reportSaveError(error);
            }
          });
        }
      }}
      aria-label={label}
      title={label}
      className="rounded px-2 text-zinc-400 hover:text-red-600"
    >
      ✕
    </button>
  );
}
