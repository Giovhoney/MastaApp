import { describe, expect, it } from "vitest";
import { initialDemo } from "../demo-store";
import { proposeRackPositions, receiveBulk } from "../bulk-receive";

describe("bulk receiving with ink autocomplete and batch IDs", () => {
  it("receives 20 distinct pails with user-entered IDs and auto-assigned rack slots", () => {
    const state = initialDemo();
    const lines = Array.from({ length: 20 }, (_, i) => ({ inkName: i < 12 ? "74 Red" : "30 Blue", batchId: `TEST-NEW-${i + 1}` }));
    const next = receiveBulk(state, lines, "Manager");
    expect(next.pails.length - state.pails.length).toBe(20);
    expect(next.movements).toHaveLength(20);
    expect(proposeRackPositions(state, lines)).toHaveLength(20);
    expect(new Set(next.pails.map(p => p.location)).size).toBe(next.pails.length);
    expect(next.pails.some(p => p.batchId === "TEST-NEW-1")).toBe(true);
  });
  it("rejects duplicate batch IDs or unknown autocomplete values without saving", () => {
    const state = initialDemo();
    expect(() => receiveBulk(state, [{ inkName: "74 Red", batchId: "TEST-NEW" }, { inkName: "30 Blue", batchId: "test-new" }], "Manager")).toThrow(/unique/);
    expect(() => receiveBulk(state, [{ inkName: "Not a real ink", batchId: "TEST-NEW" }], "Manager")).toThrow(/autocomplete/);
    expect(state.movements).toHaveLength(0);
  });
});
