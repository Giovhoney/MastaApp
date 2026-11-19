import { describe, expect, it } from "vitest";
import { initialDemo, parseDemoState } from "../demo-store";
import { allInkNames } from "../ink-master";
import { requestNewInk, reviewInkRequest } from "../ink-requests";
import { receiveBulk } from "../bulk-receive";

describe("receiving new ink approval", () => {
  it("submits, persists, approves and receives a new ink", () => {
    const name = "New Special Orange 2026";
    let state = requestNewInk(initialDemo(), name, 18.5, "Receiver");
    expect(allInkNames(state)).not.toContain(name);
    expect(() => requestNewInk(state,name,18.5,"Receiver")).toThrow();
    state = parseDemoState(JSON.stringify(state));
    expect(state.inkRequests?.[0].status).toBe("PENDING");
    state = reviewInkRequest(state,state.inkRequests![0].id,true,"Ink Admin");
    expect(allInkNames(state)).toContain(name);
    expect(state.inkRequests?.[0].status).toBe("APPROVED");
    state = receiveBulk(state,[{inkName:name,batchId:"TEST-NEW-INK-001"}],"Receiver");
    expect(state.pails.find(p=>p.batchId==="TEST-NEW-INK-001")?.receivingWeightKg).toBe(18.5);
  });
  it("rejects without changing the master list", () => {
    let state = requestNewInk(initialDemo(),"Rejected Ink",20,"Receiver");
    state = reviewInkRequest(state,state.inkRequests![0].id,false,"Ink Admin");
    expect(allInkNames(state)).not.toContain("Rejected Ink");
  });
});
