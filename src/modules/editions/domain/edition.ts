export type EditionStatus = "open" | "closed";

export type Edition = {
  id: string;
  year: number;
  status: EditionStatus;
};

export function canModifyEdition(status: EditionStatus): boolean {
  return status === "open";
}

export function canAdministratorReopenEdition(role: "admin" | "editor" | "reader"): boolean {
  return role === "admin";
}
