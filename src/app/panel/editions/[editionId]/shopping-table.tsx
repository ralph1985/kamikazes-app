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
  onCreateCategory,
  onError,
}: Readonly<{
  field: Field;
  product: ShoppingTableProduct;
  value: string;
  disabled: boolean;
  options: Option[];
  onChange: (value: string) => void;
  onCommit: () => void;
  onCreateCategory?: (name: string) => Promise<void>;
  onError?: (error: unknown) => void;
}>) {
  const label = `${field} de ${product.description || "producto"}`;
  const [creatingValue, setCreatingValue] = useState(false);

  useEffect(() => {
    if (
      (field === "category" || field === "assignment") &&
      options.some((option) => option.name === value)
    )
      setCreatingValue(false);
  }, [field, options, value]);

  if (field === "status") {
    return (
      <select
        aria-label={label}
        className={styles.tableSelect}
        disabled={disabled}
        onBlur={onCommit}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {statuses.map(([status, text]) => (
          <option key={status} value={status}>
            {text}
          </option>
        ))}
      </select>
    );
  }

  if (field === "category" || field === "assignment") {
    const isCategory = field === "category";

    async function commitNewValue() {
      const nextValue = value.trim();
      if (!nextValue) return;
      if (isCategory && onCreateCategory) await onCreateCategory(nextValue);
      onCommit();
    }

    return (
      <div className={styles.choiceEditor}>
        {creatingValue ? (
          <input
            aria-label={`Nuevo ${isCategory ? "categoría" : "responsable"}`}
            autoFocus
            className={styles.tableInput}
            disabled={disabled}
            onBlur={() => void commitNewValue().catch((error) => onError?.(error))}
            onChange={(event) => onChange(event.target.value)}
            placeholder={isCategory ? "Nueva categoría" : "Nueva asignación"}
            value={value}
          />
        ) : (
          <select
            aria-label={label}
            className={styles.tableSelect}
            disabled={disabled}
            onBlur={onCommit}
            onChange={(event) => onChange(event.target.value)}
            value={value}
          >
            <option value="">{isCategory ? "Sin categoría" : "Sin asignación"}</option>
            {options.map((option) => (
              <option key={option.id} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
        )}
        <button
          aria-label={
            creatingValue
              ? `Cancelar nuevo ${isCategory ? "categoría" : "responsable"}`
              : `Crear ${isCategory ? "categoría" : "asignación"}`
          }
          className={styles.choiceAdd}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setCreatingValue((current) => !current);
            if (!creatingValue) onChange("");
          }}
          title={creatingValue ? "Cancelar" : isCategory ? "Nueva categoría" : "Nueva asignación"}
          type="button"
        >
          {creatingValue ? "×" : "+"}
        </button>
      </div>
    );
  }

  if (field === "store") {
    const listId = `shopping-${field}-options-${product.id}`;
    return (
      <>
        <input
          aria-label={label}
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
      aria-label={label}
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

export type ShoppingTableFilters = {
  query: string;
  storeId: string;
  categoryId: string;
  assignment: string;
  status: string;
};

export default function ShoppingTable({
  products,
  filters,
  categories,
  stores,
  assignments,
  readOnly,
  onFilterChange,
  onClearFilters,
  onCreateCategory,
  onSave,
  groupBy,
  sortBy,
  sortDirection,
}: Readonly<{
  products: ShoppingTableProduct[];
  filters: ShoppingTableFilters;
  categories: Option[];
  stores: Option[];
  assignments: Option[];
  readOnly: boolean;
  onFilterChange: (field: FilterField, value: string) => void;
  onClearFilters: () => void;
  onCreateCategory: (name: string) => Promise<void>;
  onSave: (product: ShoppingTableProduct, field: Field, value: string) => Promise<void>;
  groupBy: string;
  sortBy: string;
  sortDirection: string;
}>) {
  const [drafts, setDrafts] = useState<Record<string, ShoppingTableProduct>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
    setSaving(`${product.id}:${field}`);
    setSaveError(null);
    try {
      await onSave(draft, field, String(fieldValue(draft, field)));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar el cambio");
    } finally {
      setSaving(null);
    }
  }

  function updateDraft(product: ShoppingTableProduct, field: Field, value: string) {
    setDrafts((current) => ({
      ...current,
      [product.id]: {
        ...product,
        ...current[product.id],
        ...(field === "store" ? { storeName: value } : {}),
        ...(field === "category" ? { categoryName: value } : {}),
        ...(field !== "store" && field !== "category" ? { [field]: value } : {}),
      },
    }));
  }

  function renderField(product: ShoppingTableProduct, field: Field, options: Option[] = []) {
    const draft = drafts[product.id] ?? product;
    return (
      <EditableCell
        disabled={readOnly || saving !== null}
        field={field}
        onChange={(value) => updateDraft(product, field, value)}
        onCommit={() => void commit(product, field)}
        onCreateCategory={field === "category" ? onCreateCategory : undefined}
        onError={(error) =>
          setSaveError(
            error instanceof Error
              ? error.message
              : `No se pudo crear ${field === "category" ? "la categoría" : "la asignación"}`,
          )
        }
        options={options}
        product={product}
        value={String(fieldValue(draft, field))}
      />
    );
  }

  function hasFilters() {
    return Object.values(filters).some(Boolean);
  }

  return (
    <div className={styles.tableFrame}>
      <div className={styles.tableMeta}>
        <span>{visibleProducts.length} productos visibles</span>
        <span>{readOnly ? "Sólo lectura" : "Edición directa activada"}</span>
      </div>
      <div className={styles.filterBar}>
        <span className={styles.filterTitle}>Filtrar</span>
        <input
          aria-label="Filtrar productos"
          className={styles.filterInput}
          onChange={(event) => onFilterChange("query", event.target.value)}
          placeholder="Producto o nota"
          type="search"
          value={filters.query}
        />
        <select
          aria-label="Filtrar por estado"
          className={styles.filterSelect}
          onChange={(event) => onFilterChange("status", event.target.value)}
          value={filters.status}
        >
          <option value="">Todos los estados</option>
          {statuses.map(([status, text]) => (
            <option key={status} value={status}>
              {text}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por tienda"
          className={styles.filterSelect}
          onChange={(event) => onFilterChange("storeId", event.target.value)}
          value={filters.storeId}
        >
          <option value="">Todas las tiendas</option>
          {stores.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por categoría"
          className={styles.filterSelect}
          onChange={(event) => onFilterChange("categoryId", event.target.value)}
          value={filters.categoryId}
        >
          <option value="">Todas las categorías</option>
          {categories.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <input
          aria-label="Filtrar por asignación"
          className={styles.filterInput}
          onChange={(event) => onFilterChange("assignment", event.target.value)}
          placeholder="Asignación"
          value={filters.assignment}
        />
        {hasFilters() ? (
          <button className={styles.clearFilters} onClick={onClearFilters} type="button">
            Limpiar
          </button>
        ) : null}
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
              <th className={styles.productColumn}>Producto</th>
              <th className={styles.statusColumn}>Estado</th>
              <th className={styles.storeColumn}>Tienda</th>
              <th className={styles.numberColumn}>Cant. prev.</th>
              <th className={styles.numberColumn}>Cant. real</th>
              <th className={styles.numberColumn}>Precio real</th>
              <th className={styles.numberColumn}>Presupuesto</th>
              <th className={styles.numberColumn}>Carrito</th>
              <th className={styles.actionColumn} />
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
              const isExpanded = expanded.has(product.id);
              return (
                <Fragment key={product.id}>
                  {group !== previousGroup ? (
                    <tr className={styles.groupRow}>
                      <th colSpan={9}>{group}</th>
                    </tr>
                  ) : null}
                  <tr className={isExpanded ? styles.expandedRow : undefined}>
                    <td className={styles.productColumn}>{renderField(product, "description")}</td>
                    <td className={styles.statusColumn}>{renderField(product, "status")}</td>
                    <td className={styles.storeColumn}>{renderField(product, "store", stores)}</td>
                    <td className={styles.numberColumn}>
                      {renderField(product, "plannedQuantity")}
                    </td>
                    <td className={styles.numberColumn}>{renderField(product, "realQuantity")}</td>
                    <td className={styles.numberColumn}>{renderField(product, "realUnitPrice")}</td>
                    <td className={styles.numberColumn}>
                      <MoneyCell amount={plannedTotal} />
                    </td>
                    <td className={styles.numberColumn}>
                      <MoneyCell amount={realTotal} />
                    </td>
                    <td className={styles.actionColumn}>
                      <button
                        aria-expanded={isExpanded}
                        className={styles.detailToggle}
                        onClick={() =>
                          setExpanded((current) => {
                            const next = new Set(current);
                            if (next.has(product.id)) next.delete(product.id);
                            else next.add(product.id);
                            return next;
                          })
                        }
                        type="button"
                      >
                        {isExpanded ? "Cerrar" : "Detalle"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className={styles.detailRow}>
                      <td colSpan={9}>
                        <div className={styles.detailGrid}>
                          <div className={styles.detailIntro}>
                            <span>Detalle del producto</span>
                            <small>Los cambios se guardan al salir de cada campo.</small>
                          </div>
                          <label>
                            Categoría
                            {renderField(product, "category", categories)}
                          </label>
                          <label>
                            Asignación
                            {renderField(product, "assignment", assignments)}
                          </label>
                          <label>
                            Precio previsto
                            {renderField(product, "plannedUnitPrice")}
                          </label>
                          <label className={styles.notesField}>
                            Notas
                            {renderField(product, "notes")}
                          </label>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
