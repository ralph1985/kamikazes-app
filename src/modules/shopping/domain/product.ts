export const shoppingStatuses = [
  "pending",
  "in_cart",
  "purchased",
  "not_buying",
  "gifted",
] as const;

export type ShoppingStatus = (typeof shoppingStatuses)[number];

export function calculateShoppingTotal(
  quantity: string | number | null,
  unitPrice: string | number | null,
) {
  if (quantity === null || unitPrice === null) return null;
  return Number(quantity) * Number(unitPrice);
}

export function validateShoppingProductRules(input: {
  plannedQuantity: number | null;
  realQuantity: number | null;
  realUnitPrice: number | null;
  status: ShoppingStatus;
  notes: string | null;
}) {
  if ((input.plannedQuantity ?? 0) < 0 || (input.realQuantity ?? 0) < 0) {
    if (!input.notes?.trim()) return "negative_quantity_requires_note" as const;
  }
  if (input.status === "purchased" && input.realUnitPrice === null) {
    return "purchased_requires_real_price" as const;
  }
  return null;
}
