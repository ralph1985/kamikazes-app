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

La identidad de un miembro será permanente entre ediciones. Su participación se registrará por año: un miembro podrá participar en una edición, no participar en otra y volver a participar posteriormente. No participar en un año implica que no aporta dinero y no entra en el presupuesto de esa edición, pero no elimina su acceso al espacio privado de la peña ni su capacidad de colaborar en los álbumes transversales. Si el miembro deja la peña y su cuenta se desactiva globalmente, perderá inmediatamente todo acceso privado, incluidos álbumes y datos históricos; sus registros se conservarán y no se borrarán. Sólo el administrador podrá reactivar posteriormente una cuenta desactivada, que recuperará sus roles y permisos anteriores.

La participación en catering será independiente de la participación económica general. Un miembro podrá no participar en el presupuesto anual y, aun así, apuntarse a una o varias comidas de la edición según las reglas específicas del catering. La asistencia se registrará por comida, de modo que pueda asistir a una comida y no a otra, por ejemplo sábado sí y domingo no. Cada comida podrá tener estados `Sí`, `No` o `Cancelado`. El precio será configurable por edición y por día, permitiendo importes distintos para cada comida. El pago también se controlará por comida, de forma independiente para sábado y domingo. Los miembros podrán gestionar únicamente su propia asistencia; los editores de catering podrán modificar cualquier registro del área y serán los únicos que podrán modificar los estados de pago. No habrá fecha límite ni bloqueo automático para que los miembros modifiquen su asistencia.

En el área de presupuesto, los lectores podrán consultar los totales de la edición y el detalle individual de cuotas y pagos de los miembros. Las cuotas y los pagos sólo podrán modificarlos los editores de presupuesto y el administrador. Los editores de presupuesto también podrán crear y configurar las tarifas de cada edición, asignarlas a los miembros participantes, marcar qué miembros participan o no participan económicamente en esa edición y registrar el saldo inicial o sobrante procedente de años anteriores. Una edición podrá tener varias entradas de saldo, y cada entrada conservará importe, concepto y año de origen. Además, se podrán registrar ingresos y gastos manuales independientes de las cuotas, saldos y compras. Cada movimiento manual tendrá fecha, concepto, importe y notas, y podrá incluir archivos adjuntos como justificantes.

Cada edición podrá contener varias compras reales, incluso varias compras en la misma tienda. La compra prevista y la compra real serán conceptos distintos: durante la primera versión, los editores introducirán manualmente el importe real de cada compra y vincularán manualmente sus tickets. Cada compra tendrá tienda, fecha, persona que la realizó e importe total, además de su propio contexto operativo, y podrá tener varios tickets o justificantes, por ejemplo cuando se divide una compra o se reciben varios comprobantes. En el MVP la compra real no se vinculará con productos concretos de la lista prevista. La persona que realiza la compra se seleccionará entre los miembros registrados, no como texto libre. La tienda se introducirá por nombre la primera vez y quedará disponible para reutilizarse en compras posteriores. Los editores podrán corregir o renombrar tiendas existentes para evitar duplicados y mantener el catálogo limpio. Estos documentos serán independientes de las notas operativas de cada producto. La subida de justificantes y tickets estará limitada a los editores del área correspondiente y al administrador, mientras que los lectores podrán consultarlos. El procesamiento automático de tickets mediante Codex u otra herramienta queda como mejora futura opcional y no será una dependencia del MVP.

Las tarifas no serán una propiedad fija del miembro. Cada edición definirá sus propias tarifas y reglas de aplicación, y cada miembro participante tendrá una asignación de tarifa para ese año.

El producto se organizará en tres áreas funcionales diferenciadas:

- **Gestión económica y operativa:** presupuesto y cuotas, lista de compras, inventario, sobrantes, derramas e histórico económico.
- **Fotos y álbumes:** espacio colaborativo para conservar recuerdos de la peña. El administrador creará los álbumes y todos los miembros podrán subir fotos dentro de álbumes existentes; los miembros no crearán álbumes en el MVP. Los miembros podrán eliminar sus propias fotos y el administrador podrá editar o eliminar cualquier foto. La solución de almacenamiento queda pendiente y se estudiará Google Photos u otra alternativa.
- **Catering:** gestión independiente de asistencia, comidas y pagos, con su propio flujo y permisos.

Los editores de compras también gestionarán el inventario. Los sobrantes se registrarán por edición con producto, cantidad y notas.

Las ubicaciones del inventario podrán crearse y renombrarse desde la aplicación. Cada elemento de inventario tendrá producto, cantidad, ubicación y notas. Los nombres de productos podrán corregirse. El mismo producto podrá existir en varias ubicaciones. Los editores podrán mover productos entre ubicaciones y añadir una nota opcional al movimiento. En una misma ubicación, las cantidades del mismo producto se acumularán en un único registro. La cantidad admitirá decimales y valores negativos para reflejar pérdidas o ajustes. Los registros se conservarán aunque la cantidad llegue a `0`. Todos los cambios de inventario quedarán registrados en el historial de auditoría. Cada sobrante podrá indicar la edición de la que procede y una ubicación concreta, y los editores de compras podrán crearlo y modificarlo. Los sobrantes del mismo producto, edición de origen y ubicación se acumularán en un único registro y tendrán estado `Disponible`, `Consumido` o `Descartado`; no se convertirán en elementos de inventario.

El producto tendrá dos superficies de acceso:

- **Pública:** información y contenidos que la peña decida mostrar a cualquier visitante sin iniciar sesión.
- **Privada:** gestión económica, organización interna, álbumes restringidos y demás información disponible sólo para miembros según sus permisos.

En el MVP, la superficie pública se limitará a información general de la peña. Presupuestos, compras, catering, inventario, sobrantes, derramas y demás datos internos no serán públicos. La visibilidad pública de álbumes se decidirá más adelante.

La información general pública sólo podrá modificarla el administrador durante el MVP. Incluirá una página de presentación con el logo de la peña, secciones de contenido configurables, su historia, su descripción y enlaces a las redes sociales de la peña como formas de contacto. El logo no se podrá cambiar desde la aplicación inicialmente. No habrá formulario público de contacto inicialmente. El administrador podrá configurar desde la aplicación qué redes aparecen y sus enlaces; cada entrada tendrá un nombre, una URL personalizada y un estado activo/inactivo para ocultarla sin borrarla. Cada sección tendrá título, texto con formato básico, imagen opcional, orden y estado visible/oculto; el administrador podrá crear, eliminar, ocultar y editar secciones, además de subir esas imágenes desde la aplicación.

Los permisos deberán controlar tanto el acceso a módulos como la capacidad de leer, crear, modificar, publicar o administrar cada tipo de contenido.

Las tres áreas funcionales compartirán el mismo sistema de identidad, inicio de sesión y sesión activa. El usuario no tendrá que autenticarse de nuevo al pasar entre gestión, fotos y catering; la autorización seguirá evaluándose de forma independiente para cada área.

La lista de compras será específica de cada edición. Los productos previstos no formarán parte de un catálogo global compartido entre años. Cada producto tendrá una única asignación operativa principal, que podrá apuntar a un miembro, a un momento/día de compra, a un lugar/tienda o quedar sin asignar inicialmente. Cada edición podrá configurar sus propios momentos o días de compra, como `Compra sábado` o `Compra con tiempo`, para utilizarlos como asignaciones. Estos momentos serán etiquetas con nombre configurable y no requerirán una fecha concreta.

La lista ofrecerá búsqueda y filtros por estado, categoría, tienda y asignación. El usuario podrá elegir cómo agrupar visualmente los productos: por categoría, tienda, asignación o estado, sin alterar los datos. Dentro de cada grupo, los productos podrán ordenarse por descripción, precio unitario, cantidad o total, alternando entre orden ascendente y descendente. Cada miembro conservará sus preferencias para futuras sesiones mediante una combinación de preferencias generales y preferencias por edición: la agrupación y el orden serán generales por usuario, mientras que la búsqueda y los filtros serán específicos de cada edición.

Los lectores podrán consultar todos los productos y sus detalles. Sólo los editores de compras y el administrador podrán crear o modificar productos de la lista. Los productos no se eliminarán: cuando dejen de ser necesarios se conservarán y se marcarán con un estado de no compra. Los estados iniciales serán `Pendiente`, `Comprado`, `No se compra este año` y `Regalado`.

La cantidad de un producto podrá ser entera o decimal, para admitir unidades fraccionarias y productos vendidos por peso, con un máximo de dos decimales. Se permitirá el valor `0`, aunque la forma recomendada de indicar que un producto no se compra será el estado `No se compra este año`. También se permitirán cantidades negativas para representar devoluciones; en esos casos el total calculado podrá ser negativo y será obligatoria una nota explicando el motivo.

El precio unitario también admitirá decimales, incluido `0,00 €` para productos regalados o sin coste. El total previsto de cada producto se calculará automáticamente como `cantidad × precio unitario` y será de sólo lectura; no se podrá editar manualmente.

Un producto podrá crearse inicialmente como pendiente sin descripción, cantidad, precio o categoría informados, para completarlos más adelante. Mientras falte cualquiera de los valores necesarios para calcularlo, el total se mostrará vacío y no como `0 €`.

La moneda del sistema será exclusivamente el euro (€). Los precios unitarios se almacenarán y mostrarán con dos decimales.

Se podrán copiar productos de una edición anterior a una nueva. La copia incluirá descripción, categoría, tienda, cantidad, notas, responsable, estado y el valor anterior. La copia conservará el valor de la edición anterior como referencia histórica y la nueva edición tendrá su propio valor editable, que podrá actualizarse con el precio real observado para mantener el presupuesto vivo. El valor histórico no se sobrescribirá al modificar el valor de la nueva edición.

Crear una nueva edición/año será una opción explícita de la aplicación. Durante ese proceso se podrá copiar de una vez toda la lista de compras de la edición anterior, en lugar de tener que copiar productos individualmente. También se podrá crear la edición vacía; copiar será el flujo habitual, pero no obligatorio. Se podrá elegir cualquier edición anterior como origen de la copia y la edición más reciente aparecerá seleccionada por defecto.

Una edición podrá cerrarse al finalizar el año y sólo el administrador podrá ejecutar ese cierre. Al cerrarse, quedará bloqueada para cualquier modificación por parte de miembros y editores, pero seguirá disponible en modo lectura para los miembros, incluyendo sus presupuestos, compras, catering, fotos y documentos. Sólo el administrador podrá reabrirla excepcionalmente si fuera necesario corregir o completar información.

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
- Cada miembro tendrá un `id` interno permanente e inmutable que se utilizará para relacionar todos sus datos históricos.
- El miembro podrá cambiar desde su perfil su nombre visible y su nombre de usuario.
- El nombre de usuario seguirá siendo único y el sistema comprobará que no esté ocupado antes de guardarlo.
- El miembro podrá cambiar su contraseña desde el perfil en cualquier momento.
- No se exigirá una longitud mínima para las nuevas contraseñas, pero nunca podrán estar vacías; las demás reglas de validación quedan pendientes de definir.
- La recuperación de acceso será manual durante la primera etapa y la gestionaremos nosotros.
- Un restablecimiento manual asignará una nueva contraseña temporal y volverá a exigir el cambio en el siguiente inicio de sesión.
- No será obligatorio almacenar un email para recuperar la cuenta en esta primera etapa.

## 5. Principios iniciales

- La base de datos será la fuente de verdad operativa.
- Las reglas importantes no dependerán de nombres de columnas, posiciones de celdas ni fórmulas ocultas.
- Todo dato operativo estará vinculado a una edición concreta cuando corresponda.
- Los permisos se comprobarán en servidor y en la base de datos, no sólo en la interfaz.
- Las acciones relevantes quedarán auditadas.
- El historial guardará el `id` del miembro que realizó cada acción y mostrará su nombre actual al consultarlo, aunque el nombre haya cambiado después.
- La importación conservará trazabilidad hacia el dato original.
- El producto se diseñará para evolucionar a nuevas ediciones sin copiar hojas ni código.
- Lo público se publicará explícitamente; el contenido privado será la opción segura por defecto.
- Las fotos y otros contenidos tendrán visibilidad configurable; los álbumes no dependerán de la edición anual.

## 6. Decisiones pendientes

Esta lista se mantiene deliberadamente corta. Las decisiones ya confirmadas durante el interrogatorio se consideran requisitos, aunque todavía puedan necesitar criterios de aceptación y diseño técnico.

### Producto y permisos

- matriz completa de permisos por área para administrador, editores, lectores y miembros;
- alcance exacto de las capacidades de los editores de presupuesto, compras/inventario y catering;
- qué información puede consultar cada rol en cada área, especialmente pagos, tickets y datos históricos;
- detalles restantes del ciclo de vida operativo de una edición y de sus datos cerrados.

### Cuentas y seguridad

- procedimiento concreto para provisionar, desactivar, reactivar y recuperar cuentas manuales;
- reglas adicionales de contraseñas, sesiones, bloqueo y protección frente a intentos repetidos;
- registro y revisión de acciones administrativas y cambios sensibles.

### Presupuesto y datos económicos

- modelo definitivo de reembolsos y otros ajustes económicos;
- reglas exactas para ingresos, gastos manuales, saldos, cuotas y pagos en los totales;
- criterios de aceptación para cierres, reaperturas y correcciones excepcionales.

### Fotos y documentos

- proveedor de almacenamiento de fotos, tickets y justificantes;
- modelo de álbumes, visibilidad pública y publicación de fotos;
- límites de tamaño, formatos, eliminación y conservación de archivos.

### Migración y tecnología

- estrategia de importación, limpieza y validación del Excel;
- modelo relacional definitivo y migraciones iniciales;
- stack de frontend, backend, base de datos, autenticación y almacenamiento;
- despliegue, copias de seguridad, observabilidad y pruebas;
- criterios de aceptación y alcance exacto del MVP.

## 7. Criterio de trabajo SDD

Cada funcionalidad nueva deberá tener antes:

1. objetivo de usuario;
2. reglas de negocio;
3. criterios de aceptación;
4. impacto en datos y permisos;
5. estrategia de pruebas.

No se considera cerrada una funcionalidad sólo porque se vea bien en pantalla.
