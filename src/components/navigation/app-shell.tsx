"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import styles from "./app-shell.module.css";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`${styles.viewport} ${isOpen ? styles.open : ""}`}>
      <aside className={styles.sidebar} aria-label="Navegación principal" id="main-navigation">
        <div className={styles.brand}>
          <span className={styles.brandMark}>K</span>
          <span>Kamikazes</span>
        </div>
        <nav aria-label="Navegación principal" className={styles.nav}>
          <Link
            className={`${styles.navLink} ${pathname === "/" ? styles.active : ""}`}
            href="/"
            onClick={() => setIsOpen(false)}
          >
            Inicio
          </Link>
          <Link
            className={`${styles.navLink} ${pathname === "/login" ? styles.active : ""}`}
            href="/login"
            onClick={() => setIsOpen(false)}
          >
            Iniciar sesión
          </Link>
        </nav>
        <p className={styles.sidebarNote}>La vida de la peña, ordenada por ediciones.</p>
      </aside>

      <div className={styles.page}>
        <header className={styles.header}>
          <button
            aria-controls="main-navigation"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
            className={styles.menuButton}
            onClick={() => setIsOpen((open) => !open)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
          <span className={styles.headerLabel}>Kamikazes</span>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
