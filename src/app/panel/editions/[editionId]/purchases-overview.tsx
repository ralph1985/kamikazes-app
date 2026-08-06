"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CompactList, CompactListRow, EditIcon, IconButton } from "@/components/lists/compact-list";
import { ListState, MoneyCell } from "@/components/lists/list-patterns";
import { Modal } from "@/components/ui/modal";
import type { ShoppingStore } from "./shopping-overview";
import styles from "./shopping.module.css";

type Purchase = {
  id: string;
  storeId: string | null;
  storeName: string | null;
  purchaserMemberId: string;
  purchaserName: string;
  purchasedAt: string;
  totalAmount: string;
  notes: string | null;
};
type Participant = { memberId: string; displayName: string };
type Receipt = { id: string; filename: string; contentType: string; sizeBytes: number };

export default function PurchasesOverview({
  editionId,
  readOnly,
  stores,
}: Readonly<{ editionId: string; readOnly: boolean; stores: ShoppingStore[] }>) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [receipts, setReceipts] = useState<Record<string, Receipt[]>>({});
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [storeId, setStoreId] = useState("");
  const [purchaserMemberId, setPurchaserMemberId] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [purchasesResponse, participantsResponse] = await Promise.all([
        fetch(`/api/v1/editions/${editionId}/shopping/purchases`),
        fetch(`/api/v1/editions/${editionId}/participants`),
      ]);
      const purchasesResult = (await purchasesResponse.json()) as {
        data?: { purchases: Purchase[] };
        error?: { message: string };
      };
      const participantsResult = (await participantsResponse.json()) as {
        data?: Participant[];
        error?: { message: string };
      };
      if (!purchasesResponse.ok || !purchasesResult.data)
        throw new Error(purchasesResult.error?.message ?? "No se pudieron cargar las compras");
      if (!participantsResponse.ok || !participantsResult.data)
        throw new Error(participantsResult.error?.message ?? "No se pudieron cargar los miembros");
      setPurchases(purchasesResult.data.purchases);
      setParticipants(participantsResult.data);
      const receiptEntries = await Promise.all(
        purchasesResult.data.purchases.map(async (purchase) => {
          const response = await fetch(
            `/api/v1/editions/${editionId}/shopping/purchases/${purchase.id}/receipts`,
          );
          const result = (await response.json()) as { data?: { receipts: Receipt[] } };
          return [purchase.id, result.data?.receipts ?? []] as const;
        }),
      );
      setReceipts(Object.fromEntries(receiptEntries));
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "No se pudieron cargar las compras",
      );
    } finally {
      setLoading(false);
    }
  }, [editionId]);

  useEffect(() => {
    void load();
  }, [load]);

  function edit(purchase?: Purchase) {
    setEditing(purchase ?? null);
    setStoreId(purchase?.storeId ?? "");
    setPurchaserMemberId(purchase?.purchaserMemberId ?? participants[0]?.memberId ?? "");
    setPurchasedAt(purchase?.purchasedAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setTotalAmount(purchase?.totalAmount ?? "");
    setNotes(purchase?.notes ?? "");
    setOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/v1/editions/${editionId}/shopping/purchases`, {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...(editing ? { id: editing.id } : {}),
        storeId: storeId || null,
        purchaserMemberId,
        purchasedAt,
        totalAmount: Number(totalAmount),
        notes: notes || null,
      }),
    });
    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok) {
      setError(result.error?.message ?? "No se pudo guardar la compra");
      return;
    }
    setOpen(false);
    await load();
  }

  async function uploadReceipt(purchaseId: string, file: File) {
    const body = new FormData();
    body.set("file", file);
    const response = await fetch(
      `/api/v1/editions/${editionId}/shopping/purchases/${purchaseId}/receipts`,
      { method: "POST", body },
    );
    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok) {
      setError(result.error?.message ?? "No se pudo subir el ticket");
      return;
    }
    await load();
  }

  async function deleteReceipt(purchaseId: string, receiptId: string) {
    const response = await fetch(
      `/api/v1/editions/${editionId}/shopping/purchases/${purchaseId}/receipts/${receiptId}`,
      { method: "DELETE" },
    );
    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok) {
      setError(result.error?.message ?? "No se pudo eliminar el ticket");
      return;
    }
    await load();
  }

  const ticketedPurchases = purchases.filter(
    (purchase) => (receipts[purchase.id] ?? []).length > 0,
  );
  const total = ticketedPurchases.reduce((sum, purchase) => sum + Number(purchase.totalAmount), 0);

  return (
    <section className={styles.purchaseSection}>
      <div className={styles.purchaseHeading}>
        <div>
          <p className="eyebrow">Gasto real · tickets</p>
          <h3>Compras registradas</h3>
        </div>
        {!readOnly && (
          <button className={styles.primary} onClick={() => edit()} type="button">
            Nueva compra
          </button>
        )}
      </div>
      <div className={styles.totals}>
        <span>
          Compra real <MoneyCell amount={total} />
        </span>
        <span>{ticketedPurchases.length} compras con ticket</span>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <ListState description="Cargando compras…" title="Compras reales" />
      ) : purchases.length === 0 ? (
        <ListState
          description="Registra una compra real cuando tengas el importe pagado."
          title="Todavía no hay compras"
        />
      ) : (
        <CompactList>
          {purchases.map((purchase) => (
            <CompactListRow
              action={
                !readOnly && (
                  <IconButton
                    label={`Editar compra de ${purchase.storeName ?? "tienda sin nombre"}`}
                    onClick={() => edit(purchase)}
                  >
                    <EditIcon />
                  </IconButton>
                )
              }
              key={purchase.id}
              meta={<MoneyCell amount={purchase.totalAmount} />}
            >
              <strong>{purchase.storeName ?? "Tienda sin asignar"}</strong>
              <small>
                {new Intl.DateTimeFormat("es-ES").format(new Date(purchase.purchasedAt))} ·{" "}
                {purchase.purchaserName}
                {purchase.notes ? ` · ${purchase.notes}` : ""}
              </small>
              <div className={styles.receipts}>
                {receipts[purchase.id]?.map((receipt) => (
                  <span className={styles.receipt} key={receipt.id}>
                    <a
                      href={`/api/v1/editions/${editionId}/shopping/purchases/${purchase.id}/receipts/${receipt.id}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {receipt.filename}
                    </a>
                    {!readOnly && (
                      <button
                        aria-label={`Eliminar ${receipt.filename}`}
                        onClick={() => void deleteReceipt(purchase.id, receipt.id)}
                        type="button"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {!readOnly && (
                  <label className={styles.upload}>
                    <span>Subir ticket</span>
                    <input
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadReceipt(purchase.id, file);
                        event.currentTarget.value = "";
                      }}
                      type="file"
                    />
                  </label>
                )}
              </div>
            </CompactListRow>
          ))}
        </CompactList>
      )}
      <Modal
        onClose={() => setOpen(false)}
        open={open}
        title={editing ? "Editar compra" : "Nueva compra"}
      >
        <form className={styles.form} onSubmit={save}>
          <label>
            Tienda
            <select onChange={(event) => setStoreId(event.target.value)} value={storeId}>
              <option value="">Sin tienda</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Persona compradora
            <select
              onChange={(event) => setPurchaserMemberId(event.target.value)}
              required
              value={purchaserMemberId}
            >
              <option value="">Selecciona una persona</option>
              {participants.map((participant) => (
                <option key={participant.memberId} value={participant.memberId}>
                  {participant.displayName}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.twoColumns}>
            <label>
              Fecha
              <input
                onChange={(event) => setPurchasedAt(event.target.value)}
                required
                type="date"
                value={purchasedAt}
              />
            </label>
            <label>
              Importe total
              <input
                min="0"
                onChange={(event) => setTotalAmount(event.target.value)}
                required
                step="0.01"
                type="number"
                value={totalAmount}
              />
            </label>
          </div>
          <label>
            Notas
            <textarea onChange={(event) => setNotes(event.target.value)} value={notes} />
          </label>
          <div className={styles.actions}>
            <button className={styles.cancel} onClick={() => setOpen(false)} type="button">
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
