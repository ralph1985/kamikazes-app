"use client";

import type { FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import styles from "./edition.module.css";

export function MealForm({
  open,
  editing,
  name,
  plannedPrice,
  realPrice,
  onClose,
  onNameChange,
  onPlannedPriceChange,
  onRealPriceChange,
  onSubmit,
}: Readonly<{
  open: boolean;
  editing: boolean;
  name: string;
  plannedPrice: string;
  realPrice: string;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onPlannedPriceChange: (value: string) => void;
  onRealPriceChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <Modal onClose={onClose} open={open} title={editing ? "Editar comida" : "Añadir comida"}>
      <form className={styles.form} onSubmit={onSubmit}>
        <label>
          Nombre
          <input onChange={(event) => onNameChange(event.target.value)} required value={name} />
        </label>
        <div className={styles.twoColumns}>
          <label>
            Precio previsto
            <input
              min="0"
              onChange={(event) => onPlannedPriceChange(event.target.value)}
              required
              step="0.01"
              type="number"
              value={plannedPrice}
            />
          </label>
          <label>
            Precio real
            <input
              min="0"
              onChange={(event) => onRealPriceChange(event.target.value)}
              step="0.01"
              type="number"
              value={realPrice}
            />
          </label>
        </div>
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose} type="button">
            Cancelar
          </button>
          <button className={styles.primary} type="submit">
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
