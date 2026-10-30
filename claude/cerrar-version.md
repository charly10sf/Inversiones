# Cómo se hace y se cierra una versión

Las reglas y la definición de hecho vienen de claude/roadmap.md; lo de número y letra, del CLAUDE.md del repositorio (30 oct 2026, sin cambios).

## Las reglas

1. Cada versión tiene su lista cerrada. Lo que no está en la lista va al backlog, no a la versión en curso.
2. Una versión de número no sale hasta cumplir su criterio de salida. Si algo se atasca, se recorta la lista, no el criterio.
3. Los arreglos van con letra (0.5a, 0.5b), sin presentación ni guía. Las versiones de número llevan novedades ES/EN, dibujo y guía.
4. Solo se salta el orden por un fallo que deje a un amigo sin usar la app.
5. Cada versión: sesión de plan (Fable, alto) → claude/plan-0.X.md; construir (Opus 5.5, extra) en rama v0.X, una tarea por sesión con su test de Playwright; revisión aparte de lo crítico (cifrado, cuentas, Hacienda, pagos, prompt público de GrowIA); release; marcar en claude/versiones/0.X.md y en ESTADO.md, en el Proyecto (al cerrarla, pasarla a claude/historial.md); opiniones al backlog (claude/backlog.md).
6. Fecha que manda: la 1.0 en Google Play y en la web antes del 1 de abril de 2027 (campaña de la renta).

## Definición de hecho

- Funciona a 360, 390 y 1.440 de ancho, en español y en inglés.
- Test de Playwright en el repositorio que pasa en CI.
- No rompe la cartera de quien viene de la versión anterior (migración probada con una copia real).
- Línea de novedades y, si es pantalla nueva, sitio en la guía.
- Si toca datos personales o dinero, revisado aparte.

## Número, letra, novedades y arreglos

- `src/js/version.js` tiene VERSION y tiene que ser la primera de `NOVEDADES` (`src/js/39-versiones-y-novedades.js`).
- Arreglos: letra (0.5a, 0.5b), con su línea en `arreglos` y sin presentación ni guía. Novedades: número, con `cosas` en español e inglés (en.json), dibujo y guía.
- Cada actualización lleva sus novedades. `cambios.json` se edita a mano si el clon es corto (cambios.py necesita todo el historial).
