# Límites de módulos

Los módulos de producto son independientes y siguen la misma estructura
hexagonal pragmática:

```text
<módulo>/
├── domain/       entidades, valores y reglas puras
├── application/  casos de uso y coordinación
├── ports/        contratos hacia fuera del módulo
└── adapters/     HTTP, persistencia y servicios externos
```

Los Route Handlers de `src/app/api` sólo adaptan HTTP. Las reglas de negocio
no deben vivir en componentes React ni en repositorios. La comunicación entre
módulos se hará mediante casos de uso o puertos explícitos; no mediante
acceso directo a tablas de otro módulo.

Módulos iniciales: `identity`, `editions`, `budget`, `shopping`, `catering`,
`public-content` y `audit`.
