"use client";

import { useEffect, useMemo, useState } from "react";
import { CompactList, CompactListRow } from "@/components/lists/compact-list";
import {
  EditPanel,
  ListDetailLayout,
  ListState,
  MoneyCell,
} from "@/components/lists/list-patterns";
import { Modal } from "@/components/ui/modal";
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
  const [rateModalOpen, setRateModalOpen] = useState(false);

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
    setRateModalOpen(false);
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
              <button
                className="primaryAction"
                onClick={() => setRateModalOpen(true)}
                type="button"
              >
                Nueva tarifa
              </button>
            }
          >
            <EditPanel title="Tarifas configuradas">
              {rates.length > 0 ? (
                <CompactList>
                  {rates.map((rate) => (
                    <CompactListRow key={rate.id} meta={<MoneyCell amount={rate.amount} />}>
                      <strong>{rate.name}</strong>
                      <small>Disponible para asignar desde Participantes</small>
                    </CompactListRow>
                  ))}
                </CompactList>
              ) : (
                <ListState
                  description="Crea una tarifa sólo cuando estén definidos los importes de esta edición."
                  title="Sin tarifas"
                />
              )}
            </EditPanel>
          </ListDetailLayout>
          <Modal onClose={() => setRateModalOpen(false)} open={rateModalOpen} title="Nueva tarifa">
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
          </Modal>
        </>
      )}
    </div>
  );
}
