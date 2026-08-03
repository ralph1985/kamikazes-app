import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDatabase } from "@/infrastructure/database/client";
import { createDatabaseEditionReader } from "@/modules/editions/adapters/database-edition-reader";
import { listEditions } from "@/modules/editions/application/list-editions";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import styles from "./panel.module.css";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const token = (await cookies()).get("kamikazes_session")?.value;
  if (!token) redirect("/login");

  let member: Awaited<ReturnType<typeof authenticateSession>>;
  let editions: Awaited<ReturnType<typeof listEditions>>;
  try {
    const database = getDatabase();
    member = await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });
    editions = await listEditions(createDatabaseEditionReader(database));
  } catch (error) {
    if (error instanceof IdentityError) redirect("/login");

    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <p className="eyebrow">Espacio privado</p>
          <h1>No se han podido cargar las ediciones</h1>
          <p>Inténtalo de nuevo dentro de unos instantes.</p>
        </div>
      </div>
    );
  }

  if (member.mustChangePassword) redirect("/change-password");

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Espacio privado</p>
          <h1>Ediciones</h1>
          <p className={styles.intro}>Todo lo que organizamos, año a año.</p>
        </div>
        <div className={styles.headingActions}>
          <span className={styles.member}>Hola, {member.displayName}</span>
        </div>
      </div>
      <section aria-label="Ediciones de Kamikazes" className={styles.grid}>
        {editions.length ? (
          editions.map((edition) => (
            <Link
              className={styles.cardLink}
              href={`/panel/editions/${edition.id}`}
              key={edition.id}
            >
              <article className={styles.card}>
                <div className={styles.cardTopline}>
                  <span className={`${styles.badge} ${styles[edition.status]}`}>
                    {edition.status === "open" ? "Abierta" : "Cerrada"}
                  </span>
                  <span className={styles.year}>Edición</span>
                </div>
                <h2>{edition.year}</h2>
                <p>{edition.status === "open" ? "En curso" : "Sólo lectura"}</p>
                <span className={styles.cardAction}>Ver edición →</span>
              </article>
            </Link>
          ))
        ) : (
          <div className={styles.empty}>
            <h2>Aún no hay ediciones</h2>
            <p>Cuando creemos la primera, aparecerá aquí.</p>
          </div>
        )}
      </section>
    </div>
  );
}
