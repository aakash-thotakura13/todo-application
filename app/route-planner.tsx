"use client";

import { useState } from "react";
import { planRoute } from "./actions";
import { PlacePicker } from "./place-picker";
import {
  formatDistance,
  formatDuration,
  navigationLinks,
  type Place,
  type RoutePoint,
  type TravelMode,
} from "@/lib/place";
import type { Priority } from "@/lib/db";

export type RouteStop = {
  taskId: string;
  text: string;
  priority: Priority;
  place: Place;
};

type Plan = {
  origin: RoutePoint;
  startLabel: string;
  fromLiveLocation: boolean;
  stops: RouteStop[]; // in visiting order
  legs: { distanceMeters: number; durationSeconds: number }[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  mode: TravelMode;
};

const PRIORITY_DOT: Record<Priority, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-zinc-400",
};

function currentLocation(): Promise<RoutePoint> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

export function RoutePlanner({
  stops,
  missingPlaces,
}: {
  stops: RouteStop[];
  missingPlaces: number; // today's pending tasks that have no place
}) {
  const [open, setOpen] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]); // unticked task ids
  const [mode, setMode] = useState<TravelMode>("DRIVE");
  const [startPlace, setStartPlace] = useState<Place | null>(null);
  const [pickStart, setPickStart] = useState(false);
  const [status, setStatus] = useState<"idle" | "locating" | "planning">("idle");
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);

  const chosen = stops.filter((s) => !skipped.includes(s.taskId));

  if (!open) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={stops.length === 0}
          className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:border-zinc-300 disabled:text-zinc-400 disabled:hover:bg-transparent dark:hover:bg-blue-500/10 dark:disabled:border-zinc-700"
        >
          🧭 Plan today&apos;s route{stops.length > 0 && ` (${stops.length} stops)`}
        </button>
        {stops.length === 0 && (
          <span className="text-xs text-zinc-400">Add places to today&apos;s tasks to plan a route.</span>
        )}
      </div>
    );
  }

  function toggle(taskId: string) {
    setSkipped((s) => (s.includes(taskId) ? s.filter((id) => id !== taskId) : [...s, taskId]));
    setPlan(null);
  }

  async function makePlan() {
    setError(null);
    setPlan(null);

    let origin: RoutePoint;
    let startLabel: string;
    let fromLiveLocation = false;

    if (startPlace) {
      origin = { lat: startPlace.lat, lng: startPlace.lng, placeId: startPlace.id };
      startLabel = startPlace.name;
    } else {
      setStatus("locating");
      try {
        origin = await currentLocation();
        startLabel = "Your location";
        fromLiveLocation = true;
      } catch {
        setStatus("idle");
        setPickStart(true);
        setError(
          "Couldn't get your location. Allow location access for this site, or pick a starting place below.",
        );
        return;
      }
    }

    setStatus("planning");
    try {
      const result = await planRoute({
        origin: { lat: origin.lat, lng: origin.lng },
        taskIds: chosen.map((s) => s.taskId),
        mode,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const byId = new Map(chosen.map((s) => [s.taskId, s]));
      setPlan({
        origin,
        startLabel,
        fromLiveLocation,
        stops: result.order.flatMap((id) => byId.get(id) ?? []),
        legs: result.legs,
        totalDistanceMeters: result.totalDistanceMeters,
        totalDurationSeconds: result.totalDurationSeconds,
        mode,
      });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setStatus("idle");
    }
  }

  const links = plan
    ? navigationLinks({
        origin: plan.fromLiveLocation ? null : plan.origin,
        points: [
          ...plan.stops.map((s) => ({ lat: s.place.lat, lng: s.place.lng, placeId: s.place.id })),
          plan.origin, // back to the start
        ],
        mode: plan.mode,
      })
    : [];

  const busy = status !== "idle";

  return (
    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-500/30 dark:bg-blue-500/5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          🧭 Plan today&apos;s route
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close route planner"
          className="px-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          ✕
        </button>
      </div>

      {/* Which stops */}
      <ul className="space-y-1.5">
        {stops.map((s) => (
          <li key={s.taskId}>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={!skipped.includes(s.taskId)}
                onChange={() => toggle(s.taskId)}
                className="mt-1 size-4 accent-blue-600"
              />
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${PRIORITY_DOT[s.priority]}`} />
              <span className="min-w-0">
                <span className="text-zinc-900 dark:text-zinc-100">{s.text}</span>
                <span className="block truncate text-xs text-zinc-500">📍 {s.place.name}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {missingPlaces > 0 && (
        <p className="mt-2 text-xs text-zinc-500">
          {missingPlaces} of today&apos;s {missingPlaces === 1 ? "task has" : "tasks have"} no place
          and {missingPlaces === 1 ? "is" : "are"} left out.
        </p>
      )}

      {/* How and from where */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div className="inline-flex rounded-lg bg-white p-0.5 dark:bg-zinc-800">
          {(["DRIVE", "TWO_WHEELER"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setPlan(null);
              }}
              aria-pressed={mode === m}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                mode === m ? "bg-blue-600 text-white" : "text-zinc-500"
              }`}
            >
              {m === "DRIVE" ? "🚗 Car" : "🛵 Two-wheeler"}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-500">
          Start &amp; finish:{" "}
          {startPlace ? (
            <>
              <b className="font-medium text-zinc-700 dark:text-zinc-300">{startPlace.name}</b>{" "}
              <button
                type="button"
                onClick={() => {
                  setStartPlace(null);
                  setPickStart(false);
                  setPlan(null);
                }}
                className="text-blue-600 hover:underline"
              >
                use my location
              </button>
            </>
          ) : (
            <>
              <b className="font-medium text-zinc-700 dark:text-zinc-300">your current location</b>{" "}
              {!pickStart && (
                <button
                  type="button"
                  onClick={() => setPickStart(true)}
                  className="text-blue-600 hover:underline"
                >
                  change
                </button>
              )}
            </>
          )}
        </span>
      </div>
      {pickStart && !startPlace && (
        <div className="mt-2">
          <PlacePicker
            name="start"
            placeholder="Starting place, e.g. Home or Office"
            onChange={(p) => {
              setStartPlace(p);
              setPlan(null);
              if (p) setError(null);
            }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={makePlan}
        disabled={busy || chosen.length === 0}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {status === "locating"
          ? "Finding your location…"
          : status === "planning"
            ? "Planning the best route…"
            : plan
              ? "Re-plan"
              : `Plan best route (${chosen.length} ${chosen.length === 1 ? "stop" : "stops"})`}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {/* The plan */}
      {plan && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Best order · {formatDistance(plan.totalDistanceMeters)} ·{" "}
            {formatDuration(plan.totalDurationSeconds)} round trip
          </p>

          <ol className="mt-3 space-y-3 text-sm">
            <li className="flex gap-3 text-zinc-500">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs dark:bg-zinc-700">
                ⌂
              </span>
              <span className="pt-0.5">Start: {plan.startLabel}</span>
            </li>
            {plan.stops.map((s, i) => (
              <li key={s.taskId} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="text-zinc-900 dark:text-zinc-100">{s.text}</span>
                  <span className="block text-xs text-zinc-500">
                    📍 {s.place.name}
                    {plan.legs[i] &&
                      ` · ${formatDistance(plan.legs[i].distanceMeters)}, ${formatDuration(plan.legs[i].durationSeconds)} from the previous stop`}
                  </span>
                </span>
              </li>
            ))}
            <li className="flex gap-3 text-zinc-500">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs dark:bg-zinc-700">
                ⌂
              </span>
              <span className="pt-0.5">
                Back to {plan.fromLiveLocation ? "where you started" : plan.startLabel}
                {plan.legs[plan.stops.length] &&
                  ` · ${formatDistance(plan.legs[plan.stops.length].distanceMeters)}, ${formatDuration(plan.legs[plan.stops.length].durationSeconds)}`}
              </span>
            </li>
          </ol>

          <div className="mt-4 flex flex-wrap gap-2">
            {links.map((href, i) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                {links.length === 1 ? "▶ Start navigation" : `▶ Navigate part ${i + 1} of ${links.length}`}
              </a>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Opens Google Maps with every stop in this order. On a phone, open it in the Google Maps
            app — phone browsers show only the first 3 stops.
          </p>
        </div>
      )}
    </div>
  );
}
