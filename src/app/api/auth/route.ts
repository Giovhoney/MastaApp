import { cookies } from "next/headers";
import { currentUser, identity, sameOrigin, sessionCookie, sessionValue, verifyPassword, authConfigured } from "@/lib/pilot-auth";
import { z } from "zod";
const login = z.object({ employeeId: z.string().min(1).max(50), password: z.string().min(1).max(200) });
const noStore = { "Cache-Control": "no-store" };
// Local pilot-only brute-force protection. Production requires a persistent, shared rate limiter.
const attempts = new Map<string, { count: number; until: number }>();
const WINDOW = 15 * 60 * 1000;

export async function GET() {
  if (!authConfigured()) return Response.json({ error: "Pilot authentication not configured" }, { status: 503, headers: noStore });
  const user = await currentUser();
  return Response.json({ authenticated: !!user, user }, { headers: noStore });
}
export async function POST(request: Request) {
  if (!authConfigured()) return Response.json({ error: "Pilot authentication not configured" }, { status: 503, headers: noStore });
  if (!(await sameOrigin(request))) return Response.json({ error: "Origin rejected" }, { status: 403, headers: noStore });
  const key = "local-pilot";
  const previous = attempts.get(key);
  if (previous && previous.until > Date.now() && previous.count >= 5) return Response.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429, headers: noStore });
  const parsed = login.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !verifyPassword(parsed.data.employeeId, parsed.data.password)) {
    attempts.set(key, { count: (previous && previous.until > Date.now() ? previous.count : 0) + 1, until: Date.now() + WINDOW });
    return Response.json({ error: "Invalid employee ID or password" }, { status: 401, headers: noStore });
  }
  attempts.delete(key);
  (await cookies()).set(sessionCookie(sessionValue()));
  return Response.json({ authenticated: true, user: identity() }, { headers: noStore });
}
export async function DELETE(request: Request) {
  if (!(await sameOrigin(request))) return Response.json({ error: "Origin rejected" }, { status: 403, headers: noStore });
  (await cookies()).set(sessionCookie("", 0));
  return Response.json({ ok: true }, { headers: noStore });
}
