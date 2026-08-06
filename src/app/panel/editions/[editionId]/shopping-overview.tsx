"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ListState } from "@/components/lists/list-patterns";
import PurchasesOverview from "./purchases-overview";
import { CopyShoppingForm, ShoppingProductForm, type ShoppingFormState } from "./shopping-forms";
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

const emptyForm: ShoppingFormState = {
  description: "",
  category: "",
  store: "",
  assignment: "",
  plannedQuantity: "",
  realQuantity: "",
  plannedUnitPrice: "",
  realUnitPrice: "",
  notes: "",
  status: "pending",
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [assignment, setAssignment] = useState("");
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
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ShoppingFormState>(emptyForm);
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
      if (query) params.set("q", query);
      if (status) params.set("status", status);
      if (categoryId) params.set("categoryId", categoryId);
      if (storeId) params.set("storeId", storeId);
      const response = await fetch(`/api/v1/editions/${editionId}/shopping?${params}`);
      const result = (await response.json()) as {
        data?: {
          products: Product[];
          categories: Option[];
          stores: Option[];
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
      setSummary(result.data.summary);
      if (!preferencesLoaded) {
        setGroupBy(result.data.preferences.general.groupBy);
        setSortBy(result.data.preferences.general.sortBy);
        setSortDirection(result.data.preferences.general.sortDirection);
        setQuery(result.data.preferences.edition.query);
        setStatus(result.data.preferences.edition.status ?? "");
        setCategoryId(result.data.preferences.edition.categoryId ?? "");
        setStoreId(result.data.preferences.edition.storeId ?? "");
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
  }, [categoryId, editionId, preferencesLoaded, query, status, storeId]);

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

  function updateEditionPreference(
    field: "query" | "status" | "categoryId" | "storeId",
    value: string,
  ) {
    if (field === "query") setQuery(value);
    if (field === "status") setStatus(value);
    if (field === "categoryId") setCategoryId(value);
    if (field === "storeId") setStoreId(value);
    persistPreference({
      scope: "edition",
      query: field === "query" ? value : query,
      status: (field === "status" ? value : status) || null,
      categoryId: (field === "categoryId" ? value : categoryId) || null,
      storeId: (field === "storeId" ? value : storeId) || null,
    });
  }

  function edit(product?: Product) {
    setForm(
      product
        ? {
            id: product.id,
            description: product.description,
            category: product.categoryName ?? "",
            store: product.storeName ?? "",
            assignment: product.assignment ?? "",
            plannedQuantity: product.plannedQuantity ?? "",
            realQuantity: product.realQuantity ?? "",
            plannedUnitPrice: product.plannedUnitPrice ?? "",
            realUnitPrice: product.realUnitPrice ?? "",
            notes: product.notes ?? "",
            status: product.status,
          }
        : emptyForm,
    );
    setModalOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/v1/editions/${editionId}/shopping`, {
      method: form.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        plannedQuantity: numberOrNull(form.plannedQuantity),
        realQuantity: numberOrNull(form.realQuantity),
        plannedUnitPrice: numberOrNull(form.plannedUnitPrice),
        realUnitPrice: numberOrNull(form.realUnitPrice),
        category: form.category || null,
        store: form.store || null,
        assignment: form.assignment || null,
        notes: form.notes || null,
      }),
    });
    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok) {
      setError(result.error?.message ?? "No se pudo guardar el producto");
      return;
    }
    setModalOpen(false);
    await load();
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

  const setField = (field: keyof ShoppingFormState, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

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
            <button className={styles.primary} onClick={() => edit()} type="button">
              Añadir producto
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
        <ListState
          description="Añade el primer producto de esta edición."
          title="Todavía no hay productos"
        />
      ) : (
        <ShoppingTable
          categories={categories}
          filters={{ query, status, categoryId, storeId, assignment }}
          onFilterChange={(field, value) =>
            field === "assignment" ? setAssignment(value) : updateEditionPreference(field, value)
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
      <PurchasesOverview editionId={editionId} readOnly={readOnly} stores={stores} />
      <ShoppingProductForm
        categories={categories}
        form={form}
        onChange={setField}
        onClose={() => setModalOpen(false)}
        onSubmit={save}
        open={modalOpen}
        stores={stores}
      />
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
