"use client";

import { useEffect, useState } from "react";
import styles from "./edition.module.css";

type Participant = {
  memberId: string;
  displayName: string;
  participating: boolean;
};

export default function ParticipantsOverview({
  editionId,
  year,
}: Readonly<{ editionId: string; year: number }>) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/editions/${editionId}/participants`)
      .then(async (response) => {
        const result = (await response.json()) as {
          data?: Participant[];
          error?: { message: string };
        };
        if (!response.ok || !result.data)
          throw new Error(result.error?.message ?? "No se pudo cargar la lista");
        setParticipants(result.data);
      })
      .catch((loadError: unknown) =>
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la lista"),
      );
  }, [editionId]);

  async function toggleParticipant(memberId: string, participating: boolean) {
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
      current.map((participant) =>
        participant.memberId === memberId ? { ...participant, participating } : participant,
      ),
    );
  }

  const participatingCount = participants.filter((participant) => participant.participating).length;

  return (
    <div className={styles.budgetLayout}>
      <div className={styles.budgetHeader}>
        <div>
          <p className="eyebrow">Organización de la edición</p>
          <h2>Participantes {year}</h2>
          <p>
            Personas vinculadas a esta edición. La participación económica se configurará después.
          </p>
        </div>
        <span className={styles.budgetState}>{participatingCount} participan</span>
      </div>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <div className={styles.participantList}>
        {participants.map((participant) => (
          <label className={styles.participantRow} key={participant.memberId}>
            <span>
              <strong>{participant.displayName}</strong>
              <small>
                {participant.participating
                  ? "Forma parte de esta edición"
                  : "No participa este año"}
              </small>
            </span>
            <input
              aria-label={`Incluir a ${participant.displayName}`}
              checked={participant.participating}
              onChange={(event) =>
                void toggleParticipant(participant.memberId, event.target.checked)
              }
              type="checkbox"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
