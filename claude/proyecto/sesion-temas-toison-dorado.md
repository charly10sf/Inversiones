# Los temas y Toisón Dorado (7 nov, 22:04–22:50), lo que hace falta para construir

(Copia resumida del documento del Proyecto claude/sesion-temas-toison-dorado.md. El original manda.)

## Decidido (Carlos)
- Gratis: Mármol (el de hoy) y Marfil. El Mármol no se bloquea.
- Toisón Dorado añade el «Mármol dorado»: el mismo mármol con las vetas teñidas de oro al 50 %, y la marca entera en la cabecera al 100 % (sello del 11 + TOISÓN + DORADO entre hilos de oro, en lugar del símbolo). Más la G, los candados con el sello pequeño y la etiqueta Dorado iluminada en Escritorios.
- Reborde dorado suave: con Toisón Dorado, el borde de las tarjetas, del recuadro de la IA y de la barra de abajo del móvil pasa del gris #313131 a #4f3f20 (mismo grosor, 2 px).
- Nada más en oro: sin oro pulido en tarjetas, cifras ni botones, sin cristal propio del plan.
- En Marfil, Toisón Dorado solo cambia la cabecera (sello con filo #5e4210).
- 8 nov (Carlos): en el ordenador, la misma marca entera arriba de la K2 (TOISÓN DORADO en .k2-marca-tx, junto al sello).

## Receta de la textura
De marmol-g.webp (780×1690) y marmol-g-pc.webp (1600×1000), con numpy: L = media de RGB; t = L / max(L); oro = mapa de t con paradas (0 → #000000, 0,25 → rgb(.28,.20,.08), 0,60 → rgb(.73,.56,.29), 1,0 → rgb(.94,.86,.66)); salida = original × 0,5 + oro × 0,5 × 1,05, recortado a [0,1]. Guardar como marmol-dorado.webp y marmol-dorado-pc.webp (calidad 90). En la app: con Toisón Dorado y el diseño Mármol, el fondo usa esa textura (misma capa que marmol-g), la cabecera pinta la marca entera y color-borde pasa a #4f3f20; sin pagar, todo igual que hoy.
