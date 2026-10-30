# Marca de GrowFolio (elegida el 21 oct 2026, aplicada en la 0.3.2)

- **Nombre de la app:** GrowFolio. La IA de dentro se llama GrowIA.
- **Letra:** Plus Jakarta Sans 800 en todo («Grow» y «Folio»). Desde la 0.3.2 es también la letra de toda la app (web y widget de Android), en lugar de Manrope.
- **La idea:** el último trazo de la w sube como una gráfica, acaba en pico y hace de palo de la F. En GrowIA, ese mismo trazo va pegado a una I inclinada (corte de arriba recto) y luego la A.
- **Color:** un solo degradado de oro a blanco, inclinado como el trazo de la w (sin escalón). En GrowFolio el paso a blanco ocurre en la unión w-F; en GrowIA el barrido va de la w a la A pasando por la I.
  - Paleta (de oro a blanco): #D7A033 · #EDBB45 · #F4CB66 · #F9DE9C · #FDF0D2 · #FFFDF6.
- **Acabado:** relieve (un filo de luz en el borde de arriba de cada letra) y un toque más oscuro abajo.
- **Icono de la app:** la wF recortada tal cual del nombre, sin brillos ni sombras añadidos, sobre un cuadro negro cálido (#24201A a #060605, con un poco de luz arriba a la izquierda).
- **Icono de GrowIA:** la wIA recortada tal cual de su nombre, con el mismo cuadro.
- Descartado: la carpeta con la gráfica (logo de la 0.2-0.3), estrellas tipo destello (se parecen a Gemini), letras dibujadas a mano.
- Los archivos fuente se generan con scripts de Python (shapely + fontTools) a partir de la fuente real.

## Dónde va cada cosa (0.3.2)

- **Archivos de la web:** favicon.svg y growfolio.svg (icono), growfolio-nombre.svg y growia-nombre.svg (nombres), growia.svg (icono de GrowIA), los PNG de siempre (16, 32, 180, 192, 512, maskable) y growfolio-aviso.png (silueta blanca para los avisos).
- **Cabecera de la web:** el nombre GrowFolio; cuando no cabe, solo el icono.
- **Entrada al abrir (unos 4,3 s, se salta tocándola):** la wF se dibuja de un trazo, en grande y en el centro, como una gráfica: un lápiz con luz baja, sube, baja y sube hasta la punta, donde da un destello. Llegan las dos barras de la F desde la derecha, encaja con un pequeño latido y queda con su relieve. Luego baja a su sitio en el nombre y «Gro» y «olio» salen de detrás de ella, con un brillo. Después «olio» y las barras se recogen, sale «IA» del palo, el degradado pasa al de GrowIA y la luz de detrás sube; y vuelve a GrowFolio. Debajo, el saludo por la hora.
- **Presentación:** los trozos de la wF se juntan al bajar y el nombre entra letra a letra.
- **GrowIA:** la wIA pequeña donde antes iba la chispa (Pregúntale, botones de Activar, avisos); su icono con cuadro cuando habla (asesor, tarjeta de Inicio, preguntas, Paso a paso); y su nombre con la letra del logo en sus títulos (cabecera del asesor, tarjeta de Inicio, «Activa GrowIA, gratis», «Lo que dice GrowIA», «GrowIA quiere saber», Ajustes). En el texto corrido se escribe normal.
- **Android:** icono adaptable (fondo negro cálido, la wF en la zona segura y versión monocroma para los iconos temáticos), icono de los avisos con la silueta y el widget con Plus Jakarta Sans. La imagen de ejemplo del selector de widgets no se ha cambiado.
- **La chispa** solo queda para lo que no es de la IA: Novedades, «Verlas en presentación» y el aviso de versión nueva.

## La interfaz «como el icono» (0.3.3)

- Solo los colores del logo: oro, negro cálido y blanco roto. El verde (#4CBF8E) y el rojo (#E46A5C) quedan para lo que sube y baja; el naranja (#E0955E) para Hacienda y avisos. El calendario dejó el azul y el rosa. La pastilla de GTA VI sigue en neón (decisión de Carlos).
- **Tarjetas:** losetas de negro cálido (#221E18 arriba a #100E0B), con un filo dorado fino (rgba(255,231,176,0.16)), una línea de luz arriba y un brillo cálido arriba a la izquierda, como el cuadro del icono. Las que antes llevaban raya de oro a la izquierda (plan de venta, informe, lo que toca) tienen ahora el filo entero más dorado; las destacadas (lo primero de Paso a paso, hoy en el calendario) un brillo más fuerte. Las cajitas dentro de una tarjeta van planas o hundidas, nunca loseta sobre loseta.
- **Lo elegido** (pestañas, segmentos, plazos de la gráfica, idioma, barra de abajo) se marca en oro: fondo dorado suave, texto #F9DE9C y filo dorado.
- **Botones:** el principal con el degradado del logo (#F9DE9C, #EDBB45, #D7A033) y texto oscuro; el resto, losetas pequeñas con filo. El botón de Inicio del móvil, con el mismo degradado.
- **Cifras grandes** en blanco roto (#F7F2E8).
- Los tokens están al final del CSS de index.html, en el bloque «Como el icono (0.3.3)», para que manden sobre lo anterior.

## Aviso de versiones nuevas (0.3.3)

- La app de Android mira cada 3 horas version.json (versión publicada y su título; lo deja al día la Action del release) y app.json (la última APK). Si hay una versión que no has abierto, manda un aviso al móvil con el título; si además hay APK nueva, lo dice. Cada versión, un aviso; de 22:00 a 9:00, nada.
- Canal propio de Android «Versiones nuevas». Viene encendido y se quita en Ajustes > Avisos y resumen. Si falta el permiso de notificaciones, la web lo pregunta una vez.
- Solo funciona en la app de Android, a partir de la APK de la 0.3.3.
