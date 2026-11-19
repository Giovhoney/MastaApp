import type { Pail } from "./demo-store";
export type InkStock = { inkName: string; total: number; inStock: number; checkedOut: number; empty: number; low: number };
/** In stock = physically stored pails with ink remaining; checked-out pails are counted separately. */
export function summarizeInkStock(pails: Pail[]): InkStock[] {
  const groups = new Map<string, InkStock>();
  for (const pail of pails) {
    if (pail.purged) continue;
    const entry = groups.get(pail.inkName) ?? { inkName: pail.inkName, total: 0, inStock: 0, checkedOut: 0, empty: 0, low: 0 };
    entry.total++;
    if (pail.checkedOut) entry.checkedOut++;
    else if (pail.remainingPct === 0) entry.empty++;
    else entry.inStock++;
    if (pail.remainingPct > 0 && pail.remainingPct <= 25) entry.low++;
    groups.set(pail.inkName, entry);
  }
  return [...groups.values()].sort((a, b) => b.inStock - a.inStock || a.inkName.localeCompare(b.inkName));
}
