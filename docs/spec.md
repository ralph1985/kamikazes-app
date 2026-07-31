# Especificación de Kamikazes

Estado: borrador inicial.

## 1. Propósito

Construir una aplicación real para gestionar la vida digital de la peña Kamikazes. La aplicación cubrirá la organización económica y operativa de sus ediciones anuales y, además, ofrecerá contenidos públicos para personas externas y un espacio privado para miembros, sustituyendo el uso central de hojas de cálculo por una base de datos, autenticación y permisos explícitos.

## 2. Alcance conocido

El sistema deberá contemplar, como mínimo:

- ediciones anuales del evento;
- usuarios, miembros y participación en una edición;
- miembros permanentes con estado de cuenta activable o desactivable;
- participación anual independiente, incluyendo años sin participación económica;
- tarifas configurables por edición y asignables a los miembros participantes de ese año;
- autenticación y autorización por roles;
- alta inicial de miembros realizada manualmente por el propietario del proyecto;
- contenidos públicos consultables sin autenticación;
- contenidos privados accesibles sólo a miembros autorizados;
- álbumes de fotos y otros contenidos transversales de la peña;
- cuotas, presupuesto, pagos y derramas;
- lista de compras con categorías, responsables, cantidades, precios, notas y estados;
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

## 4. Forma del producto

La aplicación representa una única peña, Kamikazes, con continuidad entre años. Las ediciones anuales serán una entidad central para separar presupuestos, compras, catering, inventario, sobrantes y demás información que pertenezca a un año concreto. Los álbumes de fotos serán transversales a las ediciones y no estarán asociados obligatoriamente a un año.

La identidad de un miembro será permanente entre ediciones. Su participación se registrará por año: un miembro podrá participar en una edición, no participar en otra y volver a participar posteriormente. No participar en un año implica que no aporta dinero y no entra en el presupuesto de esa edición, pero no elimina su acceso al espacio privado de la peña.

Las tarifas no serán una propiedad fija del miembro. Cada edición definirá sus propias tarifas y reglas de aplicación, y cada miembro participante tendrá una asignación de tarifa para ese año.

El producto se organizará en tres áreas funcionales diferenciadas:

- **Gestión económica y operativa:** presupuesto y cuotas, lista de compras, inventario, sobrantes, derramas e histórico económico.
- **Fotos y álbumes:** espacio colaborativo para conservar recuerdos de la peña. Todos los miembros podrán subir fotos; la solución de almacenamiento y publicación queda pendiente, pudiendo apoyarse en Google Photos u otra alternativa.
- **Catering:** gestión independiente de asistencia, comidas y pagos, con su propio flujo y permisos.

El producto tendrá dos superficies de acceso:

- **Pública:** información y contenidos que la peña decida mostrar a cualquier visitante sin iniciar sesión.
- **Privada:** gestión económica, organización interna, álbumes restringidos y demás información disponible sólo para miembros según sus permisos.

Los permisos deberán controlar tanto el acceso a módulos como la capacidad de leer, crear, modificar, publicar o administrar cada tipo de contenido.

Las tres áreas funcionales compartirán el mismo sistema de identidad, inicio de sesión y sesión activa. El usuario no tendrá que autenticarse de nuevo al pasar entre gestión, fotos y catering; la autorización seguirá evaluándose de forma independiente para cada área.

### Roles iniciales

- **Administrador:** reservado inicialmente al propietario de la peña. Puede gestionar la configuración global, usuarios, roles, permisos y cualquier contenido.
- **Editor:** asignado inicialmente a 2 o 3 personas de confianza. Puede modificar los módulos y contenidos que se le autoricen, pero no administrar cuentas ni cambiar la configuración global salvo decisión posterior.
- **Lector:** miembros con acceso privado de consulta. Puede ver presupuestos y otros contenidos internos permitidos, pero no modificar datos.

El acceso público anónimo no será un rol de miembro: será una superficie separada para contenidos publicados explícitamente.

Los permisos de edición serán específicos por área o módulo. No habrá un único editor global: una persona podrá editar presupuesto, otra compras, otra catering y otras áreas, con posibles combinaciones entre módulos. La subida de fotos será una capacidad común de todos los miembros, no un permiso reservado a editores. La autorización efectiva dependerá de la combinación miembro + edición + área/módulo + capacidad.

Durante la primera etapa no habrá registro público ni panel de administración para dar de alta miembros. La provisión de usuarios se hará manualmente con ayuda del propietario, mediante un procedimiento controlado del proyecto. Esto no elimina los roles ni los permisos de uso: sólo deja fuera de la interfaz la gestión administrativa de cuentas.

### Autenticación inicial

- Cada miembro tendrá un nombre de usuario y una contraseña.
- El propietario facilitará manualmente las credenciales iniciales.
- La contraseña inicial común será `123456` únicamente como mecanismo de arranque.
- En el primer inicio de sesión será obligatorio establecer una contraseña nueva antes de acceder a la aplicación.
- Las contraseñas se almacenarán siempre mediante hash; la contraseña inicial no se incluirá en el repositorio ni en documentación pública operativa.
- La cuenta no podrá considerarse plenamente activada hasta completar el cambio de contraseña.
- La recuperación de acceso será manual durante la primera etapa y la gestionaremos nosotros.
- Un restablecimiento manual asignará una nueva contraseña temporal y volverá a exigir el cambio en el siguiente inicio de sesión.
- No será obligatorio almacenar un email para recuperar la cuenta en esta primera etapa.

## 5. Principios iniciales

- La base de datos será la fuente de verdad operativa.
- Las reglas importantes no dependerán de nombres de columnas, posiciones de celdas ni fórmulas ocultas.
- Todo dato operativo estará vinculado a una edición concreta cuando corresponda.
- Los permisos se comprobarán en servidor y en la base de datos, no sólo en la interfaz.
- Las acciones relevantes quedarán auditadas.
- La importación conservará trazabilidad hacia el dato original.
- El producto se diseñará para evolucionar a nuevas ediciones sin copiar hojas ni código.
- Lo público se publicará explícitamente; el contenido privado será la opción segura por defecto.
- Las fotos y otros contenidos tendrán visibilidad configurable; los álbumes no dependerán de la edición anual.

## 6. Decisiones pendientes

- identidad del propietario del sistema y de cada edición;
- roles exactos y permisos por rol;
- diferencia entre miembro desactivado globalmente y miembro no participante en una edición;
- alcance exacto del acceso privado que conserva un miembro no participante;
- matriz concreta de permisos por módulo para administrador, editor y lector;
- catálogo definitivo de módulos y capacidades editables en cada uno;
- límites funcionales exactos entre gestión, fotos y catering;
- almacenamiento y publicación de fotografías;
- si un usuario puede participar en varias ediciones;
- procedimiento concreto para provisionar, desactivar y recuperar cuentas manuales;
- política de complejidad, recuperación y bloqueo de contraseñas;
- modelo de cuotas, pagos y reembolsos;
- estados oficiales de productos y catering;
- qué datos puede editar cada participante;
- si habrá varios grupos/eventos independientes;
- qué contenidos serán públicos, privados o publicables por edición;
- si los álbumes admitirán fotos individuales, álbumes colaborativos o ambos;
- estrategia de importación y corrección del Excel;
- stack definitivo, despliegue y proveedor de autenticación/base de datos.

## 7. Criterio de trabajo SDD

Cada funcionalidad nueva deberá tener antes:

1. objetivo de usuario;
2. reglas de negocio;
3. criterios de aceptación;
4. impacto en datos y permisos;
5. estrategia de pruebas.

No se considera cerrada una funcionalidad sólo porque se vea bien en pantalla.
