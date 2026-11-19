/**
 * Server-side inventory domain operations (not exposed through HTTP yet).
 * All writes require an existing AppUser and must be called only after authentication
 * and role authorization are implemented. No client-side employee ID is trusted.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

const batchIdSchema = z.string().trim().min(1).max(100);
const percentageSchema = z.number().int().min(0).max(100);
const locationSchema = z.string().regex(/^[AB]-(LL|ML|UL)-(0[1-9]|10)-[1-3]$/);

export const receiveSchema = z.object({
  batchId: batchIdSchema,
  inkId: z.string().min(1),
  locationCode: locationSchema,
  remainingPct: percentageSchema,
});
export const checkoutSchema = z.object({ batchId: batchIdSchema, orderNumber: z.string().trim().min(1).max(80) });
export const returnSchema = z.object({ batchId: batchIdSchema, remainingPct: percentageSchema });

export class InventoryConflict extends Error {}

/** Call only with a verified employee ID obtained from the authenticated session. */
export async function receivePail(db: PrismaClient, employeeId: string, input: z.input<typeof receiveSchema>) {
  const p = receiveSchema.parse(input);
  return db.$transaction(async tx => {
    const [ink, location, existing] = await Promise.all([
      tx.inkMaster.findUnique({ where: { id: p.inkId } }),
      tx.rackPosition.findUnique({ where: { code: p.locationCode } }),
      tx.inkPail.findUnique({ where: { batchId: p.batchId } }),
    ]);
    if (!ink?.active || !location) throw new InventoryConflict("Ink or rack location not found.");
    if (existing) throw new InventoryConflict("Batch ID is already registered.");
    const occupied = await tx.inkPail.findUnique({ where: { locationCode: p.locationCode } });
    if (occupied) throw new InventoryConflict("Rack location is already assigned.");
    const created = await tx.inkPail.create({ data: { batchId: p.batchId, inkId: p.inkId, locationCode: p.locationCode, remainingPct: p.remainingPct, status: p.remainingPct === 0 ? "EMPTY" : "STORED" } });
    await tx.inventoryMovement.create({ data: { batchId: created.batchId, type: "RECEIVE", employeeId, toLocation: created.locationCode, remainingPct: created.remainingPct } });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function checkoutPail(db: PrismaClient, employeeId: string, input: z.input<typeof checkoutSchema>) {
  const p = checkoutSchema.parse(input);
  return db.$transaction(async tx => {
    const existing = await tx.inkPail.findUnique({ where: { batchId: p.batchId } });
    if (!existing || existing.status !== "STORED" || existing.remainingPct <= 0) throw new InventoryConflict("Pail is not available for checkout.");
    const updated = await tx.inkPail.updateMany({ where: { batchId: p.batchId, status: "STORED", remainingPct: { gt: 0 } }, data: { status: "CHECKED_OUT" } });
    if (updated.count !== 1) throw new InventoryConflict("Pail was checked out by another transaction.");
    await tx.inkCheckout.create({ data: { batchId: p.batchId, employeeId, pctAtCheckout: existing.remainingPct, orderNumber: p.orderNumber } });
    await tx.inventoryMovement.create({ data: { batchId: p.batchId, type: "CHECKOUT", employeeId, orderNumber: p.orderNumber, fromLocation: existing.locationCode, remainingPct: existing.remainingPct } });
    return { ...existing, status: "CHECKED_OUT" as const };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function returnPail(db: PrismaClient, employeeId: string, input: z.input<typeof returnSchema>) {
  const p = returnSchema.parse(input);
  return db.$transaction(async tx => {
    const existing = await tx.inkPail.findUnique({ where: { batchId: p.batchId } });
    if (!existing || existing.status !== "CHECKED_OUT") throw new InventoryConflict("Pail is not checked out.");
    if (p.remainingPct > existing.remainingPct) throw new InventoryConflict("Returned percentage cannot exceed the previous reading.");
    const checkout = await tx.inkCheckout.findFirst({ where: { batchId: p.batchId, returnedAt: null }, orderBy: { checkedOutAt: "desc" } });
    if (!checkout) throw new InventoryConflict("No active checkout record exists.");
    const status = p.remainingPct === 0 ? "EMPTY" : "STORED";
    const updated = await tx.inkPail.updateMany({ where: { batchId: p.batchId, status: "CHECKED_OUT", remainingPct: { gte: p.remainingPct } }, data: { remainingPct: p.remainingPct, status } });
    if (updated.count !== 1) throw new InventoryConflict("Pail was modified by another transaction.");
    await tx.inkCheckout.update({ where: { id: checkout.id }, data: { returnedAt: new Date(), pctAtReturn: p.remainingPct } });
    await tx.inventoryMovement.create({ data: { batchId: p.batchId, type: "RETURN", employeeId, orderNumber: checkout.orderNumber, toLocation: existing.locationCode, remainingPct: p.remainingPct } });
    return { ...existing, remainingPct: p.remainingPct, status };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
