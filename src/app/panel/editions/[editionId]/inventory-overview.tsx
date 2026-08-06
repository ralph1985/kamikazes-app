"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CompactList, CompactListRow, EditIcon, IconButton } from "@/components/lists/compact-list";
import { ListState } from "@/components/lists/list-patterns";
import { Modal } from "@/components/ui/modal";
import styles from "./edition.module.css";

type Location = { id: string; name: string };
type Edition = { id: string; year: number };
type Item = {
  id: string;
  locationId: string;
  productName: string;
  quantity: string;
  notes: string | null;
};
type Movement = {
  id: string;
  productName: string;
  fromLocationId: string | null;
  toLocationId: string | null;
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
type ModalType = "location" | "stock" | "movement" | "leftover";

export default function InventoryOverview({
  editionId,
  readOnly,
}: Readonly<{ editionId: string; readOnly: boolean }>) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [leftovers, setLeftovers] = useState<Leftover[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType | null>(null);
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [sourceEditionId, setSourceEditionId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [status, setStatus] = useState("available");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inventoryResponse, editionsResponse] = await Promise.all([
        fetch(`/api/v1/editions/${editionId}/inventory`),
        fetch("/api/v1/editions"),
      ]);
      const inventoryResult = (await inventoryResponse.json()) as {
        data?: {
          locations: Location[];
          items: Item[];
          movements: Movement[];
          leftovers: Leftover[];
          canEdit: boolean;
        };
        error?: { message: string };
      };
      const editionsResult = (await editionsResponse.json()) as {
        data?: Edition[];
        error?: { message: string };
      };
      if (!inventoryResponse.ok || !inventoryResult.data)
        throw new Error(inventoryResult.error?.message ?? "No se pudo cargar el inventario");
      if (!editionsResponse.ok || !editionsResult.data)
        throw new Error(editionsResult.error?.message ?? "No se pudieron cargar las ediciones");
      setLocations(inventoryResult.data.locations);
      setItems(inventoryResult.data.items);
      setMovements(inventoryResult.data.movements.slice(-20).reverse());
      setLeftovers(inventoryResult.data.leftovers);
      setEditions(editionsResult.data);
      setCanEdit(inventoryResult.data.canEdit);
      setError(null);
      if (!locationId && inventoryResult.data.locations[0])
        setLocationId(inventoryResult.data.locations[0].id);
      if (!toLocationId && inventoryResult.data.locations[0])
        setToLocationId(inventoryResult.data.locations[0].id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el inventario");
    } finally {
      setLoading(false);
    }
  }, [editionId, locationId, toLocationId]);

  useEffect(() => void load(), [load]);

  function open(type: ModalType, value?: Location | Item | Leftover) {
    setModal(type);
    setEditingId(value && "id" in value ? value.id : undefined);
    setName(type === "location" ? ((value as Location | undefined)?.name ?? "") : "");
    if (type === "stock") {
      const item = value as Item | undefined;
      setLocationId(item?.locationId ?? locations[0]?.id ?? "");
      setProductName(item?.productName ?? "");
      setQuantity(item?.quantity ?? "");
      setNotes(item?.notes ?? "");
    }
    if (type === "movement") {
      setFromLocationId("");
      setToLocationId(locations[0]?.id ?? "");
      setProductName("");
      setQuantity("");
      setNotes("");
    }
    if (type === "leftover") {
      const item = value as Leftover | undefined;
      setLocationId(item?.locationId ?? locations[0]?.id ?? "");
      setSourceEditionId(item?.sourceEditionId ?? "");
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
          : type === "movement"
            ? {
                type,
                fromLocationId: fromLocationId || null,
                toLocationId: toLocationId || null,
                productName,
                quantity: Number(quantity),
                notes: notes || null,
              }
            : {
                type,
                ...(editingId ? { id: editingId } : {}),
                sourceEditionId: sourceEditionId || null,
                locationId,
                productName,
                quantity: Number(quantity),
                status,
                notes: notes || null,
              };
    const response = await fetch(`/api/v1/editions/${editionId}/inventory`, {
      method: editingId && type !== "movement" ? "PATCH" : "POST",
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

  const locationName = (id: string | null) =>
    id
      ? (locations.find((location) => location.id === id)?.name ?? "Ubicación desconocida")
      : "Sin ubicación";
  const editionYear = (id: string | null) =>
    id
      ? (editions.find((edition) => edition.id === id)?.year ?? "Edición desconocida")
      : "Sin edición de origen";

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
                Ajustar existencias
              </button>
              <button className={styles.primary} onClick={() => open("movement")} type="button">
                Mover existencias
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
              <h2>Movimientos recientes</h2>
              <span>{movements.length} mostrados</span>
            </div>
            {movements.length ? (
              <CompactList>
                {movements.map((movement) => (
                  <CompactListRow
                    key={movement.id}
                    meta={`${movement.quantity} unidades · ${locationName(movement.fromLocationId)} → ${locationName(movement.toLocationId)}`}
                  >
                    <strong>{movement.productName}</strong>
                    <small>{movement.notes ?? "Sin notas"}</small>
                  </CompactListRow>
                ))}
              </CompactList>
            ) : (
              <p>Aún no hay movimientos registrados.</p>
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
                    <small>
                      {editionYear(item.sourceEditionId)}
                      {item.notes ? ` · ${item.notes}` : ""}
                    </small>
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
        title={
          modal === "location"
            ? "Ubicación"
            : modal === "stock"
              ? editingId
                ? "Editar existencias"
                : "Ajustar existencias"
              : modal === "movement"
                ? "Mover existencias"
                : editingId
                  ? "Editar sobrante"
                  : "Nuevo sobrante"
        }
      >
        <form className={styles.form} onSubmit={save}>
          {modal === "location" ? (
            <label>
              Nombre
              <input onChange={(event) => setName(event.target.value)} required value={name} />
            </label>
          ) : modal === "movement" ? (
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
                Origen
                <select
                  onChange={(event) => setFromLocationId(event.target.value)}
                  value={fromLocationId}
                >
                  <option value="">Sin origen (entrada)</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Destino
                <select
                  onChange={(event) => setToLocationId(event.target.value)}
                  required
                  value={toLocationId}
                >
                  <option value="">Sin destino (salida)</option>
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
                  min="0.01"
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={quantity}
                />
              </label>
              <label>
                Notas
                <textarea onChange={(event) => setNotes(event.target.value)} value={notes} />
              </label>
            </>
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
                {modal === "stock" && !editingId ? "Cantidad a añadir" : "Cantidad"}
                <input
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={quantity}
                />
              </label>
              {modal === "leftover" && (
                <>
                  <label>
                    Edición de origen
                    <select
                      onChange={(event) => setSourceEditionId(event.target.value)}
                      value={sourceEditionId}
                    >
                      <option value="">Sin edición de origen</option>
                      {editions
                        .filter((edition) => edition.id !== editionId)
                        .map((edition) => (
                          <option key={edition.id} value={edition.id}>
                            {edition.year}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Estado
                    <select onChange={(event) => setStatus(event.target.value)} value={status}>
                      <option value="available">Disponible</option>
                      <option value="consumed">Consumido</option>
                      <option value="discarded">Descartado</option>
                    </select>
                  </label>
                </>
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
