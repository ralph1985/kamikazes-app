"use client";

import { useEffect, useMemo, useState } from "react";
import { CompactList, CompactListRow, EditIcon, IconButton } from "@/components/lists/compact-list";
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
type BudgetTransaction = {
  id: string;
  memberId: string;
  displayName: string;
  kind: "payment" | "refund";
  amount: string;
  occurredAt: string;
  method: "cash" | "bizum" | "transfer";
  notes: string | null;
};

export default function BudgetOverview({
  editionId,
  year,
}: Readonly<{ editionId: string; year: number }>) {
  const [rates, setRates] = useState<Rate[]>([]);
  const [participants, setParticipants] = useState<BudgetParticipant[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateName, setRateName] = useState("");
  const [rateAmount, setRateAmount] = useState("");
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<BudgetTransaction | null>(null);
  const [transactionMemberId, setTransactionMemberId] = useState("");
  const [transactionKind, setTransactionKind] = useState<"payment" | "refund">("payment");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [transactionMethod, setTransactionMethod] = useState<"cash" | "bizum" | "transfer">("cash");
  const [transactionNotes, setTransactionNotes] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/editions/${editionId}/budget`),
      fetch(`/api/v1/editions/${editionId}/budget/transactions`),
    ])
      .then(async ([budgetResponse, transactionsResponse]) => {
        const result = (await budgetResponse.json()) as {
          data?: { rates: Rate[]; participants: BudgetParticipant[] };
          error?: { message: string };
        };
        const transactionsResult = (await transactionsResponse.json()) as {
          data?: { transactions: BudgetTransaction[] };
          error?: { message: string };
        };
        if (!budgetResponse.ok || !result.data)
          throw new Error(result.error?.message ?? "No se pudo cargar el presupuesto");
        if (!transactionsResponse.ok || !transactionsResult.data)
          throw new Error(transactionsResult.error?.message ?? "No se pudieron cargar los pagos");
        setRates(result.data.rates);
        setParticipants(result.data.participants);
        setTransactions(transactionsResult.data.transactions);
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
  const paid = transactions.reduce((total, transaction) => total + Number(transaction.amount), 0);
  const pending = Math.max(expected - paid, 0);

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

  function openNewTransaction() {
    setEditingTransaction(null);
    setTransactionMemberId(
      participants.find((participant) => participant.participating)?.memberId ?? "",
    );
    setTransactionKind("payment");
    setTransactionAmount("");
    setTransactionDate(new Date().toISOString().slice(0, 10));
    setTransactionMethod("cash");
    setTransactionNotes("");
    setTransactionModalOpen(true);
  }

  function openTransaction(transaction: BudgetTransaction) {
    setEditingTransaction(transaction);
    setTransactionMemberId(transaction.memberId);
    setTransactionKind(transaction.kind);
    setTransactionAmount(String(Math.abs(Number(transaction.amount))));
    setTransactionDate(transaction.occurredAt.slice(0, 10));
    setTransactionMethod(transaction.method);
    setTransactionNotes(transaction.notes ?? "");
    setTransactionModalOpen(true);
  }

  async function saveTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/v1/editions/${editionId}/budget/transactions`, {
      method: editingTransaction ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: editingTransaction?.id,
        memberId: transactionMemberId,
        kind: transactionKind,
        amount: Number(transactionAmount),
        occurredAt: transactionDate,
        method: transactionMethod,
        notes: transactionNotes || null,
      }),
    });
    const result = (await response.json()) as {
      data?: BudgetTransaction;
      error?: { message: string };
    };
    if (!response.ok || !result.data) {
      setError(result.error?.message ?? "No se pudo guardar el movimiento");
      return;
    }
    const memberName =
      participants.find((participant) => participant.memberId === transactionMemberId)
        ?.displayName ?? "";
    const saved = { ...result.data, displayName: result.data.displayName || memberName };
    setTransactions((current) => {
      const next = editingTransaction
        ? current.map((transaction) => (transaction.id === saved.id ? saved : transaction))
        : [saved, ...current];
      return next.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    });
    setTransactionModalOpen(false);
  }

  const methodLabels = { cash: "Efectivo", bizum: "Bizum", transfer: "Transferencia" };

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
              <strong>
                <MoneyCell amount={paid} />
              </strong>
              <small>Pagos netos registrados</small>
            </article>
            <article className={styles.summaryCard}>
              <span>Pendiente</span>
              <strong>
                <MoneyCell amount={pending} />
              </strong>
              <small>Cuotas menos pagos netos</small>
            </article>
          </div>
          <ListDetailLayout
            aside={
              <div className={styles.budgetActions}>
                <button className="primaryAction" onClick={openNewTransaction} type="button">
                  Registrar pago
                </button>
                <button onClick={() => setRateModalOpen(true)} type="button">
                  Nueva tarifa
                </button>
              </div>
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
          <EditPanel title="Pagos y devoluciones">
            {transactions.length > 0 ? (
              <CompactList>
                {transactions.map((transaction) => (
                  <CompactListRow
                    action={
                      <IconButton
                        label={`Corregir movimiento de ${transaction.displayName}`}
                        onClick={() => openTransaction(transaction)}
                      >
                        <EditIcon />
                      </IconButton>
                    }
                    key={transaction.id}
                    meta={<MoneyCell amount={Number(transaction.amount)} />}
                  >
                    <strong>
                      {transaction.displayName} ·{" "}
                      {transaction.kind === "payment" ? "Pago" : "Devolución"}
                    </strong>
                    <small>
                      {transaction.occurredAt.slice(0, 10)} · {methodLabels[transaction.method]}
                    </small>
                  </CompactListRow>
                ))}
              </CompactList>
            ) : (
              <ListState
                description="Los pagos y devoluciones aparecerán aquí."
                title="Sin movimientos"
              />
            )}
          </EditPanel>
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
          <Modal
            onClose={() => setTransactionModalOpen(false)}
            open={transactionModalOpen}
            title={
              editingTransaction ? "Corregir pago o devolución" : "Registrar pago o devolución"
            }
          >
            <form className={styles.rateForm} onSubmit={(event) => void saveTransaction(event)}>
              <label>
                Miembro
                <select
                  onChange={(event) => setTransactionMemberId(event.target.value)}
                  required
                  value={transactionMemberId}
                >
                  <option value="">Selecciona un miembro</option>
                  {participants
                    .filter((participant) => participant.participating)
                    .map((participant) => (
                      <option key={participant.memberId} value={participant.memberId}>
                        {participant.displayName}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Tipo
                <select
                  onChange={(event) =>
                    setTransactionKind(event.target.value as "payment" | "refund")
                  }
                  value={transactionKind}
                >
                  <option value="payment">Pago</option>
                  <option value="refund">Devolución</option>
                </select>
              </label>
              <label>
                Importe
                <input
                  min="0.01"
                  onChange={(event) => setTransactionAmount(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={transactionAmount}
                />
              </label>
              <label>
                Fecha
                <input
                  onChange={(event) => setTransactionDate(event.target.value)}
                  required
                  type="date"
                  value={transactionDate}
                />
              </label>
              <label>
                Método
                <select
                  onChange={(event) =>
                    setTransactionMethod(event.target.value as "cash" | "bizum" | "transfer")
                  }
                  value={transactionMethod}
                >
                  <option value="cash">Efectivo</option>
                  <option value="bizum">Bizum</option>
                  <option value="transfer">Transferencia</option>
                </select>
              </label>
              <label>
                Notas
                <textarea
                  onChange={(event) => setTransactionNotes(event.target.value)}
                  value={transactionNotes}
                />
              </label>
              <button type="submit">Guardar</button>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
