export type EditionStatus = "open" | "closed";

export function canModifyEdition(status: EditionStatus): boolean {
  return status === "open";
}

export function canAdministratorReopenEdition(role: "admin" | "editor" | "reader"): boolean {
  return role === "admin";
}
