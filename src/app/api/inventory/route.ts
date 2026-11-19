import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
// Deliberately pilot-only. No authentication has been implemented.
export async function GET() {
  if (process.env.ENABLE_PILOT !== "true" || !process.env.DATABASE_URL) return NextResponse.json({ error: "Shared inventory not enabled" }, { status: 503 });
  try {
    const [pails, movements, details] = await Promise.all([
      prisma.inkPail.findMany({ where: { batchId: { startsWith: "TEST-" } }, include: { ink: true }, orderBy: { locationCode: "asc" } }),
      prisma.inventoryMovement.findMany({ where: { batchId: { startsWith: "TEST-" } }, include: { employee: true }, orderBy: { createdAt: "asc" } }),
      prisma.pilotPailDetails.findMany({ where: { batchId: { startsWith: "TEST-" } } }),
    ]);
    const detailMap = new Map(details.map(d => [d.batchId, d]));
    const data = {
      pails: pails.map(p => ({ batchId: p.batchId, inkName: p.ink.description, location: p.locationCode, remainingPct: p.remainingPct, checkedOut: p.status === "CHECKED_OUT", purged: p.status === "RETIRED", demo: true as const, receivingWeightKg: detailMap.get(p.batchId)?.receivingWeightKg, currentWeightKg: detailMap.get(p.batchId)?.currentWeightKg })),
      movements: movements.map(m => {
        const action = m.type === "RELOCATE" ? "MOVE" : m.type === "RETIRE" ? "PURGE" : m.type;
        const note = m.note ?? "";
        const machine = m.type === "CHECKOUT" ? note.match(/(?:TEST DATA|FICTIONAL SAMPLE PRODUCTION)\s*[·-]\s*(.*)/)?.[1] ?? (note.includes("FICTIONAL") ? detailMap.get(m.batchId)?.machine ?? undefined : undefined) : undefined;
        return { id: m.id, batchId: m.batchId, action, employee: m.employee.displayName, at: m.createdAt.toISOString(), remainingPct: m.remainingPct, location: m.toLocation ?? m.fromLocation ?? "", fromLocation: m.fromLocation ?? undefined, orderNumber: m.orderNumber ?? undefined, machine, reason: m.type === "RETIRE" ? note.replace(/^TEST PURGE:\s*/, "") : undefined, weightKg: m.type === "RETURN" ? Number(note.match(/([\d.]+)\s*kg/)?.[1] ?? detailMap.get(m.batchId)?.currentWeightKg ?? 0) : undefined };
      }),
    };
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Local MySQL unavailable" }, { status: 503 }); }
}
