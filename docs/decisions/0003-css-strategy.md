# ADR 0003: Estrategia de estilos del frontend

Estado: Aprobada.

El frontend usará CSS Modules para los estilos propios de cada componente. El
archivo `src/app/globals.css` se reservará para variables de diseño, estilos
base, tipografía y reglas globales imprescindibles.

No se incorporará un framework CSS externo como Tailwind o Bootstrap durante el
MVP. Esta decisión mantiene los estilos aislados, reduce dependencias y deja la
interfaz preparada para evolucionar sin acoplarla a una convención concreta de
clases utilitarias.

Los componentes reutilizables deberán concentrar sus estilos en su propio
módulo CSS y utilizar los tokens globales cuando compartan color, espaciado,
tipografía, bordes o sombras.
