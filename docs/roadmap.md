# Roadmap de Kamikazes

Este roadmap organiza la implementación en hitos pequeños. Los hitos no convierten automáticamente una decisión en requisito cerrado: cada funcionalidad seguirá el ciclo definido en `docs/spec.md`.

## Hito 0 — Preparación del proyecto

- crear `AGENTS.md` raíz e instrucciones por módulo;
- fijar estructura hexagonal y módulos de dominio;
- configurar Next.js, TypeScript, lint, formato y variables de entorno;
- preparar reglas de Git, `main` protegida y documentación de trabajo.

Resultado: repositorio preparado para desarrollar sin datos ni código de producción accidental.

## Hito 1 — Base técnica y calidad

Estado: En desarrollo.

- configurar Drizzle y conexión de servidor a Neon;
- preparar el flujo de migraciones y convenciones de UUID, fechas e importes;
- configurar Zod, OpenAPI, Vitest y Playwright;
- preparar el pipeline de comprobaciones y el despliegue de Vercel.

Resultado: aplicación mínima desplegable con comprobaciones automáticas.

## Hito 2 — Identidad y sesiones

Estado: En desarrollo.

Primera rebanada verificable:

- contrato de login y respuesta uniforme de autenticación;
- normalización de nombres de usuario y validación de contraseña no vacía;
- bloqueo tras tres intentos y estado de cambio obligatorio de contraseña;
- emisión y rotación de sesiones con duración máxima de 30 días;
- puerto de hash Argon2id, sin persistencia ni credenciales reales en fixtures.

- miembros, cuentas y sesiones;
- login por nombre de usuario;
- Argon2id, cookies seguras y bloqueo tras tres intentos;
- cambio obligatorio de contraseña, recuperación manual y cierre de sesiones;
- perfil y cambios auditados.
- pantalla de login conectada al contrato REST de autenticación;
- shell compartida con menú lateral y acceso visible al login.

Resultado: acceso real seguro para miembros, todavía sin módulos económicos.

## Hito 3 — Ediciones y autorización

Estado: En desarrollo.

Primera rebanada verificable:

- ediciones anuales con estado abierta/cerrada;
- asignaciones de rol por miembro, área y edición;
- administrador global sin depender de una edición;
- autorización de lectura y edición en dominio, independiente de React.

- ediciones anuales y estados abierta/cerrada;
- roles y permisos por área y edición;
- protección de API y rutas privadas;
- bloqueo de edición cuando una edición está cerrada;
- auditoría común.

Resultado: base de autorización sobre la que pueden construirse todos los módulos.

## Hito 4 — Espacio público

- página pública inicial;
- logo, historia, redes y secciones configurables;
- publicación administrada;
- generación estática, revalidación y caché pública controlada.

Resultado: primera parte visible para personas anónimas.

## Hito 5 — Presupuesto y participación económica

- tarifas y participación por edición;
- cuotas, pagos, devoluciones y saldos;
- movimientos previstos y reales;
- saldo previsto y saldo real;
- cierre y reapertura administrativa.

Resultado: gestión económica completa con auditoría.

## Hito 6 — Lista de compra

- productos, categorías, asignaciones, tiendas y estados;
- copia de una edición anterior;
- precios y cantidades previstas/reales;
- filtros, ordenación y agrupación;
- flujo móvil `Pendiente → En carrito → Comprado`.

Resultado: sustitución funcional de la lista principal del Excel.

## Hito 7 — Compras reales y tickets

- compras agrupando productos y tiendas;
- total real y tickets;
- subida autorizada a Vercel Blob;
- lectura, eliminación y auditoría de documentos;
- comparación entre productos y total real.

Resultado: control de la compra pagada sin duplicar gastos.

## Hito 8 — Catering

- comidas, precios y asistencia;
- pagos de catering;
- saldos previsto y real independientes;
- edición por área y consulta para todos los miembros.

Resultado: módulo de catering separado del presupuesto general.

## Hito 9 — Inventario y sobrantes

- ubicaciones, cantidades y movimientos;
- inventario acumulado por producto y ubicación;
- sobrantes por edición;
- auditoría y permisos del área.

Resultado: cierre del ciclo operativo de compras.

## Hito 10 — Migración histórica

- análisis de todos los Excel disponibles sin escritura;
- correspondencias privadas de miembros;
- importación idempotente por edición;
- revisión manual de cada informe;
- creación de cuentas activas y ediciones históricas cerradas.

Resultado: datos históricos incorporados sin duplicados ni pérdida de control.

## Hito 11 — PWA y sincronización tolerante a desconexión

- instalación como PWA;
- caché únicamente pública y versionada;
- cola Dexie para compras, lista e inventario;
- `operationId`, reintentos y conflictos manuales;
- pruebas de actualización del service worker en móvil.

Resultado: uso fiable en tiendas sin convertir pagos en operaciones offline.

## Hito 12 — Endurecimiento y salida inicial

- pruebas BDD completas en móvil;
- revisión de permisos y casos destructivos;
- migraciones y copias de producción verificadas;
- revisión de accesibilidad, rendimiento y seguridad;
- checklist de MVP y cierre funcional por módulo.

Resultado: primera versión operativa lista para uso real.

## Posterior al MVP

- análisis de tickets con IA;
- copias de archivos de Vercel Blob;
- fotos y álbumes;
- Sentry u otra observabilidad avanzada;
- nuevos módulos según necesidades de la peña.
