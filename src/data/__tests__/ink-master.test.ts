import { describe, expect, it } from "vitest";
import { addInkMaster, allInkNames, inkMasterWeight } from "../ink-master";
import { applyDemoAction, initialDemo, parseDemoState } from "../demo-store";
import { receiveBulk } from "../bulk-receive";

describe("demo ink master additions", () => {
  it("adds a unique ink with its own full-pail reference weight and persists it", () => {
    const state = addInkMaster(initialDemo(), "NEW PMS 123", 23.5);
    expect(allInkNames(state)).toContain("NEW PMS 123");
    expect(inkMasterWeight(state, "NEW PMS 123")).toBe(23.5);
    const restored = parseDemoState(JSON.stringify(state));
    expect(restored.customInks).toEqual([{ name: "NEW PMS 123", weightKg: 23.5 }]);
    const received = receiveBulk(restored, [{ inkName: "NEW PMS 123", batchId: "TEST-NEW-INK" }], "Receiver");
    expect(received.pails.find(p => p.batchId === "TEST-NEW-INK")?.receivingWeightKg).toBe(23.5);
  });
  it("rejects duplicate names and invalid weights", () => {
    expect(() => addInkMaster(initialDemo(), "74 red", 20)).toThrow(/already exists/);
    expect(() => addInkMaster(initialDemo(), "New ink", 0)).toThrow(/weight/);
    const state = addInkMaster(initialDemo(), "New ink", 18);
    expect(() => addInkMaster(state, "NEW INK", 19)).toThrow(/already exists/);
    expect(() => applyDemoAction(initialDemo(), {type:"RECEIVE", batchId:"TEST-UNKNOWN", inkName:"New ink", employee:"Receiver", location:"B-UL-10-3"})).toThrow(/master list/);
  });
});
