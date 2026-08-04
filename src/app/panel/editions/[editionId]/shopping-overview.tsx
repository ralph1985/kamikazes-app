"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CompactList, CompactListRow, EditIcon, IconButton } from "@/components/lists/compact-list";
import { ListState, ListToolbar, MoneyCell } from "@/components/lists/list-patterns";
import { Modal } from "@/components/ui/modal";
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
type FormState = {
  id?: string;
  description: string;
  category: string;
  store: string;
  assignment: string;
  plannedQuantity: string;
  realQuantity: string;
  plannedUnitPrice: string;
  realUnitPrice: string;
  notes: string;
  status: string;
};
const statuses = [
  ["pending", "Pendiente"],
  ["in_cart", "En carrito"],
  ["purchased", "Comprado"],
  ["not_buying", "No se compra este año"],
  ["gifted", "Regalado"],
] as const;
const emptyForm: FormState = {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

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
        data?: { products: Product[]; categories: Option[]; stores: Option[] };
        error?: { message: string };
      };
      if (!response.ok || !result.data)
        throw new Error(result.error?.message ?? "No se pudo cargar la lista de compra");
      setProducts(result.data.products);
      setCategories(result.data.categories);
      setStores(result.data.stores);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "No se pudo cargar la lista de compra",
      );
    } finally {
      setLoading(false);
    }
  }, [categoryId, editionId, query, status, storeId]);
  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(
    () =>
      products.reduce<Record<string, Product[]>>((groups, product) => {
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
    [groupBy, products],
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
  const setField = (field: keyof FormState, value: string) =>
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
          <button className={styles.primary} onClick={() => edit()} type="button">
            Añadir producto
          </button>
        )}
      </div>
      <ListToolbar
        count={products.length}
        onQueryChange={setQuery}
        placeholder="Buscar producto o nota"
        query={query}
      />
      <div className={styles.filters}>
        <label>
          Estado
          <select onChange={(event) => setStatus(event.target.value)} value={status}>
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
          <select onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
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
          <select onChange={(event) => setStoreId(event.target.value)} value={storeId}>
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
          <select onChange={(event) => setGroupBy(event.target.value)} value={groupBy}>
            <option value="category">Categoría</option>
            <option value="store">Tienda</option>
            <option value="assignment">Responsable</option>
            <option value="status">Estado</option>
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
      <Modal
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        title={form.id ? "Editar producto" : "Añadir producto"}
      >
        <form className={styles.form} onSubmit={save}>
          <label>
            Descripción
            <input
              onChange={(event) => setField("description", event.target.value)}
              required
              value={form.description}
            />
          </label>
          <div className={styles.twoColumns}>
            <label>
              Categoría
              <input
                onChange={(event) => setField("category", event.target.value)}
                list="shopping-categories"
                value={form.category}
              />
              <datalist id="shopping-categories">
                {categories.map((option) => (
                  <option key={option.id} value={option.name} />
                ))}
              </datalist>
            </label>
            <label>
              Tienda
              <input
                onChange={(event) => setField("store", event.target.value)}
                list="shopping-stores"
                value={form.store}
              />
              <datalist id="shopping-stores">
                {stores.map((option) => (
                  <option key={option.id} value={option.name} />
                ))}
              </datalist>
            </label>
          </div>
          <div className={styles.twoColumns}>
            <label>
              Cantidad prevista
              <input
                min="-999999"
                onChange={(event) => setField("plannedQuantity", event.target.value)}
                step="0.01"
                type="number"
                value={form.plannedQuantity}
              />
            </label>
            <label>
              Precio unitario previsto
              <input
                min="0"
                onChange={(event) => setField("plannedUnitPrice", event.target.value)}
                step="0.01"
                type="number"
                value={form.plannedUnitPrice}
              />
            </label>
            <label>
              Cantidad real
              <input
                min="-999999"
                onChange={(event) => setField("realQuantity", event.target.value)}
                step="0.01"
                type="number"
                value={form.realQuantity}
              />
            </label>
            <label>
              Precio unitario real
              <input
                min="0"
                onChange={(event) => setField("realUnitPrice", event.target.value)}
                step="0.01"
                type="number"
                value={form.realUnitPrice}
              />
            </label>
          </div>
          <div className={styles.twoColumns}>
            <label>
              Responsable
              <input
                onChange={(event) => setField("assignment", event.target.value)}
                value={form.assignment}
              />
            </label>
            <label>
              Estado
              <select
                onChange={(event) => setField("status", event.target.value)}
                value={form.status}
              >
                {statuses.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Notas
            <textarea
              onChange={(event) => setField("notes", event.target.value)}
              value={form.notes}
            />
          </label>
          <div className={styles.actions}>
            <button className={styles.cancel} onClick={() => setModalOpen(false)} type="button">
              Cancelar
            </button>
            <button className={styles.primary} type="submit">
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
