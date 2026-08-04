import type { Edition, EditionStatus } from "../domain/edition";

export type StoredEdition = Edition & { status: EditionStatus };

export interface EditionReader {
  list(): Promise<StoredEdition[]>;
}

export interface EditionStatusChanger {
  change(input: {
    id: string;
    year: number;
    currentStatus: EditionStatus;
    status: EditionStatus;
    memberId: string;
    now: Date;
  }): Promise<StoredEdition>;
}
