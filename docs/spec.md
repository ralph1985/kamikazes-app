# Especificación de Kamikazes

Estado: borrador inicial.

## 1. Propósito

Construir una aplicación real para gestionar la organización económica y operativa de las ediciones anuales de Kamikazes, sustituyendo el uso central de hojas de cálculo por una base de datos, autenticación y permisos explícitos.

## 2. Alcance conocido

El sistema deberá contemplar, como mínimo:

- ediciones anuales del evento;
- usuarios, miembros y participación en una edición;
- autenticación y autorización por roles;
- cuotas, presupuesto, pagos y derramas;
- lista de compras con categorías, responsables, cantidades, precios, notas y estados;
- catering por día y control de asistencia/pago;
- inventario por ubicación;
- sobrantes de cada edición;
- historial auditable de cambios;
- importación inicial desde el Excel de referencia.

## 3. Fuente funcional inicial

El Excel analizado contiene estas áreas:

- `Miembros`: 37 personas, tarifas, pago, acceso y filtros personales;
- `Lista compra 2026`: 146 productos, 17 lugares de compra, 13 categorías y 17 asignaciones;
- `Catering`: asistencia de sábado/domingo, pago y coste por persona;
- `Derramas`: gastos históricos de 2023 a 2025;
- `Inventario`: material distribuido en 6 ubicaciones;
- hojas de sobrantes de 2024, 2025 y 2026;
- `Historial de cambios`: 179 registros de actividad.

Estas cifras describen el estado del archivo de referencia y no son todavía requisitos cerrados.

## 4. Principios iniciales

- La base de datos será la fuente de verdad operativa.
- Las reglas importantes no dependerán de nombres de columnas, posiciones de celdas ni fórmulas ocultas.
- Todo dato operativo estará vinculado a una edición concreta cuando corresponda.
- Los permisos se comprobarán en servidor y en la base de datos, no sólo en la interfaz.
- Las acciones relevantes quedarán auditadas.
- La importación conservará trazabilidad hacia el dato original.
- El producto se diseñará para evolucionar a nuevas ediciones sin copiar hojas ni código.

## 5. Decisiones pendientes

- identidad del propietario del sistema y de cada edición;
- roles exactos y permisos por rol;
- si un usuario puede participar en varias ediciones;
- modelo de cuotas, pagos y reembolsos;
- estados oficiales de productos y catering;
- qué datos puede editar cada participante;
- si habrá varios grupos/eventos independientes;
- estrategia de importación y corrección del Excel;
- stack definitivo, despliegue y proveedor de autenticación/base de datos.

## 6. Criterio de trabajo SDD

Cada funcionalidad nueva deberá tener antes:

1. objetivo de usuario;
2. reglas de negocio;
3. criterios de aceptación;
4. impacto en datos y permisos;
5. estrategia de pruebas.

No se considera cerrada una funcionalidad sólo porque se vea bien en pantalla.
