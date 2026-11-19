import { applyDemoAction, recommendLocation, type DemoState } from "./demo-store";
import { allInkNames } from "./ink-master";

export type ReceiveLine = { inkName: string; batchId: string; weightKg?: number };
/** Validate the full receipt before saving; each physical pail has its own test ID. */
export function proposeRackPositions(state: DemoState, lines: ReceiveLine[]): (string | null)[] {
  const planned = state.pails.filter(p => !p.purged);
  return lines.map((line, i) => {
    if (!allInkNames(state).includes(line.inkName)) return null;
    const location = recommendLocation(planned, line.inkName);
    if (location) planned.push({ batchId: `TEST-PREVIEW-${i}`, inkName: line.inkName, location, remainingPct: 100, checkedOut: false, demo: true });
    return location;
  });
}

export function receiveBulk(state: DemoState, lines: ReceiveLine[], employee: string, now = new Date().toISOString()): DemoState {
  if (!employee.trim()) throw Error("Enter the receiving employee.");
  if (!lines.length || lines.length > 180) throw Error("Enter between 1 and 180 pails.");
  if (lines.some(l => !allInkNames(state).includes(l.inkName))) throw Error("Select an exact ink name from the autocomplete suggestions.");
  if (lines.some(l => !l.batchId.trim() || !l.batchId.trim().startsWith("TEST-"))) throw Error("Enter a unique Batch ID beginning with TEST- for every demo pail.");
  if (lines.some(l => l.weightKg !== undefined && (!Number.isFinite(l.weightKg) || l.weightKg <= 0))) throw Error("Each receiving weight must be greater than zero.");
  const ids = lines.map(l => l.batchId.trim().toLowerCase());
  if (new Set(ids).size !== ids.length || ids.some(id => state.pails.some(p => p.batchId.toLowerCase() === id))) throw Error("Every Batch ID must be unique, including existing inventory.");
  let next = state;
  const proposals = proposeRackPositions(state, lines);
  for (const [index, line] of lines.entries()) {
    const location = proposals[index];
    if (!location) throw Error("Not enough free rack positions for the entire receipt. Nothing was saved.");
    next = applyDemoAction(next, { type: "RECEIVE", batchId: line.batchId.trim(), inkName: line.inkName, location, employee, remainingPct: 100, weightKg: line.weightKg }, now);
  }
  return next;
}
