import { describe, expect, it } from "vitest";
import { comprehensiveDemo } from "../demo-scenarios";

describe("realistic sample production activity", () => {
  it("limits concurrent checkouts to three jobs and at most three inks per job", () => {
    const state = comprehensiveDemo();
    const outstanding = state.pails.filter(p => p.checkedOut);
    expect(outstanding).toHaveLength(6);
    const openOrders = state.movements.filter(m => m.action === "CHECKOUT" && outstanding.some(p => p.batchId === m.batchId));
    const grouped = Map.groupBy(openOrders, m => m.orderNumber);
    expect(grouped.size).toBe(3);
    expect([...grouped.values()].map(v => v.length).sort()).toEqual([1, 2, 3]);
    expect(state.movements.filter(m => m.action === "CHECKOUT").every(m => !!m.orderNumber)).toBe(true);
  });
});
