import { describe, expect, it } from "vitest";
import { inkNames, testPails } from "../inks";
import { applyDemoAction, initialDemo, locations, parseDemoState, recommendLocation } from "../demo-store";

describe("rack layout", () => {
  it("generates exactly 180 unique positions", () => {
    expect(locations).toHaveLength(180);
    expect(new Set(locations).size).toBe(180);
    expect(locations).toContain("A-LL-01-1");
    expect(locations).toContain("B-UL-10-3");
  });
  it("keeps all master ink names separate from sample pails", () => {
    expect(new Set(inkNames).size).toBe(inkNames.length);
    expect(inkNames).toContain("PMS 3262c Green ((Oyster)");
    expect(inkNames).toContain("PMS 7c Cool Grey  (Oyster)");
    expect(testPails.every(p => p.demo && p.batchId.startsWith("TEST-"))).toBe(true);
  });
  it("recommends space near identical inks first", () => {
    expect(recommendLocation(initialDemo().pails, "74 Red")).toBe("A-LL-03-2");
  });
});

describe("demo inventory actions", () => {
  it("receives a new test pail with a movement", () => {
    const next = applyDemoAction(initialDemo(), { type: "RECEIVE", batchId: "TEST-BATCH-9999", employee: "Tester", inkName: "74 Red", location: "A-LL-03-2", remainingPct: 100 });
    expect(next.pails).toHaveLength(testPails.length + 1);
    expect(next.movements[0].action).toBe("RECEIVE");
  });
  it("prevents duplicate Batch IDs and locations", () => {
    expect(() => applyDemoAction(initialDemo(), { type: "RECEIVE", batchId: "test-batch-0001", employee: "Tester", inkName: "74 Red", location: "A-LL-03-1" })).toThrow(/already exists/);
    expect(() => applyDemoAction(initialDemo(), { type: "RECEIVE", batchId: "TEST-NEW", employee: "Tester", inkName: "74 Red", location: "A-LL-01-1" })).toThrow(/already assigned/);
  });
  it("does not allow production-looking IDs in demo", () => {
    expect(() => applyDemoAction(initialDemo(), { type: "RECEIVE", batchId: "REAL-1", employee: "Tester", inkName: "74 Red", location: "A-LL-03-1" })).toThrow(/TEST-/);
  });
  it("requires an order number and preserves it through checkout and return", () => {
    expect(() => applyDemoAction(initialDemo(), { type: "CHECKOUT", batchId: "TEST-BATCH-0001", employee: "Operator" })).toThrow(/order number/);
    const checked = applyDemoAction(initialDemo(), { type: "CHECKOUT", batchId: "TEST-BATCH-0001", employee: "Operator", orderNumber: " 304027 ", machine: "TCY" });
    expect(checked.movements[0].orderNumber).toBe("304027");
    const returned = applyDemoAction(checked, { type: "RETURN", batchId: "TEST-BATCH-0001", employee: "Operator", weightKg: 8.1 });
    expect(returned.movements[0].orderNumber).toBe("304027");
  });
  it("checks out and returns with reduced remaining percentage", () => {
    const checked = applyDemoAction(initialDemo(), { type: "CHECKOUT", batchId: "TEST-BATCH-0001", employee: "Operator", orderNumber: "304027", machine: "TCY" });
    expect(checked.pails[0].checkedOut).toBe(true);
    expect(checked.pails[0].location).toBe("A-LL-01-1");
    expect(() => applyDemoAction(checked, { type: "CHECKOUT", batchId: "TEST-BATCH-0001", employee: "Operator", orderNumber: "304027", machine: "TCY" })).toThrow(/already checked out/);
    expect(() => applyDemoAction(checked, { type: "RETURN", batchId: "TEST-BATCH-0001", employee: "Operator", weightKg: 25 })).toThrow(/cannot exceed|between 0/);
    const returned = applyDemoAction(checked, { type: "RETURN", batchId: "TEST-BATCH-0001", employee: "Operator", weightKg: 8.1 });
    expect(returned.pails[0].remainingPct).toBe(45);
    expect(returned.pails[0].checkedOut).toBe(false);
    expect(returned.movements.map(m => m.action)).toEqual(["RETURN", "CHECKOUT"]);
  });
  it("rejects invalid percentages, unknown inks and invalid returns", () => {
    expect(() => applyDemoAction(initialDemo(), { type: "RETURN", batchId: "TEST-BATCH-0001", employee: "Operator", weightKg: 5 })).toThrow(/not checked out/);
    expect(() => applyDemoAction(initialDemo(), { type: "RECEIVE", batchId: "TEST-NEW", employee: "Tester", inkName: "not a master ink", location: "A-LL-03-1" })).toThrow(/master list/);
    expect(() => applyDemoAction(initialDemo(), { type: "RECEIVE", batchId: "TEST-NEW", employee: "Tester", inkName: "74 Red", location: "A-LL-03-2", remainingPct: 101 })).toThrow(/between 0 and 100/);
  });
  it("rejects corrupted saved data", () => {
    expect(parseDemoState("{bad")).toEqual(initialDemo());
    expect(parseDemoState(JSON.stringify({ pails: [testPails[0], testPails[0]], movements: [] }))).toEqual(initialDemo());
  });
});
