"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { setTaskPlace } from "./actions";
import { useInstant } from "./instant";
import { CancelButton, inputClass } from "./ui";
import { placeLink, type Place } from "@/lib/place";

type Suggestion = { placeId: string; name: string; secondary: string };

/**
 * Search-as-you-type place field (Google Places).
 * Submits the chosen place as JSON in a hidden input called `name`.
 */
export function PlacePicker({
  name = "place",
  initial = null,
  placeholder = "📍 Place (optional) — search Google Maps",
  autoFocus = false,
  onChange,
}: {
  name?: string;
  initial?: Place | null;
  placeholder?: string;
  autoFocus?: boolean;
  onChange?: (place: Place | null) => void;
}) {
  const [place, setPlace] = useState<Place | null>(initial);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One "session" per search keeps Google's autocomplete billing low.
  const session = useRef("");
  const listId = useId();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!session.current) session.current = crypto.randomUUID();
      setLoading(true);
      try {
        const res = await fetch(
          `/api/places/autocomplete?q=${encodeURIComponent(q)}&session=${session.current}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Place search failed.");
        setSuggestions(data.suggestions);
        setActive(0);
        setError(null);
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : "Place search failed.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function choose(next: Place | null) {
    setPlace(next);
    onChange?.(next);
  }

  async function select(s: Suggestion) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/places/details?id=${encodeURIComponent(s.placeId)}&session=${session.current}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't load that place.");
      choose({ id: data.id, name: s.name, address: data.address, lat: data.lat, lng: data.lng });
      setQuery("");
      setSuggestions([]);
      setError(null);
      session.current = ""; // the next search starts a new session
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load that place.");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && query.trim()) {
      // Don't submit the form with a half-typed place.
      e.preventDefault();
      if (suggestions[active]) select(suggestions[active]);
    } else if (e.key === "Escape" && suggestions.length) {
      e.stopPropagation();
      setSuggestions([]);
    }
  }

  return (
    <div className="relative min-w-0">
      <input type="hidden" name={name} value={place ? JSON.stringify(place) : ""} />

      {place ? (
        <div className="flex items-start gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
          <span aria-hidden>📍</span>
          <span className="min-w-0 flex-1">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{place.name}</span>
            <span className="block truncate text-xs text-zinc-500">{place.address}</span>
          </span>
          <button
            type="button"
            onClick={() => choose(null)}
            aria-label="Remove place"
            className="text-zinc-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls={listId}
            aria-label="Place"
            className={inputClass}
          />
          {loading && (
            <span className="absolute top-2.5 right-3 text-xs text-zinc-400">…</span>
          )}
          {suggestions.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            >
              {suggestions.map((s, i) => (
                <li key={s.placeId} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(s)}
                    onMouseEnter={() => setActive(i)}
                    className={`block w-full px-3 py-2 text-left text-sm ${
                      i === active ? "bg-blue-50 dark:bg-blue-500/10" : ""
                    }`}
                  >
                    <span className="text-zinc-900 dark:text-zinc-100">{s.name}</span>
                    <span className="block truncate text-xs text-zinc-500">{s.secondary}</span>
                  </button>
                </li>
              ))}
              <li className="px-3 py-1 text-right text-[10px] text-zinc-400">Powered by Google</li>
            </ul>
          )}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}

/** Shows a task's place with links, and lets you add, change or remove it. */
export function PlaceEditor({
  taskId,
  place,
  indent = true,
}: {
  taskId: string;
  place: Place | null;
  indent?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<Place | null>(null);
  const { value: shown, isPending, run } = useInstant(place);
  const margin = indent ? "ml-8" : "";

  function save(next: Place | null) {
    const formData = new FormData();
    formData.set("place", next ? JSON.stringify(next) : "");
    setEditing(false);
    run(next, () => setTaskPlace(taskId, formData));
  }

  if (editing) {
    return (
      <div className={`mt-2 space-y-2 ${margin}`}>
        <PlacePicker autoFocus placeholder="Search Google Maps…" onChange={setPicked} />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!picked}
            onClick={() => save(picked)}
            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save place
          </button>
          <CancelButton onClick={() => setEditing(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${margin}`}>
      {shown ? (
        <>
          <a
            href={placeLink(shown)}
            target="_blank"
            rel="noreferrer"
            title={shown.address}
            className="text-zinc-600 hover:underline dark:text-zinc-400"
          >
            📍 {shown.name}
          </a>
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setEditing(true);
            }}
            className="text-zinc-400 hover:underline"
          >
            Change
          </button>
          <button
            type="button"
            onClick={() => save(null)}
            className="text-zinc-400 hover:text-red-600"
          >
            Remove
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            setPicked(null);
            setEditing(true);
          }}
          className="text-zinc-400 hover:text-blue-600"
        >
          📍 Add place
        </button>
      )}
      {isPending && <span className="animate-pulse text-blue-500">saving…</span>}
    </div>
  );
}
