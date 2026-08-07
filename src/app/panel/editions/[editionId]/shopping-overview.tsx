"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ListState } from "@/components/lists/list-patterns";
import { CopyShoppingForm } from "./shopping-forms";
import ShoppingTable, { type ShoppingTableProduct } from "./shopping-table";
import styles from "./shopping.module.css";

type Product = ShoppingTableProduct;
type Option = { id: string; name: string };
export type ShoppingStore = Option;
type Edition = { id: string; year: number; status: string };
type ShoppingSummary = {
  budgetTotal: number;
  plannedTotal: number;
  cartTotal: number;
  realTotal: number;
  availableNow: number;
  availableReal: number;
};

function numberOrNull(value: string) {
  return value === "" ? null : Number(value);
}

export default function ShoppingOverview({
  editionId,
  readOnly,
  year,
}: Readonly<{ editionId: string; readOnly: boolean; year: number }>) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [stores, setStores] = useState<Option[]>([]);
  const [assignments, setAssignments] = useState<Option[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string[]>([]);
  const [storeId, setStoreId] = useState<string[]>([]);
  const [assignment, setAssignment] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState("category");
  const [sortBy, setSortBy] = useState("description");
  const [sortDirection, setSortDirection] = useState("asc");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [sourceEditionId, setSourceEditionId] = useState("");
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ShoppingSummary>({
    budgetTotal: 0,
    plannedTotal: 0,
    cartTotal: 0,
    realTotal: 0,
    availableNow: 0,
    availableReal: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const response = await fetch(`/api/v1/editions/${editionId}/shopping?${params}`);
      const result = (await response.json()) as {
        data?: {
          products: Product[];
          categories: Option[];
          stores: Option[];
          assignments: Option[];
          summary: ShoppingSummary;
          preferences: {
            general: { groupBy: string; sortBy: string; sortDirection: string };
            edition: {
              query: string;
              status: string | null;
              categoryId: string | null;
              storeId: string | null;
            };
          };
        };
        error?: { message: string };
      };
      if (!response.ok || !result.data)
        throw new Error(result.error?.message ?? "No se pudo cargar la lista de compra");
      setProducts(result.data.products);
      setCategories(result.data.categories);
      setStores(result.data.stores);
      setAssignments(result.data.assignments);
      setSummary(result.data.summary);
      if (!preferencesLoaded) {
        setGroupBy(result.data.preferences.general.groupBy);
        setSortBy(result.data.preferences.general.sortBy);
        setSortDirection(result.data.preferences.general.sortDirection);
        setQuery(result.data.preferences.edition.query);
        setStatus(
          result.data.preferences.edition.status ? [result.data.preferences.edition.status] : [],
        );
        setCategoryId(
          result.data.preferences.edition.categoryId
            ? [result.data.preferences.edition.categoryId]
            : [],
        );
        setStoreId(
          result.data.preferences.edition.storeId ? [result.data.preferences.edition.storeId] : [],
        );
        setPreferencesLoaded(true);
      }
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "No se pudo cargar la lista de compra",
      );
    } finally {
      setLoading(false);
    }
  }, [editionId, preferencesLoaded]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch("/api/v1/editions")
      .then(async (response) => (response.ok ? ((await response.json()).data as Edition[]) : []))
      .then(setEditions)
      .catch(() => setEditions([]));
  }, []);

  const persistPreference = useCallback(
    (body: Record<string, unknown>) => {
      void fetch(`/api/v1/editions/${editionId}/shopping`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    [editionId],
  );

  function updateGeneralPreference(field: "groupBy" | "sortBy" | "sortDirection", value: string) {
    if (field === "groupBy") setGroupBy(value);
    if (field === "sortBy") setSortBy(value);
    if (field === "sortDirection") setSortDirection(value);
    persistPreference({
      scope: "general",
      groupBy: field === "groupBy" ? value : groupBy,
      sortBy: field === "sortBy" ? value : sortBy,
      sortDirection: field === "sortDirection" ? value : sortDirection,
    });
  }

  function updateEditionPreference(field: "query", value: string[]) {
    setQuery(value[0] ?? "");
  }

  function clearEditionFilters() {
    setQuery("");
    setStatus([]);
    setCategoryId([]);
    setStoreId([]);
    setAssignment([]);
  }

  async function saveInline(product: Product, field: string, value: string) {
    const response = await fetch(`/api/v1/editions/${editionId}/shopping`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: product.id,
        description: field === "description" ? value : product.description,
        category: field === "category" ? value || null : product.categoryName,
        store: field === "store" ? value || null : product.storeName,
        assignment: field === "assignment" ? value || null : product.assignment,
        plannedQuantity:
          field === "plannedQuantity"
            ? numberOrNull(value)
            : numberOrNull(product.plannedQuantity ?? ""),
        realQuantity:
          field === "realQuantity" ? numberOrNull(value) : numberOrNull(product.realQuantity ?? ""),
        plannedUnitPrice:
          field === "plannedUnitPrice"
            ? numberOrNull(value)
            : numberOrNull(product.plannedUnitPrice ?? ""),
        realUnitPrice:
          field === "realUnitPrice"
            ? numberOrNull(value)
            : numberOrNull(product.realUnitPrice ?? ""),
        notes: field === "notes" ? value || null : product.notes,
        status: field === "status" ? value : product.status,
      }),
    });
    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok) throw new Error(result.error?.message ?? "No se pudo guardar el cambio");
    await load();
  }

  async function createInlineProduct(defaults: {
    category: string | null;
    store: string | null;
    assignment: string | null;
    status: string;
  }): Promise<Product> {
    const response = await fetch(`/api/v1/editions/${editionId}/shopping`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        description: "",
        category: defaults.category,
        store: defaults.store,
        assignment: defaults.assignment,
        plannedQuantity: null,
        realQuantity: null,
        plannedUnitPrice: null,
        realUnitPrice: null,
        notes: null,
        status: defaults.status,
      }),
    });
    const result = (await response.json()) as {
      data?: {
        id: string;
        editionId: string;
        description: string;
        categoryId: string | null;
        storeId: string | null;
        assignment: string | null;
        plannedQuantity: string | null;
        realQuantity: string | null;
        plannedUnitPrice: string | null;
        realUnitPrice: string | null;
        notes: string | null;
        status: string;
      };
      error?: { message: string };
    };
    if (!response.ok || !result.data)
      throw new Error(result.error?.message ?? "No se pudo crear el producto");
    const created: Product = {
      ...result.data,
      categoryName: defaults.category,
      storeName: defaults.store,
      plannedTotal: null,
      realTotal: null,
    };
    setProducts((current) => [...current, created]);
    return created;
  }

  async function deleteProduct(product: Product) {
    const response = await fetch(`/api/v1/editions/${editionId}/shopping`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: product.id }),
    });
    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok) throw new Error(result.error?.message ?? "No se pudo borrar el producto");
    await load();
  }

  async function createCategory(name: string) {
    const response = await fetch(`/api/v1/editions/${editionId}/shopping/categories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const result = (await response.json()) as {
      data?: Option;
      error?: { message: string };
    };
    if (!response.ok || !result.data)
      throw new Error(result.error?.message ?? "No se pudo crear la categoría");
    setCategories((current) =>
      [...current.filter((category) => category.id !== result.data!.id), result.data!].sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    );
  }

  async function createStore(name: string) {
    const response = await fetch(`/api/v1/editions/${editionId}/shopping/stores`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const result = (await response.json()) as {
      data?: Option;
      error?: { message: string };
    };
    if (!response.ok || !result.data)
      throw new Error(result.error?.message ?? "No se pudo crear la tienda");
    setStores((current) =>
      [...current.filter((store) => store.id !== result.data!.id), result.data!].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
  }

  async function copyFromEdition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sourceEditionId) return;
    setCopying(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/editions/${editionId}/shopping/copy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceEditionId }),
      });
      const result = (await response.json()) as {
        data?: { copiedCount: number };
        error?: { message: string };
      };
      if (!response.ok || !result.data)
        throw new Error(result.error?.message ?? "No se pudo copiar la lista");
      setCopyModalOpen(false);
      setSourceEditionId("");
      await load();
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "No se pudo copiar la lista");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Compras · {year}</p>
          <h2>Lista de compra</h2>
          <p className={styles.muted}>
            Previsión, carrito y gasto real en una única tabla operativa.
          </p>
        </div>
        {!readOnly ? (
          <div className={styles.headingActions}>
            <button
              className={styles.secondary}
              onClick={() => setCopyModalOpen(true)}
              type="button"
            >
              Copiar otra edición
            </button>
          </div>
        ) : null}
      </div>
      <div className={styles.tableControls}>
        <span>{products.length} productos cargados</span>
        <label>
          Agrupar
          <select
            onChange={(event) => updateGeneralPreference("groupBy", event.target.value)}
            value={groupBy}
          >
            <option value="category">Categoría</option>
            <option value="store">Tienda</option>
            <option value="assignment">Asignación</option>
            <option value="status">Estado</option>
          </select>
        </label>
        <label>
          Ordenar
          <select
            onChange={(event) => updateGeneralPreference("sortBy", event.target.value)}
            value={sortBy}
          >
            <option value="description">Producto</option>
            <option value="unit_price">Precio previsto</option>
            <option value="quantity">Cantidad prevista</option>
            <option value="total">Total previsto</option>
          </select>
        </label>
        <label>
          Dirección
          <select
            onChange={(event) => updateGeneralPreference("sortDirection", event.target.value)}
            value={sortDirection}
          >
            <option value="asc">Ascendente</option>
            <option value="desc">Descendente</option>
          </select>
        </label>
      </div>
      <div className={styles.stickySummary}>
        <div className={styles.summaryGrid}>
          {(
            [
              ["Presupuesto general", summary.budgetTotal],
              ["Presupuestado", summary.plannedTotal],
              ["En carrito", summary.cartTotal],
              ["Compra real", summary.realTotal],
              ["Disponible ahora", summary.availableNow],
              ["Disponible real", summary.availableReal],
            ] as [string, number][]
          ).map(([label, amount]) => (
            <div
              className={label.startsWith("Disponible") ? styles.summaryAvailable : ""}
              key={label}
            >
              <span>{label}</span>
              <strong>{Number(amount).toFixed(2)} €</strong>
            </div>
          ))}
        </div>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <ListState description="Cargando productos…" title="Lista de compra" />
      ) : products.length === 0 ? (
        <div className={styles.emptyShoppingState}>
          <ListState
            description="Añade el primer producto de esta edición."
            title="Todavía no hay productos"
          />
          {!readOnly ? (
            <button
              className={styles.primary}
              onClick={() =>
                void createInlineProduct({
                  category: null,
                  store: null,
                  assignment: null,
                  status: "pending",
                }).catch((createError) =>
                  setError(
                    createError instanceof Error
                      ? createError.message
                      : "No se pudo crear el producto",
                  ),
                )
              }
              type="button"
            >
              Añadir primera línea
            </button>
          ) : null}
        </div>
      ) : (
        <ShoppingTable
          categories={categories}
          assignments={assignments}
          filters={{ query, status, categoryId, storeId, assignment }}
          onClearFilters={clearEditionFilters}
          onCreateCategory={createCategory}
          onCreateProduct={createInlineProduct}
          onCreateStore={createStore}
          onDeleteProduct={deleteProduct}
          onFilterChange={(field, value) =>
            field === "status"
              ? setStatus(value)
              : field === "categoryId"
                ? setCategoryId(value)
                : field === "storeId"
                  ? setStoreId(value)
                  : field === "assignment"
                    ? setAssignment(value)
                    : updateEditionPreference(field, value)
          }
          onSave={saveInline}
          groupBy={groupBy}
          products={products}
          readOnly={readOnly}
          sortBy={sortBy}
          sortDirection={sortDirection}
          stores={stores}
        />
      )}
      <CopyShoppingForm
        copying={copying}
        currentEditionId={editionId}
        editions={editions}
        onClose={() => setCopyModalOpen(false)}
        onSourceChange={setSourceEditionId}
        onSubmit={copyFromEdition}
        open={copyModalOpen}
        sourceEditionId={sourceEditionId}
      />
    </div>
  );
}
