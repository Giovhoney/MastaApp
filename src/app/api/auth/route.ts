import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { authDb, authConfigured, currentUser, hashPin, normalizeFirstName, sameOrigin, sessionCookie, sessionValue, validFirstName, validPin, verifyPin } from "@/lib/pilot-auth";
import { z } from "zod";
const credentials = z.object({ firstName: z.string().trim().min(1).max(40), pin: z.string().regex(/^\d{6}$/) });
const noStore = { "Cache-Control": "no-store" };
const attempts = new Map<string, { count: number; until: number }>();
const WINDOW = 15 * 60 * 1000;
function error(message: string, status: number) { return Response.json({ error: message }, { status, headers: noStore }); }
export async function GET() {
  if (!authConfigured()) return error("Authentication not configured", 503);
  const user = await currentUser();
  return Response.json({ authenticated: !!user, user }, { headers: noStore });
}
export async function POST(request: Request) {
  if (!authConfigured()) return error("Authentication not configured", 503);
  if (!sameOrigin(request)) return error("Origin rejected", 403);
  const input = await request.json().catch(() => null);
  const parsed = credentials.safeParse(input);
  if (!parsed.success || !validFirstName(parsed.data.firstName) || !validPin(parsed.data.pin)) return error("Enter a first name and a 6-digit PIN", 400);
  const { firstName, pin } = parsed.data;
  const key = normalizeFirstName(firstName);
  const attempt = attempts.get(key);
  if (attempt && attempt.until > Date.now() && attempt.count >= 5) return error("Too many attempts. Try again in 15 minutes.", 429);
  const existing = await authDb.pilotCredential.findUnique({ where: { firstNameKey: key }, include: { user: true } });
  if (!existing || !existing.user.active || !(await verifyPin(pin, existing.pinHash))) {
    attempts.set(key, { count: (attempt && attempt.until > Date.now() ? attempt.count : 0) + 1, until: Date.now() + WINDOW });
    return error("Incorrect first name or PIN", 401);
  }
  attempts.delete(key);
  (await cookies()).set(sessionCookie(sessionValue(existing.userId)));
  return Response.json({ authenticated: true, user: { employeeId: existing.user.id, employeeName: existing.user.displayName } }, { headers: noStore });
}
export async function PUT(request: Request) {
  if (!authConfigured()) return error("Authentication not configured", 503);
  if (!sameOrigin(request)) return error("Origin rejected", 403);
  const parsed = credentials.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !validFirstName(parsed.data.firstName) || !validPin(parsed.data.pin)) return error("Enter a first name and a 6-digit PIN", 400);
  const { firstName, pin } = parsed.data;
  const key = normalizeFirstName(firstName);
  try {
    const pinHash = await hashPin(pin);
    const user = await authDb.appUser.create({ data: { displayName: firstName.trim(), role: "OPERATOR", credential: { create: { firstNameKey: key, pinHash } } } });
    (await cookies()).set(sessionCookie(sessionValue(user.id)));
    return Response.json({ authenticated: true, user: { employeeId: user.id, employeeName: user.displayName } }, { status: 201, headers: noStore });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return error("This first name is already registered. Sign in or choose a different name.", 409);
    return error("Unable to create account", 500);
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return error("Origin rejected", 403);
  (await cookies()).set(sessionCookie("", 0));
  return Response.json({ ok: true }, { headers: noStore });
}
