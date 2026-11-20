import { Prisma } from "@prisma/client";
import { authDb, authConfigured, hashPin, normalizeFirstName, sameOrigin, validFirstName, validPin } from "@/lib/pilot-auth";
import { z } from "zod";
const credentials = z.object({ firstName: z.string().trim().min(1).max(40), pin: z.string().regex(/^\d{6}$/) });
const noStore = { "Cache-Control": "no-store" };
function error(message: string, status: number) { return Response.json({ error: message }, { status, headers: noStore }); }
// Account creation only. Inventory actions verify name and PIN per transaction.
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
    return Response.json({ created: true, firstName: user.displayName }, { status: 201, headers: noStore });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return error("This first name is already registered. Sign in or choose a different name.", 409);
    return error("Unable to create account", 500);
  }
}
