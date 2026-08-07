import type { ReactNode } from "react";
import styles from "./page-layout.module.css";

type PageLayoutVariant = "standard" | "auth";

export function PageLayout({
  children,
  variant = "standard",
}: Readonly<{
  children: ReactNode;
  variant?: PageLayoutVariant;
}>) {
  return (
    <div className={`${styles.layout} ${variant === "auth" ? styles.auth : ""}`}>{children}</div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}>) {
  return (
    <header className={styles.header}>
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
