import { describe, expect, it } from "vitest";
import { calculateShoppingTotal, validateShoppingProductRules } from "./product";

describe("shopping product rules", () => {
  it("calculates totals only when quantity and price exist", () => {
    expect(calculateShoppingTotal("2.50", "3.20")).toBe(8);
    expect(calculateShoppingTotal(null, "3.20")).toBeNull();
  });

  it("requires a note for negative quantities", () => {
    expect(
      validateShoppingProductRules({
        plannedQuantity: -1,
        realQuantity: null,
        realUnitPrice: null,
        status: "pending",
        notes: null,
      }),
    ).toBe("negative_quantity_requires_note");
  });

  it("requires a real price before marking a product purchased", () => {
    expect(
      validateShoppingProductRules({
        plannedQuantity: 1,
        realQuantity: 1,
        realUnitPrice: null,
        status: "purchased",
        notes: null,
      }),
    ).toBe("purchased_requires_real_price");
  });
});
