import { NextResponse, type NextRequest } from "next/server";
import { autocomplete, MapsError } from "@/lib/google";
import { getSessionUser } from "@/lib/session";

// GET /api/places/autocomplete?q=phoenix&session=<uuid>
export async function GET(request: NextRequest) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim();
  const session = (params.get("session") ?? "").slice(0, 100);
  if (q.length < 3 || q.length > 200) return NextResponse.json({ suggestions: [] });

  try {
    return NextResponse.json({ suggestions: await autocomplete(q, session) });
  } catch (error) {
    const message = error instanceof MapsError ? error.message : "Place search failed.";
    if (!(error instanceof MapsError)) console.error(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
