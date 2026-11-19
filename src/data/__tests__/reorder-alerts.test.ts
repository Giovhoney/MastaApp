import { describe, expect, it } from "vitest";
import { applyDemoAction, initialDemo } from "../demo-store";
import { reorderAlerts, setReorderRule } from "../reorder-alerts";

describe("reorder thresholds", () => {
  it("alerts at minimum, excludes checked-out and purged pails, and preserves settings", () => {
    let state = initialDemo();
    const pail = state.pails.find(p => !p.checkedOut && p.remainingPct > 0)!;
    const count = state.pails.filter(p => p.inkName === pail.inkName && !p.checkedOut && p.remainingPct > 0).length;
    state = setReorderRule(state, pail.inkName, count, "Ink Manager");
    expect(reorderAlerts(state)[0]).toMatchObject({inkName:pail.inkName,availablePails:count,responsiblePerson:"Ink Manager"});
    state = applyDemoAction(state,{type:"PURGE",batchId:pail.batchId,employee:"Manager",reason:"Expired"});
    expect(reorderAlerts(state)[0].availablePails).toBe(count-1);
    expect(state.reorderRules).toHaveLength(1);
    expect(() => setReorderRule(state,pail.inkName,-1,"Manager")).toThrow();
  });
});
