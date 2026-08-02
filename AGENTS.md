# AGENTS.md

## Propósito

Kamikazes es una aplicación real para gestionar una peña: ediciones anuales, presupuesto, compras, catering, inventario, contenidos públicos y acceso privado de miembros.

Antes de trabajar, leer:

1. `docs/spec.md` para requisitos y decisiones aprobadas.
2. `docs/roadmap.md` para el hito actual y sus dependencias.
3. `docs/project-memory.md` para el contexto estable del proyecto.
4. La skill local aplicable en `.agents/skills/`.

## Arquitectura acordada

- Next.js con TypeScript y App Router.
- API REST mediante Route Handlers bajo `/api/v1`.
- Arquitectura hexagonal pragmática: dominio, casos de uso, puertos y adaptadores.
- PostgreSQL gestionado con Neon y acceso únicamente desde el servidor.
- Drizzle ORM para acceso y migraciones.
- Vercel Blob privado para tickets y justificantes.
- Zod para validar entradas; PostgreSQL para reforzar integridad.
- UUID inmutables, `timestamptz` para instantes y `NUMERIC(12,2)` para dinero.
- Vitest, Playwright, TDD y BDD.

## Reglas de trabajo

- No inventar requisitos: si una decisión está pendiente, consultar el SDD y preguntar sólo lo imprescindible.
- Mantener separados los módulos de identidad, ediciones, presupuesto, compras/inventario, catering, contenido público y auditoría.
- Los Route Handlers deben ser adaptadores finos; las reglas viven en casos de uso y dominio.
- Toda operación sensible debe comprobar permisos en servidor y generar auditoría dentro de la misma transacción.
- No confiar en permisos, importes ni estados enviados por el navegador.
- No incluir Excel originales, credenciales, contraseñas, tokens, URLs privadas ni datos personales reales en Git.
- El entorno de producción contiene datos reales. No ejecutar migraciones, scripts de importación ni operaciones destructivas contra producción sin autorización explícita y copia previa.
- La PWA sólo puede cachear contenido público y recursos versionados. No cachear sesiones, API privada, pagos, permisos, tickets ni datos económicos.
- La cola offline sólo cubre compras, lista e inventario; nunca pagos ni devoluciones. Las operaciones deben ser idempotentes.
- Las ediciones cerradas son de sólo lectura; sólo el administrador puede reabrirlas.

## Desarrollo y calidad

- Cada hito empieza por comportamiento y criterios de aceptación.
- Escribir primero las pruebas relevantes y después la implementación.
- Ejecutar lint, comprobación de tipos, tests, build y las pruebas Playwright aplicables.
- Las comprobaciones de producción se hacen antes del despliegue automático desde `main`.
- Los cambios de esquema requieren migración explícita, revisión y estrategia reversible cuando sea posible.
- No hacer commit, push, merge ni cambios destructivos salvo autorización explícita del usuario.
- Cuando el usuario autorice commit y push, usar commits Conventional en inglés, revisar el diff y verificar que `main` queda limpio y sincronizado.

## Comunicación

- Hablar en español con el usuario salvo que pida otro idioma.
- Explicar brevemente riesgos y decisiones que puedan afectar a datos reales.
- En el interrogatorio de requisitos, avanzar con una o dos preguntas enfocadas y registrar las respuestas en `docs/spec.md`.
- Distinguir siempre entre `Aprobada`, `En desarrollo`, `Implementada`, `Verificada` y `Cerrada`.
