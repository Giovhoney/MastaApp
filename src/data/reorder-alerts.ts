import type { DemoState } from "./demo-store";
import { allInkNames } from "./ink-master";

export type ReorderRule = { inkName: string; minimumPails: number; responsiblePerson: string };
export type ReorderAlert = ReorderRule & { availablePails: number; totalUsablePails: number; shortage: number };
export function setReorderRule(state: DemoState, inkName: string, minimumPails: number, responsiblePerson: string): DemoState {
  if (!allInkNames(state).includes(inkName)) throw Error("Choose an ink from the master list.");
  if (!Number.isSafeInteger(minimumPails) || minimumPails < 0 || minimumPails > 10000) throw Error("Minimum pails must be a whole number between 0 and 10000.");
  if (!responsiblePerson.trim()) throw Error("Enter who is responsible for ordering.");
  return { ...state, reorderRules: [...(state.reorderRules ?? []).filter(r => r.inkName !== inkName), { inkName, minimumPails, responsiblePerson: responsiblePerson.trim() }] };
}
export function reorderAlerts(state: DemoState): ReorderAlert[] {
  const purged = new Set(state.movements.filter(m => m.action === "PURGE").map(m => m.batchId));
  return (state.reorderRules ?? []).filter(r => r.minimumPails > 0).map(rule => {
    const usable = state.pails.filter(p => p.inkName === rule.inkName && p.remainingPct > 0 && !p.purged && !purged.has(p.batchId));
    const availablePails = usable.filter(p => !p.checkedOut).length;
    return { ...rule, availablePails, totalUsablePails: usable.length, shortage: Math.max(0, rule.minimumPails - availablePails) };
  }).filter(a => a.availablePails <= a.minimumPails).sort((a,b) => a.availablePails - a.minimumPails - (b.availablePails - b.minimumPails));
}
