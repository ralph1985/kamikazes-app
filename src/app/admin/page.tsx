import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getDatabase } from "@/infrastructure/database/client";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseEditionReader } from "@/modules/editions/adapters/database-edition-reader";
import { listEditions } from "@/modules/editions/application/list-editions";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import { InternalNav } from "@/components/navigation/internal-nav";
import CreateEditionForm from "@/app/panel/create-edition-form";
import EditionStatusManager from "./edition-status-manager";
import MembersManager from "./members-manager";
import PublicContentManager from "./public-content-manager";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const token = (await cookies()).get("kamikazes_session")?.value;
  if (!token) redirect("/login");

  let member: Awaited<ReturnType<typeof authenticateSession>>;
  let isAdmin: boolean;
  let editions: Awaited<ReturnType<typeof listEditions>>;
  try {
    const database = getDatabase();
    member = await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });
    isAdmin = await createDatabaseGlobalAdminReader(database).isGlobalAdmin(member.memberId);
    editions = await listEditions(createDatabaseEditionReader(database));
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

  const { section = "editions" } = await searchParams;
  const activeSection = section === "members" || section === "public" ? section : "editions";

  return (
    <div className={styles.page}>
      <p className="eyebrow">Sólo administrador</p>
      <h1>Administración</h1>
      <p className={styles.intro}>Configuración global de Kamikazes.</p>
      <InternalNav
        ariaLabel="Secciones de administración"
        items={[
          {
            href: "/admin?section=editions",
            label: "Ediciones",
            active: activeSection === "editions",
          },
          {
            href: "/admin?section=members",
            label: "Miembros",
            active: activeSection === "members",
          },
          {
            href: "/admin?section=public",
            label: "Contenido público",
            active: activeSection === "public",
          },
        ]}
      />
      {activeSection === "editions" ? (
        <section className={styles.grid}>
          <article className={styles.card}>
            <p className={styles.cardEyebrow}>Ediciones</p>
            <h2>Crear una edición</h2>
            <p>Abre el año y prepara su organización.</p>
            <CreateEditionForm initialYear={new Date().getFullYear()} />
            <EditionStatusManager initialEditions={editions} />
          </article>
        </section>
      ) : activeSection === "members" ? (
        <MembersManager />
      ) : (
        <PublicContentManager />
      )}
    </div>
  );
}
