# Memoria del proyecto Kamikazes

Esta memoria es deliberadamente breve y segura para que una conversación nueva pueda recuperar el contexto sin depender de la conversación anterior.

## Estado actual

- Repositorio público: `ralph1985/kamikazes-app`.
- Rama principal: `main`.
- El proyecto ha superado la fase documental inicial y cuenta con la base técnica del Hito 0.
- El Hito 0 está implementado y publicado en `main`.
- La aplicación está desplegada en Vercel con el dominio público `https://kamikazes.conquense.dev/`.
- La especificación completa está en `docs/spec.md`.
- El roadmap de implementación está en `docs/roadmap.md`.
- La base técnica del Hito 1 está implementada y verificada localmente, sin migrar tablas de negocio.
- El Hito 2 está en desarrollo con el modelo, la ruta REST de login y la migración de identidad aplicada en Neon; las tablas están vacías y aún no se han creado cuentas reales.

## Producto

Kamikazes gestionará una peña con ediciones anuales, miembros permanentes, cuentas privadas, permisos por área y edición, presupuesto, compras, catering, inventario, sobrantes y contenido público. Los álbumes/fotos se mantienen fuera del MVP inmediato.

## Decisiones técnicas

- Next.js, TypeScript y App Router.
- Route Handlers REST bajo `/api/v1`.
- Arquitectura hexagonal pragmática por módulos.
- Neon PostgreSQL; acceso sólo desde servidor.
- Drizzle ORM y migraciones explícitas.
- Vercel Blob privado para tickets y justificantes.
- Autenticación propia con Argon2id, sesiones en Neon y cookies seguras.
- Zod, OpenAPI, Vitest, Playwright, TDD y BDD.
- Mobile first, PWA y offline tolerante limitado a compras, lista e inventario.
- CSS Modules para estilos aislados por componente y `globals.css` sólo para tokens de diseño y estilos base; sin framework CSS externo en el MVP.

## Reglas de producto importantes

- Miembro, cuenta y participación anual son conceptos distintos.
- Miembros activos pueden consultar áreas y ediciones; editores sólo modifican su área; el administrador tiene acceso global.
- Ediciones cerradas son de sólo lectura y sólo el administrador puede reabrirlas.
- Los saldos previsto y real son independientes; catering tiene sus propios saldos.
- El total introducido en una compra real es la cifra oficial del gasto; los precios de productos sirven para comparación.
- No guardar Excel, credenciales, contraseñas, tokens ni datos personales reales en Git.

## Contexto de trabajo

- El usuario prefiere avanzar por hitos y no hacer commits continuamente; commit/push sólo cuando lo solicite.
- Las preguntas de requisitos pueden hacerse de una o dos en una, pero el interrogatorio se puede pausar para implementar.
- Las decisiones pendientes están documentadas en `docs/spec.md`; no repetir preguntas ya respondidas.
- La ampliación de E2E autenticados admin/editor queda pospuesta hasta que avance más la interfaz; al retomarla se usará un entorno aislado con cuentas sintéticas, nunca Neon Production.
