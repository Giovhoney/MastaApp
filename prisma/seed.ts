/** Seeds reference data ONLY. No fictional pails are inserted into PostgreSQL. */
import { PrismaClient } from "@prisma/client";
import { inkNames } from "../src/data/inks";
import { colourFamily, locations } from "../src/data/demo-store";

const prisma = new PrismaClient();
async function main() {
  for (const description of inkNames) {
    await prisma.inkMaster.upsert({
      where: { description },
      update: { colourFamily: colourFamily(description) },
      create: { description, colourFamily: colourFamily(description) },
    });
  }
  for (const code of locations) {
    const [rack, level, partition, position] = code.split("-");
    await prisma.rackPosition.upsert({
      where: { code }, update: {},
      create: { code, rack, level, partition: Number(partition), position: Number(position) },
    });
  }
  await prisma.systemSetting.upsert({
    where: { key: "lowInkThresholdPct" }, update: {},
    create: { key: "lowInkThresholdPct", value: "25" },
  });
  console.log(`Seeded ${inkNames.length} ink names and ${locations.length} rack positions; no inventory pails.`);
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
