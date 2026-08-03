import { and, asc, eq } from "drizzle-orm";
import type { getDatabase } from "@/infrastructure/database/client";
import { editionParticipants, members } from "@/infrastructure/database/schema";
import type { EditionParticipantReader } from "../application/ports";

type Database = ReturnType<typeof getDatabase>;

export function createDatabaseEditionParticipantReader(db: Database): EditionParticipantReader {
  return {
    async list(editionId) {
      const rows = await db
        .select({
          memberId: members.id,
          displayName: members.displayName,
          participantMemberId: editionParticipants.memberId,
        })
        .from(members)
        .leftJoin(
          editionParticipants,
          and(
            eq(editionParticipants.memberId, members.id),
            eq(editionParticipants.editionId, editionId),
          ),
        )
        .orderBy(asc(members.displayName));

      return rows.map((row) => ({
        memberId: row.memberId,
        displayName: row.displayName,
        participating: row.participantMemberId !== null,
      }));
    },
  };
}
