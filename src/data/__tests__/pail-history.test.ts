import { describe, expect, it } from "vitest";
import { applyDemoAction, initialDemo } from "../demo-store";
import { orderUsage } from "../order-usage";

describe("unique pail movement trail", () => {
  it("keeps multiple machine cycles and rack relocation for the same batch", () => {
    let state = initialDemo();
    const batchId = state.pails.find(p => !p.checkedOut && p.remainingPct > 0)!.batchId;
    const original = state.pails.find(p => p.batchId === batchId)!;
    const free = "B-UL-10-3";
    expect(state.pails.some(p => p.location === free)).toBe(false);
    state = applyDemoAction(state, {type:"CHECKOUT",batchId,employee:"Operator A",orderNumber:"304325",machine:"Emba 2"}, "2026-11-17T09:00:00Z");
    state = applyDemoAction(state, {type:"RETURN",batchId,employee:"Operator B",weightKg:(original.currentWeightKg ?? original.receivingWeightKg ?? 20)*0.9}, "2026-11-17T12:00:00Z");
    state = applyDemoAction(state, {type:"MOVE",batchId,employee:"Ink manager",location:free}, "2026-11-18T07:00:00Z");
    state = applyDemoAction(state, {type:"CHECKOUT",batchId,employee:"Operator C",orderNumber:"304340",machine:"TCY"}, "2026-11-18T09:00:00Z");
    const trail = state.movements.filter(m => m.batchId === batchId);
    expect(trail.map(m => m.action)).toEqual(["CHECKOUT","MOVE","RETURN","CHECKOUT"]);
    expect(trail.find(m => m.action === "MOVE")).toMatchObject({fromLocation:original.location,location:free,employee:"Ink manager"});
    expect(orderUsage(state).filter(l => l.batchId === batchId).map(l => l.machine)).toEqual(["TCY","Emba 2"]);
    expect(state.pails.find(p => p.batchId === batchId)?.location).toBe(free);
    expect(() => applyDemoAction(state,{type:"MOVE",batchId,employee:"Ink manager",location:original.location})).toThrow(/Return this pail/);
  });
});
