"use client";

import { useEffect, useMemo, useState } from "react";
import { requestApi } from "@/shared/http/client";

export type Rate = { id: string; name: string; amount: string };
export type BudgetParticipant = {
  memberId: string;
  displayName: string;
  participating: boolean;
  rateId: string | null;
  rateName: string | null;
  rateAmount: string | null;
};
export type BudgetTransaction = {
  id: string;
  memberId: string;
  displayName: string;
  kind: "payment" | "refund";
  amount: string;
  occurredAt: string;
  method: "cash" | "bizum" | "transfer";
  notes: string | null;
};
export type BudgetBalance = {
  id: string;
  amount: string;
  concept: string;
  originYear: number | null;
  originEditionId: string | null;
};
export type BudgetMovement = {
  id: string;
  kind: "income" | "expense";
  amount: string;
  isPlanned: boolean;
  occurredAt: string;
  concept: string;
  notes: string | null;
};

export function useBudgetState(editionId: string) {
  const [rates, setRates] = useState<Rate[]>([]);
  const [participants, setParticipants] = useState<BudgetParticipant[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [balances, setBalances] = useState<BudgetBalance[]>([]);
  const [movements, setMovements] = useState<BudgetMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [budget, transactionData, balanceData, movementData] = await Promise.all([
          requestApi<{ rates: Rate[]; participants: BudgetParticipant[] }>(
            `/api/v1/editions/${editionId}/budget`,
          ),
          requestApi<{ transactions: BudgetTransaction[] }>(
            `/api/v1/editions/${editionId}/budget/transactions`,
          ),
          requestApi<{ balances: BudgetBalance[] }>(
            `/api/v1/editions/${editionId}/budget/balances`,
          ),
          requestApi<{ movements: BudgetMovement[] }>(
            `/api/v1/editions/${editionId}/budget/movements`,
          ),
        ]);
        if (!active) return;
        setRates(budget.rates);
        setParticipants(budget.participants);
        setTransactions(transactionData.transactions);
        setBalances(balanceData.balances);
        setMovements(movementData.movements);
        setError(null);
      } catch (loadError: unknown) {
        if (active)
          setError(
            loadError instanceof Error ? loadError.message : "No se pudo cargar el presupuesto",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
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
  const balanceTotal = balances.reduce((total, balance) => total + Number(balance.amount), 0);
  const plannedMovements = movements
    .filter((movement) => movement.isPlanned)
    .reduce((total, movement) => total + Number(movement.amount), 0);
  const actualMovements = movements
    .filter((movement) => !movement.isPlanned)
    .reduce((total, movement) => total + Number(movement.amount), 0);

  return {
    rates,
    setRates,
    participants,
    setParticipants,
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
    balanceTotal,
    plannedBalance: expected + balanceTotal + plannedMovements,
    actualBalance: paid + balanceTotal + actualMovements,
  };
}
