"use client";

import { useEffect, useState } from "react";
import {
  CompactList,
  CompactListRow,
  EditIcon,
  IconButton,
  RoleBadge,
  StatusBadge,
  type SharedRole,
} from "@/components/lists/compact-list";
import { EditPanel, ListState, ListToolbar } from "@/components/lists/list-patterns";
import styles from "./admin.module.css";

type Member = {
  id: string;
  displayName: string;
  username: string;
  accountActive: boolean;
  mustChangePassword: boolean;
  roles: SharedRole[];
  assignments: RoleAssignment[];
  protectedAdmin: boolean;
};

type RoleAssignment = { memberId: string; editionId: string | null; area: string; role: string };
type AdminEdition = { id: string; year: number; status: string };
const areaLabels: Record<string, string> = {
  editions: "Ediciones",
  budget: "Presupuesto",
  shopping: "Compras e inventario",
  catering: "Catering",
};

export default function MembersManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ displayName: "", username: "", accountActive: true });
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [availableEditions, setAvailableEditions] = useState<AdminEdition[]>([]);
  const [draftAssignments, setDraftAssignments] = useState<RoleAssignment[]>([]);

  useEffect(() => {
    Promise.all([fetch("/api/v1/admin/members"), fetch("/api/v1/admin/roles")])
      .then(async ([membersResponse, rolesResponse]) => {
        const membersResult = (await membersResponse.json()) as {
          data?: Member[];
          error?: { message: string };
        };
        const rolesResult = (await rolesResponse.json()) as {
          data?: { editions: AdminEdition[] };
          error?: { message: string };
        };
        if (!membersResponse.ok || !membersResult.data)
          throw new Error(membersResult.error?.message ?? "No se pudieron cargar los miembros");
        if (!rolesResponse.ok || !rolesResult.data)
          throw new Error(rolesResult.error?.message ?? "No se pudieron cargar los permisos");
        setMembers(membersResult.data);
        setAvailableEditions(rolesResult.data.editions);
      })
      .catch((error: unknown) =>
        setMessage(error instanceof Error ? error.message : "No se pudieron cargar los miembros"),
      )
      .finally(() => setLoading(false));
  }, []);

  function startEditing(member: Member) {
    setEditing(member.id);
    setDraft({
      displayName: member.displayName,
      username: member.username,
      accountActive: member.accountActive,
    });
    setDraftAssignments(member.assignments);
    setMessage(null);
  }

  function hasAssignment(area: string, editionId: string | null) {
    return draftAssignments.some(
      (assignment) =>
        assignment.area === area &&
        assignment.editionId === editionId &&
        assignment.role === "editor",
    );
  }

  function isGlobalAdmin() {
    return draftAssignments.some(
      (assignment) =>
        assignment.area === "global" &&
        assignment.editionId === null &&
        assignment.role === "admin",
    );
  }

  function toggleAssignment(area: string, editionId: string | null, enabled: boolean) {
    setDraftAssignments((current) => {
      const filtered = current.filter(
        (assignment) => !(assignment.area === area && assignment.editionId === editionId),
      );
      return enabled
        ? [
            ...filtered,
            { memberId: "", area, editionId, role: area === "global" ? "admin" : "editor" },
          ]
        : filtered;
    });
  }

  const filteredMembers = members.filter((member) =>
    `${member.displayName} ${member.username}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );

  async function save(memberId: string) {
    setMessage(null);
    const response = await fetch(`/api/v1/admin/members/${memberId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...draft,
        assignments: draftAssignments.map(({ editionId, area, role }) => ({
          editionId,
          area,
          role,
        })),
      }),
    });
    const result = (await response.json()) as { data?: Member; error?: { message: string } };
    if (!response.ok || !result.data) {
      setMessage(result.error?.message ?? "No se pudo guardar el miembro");
      return;
    }
    setMembers((current) =>
      current.map((member) => (member.id === memberId ? { ...member, ...result.data } : member)),
    );
    setEditing(null);
    setMessage("Cambios guardados.");
  }

  return (
    <section className={styles.membersCard}>
      <div className={styles.membersHeader}>
        <div>
          <p className={styles.cardEyebrow}>Identidad</p>
          <h2>Miembros y cuentas</h2>
          <p>Consulta y corrige nombres, usuarios y estado de acceso.</p>
        </div>
        <span className={styles.memberCount}>{members.length}</span>
      </div>
      {message ? (
        <p role="status" className={styles.message}>
          {message}
        </p>
      ) : null}
      <ListToolbar
        count={filteredMembers.length}
        onQueryChange={setQuery}
        placeholder="Buscar miembros"
        query={query}
      />
      {loading ? (
        <ListState description="Cargando miembros y cuentas." title="Cargando" />
      ) : filteredMembers.length === 0 ? (
        <ListState
          description={query ? "Prueba con otro nombre o usuario." : "Todavía no hay miembros."}
          title={query ? "Sin resultados" : "Lista vacía"}
        />
      ) : (
        <CompactList>
          {filteredMembers.map((member) =>
            editing === member.id ? (
              <EditPanel key={member.id} title={`Editar ${member.displayName}`}>
                <label>
                  Nombre visible
                  <input
                    value={draft.displayName}
                    onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
                  />
                </label>
                <label>
                  Usuario
                  <input
                    value={draft.username}
                    onChange={(event) => setDraft({ ...draft, username: event.target.value })}
                  />
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    checked={draft.accountActive}
                    onChange={(event) =>
                      setDraft({ ...draft, accountActive: event.target.checked })
                    }
                    type="checkbox"
                  />{" "}
                  Cuenta activa
                </label>
                <fieldset className={styles.rolesFieldset}>
                  <legend>Permisos</legend>
                  <label className={styles.checkboxLabel}>
                    <input
                      checked={isGlobalAdmin()}
                      disabled={member.protectedAdmin}
                      onChange={(event) => toggleAssignment("global", null, event.target.checked)}
                      type="checkbox"
                    />{" "}
                    Administrador global{member.protectedAdmin ? " · protegido" : ""}
                  </label>
                  {availableEditions.map((edition) => (
                    <div className={styles.editionRoles} key={edition.id}>
                      <strong>{edition.year}</strong>
                      {Object.entries(areaLabels).map(([area, label]) => (
                        <label className={styles.checkboxLabel} key={area}>
                          <input
                            checked={hasAssignment(area, edition.id)}
                            onChange={(event) =>
                              toggleAssignment(area, edition.id, event.target.checked)
                            }
                            type="checkbox"
                          />{" "}
                          Editor de {label.toLowerCase()}
                        </label>
                      ))}
                    </div>
                  ))}
                </fieldset>
                <div className={styles.memberActions}>
                  <button onClick={() => void save(member.id)} type="button">
                    Guardar
                  </button>
                  <button onClick={() => setEditing(null)} type="button">
                    Cancelar
                  </button>
                </div>
              </EditPanel>
            ) : (
              <CompactListRow
                action={
                  <IconButton
                    label={`Editar a ${member.displayName}`}
                    onClick={() => startEditing(member)}
                  >
                    <EditIcon />
                  </IconButton>
                }
                key={member.id}
                meta={
                  <>
                    {member.roles.map((role) => (
                      <RoleBadge key={role} role={role} />
                    ))}
                    <StatusBadge active={member.accountActive} />
                  </>
                }
              >
                <strong>{member.displayName}</strong>
                <small>{member.username}</small>
              </CompactListRow>
            ),
          )}
        </CompactList>
      )}
    </section>
  );
}
