---
name: kamikazes-sdd
description: Maintain the Kamikazes product specification and turn approved decisions into testable requirements. Use when refining requirements, resolving pending decisions, updating the SDD, or planning acceptance criteria.
---

1. Read `docs/spec.md`, `docs/roadmap.md`, and `docs/project-memory.md` before changing requirements.
2. Separate approved decisions from genuinely pending decisions; do not ask again about confirmed behavior.
3. Ask at most two focused questions in one round unless the user explicitly requests a different pace.
4. Record confirmed decisions in `docs/spec.md` in the relevant section.
5. For every new behavior, capture the user goal, business rules, data/permission impact, and acceptance criteria.
6. Keep photos, AI ticket analysis, file backups, and other explicitly postponed work marked as later scope.
7. Never add real personal data, Excel contents, credentials, or secrets to the repository.
8. When a feature is ready for implementation, mark it `Aprobada`; only mark it `Cerrada` after implementation, tests, verification, and user review.

Output a short summary of what changed and which decisions remain open.
