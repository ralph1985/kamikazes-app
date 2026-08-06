"use client";

import { useState } from "react";
import { CompactList, CompactListRow, EditIcon, IconButton } from "@/components/lists/compact-list";
import {
  EditPanel,
  ListDetailLayout,
  ListState,
  MoneyCell,
} from "@/components/lists/list-patterns";
import { BalanceForm, MovementForm, RateForm, TransactionForm } from "./budget-forms";
import { useBudgetState } from "./use-budget-state";
import styles from "./edition.module.css";

type Rate = { id: string; name: string; amount: string };
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
type BudgetBalance = {
  id: string;
  amount: string;
  concept: string;
  originYear: number | null;
  originEditionId: string | null;
};
type BudgetMovement = {
  id: string;
  kind: "income" | "expense";
  amount: string;
  isPlanned: boolean;
  occurredAt: string;
  concept: string;
  notes: string | null;
};

export default function BudgetOverview({
  editionId,
  readOnly,
  year,
}: Readonly<{ editionId: string; readOnly: boolean; year: number }>) {
  const {
    rates,
    setRates,
    participants,
    transactions,
    setTransactions,
    balances,
    setBalances,
    movements,
    setMovements,
    loading,
    error,
    setError,
    expected,
    participatingCount,
    paid,
    pending,
    plannedBalance,
    actualBalance,
  } = useBudgetState(editionId);
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
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [editingBalance, setEditingBalance] = useState<BudgetBalance | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceConcept, setBalanceConcept] = useState("");
  const [balanceOriginYear, setBalanceOriginYear] = useState("");
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<BudgetMovement | null>(null);
  const [movementKind, setMovementKind] = useState<"income" | "expense">("expense");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementPlanned, setMovementPlanned] = useState(true);
  const [movementDate, setMovementDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [movementConcept, setMovementConcept] = useState("");
  const [movementNotes, setMovementNotes] = useState("");

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
    if (readOnly) return;
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
    if (readOnly) return;
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

  function openBalance(balance?: BudgetBalance) {
    if (readOnly) return;
    setEditingBalance(balance ?? null);
    setBalanceAmount(balance ? String(Number(balance.amount)) : "");
    setBalanceConcept(balance?.concept ?? "");
    setBalanceOriginYear(balance?.originYear ? String(balance.originYear) : "");
    setBalanceModalOpen(true);
  }

  async function saveBalance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/v1/editions/${editionId}/budget/balances`, {
      method: editingBalance ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: editingBalance?.id,
        amount: Number(balanceAmount),
        concept: balanceConcept,
        originYear: balanceOriginYear ? Number(balanceOriginYear) : null,
        originEditionId: null,
      }),
    });
    const result = (await response.json()) as { data?: BudgetBalance; error?: { message: string } };
    if (!response.ok || !result.data) {
      setError(result.error?.message ?? "No se pudo guardar el saldo");
      return;
    }
    setBalances((current) =>
      editingBalance
        ? current.map((balance) => (balance.id === result.data!.id ? result.data! : balance))
        : [...current, result.data!],
    );
    setBalanceModalOpen(false);
  }

  async function removeBalance(id: string) {
    if (readOnly) return;
    if (!window.confirm("¿Quieres eliminar este saldo?")) return;
    const response = await fetch(`/api/v1/editions/${editionId}/budget/balances`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) setBalances((current) => current.filter((balance) => balance.id !== id));
    else setError("No se pudo eliminar el saldo");
  }

  function openMovement(movement?: BudgetMovement) {
    if (readOnly) return;
    setEditingMovement(movement ?? null);
    setMovementKind(movement?.kind ?? "expense");
    setMovementAmount(movement ? String(Math.abs(Number(movement.amount))) : "");
    setMovementPlanned(movement?.isPlanned ?? true);
    setMovementDate(movement?.occurredAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setMovementConcept(movement?.concept ?? "");
    setMovementNotes(movement?.notes ?? "");
    setMovementModalOpen(true);
  }

  async function saveMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/v1/editions/${editionId}/budget/movements`, {
      method: editingMovement ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: editingMovement?.id,
        kind: movementKind,
        amount: Number(movementAmount),
        isPlanned: movementPlanned,
        occurredAt: movementDate,
        concept: movementConcept,
        notes: movementNotes || null,
      }),
    });
    const result = (await response.json()) as {
      data?: BudgetMovement;
      error?: { message: string };
    };
    if (!response.ok || !result.data) {
      setError(result.error?.message ?? "No se pudo guardar el movimiento");
      return;
    }
    setMovements((current) =>
      editingMovement
        ? current.map((movement) => (movement.id === result.data!.id ? result.data! : movement))
        : [result.data!, ...current],
    );
    setMovementModalOpen(false);
  }

  async function removeMovement(id: string) {
    if (readOnly) return;
    if (!window.confirm("¿Quieres eliminar este movimiento?")) return;
    const response = await fetch(`/api/v1/editions/${editionId}/budget/movements`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) setMovements((current) => current.filter((movement) => movement.id !== id));
    else setError("No se pudo eliminar el movimiento");
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
            <article className={styles.summaryCard}>
              <span>Saldo previsto</span>
              <strong>
                <MoneyCell amount={plannedBalance} />
              </strong>
              <small>Cuotas, saldos y movimientos previstos</small>
            </article>
            <article className={styles.summaryCard}>
              <span>Saldo real</span>
              <strong>
                <MoneyCell amount={actualBalance} />
              </strong>
              <small>Pagos, saldos y movimientos reales</small>
            </article>
          </div>
          <ListDetailLayout
            aside={
              <div className={styles.budgetActions}>
                <button
                  className="primaryAction"
                  disabled={readOnly}
                  onClick={openNewTransaction}
                  type="button"
                >
                  Registrar pago
                </button>
                <button disabled={readOnly} onClick={() => setRateModalOpen(true)} type="button">
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
                      readOnly ? null : (
                        <IconButton
                          label={`Corregir movimiento de ${transaction.displayName}`}
                          onClick={() => openTransaction(transaction)}
                        >
                          <EditIcon />
                        </IconButton>
                      )
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
          <EditPanel title="Saldos iniciales y trasladables">
            <div className={styles.panelToolbar}>
              <button disabled={readOnly} onClick={() => openBalance()} type="button">
                Añadir saldo
              </button>
            </div>
            {balances.length > 0 ? (
              <CompactList>
                {balances.map((balance) => (
                  <CompactListRow
                    action={
                      readOnly ? null : (
                        <span className={styles.rowActions}>
                          <IconButton
                            label={`Editar saldo ${balance.concept}`}
                            onClick={() => openBalance(balance)}
                          >
                            <EditIcon />
                          </IconButton>
                          <button onClick={() => void removeBalance(balance.id)} type="button">
                            Eliminar
                          </button>
                        </span>
                      )
                    }
                    key={balance.id}
                    meta={<MoneyCell amount={Number(balance.amount)} />}
                  >
                    <strong>{balance.concept}</strong>
                    <small>
                      {balance.originYear
                        ? `Origen: ${balance.originYear}`
                        : "Saldo de esta edición"}
                    </small>
                  </CompactListRow>
                ))}
              </CompactList>
            ) : (
              <ListState
                description="Añade el saldo sobrante o inicial de la edición."
                title="Sin saldos"
              />
            )}
          </EditPanel>
          <EditPanel title="Movimientos previstos y reales">
            <div className={styles.panelToolbar}>
              <button disabled={readOnly} onClick={() => openMovement()} type="button">
                Añadir movimiento
              </button>
            </div>
            {movements.length > 0 ? (
              <CompactList>
                {movements.map((movement) => (
                  <CompactListRow
                    action={
                      readOnly ? null : (
                        <span className={styles.rowActions}>
                          <IconButton
                            label={`Editar ${movement.concept}`}
                            onClick={() => openMovement(movement)}
                          >
                            <EditIcon />
                          </IconButton>
                          <button onClick={() => void removeMovement(movement.id)} type="button">
                            Eliminar
                          </button>
                        </span>
                      )
                    }
                    key={movement.id}
                    meta={<MoneyCell amount={Number(movement.amount)} />}
                  >
                    <strong>{movement.concept}</strong>
                    <small>
                      {movement.isPlanned ? "Previsto" : "Real"} ·{" "}
                      {movement.occurredAt.slice(0, 10)}
                    </small>
                  </CompactListRow>
                ))}
              </CompactList>
            ) : (
              <ListState
                description="Los ingresos y gastos manuales aparecerán aquí."
                title="Sin movimientos"
              />
            )}
          </EditPanel>
          <RateForm
            amount={rateAmount}
            name={rateName}
            onAmountChange={setRateAmount}
            onClose={() => setRateModalOpen(false)}
            onNameChange={setRateName}
            onSubmit={(event) => void createRate(event)}
            open={rateModalOpen}
          />
          <TransactionForm
            amount={transactionAmount}
            date={transactionDate}
            editing={editingTransaction !== null}
            kind={transactionKind}
            memberId={transactionMemberId}
            notes={transactionNotes}
            onAmountChange={setTransactionAmount}
            onClose={() => setTransactionModalOpen(false)}
            onDateChange={setTransactionDate}
            onKindChange={setTransactionKind}
            onMemberChange={setTransactionMemberId}
            onMethodChange={setTransactionMethod}
            onNotesChange={setTransactionNotes}
            onSubmit={(event) => void saveTransaction(event)}
            open={transactionModalOpen}
            participants={participants
              .filter((participant) => participant.participating)
              .map(({ memberId, displayName }) => ({ memberId, displayName }))}
            method={transactionMethod}
          />
          <BalanceForm
            amount={balanceAmount}
            concept={balanceConcept}
            editing={editingBalance !== null}
            onAmountChange={setBalanceAmount}
            onClose={() => setBalanceModalOpen(false)}
            onConceptChange={setBalanceConcept}
            onOriginYearChange={setBalanceOriginYear}
            onSubmit={(event) => void saveBalance(event)}
            open={balanceModalOpen}
            originYear={balanceOriginYear}
          />
          <MovementForm
            amount={movementAmount}
            concept={movementConcept}
            date={movementDate}
            editing={editingMovement !== null}
            kind={movementKind}
            notes={movementNotes}
            onAmountChange={setMovementAmount}
            onClose={() => setMovementModalOpen(false)}
            onConceptChange={setMovementConcept}
            onDateChange={setMovementDate}
            onKindChange={setMovementKind}
            onNotesChange={setMovementNotes}
            onPlannedChange={setMovementPlanned}
            onSubmit={(event) => void saveMovement(event)}
            open={movementModalOpen}
            planned={movementPlanned}
          />
        </>
      )}
    </div>
  );
}
