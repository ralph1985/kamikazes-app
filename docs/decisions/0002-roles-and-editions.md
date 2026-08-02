# ADR 0002: Ediciones y asignaciones de autorización

Estado: Aprobada para el Hito 3.

Cada edición es un año independiente con estado `open` o `closed`. Las
asignaciones de autorización relacionan un miembro con un área y una edición.
El administrador inicial es global: usa el área `global`, el rol `admin` y no
apunta a una edición. Los roles `editor` y `reader` siempre apuntan a una
edición y a un área concreta; un editor incluye lectura del área.

La base de datos refuerza estas formas mediante restricciones. La decisión no
crea cuentas ni asignaciones reales por sí sola; la asignación de `rafa` se
hará después de verificar la migración y el flujo de autorización.
