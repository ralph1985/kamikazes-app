import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getDatabase } from "@/infrastructure/database/client";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import CreateEditionForm from "@/app/panel/create-edition-form";
import MembersManager from "./members-manager";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const token = (await cookies()).get("kamikazes_session")?.value;
  if (!token) redirect("/login");

  let member: Awaited<ReturnType<typeof authenticateSession>>;
  let isAdmin: boolean;
  try {
    const database = getDatabase();
    member = await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });
    isAdmin = await createDatabaseGlobalAdminReader(database).isGlobalAdmin(member.memberId);
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

  if (member.mustChangePassword) redirect("/change-password");
  if (!isAdmin) notFound();

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
      </section>
      <MembersManager />
    </div>
  );
}
