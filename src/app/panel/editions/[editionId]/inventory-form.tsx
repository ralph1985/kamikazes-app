"use client";

import type { FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import styles from "./edition.module.css";

export type InventoryModalType = "location" | "stock" | "movement" | "leftover";
export type InventoryLocationOption = { id: string; name: string };
export type InventoryEditionOption = { id: string; year: number };

export function InventoryForm({
  modal,
  editing,
  name,
  locationId,
  fromLocationId,
  toLocationId,
  sourceEditionId,
  productName,
  quantity,
  status,
  notes,
  locations,
  editions,
  currentEditionId,
  onClose,
  onSubmit,
  onNameChange,
  onLocationChange,
  onFromLocationChange,
  onToLocationChange,
  onSourceEditionChange,
  onProductNameChange,
  onQuantityChange,
  onStatusChange,
  onNotesChange,
}: Readonly<{
  modal: InventoryModalType | null;
  editing: boolean;
  name: string;
  locationId: string;
  fromLocationId: string;
  toLocationId: string;
  sourceEditionId: string;
  productName: string;
  quantity: string;
  status: string;
  notes: string;
  locations: InventoryLocationOption[];
  editions: InventoryEditionOption[];
  currentEditionId: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNameChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onSourceEditionChange: (value: string) => void;
  onProductNameChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}>) {
  if (!modal) return null;
  const title =
    modal === "location"
      ? "Ubicación"
      : modal === "stock"
        ? editing
          ? "Editar existencias"
          : "Ajustar existencias"
        : modal === "movement"
          ? "Mover existencias"
          : editing
            ? "Editar sobrante"
            : "Nuevo sobrante";
  return (
    <Modal onClose={onClose} open title={title}>
      <form className={styles.form} onSubmit={onSubmit}>
        {modal === "location" ? (
          <label>
            Nombre
            <input onChange={(event) => onNameChange(event.target.value)} required value={name} />
          </label>
        ) : modal === "movement" ? (
          <>
            <label>
              Producto
              <input
                onChange={(event) => onProductNameChange(event.target.value)}
                required
                value={productName}
              />
            </label>
            <label>
              Origen
              <select
                onChange={(event) => onFromLocationChange(event.target.value)}
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
                onChange={(event) => onToLocationChange(event.target.value)}
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
                onChange={(event) => onQuantityChange(event.target.value)}
                required
                step="0.01"
                type="number"
                value={quantity}
              />
            </label>
            <label>
              Notas
              <textarea onChange={(event) => onNotesChange(event.target.value)} value={notes} />
            </label>
          </>
        ) : (
          <>
            <label>
              Producto
              <input
                onChange={(event) => onProductNameChange(event.target.value)}
                required
                value={productName}
              />
            </label>
            <label>
              Ubicación
              <select
                onChange={(event) => onLocationChange(event.target.value)}
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
              {modal === "stock" && !editing ? "Cantidad a añadir" : "Cantidad"}
              <input
                onChange={(event) => onQuantityChange(event.target.value)}
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
                    onChange={(event) => onSourceEditionChange(event.target.value)}
                    value={sourceEditionId}
                  >
                    <option value="">Sin edición de origen</option>
                    {editions
                      .filter((edition) => edition.id !== currentEditionId)
                      .map((edition) => (
                        <option key={edition.id} value={edition.id}>
                          {edition.year}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Estado
                  <select onChange={(event) => onStatusChange(event.target.value)} value={status}>
                    <option value="available">Disponible</option>
                    <option value="consumed">Consumido</option>
                    <option value="discarded">Descartado</option>
                  </select>
                </label>
              </>
            )}
            <label>
              Notas
              <textarea onChange={(event) => onNotesChange(event.target.value)} value={notes} />
            </label>
          </>
        )}
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
