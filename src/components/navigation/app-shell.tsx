"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import packageJson from "../../../package.json";
import styles from "./app-shell.module.css";

type SessionMember = {
  displayName: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
};

type Edition = {
  id: string;
  year: number;
};

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [member, setMember] = useState<SessionMember | null>(null);
  const [editions, setEditions] = useState<Edition[]>([]);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/auth/me")
      .then(async (response) =>
        response.ok ? ((await response.json()).data as SessionMember) : null,
      )
      .then((currentMember) => {
        if (!active) return;
        setMember(currentMember);
        if (!currentMember) {
          setEditions([]);
          return;
        }
        void fetch("/api/v1/editions")
          .then(async (response) =>
            response.ok ? ((await response.json()).data as Edition[]) : [],
          )
          .then((currentEditions) => {
            if (active) setEditions(currentEditions);
          })
          .catch(() => {
            if (active) setEditions([]);
          });
      })
      .catch(() => {
        if (active) {
          setMember(null);
          setEditions([]);
        }
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

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
            className={`${styles.navLink} ${pathname === "/profile" ? styles.active : ""}`}
            href={member ? "/profile" : "/login"}
            onClick={() => setIsOpen(false)}
          >
            {member ? "Mi cuenta" : "Iniciar sesión"}
          </Link>
          {member ? (
            <div className={styles.submenuGroup}>
              <Link
                className={`${styles.navLink} ${pathname === "/panel" ? styles.active : ""}`}
                href="/panel"
                onClick={() => setIsOpen(false)}
              >
                Ediciones
              </Link>
              {editions.length ? (
                <div className={styles.submenu} aria-label="Ediciones">
                  {editions.map((edition) => (
                    <Link
                      className={styles.submenuLink}
                      href={`/panel/editions/${edition.id}`}
                      key={edition.id}
                      onClick={() => setIsOpen(false)}
                    >
                      {edition.year}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {member?.isAdmin ? (
            <Link
              className={`${styles.navLink} ${pathname === "/admin" ? styles.active : ""}`}
              href="/admin"
              onClick={() => setIsOpen(false)}
            >
              Administración
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
          Made with ❤️ ·{" "}
          <a href="https://conquense.dev/" rel="noreferrer" target="_blank">
            conquense.dev
          </a>
        </p>
        <p className={styles.version}>v{packageJson.version}</p>
      </aside>

      <div className={styles.page}>
        {isOpen ? (
          <button
            aria-label="Cerrar menú"
            className={styles.backdrop}
            onClick={() => setIsOpen(false)}
            type="button"
          />
        ) : null}
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
