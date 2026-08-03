import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDatabase } from "@/infrastructure/database/client";
import { createDatabaseEditionReader } from "@/modules/editions/adapters/database-edition-reader";
import { listEditions } from "@/modules/editions/application/list-editions";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import BudgetOverview from "./budget-overview";
import ParticipantsOverview from "./participants-overview";
import styles from "./edition.module.css";

export const dynamic = "force-dynamic";

const sections = [
  { key: "summary", label: "Resumen", available: true },
  { key: "participants", label: "Participantes", available: true },
  { key: "budget", label: "Presupuesto", available: true },
  { key: "shopping", label: "Compras", available: false },
  { key: "inventory", label: "Inventario", available: false },
  { key: "catering", label: "Catering", available: false },
] as const;

type PageProps = {
  params: Promise<{ editionId: string }>;
  searchParams: Promise<{ section?: string }>;
};

export default async function EditionPage({ params, searchParams }: PageProps) {
  const token = (await cookies()).get("kamikazes_session")?.value;
  if (!token) redirect("/login");

  const { editionId } = await params;
  const { section = "summary" } = await searchParams;
  let member: Awaited<ReturnType<typeof authenticateSession>>;
  let edition: Awaited<ReturnType<typeof listEditions>>[number] | undefined;

  try {
    const database = getDatabase();
    member = await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });
    edition = (await listEditions(createDatabaseEditionReader(database))).find(
      (item) => item.id === editionId,
    );
  } catch (error) {
    if (error instanceof IdentityError) redirect("/login");
    return (
      <main className={styles.page}>
        <p className="eyebrow">Espacio privado</p>
        <h1>No se ha podido cargar la edición</h1>
        <p className={styles.description}>Inténtalo de nuevo dentro de unos instantes.</p>
      </main>
    );
  }

  if (member.mustChangePassword) redirect("/change-password");
  if (!edition) notFound();

  const activeSection = sections.find((item) => item.key === section) ?? sections[0];

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href="/panel">
        ← Todas las ediciones
      </Link>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Edición {edition.year}</p>
          <h1>{activeSection.label}</h1>
          <p className={styles.description}>
            {edition.status === "open" ? "Edición abierta" : "Edición cerrada · sólo lectura"}
          </p>
        </div>
        <span className={`${styles.status} ${styles[edition.status]}`}>
          {edition.status === "open" ? "Abierta" : "Cerrada"}
        </span>
      </header>
      <nav aria-label={`Secciones de la edición ${edition.year}`} className={styles.sectionNav}>
        {sections.map((item) => (
          <Link
            aria-current={item.key === activeSection.key ? "page" : undefined}
            className={item.key === activeSection.key ? styles.selected : undefined}
            href={`/panel/editions/${edition.id}?section=${item.key}`}
            key={item.key}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <section className={styles.content}>
        {activeSection.key === "participants" ? (
          <ParticipantsOverview editionId={edition.id} year={edition.year} />
        ) : activeSection.key === "budget" ? (
          <BudgetOverview year={edition.year} />
        ) : activeSection.available ? (
          <div className={styles.welcome}>
            <p className="eyebrow">Vista general</p>
            <h2>La edición empieza aquí.</h2>
            <p>
              Este espacio reunirá la información de {edition.year}: sus cuentas, compras, comidas e
              inventario.
            </p>
          </div>
        ) : (
          <div className={styles.comingSoon}>
            <span className={styles.sectionNumber}>0{sections.indexOf(activeSection) + 1}</span>
            <div>
              <p className="eyebrow">En construcción</p>
              <h2>{activeSection.label}</h2>
              <p>Esta sección aparecerá aquí cuando avancemos con el siguiente módulo.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
