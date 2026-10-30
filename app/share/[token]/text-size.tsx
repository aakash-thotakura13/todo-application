"use client";

import { useEffect, useState } from "react";

// Everything on the page is sized in rem, so changing the page's base
// font size makes all text (and spacing) bigger together.
const SIZES = [
  { label: "A", px: 18, name: "Large text" },
  { label: "A+", px: 21, name: "Larger text" },
  { label: "A++", px: 24, name: "Largest text" },
];
const KEY = "share-text-size";

export function TextSizeControl() {
  const [px, setPx] = useState(SIZES[0].px);

  // Remember the choice on this phone.
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(KEY));
      if (SIZES.some((s) => s.px === saved)) setPx(saved);
    } catch {
      // storage unavailable — keep the default
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${px}px`;
    try {
      localStorage.setItem(KEY, String(px));
    } catch {
      // ignore
    }
  }, [px]);

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Text size">
      <span className="text-sm font-medium text-zinc-600">Text size</span>
      {SIZES.map((s, i) => (
        <button
          key={s.px}
          type="button"
          onClick={() => setPx(s.px)}
          aria-label={s.name}
          aria-pressed={px === s.px}
          className={`min-h-12 min-w-12 rounded-xl border-2 px-2 font-bold transition ${
            px === s.px
              ? "border-blue-700 bg-blue-700 text-white"
              : "border-zinc-300 bg-white text-zinc-800"
          }`}
          style={{ fontSize: `${15 + i * 3}px` }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
