# Desarrollo

## Arranque

1. Copia `.env.example` a `.env.local` sólo si necesitas configurar valores
   locales. No compartas ese archivo ni lo confirmes en Git.
2. Instala dependencias con `pnpm install`.
3. Arranca la aplicación con `pnpm dev`.

La aplicación inicial no necesita conexión a Neon para mostrar la página ni
para consultar `/api/v1/health`. Drizzle está configurado y el cliente sólo
puede importarse desde servidor. La migración de identidad se ha ejecutado en
la base de producción recién creada; las futuras migraciones seguirán el mismo
proceso manual y revisable.

## Copias de seguridad de Neon

El backup local de la base de datos de producción se ejecuta con:

```bash
pnpm backup:neon
pnpm backup:neon:cron:install
```

El cron se programa cada seis horas, guarda volcados personalizados en
`var/backups/neon/` y conserva 14 días. La credencial debe estar únicamente en
`~/.config/kamikazes/neon-backup.env`, con `POSTGRES_URL_NON_POOLING` o
`DATABASE_URL`, y permisos `600`. El log queda en
`var/log/neon-backup.log`; CronWatch lo incluye en su tabla diaria de backups.

## Comprobaciones

Antes de considerar un cambio preparado, ejecuta `pnpm format:check`,
`pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build`. Las pruebas E2E
locales se ejecutan con `pnpm test:e2e` y levantan un servidor de desarrollo.

## Límites de seguridad

- `DATABASE_URL` sólo puede usarse desde código de servidor.
- El cliente de Neon se crea bajo demanda y falla de forma explícita si falta
  `DATABASE_URL`.
- No se incluyen Excel originales, credenciales, tokens ni datos personales
  reales en fixtures, documentación o commits.
- No se ejecutan `pnpm db:generate` ni `pnpm db:migrate` contra producción como
  parte de las comprobaciones normales. Las migraciones usan
  `POSTGRES_URL_NON_POOLING` cuando está disponible y `DATABASE_URL` sólo como
  fallback.
