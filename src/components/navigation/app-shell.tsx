"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import styles from "./app-shell.module.css";

type SessionMember = {
  displayName: string;
  mustChangePassword: boolean;
};

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [member, setMember] = useState<SessionMember | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/auth/me")
      .then(async (response) =>
        response.ok ? ((await response.json()).data as SessionMember) : null,
      )
      .then((currentMember) => {
        if (active) setMember(currentMember);
      })
      .catch(() => {
        if (active) setMember(null);
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    setMember(null);
    setIsOpen(false);
    window.location.assign("/");
  }

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
            {member ? "Mi cuenta" : "Iniciar sesión"}
          </Link>
          {member ? (
            <Link
              className={`${styles.navLink} ${pathname === "/panel" ? styles.active : ""}`}
              href="/panel"
              onClick={() => setIsOpen(false)}
            >
              Ediciones
            </Link>
          ) : null}
          {member ? (
            <button className={styles.navButton} onClick={handleLogout} type="button">
              Cerrar sesión
            </button>
          ) : null}
        </nav>
        <p className={styles.sidebarNote}>
          {member ? `Hola, ${member.displayName}.` : "La vida de la peña, ordenada por ediciones."}
        </p>
        <p className={styles.credit}>
          Hecho por Rafa ·{" "}
          <a href="https://conquense.dev/" rel="noreferrer" target="_blank">
            conquense.dev
          </a>
        </p>
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
