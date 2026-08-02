# Cómo trabajar con Codex en Kamikazes

Arrancar Codex desde la raíz del repositorio permite cargar `AGENTS.md` y descubrir automáticamente las skills de `.agents/skills/`.

## Primera lectura de una conversación nueva

1. `AGENTS.md`
2. `docs/project-memory.md`
3. `docs/spec.md`
4. `docs/roadmap.md`
5. La skill que corresponda al trabajo

## Skills locales

- `kamikazes-sdd`: requisitos y criterios de aceptación.
- `kamikazes-architecture`: diseño técnico y límites de módulos.
- `kamikazes-migration`: importación histórica de Excel.
- `kamikazes-quality`: TDD, BDD, seguridad y validación.

Se pueden invocar explícitamente con `$nombre-de-skill` o dejar que Codex las seleccione por descripción cuando el trabajo encaje.

## Regla de memoria

La documentación versionada es la fuente de verdad del proyecto. La memoria local sólo ayuda a recuperar contexto y no debe contener secretos. Si la memoria y el SDD difieren, prevalece el SDD y se corrige la memoria.

## Inicio recomendado

La próxima conversación debería empezar con una petición como:

> Lee `AGENTS.md`, `docs/project-memory.md`, `docs/spec.md` y `docs/roadmap.md`. Comprueba el estado del repositorio y prepara el Hito 0 sin tocar producción.
