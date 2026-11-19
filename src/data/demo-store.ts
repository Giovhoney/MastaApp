import type { InkRequest } from "./ink-requests";
import type { ReorderRule } from "./reorder-alerts";
import { allInkNames, inkMasterWeight, type CustomInk } from "./ink-master";
import { isMachine } from "./machines";
import { calculatedRemainingPct, masterWeightKg } from "./weights";
import { testPails, type TestPail } from "./inks";

export type Pail = TestPail;
export type Movement = { id: string; batchId: string; action: "RECEIVE" | "CHECKOUT" | "RETURN" | "MOVE" | "PURGE"; employee: string; at: string; remainingPct: number; location: string; orderNumber?: string; receiptReference?: string; weightKg?: number; machine?: string; fromLocation?: string; reason?: string };
export type DemoState = { pails: Pail[]; movements: Movement[]; customInks?: CustomInk[]; reorderRules?: ReorderRule[]; inkRequests?: InkRequest[] };
export const DEMO_KEY = "mastaapp-demo-inventory-v1";
export const locations = ["A", "B"].flatMap(r => ["LL", "ML", "UL"].flatMap(l => Array.from({ length: 10 }, (_, i) => Array.from({ length: 3 }, (_, j) => `${r}-${l}-${String(i + 1).padStart(2, "0")}-${j + 1}`)).flat()));
export const initialDemo = (): DemoState => ({ pails: testPails.map(p => ({ ...p })), movements: [] });
export const colourFamily = (name: string) => ["Red","Blue","Green","Yellow","Orange","Purple","Brown","Grey","Gray","Black","White"].find(c => name.toLowerCase().includes(c.toLowerCase())) ?? "Other";
export function recommendLocation(pails: Pail[], inkName: string): string | null {
  const used = new Set(pails.filter(p => !p.purged).map(p => p.location));
  const candidates = locations.filter(l => !used.has(l));
  const same = pails.filter(p => !p.purged && p.inkName === inkName);
  const similar = pails.filter(p => !p.purged && colourFamily(p.inkName) === colourFamily(inkName));
  const score = (location: string) => {
    const [rack, level, partition, position] = location.split("-");
    const distance = (p: Pail) => {
      const [pr, pl, pp, ps] = p.location.split("-");
      return (pr === rack ? 0 : 100) + (pl === level ? 0 : 30) + Math.abs(Number(pp) - Number(partition)) * 3 + Math.abs(Number(ps) - Number(position));
    };
    if (same.length) return Math.min(...same.map(distance));
    if (similar.length) return 1000 + Math.min(...similar.map(distance));
    return 2000 + locations.indexOf(location);
  };
  return candidates.sort((a, b) => score(a) - score(b) || locations.indexOf(a) - locations.indexOf(b))[0] ?? null;
}
export function applyDemoAction(state: DemoState, action: { type: "RECEIVE" | "CHECKOUT" | "RETURN" | "MOVE" | "PURGE"; batchId: string; employee: string; inkName?: string; location?: string; remainingPct?: number; orderNumber?: string; receiptReference?: string; weightKg?: number; machine?: string; reason?: string }, now = new Date().toISOString()): DemoState {
  const batchId = action.batchId.trim();
  const employee = action.employee.trim();
  if (!batchId || !employee) throw Error("Batch ID and employee name are required.");
  const existing = state.pails.find(p => p.batchId.toLowerCase() === batchId.toLowerCase());
  const orderNumber = action.orderNumber?.trim();
  if (action.type === "PURGE" && !action.reason?.trim()) throw Error("Enter a reason for purging this pail.");
  if (action.type === "MOVE" && (!action.location || !locations.includes(action.location))) throw Error("Select a valid destination rack position.");
  if (action.type === "CHECKOUT" && (!orderNumber || orderNumber.length > 80)) throw Error("An order number (maximum 80 characters) is required for checkout traceability.");
  if (action.type === "CHECKOUT" && !isMachine(action.machine)) throw Error("Select a production machine for checkout.");
  let pails: Pail[];
  let pail: Pail;
  if (action.type === "RECEIVE") {
    if (existing) throw Error("This Batch ID already exists. Every test pail must have a unique Batch ID.");
    if (!batchId.startsWith("TEST-")) throw Error("Demo Batch IDs must begin with TEST-.");
    if (!action.inkName || !allInkNames(state).includes(action.inkName)) throw Error("Select an ink from the master list.");
    if (!action.location || !locations.includes(action.location)) throw Error("Select a valid rack location.");
    if (state.pails.some(p => !p.purged && p.location === action.location)) throw Error("This location is already assigned to another pail.");
    const pct = action.remainingPct ?? 100;
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) throw Error("Remaining percentage must be a whole number between 0 and 100.");
    const weight = action.weightKg ?? inkMasterWeight(state, action.inkName);
    if (!Number.isFinite(weight) || weight <= 0) throw Error("Receiving weight must be greater than zero.");
    pail = { receivingWeightKg: weight, currentWeightKg: weight * pct / 100, batchId, inkName: action.inkName, location: action.location, remainingPct: pct, checkedOut: false, demo: true };
    pails = [...state.pails, pail];
  } else {
    if (!existing) throw Error("Batch ID not found.");
    if (state.movements.some(m => m.batchId === existing.batchId && m.action === "PURGE")) throw Error("This pail has already been purged and cannot be used or moved.");
    if (action.type === "PURGE" && existing.checkedOut) throw Error("Return this pail before recording a purge.");
    if (action.type === "MOVE" && existing.checkedOut) throw Error("Return this pail before changing its rack position.");
    if (action.type === "MOVE" && state.pails.some(p => !p.purged && p.location === action.location)) throw Error("Destination position is occupied.");
    if (action.type === "CHECKOUT" && existing.checkedOut) throw Error("This pail is already checked out.");
    if (action.type === "CHECKOUT" && existing.remainingPct === 0) throw Error("An empty pail cannot be checked out.");
    if (action.type === "RETURN" && !existing.checkedOut) throw Error("This pail is not checked out.");
    if (action.type === "RETURN" && action.weightKg === undefined) throw Error("Enter the new return weight in kg.");
    const pct = action.type === "RETURN" && action.weightKg !== undefined ? calculatedRemainingPct(existing.receivingWeightKg ?? masterWeightKg(existing.inkName), action.weightKg) : action.type === "RETURN" ? action.remainingPct : existing.remainingPct;
    if (pct === undefined || !Number.isInteger(pct) || pct < 0 || pct > 100) throw Error("Enter a whole percentage between 0 and 100.");
    if (action.type === "RETURN" && pct > existing.remainingPct) throw Error("Returned percentage cannot exceed the checkout percentage.");
    const baseWeight = existing.receivingWeightKg ?? masterWeightKg(existing.inkName);
    const currentWeight = action.type === "RETURN" && action.weightKg !== undefined ? action.weightKg : (existing.currentWeightKg ?? baseWeight * existing.remainingPct / 100);
    const calculatedPct = action.type === "RETURN" && action.weightKg !== undefined ? calculatedRemainingPct(baseWeight, currentWeight) : pct;
    if (action.type === "RETURN" && currentWeight > (existing.currentWeightKg ?? baseWeight * existing.remainingPct / 100) + 0.000001) throw Error("Return weight cannot exceed checkout weight.");
    pail = { ...existing, purged: action.type === "PURGE" ? true : existing.purged, location: action.type === "MOVE" ? action.location! : existing.location, receivingWeightKg: baseWeight, currentWeightKg: currentWeight, remainingPct: calculatedPct, checkedOut: action.type === "CHECKOUT" };
    pails = state.pails.map(p => p.batchId === existing.batchId ? pail : p);
  }
  const linkedOrder = action.type === "RETURN"
    ? state.movements.find(m => m.batchId === batchId && m.action === "CHECKOUT")?.orderNumber
    : orderNumber;
  const linkedMachine = action.type === "RETURN" ? state.movements.find(m => m.batchId === batchId && m.action === "CHECKOUT")?.machine : action.machine;
  const movement: Movement = { reason: action.type === "PURGE" ? action.reason?.trim() : undefined, fromLocation: action.type === "MOVE" ? existing?.location : undefined, machine: linkedMachine, receiptReference: action.receiptReference?.trim(), orderNumber: linkedOrder, id: `${now}-${batchId}-${action.type}`, batchId, action: action.type, employee, at: now, remainingPct: pail.remainingPct, location: pail.location, weightKg: pail.currentWeightKg };
  return { ...state, pails, movements: [movement, ...state.movements] };
}
export function parseDemoState(value: string | null): DemoState {
  if (!value) return initialDemo();
  try {
    const data: unknown = JSON.parse(value);
    if (!data || typeof data !== "object" || !("pails" in data) || !("movements" in data)) return initialDemo();
    const obj = data as DemoState;
    if (obj.customInks !== undefined && (!Array.isArray(obj.customInks) || !obj.customInks.every(i => typeof i.name === "string" && i.name.trim() && Number.isFinite(i.weightKg) && i.weightKg > 0) || new Set(obj.customInks.map(i => i.name.toLowerCase())).size !== obj.customInks.length)) return initialDemo();
    if (obj.reorderRules !== undefined && (!Array.isArray(obj.reorderRules) || !obj.reorderRules.every(r => allInkNames(obj).includes(r.inkName) && Number.isSafeInteger(r.minimumPails) && r.minimumPails >= 0 && r.minimumPails <= 10000 && typeof r.responsiblePerson === "string") || new Set(obj.reorderRules.map(r => r.inkName)).size !== obj.reorderRules.length)) return initialDemo();
    if (obj.inkRequests !== undefined && (!Array.isArray(obj.inkRequests) || !obj.inkRequests.every(r => typeof r.id === "string" && typeof r.name === "string" && r.name.trim() && Number.isFinite(r.weightKg) && r.weightKg > 0 && typeof r.requestedBy === "string" && typeof r.requestedAt === "string" && ["PENDING","APPROVED","REJECTED"].includes(r.status)))) return initialDemo();
    if (!Array.isArray(obj.pails) || !Array.isArray(obj.movements) || !obj.pails.every(p => p.demo === true && typeof p.batchId === "string" && typeof p.location === "string" && locations.includes(p.location) && typeof p.remainingPct === "number" && typeof p.checkedOut === "boolean" && (p.purged === undefined || typeof p.purged === "boolean") && allInkNames(obj).includes(p.inkName))) return initialDemo();
    if (new Set(obj.pails.map(p => p.batchId.toLowerCase())).size !== obj.pails.length || new Set(obj.pails.filter(p => !p.purged && !obj.movements.some(m => m.batchId === p.batchId && m.action === "PURGE")).map(p => p.location)).size !== obj.pails.filter(p => !p.purged && !obj.movements.some(m => m.batchId === p.batchId && m.action === "PURGE")).length) return initialDemo();
    return { ...obj, pails: obj.pails.map(p => {
      const receivingWeightKg = p.receivingWeightKg && p.receivingWeightKg > 0 ? p.receivingWeightKg : masterWeightKg(p.inkName);
      return { ...p, purged: p.purged || obj.movements.some(m => m.batchId === p.batchId && m.action === "PURGE"), receivingWeightKg, currentWeightKg: p.currentWeightKg !== undefined ? p.currentWeightKg : receivingWeightKg * p.remainingPct / 100 };
    }) };
  } catch { return initialDemo(); }
}
