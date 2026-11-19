import { describe, expect, it } from "vitest";
import { applyDemoAction, initialDemo } from "../demo-store";
import { orderUsage, orderUsageCsv } from "../order-usage";

describe("production order usage traceability", () => {
  it("shows pending until returned and calculates percentage-point reduction", () => {
    const checked = applyDemoAction(initialDemo(), { type: "CHECKOUT", batchId: "TEST-BATCH-0001", employee: "Operator", orderNumber: "304027", machine: "TCY" }, "2026-11-19T10:00:00Z");
    expect(orderUsage(checked)[0]).toMatchObject({ orderNumber: "304027", machine: "TCY", startPct: 92, status: "Outstanding" });
    const returned = applyDemoAction(checked, { type: "RETURN", batchId: "TEST-BATCH-0001", employee: "Operator", weightKg: 11.16 }, "2026-11-19T11:00:00Z");
    expect(orderUsage(returned)[0]).toMatchObject({ orderNumber: "304027", machine: "TCY", startPct: 92, endPct: 62, usedPercentagePoints: 30, status: "Complete" });
    expect(orderUsageCsv(orderUsage(returned))).toContain('"304027"');
  });
  it("pairs repeated use of one pail to its respective order", () => {
    let state = initialDemo();
    state = applyDemoAction(state, { type: "CHECKOUT", batchId: "TEST-BATCH-0001", employee: "Operator", orderNumber: "ORDER-A", machine: "Rotary" }, "2026-11-19T10:00:00Z");
    state = applyDemoAction(state, { type: "RETURN", batchId: "TEST-BATCH-0001", employee: "Operator", weightKg: 14.4 }, "2026-11-19T11:00:00Z");
    state = applyDemoAction(state, { type: "CHECKOUT", batchId: "TEST-BATCH-0001", employee: "Operator", orderNumber: "ORDER-B", machine: "Emba 2" }, "2026-11-19T12:00:00Z");
    state = applyDemoAction(state, { type: "RETURN", batchId: "TEST-BATCH-0001", employee: "Operator", weightKg: 11.7 }, "2026-11-19T13:00:00Z");
    expect(orderUsage(state).map(l => [l.orderNumber, l.usedPercentagePoints])).toEqual([["ORDER-B", 15], ["ORDER-A", 12]]);
  });
});
