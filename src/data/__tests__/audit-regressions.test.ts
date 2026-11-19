import { describe, expect, it } from "vitest";
import { applyDemoAction, initialDemo, parseDemoState, recommendLocation } from "../demo-store";
import { receiveBulk, proposeRackPositions } from "../bulk-receive";
import { inventoryCsv, movementCsv } from "../export";
import { summarizeInkStock } from "../stock-summary";
import { reorderAlerts, setReorderRule } from "../reorder-alerts";
import { addInkMaster } from "../ink-master";

describe("cross-feature inventory regression audit", () => {
  it("purge archives pail, frees rack, preserves full history and stock totals", () => {
    let state = initialDemo();
    const pail = state.pails.find(p => !p.checkedOut && p.remainingPct > 0)!;
    const originalCount = summarizeInkStock(state.pails).find(s => s.inkName === pail.inkName)!.total;
    const originalLocation = pail.location;
    state = setReorderRule(state,pail.inkName,1,"Buyer");
    state = applyDemoAction(state,{type:"PURGE",batchId:pail.batchId,employee:"Manager",reason:"Expired"});
    expect(state.pails.find(p=>p.batchId===pail.batchId)?.purged).toBe(true);
    expect(reorderAlerts(state).every(a=>a.availablePails>=0)).toBe(true);
    expect(summarizeInkStock(state.pails).find(s=>s.inkName===pail.inkName)?.total ?? 0).toBe(originalCount-1);
    expect(inventoryCsv(state)).toContain('"Purged"');
    expect(movementCsv(state)).toContain('"Expired"');
    expect(recommendLocation(state.pails,pail.inkName)).not.toBeNull();
    const lines = [{inkName:pail.inkName,batchId:"TEST-REPLACEMENT"}];
    expect(proposeRackPositions(state,lines)[0]).toBeDefined();
    // Explicitly reuse the retired pail's former rack position.
    state = applyDemoAction(state,{type:"RECEIVE",batchId:"TEST-REPLACEMENT",inkName:pail.inkName,location:originalLocation,employee:"Receiver"});
    expect(state.pails.filter(p=>p.location===originalLocation)).toHaveLength(2);
    const restored = parseDemoState(JSON.stringify(state));
    expect(restored.pails).toHaveLength(state.pails.length);
    expect(restored.movements.some(m=>m.batchId===pail.batchId && m.action==="PURGE")).toBe(true);
    expect(restored.reorderRules).toHaveLength(1);
    expect(() => applyDemoAction(restored,{type:"CHECKOUT",batchId:pail.batchId,employee:"Op",orderNumber:"123",machine:"TCY"})).toThrow(/purged/);
  });
  it("returns retain the correct latest order and machine after repeat checkouts", () => {
    let state = initialDemo();
    const p = state.pails.find(p=>p.remainingPct>0)!;
    const weight = p.currentWeightKg!;
    state = applyDemoAction(state,{type:"CHECKOUT",batchId:p.batchId,employee:"A",orderNumber:"ORDER-1",machine:"TCY"});
    state = applyDemoAction(state,{type:"RETURN",batchId:p.batchId,employee:"B",weightKg:weight});
    state = applyDemoAction(state,{type:"CHECKOUT",batchId:p.batchId,employee:"C",orderNumber:"ORDER-2",machine:"Emba 2"});
    state = applyDemoAction(state,{type:"RETURN",batchId:p.batchId,employee:"D",weightKg:weight});
    expect(state.movements[0]).toMatchObject({action:"RETURN",orderNumber:"ORDER-2",machine:"Emba 2",employee:"D"});
  });
  it("bulk receipt failure is atomic and custom ink survives operations", () => {
    let state = addInkMaster(initialDemo(),"Test Special Teal",19);
    const before = JSON.stringify(state);
    expect(() => receiveBulk(state,[{inkName:"Test Special Teal",batchId:"TEST-NEW-1"},{inkName:"Test Special Teal",batchId:"TEST-NEW-1"}],"Receiver")).toThrow();
    expect(JSON.stringify(state)).toBe(before);
    state = receiveBulk(state,[{inkName:"Test Special Teal",batchId:"TEST-NEW-1"}],"Receiver");
    expect(state.customInks?.[0]).toMatchObject({name:"Test Special Teal",weightKg:19});
    expect(state.pails.find(p=>p.batchId==="TEST-NEW-1")?.receivingWeightKg).toBe(19);
  });
});
