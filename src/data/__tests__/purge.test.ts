import { describe, expect, it } from "vitest";
import { applyDemoAction, initialDemo } from "../demo-store";

describe("pail purging", () => {
  it("records the remaining percentage, weight, employee and reason without pretending ink was consumed", () => {
    const initial = initialDemo();
    const pail = initial.pails.find(p => !p.checkedOut && p.remainingPct > 0)!;
    const state = applyDemoAction(initial,{type:"PURGE",batchId:pail.batchId,employee:"Ink manager",reason:"Shelf life"},"2026-11-19T15:00:00Z");
    const movement = state.movements[0];
    expect(movement).toMatchObject({action:"PURGE",batchId:pail.batchId,remainingPct:pail.remainingPct,employee:"Ink manager",reason:"Shelf life",weightKg:pail.currentWeightKg});
    expect(state.pails.find(p => p.batchId === pail.batchId)?.remainingPct).toBe(pail.remainingPct);
    expect(() => applyDemoAction(state,{type:"CHECKOUT",batchId:pail.batchId,employee:"Operator",orderNumber:"304123",machine:"TCY"})).toThrow(/already been purged/);
    expect(() => applyDemoAction(state,{type:"PURGE",batchId:pail.batchId,employee:"Ink manager",reason:"again"})).toThrow(/already been purged/);
  });
});
