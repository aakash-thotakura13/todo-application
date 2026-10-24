"use client";

// "Optimistic" updates: show a change on screen immediately, save it in the
// background, and fall back to the real data once the server answers.
// If saving fails, the change is undone on screen and the user is told.
import {
  createContext,
  useContext,
  useOptimistic,
  useTransition,
  type ReactNode,
} from "react";

export function reportSaveError(error: unknown) {
  console.error(error);
  alert("Couldn't save that change. Please check your connection and try again.");
}

/**
 * `value` starts as `serverValue`. `run(next, save)` shows `next` right away
 * while `save()` runs; when the page refreshes with new data, `value`
 * follows the server again.
 */
export function useInstant<T>(serverValue: T) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useOptimistic(serverValue);

  function run(next: T, save: () => Promise<unknown>) {
    startTransition(async () => {
      setValue(next);
      try {
        await save();
      } catch (error) {
        reportSaveError(error);
      }
    });
  }

  return { value, isPending, run };
}

/* ---------- Cards that vanish instantly when deleted ---------- */

type CardApi = { remove: (save: () => Promise<unknown>) => void };
const CardContext = createContext<CardApi | null>(null);

export function useCard() {
  return useContext(CardContext);
}

/** A list item that can hide itself the moment its delete button is pressed. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  const { value: removed, run } = useInstant(false);
  if (removed) return null;

  return (
    <CardContext.Provider value={{ remove: (save) => run(true, save) }}>
      <li className={className}>{children}</li>
    </CardContext.Provider>
  );
}
