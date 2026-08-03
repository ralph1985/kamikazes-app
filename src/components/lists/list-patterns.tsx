"use client";

import type { ReactNode } from "react";
import styles from "./list-patterns.module.css";

export function ListToolbar({
  children,
  count,
  onQueryChange,
  query,
  placeholder = "Buscar",
}: Readonly<{
  children?: ReactNode;
  count?: number;
  onQueryChange?: (query: string) => void;
  query?: string;
  placeholder?: string;
}>) {
  return (
    <div className={styles.toolbar}>
      {onQueryChange ? (
        <input
          aria-label={placeholder}
          className={styles.search}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          type="search"
          value={query ?? ""}
        />
      ) : (
        <span />
      )}
      <div className={styles.count}>
        {count === undefined ? null : `${count} resultados`}
        {children}
      </div>
    </div>
  );
}

export function ListState({
  action,
  description,
  title,
}: Readonly<{ action?: ReactNode; description: string; title: string }>) {
  return (
    <div className={styles.state}>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function ConfirmDialog({
  cancelLabel = "Cancelar",
  confirmLabel = "Confirmar",
  description,
  onCancel,
  onConfirm,
  open,
  title,
  destructive = false,
}: Readonly<{
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  destructive?: boolean;
}>) {
  if (!open) return null;
  return (
    <div className={styles.dialogBackdrop}>
      <div aria-modal="true" className={styles.dialog} role="dialog">
        <h2>{title}</h2>
        <p>{description}</p>
        <div className={styles.dialogActions}>
          <button className={styles.cancel} onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button
            className={`${styles.confirm} ${destructive ? styles.confirmDanger : ""}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EditPanel({ children, title }: Readonly<{ children: ReactNode; title: string }>) {
  return (
    <section className={styles.editPanel}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function SelectionToolbar({
  actionLabel,
  onAction,
  selectedCount,
}: Readonly<{ actionLabel: string; onAction: () => void; selectedCount: number }>) {
  if (selectedCount === 0) return null;
  return (
    <div className={styles.selectionToolbar}>
      <span>{selectedCount} seleccionados</span>
      <button onClick={onAction} type="button">
        {actionLabel}
      </button>
    </div>
  );
}

export function ListDetailLayout({
  aside,
  children,
}: Readonly<{ aside: ReactNode; children: ReactNode }>) {
  return (
    <div className={styles.detailLayout}>
      <div className={styles.detail}>{children}</div>
      <aside className={styles.detailAside}>{aside}</aside>
    </div>
  );
}

export function MoneyCell({ amount }: Readonly<{ amount: number | string | null | undefined }>) {
  if (amount === null || amount === undefined || amount === "") return <span>—</span>;
  return (
    <span>
      {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
        Number(amount),
      )}
    </span>
  );
}

export function DateCell({ value }: Readonly<{ value: Date | string | null | undefined }>) {
  if (!value) return <span>—</span>;
  const date = value instanceof Date ? value : new Date(value);
  return <time dateTime={date.toISOString()}>{new Intl.DateTimeFormat("es-ES").format(date)}</time>;
}
