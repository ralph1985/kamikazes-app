import { describe, expect, it } from "vitest";
import { orderShoppingProducts, shoppingGroupLabel } from "./shopping-list-order";

const product = (
  id: string,
  overrides: Partial<Parameters<typeof shoppingGroupLabel>[0]> = {},
) => ({
  assignment: null,
  categoryName: null,
  description: id,
  id,
  plannedQuantity: null,
  plannedTotal: null,
  plannedUnitPrice: null,
  status: "pending",
  storeName: null,
  ...overrides,
});

describe("orderShoppingProducts", () => {
  it("keeps every category in one consecutive block while ordering products inside it", () => {
    const ordered = orderShoppingProducts(
      [
        product("zumo", { categoryName: "Bebidas" }),
        product("arroz", { categoryName: "Comida" }),
        product("agua", { categoryName: "Bebidas" }),
      ],
      { groupBy: "category", insertedAfter: {}, sortBy: "description", sortDirection: "asc" },
    );

    expect(ordered.map((item) => item.id)).toEqual(["agua", "zumo", "arroz"]);
    expect(ordered.map((item) => shoppingGroupLabel(item, "category"))).toEqual([
      "Bebidas",
      "Bebidas",
      "Comida",
    ]);
  });

  it("uses the operational status order for status groups", () => {
    const ordered = orderShoppingProducts(
      [
        product("comprado", { status: "purchased" }),
        product("pendiente", { status: "pending" }),
        product("carrito", { status: "in_cart" }),
      ],
      { groupBy: "status", insertedAfter: {}, sortBy: "description", sortDirection: "asc" },
    );

    expect(ordered.map((item) => item.status)).toEqual(["pending", "in_cart", "purchased"]);
  });

  it("does not force a newly inserted product into a different group than its anchor", () => {
    const ordered = orderShoppingProducts(
      [
        product("agua", { categoryName: "Bebidas" }),
        product("arroz", { categoryName: "Comida" }),
        product("zumo", { categoryName: "Bebidas" }),
      ],
      {
        groupBy: "category",
        insertedAfter: { arroz: "agua" },
        sortBy: "description",
        sortDirection: "asc",
      },
    );

    expect(ordered.map((item) => item.id)).toEqual(["agua", "zumo", "arroz"]);
  });
});
