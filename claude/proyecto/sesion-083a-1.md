# Sesión 083a-1 (8 nov, 0:01–~1:30): navegación A en el móvil y K2 en el ordenador

(Copia del documento del Proyecto de claude.ai, para las sesiones que no lo vean.)

Opus 5.5, esfuerzo medio. Encargo: claude/encargo-construir-083a.md (sesión 1 de 4). Rama v0.8.3a creada desde main (05e5755), commits 05da45f y f684383. Sin tocar main ni toison.es.

## Lo hecho
- **Móvil (A).** Abajo Análisis · Mercados · Hoy · Ideas · Más. Más ocupa el sitio de Tú (sigue siendo data-ir="tu" para que la barra marque Más en Tú, Objetivos y Paso a paso) y abre una hoja: buscador de páginas, Lo tuyo (Tu cuenta, Objetivos, Tu plan/Paso a paso), Tus fijados, la rejilla por grupos (Tu cartera, Riesgo y rentabilidad, Hacienda, Mercados e ideas, Herramientas) y La app (Cómo la ves, Ajustes, Novedades, Tutorial, Avisar de un fallo). Cada casilla tiene su estrella; los fijados (hasta 8) salen también en una fila arriba de Hoy.
- **Análisis**: 7 pestañas en avanzado (Posiciones, Rentabilidad, Riesgo, Reparto, Ingresos y costes, Hacienda, La IA explica) y 6 en básico. Debajo de la pestaña, sus apartados en pastillas: Posiciones · Movimientos · Día a día (este, solo avanzado); Reparto y X-Ray · Tu reparto objetivo; Dividendos · Costes. Gráfico técnico y Laboratorio, en Más › Herramientas, con «‹ Más» arriba (también en Tú).
- **Básico**: la rejilla no enseña lo del avanzado; el buscador sí, con «Está en el avanzado: verlo», que pasa al avanzado y lo abre.
- **Ordenador (K2)**, desde 1.180 px: iconos de 64 px con las 10 secciones (Hoy, Cartera, Rendimiento, Riesgo, Reparto, Hacienda, Mercados, Ideas, Tu plan, Herramientas) y Ajustes abajo; segunda barra de 252 px con el nombre de la sección y sus páginas, el interruptor Básico/Avanzado y la IA abajo. «Agrandar» pasa la IA a 440 px y las páginas suben a pestañas. Arriba: buscador (Ctrl K o «/»), estrella (fijados y recientes), Escritorios con la etiqueta Dorado, avisos, cuenta y la cuenta atrás de GTA VI cuando toca.
- **Rutas**: cada pestaña del trozo «avanzado» tiene su dirección (#av-rentab, #av-div, #av-lab…). Las de siempre siguen valiendo.
- **Tutorial y guías**: el capítulo V pasa de Tú a Más; los pasos de Análisis y de la IA señalan también la K2.

## Archivos
- Nuevos: src/js/43b-navegacion.js (PAGINAS, SECCIONES, Más, buscador, fijados, K2), src/css/24-navegacion.css, tests/navegacion-083a.spec.js.
- Tocados: 10-pintado.js, 43-modo.js, 58-eventos.js, 57-asesor-panel.js, 44-tour.js, 17-cartera-de-un-vistazo.js, 19-plan.js, 27-objetivos.js, 00-temas.css, 22-modo-y-ordenador.css, en.json.

## Pruebas
Tanda entera en la Action «Pruebas» en verde. En las pruebas nuevas: una hoja de la guía puede salir encima a mitad (tocar con quitarCapas y clic de la página) y la K2 se mide con expect.poll (transición).

## Lo que quedó abierto
- En básico, Rentabilidad y Riesgo enseñan de momento lo mismo que el avanzado (sesión 3).
- Las novedades de la 0.8.3a, en la sesión 4.
