"use client";

import type { FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import styles from "./shopping.module.css";

export type ShoppingFormState = {
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

type Option = { id: string; name: string };
type Edition = { id: string; year: number; status: string };
const statuses = [
  ["pending", "Pendiente"],
  ["in_cart", "En carrito"],
  ["purchased", "Comprado"],
  ["not_buying", "No se compra este año"],
  ["gifted", "Regalado"],
] as const;

export function ShoppingProductForm({
  form,
  categories,
  stores,
  open,
  onClose,
  onChange,
  onSubmit,
}: Readonly<{
  form: ShoppingFormState;
  categories: Option[];
  stores: Option[];
  open: boolean;
  onClose: () => void;
  onChange: (field: keyof ShoppingFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  const quantityFields = [
    "plannedQuantity",
    "plannedUnitPrice",
    "realQuantity",
    "realUnitPrice",
  ] as const;
  const labels = {
    plannedQuantity: "Cantidad prevista",
    plannedUnitPrice: "Precio unitario previsto",
    realQuantity: "Cantidad real",
    realUnitPrice: "Precio unitario real",
  };
  return (
    <Modal onClose={onClose} open={open} title={form.id ? "Editar producto" : "Añadir producto"}>
      <form className={styles.form} onSubmit={onSubmit}>
        <label>
          Descripción
          <input
            onChange={(event) => onChange("description", event.target.value)}
            required
            value={form.description}
          />
        </label>
        <div className={styles.twoColumns}>
          <label>
            Categoría
            <input
              list="shopping-categories"
              onChange={(event) => onChange("category", event.target.value)}
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
              list="shopping-stores"
              onChange={(event) => onChange("store", event.target.value)}
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
          {quantityFields.map((field) => (
            <label key={field}>
              {labels[field]}
              <input
                min={field.includes("Quantity") ? "-999999" : "0"}
                onChange={(event) => onChange(field, event.target.value)}
                step={field.includes("Quantity") ? "0.001" : "0.01"}
                type="number"
                value={form[field]}
              />
            </label>
          ))}
        </div>
        <div className={styles.twoColumns}>
          <label>
            Responsable
            <input
              onChange={(event) => onChange("assignment", event.target.value)}
              value={form.assignment}
            />
          </label>
          <label>
            Estado
            <select
              onChange={(event) => onChange("status", event.target.value)}
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
            onChange={(event) => onChange("notes", event.target.value)}
            value={form.notes}
          />
        </label>
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

export function CopyShoppingForm({
  open,
  editions,
  currentEditionId,
  sourceEditionId,
  copying,
  onClose,
  onSourceChange,
  onSubmit,
}: Readonly<{
  open: boolean;
  editions: Edition[];
  currentEditionId: string;
  sourceEditionId: string;
  copying: boolean;
  onClose: () => void;
  onSourceChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <Modal onClose={onClose} open={open} title="Copiar lista de otra edición">
      <form className={styles.form} onSubmit={onSubmit}>
        <p className={styles.muted}>
          Se copiarán productos, categorías, tiendas y previsión. El seguimiento real empezará de
          nuevo.
        </p>
        <label>
          Edición origen
          <select
            onChange={(event) => onSourceChange(event.target.value)}
            required
            value={sourceEditionId}
          >
            <option value="">Selecciona una edición</option>
            {editions
              .filter((edition) => edition.id !== currentEditionId)
              .map((edition) => (
                <option key={edition.id} value={edition.id}>
                  {edition.year} · {edition.status === "closed" ? "Cerrada" : "Abierta"}
                </option>
              ))}
          </select>
        </label>
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose} type="button">
            Cancelar
          </button>
          <button className={styles.primary} disabled={copying} type="submit">
            {copying ? "Copiando…" : "Copiar lista"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
