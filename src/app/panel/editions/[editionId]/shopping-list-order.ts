export const shoppingStatuses = [
  ["pending", "Pendiente"],
  ["in_cart", "En carrito"],
  ["purchased", "Comprado"],
  ["not_buying", "No se compra"],
  ["gifted", "Regalado"],
] as const;

type GroupableProduct = {
  id: string;
  description: string;
  categoryName: string | null;
  storeName: string | null;
  assignment: string | null;
  status: string;
  plannedQuantity: string | null;
  plannedUnitPrice: string | null;
  plannedTotal: number | null;
};

type ShoppingOrder = {
  groupBy: string;
  sortBy: string;
  sortDirection: string;
  insertedAfter: Record<string, string>;
};

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

export function shoppingGroupLabel(product: GroupableProduct, groupBy: string) {
  if (groupBy === "store") return product.storeName || "Sin tienda";
  if (groupBy === "assignment") return product.assignment || "Sin asignación";
  if (groupBy === "status")
    return shoppingStatuses.find(([value]) => value === product.status)?.[1] ?? product.status;
  return product.categoryName || "Sin categoría";
}

function compareGroups(a: GroupableProduct, b: GroupableProduct, groupBy: string) {
  if (groupBy === "status") {
    const index = (product: GroupableProduct) => {
      const statusIndex = shoppingStatuses.findIndex(([value]) => value === product.status);
      return statusIndex === -1 ? shoppingStatuses.length : statusIndex;
    };
    return index(a) - index(b);
  }

  return collator.compare(shoppingGroupLabel(a, groupBy), shoppingGroupLabel(b, groupBy));
}

function compareBySelectedField(a: GroupableProduct, b: GroupableProduct, sortBy: string) {
  const value = (product: GroupableProduct) =>
    sortBy === "unit_price"
      ? Number(product.plannedUnitPrice ?? 0)
      : sortBy === "quantity"
        ? Number(product.plannedQuantity ?? 0)
        : sortBy === "total"
          ? Number(product.plannedTotal ?? 0)
          : product.description;

  const left = value(a);
  const right = value(b);
  return typeof left === "string" && typeof right === "string"
    ? collator.compare(left, right)
    : left < right
      ? -1
      : left > right
        ? 1
        : 0;
}

export function orderShoppingProducts<T extends GroupableProduct>(
  products: T[],
  { groupBy, sortBy, sortDirection, insertedAfter }: ShoppingOrder,
) {
  const sorted = [...products].sort((a, b) => {
    const groupComparison = compareGroups(a, b, groupBy);
    if (groupComparison) return groupComparison;

    const comparison = compareBySelectedField(a, b, sortBy);
    if (comparison) return sortDirection === "desc" ? -comparison : comparison;

    return collator.compare(a.description, b.description) || collator.compare(a.id, b.id);
  });
  const productsById = new Map(sorted.map((product) => [product.id, product]));
  const children = new Map<string, T[]>();
  const insertedIds = new Set<string>();

  sorted.forEach((product) => {
    const anchor = productsById.get(insertedAfter[product.id]);
    if (!anchor || compareGroups(anchor, product, groupBy) !== 0) return;
    children.set(anchor.id, [...(children.get(anchor.id) ?? []), product]);
    insertedIds.add(product.id);
  });

  return sorted
    .filter((product) => !insertedIds.has(product.id))
    .flatMap((product) => [product, ...(children.get(product.id) ?? [])]);
}
