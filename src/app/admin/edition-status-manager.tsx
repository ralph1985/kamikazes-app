"use client";

import { useState } from "react";
import styles from "./admin.module.css";

type Edition = { id: string; year: number; status: "open" | "closed" };

export default function EditionStatusManager({
  initialEditions,
}: Readonly<{ initialEditions: Edition[] }>) {
  const [editions, setEditions] = useState(initialEditions);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function changeStatus(edition: Edition) {
    const nextStatus = edition.status === "open" ? "closed" : "open";
    const action = nextStatus === "closed" ? "cerrar" : "reabrir";
    if (!window.confirm(`¿Quieres ${action} la edición ${edition.year}?`)) return;

    setMessage(null);
    setSaving(edition.id);
    try {
      const response = await fetch(`/api/v1/editions/${edition.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = (await response.json()) as {
        data?: Edition;
        error?: { message?: string };
      };
      if (!response.ok || !result.data) {
        setMessage(result.error?.message ?? "No se pudo actualizar la edición.");
        return;
      }
      setEditions((current) =>
        current.map((item) => (item.id === edition.id ? result.data! : item)),
      );
      setMessage(`Edición ${edition.year} ${nextStatus === "closed" ? "cerrada" : "reabierta"}.`);
    } catch {
      setMessage("No se pudo conectar con Kamikazes.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className={styles.editionManager}>
      <h3>Ediciones existentes</h3>
      {message ? (
        <p className={styles.message} role="status">
          {message}
        </p>
      ) : null}
      {editions.length === 0 ? (
        <p className={styles.muted}>Todavía no hay ediciones creadas.</p>
      ) : (
        <ul className={styles.editionList}>
          {editions.map((edition) => (
            <li key={edition.id}>
              <span>
                <strong>{edition.year}</strong> ·{" "}
                {edition.status === "open" ? "Abierta" : "Cerrada"}
              </span>
              <button
                disabled={saving === edition.id}
                onClick={() => void changeStatus(edition)}
                type="button"
              >
                {saving === edition.id
                  ? "Guardando…"
                  : edition.status === "open"
                    ? "Cerrar"
                    : "Reabrir"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
