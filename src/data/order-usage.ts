import type { DemoState } from "./demo-store";

export type OrderUsageLine = { orderNumber: string; machine?: string; batchId: string; inkName: string; checkoutAt: string; returnAt?: string; startPct: number; endPct?: number; usedPercentagePoints?: number; status: "Complete" | "Outstanding" };

/** Pairs each return with the most recent unreturned checkout for that physical pail.
 * Percent-point change is NOT a mass/volume measurement and cannot be summed as kg.
 */
export function orderUsage(state: DemoState): OrderUsageLine[] {
  const inkByBatch = new Map(state.pails.map(p => [p.batchId, p.inkName]));
  const open = new Map<string, OrderUsageLine>();
  const result: OrderUsageLine[] = [];
  const ordered = [...state.movements].sort((a, b) => a.at.localeCompare(b.at));
  for (const m of ordered) {
    if (m.action === "CHECKOUT") {
      const line: OrderUsageLine = { orderNumber: m.orderNumber ?? "", machine: m.machine, batchId: m.batchId, inkName: inkByBatch.get(m.batchId) ?? "Unknown ink", checkoutAt: m.at, startPct: m.remainingPct, status: "Outstanding" };
      result.push(line);
      open.set(m.batchId, line);
    } else if (m.action === "RETURN") {
      const line = open.get(m.batchId);
      if (line && m.remainingPct <= line.startPct) {
        line.endPct = m.remainingPct;
        line.returnAt = m.at;
        line.usedPercentagePoints = line.startPct - m.remainingPct;
        line.status = "Complete";
        open.delete(m.batchId);
      }
    }
  }
  return result.filter(l => l.orderNumber).reverse();
}

export function orderUsageCsv(lines: OrderUsageLine[]): string {
  const escape = (value: string | number) => {
    let text = String(value);
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return [
    ["Order Number", "Machine", "Ink", "Batch ID", "Checkout Time", "Return Time", "Start %", "Return %", "Used (percentage points)", "Status", "Demo"],
    ...lines.map(l => [l.orderNumber, l.machine ?? "", l.inkName, l.batchId, l.checkoutAt, l.returnAt ?? "", l.startPct, l.endPct ?? "", l.usedPercentagePoints ?? "", l.status, "YES"]),
  ].map(row => row.map(escape).join(",")).join("\r\n") + "\r\n";
}
