import { describe, expect, it } from "vitest";
import { csvCell, inventoryCsv, movementCsv } from "../export";
import { applyDemoAction, initialDemo } from "../demo-store";

describe("safe CSV exports", () => {
  it("escapes quotes, commas and spreadsheet formulas", () => {
    expect(csvCell('Ink, "special"')).toBe('"Ink, ""special"""');
    expect(csvCell('=HYPERLINK("evil")')).toBe('"\'=HYPERLINK(""evil"")"');
    expect(csvCell('  +123')).toBe('"\'  +123"');
  });
  it("exports inventory with demo indicators", () => {
    const csv = inventoryCsv(initialDemo());
    expect(csv).toContain('"Batch ID","Ink Name","Rack Location"');
    expect(csv).toContain('"TEST-BATCH-0001"');
    expect(csv).toContain('"YES"');
  });
  it("exports movement history after a checkout", () => {
    const state = applyDemoAction(initialDemo(), { type: "CHECKOUT", batchId: "TEST-BATCH-0001", employee: "Operator", orderNumber: "304027", machine: "TCY" });
    expect(movementCsv(state)).toContain('"CHECKOUT","TEST-BATCH-0001","304027","TCY","Operator"');
  });
});
