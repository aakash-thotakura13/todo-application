// Places attached to tasks, plus Google Maps link builders.
// Safe to import from both server and client code.

export type Place = {
  id: string; // Google place ID
  name: string; // e.g. "Phoenix Marketcity"
  address: string; // full formatted address
  lat: number;
  lng: number;
};

export type LatLng = { lat: number; lng: number };

export type TravelMode = "DRIVE" | "TWO_WHEELER";
export const TRAVEL_MODES: TravelMode[] = ["DRIVE", "TWO_WHEELER"];

/** Read a place sent from a form (JSON in a hidden input). Returns null if empty or invalid. */
export function parsePlace(value: unknown): Place | null {
  if (typeof value !== "string" || value === "") return null;
  try {
    const p: unknown = JSON.parse(value);
    if (!p || typeof p !== "object") return null;
    const { id, name, address, lat, lng } = p as Record<string, unknown>;
    const point = { lat, lng };
    if (
      typeof id === "string" &&
      typeof name === "string" &&
      typeof address === "string" &&
      isLatLng(point)
    ) {
      return {
        id: id.slice(0, 300),
        name: name.slice(0, 200),
        address: address.slice(0, 300),
        lat: point.lat,
        lng: point.lng,
      };
    }
  } catch {
    // fall through
  }
  return null;
}

export function isLatLng(p: unknown): p is LatLng {
  const v = p as LatLng | null;
  return (
    typeof v?.lat === "number" &&
    typeof v.lng === "number" &&
    Number.isFinite(v.lat) &&
    Number.isFinite(v.lng) &&
    Math.abs(v.lat) <= 90 &&
    Math.abs(v.lng) <= 180
  );
}

/** Opens one place in Google Maps. */
export function placeLink(place: Place) {
  const params = new URLSearchParams({
    api: "1",
    query: `${place.lat},${place.lng}`,
    query_place_id: place.id,
  });
  return `https://www.google.com/maps/search/?${params}`;
}

export type PlanRouteResult =
  | {
      ok: true;
      order: string[]; // task ids in the best visiting order
      legs: { distanceMeters: number; durationSeconds: number }[]; // one per stop + the trip back
      totalDistanceMeters: number;
      totalDurationSeconds: number;
    }
  | { ok: false; error: string };

export type RoutePoint = LatLng & { placeId?: string };

const URL_MODE: Record<TravelMode, string> = {
  DRIVE: "driving",
  TWO_WHEELER: "two-wheeler",
};

// A Google Maps link holds a destination plus at most 9 waypoints.
const POINTS_PER_LINK = 10;

/**
 * Google Maps navigation links that visit `points` in the given order.
 * With `origin` null, Google starts from the phone's live location.
 * Long trips are split into several links (parts).
 */
export function navigationLinks({
  origin,
  points,
  mode,
}: {
  origin: RoutePoint | null;
  points: RoutePoint[];
  mode: TravelMode;
}): string[] {
  const coords = (p: LatLng) => `${p.lat},${p.lng}`;
  const links: string[] = [];
  let from = origin;

  for (let i = 0; i < points.length; i += POINTS_PER_LINK) {
    const chunk = points.slice(i, i + POINTS_PER_LINK);
    const destination = chunk[chunk.length - 1];
    const waypoints = chunk.slice(0, -1);

    const params = new URLSearchParams({ api: "1", travelmode: URL_MODE[mode] });
    if (from) {
      params.set("origin", coords(from));
      if (from.placeId) params.set("origin_place_id", from.placeId);
    } else {
      params.set("dir_action", "navigate"); // start turn-by-turn from where you are
    }
    params.set("destination", coords(destination));
    if (destination.placeId) params.set("destination_place_id", destination.placeId);
    if (waypoints.length > 0) {
      params.set("waypoints", waypoints.map(coords).join("|"));
      if (waypoints.every((w) => w.placeId)) {
        params.set("waypoint_place_ids", waypoints.map((w) => w.placeId).join("|"));
      }
    }

    links.push(`https://www.google.com/maps/dir/?${params}`);
    from = destination;
  }
  return links;
}

export function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
