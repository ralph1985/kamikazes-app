# Migraciones Drizzle

Las migraciones de este directorio son revisables y se ejecutan manualmente.

- `pnpm db:generate` genera SQL a partir de `src/infrastructure/database/schema.ts`.
- Revisar el SQL y el diff antes de publicarlo.
- `pnpm db:migrate` requiere `DATABASE_URL` y no forma parte del pipeline normal.
- No ejecutar migraciones contra Neon de producción sin autorización explícita,
  copia previa verificada y plan de reversión.

La primera migración de negocio corresponde al modelo de identidad del Hito 2.
