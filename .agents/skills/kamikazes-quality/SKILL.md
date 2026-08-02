---
name: kamikazes-quality
description: Apply the Kamikazes TDD, BDD, security, and production-safety workflow. Use when implementing, reviewing, testing, or preparing a hito for release.
---

1. Read the relevant SDD section and write or update acceptance criteria before implementation.
2. Add unit/integration coverage with Vitest and behavior coverage with Playwright where applicable.
3. Validate API input with Zod and enforce critical invariants again in PostgreSQL.
4. Test authorization for anonymous, active member, reader, area editor, administrator, closed edition, and deactivated member cases.
5. Test audit records in the same transaction as mutations, including old/new values where required.
6. Test mobile layouts, PWA updates, offline queue retry, idempotency, and conflict handling for relevant features.
7. Run the available lint, typecheck, test, build, and end-to-end checks; report skipped checks and why.
8. Never use real credentials or real Excel files in fixtures. Use synthetic data.
9. Do not modify production data during tests. Production smoke checks must be read-only unless explicitly authorized.

A hito is not `Verificada` until automated checks pass and the user-visible behavior has been reviewed.
