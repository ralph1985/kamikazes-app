"use client";

import { useEffect, useState } from "react";
import { CompactList, CompactListRow } from "@/components/lists/compact-list";
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
  year,
}: Readonly<{ editionId: string; year: number }>) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      return;
    }
    setParticipants((current) =>
      current.map((item) =>
        item.memberId === memberId
          ? { ...item, participating, rateId: participating ? item.rateId : null }
          : item,
      ),
    );
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
      return;
    }
    setParticipants((current) =>
      current.map((item) => (item.memberId === memberId ? { ...item, rateId } : item)),
    );
  }

  const count = participants.filter((item) => item.participating).length;
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
                <input
                  aria-label={`Incluir a ${participant.displayName} en la edición`}
                  checked={participant.participating}
                  onChange={(event) =>
                    void updateAnnual(participant.memberId, event.target.checked)
                  }
                  type="checkbox"
                />
              }
              key={participant.memberId}
              meta={
                <select
                  aria-label={`Tarifa de ${participant.displayName}`}
                  disabled={!participant.participating}
                  onChange={(event) =>
                    void updateRate(participant.memberId, event.target.value || null)
                  }
                  value={participant.rateId ?? ""}
                >
                  <option value="">Sin asignar</option>
                  {rates.map((rate) => (
                    <option key={rate.id} value={rate.id}>
                      {rate.name}
                    </option>
                  ))}
                </select>
              }
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
    </div>
  );
}
