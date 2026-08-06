import { describe, expect, it } from "vitest";
import { prepareBudgetTransaction } from "./prepare-transaction";

describe("preparación de transacciones de presupuesto", () => {
  it("excluye la transacción que se está corrigiendo del neto actual", () => {
    const result = prepareBudgetTransaction("refund", 25, "refund", [
      { id: "payment", amount: "100.00" },
      { id: "refund", amount: "-10.00" },
    ]);
    expect(result.currentNet).toBe(100);
    expect(result.canApply).toBe(true);
  });
});
