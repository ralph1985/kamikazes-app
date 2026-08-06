import { describe, expect, it } from "vitest";
import { calculateShoppingSummary } from "./summary";

describe("shopping summary", () => {
  it("separates forecast, cart commitment and ticket spend", () => {
    const summary = calculateShoppingSummary(
      [
        {
          plannedQuantity: "2",
          plannedUnitPrice: "3.50",
          realQuantity: "2",
          realUnitPrice: "4.00",
          status: "in_cart",
        },
        {
          plannedQuantity: "1",
          plannedUnitPrice: "9.00",
          realQuantity: "1",
          realUnitPrice: "8.00",
          status: "purchased",
        },
      ],
      100,
      8,
    );

    expect(summary).toEqual({
      budgetTotal: 100,
      plannedTotal: 16,
      cartTotal: 8,
      realTotal: 8,
      availableNow: 92,
      availableReal: 92,
    });
  });

  it("does not invent totals when quantity or price is missing", () => {
    const summary = calculateShoppingSummary(
      [
        {
          plannedQuantity: null,
          plannedUnitPrice: "4.00",
          realQuantity: "2",
          realUnitPrice: null,
          status: "in_cart",
        },
      ],
      40,
      0,
    );

    expect(summary.plannedTotal).toBe(0);
    expect(summary.cartTotal).toBe(0);
    expect(summary.availableNow).toBe(40);
  });
});
