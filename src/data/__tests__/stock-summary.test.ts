import { describe, expect, it } from "vitest";
import { initialDemo, applyDemoAction } from "../demo-store";
import { summarizeInkStock } from "../stock-summary";

describe("stock by ink", () => {
  it("counts pails with the same ink separately from checked-out inventory", () => {
    const summary = summarizeInkStock(initialDemo().pails);
    expect(summary.find(s => s.inkName === "74 Red")).toMatchObject({ inStock: 3, total: 3, checkedOut: 0 });
    expect(summary.find(s => s.inkName === "30 Blue")).toMatchObject({ inStock: 2, checkedOut: 0, total: 2 });
  });
  it("updates when a pail is checked out", () => {
    const state = applyDemoAction(initialDemo(), { type: "CHECKOUT", batchId: "TEST-BATCH-0001", employee: "Test", orderNumber: "304027", machine: "TCY" });
    expect(summarizeInkStock(state.pails).find(s => s.inkName === "74 Red")).toMatchObject({ inStock: 2, checkedOut: 1, total: 3 });
  });
  it("does not count empty pails as in stock", () => {
    const state = initialDemo();
    state.pails[0].remainingPct = 0;
    expect(summarizeInkStock(state.pails).find(s => s.inkName === "74 Red")).toMatchObject({ inStock: 2, empty: 1, total: 3 });
  });
});
