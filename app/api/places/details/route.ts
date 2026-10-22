import { NextResponse, type NextRequest } from "next/server";
import { MapsError, placeDetails } from "@/lib/google";
import { getSessionUser } from "@/lib/session";

// GET /api/places/details?id=<placeId>&session=<uuid>
export async function GET(request: NextRequest) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const id = params.get("id") ?? "";
  const session = (params.get("session") ?? "").slice(0, 100);
  if (!/^[\w-]{1,300}$/.test(id)) {
    return NextResponse.json({ error: "Invalid place." }, { status: 400 });
  }

  try {
    return NextResponse.json(await placeDetails(id, session));
  } catch (error) {
    const message = error instanceof MapsError ? error.message : "Couldn't load that place.";
    if (!(error instanceof MapsError)) console.error(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
