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
type NewProductDefaults = {
  category: string | null;
  store: string | null;
  assignment: string | null;
  status: string;
};

const statuses = [
  ["pending", "Pendiente"],
  ["in_cart", "En carrito"],
  ["purchased", "Comprado"],
  ["not_buying", "No se compra"],
  ["gifted", "Regalado"],
] as const;

function MultiFilter({
  label,
  options,
  selected,
  onChange,
}: Readonly<{
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
}>) {
  const toggle = (value: string) =>
    onChange(
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
    );

  return (
    <details className={styles.filterMenu}>
      <summary>
        {label}
        {selected.length ? ` · ${selected.length}` : ""}
      </summary>
      <div className={styles.filterOptions}>
        {options.length === 0 ? <span className={styles.filterEmpty}>Sin opciones</span> : null}
        {options.map((option) => (
          <label key={option.id}>
            <input
              checked={selected.includes(option.id)}
              onChange={() => toggle(option.id)}
              type="checkbox"
            />
            <span>{option.name}</span>
          </label>
        ))}
        {selected.length ? (
          <button onClick={() => onChange([])} type="button">
            Limpiar
          </button>
        ) : null}
      </div>
    </details>
  );
}

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
  storeId: string[];
  categoryId: string[];
  assignment: string[];
  status: string[];
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
  onCreateProduct,
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
  onFilterChange: (field: FilterField, value: string[]) => void;
  onClearFilters: () => void;
  onCreateCategory: (name: string) => Promise<void>;
  onCreateProduct: (defaults: NewProductDefaults) => Promise<ShoppingTableProduct>;
  onSave: (product: ShoppingTableProduct, field: Field, value: string) => Promise<void>;
  groupBy: string;
  sortBy: string;
  sortDirection: string;
}>) {
  const [drafts, setDrafts] = useState<Record<string, ShoppingTableProduct>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [insertedAfter, setInsertedAfter] = useState<Record<string, string>>({});
  const [creatingAfter, setCreatingAfter] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(Object.fromEntries(products.map((product) => [product.id, product])));
  }, [products]);

  const visibleProducts = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase();
    const filtered = products.filter((product) => {
      const matchesQuery =
        !query ||
        product.description.toLocaleLowerCase().includes(query) ||
        (product.notes ?? "").toLocaleLowerCase().includes(query);
      const matchesStatus = !filters.status.length || filters.status.includes(product.status);
      const matchesStore =
        !filters.storeId.length || filters.storeId.includes(product.storeId ?? "__none__");
      const matchesCategory =
        !filters.categoryId.length || filters.categoryId.includes(product.categoryId ?? "__none__");
      const matchesAssignment =
        !filters.assignment.length || filters.assignment.includes(product.assignment ?? "__none__");
      return matchesQuery && matchesStatus && matchesStore && matchesCategory && matchesAssignment;
    });
    const sorted = [...filtered].sort((a, b) => {
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
    const children = new Map<string, ShoppingTableProduct[]>();
    sorted.forEach((product) => {
      const anchorId = insertedAfter[product.id];
      if (anchorId) children.set(anchorId, [...(children.get(anchorId) ?? []), product]);
    });
    const insertedIds = new Set(Object.keys(insertedAfter));
    return sorted
      .filter((product) => !insertedIds.has(product.id))
      .flatMap((product) => [product, ...(children.get(product.id) ?? [])]);
  }, [filters, insertedAfter, products, sortBy, sortDirection]);

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

  async function createProductAfter(product: ShoppingTableProduct) {
    setCreatingAfter(product.id);
    setSaveError(null);
    try {
      const created = await onCreateProduct({
        category: groupBy === "category" ? product.categoryName : null,
        store: groupBy === "store" ? product.storeName : null,
        assignment: groupBy === "assignment" ? product.assignment : null,
        status: groupBy === "status" ? product.status : "pending",
      });
      setDrafts((current) => ({ ...current, [created.id]: created }));
      setInsertedAfter((current) => ({ ...current, [created.id]: product.id }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo crear el producto");
    } finally {
      setCreatingAfter(null);
    }
  }

  function hasFilters() {
    return Boolean(
      filters.query ||
      filters.status.length ||
      filters.storeId.length ||
      filters.categoryId.length ||
      filters.assignment.length,
    );
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
          onChange={(event) => onFilterChange("query", [event.target.value])}
          placeholder="Producto o nota"
          type="search"
          value={filters.query}
        />
        <MultiFilter
          label="Estado"
          onChange={(values) => onFilterChange("status", values)}
          options={statuses.map(([id, name]) => ({ id, name }))}
          selected={filters.status}
        />
        <MultiFilter
          label="Tienda"
          onChange={(values) => onFilterChange("storeId", values)}
          options={stores}
          selected={filters.storeId}
        />
        <MultiFilter
          label="Categoría"
          onChange={(values) => onFilterChange("categoryId", values)}
          options={categories}
          selected={filters.categoryId}
        />
        <MultiFilter
          label="Asignación"
          onChange={(values) => onFilterChange("assignment", values)}
          options={[{ id: "__none__", name: "Sin asignación" }, ...assignments]}
          selected={filters.assignment}
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
                    <td className={styles.productColumn}>
                      <div className={styles.productCell}>
                        {!readOnly ? (
                          <button
                            aria-label={`Añadir producto después de ${product.description || "esta fila"}`}
                            className={styles.rowAddButton}
                            disabled={creatingAfter !== null || saving !== null}
                            onClick={() => void createProductAfter(product)}
                            title="Añadir producto debajo"
                            type="button"
                          >
                            +
                          </button>
                        ) : null}
                        {renderField(product, "description")}
                      </div>
                    </td>
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
