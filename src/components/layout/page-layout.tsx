import type { ReactNode } from "react";
import styles from "./page-layout.module.css";

type PageLayoutVariant = "standard" | "wide" | "auth" | "public";

export function PageLayout({
  children,
  variant = "standard",
  fullBleedMobile = false,
}: Readonly<{
  children: ReactNode;
  variant?: PageLayoutVariant;
  fullBleedMobile?: boolean;
}>) {
  return (
    <div
      className={`${styles.layout} ${styles[variant]} ${fullBleedMobile ? styles.fullBleedMobile : ""}`}
    >
      {children}
    </div>
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
