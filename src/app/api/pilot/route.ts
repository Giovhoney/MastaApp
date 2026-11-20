import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { locations } from "@/data/demo-store";
import { verifyActor, sameOrigin, validFirstName, validPin } from "@/lib/pilot-auth";

const db = new PrismaClient();
const prefix = "TEST-";
const attempts = new Map<string, { count: number; until: number }>();
const WINDOW = 15 * 60 * 1000;
const commandSchema = z.object({
  action: z.enum(["RECEIVE", "CHECKOUT", "RETURN", "MOVE", "PURGE"]),
  batchId: z.string().trim().min(5).max(100).refine(v => v.startsWith(prefix), "Only TEST- pails are permitted in pilot mode"),
  inkName: z.string().trim().max(120).optional(),
  location: z.string().trim().optional(),
  orderNumber: z.string().trim().max(80).optional(),
  machine: z.string().trim().max(80).optional(),
  weightKg: z.number().finite().nonnegative().optional(),
  reason: z.string().trim().max(500).optional(),
});
function enabled() { return process.env.ENABLE_PILOT === "true" && !!process.env.DATABASE_URL; }
const bulkSchema = z.object({ action: z.literal("RECEIVE_BULK"), lines: z.array(commandSchema.pick({batchId:true, inkName:true, location:true, weightKg:true})).min(1).max(180) });
function failure(message: string, status = 400) { return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } }); }
export async function GET() {
  if (!enabled()) return failure("Shared pilot is not configured", 503);
  try {
    const pails = await db.inkPail.findMany({ where: { batchId: { startsWith: prefix } }, include: { ink: true }, orderBy: { locationCode: "asc" } });
    const ids = pails.map(p => p.batchId);
    const [details, movements] = await Promise.all([
      db.pilotPailDetails.findMany({ where: { batchId: { in: ids } } }),
      db.inventoryMovement.findMany({ where: { batchId: { in: ids } }, include: { employee: true }, orderBy: { createdAt: "desc" }, take: 500 }),
    ]);
    const byId = new Map(details.map(d => [d.batchId, d]));
    return Response.json({ pails: pails.map(p => ({ batchId: p.batchId, inkName: p.ink.description, location: p.locationCode, remainingPct: p.remainingPct, status: p.status, receivingWeightKg: byId.get(p.batchId)?.receivingWeightKg, currentWeightKg: byId.get(p.batchId)?.currentWeightKg, machine: byId.get(p.batchId)?.machine })), movements: movements.map(m => ({ id: m.id, batchId: m.batchId, action: m.type, employee: m.employee.displayName, employeeId: m.employeeId, at: m.createdAt, location: m.toLocation ?? m.fromLocation, orderNumber: m.orderNumber, remainingPct: m.remainingPct, note: m.note })) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return failure("Database unavailable or schema not initialized", 503); }
}
export async function POST(request: Request) {
  if (!enabled()) return failure("Shared pilot is not configured", 503);
  if (!sameOrigin(request)) return failure("Origin rejected", 403);
  const input = await request.json().catch(() => null);
  const parsed = z.union([commandSchema, bulkSchema]).safeParse(input);
  const firstName = input?.firstName;
  const pin = input?.pin;
  if (typeof firstName !== "string" || typeof pin !== "string" || !validFirstName(firstName) || !validPin(pin)) return failure("Enter your first name and 6-digit PIN", 401);
  const key = firstName.trim().toLocaleLowerCase("en");
  const attempt = attempts.get(key);
  if (attempt && attempt.until > Date.now() && attempt.count >= 5) return failure("Too many PIN attempts. Try again in 15 minutes.", 429);
  const actor = await verifyActor(firstName, pin);
  if (!actor) { attempts.set(key, { count: (attempt && attempt.until > Date.now() ? attempt.count : 0) + 1, until: Date.now() + WINDOW }); return failure("Incorrect first name or PIN", 401); }
  attempts.delete(key);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Invalid input");
  const payload = parsed.data;
  const lines = payload.action === "RECEIVE_BULK" ? payload.lines.map(line => ({...line, action: "RECEIVE" as const})) : [payload];
  if (new Set(lines.map(line => line.batchId)).size !== lines.length) return failure("Duplicate pail IDs in receipt", 409);
  if (payload.action === "RECEIVE_BULK" && new Set(lines.map(line => line.location)).size !== lines.length) return failure("Duplicate rack positions in receipt", 409);
  try {
    await db.$transaction(async tx => {
      const user = await tx.appUser.upsert({ where: { id: actor.employeeId }, create: { id: actor.employeeId, displayName: actor.employeeName, role: "OPERATOR" }, update: { displayName: actor.employeeName } });
      for (const p of lines) {
      const existing = await tx.inkPail.findUnique({ where: { batchId: p.batchId } });
      if (p.action === "RECEIVE") {
        if (existing) throw Error("Pail ID already exists");
        if (!p.inkName || !p.location || !locations.includes(p.location)) throw Error("Choose an ink and valid rack location");
        if (p.weightKg === undefined || p.weightKg <= 0) throw Error("Enter the full-pail gross weight");
        const ink = await tx.inkMaster.findUnique({ where: { description: p.inkName } });
        if (!ink) throw Error("Ink is not in the master list");
        const location = await tx.rackPosition.findUnique({ where: { code: p.location } });
        if (!location) throw Error("Rack location is not initialized");
        const occupied = await tx.inkPail.findUnique({ where: { locationCode: p.location } });
        if (occupied) throw Error("Rack location is occupied");
        await tx.inkPail.create({ data: { batchId: p.batchId, inkId: ink.id, locationCode: p.location, remainingPct: 100, status: "STORED" } });
        await tx.pilotPailDetails.create({ data: { batchId: p.batchId, receivingWeightKg: p.weightKg, currentWeightKg: p.weightKg } });
        await tx.inventoryMovement.create({ data: { batchId: p.batchId, employeeId: user.id, type: "RECEIVE", toLocation: p.location, remainingPct: 100, note: "TEST DATA" } });
        continue;
      }
      if (!existing) throw Error("Test pail not found");
      const details = await tx.pilotPailDetails.findUnique({ where: { batchId: p.batchId } });
      if (!details) throw Error("Pilot pail weight record missing");
      if (p.action === "CHECKOUT") {
        if (existing.status !== "STORED" || existing.remainingPct <= 0) throw Error("Pail is not available");
        if (!p.orderNumber || !p.machine) throw Error("Production order and machine are required");
        const changed = await tx.inkPail.updateMany({ where: { batchId: p.batchId, status: "STORED" }, data: { status: "CHECKED_OUT" } });
        if (changed.count !== 1) throw Error("Pail was checked out by another employee");
        await tx.pilotPailDetails.update({ where: { batchId: p.batchId }, data: { machine: p.machine } });
        await tx.inkCheckout.create({ data: { batchId: p.batchId, employeeId: user.id, orderNumber: p.orderNumber, pctAtCheckout: existing.remainingPct } });
        await tx.inventoryMovement.create({ data: { batchId: p.batchId, employeeId: user.id, type: "CHECKOUT", orderNumber: p.orderNumber, fromLocation: existing.locationCode, remainingPct: existing.remainingPct, note: `TEST DATA · ${p.machine}` } });
      } else if (p.action === "RETURN") {
        if (existing.status !== "CHECKED_OUT") throw Error("Pail is not checked out");
        if (p.weightKg === undefined || p.weightKg > details.currentWeightKg) throw Error("Return weight must not exceed checkout weight");
        const pct = Math.round(100 * p.weightKg / details.receivingWeightKg);
        const checkout = await tx.inkCheckout.findFirst({ where: { batchId: p.batchId, returnedAt: null }, orderBy: { checkedOutAt: "desc" } });
        if (!checkout) throw Error("No open checkout");
        await tx.inkPail.update({ where: { batchId: p.batchId }, data: { status: pct ? "STORED" : "EMPTY", remainingPct: pct } });
        await tx.pilotPailDetails.update({ where: { batchId: p.batchId }, data: { currentWeightKg: p.weightKg, machine: null } });
        await tx.inkCheckout.update({ where: { id: checkout.id }, data: { returnedAt: new Date(), pctAtReturn: pct } });
        await tx.inventoryMovement.create({ data: { batchId: p.batchId, employeeId: user.id, type: "RETURN", orderNumber: checkout.orderNumber, toLocation: existing.locationCode, remainingPct: pct, note: `TEST DATA · ${p.weightKg} kg` } });
      } else if (p.action === "MOVE") {
        if (existing.status === "CHECKED_OUT" || existing.status === "RETIRED") throw Error("Return pail before moving");
        if (!p.location || !locations.includes(p.location) || p.location === existing.locationCode) throw Error("Choose a different valid rack location");
        const occupied = await tx.inkPail.findUnique({ where: { locationCode: p.location } });
        if (occupied) throw Error("Rack location occupied");
        await tx.inkPail.update({ where: { batchId: p.batchId }, data: { locationCode: p.location } });
        await tx.inventoryMovement.create({ data: { batchId: p.batchId, employeeId: user.id, type: "RELOCATE", fromLocation: existing.locationCode, toLocation: p.location, remainingPct: existing.remainingPct, note: "TEST DATA" } });
      } else {
        if (existing.status === "CHECKED_OUT" || existing.status === "RETIRED") throw Error("Pail must be returned and active before purge");
        if (!p.reason) throw Error("Purge reason required");
        await tx.inkPail.update({ where: { batchId: p.batchId }, data: { status: "RETIRED", locationCode: null } });
        await tx.inventoryMovement.create({ data: { batchId: p.batchId, employeeId: user.id, type: "RETIRE", fromLocation: existing.locationCode, remainingPct: existing.remainingPct, note: `TEST PURGE: ${p.reason}` } });
      }
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return failure("Pail or rack position was already assigned. Refresh and retry.", 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return failure("Concurrent inventory update. Refresh and retry.", 409);
    return failure(error instanceof Error && !(error instanceof Prisma.PrismaClientKnownRequestError) ? error.message : "Transaction failed", 409);
  }
}
