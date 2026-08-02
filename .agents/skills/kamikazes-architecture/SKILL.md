---
name: kamikazes-architecture
description: Design or review Kamikazes technical architecture using the approved Next.js, Neon, Drizzle, REST, and hexagonal boundaries. Use for module boundaries, data access, permissions, API design, caching, PWA, or infrastructure decisions.
---

1. Read `AGENTS.md`, `docs/spec.md`, and the current roadmap hito.
2. Preserve the agreed boundary: browser -> Next.js API -> application/domain -> ports -> Neon or Vercel Blob adapters.
3. Keep Route Handlers thin and keep business rules out of React components and database repositories.
4. Enforce authorization on the server by area and edition; never treat frontend visibility as security.
5. Use PostgreSQL constraints, transactions, UUIDs, `timestamptz`, and `NUMERIC(12,2)` consistently.
6. Treat production as real data. Propose reversible migrations, explicit backups, and safe rollout steps.
7. For PWA/offline work, cache only public content and use an idempotent outbox for approved shopping/inventory operations.
8. Explain trade-offs and state whether a decision is MVP, deferred, or a later improvement.

Do not introduce a new provider, framework, or cross-module dependency without recording the decision in the SDD.
