import { inkNames } from "./inks";
import { masterWeightKg } from "./weights";
import type { DemoState } from "./demo-store";

export type CustomInk = { name: string; weightKg: number };
export const allInkNames = (state: DemoState): string[] => [...inkNames, ...(state.customInks ?? []).map(i => i.name)].sort((a,b) => a.localeCompare(b));
export const inkMasterWeight = (state: DemoState, name: string): number => state.customInks?.find(i => i.name === name)?.weightKg ?? masterWeightKg(name);
export function addInkMaster(state: DemoState, name: string, weightKg: number): DemoState {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean || clean.length > 120) throw Error("Enter an ink name (up to 120 characters).");
  if (allInkNames(state).some(n => n.toLowerCase() === clean.toLowerCase())) throw Error("This ink already exists in the master list.");
  if (!Number.isFinite(weightKg) || weightKg <= 0) throw Error("Enter a valid master full-pail weight greater than zero.");
  return { ...state, customInks: [...(state.customInks ?? []), { name: clean, weightKg }] };
}
