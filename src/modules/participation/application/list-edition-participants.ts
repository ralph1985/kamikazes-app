import type { EditionParticipant, EditionParticipantReader } from "./ports";

export function listEditionParticipants(
  editionId: string,
  reader: EditionParticipantReader,
): Promise<EditionParticipant[]> {
  return reader.list(editionId);
}
