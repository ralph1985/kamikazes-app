"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CompactList, CompactListRow, EditIcon, IconButton } from "@/components/lists/compact-list";
import { ListState } from "@/components/lists/list-patterns";
import { Modal } from "@/components/ui/modal";
import styles from "./edition.module.css";

type Location = { id: string; name: string };
type Item = {
  id: string;
  locationId: string;
  productName: string;
  quantity: string;
  notes: string | null;
};
type Leftover = {
  id: string;
  sourceEditionId: string | null;
  locationId: string;
  productName: string;
  quantity: string;
  status: string;
  notes: string | null;
};

export default function InventoryOverview({
  editionId,
  readOnly,
}: Readonly<{ editionId: string; readOnly: boolean }>) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [leftovers, setLeftovers] = useState<Leftover[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"location" | "stock" | "leftover" | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [status, setStatus] = useState("available");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/editions/${editionId}/inventory`);
      const result = (await response.json()) as {
        data?: { locations: Location[]; items: Item[]; leftovers: Leftover[]; canEdit: boolean };
        error?: { message: string };
      };
      if (!response.ok || !result.data)
        throw new Error(result.error?.message ?? "No se pudo cargar el inventario");
      setLocations(result.data.locations);
      setItems(result.data.items);
      setLeftovers(result.data.leftovers);
      setCanEdit(result.data.canEdit);
      setError(null);
      if (!locationId && result.data.locations[0]) setLocationId(result.data.locations[0].id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el inventario");
    } finally {
      setLoading(false);
    }
  }, [editionId, locationId]);
  useEffect(() => void load(), [load]);

  function open(type: "location" | "stock" | "leftover", value?: Location | Item | Leftover) {
    setModal(type);
    setEditingId(value && "id" in value ? value.id : undefined);
    if (type === "location") {
      const item = value as Location | undefined;
      setName(item?.name ?? "");
    }
    if (type === "stock") {
      const item = value as Item | undefined;
      setLocationId(item?.locationId ?? locations[0]?.id ?? "");
      setProductName(item?.productName ?? "");
      setQuantity(item?.quantity ?? "");
      setNotes(item?.notes ?? "");
    }
    if (type === "leftover") {
      const item = value as Leftover | undefined;
      setLocationId(item?.locationId ?? locations[0]?.id ?? "");
      setProductName(item?.productName ?? "");
      setQuantity(item?.quantity ?? "");
      setStatus(item?.status ?? "available");
      setNotes(item?.notes ?? "");
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const type = modal!;
    const body =
      type === "location"
        ? { type, ...(editingId ? { id: editingId } : {}), name }
        : type === "stock"
          ? {
              type,
              ...(editingId ? { id: editingId } : {}),
              locationId,
              productName,
              quantity: Number(quantity),
              notes: notes || null,
            }
          : {
              type,
              ...(editingId ? { id: editingId } : {}),
              sourceEditionId: null,
              locationId,
              productName,
              quantity: Number(quantity),
              status,
              notes: notes || null,
            };
    const response = await fetch(`/api/v1/editions/${editionId}/inventory`, {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok) {
      setError(result.error?.message ?? "No se pudo guardar el registro");
      return;
    }
    setModal(null);
    await load();
  }
  const locationName = (id: string) =>
    locations.find((location) => location.id === id)?.name ?? "Sin ubicación";

  return (
    <section className={styles.content}>
      <div className={styles.welcome}>
        <div className={styles.header}>
          <div>
            <p className="eyebrow">Compras / Inventario</p>
            <h2>Inventario y sobrantes</h2>
            <p>Cantidades acumuladas por producto y ubicación, con movimientos auditados.</p>
          </div>
          {canEdit && !readOnly && (
            <div className={styles.rowActions}>
              <button className={styles.primary} onClick={() => open("location")} type="button">
                Nueva ubicación
              </button>
              <button className={styles.primary} onClick={() => open("stock")} type="button">
                Añadir existencias
              </button>
              <button className={styles.primary} onClick={() => open("leftover")} type="button">
                Nuevo sobrante
              </button>
            </div>
          )}
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <ListState description="Cargando inventario…" title="Inventario" />
      ) : (
        <>
          <section className={styles.welcome}>
            <div className={styles.header}>
              <h2>Existencias</h2>
              <span>
                {items.length} registros · {locations.length} ubicaciones
              </span>
            </div>
            {items.length ? (
              <CompactList>
                {items.map((item) => (
                  <CompactListRow
                    key={item.id}
                    action={
                      canEdit && !readOnly ? (
                        <IconButton
                          label={`Editar ${item.productName}`}
                          onClick={() => open("stock", item)}
                        >
                          <EditIcon />
                        </IconButton>
                      ) : undefined
                    }
                    meta={`${item.quantity} unidades · ${locationName(item.locationId)}`}
                  >
                    <strong>{item.productName}</strong>
                    <small>{item.notes ?? "Sin notas"}</small>
                  </CompactListRow>
                ))}
              </CompactList>
            ) : (
              <p>Aún no hay existencias registradas.</p>
            )}
          </section>
          <section className={styles.welcome}>
            <div className={styles.header}>
              <h2>Sobrantes</h2>
              <span>{leftovers.length} registros</span>
            </div>
            {leftovers.length ? (
              <CompactList>
                {leftovers.map((item) => (
                  <CompactListRow
                    key={item.id}
                    action={
                      canEdit && !readOnly ? (
                        <IconButton
                          label={`Editar sobrante de ${item.productName}`}
                          onClick={() => open("leftover", item)}
                        >
                          <EditIcon />
                        </IconButton>
                      ) : undefined
                    }
                    meta={`${item.quantity} unidades · ${item.status} · ${locationName(item.locationId)}`}
                  >
                    <strong>{item.productName}</strong>
                    <small>{item.notes ?? "Sin notas"}</small>
                  </CompactListRow>
                ))}
              </CompactList>
            ) : (
              <p>Aún no hay sobrantes registrados.</p>
            )}
          </section>
        </>
      )}
      <Modal
        onClose={() => setModal(null)}
        open={modal !== null}
        title={modal === "location" ? "Ubicación" : modal === "stock" ? "Existencias" : "Sobrante"}
      >
        <form className={styles.form} onSubmit={save}>
          {modal === "location" ? (
            <label>
              Nombre
              <input onChange={(event) => setName(event.target.value)} required value={name} />
            </label>
          ) : (
            <>
              <label>
                Producto
                <input
                  onChange={(event) => setProductName(event.target.value)}
                  required
                  value={productName}
                />
              </label>
              <label>
                Ubicación
                <select
                  onChange={(event) => setLocationId(event.target.value)}
                  required
                  value={locationId}
                >
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cantidad
                <input
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={quantity}
                />
              </label>
              {modal === "leftover" && (
                <label>
                  Estado
                  <select onChange={(event) => setStatus(event.target.value)} value={status}>
                    <option value="available">Disponible</option>
                    <option value="consumed">Consumido</option>
                    <option value="discarded">Descartado</option>
                  </select>
                </label>
              )}
              <label>
                Notas
                <textarea onChange={(event) => setNotes(event.target.value)} value={notes} />
              </label>
            </>
          )}
          <div className={styles.actions}>
            <button className={styles.cancel} onClick={() => setModal(null)} type="button">
              Cancelar
            </button>
            <button className={styles.primary} type="submit">
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
