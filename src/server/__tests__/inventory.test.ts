import { describe, expect, it } from "vitest";
import { checkoutSchema, receiveSchema, returnSchema } from "../inventory";

describe("backend inventory input validation", () => {
  it("accepts valid receiving input", () => {
    expect(receiveSchema.parse({ batchId: " LOT-1 ", inkId: "ink-id", locationCode: "B-UL-10-3", remainingPct: 100 }).batchId).toBe("LOT-1");
  });
  it("rejects invalid locations and percentages", () => {
    expect(receiveSchema.safeParse({ batchId: "1", inkId: "ink", locationCode: "C-LL-01-1", remainingPct: 100 }).success).toBe(false);
    expect(receiveSchema.safeParse({ batchId: "1", inkId: "ink", locationCode: "A-LL-11-1", remainingPct: 100 }).success).toBe(false);
    expect(receiveSchema.safeParse({ batchId: "1", inkId: "ink", locationCode: "A-LL-01-1", remainingPct: 101 }).success).toBe(false);
  });
  it("requires an order number for production traceability", () => {
    expect(checkoutSchema.safeParse({ batchId: "LOT-1" }).success).toBe(false);
    expect(checkoutSchema.parse({ batchId: "LOT-1", orderNumber: " 304027 " }).orderNumber).toBe("304027");
  });
  it("requires Batch ID and bounded return percentage", () => {
    expect(checkoutSchema.safeParse({ batchId: "", orderNumber: "304027" }).success).toBe(false);
    expect(returnSchema.safeParse({ batchId: "1", remainingPct: -1 }).success).toBe(false);
    expect(returnSchema.safeParse({ batchId: "1", remainingPct: 40 }).success).toBe(true);
  });
});
