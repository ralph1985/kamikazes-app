import { describe, expect, it } from "vitest";
import { canApplyBudgetTransaction, signedBudgetAmount } from "./transaction";

describe("reglas de movimientos de presupuesto", () => {
  it("representa los pagos como positivos y las devoluciones como negativas", () => {
    expect(signedBudgetAmount("payment", 25)).toBe(25);
    expect(signedBudgetAmount("refund", 25)).toBe(-25);
  });

  it("no permite que las devoluciones superen el neto pagado", () => {
    expect(canApplyBudgetTransaction(100, -25)).toBe(true);
    expect(canApplyBudgetTransaction(25, -25)).toBe(true);
    expect(canApplyBudgetTransaction(25, -25.01)).toBe(false);
  });
});
