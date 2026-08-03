"use client";

import { useEffect, useMemo, useState } from "react";
import { CompactList, CompactListRow } from "@/components/lists/compact-list";
import {
  EditPanel,
  ListDetailLayout,
  ListState,
  MoneyCell,
} from "@/components/lists/list-patterns";
import styles from "./edition.module.css";

type Rate = { id: string; name: string; amount: string };
type BudgetParticipant = {
  memberId: string;
  displayName: string;
  participating: boolean;
  rateId: string | null;
  rateName: string | null;
  rateAmount: string | null;
};

export default function BudgetOverview({
  editionId,
  year,
}: Readonly<{ editionId: string; year: number }>) {
  const [rates, setRates] = useState<Rate[]>([]);
  const [participants, setParticipants] = useState<BudgetParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateName, setRateName] = useState("");
  const [rateAmount, setRateAmount] = useState("");

  useEffect(() => {
    fetch(`/api/v1/editions/${editionId}/budget`)
      .then(async (response) => {
        const result = (await response.json()) as {
          data?: { rates: Rate[]; participants: BudgetParticipant[] };
          error?: { message: string };
        };
        if (!response.ok || !result.data)
          throw new Error(result.error?.message ?? "No se pudo cargar el presupuesto");
        setRates(result.data.rates);
        setParticipants(result.data.participants);
      })
      .catch((loadError: unknown) =>
        setError(
          loadError instanceof Error ? loadError.message : "No se pudo cargar el presupuesto",
        ),
      )
      .finally(() => setLoading(false));
  }, [editionId]);

  const expected = useMemo(
    () =>
      participants.reduce(
        (total, participant) =>
          participant.participating && participant.rateAmount
            ? total + Number(participant.rateAmount)
            : total,
        0,
      ),
    [participants],
  );
  const participatingCount = participants.filter((participant) => participant.participating).length;

  async function updateParticipant(
    memberId: string,
    participating: boolean,
    rateId: string | null,
  ) {
    setError(null);
    const response = await fetch(`/api/v1/editions/${editionId}/budget`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ memberId, participating, rateId }),
    });
    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok) {
      setError(result.error?.message ?? "No se pudo actualizar la participación económica");
      return;
    }
    const rate = rates.find((item) => item.id === rateId);
    setParticipants((current) =>
      current.map((item) =>
        item.memberId === memberId
          ? {
              ...item,
              participating,
              rateId: participating ? rateId : null,
              rateName: participating ? (rate?.name ?? null) : null,
              rateAmount: participating ? (rate?.amount ?? null) : null,
            }
          : item,
      ),
    );
  }

  async function createRate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/v1/editions/${editionId}/budget`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: rateName, amount: Number(rateAmount) }),
    });
    const result = (await response.json()) as { data?: Rate; error?: { message: string } };
    if (!response.ok || !result.data) {
      setError(result.error?.message ?? "No se pudo crear la tarifa");
      return;
    }
    setRates((current) =>
      [...current, result.data!].sort((a, b) => Number(a.amount) - Number(b.amount)),
    );
    setRateName("");
    setRateAmount("");
  }

  return (
    <div className={styles.budgetLayout}>
      <div className={styles.budgetHeader}>
        <div>
          <p className="eyebrow">Gestión económica</p>
          <h2>Presupuesto {year}</h2>
          <p>Participación económica y tarifas de la edición.</p>
        </div>
        <span className={styles.budgetState}>{participatingCount} participantes</span>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <ListState description="Cargando tarifas y participantes." title="Cargando presupuesto" />
      ) : (
        <>
          <div className={styles.summaryGrid}>
            <article className={styles.summaryCard}>
              <span>Cuotas previstas</span>
              <strong>
                <MoneyCell amount={expected} />
              </strong>
              <small>{participatingCount} participantes económicos</small>
            </article>
            <article className={styles.summaryCard}>
              <span>Tarifas</span>
              <strong>{rates.length}</strong>
              <small>Configuradas en {year}</small>
            </article>
            <article className={styles.summaryCard}>
              <span>Pagos</span>
              <strong>—</strong>
              <small>Se añadirá en el siguiente bloque</small>
            </article>
          </div>
          <ListDetailLayout
            aside={
              <EditPanel title="Nueva tarifa">
                <form className={styles.rateForm} onSubmit={(event) => void createRate(event)}>
                  <label>
                    Nombre
                    <input
                      onChange={(event) => setRateName(event.target.value)}
                      required
                      value={rateName}
                    />
                  </label>
                  <label>
                    Importe
                    <input
                      min="0"
                      onChange={(event) => setRateAmount(event.target.value)}
                      required
                      step="0.01"
                      type="number"
                      value={rateAmount}
                    />
                  </label>
                  <button type="submit">Crear tarifa</button>
                </form>
                {rates.length > 0 ? (
                  <div className={styles.rateList}>
                    {rates.map((rate) => (
                      <div key={rate.id}>
                        <span>{rate.name}</span>
                        <strong>
                          <MoneyCell amount={rate.amount} />
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <small className={styles.muted}>Todavía no hay tarifas.</small>
                )}
              </EditPanel>
            }
          >
            <EditPanel title="Participación económica">
              <CompactList>
                {participants.map((participant) => (
                  <CompactListRow
                    action={
                      <input
                        aria-label={`Incluir a ${participant.displayName} en el presupuesto`}
                        checked={participant.participating}
                        onChange={(event) =>
                          void updateParticipant(
                            participant.memberId,
                            event.target.checked,
                            participant.rateId,
                          )
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
                          void updateParticipant(
                            participant.memberId,
                            true,
                            event.target.value || null,
                          )
                        }
                        value={participant.rateId ?? ""}
                      >
                        <option value="">Sin tarifa</option>
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
                        ? (participant.rateName ?? "Participa · sin tarifa")
                        : "No participa económicamente"}
                    </small>
                  </CompactListRow>
                ))}
              </CompactList>
            </EditPanel>
          </ListDetailLayout>
        </>
      )}
    </div>
  );
}
