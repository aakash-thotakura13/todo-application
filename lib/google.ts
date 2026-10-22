// Server-side calls to Google Maps Platform.
// The API key stays on the server and is never sent to the browser.
import type { LatLng, TravelMode } from "./place";

export class MapsError extends Error {}

function apiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new MapsError(
      "Google Maps isn't set up yet: add GOOGLE_MAPS_API_KEY to your environment variables.",
    );
  }
  return key;
}

async function readJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message: string | undefined = data?.error?.message;
    if (res.status === 403) {
      throw new MapsError(
        `Google refused the request${message ? `: ${message}` : ""}. Check that "Places API (New)" and "Routes API" are enabled for your key and billing is on.`,
      );
    }
    throw new MapsError(message ?? `Google Maps returned an error (${res.status}).`);
  }
  return data as T;
}

/* ---------- Places: search as you type ---------- */

export type Suggestion = { placeId: string; name: string; secondary: string };

type AutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId: string;
      text?: { text: string };
      structuredFormat?: {
        mainText?: { text: string };
        secondaryText?: { text: string };
      };
    };
  }[];
};

export async function autocomplete(input: string, sessionToken: string): Promise<Suggestion[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
    },
    body: JSON.stringify({
      input,
      sessionToken: sessionToken || undefined,
      regionCode: "in",
      languageCode: "en",
    }),
    cache: "no-store",
  });
  const data = await readJson<AutocompleteResponse>(res);

  return (data.suggestions ?? []).flatMap(({ placePrediction: p }) =>
    p
      ? [
          {
            placeId: p.placeId,
            name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
            secondary: p.structuredFormat?.secondaryText?.text ?? "",
          },
        ]
      : [],
  );
}

/* ---------- Places: details for the chosen suggestion ---------- */

type DetailsResponse = {
  id: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
};

export async function placeDetails(placeId: string, sessionToken: string) {
  const params = new URLSearchParams({ languageCode: "en" });
  if (sessionToken) params.set("sessionToken", sessionToken);

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?${params}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey(),
        // Only "Essentials" fields, to stay in the cheapest tier.
        "X-Goog-FieldMask": "id,formattedAddress,location",
      },
      cache: "no-store",
    },
  );
  const data = await readJson<DetailsResponse>(res);
  if (!data.location) throw new MapsError("Google didn't return a location for that place.");

  return {
    id: data.id,
    address: data.formattedAddress ?? "",
    lat: data.location.latitude,
    lng: data.location.longitude,
  };
}

/* ---------- Routes: best order to visit several stops ---------- */

type RoutesResponse = {
  routes?: {
    optimizedIntermediateWaypointIndex?: number[];
    distanceMeters?: number;
    duration?: string; // e.g. "1234s"
    legs?: { distanceMeters?: number; duration?: string }[];
  }[];
};

const seconds = (d?: string) => (d ? parseInt(d, 10) || 0 : 0);

/**
 * A round trip from `origin` through every stop and back, with the stops
 * reordered by Google to make the trip as short as possible.
 * `order` lists indexes into `stops` in visiting order.
 * `legs` has one entry per stop (getting there) plus the trip back.
 */
export async function optimizedRoundTrip(origin: LatLng, stops: LatLng[], mode: TravelMode) {
  const waypoint = (p: LatLng) => ({
    location: { latLng: { latitude: p.lat, longitude: p.lng } },
  });

  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask":
        "routes.optimizedIntermediateWaypointIndex,routes.distanceMeters,routes.duration,routes.legs.distanceMeters,routes.legs.duration",
    },
    body: JSON.stringify({
      origin: waypoint(origin),
      destination: waypoint(origin),
      intermediates: stops.map(waypoint),
      travelMode: mode,
      routingPreference: "TRAFFIC_AWARE",
      // Only worth paying for reordering when there's more than one stop.
      optimizeWaypointOrder: stops.length > 1,
      languageCode: "en-IN",
      units: "METRIC",
    }),
    cache: "no-store",
  });
  const data = await readJson<RoutesResponse>(res);

  const route = data.routes?.[0];
  if (!route) throw new MapsError("Google couldn't find a route between these places.");

  const optimized = route.optimizedIntermediateWaypointIndex;
  const order =
    optimized && optimized.length === stops.length && optimized.every((i) => i >= 0)
      ? optimized
      : stops.map((_, i) => i);

  const legs = (route.legs ?? []).map((leg) => ({
    distanceMeters: leg.distanceMeters ?? 0,
    durationSeconds: seconds(leg.duration),
  }));

  return {
    order,
    legs,
    totalDistanceMeters: route.distanceMeters ?? legs.reduce((s, l) => s + l.distanceMeters, 0),
    totalDurationSeconds: seconds(route.duration) || legs.reduce((s, l) => s + l.durationSeconds, 0),
  };
}
