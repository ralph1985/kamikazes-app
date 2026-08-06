"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CompactList, CompactListRow, EditIcon, IconButton } from "@/components/lists/compact-list";
import { ListState, ListToolbar, MoneyCell } from "@/components/lists/list-patterns";
import PurchasesOverview from "./purchases-overview";
import { CopyShoppingForm, ShoppingProductForm, type ShoppingFormState } from "./shopping-forms";
import styles from "./shopping.module.css";

type Product = {
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
export type ShoppingStore = Option;
type Edition = { id: string; year: number; status: string };
const statuses = [
  ["pending", "Pendiente"],
  ["in_cart", "En carrito"],
  ["purchased", "Comprado"],
  ["not_buying", "No se compra este año"],
  ["gifted", "Regalado"],
] as const;
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

  const grouped = useMemo(
    () =>
      [...products]
        .sort((a, b) => {
          const value = (product: Product) =>
            sortBy === "unit_price"
              ? Number(product.plannedUnitPrice ?? 0)
              : sortBy === "quantity"
                ? Number(product.plannedQuantity ?? 0)
                : sortBy === "total"
                  ? Number(product.plannedTotal ?? 0)
                  : (product.description || "").toLocaleLowerCase();
          const comparison = value(a) < value(b) ? -1 : value(a) > value(b) ? 1 : 0;
          return sortDirection === "asc" ? comparison : -comparison;
        })
        .reduce<Record<string, Product[]>>((groups, product) => {
          const key =
            groupBy === "store"
              ? product.storeName || "Sin tienda"
              : groupBy === "assignment"
                ? product.assignment || "Sin responsable"
                : groupBy === "status"
                  ? (statuses.find(([value]) => value === product.status)?.[1] ?? product.status)
                  : product.categoryName || "Sin categoría";
          (groups[key] ??= []).push(product);
          return groups;
        }, {}),
    [groupBy, products, sortBy, sortDirection],
  );
  const plannedTotal = products.reduce((total, product) => total + (product.plannedTotal ?? 0), 0);
  const realTotal = products.reduce((total, product) => total + (product.realTotal ?? 0), 0);

  function edit(product?: Product) {
    if (product)
      setForm({
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
      });
    else setForm(emptyForm);
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
            Productos, responsables y seguimiento de lo previsto y lo real.
          </p>
        </div>
        {!readOnly && (
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
        )}
      </div>
      <ListToolbar
        count={products.length}
        onQueryChange={(value) => updateEditionPreference("query", value)}
        placeholder="Buscar producto o nota"
        query={query}
      />
      <div className={styles.filters}>
        <label>
          Estado
          <select
            onChange={(event) => updateEditionPreference("status", event.target.value)}
            value={status}
          >
            <option value="">Todos</option>
            {statuses.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Categoría
          <select
            onChange={(event) => updateEditionPreference("categoryId", event.target.value)}
            value={categoryId}
          >
            <option value="">Todas</option>
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tienda
          <select
            onChange={(event) => updateEditionPreference("storeId", event.target.value)}
            value={storeId}
          >
            <option value="">Todas</option>
            {stores.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Agrupar por
          <select
            onChange={(event) => updateGeneralPreference("groupBy", event.target.value)}
            value={groupBy}
          >
            <option value="category">Categoría</option>
            <option value="store">Tienda</option>
            <option value="assignment">Responsable</option>
            <option value="status">Estado</option>
          </select>
        </label>
        <label>
          Ordenar por
          <select
            onChange={(event) => updateGeneralPreference("sortBy", event.target.value)}
            value={sortBy}
          >
            <option value="description">Descripción</option>
            <option value="unit_price">Precio unitario</option>
            <option value="quantity">Cantidad</option>
            <option value="total">Total</option>
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
      <div className={styles.totals}>
        <span>
          Previsto <MoneyCell amount={plannedTotal} />
        </span>
        <span>
          Real <MoneyCell amount={realTotal} />
        </span>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <ListState description="Cargando productos…" title="Lista de compra" />
      ) : products.length === 0 ? (
        <ListState
          description="Añade el primer producto de esta edición."
          title="Todavía no hay productos"
        />
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <section className={styles.group} key={group}>
            <h3>{group}</h3>
            <CompactList>
              {items.map((product) => (
                <CompactListRow
                  action={
                    !readOnly && (
                      <IconButton
                        label={`Editar ${product.description || "producto"}`}
                        onClick={() => edit(product)}
                      >
                        <EditIcon />
                      </IconButton>
                    )
                  }
                  key={product.id}
                  meta={
                    <span>
                      {statuses.find(([value]) => value === product.status)?.[1] ?? product.status}
                    </span>
                  }
                >
                  <strong>{product.description || "Producto sin descripción"}</strong>
                  <small>
                    {[
                      product.storeName,
                      product.assignment,
                      product.plannedQuantity
                        ? `${product.plannedQuantity} × ${product.plannedUnitPrice ?? "—"} €`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sin detalles"}
                  </small>
                </CompactListRow>
              ))}
            </CompactList>
          </section>
        ))
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
