# Desarrollo

## Arranque

1. Copia `.env.example` a `.env.local` sólo si necesitas configurar valores
   locales. No compartas ese archivo ni lo confirmes en Git.
2. Instala dependencias con `pnpm install`.
3. Arranca la aplicación con `pnpm dev`.

La aplicación inicial no necesita conexión a Neon para mostrar la página ni
para consultar `/api/v1/health`. Drizzle está configurado, pero las
migraciones contra la base de datos se reservarán para un hito posterior y
una autorización explícita.

## Comprobaciones

Antes de considerar un cambio preparado, ejecuta `pnpm format:check`,
`pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build`. Las pruebas E2E
locales se ejecutan con `pnpm test:e2e` y levantan un servidor de desarrollo.

## Límites de seguridad

- `DATABASE_URL` sólo puede usarse desde código de servidor.
- No se incluyen Excel originales, credenciales, tokens ni datos personales
  reales en fixtures, documentación o commits.
- No se ejecutan `pnpm db:migrate` ni scripts destructivos contra producción
  como parte de las comprobaciones normales.
