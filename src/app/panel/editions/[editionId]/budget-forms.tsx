"use client";

import type { FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import styles from "./edition.module.css";

export type BudgetFormRate = { name: string; amount: string };
export type BudgetFormParticipant = { memberId: string; displayName: string };

export function RateForm({
  name,
  amount,
  open,
  onClose,
  onNameChange,
  onAmountChange,
  onSubmit,
}: Readonly<{
  name: string;
  amount: string;
  open: boolean;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <Modal onClose={onClose} open={open} title="Nueva tarifa">
      <form className={styles.rateForm} onSubmit={onSubmit}>
        <label>
          Nombre
          <input onChange={(event) => onNameChange(event.target.value)} required value={name} />
        </label>
        <label>
          Importe
          <input
            min="0"
            onChange={(event) => onAmountChange(event.target.value)}
            required
            step="0.01"
            type="number"
            value={amount}
          />
        </label>
        <button type="submit">Crear tarifa</button>
      </form>
    </Modal>
  );
}

export function TransactionForm({
  open,
  editing,
  participants,
  memberId,
  kind,
  amount,
  date,
  method,
  notes,
  onClose,
  onMemberChange,
  onKindChange,
  onAmountChange,
  onDateChange,
  onMethodChange,
  onNotesChange,
  onSubmit,
}: Readonly<{
  open: boolean;
  editing: boolean;
  participants: BudgetFormParticipant[];
  memberId: string;
  kind: "payment" | "refund";
  amount: string;
  date: string;
  method: "cash" | "bizum" | "transfer";
  notes: string;
  onClose: () => void;
  onMemberChange: (value: string) => void;
  onKindChange: (value: "payment" | "refund") => void;
  onAmountChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onMethodChange: (value: "cash" | "bizum" | "transfer") => void;
  onNotesChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <Modal
      onClose={onClose}
      open={open}
      title={editing ? "Corregir pago o devolución" : "Registrar pago o devolución"}
    >
      <form className={styles.rateForm} onSubmit={onSubmit}>
        <label>
          Miembro
          <select
            onChange={(event) => onMemberChange(event.target.value)}
            required
            value={memberId}
          >
            <option value="">Selecciona un miembro</option>
            {participants.map((participant) => (
              <option key={participant.memberId} value={participant.memberId}>
                {participant.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select
            onChange={(event) => onKindChange(event.target.value as typeof kind)}
            value={kind}
          >
            <option value="payment">Pago</option>
            <option value="refund">Devolución</option>
          </select>
        </label>
        <label>
          Importe
          <input
            min="0.01"
            onChange={(event) => onAmountChange(event.target.value)}
            required
            step="0.01"
            type="number"
            value={amount}
          />
        </label>
        <label>
          Fecha
          <input
            onChange={(event) => onDateChange(event.target.value)}
            required
            type="date"
            value={date}
          />
        </label>
        <label>
          Método
          <select
            onChange={(event) => onMethodChange(event.target.value as typeof method)}
            value={method}
          >
            <option value="cash">Efectivo</option>
            <option value="bizum">Bizum</option>
            <option value="transfer">Transferencia</option>
          </select>
        </label>
        <label>
          Notas
          <textarea onChange={(event) => onNotesChange(event.target.value)} value={notes} />
        </label>
        <button type="submit">Guardar</button>
      </form>
    </Modal>
  );
}

export function BalanceForm({
  open,
  editing,
  amount,
  concept,
  originYear,
  onClose,
  onAmountChange,
  onConceptChange,
  onOriginYearChange,
  onSubmit,
}: Readonly<{
  open: boolean;
  editing: boolean;
  amount: string;
  concept: string;
  originYear: string;
  onClose: () => void;
  onAmountChange: (value: string) => void;
  onConceptChange: (value: string) => void;
  onOriginYearChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <Modal onClose={onClose} open={open} title={editing ? "Editar saldo" : "Añadir saldo"}>
      <form className={styles.rateForm} onSubmit={onSubmit}>
        <label>
          Importe
          <input
            min="-9999999999.99"
            onChange={(event) => onAmountChange(event.target.value)}
            required
            step="0.01"
            type="number"
            value={amount}
          />
        </label>
        <label>
          Concepto
          <input
            onChange={(event) => onConceptChange(event.target.value)}
            required
            value={concept}
          />
        </label>
        <label>
          Año de origen (opcional)
          <input
            max="2200"
            min="1900"
            onChange={(event) => onOriginYearChange(event.target.value)}
            type="number"
            value={originYear}
          />
        </label>
        <button type="submit">Guardar saldo</button>
      </form>
    </Modal>
  );
}

export function MovementForm({
  open,
  editing,
  kind,
  amount,
  planned,
  date,
  concept,
  notes,
  onClose,
  onKindChange,
  onAmountChange,
  onPlannedChange,
  onDateChange,
  onConceptChange,
  onNotesChange,
  onSubmit,
}: Readonly<{
  open: boolean;
  editing: boolean;
  kind: "income" | "expense";
  amount: string;
  planned: boolean;
  date: string;
  concept: string;
  notes: string;
  onClose: () => void;
  onKindChange: (value: "income" | "expense") => void;
  onAmountChange: (value: string) => void;
  onPlannedChange: (value: boolean) => void;
  onDateChange: (value: string) => void;
  onConceptChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <Modal
      onClose={onClose}
      open={open}
      title={editing ? "Editar movimiento" : "Añadir movimiento"}
    >
      <form className={styles.rateForm} onSubmit={onSubmit}>
        <label>
          Tipo
          <select
            onChange={(event) => onKindChange(event.target.value as typeof kind)}
            value={kind}
          >
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </select>
        </label>
        <label>
          Importe
          <input
            min="0.01"
            onChange={(event) => onAmountChange(event.target.value)}
            required
            step="0.01"
            type="number"
            value={amount}
          />
        </label>
        <label className={styles.checkboxLabel}>
          <input
            checked={planned}
            onChange={(event) => onPlannedChange(event.target.checked)}
            type="checkbox"
          />{" "}
          Previsto
        </label>
        <label>
          Fecha
          <input
            onChange={(event) => onDateChange(event.target.value)}
            required
            type="date"
            value={date}
          />
        </label>
        <label>
          Concepto
          <input
            onChange={(event) => onConceptChange(event.target.value)}
            required
            value={concept}
          />
        </label>
        <label>
          Notas
          <textarea onChange={(event) => onNotesChange(event.target.value)} value={notes} />
        </label>
        <button type="submit">Guardar movimiento</button>
      </form>
    </Modal>
  );
}
