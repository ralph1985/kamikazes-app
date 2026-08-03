import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/infrastructure/database/client";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import CreateEditionForm from "@/app/panel/create-edition-form";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
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
    if (!isAdmin) redirect("/panel");

    return (
      <div className={styles.page}>
        <p className="eyebrow">Sólo administrador</p>
        <h1>Administración</h1>
        <p className={styles.intro}>Configuración global de Kamikazes.</p>
        <section className={styles.grid}>
          <article className={styles.card}>
            <p className={styles.cardEyebrow}>Ediciones</p>
            <h2>Crear una edición</h2>
            <p>Abre el año y prepara su organización.</p>
            <CreateEditionForm initialYear={new Date().getFullYear()} />
          </article>
          <article className={styles.card}>
            <p className={styles.cardEyebrow}>Próximamente</p>
            <h2>Miembros y permisos</h2>
            <p>La gestión de cuentas y roles se incorporará aquí.</p>
          </article>
        </section>
      </div>
    );
  } catch (error) {
    if (error instanceof IdentityError) redirect("/login");

    return (
      <div className={styles.page}>
        <p className="eyebrow">Administración</p>
        <h1>No se ha podido cargar</h1>
        <p className={styles.intro}>Inténtalo de nuevo dentro de unos instantes.</p>
      </div>
    );
  }
}
