import {
  assertEditionStatus,
  transitionEditionStatus,
  type EditionStatus,
} from "../domain/edition";
import type { EditionStatusChanger, StoredEdition } from "./ports";

export async function changeEditionStatus(
  input: {
    id: string;
    year: number;
    currentStatus: string;
    status: string;
    memberId: string;
  },
  dependencies: { changer: EditionStatusChanger; clock: { now(): Date } },
): Promise<StoredEdition> {
  assertEditionStatus(input.currentStatus);
  assertEditionStatus(input.status);
  const status = transitionEditionStatus(
    input.currentStatus as EditionStatus,
    input.status as EditionStatus,
  );
  return dependencies.changer.change({
    ...input,
    currentStatus: input.currentStatus,
    status,
    now: dependencies.clock.now(),
  });
}
