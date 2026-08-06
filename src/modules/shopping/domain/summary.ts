import { calculateShoppingTotal } from "./product";

export type ShoppingSummaryProduct = {
  plannedQuantity: string | number | null;
  plannedUnitPrice: string | number | null;
  realQuantity: string | number | null;
  realUnitPrice: string | number | null;
  status: string;
};

export type ShoppingSummary = {
  budgetTotal: number;
  plannedTotal: number;
  cartTotal: number;
  realTotal: number;
  availableNow: number;
  availableReal: number;
};

export function calculateShoppingSummary(
  products: readonly ShoppingSummaryProduct[],
  budgetTotal: number,
  realTotal: number,
): ShoppingSummary {
  const plannedTotal = products.reduce(
    (total, product) =>
      total + (calculateShoppingTotal(product.plannedQuantity, product.plannedUnitPrice) ?? 0),
    0,
  );
  const cartTotal = products.reduce((total, product) => {
    if (product.status !== "in_cart") return total;
    return total + (calculateShoppingTotal(product.realQuantity, product.realUnitPrice) ?? 0);
  }, 0);

  return {
    budgetTotal,
    plannedTotal,
    cartTotal,
    realTotal,
    availableNow: budgetTotal - cartTotal,
    availableReal: budgetTotal - realTotal,
  };
}
