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

La autenticación de peticiones y la autorización transversal de edición se
resuelven mediante `src/shared/server/authorization.ts`. Este adaptador no
contiene reglas de un área concreta: sólo traduce la sesión, el rol del área y
el estado abierto/cerrado de una edición para que los casos de uso puedan
recibir un actor ya autenticado.

Las reglas puras de cada área permanecen dentro de su módulo. Por ejemplo,
`budget/domain/transaction.ts` calcula el signo de pagos y devoluciones y
valida que una devolución no deje el neto por debajo de cero, sin depender de
Next.js, Drizzle ni React.

Módulos iniciales: `identity`, `editions`, `budget`, `shopping`, `catering`,
`public-content` y `audit`.
