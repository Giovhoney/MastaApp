import { NextResponse } from "next/server";

/** Fail closed: the current UI is a browser-only demo, not an authenticated inventory system.
 * Never expose it on a public production hostname. This guard is NOT authentication.
 */
export function proxy() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("MastaApp production access is disabled until server-side authentication and shared inventory are implemented.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"] };
