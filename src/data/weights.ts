import type { DemoState } from "./demo-store";
/** Fictional reference gross weights (kg). No container tare is subtracted. */
export function masterWeightKg(inkName: string): number {
  const n = inkName.toLowerCase();
  return n.includes("white") ? 22 : n.includes("black") ? 20 : n.includes("blue") ? 19 : n.includes("red") ? 20 : n.includes("green") ? 18 : n.includes("yellow") ? 19 : 20;
}
export function previousWeightKg(state: DemoState, inkName: string): number | undefined {
  const matching = state.pails.filter(p => p.inkName === inkName && typeof p.receivingWeightKg === "number" && p.receivingWeightKg > 0);
  const ranked = matching.map(p => ({ p, date: state.movements.find(m => m.batchId === p.batchId && m.action === "RECEIVE")?.at ?? "" })).sort((a,b) => b.date.localeCompare(a.date));
  return ranked[0]?.p.receivingWeightKg;
}
export function calculatedRemainingPct(receivingWeightKg: number, currentWeightKg: number): number {
  if (!Number.isFinite(receivingWeightKg) || receivingWeightKg <= 0 || !Number.isFinite(currentWeightKg) || currentWeightKg < 0 || currentWeightKg > receivingWeightKg) throw Error("Weight must be between 0 and the receiving weight.");
  return Math.round(currentWeightKg / receivingWeightKg * 100);
}
