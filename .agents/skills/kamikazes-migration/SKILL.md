---
name: kamikazes-migration
description: Plan, implement, or review the Excel-to-Neon migration for Kamikazes historical editions. Use for source mapping, dry runs, duplicate members, import reports, idempotency, or migration safety.
---

1. Read `docs/spec.md`, the migration section of `docs/roadmap.md`, and the available source files without copying them into Git.
2. Keep original Excel files and private member correspondence files outside the repository.
3. Start with a no-write analysis report for missing fields, duplicate candidates, invalid values, and conflicts.
4. Import editions first, then records linked to their edition; process and review one edition at a time.
5. Make the importer idempotent and safe to rerun. A serious conflict blocks only its record; the report must identify it.
6. Resolve historical member names through a private mapping to immutable member UUIDs; never merge automatically.
7. Treat missing optional fields as empty and missing required fields as blocking for that record.
8. Import business data only, not the old Excel change history. Historical editions enter closed.
9. Never run a write import against production without explicit authorization and a verified database backup.

Report source counts, imported counts, skipped records, unresolved conflicts, and the review needed for each edition.
