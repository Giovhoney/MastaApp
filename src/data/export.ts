import type { DemoState } from "./demo-store";

/** Escape values for spreadsheet CSV, including formula injection prevention. */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[\t\r\n ]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function csvTable(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
export function inventoryCsv(state: DemoState): string {
  return csvTable(["Batch ID", "Ink Name", "Rack Location", "Remaining %", "Status", "Demo Record"], state.pails.map(p => [p.batchId, p.inkName, p.location, p.remainingPct, p.purged ? "Purged" : p.checkedOut ? "Checked Out" : p.remainingPct === 0 ? "Empty" : "Stored", "YES"]));
}
export function movementCsv(state: DemoState): string {
  return csvTable(["Timestamp (UTC)", "Action", "Batch ID", "Order Number", "Machine", "Employee", "Location", "Previous Location", "Remaining %", "Purge Reason", "Demo Record"], state.movements.map(m => [m.at, m.action, m.batchId, m.orderNumber ?? "", m.machine ?? "", m.employee, m.location, m.fromLocation ?? "", m.remainingPct, m.reason ?? "", "YES"]));
}
