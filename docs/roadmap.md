# Roadmap de Kamikazes

Este roadmap organiza la implementación en hitos pequeños. Los hitos no convierten automáticamente una decisión en requisito cerrado: cada funcionalidad seguirá el ciclo definido en `docs/spec.md`.

## Hito 0 — Preparación del proyecto

- crear `AGENTS.md` raíz e instrucciones por módulo;
- fijar estructura hexagonal y módulos de dominio;
- configurar Next.js, TypeScript, lint, formato y variables de entorno;
- preparar reglas de Git, `main` protegida y documentación de trabajo.

Resultado: repositorio preparado para desarrollar sin datos ni código de producción accidental.

## Hito 1 — Base técnica y calidad

Estado: Implementada.

- configurar Drizzle y conexión de servidor a Neon;
- preparar el flujo de migraciones y convenciones de UUID, fechas e importes;
- configurar Zod, OpenAPI, Vitest y Playwright;
- preparar el pipeline de comprobaciones y el despliegue de Vercel.
- preparar el comando de snapshot privado que se ejecutará durante el build sin publicar sus datos como archivos estáticos.

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
- cambio obligatorio de contraseña después del primer acceso;
- consulta de sesión y cierre de sesión desde la navegación.
- perfil autenticado para actualizar nombre visible y usuario, con auditoría transaccional;
- cambio de contraseña desde el perfil protegido por la contraseña actual;
- cierre de todas las sesiones activas desde el perfil;
- revocación inmediata de sesiones al desactivar una cuenta.

Resultado: acceso real seguro para miembros, todavía sin módulos económicos.

## Hito 3 — Ediciones y autorización

Estado: En desarrollo.

Pendiente de validación funcional por Rafa.

Primera rebanada verificable:

- ediciones anuales con estado abierta/cerrada;
- asignaciones de rol por miembro, área y edición;
- administrador global sin depender de una edición;
- autorización de lectura y edición en dominio, independiente de React.

- ediciones anuales y estados abierta/cerrada;
- roles y permisos por área y edición;
- protección de API y rutas privadas;
- panel privado inicial con listado de ediciones;
- bloqueo de edición cuando una edición está cerrada;
- auditoría común.

Criterios de aceptación de la primera rebanada:

- sólo un administrador global puede crear, cerrar y reabrir ediciones;
- una edición cerrada conserva la lectura para miembros activos, pero rechaza sus mutaciones;
- los permisos de lector y editor se asignan por área y edición, y se comprueban en servidor;
- retirar un permiso no modifica los datos ni la auditoría existente;
- cada cambio de estado de edición y de permisos genera auditoría con valores anterior y nuevo;
- las pruebas cubren visitante anónimo, miembro activo, lector, editor, administrador, edición cerrada y cuenta desactivada.

Resultado: base de autorización sobre la que pueden construirse todos los módulos.

## Hito 4 — Espacio público

Estado: En desarrollo.

- página pública inicial;
- logo, historia, redes y secciones configurables;
- publicación administrada;
- generación estática, revalidación y caché pública controlada.

Criterios de aceptación de la primera rebanada:

- una persona anónima puede consultar la presentación, historia, logo y enlaces sociales activos;
- la información privada, la API de administración y los enlaces sociales inactivos no se exponen públicamente;
- sólo el administrador global puede crear, editar, ocultar y eliminar secciones y enlaces sociales;
- cada cambio editorial queda auditado con valor anterior y nuevo;
- la página pública usa contenido cacheable y las respuestas públicas no incluyen datos de miembros ni económicos.

Resultado: primera parte visible para personas anónimas.

## Hito 5 — Presupuesto y participación económica

Estado: En desarrollo.

Primera rebanada verificable:

- tarifas y participación por edición;
- cuotas derivadas de la tarifa asignada, pagos y devoluciones;
- saldo pendiente y estado `Pendiente`, `Parcial` o `Pagado`;
- pagos y devoluciones corregibles, no eliminables, con método y auditoría;

Siguiente bloque del hito:

- saldos iniciales y trasladables;
- movimientos previstos y reales;
- saldo previsto y saldo real;
- cierre y reapertura administrativa.

Este bloque cubre saldos y movimientos previstos/reales; el cierre económico administrativo queda para la siguiente iteración.

Criterios de aceptación de la primera rebanada:

- sólo editores de presupuesto y administradores pueden registrar o corregir pagos y devoluciones;
- los lectores pueden consultar el detalle sin poder modificarlo;
- una devolución no puede superar el importe neto pagado de la cuota;
- una edición cerrada rechaza pagos, devoluciones y correcciones;
- cada mutación conserva auditoría con valor anterior y nuevo.

Resultado: gestión económica completa con auditoría.

## Hito 6 — Lista de compra

Estado: Pendiente de validar funcionalmente por Rafa.

Primera rebanada verificable:

- productos, categorías, asignaciones, tiendas y estados;
- precios y cantidades previstas/reales;
- filtros, ordenación y agrupación;
- flujo móvil `Pendiente → En carrito → Comprado`.

Segundo bloque en desarrollo:

- copia explícita de una edición anterior, copiando la previsión y reiniciando el seguimiento real;
- preferencias persistentes de agrupación y orden generales por usuario;
- búsqueda y filtros persistentes por edición y usuario.

Criterios de aceptación de la primera rebanada:

- los productos pertenecen a una única edición y no se eliminan;
- lectores consultan y filtran; editores de compras y administradores crean y modifican;
- cantidades y precios previstos/reales calculan el total automáticamente;
- las mutaciones se auditan y una edición cerrada queda en sólo lectura;
- una cantidad negativa exige una nota explicativa.
- la copia desde otra edición requiere una acción explícita y no arrastra cantidades, precios ni estados reales;
- las preferencias se recuperan al volver a la lista y no modifican los productos.

Resultado: sustitución funcional de la lista principal del Excel.

## Hito 7 — Compras reales y tickets

Estado: Pendiente de validar funcionalmente por Rafa.

Primera rebanada en desarrollo:

- compras reales manuales con tienda, fecha, miembro comprador, importe y notas;
- lectura para miembros y edición sólo por compras/admin;
- compras separadas de los movimientos del presupuesto, preparadas para enlazar tickets.

- compras agrupando productos y tiendas;
- total real y tickets;
- subida autorizada a Vercel Blob;
- lectura, eliminación y auditoría de documentos;
- comparación entre productos y total real.

Criterios iniciales:

- una compra real pertenece a una edición y agrupa uno o más productos y una tienda;
- el gasto real se registra una sola vez y no duplica los movimientos del presupuesto;
- sólo editores de compras y administradores pueden crear o corregir compras;
- los tickets son privados, sólo accesibles con permiso de la edición, y cada mutación queda auditada;
- una edición cerrada no admite compras ni cambios en sus tickets.

Resultado: control de la compra pagada sin duplicar gastos.

## Hito 8 — Catering

Estado: En desarrollo.

Primera rebanada:

- comidas configurables por edición con precio previsto y real;
- asistencia independiente por miembro y comida con estados `Sí`, `No` y `Cancelado`;
- cada miembro modifica sólo su propia asistencia; editores de catering y administradores pueden corregir cualquiera;
- pagos por comida separados de presupuesto y editables sólo por catering/admin.

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

## Hito 10 — Memoria histórica privada

- álbumes y galerías privadas;
- perfiles y apodos históricos de miembros;
- libro de firmas y mensajes como archivo consultable;
- permisos de lectura para miembros autenticados;
- moderación y gestión reservadas al administrador o al área aprobada;
- snapshot privado generado durante el build y servido sólo por rutas autenticadas;
- pruebas que demuestren que una visita anónima no puede obtener el snapshot ni sus recursos.

Resultado: memoria digital recuperada sin convertirla en contenido público ni consultar Neon en cada lectura.

## Hito 11 — Migración histórica

- análisis de todos los Excel disponibles sin escritura;
- análisis del legado KDC sin escritura;
- correspondencias privadas de miembros;
- importación idempotente por edición y por colección histórica;
- revisión manual de cada informe;
- creación de cuentas activas y ediciones históricas cerradas.

Resultado: datos históricos incorporados sin duplicados ni pérdida de control.

## Hito 12 — PWA y sincronización tolerante a desconexión

- instalación como PWA;
- caché únicamente pública y versionada;
- cola Dexie para compras, lista e inventario;
- `operationId`, reintentos y conflictos manuales;
- pruebas de actualización del service worker en móvil.

Resultado: uso fiable en tiendas sin convertir pagos en operaciones offline.

## Hito 13 — Endurecimiento y salida inicial

- pruebas BDD completas en móvil;
- revisión de permisos y casos destructivos;
- migraciones y copias de producción verificadas;
- revisión de accesibilidad, rendimiento y seguridad;
- checklist de MVP y cierre funcional por módulo.

Resultado: primera versión operativa lista para uso real.

## Posterior al MVP

- análisis de tickets con IA;
- copias de archivos de Vercel Blob;
- ampliaciones de la memoria histórica y nuevas colecciones;
- Sentry u otra observabilidad avanzada;
- nuevos módulos según necesidades de la peña.
