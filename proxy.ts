import { NextResponse, type NextRequest } from "next/server";

// Quick gate: no session cookie → go to /login.
// The cookie's signature is properly verified on the server (lib/session.ts).
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything needs a login except the login page, read-only share links and static files.
  matcher: ["/((?!login|share/|_next/static|_next/image|favicon.ico).*)"],
};
