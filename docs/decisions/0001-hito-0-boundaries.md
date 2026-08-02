# ADR 0001: Base técnica y límites del Hito 0

Estado: Aprobada para el Hito 0.

La aplicación se inicia como una única aplicación Next.js con App Router. Los
Route Handlers bajo `/api/v1` son adaptadores HTTP finos. La lógica de negocio
se ubicará en módulos con límites `domain`, `application`, `ports` y
`adapters`; el acceso a Neon quedará en infraestructura de servidor.

El Hito 0 no crea tablas de negocio ni ejecuta migraciones. La tabla centinela
del esquema sólo permite validar la configuración de Drizzle; se eliminará o
reemplazará mediante una migración revisada cuando comience el Hito 1.

Las decisiones pendientes de producto siguen siendo las de `docs/spec.md` y
no se resuelven mediante esta estructura inicial.
