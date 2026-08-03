export type EditionParticipant = {
  memberId: string;
  displayName: string;
  participating: boolean;
};

export interface EditionParticipantReader {
  list(editionId: string): Promise<EditionParticipant[]>;
}
