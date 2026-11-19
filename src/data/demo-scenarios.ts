import { machines } from "./machines";
import { applyDemoAction, initialDemo, recommendLocation, type DemoState } from "./demo-store";
import { masterWeightKg } from "./weights";
import { inkNames } from "./inks";

/** Fictional, internally consistent receiving and production activity for full-workflow testing. */
export function comprehensiveDemo(): DemoState {
  const base = initialDemo();
  let state: DemoState = { pails: base.pails.map(p => ({ ...p, checkedOut: false, receivingWeightKg: p.receivingWeightKg ?? masterWeightKg(p.inkName), currentWeightKg: p.currentWeightKg ?? (p.receivingWeightKg ?? masterWeightKg(p.inkName)) * p.remainingPct / 100 })), movements: [] };
  const employees = ["TEST - Ink Manager A", "TEST - Ink Manager B", "TEST - Operator A", "TEST - Operator B", "TEST - Operator C"];
  const at = (day: number, hour: number, minute = 0) => `2026-11-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;
  // Backfill believable receipts for all initial sample pails.
  for (const [i, p] of state.pails.entries()) {
    state = { ...state, movements: [{ id: `TEST-INITIAL-RECEIPT-${i}`, batchId: p.batchId, action: "RECEIVE", employee: employees[i % 2], at: at(2 + (i % 4), 8, i % 50), remainingPct: 100, location: p.location, weightKg: p.receivingWeightKg }, ...state.movements] };
  }
  // Some complete production cycles, including repeat usage of the same pail on another order.
  for (let i = 0; i < 24; i++) {
    const p = state.pails[i];
    if (p.remainingPct === 0) continue;
    const order = String(304000 + (i % 13) * 7);
    state = applyDemoAction(state, { type: "CHECKOUT", batchId: p.batchId, employee: employees[2 + i % 3], orderNumber: order, machine: machines[i % machines.length] }, at(9 + (i % 4), 7 + i % 6, i % 50));
    state = applyDemoAction(state, { type: "RETURN", batchId: p.batchId, employee: employees[2 + i % 3], weightKg: p.currentWeightKg }, at(9 + (i % 4), 12 + i % 6, i % 50));
  }
  for (let i = 0; i < 6; i++) {
    const p = state.pails[i];
    const pct = Math.max(0, p.remainingPct - 10 - i * 3);
    state = applyDemoAction(state, { type: "CHECKOUT", batchId: p.batchId, employee: employees[2 + i % 3], orderNumber: String(304210 + i), machine: machines[i % machines.length] }, at(14, 7 + i));
    state = applyDemoAction(state, { type: "RETURN", batchId: p.batchId, employee: employees[2 + i % 3], weightKg: Math.round((p.receivingWeightKg ?? masterWeightKg(p.inkName)) * pct) / 100 }, at(14, 11 + i));
  }
  // Four active production orders across four of the approximately six machines.
  // Orders may use one, two or three inks; six pails are currently out in total.
  const activeOrders = [
    { order: "304325", pails: [25, 26, 27] }, // three-colour job
    { order: "304326", pails: [28, 29] },     // two-colour job
    { order: "304327", pails: [30] },         // single-colour job
  ];
  for (const [machineIndex, job] of activeOrders.entries()) {
    for (const [inkIndex, pailIndex] of job.pails.entries()) {
      const p = state.pails[pailIndex];
      state = applyDemoAction(state, { type: "CHECKOUT", batchId: p.batchId, employee: employees[2 + machineIndex % 3], orderNumber: job.order, machine: machines[machineIndex] }, at(18, 7 + machineIndex, inkIndex * 5));
    }
  }
  // Several recent receipts, so the placement sheet and receiving traceability can be exercised.
  const recent = ["74 Red", "74 Red", "30 Blue", "90 Black (Flexo)", "PMS 355c Green", "High Opacity White", "10 Yellow", "Premium Black", "PMS 186C Red", "Super White"];
  for (const [i, name] of recent.entries()) {
    if (!inkNames.includes(name)) throw Error(`Invalid scenario ink: ${name}`);
    const location = recommendLocation(state.pails, name);
    if (!location) throw Error("No available rack position for demo receipt");
    state = applyDemoAction(state, { type: "RECEIVE", batchId: `TEST-RECENT-${String(i + 1).padStart(4, "0")}`, inkName: name, location, employee: employees[i % 2], remainingPct: 100 }, at(18, 10, i));
  }
  return state;
}
