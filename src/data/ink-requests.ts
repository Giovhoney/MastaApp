import { addInkMaster, allInkNames } from "./ink-master";
import type { DemoState } from "./demo-store";
export type InkRequest = { id: string; name: string; weightKg: number; requestedBy: string; requestedAt: string; status: "PENDING" | "APPROVED" | "REJECTED"; reviewedBy?: string; reviewedAt?: string; note?: string };
export function requestNewInk(state: DemoState, name: string, weightKg: number, requestedBy: string, at = new Date().toISOString()): DemoState {
  const clean = name.trim().replace(/\s+/g," ");
  if (!requestedBy.trim()) throw Error("Enter the receiving employee's name.");
  if (!clean || clean.length > 120) throw Error("Enter a new ink name (up to 120 characters).");
  if (!Number.isFinite(weightKg) || weightKg <= 0) throw Error("Enter a valid full-pail gross weight.");
  if (allInkNames(state).some(n => n.toLowerCase() === clean.toLowerCase())) throw Error("This ink already exists in the master list. Select it instead.");
  if ((state.inkRequests ?? []).some(r => r.status === "PENDING" && r.name.toLowerCase() === clean.toLowerCase())) throw Error("A request for this ink is already awaiting approval.");
  return {...state, inkRequests:[...(state.inkRequests ?? []), {id:`${at}-${clean}`,name:clean,weightKg,requestedBy:requestedBy.trim(),requestedAt:at,status:"PENDING"}]};
}
export function reviewInkRequest(state: DemoState, id: string, approve: boolean, reviewedBy: string, note = "", at = new Date().toISOString()): DemoState {
  if (!reviewedBy.trim()) throw Error("Enter the reviewer name.");
  const request = state.inkRequests?.find(r => r.id === id);
  if (!request || request.status !== "PENDING") throw Error("Request is not pending.");
  const next = approve ? addInkMaster(state,request.name,request.weightKg) : state;
  return {...next, inkRequests:next.inkRequests?.map(r=>r.id===id ? {...r,status:approve ? "APPROVED" as const : "REJECTED" as const,reviewedBy:reviewedBy.trim(),reviewedAt:at,note:note.trim()} : r)};
}
