"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  addNextStep,
  completeAndAddNext,
  completeStep,
  deleteChain,
  removeStep,
  reopenStep,
} from "./actions";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:text-zinc-100";

function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      Cancel
    </button>
  );
}

function focusNewTask() {
  const input = document.getElementById("new-task");
  input?.scrollIntoView({ behavior: "smooth", block: "center" });
  input?.focus();
}

type CurrentStepProps = {
  id: string;
  text: string;
  meta: string;
  done: boolean;
  note: string | null;
  canRemove: boolean; // false for the first step of a chain
  prominent: boolean; // true when this step is also the card's heading
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
}: CurrentStepProps) {
  const [mode, setMode] = useState<Mode>("idle");

  return (
    <div>
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={done}
          onClick={() => setMode(mode === "completing" ? "idle" : "completing")}
          aria-label={done ? "Completed" : `Complete "${text}"`}
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-xs ${
            done
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-zinc-400 hover:border-blue-600"
          }`}
        >
          {done && "✓"}
        </button>

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
      </div>

      {/* Completing: type a note (✓) or the next task (Add Task) */}
      {mode === "completing" && !done && (
        <CompleteBox id={id} initialNote={note ?? ""} onClose={() => setMode("idle")} />
      )}

      {/* Completed: what's next? */}
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
          className="mt-3 ml-8 flex gap-2"
        >
          <input
            name="text"
            required
            maxLength={500}
            autoFocus
            placeholder="Next step, e.g. Apply client changes"
            className={inputClass}
          />
          <SubmitButton>Add</SubmitButton>
          <CancelButton onClick={() => setMode("idle")} />
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

function CompleteBox({
  id,
  initialNote,
  onClose,
}: {
  id: string;
  initialNote: string;
  onClose: () => void;
}) {
  const [entry, setEntry] = useState(initialNote);

  return (
    <form
      // Pressing ✓ (or Ctrl+Enter) completes the step with the entry as its note.
      action={async (formData) => {
        await completeStep(id, formData);
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
        aria-label="Note or next task"
        placeholder="Write how it was done (✓), or type the next task (Add Task)…"
        className={inputClass}
      />
      <CompleteBoxButtons
        canAddTask={entry.trim().length > 0}
        onAddTask={async (formData) => {
          await completeAndAddNext(id, formData);
          onClose();
        }}
        onClose={onClose}
      />
    </form>
  );
}

function CompleteBoxButtons({
  canAddTask,
  onAddTask,
  onClose,
}: {
  canAddTask: boolean;
  onAddTask: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const { pending } = useFormStatus();
  const iconButton =
    "flex size-8 items-center justify-center rounded-lg text-base disabled:opacity-50";

  return (
    <div className="flex items-center gap-2">
      <button
        type="submit"
        formAction={onAddTask}
        disabled={pending || !canAddTask}
        title="Complete this step and add the entry as the next task"
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Add Task
      </button>
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

export function DeleteChainButton({
  chainId,
  title,
  stepCount,
}: {
  chainId: string;
  title: string;
  stepCount: number;
}) {
  const message =
    stepCount > 1
      ? `Delete "${title}" and all ${stepCount} steps? This can't be undone.`
      : `Delete "${title}"? This can't be undone.`;

  return (
    <form action={deleteChain.bind(null, chainId)}>
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm(message)) e.preventDefault();
        }}
        aria-label={`Delete "${title}"`}
        className="rounded px-2 text-zinc-400 hover:text-red-600"
      >
        ✕
      </button>
    </form>
  );
}
