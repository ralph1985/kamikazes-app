import { assertEditionYear, type Edition } from "../domain/edition";

export interface EditionCreator {
  create(input: { id: string; year: number; memberId: string; now: Date }): Promise<Edition>;
}

export async function createEdition(
  input: { id: string; year: number; memberId: string },
  dependencies: { creator: EditionCreator; clock: { now(): Date } },
): Promise<Edition> {
  assertEditionYear(input.year);
  return dependencies.creator.create({ ...input, now: dependencies.clock.now() });
}
