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
import styles from "./admin.module.css";

type Member = {
  id: string;
  displayName: string;
  username: string;
  accountActive: boolean;
  mustChangePassword: boolean;
  roles: SharedRole[];
};

export default function MembersManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ displayName: "", username: "", accountActive: true });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/admin/members")
      .then(async (response) => {
        const result = (await response.json()) as { data?: Member[]; error?: { message: string } };
        if (!response.ok || !result.data)
          throw new Error(result.error?.message ?? "No se pudieron cargar los miembros");
        setMembers(result.data);
      })
      .catch((error: unknown) =>
        setMessage(error instanceof Error ? error.message : "No se pudieron cargar los miembros"),
      );
  }, []);

  function startEditing(member: Member) {
    setEditing(member.id);
    setDraft({
      displayName: member.displayName,
      username: member.username,
      accountActive: member.accountActive,
    });
    setMessage(null);
  }

  async function save(memberId: string) {
    setMessage(null);
    const response = await fetch(`/api/v1/admin/members/${memberId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
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
      <CompactList>
        {members.map((member) =>
          editing === member.id ? (
            <div className={styles.memberEditor} key={member.id}>
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
                  onChange={(event) => setDraft({ ...draft, accountActive: event.target.checked })}
                  type="checkbox"
                />{" "}
                Cuenta activa
              </label>
              <div className={styles.memberActions}>
                <button onClick={() => void save(member.id)} type="button">
                  Guardar
                </button>
                <button onClick={() => setEditing(null)} type="button">
                  Cancelar
                </button>
              </div>
            </div>
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
    </section>
  );
}
