import { asc, eq } from "drizzle-orm";
import type { getDatabase } from "@/infrastructure/database/client";
import { publicSections, publicSocialLinks } from "@/infrastructure/database/schema";
import type { PublicContentReader } from "../application/ports";

type Database = ReturnType<typeof getDatabase>;

export function createDatabasePublicContentReader(db: Database): PublicContentReader {
  return {
    async listSections(input) {
      const query = db.select().from(publicSections);
      const rows = input.visibleOnly
        ? await query
            .where(eq(publicSections.isVisible, true))
            .orderBy(asc(publicSections.sortOrder))
        : await query.orderBy(asc(publicSections.sortOrder));
      return rows;
    },
    async listSocialLinks(input) {
      const query = db.select().from(publicSocialLinks);
      const rows = input.activeOnly
        ? await query
            .where(eq(publicSocialLinks.isActive, true))
            .orderBy(asc(publicSocialLinks.sortOrder))
        : await query.orderBy(asc(publicSocialLinks.sortOrder));
      return rows;
    },
  };
}
