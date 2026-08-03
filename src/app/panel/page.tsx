import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/infrastructure/database/client";
import { createDatabaseEditionReader } from "@/modules/editions/adapters/database-edition-reader";
import { listEditions } from "@/modules/editions/application/list-editions";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import CreateEditionForm from "./create-edition-form";
import styles from "./panel.module.css";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const token = (await cookies()).get("kamikazes_session")?.value;
  if (!token) redirect("/login");

  try {
    const database = getDatabase();
    const member = await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });
    if (member.mustChangePassword) redirect("/change-password");

    const isAdmin = await createDatabaseGlobalAdminReader(database).isGlobalAdmin(member.memberId);
    const editions = await listEditions(createDatabaseEditionReader(database));

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
            {isAdmin ? <CreateEditionForm initialYear={new Date().getFullYear()} /> : null}
          </div>
        </div>
        <section aria-label="Ediciones de Kamikazes" className={styles.grid}>
          {editions.length ? (
            editions.map((edition) => (
              <article className={styles.card} id={`edition-${edition.id}`} key={edition.id}>
                <div className={styles.cardTopline}>
                  <span className={`${styles.badge} ${styles[edition.status]}`}>
                    {edition.status === "open" ? "Abierta" : "Cerrada"}
                  </span>
                  <span className={styles.year}>Edición</span>
                </div>
                <h2>{edition.year}</h2>
                <p>{edition.status === "open" ? "En curso" : "Sólo lectura"}</p>
              </article>
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
}
