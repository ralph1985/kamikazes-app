import type { Edition, EditionStatus } from "../domain/edition";

export type StoredEdition = Edition & { status: EditionStatus };

export interface EditionReader {
  list(): Promise<StoredEdition[]>;
}
