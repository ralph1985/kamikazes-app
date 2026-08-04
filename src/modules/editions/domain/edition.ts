export type EditionStatus = "open" | "closed";

export type Edition = {
  id: string;
  year: number;
  status: EditionStatus;
};

export function assertEditionYear(year: number): void {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) {
    throw new Error("El año de la edición no es válido");
  }
}

export function canModifyEdition(status: EditionStatus): boolean {
  return status === "open";
}

export function assertEditionStatus(status: string): asserts status is EditionStatus {
  if (status !== "open" && status !== "closed") {
    throw new Error("El estado de la edición no es válido");
  }
}

export function transitionEditionStatus(
  currentStatus: EditionStatus,
  nextStatus: EditionStatus,
): EditionStatus {
  if (currentStatus === nextStatus) return currentStatus;
  return nextStatus;
}

export function canAdministratorReopenEdition(role: "admin" | "editor" | "reader"): boolean {
  return role === "admin";
}
