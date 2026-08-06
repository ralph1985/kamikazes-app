export type BudgetTransactionKind = "payment" | "refund";

export function signedBudgetAmount(kind: BudgetTransactionKind, amount: number) {
  return kind === "refund" ? -amount : amount;
}

export function canApplyBudgetTransaction(currentNet: number, signedAmount: number) {
  return currentNet + signedAmount >= -0.000001;
}
