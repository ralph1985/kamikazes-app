"use client";

import { useEffect, useState } from "react";
import { CompactList, CompactListRow, EditIcon, IconButton } from "@/components/lists/compact-list";
import { Modal } from "@/components/ui/modal";
import styles from "./edition.module.css";

type Rate = { id: string; name: string; amount: string };
type Participant = {
  memberId: string;
  displayName: string;
  participating: boolean;
  rateId: string | null;
};
type BudgetParticipant = { memberId: string; rateId: string | null };

export default function ParticipantsOverview({
  editionId,
  readOnly,
  year,
}: Readonly<{ editionId: string; readOnly: boolean; year: number }>) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [draftParticipating, setDraftParticipating] = useState(false);
  const [draftRateId, setDraftRateId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/editions/${editionId}/participants`),
      fetch(`/api/v1/editions/${editionId}/budget`),
    ])
      .then(async ([participantsResponse, budgetResponse]) => {
        const participantsResult = (await participantsResponse.json()) as {
          data?: { memberId: string; displayName: string; participating: boolean }[];
          error?: { message: string };
        };
        const budgetResult = (await budgetResponse.json()) as {
          data?: { rates: Rate[]; participants: BudgetParticipant[] };
          error?: { message: string };
        };
        if (!participantsResponse.ok || !participantsResult.data)
          throw new Error(participantsResult.error?.message ?? "No se pudo cargar la lista");
        if (!budgetResponse.ok || !budgetResult.data)
          throw new Error(budgetResult.error?.message ?? "No se pudo cargar las tarifas");
        const ratesByMember = new Map(
          budgetResult.data.participants.map((item) => [item.memberId, item.rateId]),
        );
        setRates(budgetResult.data.rates);
        setParticipants(
          participantsResult.data.map((item) => ({
            ...item,
            rateId: ratesByMember.get(item.memberId) ?? null,
          })),
        );
      })
      .catch((loadError: unknown) =>
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la lista"),
      )
      .finally(() => setLoading(false));
  }, [editionId]);

  async function updateAnnual(memberId: string, participating: boolean) {
    setError(null);
    const response = await fetch(`/api/v1/editions/${editionId}/participants`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ memberId, participating }),
    });
    if (!response.ok) {
      const result = (await response.json()) as { error?: { message: string } };
      setError(result.error?.message ?? "No se pudo actualizar el participante");
      return false;
    }
    setParticipants((current) =>
      current.map((item) =>
        item.memberId === memberId
          ? { ...item, participating, rateId: participating ? item.rateId : null }
          : item,
      ),
    );
    return true;
  }

  async function updateRate(memberId: string, rateId: string | null) {
    setError(null);
    const response = await fetch(`/api/v1/editions/${editionId}/budget`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ memberId, rateId }),
    });
    if (!response.ok) {
      const result = (await response.json()) as { error?: { message: string } };
      setError(result.error?.message ?? "No se pudo asignar la tarifa");
      return false;
    }
    setParticipants((current) =>
      current.map((item) => (item.memberId === memberId ? { ...item, rateId } : item)),
    );
    return true;
  }

  function startEditing(memberId: string) {
    if (readOnly) return;
    const participant = participants.find((item) => item.memberId === memberId);
    if (!participant) return;
    setEditingMemberId(memberId);
    setDraftParticipating(participant.participating);
    setDraftRateId(participant.rateId);
    setError(null);
  }

  async function saveParticipant() {
    const participant = participants.find((item) => item.memberId === editingMemberId);
    if (!participant || !editingMemberId) return;
    if (participant.participating !== draftParticipating) {
      if (!(await updateAnnual(editingMemberId, draftParticipating))) return;
    }
    const nextRateId = draftParticipating ? draftRateId : null;
    if (participant.rateId !== nextRateId && !(await updateRate(editingMemberId, nextRateId)))
      return;
    setEditingMemberId(null);
  }

  const count = participants.filter((item) => item.participating).length;
  const editingParticipant = participants.find((item) => item.memberId === editingMemberId);
  return (
    <div className={styles.budgetLayout}>
      <div className={styles.budgetHeader}>
        <div>
          <p className="eyebrow">Organización de la edición</p>
          <h2>Participantes {year}</h2>
          <p>
            Participar en la edición implica participar en su presupuesto. El catering se gestionará
            aparte.
          </p>
        </div>
        <span className={styles.budgetState}>{count} participantes</span>
      </div>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className={styles.emptyModule}>
          <p>Cargando participantes…</p>
        </div>
      ) : (
        <CompactList>
          {participants.map((participant) => (
            <CompactListRow
              action={
                readOnly ? null : (
                  <IconButton
                    label={`Editar participación de ${participant.displayName}`}
                    onClick={() => startEditing(participant.memberId)}
                  >
                    <EditIcon />
                  </IconButton>
                )
              }
              key={participant.memberId}
              meta={participant.participating ? "Participa" : "No participa"}
            >
              <strong>{participant.displayName}</strong>
              <small>
                {participant.participating
                  ? participant.rateId
                    ? "Participa en edición y presupuesto"
                    : "Participa · tarifa sin asignar"
                  : "No participa este año"}
              </small>
            </CompactListRow>
          ))}
        </CompactList>
      )}
      <Modal
        onClose={() => setEditingMemberId(null)}
        open={editingParticipant !== undefined}
        title={
          editingParticipant ? `Editar ${editingParticipant.displayName}` : "Editar participación"
        }
      >
        {editingParticipant ? (
          <div className={styles.rateForm}>
            <label className={styles.checkboxLabel}>
              <input
                checked={draftParticipating}
                onChange={(event) => setDraftParticipating(event.target.checked)}
                type="checkbox"
              />{" "}
              Participa en la edición
            </label>
            <label>
              Tarifa
              <select
                disabled={!draftParticipating}
                onChange={(event) => setDraftRateId(event.target.value || null)}
                value={draftRateId ?? ""}
              >
                <option value="">Sin asignar</option>
                {rates.map((rate) => (
                  <option key={rate.id} value={rate.id}>
                    {rate.name}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => void saveParticipant()} type="button">
              Guardar cambios
            </button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
