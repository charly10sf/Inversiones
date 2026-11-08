# Encargo: construir la 0.8.3a «Toisón, por dentro» (preparado el 8 nov, 0:00)

(Copia del documento del Proyecto de claude.ai, para las sesiones que no lo vean. El original manda.)

Modelo: Opus 5.5, esfuerzo medio (alto solo si algo falla dos veces). Unas 4 sesiones, una por bloque; cada una en sesión nueva.

## Qué entra (todo decidido, no hace falta volver a preguntar el diseño)
1. **Navegación A en el móvil**: barra Análisis · Mercados · Hoy (medallón) · Ideas · Más; «Más» abre la hoja con buscador, Lo tuyo, fijados y la rejilla por grupos (Doc de (C), https://claude.ai/artifact/99HpqVkR2W5rB56FPexTSP, «Propuesta A · Cinco y Más»; Tú pasa a Más). Análisis con 7 pestañas en avanzado y 6 en básico.
2. **K2 en el ordenador**: iconos de 64 px con las 10 secciones + segunda barra de 252 px con las páginas arriba y la IA abajo; buscador Ctrl K, estrella, Escritorios (Dorado), avisos y cuenta arriba; la IA se agranda a 440 px y las páginas suben a pestañas (claude/sesion-menu-ordenador-toison-dorado.md y claude/versiones/0.8.md, 0.8.3a).
3. **El acabado liquid**: en el móvil, el cristal hondo con la cabecera en pastillas; en el ordenador, la intermedia; el símbolo de Marfil en vino y oro sobre crema en todos los sitios. Valores exactos en claude/sesion-acabado-liquid.md; maqueta en claude/maqueta-liquid.html + claude/maqueta-liquid-pulido.md (v=9 móvil, v=4 ordenador).
4. **Básico con Rentabilidad y Riesgo** sencillos (Doc de (C)).
5. **Toisón Dorado, lo visual**: Mármol dorado (receta en claude/proyecto/sesion-temas-toison-dorado.md), la marca entera en la cabecera, reborde #4f3f20; candados con el sello pequeño.

## Orden propuesto
- Sesión 1: navegación A y K2 (armazón, rutas, tutorial y guías que señalan botones, pruebas de navegación). HECHA.
- Sesión 2: el acabado liquid y el símbolo de Marfil (tokens solo en 00-temas.css, AA con bloque blanco detrás de la barra, prefers-reduced-transparency, colores-sueltos; mirar Tema.java y el widget). HECHA.
- Sesión 3: básico con Rentabilidad y Riesgo.
- Sesión 4: Toisón Dorado visual, novedades de la versión, «Pruebas» en la Action y capturas a Carlos.

## Reglas
- Antes de tocar nada: claude/avisos-tecnicos.md y claude/estado-avisos-y-web.md (en el Proyecto); abrir claude/versiones/0.8.md solo en la parte de la 0.8.3a.
- Trabajar en la rama v0.8.3a. Permiso permanente de Carlos para adjuntar el repo con escritura y subir a ramas; a main y a toison.es, solo con su sí.
- Apuntar en claude/versiones/0.8.md (0.8.3a) lo decidido.
- Al acabar cada sesión: ESTADO.md en pocas líneas (volver a leerlo justo antes) y resumen en claude/sesion-083a-N.md.
