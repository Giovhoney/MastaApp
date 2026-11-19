/**
 * Temporary cloud-database fixture management.
 * Never delete real inventory. Only records with the TEST- prefix can be removed.
 * Requires explicit PILOT_DATA_CONFIRM and a configured PostgreSQL DATABASE_URL.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { inkNames } from "../src/data/inks";
import { locations, colourFamily } from "../src/data/demo-store";

const db = new PrismaClient();
const operation = process.argv[2];
const TEST_PREFIX = "TEST-PILOT-";
const samples = [
  { batchId: `${TEST_PREFIX}001`, inkName: "74 Red", location: "A-LL-01-1", pct: 100 },
  { batchId: `${TEST_PREFIX}002`, inkName: "74 Red", location: "A-LL-01-2", pct: 65 },
  { batchId: `${TEST_PREFIX}003`, inkName: "75 Red", location: "A-LL-01-3", pct: 100 },
  { batchId: `${TEST_PREFIX}004`, inkName: "30 Blue", location: "B-LL-01-1", pct: 80 },
  { batchId: `${TEST_PREFIX}005`, inkName: "31 Blue", location: "B-LL-01-2", pct: 100 },
  { batchId: `${TEST_PREFIX}006`, inkName: "91 White", location: "B-LL-02-1", pct: 40 },
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing. No changes made.");
  if (process.env.PILOT_DATA_CONFIRM !== "YES_TEST_DATA_ONLY") throw new Error("Set PILOT_DATA_CONFIRM=YES_TEST_DATA_ONLY to acknowledge test-only changes.");
  if (operation !== "seed" && operation !== "clear") throw new Error("Usage: tsx prisma/pilot-data.ts seed|clear");
  await db.$transaction(async tx => {
    if (operation === "seed") {
      // Refuse to overwrite real stock or occupied rack positions.
      const occupied = await tx.inkPail.findMany({ where: { locationCode: { in: samples.map(s => s.location) }, NOT: { batchId: { startsWith: TEST_PREFIX } } }, select: { locationCode: true } });
      if (occupied.length) throw new Error("One or more sample rack positions contain non-test inventory. No changes made.");
      const existing = await tx.inkPail.count({ where: { batchId: { startsWith: TEST_PREFIX } } });
      if (existing) throw new Error("Test pilot inventory already exists. Clear test data explicitly before reseeding.");
      for (const name of inkNames) await tx.inkMaster.upsert({ where: { description: name }, create: { description: name, colourFamily: colourFamily(name) }, update: {} });
      for (const code of locations) {
        const [rack, level, partition, position] = code.split("-");
        await tx.rackPosition.upsert({ where: { code }, create: { code, rack, level, partition: Number(partition), position: Number(position) }, update: {} });
      }
      const employee = await tx.appUser.upsert({ where: { id: "TEST-PILOT-EMPLOYEE" }, create: { id: "TEST-PILOT-EMPLOYEE", displayName: "Pilot Test Employee", role: "OPERATOR" }, update: {} });
      for (const sample of samples) {
        const ink = await tx.inkMaster.findUniqueOrThrow({ where: { description: sample.inkName } });
        await tx.inkPail.create({ data: { batchId: sample.batchId, inkId: ink.id, locationCode: sample.location, remainingPct: sample.pct, status: "STORED" } });
        await tx.inventoryMovement.create({ data: { batchId: sample.batchId, employeeId: employee.id, type: "RECEIVE", toLocation: sample.location, remainingPct: sample.pct, note: "TEMPORARY PILOT TEST DATA — NOT REAL STOCK" } });
      }
      console.log(`Inserted ${samples.length} fictional TEST-PILOT pails and matching receipt movements.`);
    } else {
      const ids = (await tx.inkPail.findMany({ where: { batchId: { startsWith: TEST_PREFIX } }, select: { batchId: true } })).map(p => p.batchId);
      await tx.inventoryMovement.deleteMany({ where: { batchId: { in: ids } } });
      await tx.inkCheckout.deleteMany({ where: { batchId: { in: ids } } });
      await tx.inkPail.deleteMany({ where: { batchId: { in: ids } } });
      console.log(`Cleared ${ids.length} TEST-PILOT pails and their transaction history. Real inventory and master data untouched.`);
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120000 });
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Pilot data operation failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
