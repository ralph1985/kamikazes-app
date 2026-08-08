"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CompactList, CompactListRow, EditIcon, IconButton } from "@/components/lists/compact-list";
import { ListState } from "@/components/lists/list-patterns";
import { InventoryForm, type InventoryModalType } from "./inventory-form";
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
type ModalType = InventoryModalType;
type InventoryView = "inventory" | "leftovers";

export default function InventoryOverview({
  editionId,
  readOnly,
  view = "inventory",
}: Readonly<{ editionId: string; readOnly: boolean; view?: InventoryView }>) {
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
  const formatQuantity = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? parsed.toLocaleString("es-ES", { maximumFractionDigits: 2 })
      : value;
  };
  const isLeftoversView = view === "leftovers";

  return (
    <section className={styles.content}>
      <div className={styles.welcome}>
        <div className={styles.header}>
          <div>
            <p className="eyebrow">Compras / Inventario</p>
            <h2>{isLeftoversView ? "Sobrantes" : "Inventario"}</h2>
            <p>
              {isLeftoversView
                ? "Material procedente de otras ediciones, con ubicación y estado de uso."
                : "Cantidades acumuladas por producto y ubicación, con movimientos auditados."}
            </p>
          </div>
          {canEdit && !readOnly && (
            <div className={styles.rowActions}>
              {isLeftoversView ? (
                <button className={styles.primary} onClick={() => open("leftover")} type="button">
                  Nuevo sobrante
                </button>
              ) : (
                <>
                  <button className={styles.primary} onClick={() => open("location")} type="button">
                    Nueva ubicación
                  </button>
                  <button className={styles.primary} onClick={() => open("stock")} type="button">
                    Ajustar existencias
                  </button>
                  <button className={styles.primary} onClick={() => open("movement")} type="button">
                    Mover existencias
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <ListState description="Cargando inventario…" title="Inventario" />
      ) : (
        <>
          {view === "inventory" && (
            <>
              <section className={styles.welcome}>
                <div className={styles.header}>
                  <h2>Existencias</h2>
                  <span>
                    {items.length} registros · {locations.length} ubicaciones
                  </span>
                </div>
                {items.length ? (
                  <div
                    aria-label="Existencias por ubicación"
                    className={styles.inventoryBoard}
                    role="region"
                  >
                    <div className={styles.inventoryColumns}>
                      {locations.map((location) => {
                        const locationItems = items.filter(
                          (item) => item.locationId === location.id,
                        );

                        return (
                          <section className={styles.inventoryColumn} key={location.id}>
                            <header className={styles.inventoryColumnHeader}>
                              <div>
                                <p className="eyebrow">Ubicación</p>
                                <h3>{location.name}</h3>
                              </div>
                              <span>{locationItems.length}</span>
                            </header>
                            <div className={styles.inventoryCards}>
                              {locationItems.length ? (
                                locationItems.map((item) => (
                                  <article className={styles.inventoryCard} key={item.id}>
                                    <div className={styles.inventoryCardTopline}>
                                      <strong>{item.productName}</strong>
                                      {canEdit && !readOnly && (
                                        <IconButton
                                          label={`Editar ${item.productName}`}
                                          onClick={() => open("stock", item)}
                                        >
                                          <EditIcon />
                                        </IconButton>
                                      )}
                                    </div>
                                    <p className={styles.inventoryQuantity}>
                                      <span>Cantidad</span>
                                      <strong>{formatQuantity(item.quantity)}</strong>
                                    </p>
                                    <small>{item.notes ?? "Sin notas"}</small>
                                  </article>
                                ))
                              ) : (
                                <p className={styles.inventoryEmpty}>Sin existencias registradas</p>
                              )}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </div>
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
                        meta={`${formatQuantity(movement.quantity)} unidades · ${locationName(movement.fromLocationId)} → ${locationName(movement.toLocationId)}`}
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
            </>
          )}
          {isLeftoversView && (
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
                      meta={`${formatQuantity(item.quantity)} unidades · ${item.status} · ${locationName(item.locationId)}`}
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
          )}
        </>
      )}
      <InventoryForm
        currentEditionId={editionId}
        editions={editions}
        editing={editingId !== undefined}
        fromLocationId={fromLocationId}
        locationId={locationId}
        locations={locations}
        modal={modal}
        name={name}
        notes={notes}
        onClose={() => setModal(null)}
        onFromLocationChange={setFromLocationId}
        onLocationChange={setLocationId}
        onNameChange={setName}
        onNotesChange={setNotes}
        onProductNameChange={setProductName}
        onQuantityChange={setQuantity}
        onSourceEditionChange={setSourceEditionId}
        onStatusChange={setStatus}
        onSubmit={save}
        onToLocationChange={setToLocationId}
        productName={productName}
        quantity={quantity}
        sourceEditionId={sourceEditionId}
        status={status}
        toLocationId={toLocationId}
      />
    </section>
  );
}
