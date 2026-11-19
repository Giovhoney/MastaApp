"use client";
import { useCallback, useEffect, useState } from "react";
import { inkNames } from "@/data/inks";
import { locations } from "@/data/demo-store";

type Pail = { batchId: string; inkName: string; location: string; remainingPct: number; status: string; receivingWeightKg?: number; currentWeightKg?: number; machine?: string };
type Movement = { id: string; batchId: string; action: string; employee: string; employeeId: string; at: string; location: string; orderNumber?: string; remainingPct: number; note?: string };
type Action = "RECEIVE" | "CHECKOUT" | "RETURN" | "MOVE" | "PURGE";
const field = "rounded-lg border border-slate-300 px-3 py-2 w-full bg-white text-slate-900";
export default function Pilot() {
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [pails, setPails] = useState<Pail[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<Action>("CHECKOUT");
  const [batchId, setBatchId] = useState("");
  const [inkName, setInkName] = useState(inkNames[0]);
  const [location, setLocation] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [machine, setMachine] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [reason, setReason] = useState("");
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/pilot", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw Error(data.error ?? "Unable to load shared inventory");
      setPails(data.pails); setMovements(data.movements); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Connection failed"); }
  }, []);
  useEffect(() => { const initial = window.setTimeout(() => void refresh(), 0); const interval = window.setInterval(() => void refresh(), 5000); return () => { window.clearTimeout(initial); window.clearInterval(interval); }; }, [refresh]);
  const selected = pails.find(p => p.batchId === batchId);
  const occupied = new Set(pails.map(p => p.location));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/pilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, batchId, employeeId, employeeName, inkName, location, orderNumber, machine, weightKg: weightKg === "" ? undefined : Number(weightKg), reason }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error ?? "Transaction failed");
      setMessage(`${action} recorded in shared MySQL inventory for ${batchId}`);
      setBatchId(""); setWeightKg(""); setLocation(""); setReason(""); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Transaction failed"); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-slate-100 p-5 md:p-10 text-slate-900"><div className="max-w-6xl mx-auto space-y-6">
    <header className="flex flex-wrap justify-between items-start gap-4"><div><h1 className="text-3xl font-bold">MastaApp · Shared MySQL Pilot</h1><p className="text-slate-600 mt-1">Real-time database testing · refreshes every 5 seconds · fictional TEST- inventory only</p></div><span className="bg-amber-100 text-amber-900 rounded-lg px-3 py-2 text-sm font-semibold">TEST ENVIRONMENT — NOT ACTUAL STOCK</span></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 border border-red-300 p-3 text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-green-50 border border-green-300 p-3 text-green-800">{message}</p>}
    <section className="bg-white p-5 rounded-xl border space-y-3"><h2 className="font-bold text-lg">Employee identification</h2><p className="text-sm text-amber-800">ID and name identify who performed a test transaction; they are not secure authentication. Never enter real company records here.</p><div className="grid md:grid-cols-2 gap-3"><label className="space-y-1 text-sm">Employee ID<input className={field} value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="e.g. TEST-EMP-01" required /></label><label className="space-y-1 text-sm">Full name<input className={field} value={employeeName} onChange={e => setEmployeeName(e.target.value)} placeholder="e.g. Pilot Operator" required /></label></div></section>
    <div className="grid lg:grid-cols-2 gap-5"><section className="bg-white p-5 rounded-xl border space-y-4"><h2 className="font-bold text-lg">Record a shared transaction</h2><form onSubmit={submit} className="space-y-3"><label className="block text-sm">Action<select className={field} value={action} onChange={e => {setAction(e.target.value as Action);setBatchId("");setWeightKg("");}}>{(["RECEIVE","CHECKOUT","RETURN","MOVE","PURGE"] as Action[]).map(a=><option key={a}>{a}</option>)}</select></label><label className="block text-sm">Test pail ID{action === "RECEIVE" ? <input className={field} value={batchId} onChange={e=>setBatchId(e.target.value)} placeholder="TEST-NEW-001" required/> : <select className={field} value={batchId} onChange={e=>setBatchId(e.target.value)} required><option value="">Select pail</option>{pails.filter(p=>action === "CHECKOUT" ? p.status === "STORED" : action === "RETURN" ? p.status === "CHECKED_OUT" : p.status !== "RETIRED").map(p=><option key={p.batchId} value={p.batchId}>{p.batchId} · {p.inkName} · {p.status}</option>)}</select>}</label>
      {action === "RECEIVE" && <label className="block text-sm">Ink description<select className={field} value={inkName} onChange={e=>setInkName(e.target.value)}>{inkNames.map(n=><option key={n}>{n}</option>)}</select></label>}
      {(action === "RECEIVE" || action === "MOVE") && <label className="block text-sm">Free rack position<select className={field} value={location} onChange={e=>setLocation(e.target.value)} required><option value="">Choose a free rack position</option>{locations.filter(l=>!occupied.has(l)).map(l=><option key={l}>{l}</option>)}</select></label>}
      {action === "CHECKOUT" && <><label className="block text-sm">Production order<input className={field} value={orderNumber} onChange={e=>setOrderNumber(e.target.value)} required/></label><label className="block text-sm">Machine<input className={field} value={machine} onChange={e=>setMachine(e.target.value)} required placeholder="e.g. TCY"/></label></>}
      {(action === "RECEIVE" || action === "RETURN") && <label className="block text-sm">{action === "RECEIVE" ? "Full-pail gross weight (kg)" : `Returned gross weight (kg) · last ${selected?.currentWeightKg ?? "?"}`}<input className={field} type="number" min="0" max={action === "RETURN" ? selected?.currentWeightKg : undefined} step="0.01" value={weightKg} onChange={e=>setWeightKg(e.target.value)} required/></label>}
      {action === "PURGE" && <label className="block text-sm">Reason for purge<input className={field} value={reason} onChange={e=>setReason(e.target.value)} required/></label>}
      <button disabled={busy || !employeeId.trim() || !employeeName.trim()} className="bg-blue-700 text-white rounded-lg px-5 py-3 font-semibold disabled:opacity-40">{busy ? "Saving…" : `Record ${action.toLowerCase()} in MySQL`}</button></form></section>
      <section className="bg-white p-5 rounded-xl border"><div className="flex justify-between gap-3 mb-4"><h2 className="font-bold text-lg">Shared rack inventory ({pails.length})</h2><button className="text-blue-700 text-sm font-semibold" onClick={()=>void refresh()}>Refresh now</button></div><div className="max-h-[540px] overflow-auto divide-y">{pails.map(p=><div key={p.batchId} className="py-3 text-sm flex justify-between gap-3"><div><strong>{p.batchId}</strong><div className="text-slate-600">{p.inkName} · {p.location}</div></div><div className="text-right">{p.remainingPct}%<div className="text-slate-600">{p.status}{p.machine ? ` · ${p.machine}` : ""}</div></div></div>)}{!pails.length && <p className="text-slate-500 text-sm">No test pails in MySQL yet.</p>}</div></section></div>
    <section className="bg-white p-5 rounded-xl border"><h2 className="font-bold text-lg mb-4">Shared transaction history</h2><div className="overflow-auto max-h-96"><table className="w-full text-sm text-left"><thead><tr className="border-b">{["When","Pail","Action","Employee","Order","Rack","Remaining"].map(x=><th className="p-2" key={x}>{x}</th>)}</tr></thead><tbody>{movements.map(m=><tr key={m.id} className="border-b"><td className="p-2 whitespace-nowrap">{new Date(m.at).toLocaleString()}</td><td className="p-2">{m.batchId}</td><td className="p-2">{m.action}</td><td className="p-2">{m.employee} ({m.employeeId})</td><td className="p-2">{m.orderNumber ?? "—"}</td><td className="p-2">{m.location ?? "—"}</td><td className="p-2">{m.remainingPct}%</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
