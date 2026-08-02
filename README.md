# Kamikazes

Nueva aplicación para gestionar las ediciones anuales de Kamikazes: participantes, presupuesto, compras, catering, inventario, sobrantes, derramas e historial.

El proyecto se desarrolla siguiendo un enfoque Spec-Driven Development (SDD). La especificación y las decisiones aprobadas serán la fuente de verdad del producto.

## Estado

Hito 0: preparación técnica inicial.

### Comandos

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Las variables de entorno se documentan en `.env.example`. `DATABASE_URL` es
server-only y no debe exponerse al navegador.

## Documentación

- [Especificación inicial](docs/spec.md)
- [Decisiones arquitectónicas](docs/decisions/)

## Referencia

El libro de datos original se conserva fuera de este repositorio para evitar duplicar datos personales. Su estructura se ha analizado como referencia funcional.
