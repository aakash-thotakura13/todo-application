"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useBoard, type SectionId } from "./board-shell";

export type MenuItem = { id: SectionId; label: string; icon: string; count: number };

/**
 * A round menu bubble fixed to the bottom of the screen. Tapping it fans out
 * the sections; picking one shows only that section and folds the menu back up.
 */
export function SectionMenu({ items }: { items: MenuItem[] }) {
  const { active, show, setComposing } = useBoard();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape or a tap anywhere else.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const current = items.find((i) => i.id === active);
  const entries = [
    ...items.map((item) => ({ ...item, onPick: () => show(item.id) })),
    { id: "expenses", label: "Expenses", icon: "₹", count: null, onPick: () => router.push("/expenses") },
    { id: "new", label: "New task", icon: "＋", count: null, onPick: () => setComposing(true) },
  ];

  return (
    <div
      ref={rootRef}
      className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6"
    >
      <nav aria-label="Sections" aria-hidden={!open}>
        <ul className="flex flex-col items-end gap-2">
          {entries.map((item, i) => {
            const selected = item.id === active;
            return (
              <li
                key={item.id}
                // Fan out bottom-up when opening, fold top-down when closing.
                style={{ transitionDelay: `${(open ? entries.length - 1 - i : i) * 35}ms` }}
                className={`origin-bottom-right transition-all duration-200 ease-out ${
                  open
                    ? "translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none translate-y-6 scale-75 opacity-0"
                }`}
              >
                <button
                  type="button"
                  tabIndex={open ? 0 : -1}
                  aria-current={selected ? "page" : undefined}
                  onClick={() => {
                    item.onPick();
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-full py-2 pl-4 text-sm font-medium shadow-lg ring-1 transition ${
                    item.count === null ? "pr-4" : "pr-2"
                  } ${
                    selected
                      ? "bg-blue-600 text-white ring-blue-600"
                      : item.id === "new"
                        ? "bg-zinc-900 text-white ring-zinc-900 dark:bg-white dark:text-zinc-900 dark:ring-white"
                        : "bg-white text-zinc-800 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700"
                  }`}
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                  {item.count !== null && (
                    <span
                      className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs ${
                        selected
                          ? "bg-white/20 text-white"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : `Menu — showing ${current?.label ?? "Today"}`}
        className="relative flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:bg-blue-700 focus-visible:ring-4 focus-visible:ring-blue-500/40 focus-visible:outline-none active:scale-95"
      >
        {/* Three lines that turn into an ✕ */}
        <span className="relative block h-4 w-5" aria-hidden>
          <span
            className={`absolute left-0 h-0.5 w-5 rounded bg-current transition-all duration-200 ${
              open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute top-1/2 left-0 h-0.5 w-5 -translate-y-1/2 rounded bg-current transition-opacity duration-200 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 h-0.5 w-5 rounded bg-current transition-all duration-200 ${
              open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"
            }`}
          />
        </span>
      </button>
    </div>
  );
}
