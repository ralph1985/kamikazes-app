import type { ReactNode } from "react";
import styles from "./compact-list.module.css";

export type SharedRole = "Administrador" | "Editor" | "Lector";

export function CompactList({ children }: Readonly<{ children: ReactNode }>) {
  return <div className={styles.list}>{children}</div>;
}

export function CompactListRow({
  children,
  action,
  meta,
}: Readonly<{ children: ReactNode; action?: ReactNode; meta?: ReactNode }>) {
  return (
    <div className={styles.row}>
      <div className={styles.content}>{children}</div>
      {meta ? <div className={styles.meta}>{meta}</div> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}

export function RoleBadge({ role }: Readonly<{ role: SharedRole }>) {
  return <span className={`${styles.badge} ${styles[role.toLowerCase()]}`}>{role}</span>;
}

export function StatusBadge({ active }: Readonly<{ active: boolean }>) {
  return (
    <span className={`${styles.status} ${active ? styles.active : styles.inactive}`}>
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

export function IconButton({
  children,
  label,
  onClick,
}: Readonly<{ children: ReactNode; label: string; onClick?: () => void }>) {
  return (
    <button
      aria-label={label}
      className={styles.iconButton}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export function EditIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="17" viewBox="0 0 24 24" width="17">
      <path
        d="m4 16.5-.8 3.3 3.3-.8L18 7.5 15.5 5 4 16.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m14.8 5.7 2.5 2.5M6.5 19l-2.3.5.5-2.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
