"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { MoneyCell } from "@/components/lists/list-patterns";
import styles from "./shopping.module.css";

export type ShoppingTableProduct = {
  id: string;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  storeId: string | null;
  storeName: string | null;
  assignment: string | null;
  plannedQuantity: string | null;
  realQuantity: string | null;
  plannedUnitPrice: string | null;
  realUnitPrice: string | null;
  plannedTotal: number | null;
  realTotal: number | null;
  notes: string | null;
  status: string;
};

type Option = { id: string; name: string };
type Field =
  | "description"
  | "store"
  | "category"
  | "assignment"
  | "plannedQuantity"
  | "plannedUnitPrice"
  | "realQuantity"
  | "realUnitPrice"
  | "notes"
  | "status";
type FilterField = "query" | "storeId" | "categoryId" | "assignment" | "status";

const statuses = [
  ["pending", "Pendiente"],
  ["in_cart", "En carrito"],
  ["purchased", "Comprado"],
  ["not_buying", "No se compra"],
  ["gifted", "Regalado"],
] as const;

function groupLabel(product: ShoppingTableProduct, groupBy: string) {
  if (groupBy === "store") return product.storeName || "Sin tienda";
  if (groupBy === "assignment") return product.assignment || "Sin asignación";
  if (groupBy === "status")
    return statuses.find(([value]) => value === product.status)?.[1] ?? product.status;
  return product.categoryName || "Sin categoría";
}

const columns: { field: Field; label: string; className?: string }[] = [
  { field: "description", label: "Producto", className: "productColumn" },
  { field: "store", label: "Tienda" },
  { field: "category", label: "Categoría" },
  { field: "assignment", label: "Asignación" },
  { field: "plannedQuantity", label: "Cantidad prev.", className: "numberColumn" },
  { field: "plannedUnitPrice", label: "Precio prev.", className: "numberColumn" },
  { field: "realQuantity", label: "Cantidad real", className: "numberColumn" },
  { field: "realUnitPrice", label: "Precio real", className: "numberColumn" },
  { field: "notes", label: "Notas" },
  { field: "status", label: "Estado" },
];

export type ShoppingTableFilters = {
  query: string;
  storeId: string;
  categoryId: string;
  assignment: string;
  status: string;
};

function fieldValue(product: ShoppingTableProduct, field: Field) {
  if (field === "store") return product.storeName ?? "";
  if (field === "category") return product.categoryName ?? "";
  return product[field] ?? "";
}

function EditableCell({
  field,
  product,
  value,
  disabled,
  options,
  onChange,
  onCommit,
}: Readonly<{
  field: Field;
  product: ShoppingTableProduct;
  value: string;
  disabled: boolean;
  options: Option[];
  onChange: (value: string) => void;
  onCommit: () => void;
}>) {
  if (field === "status") {
    return (
      <select
        aria-label={`${columns.find((column) => column.field === field)?.label} de ${product.description}`}
        className={styles.tableSelect}
        disabled={disabled}
        onBlur={onCommit}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {statuses.map(([status, label]) => (
          <option key={status} value={status}>
            {label}
          </option>
        ))}
      </select>
    );
  }

  if (field === "store" || field === "category") {
    const listId = `shopping-${field}-options-${product.id}`;
    return (
      <>
        <input
          aria-label={`${columns.find((column) => column.field === field)?.label} de ${product.description}`}
          className={styles.tableInput}
          disabled={disabled}
          list={listId}
          onBlur={onCommit}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
        <datalist id={listId}>
          {options.map((option) => (
            <option key={option.id} value={option.name} />
          ))}
        </datalist>
      </>
    );
  }

  const numeric = field.includes("Quantity") || field.includes("UnitPrice");
  return (
    <input
      aria-label={`${columns.find((column) => column.field === field)?.label} de ${product.description}`}
      className={styles.tableInput}
      disabled={disabled}
      min={numeric && field.includes("UnitPrice") ? "0" : undefined}
      onBlur={onCommit}
      onChange={(event) => onChange(event.target.value)}
      step={field.includes("Quantity") ? "0.001" : numeric ? "0.01" : undefined}
      type={numeric ? "number" : "text"}
      value={value}
    />
  );
}

export default function ShoppingTable({
  products,
  filters,
  categories,
  stores,
  readOnly,
  onFilterChange,
  onSave,
  groupBy,
  sortBy,
  sortDirection,
}: Readonly<{
  products: ShoppingTableProduct[];
  filters: ShoppingTableFilters;
  categories: Option[];
  stores: Option[];
  readOnly: boolean;
  onFilterChange: (field: FilterField, value: string) => void;
  onSave: (product: ShoppingTableProduct, field: Field, value: string) => Promise<void>;
  groupBy: string;
  sortBy: string;
  sortDirection: string;
}>) {
  const [drafts, setDrafts] = useState<Record<string, ShoppingTableProduct>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(Object.fromEntries(products.map((product) => [product.id, product])));
  }, [products]);

  const visibleProducts = useMemo(() => {
    const assignment = filters.assignment.trim().toLocaleLowerCase();
    const filtered = assignment
      ? products.filter((product) =>
          (product.assignment ?? "").toLocaleLowerCase().includes(assignment),
        )
      : products;
    return [...filtered].sort((a, b) => {
      const value = (product: ShoppingTableProduct) =>
        sortBy === "unit_price"
          ? Number(product.plannedUnitPrice ?? 0)
          : sortBy === "quantity"
            ? Number(product.plannedQuantity ?? 0)
            : sortBy === "total"
              ? Number(product.plannedTotal ?? 0)
              : product.description.toLocaleLowerCase();
      const comparison = value(a) < value(b) ? -1 : value(a) > value(b) ? 1 : 0;
      return sortDirection === "desc" ? -comparison : comparison;
    });
  }, [filters.assignment, products, sortBy, sortDirection]);

  async function commit(product: ShoppingTableProduct, field: Field) {
    const draft = drafts[product.id];
    if (!draft || fieldValue(product, field) === fieldValue(draft, field)) return;
    const value = String(fieldValue(draft, field));
    setSaving(`${product.id}:${field}`);
    setSaveError(null);
    try {
      await onSave(draft, field, value);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar el cambio");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className={styles.tableFrame}>
      <div className={styles.tableMeta}>
        <span>{visibleProducts.length} productos visibles</span>
        <span>{readOnly ? "Sólo lectura" : "Haz clic en una celda para editar"}</span>
      </div>
      {saveError ? (
        <p className={styles.tableError} role="alert">
          {saveError}
        </p>
      ) : null}
      <div className={styles.tableScroll}>
        <table className={styles.shoppingTable}>
          <thead>
            <tr className={styles.tableLabels}>
              {columns.map((column) => (
                <th
                  className={column.className ? styles[column.className] : undefined}
                  key={column.field}
                >
                  {column.label}
                </th>
              ))}
              <th className={styles.numberColumn}>Total prev.</th>
              <th className={styles.numberColumn}>Total real</th>
            </tr>
            <tr className={styles.tableFilters}>
              <th className={styles.productColumn}>
                <input
                  aria-label="Filtrar productos"
                  className={styles.filterInput}
                  onChange={(event) => onFilterChange("query", event.target.value)}
                  placeholder="Buscar"
                  type="search"
                  value={filters.query}
                />
              </th>
              <th>
                <select
                  aria-label="Filtrar por tienda"
                  className={styles.filterSelect}
                  onChange={(event) => onFilterChange("storeId", event.target.value)}
                  value={filters.storeId}
                >
                  <option value="">Todas</option>
                  {stores.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                <select
                  aria-label="Filtrar por categoría"
                  className={styles.filterSelect}
                  onChange={(event) => onFilterChange("categoryId", event.target.value)}
                  value={filters.categoryId}
                >
                  <option value="">Todas</option>
                  {categories.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                <input
                  aria-label="Filtrar por asignación"
                  className={styles.filterInput}
                  onChange={(event) => onFilterChange("assignment", event.target.value)}
                  placeholder="Todas"
                  value={filters.assignment}
                />
              </th>
              <th colSpan={5} />
              <th>
                <select
                  aria-label="Filtrar por estado"
                  className={styles.filterSelect}
                  onChange={(event) => onFilterChange("status", event.target.value)}
                  value={filters.status}
                >
                  <option value="">Todos</option>
                  {statuses.map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </th>
              <th colSpan={2} />
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((product, index) => {
              const draft = drafts[product.id] ?? product;
              const plannedTotal =
                draft.plannedQuantity !== null && draft.plannedUnitPrice !== null
                  ? Number(draft.plannedQuantity) * Number(draft.plannedUnitPrice)
                  : null;
              const realTotal =
                draft.realQuantity !== null && draft.realUnitPrice !== null
                  ? Number(draft.realQuantity) * Number(draft.realUnitPrice)
                  : null;
              const group = groupLabel(product, groupBy);
              const previousGroup =
                index > 0 ? groupLabel(visibleProducts[index - 1], groupBy) : null;
              return (
                <Fragment key={product.id}>
                  {group !== previousGroup ? (
                    <tr className={styles.groupRow}>
                      <th colSpan={12}>{group}</th>
                    </tr>
                  ) : null}
                  <tr>
                    {columns.map((column) => (
                      <td
                        className={column.className ? styles[column.className] : undefined}
                        key={column.field}
                      >
                        <EditableCell
                          disabled={readOnly || saving !== null}
                          field={column.field}
                          onChange={(value) =>
                            setDrafts((current) => ({
                              ...current,
                              [product.id]: {
                                ...draft,
                                ...(column.field === "store" ? { storeName: value } : {}),
                                ...(column.field === "category" ? { categoryName: value } : {}),
                                ...(column.field !== "store" && column.field !== "category"
                                  ? { [column.field]: value }
                                  : {}),
                              },
                            }))
                          }
                          onCommit={() => void commit(product, column.field)}
                          options={column.field === "store" ? stores : categories}
                          product={product}
                          value={String(fieldValue(draft, column.field))}
                        />
                      </td>
                    ))}
                    <td className={styles.numberColumn}>
                      <MoneyCell amount={plannedTotal} />
                    </td>
                    <td className={styles.numberColumn}>
                      <MoneyCell amount={realTotal} />
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
