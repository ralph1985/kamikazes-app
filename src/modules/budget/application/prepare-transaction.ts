import {
  canApplyBudgetTransaction,
  signedBudgetAmount,
  type BudgetTransactionKind,
} from "@/modules/budget/domain/transaction";

export type ExistingBudgetTransaction = { id: string; amount: string };

export function prepareBudgetTransaction(
  kind: BudgetTransactionKind,
  amount: number,
  transactionId: string | null,
  existing: ExistingBudgetTransaction[],
) {
  const signedAmount = signedBudgetAmount(kind, amount);
  const currentNet = existing.reduce(
    (total, item) => (item.id === transactionId ? total : total + Number(item.amount)),
    0,
  );
  return {
    signedAmount,
    currentNet,
    canApply: canApplyBudgetTransaction(currentNet, signedAmount),
  };
}
