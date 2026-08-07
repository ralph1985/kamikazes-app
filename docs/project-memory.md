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
- El Hito 2 tiene implementada su primera rebanada verificable: login, cambio obligatorio de contraseña, sesiones, perfil, cierre de sesiones y migración de identidad aplicada en Neon; las tablas están vacías y aún no se han creado cuentas reales.
- El Hito 3 tiene implementada su primera rebanada verificable: creación de ediciones, cierre y reapertura sólo por administrador con auditoría, y asignación de lectores y editores por área y edición desde administración. La revisión E2E autenticada con cuentas sintéticas sigue pospuesta hasta que avance la interfaz.
- El Hito 3 queda pendiente de validación funcional por Rafa. El Hito 4 está en desarrollo con página pública, contenido editorial y enlaces sociales administrables sólo por el administrador global, mediante caché pública y auditoría.
- El Hito 5 está en desarrollo por bloques. La primera rebanada añade cuotas derivadas de tarifas, pagos y devoluciones corregibles desde presupuesto, con cálculo de pendiente, control de devolución máxima, bloqueo en ediciones cerradas y auditoría; faltan saldos y movimientos manuales.
- El segundo bloque del Hito 5 está en desarrollo para saldos iniciales/trasladables y movimientos previstos/reales, con saldos previsto y real separados; el cierre económico administrativo queda pendiente.
- El Hito 6 queda pendiente de validación funcional por Rafa; incluye productos de compra por edición, copia explícita de previsión desde otra edición y preferencias de lista por miembro. Los productos pueden borrarse físicamente desde ediciones abiertas sólo por editores de compras o administradores, con confirmación y auditoría.
- El Hito 7 está en desarrollo: compras reales separadas de movimientos de presupuesto, tickets privados en Vercel Blob y auditoría.
- La primera rebanada del Hito 7 registra compras manuales por edición con tienda, fecha, miembro comprador, importe y notas; no enlaza productos ni duplica movimientos del presupuesto.
- El Hito 7 queda pendiente de validación funcional por Rafa. El Hito 8 queda pendiente de validación funcional por Rafa. El Hito 9 queda pendiente de validación funcional por Rafa e incluye ubicaciones, existencias, movimientos y sobrantes auditados.
- La migración ha comenzado por la lista de compra 2026: el Excel es la previsión operativa para organizar los días de compra y el presupuesto previsto; no se importan compras reales ni el historial de cambios antiguo.
- El cambio de contraseña desde el perfil exige la contraseña actual; la navegación interna de cualquier vista se construye con componentes reutilizables y sigue un patrón común, incluido administración, perfil y ediciones.
- Con el adaptador `drizzle-orm/neon-http`, las operaciones atómicas de escritura deben agruparse mediante `db.batch`; `db.transaction` no está soportado por ese driver.
- Las superficies de edición usan el componente reutilizable `src/components/ui/modal.tsx`; mantener las ediciones en modal y no volver a formularios inline.

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
