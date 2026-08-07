"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./public-home.module.css";

type PublicSection = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
};
type PublicSocialLink = {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
};
type PublicContent = { sections: PublicSection[]; socialLinks: PublicSocialLink[] };

const fallbackSections = [
  {
    id: "about",
    title: "Quiénes somos",
    body: "Una peña que organiza cada edición para seguir compartiendo lo que importa.",
  },
  {
    id: "history",
    title: "Nuestra historia",
    body: "Los Kamikazes se fundaron en 1999 en Palomares del Campo (Cuenca). En el archivo de la web antigua aparecen ya los recuerdos de los primeros años: las fiestas, las peñas, las reuniones y las historias compartidas por sus miembros. Esta nueva web recupera ese legado y lo ordena para que siga formando parte de la vida de la peña.",
  },
];

export default function PublicHome() {
  const [content, setContent] = useState<PublicContent | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    void fetch("/api/v1/public-content")
      .then(async (response) =>
        response.ok ? ((await response.json()).data as PublicContent) : null,
      )
      .then(setContent)
      .catch(() => setContent(null));
  }, []);

  useEffect(() => {
    void fetch("/api/v1/auth/me")
      .then((response) => setIsAuthenticated(response.ok))
      .catch(() => setIsAuthenticated(false));
  }, []);

  const sections = content?.sections.length
    ? content.sections
    : fallbackSections.map((section) => ({
        ...section,
        imageUrl: null,
        sortOrder: 0,
        isVisible: true,
      }));

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Peña Kamikazes · Desde 1999</p>
          <h1>La vida de la peña, ordenada y compartida.</h1>
          <p>
            Un lugar común para cuidar cada edición, contar nuestra historia y mantener cerca todo
            lo que vivimos juntos.
          </p>
          <a className={styles.loginLink} href={isAuthenticated ? "/panel" : "/login"}>
            {isAuthenticated ? "Ir a las ediciones" : "Entrar en la peña"}
          </a>
        </div>
        <div className={styles.logoFrame}>
          <Image
            alt="Logotipo de la peña Kamikazes"
            className={styles.logo}
            height={139}
            priority
            src="/brand/kamikazes-logo.png"
            width={137}
          />
        </div>
      </section>
      <section aria-label="Historia de Kamikazes" className={styles.sections}>
        {sections.map((section) => (
          <article className={styles.section} key={section.id}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </section>
      {content?.socialLinks.length ? (
        <nav aria-label="Redes sociales" className={styles.social}>
          <p>También estamos en</p>
          {content.socialLinks.map((link) => (
            <a href={link.url} key={link.id} rel="noreferrer" target="_blank">
              {link.label}
            </a>
          ))}
        </nav>
      ) : (
        <p className={styles.empty}>La información de contacto aparecerá aquí próximamente.</p>
      )}
    </main>
  );
}
