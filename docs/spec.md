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

En el área de presupuesto, los lectores podrán consultar los totales de la edición y el detalle individual de cuotas y pagos de los miembros. Las cuotas y los pagos sólo podrán modificarlos los editores de presupuesto y el administrador. Los editores de presupuesto también podrán crear y configurar las tarifas de cada edición, asignarlas a los miembros participantes, marcar qué miembros participan o no participan económicamente en esa edición y registrar el saldo inicial o sobrante procedente de años anteriores. Una edición podrá tener varias entradas de saldo, y cada entrada conservará importe, concepto y año de origen. Además, se podrán registrar ingresos y gastos manuales independientes de las cuotas, saldos y compras. Cada movimiento manual tendrá fecha, concepto y notas, y podrá incluir archivos adjuntos como justificantes. Los ingresos manuales serán positivos y los gastos manuales negativos. Los editores de presupuesto podrán editar y eliminar definitivamente movimientos manuales. La eliminación quedará registrada en auditoría aunque el movimiento desaparezca de la vista normal. Las cuotas tendrán estados `Pendiente`, `Parcial` y `Pagado`, y un miembro podrá realizar varios pagos parciales hasta completarlas. Cada pago registrará fecha, importe, notas y método de pago, que pertenecerá a una lista fija con `Efectivo`, `Bizum` y `Transferencia`; los pagos sólo admitirán importes positivos o cero y podrán corregirse directamente. Se permitirán pagos cuya suma supere el importe de la cuota: el exceso quedará como saldo general a favor dentro de la edición actual y no se descontará automáticamente de la cuota futura del mismo miembro. Sólo el administrador podrá decidir y ejecutar el traslado de ese saldo a la siguiente edición; el traslado se registrará como una nueva entrada de saldo con concepto y edición de origen. También se podrán registrar devoluciones de cuotas como movimientos económicos independientes vinculados al miembro y a su cuota. Las devoluciones tendrán fecha, importe, notas y método, serán importes negativos, podrán ser parciales o dividirse en varios movimientos y podrán corregirse directamente. El importe neto pagado se calculará sumando pagos y devoluciones; el estado será `Pagado` cuando el neto sea igual o superior al importe de la cuota, y se recalculará automáticamente. Las devoluciones acumuladas no podrán superar los pagos acumulados de la cuota; si una devolución reduce un exceso, el saldo general a favor se recalculará automáticamente. Todas estas modificaciones seguirán generando auditoría con valor anterior y nuevo.

Los pagos y las devoluciones no podrán eliminarse; sólo podrán corregirse directamente por los editores de presupuesto o el administrador.

Los lectores podrán consultar el detalle de pagos y devoluciones, incluidos sus métodos. Los editores de presupuesto podrán modificarlos mientras la edición esté abierta; una edición cerrada deberá reabrirse antes de cualquier modificación.

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

Crear una nueva edición/año será una opción explícita de la aplicación. Durante ese proceso se podrá copiar de una vez toda la lista de compras de la edición anterior, en lugar de tener que copiar productos individualmente. También se podrá crear la edición vacía; copiar será el flujo habitual, pero no obligatorio. Se podrá elegir cualquier edición anterior como origen de la copia y la edición más reciente aparecerá seleccionada por defecto. Los permisos de la edición de origen se copiarán automáticamente a la nueva edición.

Una edición podrá cerrarse al finalizar el año y sólo el administrador podrá ejecutar ese cierre. Al cerrarse, quedará bloqueada para cualquier modificación por parte de miembros y editores, pero seguirá disponible en modo lectura para los miembros, incluyendo sus presupuestos, compras, catering, fotos y documentos. Sólo el administrador podrá reabrirla excepcionalmente si fuera necesario corregir o completar información. El cierre y la reapertura no exigirán un registro específico en el historial ni un motivo obligatorio.

### Roles iniciales

- **Administrador:** reservado inicialmente al propietario de la peña. Puede gestionar la configuración global, usuarios, roles, permisos y cualquier contenido.
- **Editor:** asignado inicialmente a 2 o 3 personas de confianza. Puede modificar los módulos y contenidos que se le autoricen, pero no administrar cuentas ni cambiar la configuración global salvo decisión posterior.
- **Lector:** miembros con acceso privado de consulta. Puede ver presupuestos y otros contenidos internos permitidos, pero no modificar datos.

El acceso público anónimo no será un rol de miembro: será una superficie separada para contenidos publicados explícitamente.

Los permisos de edición y consulta serán específicos por área, módulo y edición. No habrá un único editor global: una persona podrá editar presupuesto, otra compras, otra catering y otras áreas, con posibles combinaciones entre módulos. Un lector también podrá tener acceso limitado a unas áreas y no a otras. Un mismo miembro podrá tener roles distintos según el área y la edición, por ejemplo editor de presupuesto en una edición y lector en otra. Un editor tendrá también acceso de lectura completo al área que edita. Si un miembro no tiene ningún permiso asignado para un área, el acceso se denegará por defecto. La subida de fotos será una capacidad común de todos los miembros, no un permiso reservado a editores. La autorización efectiva dependerá de la combinación miembro + edición + área/módulo + capacidad.

Durante la primera etapa no habrá registro público ni panel de administración para dar de alta miembros. La provisión de usuarios se hará manualmente con ayuda del propietario, mediante un procedimiento controlado del proyecto. Esto no elimina los roles ni los permisos de uso: sólo deja fuera de la interfaz la gestión administrativa de cuentas.

Las asignaciones de roles y permisos por área se configurarán manualmente con ayuda del propietario durante la primera etapa, sin panel de administración. Sólo el administrador podrá modificarlas.

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
- Las acciones relevantes quedarán auditadas, incluyendo cambios de presupuesto, compras, catering e inventario, además de cambios de perfil y de la asistencia propia al catering.
- El historial guardará el `id` del miembro que realizó cada acción y mostrará su nombre actual al consultarlo, aunque el nombre haya cambiado después.
- El historial de cambios será visible únicamente para el administrador.
- El administrador podrá filtrar el historial por miembro, área, tipo de acción y fecha.
- Los registros del historial serán inmutables y no podrán editarse ni borrarse desde la aplicación.
- El historial no se podrá exportar en el MVP.
- Cada acción conservará fecha y hora exactas.
- Los cambios de datos conservarán el valor anterior y el valor nuevo.
- Las fechas del historial se mostrarán en horario de España peninsular.
- Cada acción registrará también el área o módulo de origen.
- Cada registro de auditoría identificará la entidad y el registro concreto afectados.
- Una operación que cambie varios campos generará un registro separado por cada campo modificado.
- El historial no guardará dirección IP ni información del dispositivo.
- Las acciones automáticas del sistema no generarán registros de auditoría.
- La migración se documentará mediante scripts e informes, pero la aplicación no conservará referencias detalladas a hoja, fila o columna del Excel.
- El producto se diseñará para evolucionar a nuevas ediciones sin copiar hojas ni código.
- Lo público se publicará explícitamente; el contenido privado será la opción segura por defecto.
- Las fotos y otros contenidos tendrán visibilidad configurable; los álbumes no dependerán de la edición anual.

## 5.1 Decisiones técnicas iniciales

- La aplicación se desplegará en Vercel.
- La base de datos será PostgreSQL gestionada con Neon e integrada con Vercel.
- La autenticación será propia de la aplicación, con nombres de usuario, contraseñas, sesiones y recuperación manual.
- La API será la puerta de entrada principal a los datos y concentrará las reglas de negocio, permisos y auditoría.
- La API se expondrá mediante Route Handlers de Next.js con una interfaz REST explícita.
- El frontend y la API se implementarán como una aplicación única de Next.js con TypeScript.
- Los estilos del frontend usarán CSS Modules por componente y un `globals.css` limitado a variables de diseño y estilos base; no se adoptará un framework CSS externo en el MVP.
- Las listas privadas y administrativas seguirán un patrón visual común de filas compactas y reutilizables: contenido principal a la izquierda, metadatos y roles visibles en el primer vistazo, y acciones con iconos accesibles a la derecha.
- Este patrón se implementará mediante componentes compartidos, no mediante estilos o estructuras duplicadas por pantalla. Las variantes sólo añadirán el comportamiento propio de cada módulo.
- Los roles se mostrarán con una presentación homogénea (`Administrador`, `Editor` o `Lector`) y los botones de acción tendrán siempre nombre accesible, estado visible y comportamiento responsive.
- El acceso a Neon y las migraciones se gestionarán con Drizzle ORM.
- Se usará una única base de datos Neon de producción; no se crearán ramas persistentes de Neon para previews.
- Las sesiones se persistirán en Neon para poder invalidarlas al desactivar miembros.
- Los tickets y justificantes se almacenarán en Vercel Blob privado; Neon conservará sus metadatos y referencias.
- El desarrollo y las pruebas se realizarán directamente contra producción, principalmente desde dispositivos móviles.
- Se programarán copias locales cifradas de la base de datos desde el PC mediante cron, con una periodicidad diaria y una retención inicial de 30 días.
- No habrá usuarios ni ediciones de prueba: se trabajará desde el inicio con los usuarios y datos reales.
- Los cambios de esquema y despliegues deberán diseñarse para ser controlados y reversibles cuando sea posible.
- Las migraciones se ejecutarán manualmente y se verificarán antes del despliegue de la versión que las necesite.
- Sentry u otro servicio externo de monitorización de errores queda fuera del MVP y se estudiará más adelante.
- Vercel desplegará producción automáticamente a partir de cambios publicados en `main`.
- El desarrollo seguirá TDD y BDD: primero se definirán comportamiento y pruebas, y después la implementación.
- Vitest cubrirá las pruebas unitarias y de integración, y Playwright las pruebas de comportamiento completas, incluyendo el uso móvil.
- La rama `main` estará protegida y exigirá que las comprobaciones automáticas terminen correctamente antes de publicar.
- Las contraseñas se almacenarán usando Argon2id.
- Las sesiones usarán cookies `HttpOnly`, `Secure` y `SameSite`, con limitación de intentos de inicio de sesión.
- La API mantendrá un contrato JSON uniforme con las claves `success`, `data` y `error`, incluyendo códigos de error definidos.
- Los roles y permisos se almacenarán en Neon y se aplicarán por área y edición, no mediante reglas del frontend.
- La API se versionará desde `/api/v1`.
- El navegador no accederá directamente a Neon; todo acceso a datos pasará por la API del servidor.
- Las entidades principales tendrán UUID como identificador técnico inmutable.
- Los eventos con hora se almacenarán con `timestamptz`, normalizados en UTC, y se mostrarán en `Europe/Madrid`; los datos sin hora usarán `date`.
- Los importes económicos se almacenarán directamente en euros mediante `NUMERIC(12,2)`; las cantidades de productos usarán valores numéricos con un máximo de dos decimales.
- Cada modificación y su registro de auditoría se ejecutarán dentro de la misma transacción de base de datos.
- La importación inicial del Excel se realizará mediante un script privado con validación previa e informe de errores; no existirá una función de importación expuesta en la aplicación.
- Las entradas de la API se validarán con Zod antes de ejecutar la lógica de negocio.
- Las restricciones críticas también se declararán en PostgreSQL, incluyendo unicidad, relaciones, importes válidos y estados permitidos.
- El backend seguirá una arquitectura hexagonal pragmática: dominio y casos de uso independientes de Next.js, Neon, Drizzle, Vercel Blob y cookies.
- Los Route Handlers actuarán como adaptadores de entrada; Drizzle/Neon, Vercel Blob y la gestión de sesiones serán adaptadores de salida mediante puertos explícitos.
- La documentación OpenAPI describirá la API `/api/v1` y permitirá compartir o generar tipos entre API y frontend.
- El dominio se organizará en módulos ampliables: identidad, ediciones, presupuesto, compras/inventario, catering, contenido público y auditoría.
- Cada módulo tendrá sus propios casos de uso, validadores, repositorios y pruebas, manteniendo sus reglas separadas.
- La incorporación posterior de nuevos módulos no requerirá modificar un servicio central monolítico.
- El contenido público de baja frecuencia se generará de forma estática y se revalidará al publicar cambios desde administración.
- Las páginas públicas estáticas podrán conservarse en caché offline para consulta sin conexión.
- La PWA sólo cacheará páginas públicas y recursos estáticos versionados; no cacheará sesiones, API privada, permisos, datos económicos ni tickets.
- Las rutas autenticadas requerirán conexión con el servidor y las cachés del service worker tendrán versionado, limpieza automática y un mecanismo de recuperación controlado.
- Las actualizaciones del service worker se validarán en pruebas móviles y no exigirán al usuario borrar todos los datos de navegación.
- Si la aplicación detecta una versión nueva, mostrará la actualización y bloqueará el uso hasta completarla; sin conexión podrá seguir funcionando con la última versión instalada y aprobada.
- Se permitirá una cola offline limitada para operaciones de compras, lista e inventario, excluyendo pagos y devoluciones.
- Las operaciones pendientes se sincronizarán al recuperar conexión mediante identificadores idempotentes; los conflictos no se sobrescribirán automáticamente y quedarán para resolución manual.
- La aplicación mostrará las operaciones pendientes de sincronización con su estado, error y posibilidad de reintento.
- Las fotografías de tickets y justificantes sólo se subirán con conexión; no se encolarán archivos offline.
- La cola offline se almacenará en IndexedDB mediante Dexie.
- Las operaciones pendientes se conservarán hasta su sincronización correcta o resolución explícita; no caducarán automáticamente.
- La caducidad de la sesión no eliminará operaciones offline pendientes; será necesario volver a autenticarse para sincronizarlas.
- La aplicación reintentará automáticamente la sincronización al recuperar conexión, con límites y control de errores para evitar repeticiones infinitas.
- Las sesiones tendrán una duración máxima de 30 días renovables mientras se use la aplicación, y se revocarán al cerrar sesión o desactivar al miembro.
- Las operaciones offline pendientes permanecerán asociadas a su cuenta al cerrar sesión; al volver a entrar se mostrará un aviso antes de reanudar la sincronización.
- Un usuario podrá mantener sesiones simultáneas en varios dispositivos.
- El perfil ofrecerá una acción para cerrar todas las sesiones activas.
- El identificador de sesión se rotará después del inicio de sesión y del cambio de contraseña.
- Al cambiar la contraseña se revocarán las demás sesiones y se conservará únicamente la sesión actual.
- La auditoría se registrará desde la capa de casos de uso dentro de la misma transacción que el cambio, incluyendo usuario, área, entidad, campo, valor anterior y nuevo.
- PostgreSQL será la autoridad final para fechas, importes, estados y relaciones; el frontend se ocupará de la presentación y la interacción.
- Las operaciones sensibles comprobarán los permisos en el servidor contra Neon; el frontend sólo adaptará la interfaz y nunca será la autoridad.
- Las zonas privadas de miembros y de administración tendrán rutas y protección diferenciadas, aunque compartan la misma sesión.
- Los archivos privados se servirán mediante URLs temporales generadas por la API después de comprobar permisos.
- Las URLs temporales de lectura de archivos privados caducarán inicialmente a los 10 minutos.
- Neon sólo será accesible desde el servidor; sus credenciales se mantendrán en secretos de Vercel y nunca llegarán al navegador.
- Las subidas de archivos serán autorizadas por la API y se realizarán directamente desde el cliente a Vercel Blob; el registro en Neon sólo se confirmará después de validar la subida.
- Los tickets admitirán inicialmente PDF, JPG, PNG y WEBP, con un tamaño máximo de 10 MB por archivo.
- Al eliminar un ticket se eliminará también su archivo de Vercel Blob y la acción quedará registrada en auditoría.
- No habrá sustitución directa de archivos: para cambiar un ticket se eliminará el anterior y se subirá uno nuevo.
- Las subidas validarán el tipo real del archivo, no sólo su extensión o el MIME declarado.
- Se rechazarán archivos dañados o que no puedan abrirse como PDF o imagen válida.
- Las copias locales cubrirán inicialmente la base de datos; la copia de archivos de Vercel Blob se estudiará en una fase posterior.
- Los tickets y justificantes se conservarán indefinidamente hasta su eliminación explícita por un editor o administrador.
- Los estados funcionales se definirán en el dominio y se reforzarán en PostgreSQL mediante restricciones `CHECK`, evitando enums rígidos de base de datos.
- Las búsquedas, filtros y ordenaciones se resolverán mediante la API, no descargando siempre todos los registros al móvil.
- Las listas de la API usarán paginación desde el inicio.
- El contenido público y la carga inicial de lectura usarán Server Components; los Client Components se reservarán para interacción, formularios, filtros y sincronización offline.
- La aplicación será mobile first, instalable como PWA y usará TanStack Query para caché, reintentos y sincronización del frontend.
- La primera shell de navegación tendrá un menú lateral compartido entre las superficies públicas y privadas; al abrirlo, el contenido principal se desplazará para revelar el menú situado detrás.
- El menú ofrecerá una entrada visible a la pantalla de inicio de sesión, que usará el contrato REST de autenticación y no expondrá credenciales al cliente más allá del envío HTTPS necesario.
- Tras el login, una cuenta con cambio obligatorio pendiente sólo podrá acceder al flujo de cambio de contraseña; al completarlo, la sesión se rotará y la cuenta quedará activada para el acceso normal.
- El menú mostrará el nombre visible de la persona autenticada y permitirá cerrar su sesión actual.
- Las listas móviles podrán paginarse mediante cursor y las tablas administrativas mediante `page/limit`, según la experiencia de cada pantalla.
- Cada operación offline tendrá un `operationId` único persistido en Neon para impedir duplicados durante los reintentos.
- Antes de implementar los hitos se configurará Codex mediante un `AGENTS.md` raíz y, cuando sea útil, instrucciones específicas por módulo.
- Las instrucciones de Codex cubrirán arquitectura, SDD, Git, producción, seguridad, TDD/BDD y validaciones obligatorias.
- Se podrán organizar agentes especializados para backend, frontend, datos/migraciones y QA, coordinados por el flujo común del proyecto.
- Ningún agente realizará commits, pushes, cambios destructivos ni operaciones sobre producción sin autorización explícita.
- Los editores se separarán por área: presupuesto, compras/inventario y catering; el administrador tendrá acceso global.
- En catering todos los miembros podrán consultar la asistencia de todos; los editores del área y el administrador podrán modificarla según las reglas definidas.
- En catering todos los miembros podrán consultar también los pagos individuales; sólo los editores de catering y el administrador podrán modificarlos.
- En compras e inventario todos los miembros podrán consultar listas, compras reales, inventario y sobrantes; sólo los editores del área y el administrador podrán modificarlos.
- En compras todos los miembros podrán consultar los tickets; sólo los editores de compras y el administrador podrán subirlos o eliminarlos.
- Un editor de catering sólo podrá modificar catering; un editor de presupuesto sólo presupuesto; y un editor de compras sólo compras/inventario.
- Una misma persona podrá ser editora de varias áreas.
- El rol de editor incluirá automáticamente permisos de lectura en su propia área.
- Los permisos de edición se asignarán por área y edición; una persona podrá editar un área en una edición y no tener ese permiso en otra.
- Retirar un permiso no modificará los datos ni la auditoría de los cambios realizados anteriormente.
- Los miembros activos podrán leer todas las áreas y ediciones, incluidas las cerradas, salvo los datos expresamente reservados.
- Un miembro desactivado perderá inmediatamente todo acceso a áreas, ediciones históricas y contenidos privados.
- El acceso anónimo se limitará al contenido público publicado y no permitirá consultar áreas internas ni tickets.
- Sólo el administrador podrá modificar el logo, la historia, las secciones públicas y los enlaces de redes sociales.
- El saldo económico de una edición se calculará como ingresos menos gastos, incluyendo cuotas cobradas, devoluciones, saldos trasladados, ingresos y gastos manuales y compras reales.
- Las compras reales y sus tickets afectarán al saldo de la edición correspondiente.
- La aplicación mostrará por separado un saldo previsto y un saldo real; sus componentes exactos se definirán en el modelo económico.
- Las compras reales podrán corregirse o eliminarse sólo por editores de compras y administrador, manteniendo la auditoría correspondiente.
- El saldo previsto contará como ingresos las cuotas asignadas, los saldos iniciales y los ingresos previstos, aunque aún no estén cobrados.
- Catering tendrá saldos previsto y real propios, separados del presupuesto general de la edición.
- El gasto previsto general incluirá los totales de la lista de compra prevista y los gastos manuales previstos.
- El saldo real general sólo incluirá compras reales y movimientos económicos registrados; los productos aún no comprados no afectarán al saldo real.
- El gasto previsto de compras excluirá productos marcados como `No se compra este año` o `Regalado`.
- El gasto previsto de cada producto se calculará como cantidad por precio unitario previsto, con los importes válidos disponibles.
- Un producto marcado como `Comprado` seguirá contando en el saldo previsto hasta que exista una compra real registrada.
- La lista de compra tendrá también el estado `En carrito`; se podrá introducir el precio real del producto antes del pago sin afectar todavía al saldo real.
- Al pagar, se registrará una única compra real con su importe total y tickets, y los productos correspondientes se marcarán como `Comprado`.
- El importe total de la compra real será la cifra oficial del gasto y la suma de precios reales de productos sólo servirá para control y detección de diferencias, sin duplicar el gasto.
- Al registrar una compra real se podrán seleccionar varios productos `En carrito`, marcarlos como `Comprado` y vincularlos a la compra en una sola operación.
- Un producto no podrá pasar a `Comprado` sin precio real informado.
- La lista conservará cantidad prevista y cantidad real para comparar diferencias.
- Una compra real podrá incluir productos y tickets de distintas tiendas.
- Los gastos manuales previstos serán movimientos independientes con importe, concepto, fecha estimada, notas y adjuntos.
- Los ingresos previstos, aparte de cuotas y saldos, también podrán registrarse como movimientos independientes.
- Los movimientos previstos se conservarán cuando exista un movimiento real relacionado; podrán revisarse sin perder el importe original.
- Los movimientos previstos y reales serán registros independientes, enlazables entre sí, y la aplicación podrá mostrar la desviación frente a la previsión original y la revisada.
- Las correcciones de previsiones y movimientos reales conservarán valores anteriores y nuevos mediante auditoría.
- El importe real de una compra será siempre el introducido manualmente; los tickets no lo modificarán automáticamente.
- Como mejora futura, la IA analizará los tickets para detectar posibles discrepancias entre documentos e importes registrados, generando avisos sin modificar datos automáticamente.
- Cualquier resultado de IA requerirá confirmación manual de un editor de compras o del administrador antes de convertirse en un dato funcional.
- Sólo los editores de compras y el administrador podrán ejecutar y consultar el análisis de tickets.
- La confirmación o el rechazo de una propuesta de IA se registrará en auditoría.
- Un fallo del análisis de IA no impedirá consultar ni gestionar normalmente el ticket o la compra.
- La entidad `edición` será el eje de los datos anuales de presupuesto, compras, catering, inventario y sobrantes.
- Miembros, cuentas, álbumes y contenido general serán entidades transversales y no dependerán de una edición, salvo sus relaciones específicas de participación o visibilidad.
- La migración inicial importará todos los datos útiles del Excel: miembros, edición 2026, catering, derramas, inventario, sobrantes e historial, con limpieza manual cuando sea necesaria.
- También se importarán los Excel de 2025 y de años anteriores disponibles, convirtiendo cada año aplicable en su edición histórica correspondiente.
- El modelo separará miembro, cuenta de acceso y participación en edición; desactivar una cuenta no eliminará el miembro ni su historial.
- Las variaciones históricas de nombre se resolverán manualmente para vincularlas al mismo miembro cuando corresponda.
- El historial de cambios antiguo del Excel no se importará como auditoría funcional; sólo se migrarán los datos de negocio.
- Cuando falten datos en un Excel histórico, se importará lo disponible, se dejarán vacíos los campos ausentes y se incluirá el caso en el informe de migración.
- Las ediciones históricas importadas quedarán cerradas desde el inicio; sólo el administrador podrá reabrirlas.
- Los miembros podrán consultar las ediciones históricas cerradas según sus permisos normales de lectura.
- La migración creará primero las ediciones históricas y después cargará cada registro vinculado a su año correspondiente.
- Los campos opcionales ausentes se importarán vacíos; la ausencia de campos imprescindibles será un error bloqueante para el registro afectado.
- Los conflictos graves impedirán importar sólo el registro afectado; la migración continuará con el resto y los detallará en el informe.
- La migración será idempotente y podrá repetirse sin duplicar registros ya importados.
- Las ediciones históricas se procesarán por separado, validando cada una antes de continuar con la siguiente.
- Se mantendrá un archivo privado de correspondencias entre nombres históricos y UUID actuales de miembros para repetir la migración sin duplicados; permanecerá fuera de Git y del repositorio público.
- Tras cada edición importada se revisará manualmente el informe antes de marcarla como migrada correctamente.
- La migración creará cuentas de acceso para los miembros activos, con la contraseña inicial acordada y cambio obligatorio en el primer inicio de sesión.
- Los nombres de usuario iniciales se generarán a partir de los datos de la migración; la cuenta administradora se identificará y asignará manualmente después.
- Si el nombre de usuario generado ya existe, se añadirá un sufijo automático para mantener la unicidad.
- Los miembros inactivos se importarán sin cuenta de acceso; podrán recibir una cuenta posteriormente si se reactivan.
- Las colisiones de nombres de usuario se resolverán con sufijos numéricos consecutivos, como `usuario`, `usuario2` y `usuario3`.
- La creación inicial generará un informe privado con usuario, miembro y contraseña temporal para su entrega manual; no se guardará en Git.
- El informe de credenciales inicial se eliminará de forma segura después de entregar las credenciales.
- Los nombres de usuario se normalizarán en minúsculas, sin espacios ni tildes, manteniendo su unicidad.
- Al cambiar un nombre de usuario, el anterior quedará libre para reutilizarse.
- Los cambios de nombre de usuario y nombre visible se registrarán en auditoría asociados al UUID inmutable del miembro.
- Al desactivar un miembro se revocarán inmediatamente todas sus sesiones y se bloqueará la sincronización de sus operaciones offline pendientes.
- La recuperación manual generará una contraseña temporal nueva, obligará a cambiarla en el siguiente acceso y eliminará de forma segura el registro privado de entrega.
- Después de 3 intentos fallidos de acceso se bloqueará la cuenta; sólo un administrador podrá desbloquearla.
- Neon almacenará únicamente hashes de tokens de sesión; el token real permanecerá en la cookie segura del dispositivo.
- Un inicio de sesión correcto reiniciará el contador de intentos fallidos.
- Al desbloquear una cuenta se revocarán sus sesiones existentes y será necesario iniciar sesión de nuevo.
- Los bloqueos y desbloqueos de cuentas se registrarán en auditoría.
- Sólo el administrador podrá modificar roles y permisos; no se exigirá una segunda confirmación administrativa para aplicarlos.
- Las acciones destructivas del administrador mostrarán una confirmación explícita en la interfaz.
- El administrador no podrá quitarse a sí mismo el último rol de administrador.
- La migración tendrá primero un modo de análisis sin escritura que generará un informe de duplicados, datos incompletos y conflictos.
- Los posibles duplicados de miembros se resolverán manualmente y no se fusionarán automáticamente.
- La participación de un miembro en una edición será una relación independiente de su cuenta y de su participación económica o de catering.
- La primera pantalla operativa de participantes permitirá consultar todos los miembros y activar o desactivar su participación anual sólo a administradores y editores de ediciones, mientras la edición permanezca abierta.
- El panel de administración permitirá consultar todos los miembros y editar su nombre visible, nombre de usuario y estado de acceso; sólo el administrador podrá realizar esos cambios y cada campo modificado quedará auditado.
- El Excel original permanecerá fuera de Git y del repositorio público; el repositorio sólo contendrá scripts, esquema y documentación de migración.

## 6. Decisiones pendientes

Esta lista contiene sólo decisiones no cerradas. Las decisiones aprobadas ya están recogidas en las secciones anteriores y no deben volver a tratarse como preguntas bloqueantes.

### Producto y permisos

- criterios de aceptación detallados para cada permiso y flujo;
- reglas excepcionales que puedan aparecer al probar cierres, reaperturas y cambios de permisos;
- comportamiento exacto de los datos previstos cuando se revisen varias veces.

### Cuentas y seguridad

- procedimiento operativo final para entregar credenciales y asignar la cuenta administradora;
- límites concretos de tamaño y duración de sesiones que no estén fijados por el modelo técnico;
- revisión de seguridad antes de la puesta en producción.

### Presupuesto y datos económicos

- modelo relacional definitivo de cuotas, pagos, devoluciones, saldos, movimientos previstos y reales;
- reglas de cálculo pendientes para casos límite de saldos, devoluciones y desviaciones;
- modelo de una compra real que agrupa productos y varias tiendas;
- criterios de aceptación de los saldos previsto y real.

### Fotos y documentos

- fotos y álbumes quedan expresamente pospuestos y no bloquearán el MVP económico/operativo;
- copia de seguridad de archivos de Vercel Blob, pospuesta para una fase posterior.

### Migración y tecnología

- recepción y análisis de todos los Excel históricos disponibles;
- modelo relacional definitivo, migraciones Drizzle y script idempotente de importación;
- ejecución segura del cron de copias de Neon desde el PC;
- observabilidad avanzada, incluido Sentry, pospuesta;
- criterios de aceptación finales y alcance cerrado del MVP.

### Mejoras posteriores al MVP

- análisis de tickets mediante IA y revisión de discrepancias;
- copias de seguridad de archivos de Vercel Blob;
- fotos, álbumes y su modelo de visibilidad;
- notificaciones y otros módulos todavía no especificados.

### Calidad y pruebas

- La ampliación de las pruebas E2E autenticadas de administrador y editor queda
  pospuesta hasta que la interfaz y los módulos principales hayan avanzado más.
- Cuando se retome, se preparará un entorno aislado con cuentas sintéticas y
  estados de sesión de Playwright; no se usarán credenciales ni datos de Neon
  Production en esas pruebas.

## 7. Criterio de trabajo SDD

Cada funcionalidad nueva deberá tener antes:

1. objetivo de usuario;
2. reglas de negocio;
3. criterios de aceptación;
4. impacto en datos y permisos;
5. estrategia de pruebas.

No se considera cerrada una funcionalidad sólo porque se vea bien en pantalla.

## 8. Estados de las especificaciones y definición de terminado

Cada requisito o funcionalidad tendrá uno de estos estados:

- `Propuesta`: idea pendiente de decisión.
- `Aprobada`: comportamiento acordado y descrito en el SDD, pero aún no implementado.
- `En desarrollo`: se está implementando mediante un hito.
- `Implementada`: el código existe y las pruebas previstas están escritas.
- `Verificada`: las pruebas automáticas pasan y se ha comprobado el comportamiento en el móvil cuando corresponda.
- `Cerrada`: el usuario ha revisado la funcionalidad y no quedan tareas asociadas.

Una especificación sólo se considerará terminada cuando esté en estado `Cerrada`. Para llegar ahí deberá tener reglas y criterios de aceptación definidos, implementación, pruebas TDD/BDD, validación técnica y revisión funcional. Las decisiones recogidas en este documento están aprobadas, pero no se considerarán implementadas hasta completar los hitos correspondientes.
