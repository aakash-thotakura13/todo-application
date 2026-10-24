"use client";

// Client-side state for the board: which section is showing, whether the
// new-task pop-up is open, and tasks that are still being saved.
import {
  createContext,
  useContext,
  useEffect,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createTask } from "./actions";
import { reportSaveError } from "./instant";

export const SECTIONS = ["today", "upcoming", "repeating", "completed"] as const;
export type SectionId = (typeof SECTIONS)[number];

type BoardApi = {
  active: SectionId;
  show: (id: SectionId) => void;
  composing: boolean;
  setComposing: (open: boolean) => void;
  /** Save a new task in the background and jump to the section it lands in. */
  addTask: (formData: FormData, text: string, lands: SectionId) => void;
  saving: string[];
};

const BoardContext = createContext<BoardApi | null>(null);

export function useBoard() {
  const board = useContext(BoardContext);
  if (!board) throw new Error("useBoard must be used inside <BoardProvider>");
  return board;
}

function isSection(value: string): value is SectionId {
  return (SECTIONS as readonly string[]).includes(value);
}

export function BoardProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<SectionId>("today");
  const [composing, setComposing] = useState(false);
  const [, startTransition] = useTransition();
  const [saving, addSaving] = useOptimistic<string[], string>([], (list, text) => [...list, text]);

  // Reopen the section you were on (kept in the address, e.g. /#upcoming).
  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (isSection(fromHash)) setActive(fromHash);
  }, []);

  function show(id: SectionId) {
    setActive(id);
    try {
      history.replaceState(null, "", `#${id}`);
    } catch {
      // ignore — only affects remembering the section on refresh
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addTask(formData: FormData, text: string, lands: SectionId) {
    if (lands !== active) show(lands);
    startTransition(async () => {
      addSaving(text);
      try {
        await createTask(formData);
      } catch (error) {
        reportSaveError(error);
      }
    });
  }

  return (
    <BoardContext.Provider value={{ active, show, composing, setComposing, addTask, saving }}>
      {children}
    </BoardContext.Provider>
  );
}

/** Shows its children only while its section is selected (kept mounted, so nothing resets). */
export function Panel({ id, children }: { id: SectionId; children: ReactNode }) {
  const { active } = useBoard();
  return (
    <div id={id} hidden={active !== id}>
      {children}
    </div>
  );
}

/** Placeholders for tasks that are still being saved. */
export function SavingList() {
  const { saving } = useBoard();
  if (saving.length === 0) return null;
  return (
    <div className="mb-4 space-y-2">
      {saving.map((text, i) => (
        <p
          key={`${i}-${text}`}
          className="animate-pulse rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700"
        >
          Adding “{text}”…
        </p>
      ))}
    </div>
  );
}

export function NewTaskButton() {
  const { setComposing } = useBoard();
  return (
    <button
      type="button"
      onClick={() => setComposing(true)}
      className="flex items-center gap-1.5 rounded-full bg-blue-600 py-2 pr-4 pl-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
    >
      <span className="text-lg leading-none">+</span> New task
    </button>
  );
}
