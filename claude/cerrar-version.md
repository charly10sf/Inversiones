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

Desde el 4 nov 2026 (roadmap; la 0.8.1 fue la primera con tres números) las versiones tienen tres niveles. La regla la dio Carlos: si una actualización es sobre todo arreglos, letra; si trae novedades, sube el número; solo las gordas llevan guía y presentación.
- **Gorda** (dos números: 0.9, 1.0, 1.1): cambia la app de forma que hay que enseñarla. Lleva novedades con dibujos que se cuentan bajando, la guía «Nuevo» paso a paso y el «Nuevo» en la barra; se avisa a los amigos y en redes. Tiene su archivo en claude/versiones/.
- **Intermedia** (tres números: 0.8.2, 0.9.1, 1.1.3): novedades que se publican solas y dejan la app mejor, sin necesitar guía. Al abrirla, una hoja corta con sus novedades (texto, sin dibujos ni guía; cada una con «Ir» si tiene sitio). Sin «Nuevo» en la barra ni presentación. Va como apartado dentro del archivo de su gorda. En NOVEDADES lleva `cosas` (t, x y, si tiene sitio, ir; el dibujo es opcional) y puede llevar `arreglos`.
- **Letra** (0.8.2a, 0.9.1b): arreglos. El mensaje corto de siempre, sumado a la versión en la que estás. Solo `arreglos`.
- Si al cerrar una intermedia hace falta explicarla con una guía, era gorda y sube el segundo número; si solo trae arreglos, era de letra.
- En el código (hecho el 4 nov, rama numeracion): esGorda, esIntermedia, gordaDe, GUIA_ID y caminoNovedades en 46-lo-nuevo.js (las de antes de la 0.8.2 siguen siendo gordas: NIVELES_DESDE); bienvenida() (49-avisos-y-ajustes.js) elige entre arreglos, hoja corta (hojaIntermedia en trozos/novedades.js) y lo nuevo bajando; la guía y el «Nuevo» son de la gorda (en la 0.9.1, los de la 0.9); en «¿Qué se ha mejorado?» las intermedias cuelgan de su gorda; el build deja en el núcleo hasta la gorda. Prueba: tests/niveles.spec.js. Una intermedia se cierra igual que las demás (VERSION, NOVEDADES con `cosas` y, si hace falta, `arreglos`, en.json, cambios.json); sin dibujos obligatorios y sin guía que probar.

- `src/js/version.js` tiene VERSION y tiene que ser la primera de `NOVEDADES` (`src/js/39-versiones-y-novedades.js`).
- Arreglos: letra (0.5a, 0.5b), con su línea en `arreglos` y sin presentación ni guía. Novedades: número, con `cosas` en español e inglés (en.json), dibujo y guía.
- Para todos o solo para Carlos (lo pidió el 3 nov; montado en la 0.8a): a los demás solo les sale lo que de verdad es nuevo para ellos (ejemplo de Carlos: «ya toda la IA va con Claude y ya no hace falta la clave de Google»). Lo que solo le afecta a él (el panel del dueño, el fundador, el Paso a paso), los detalles del rediseño y los arreglos menores van solo para el dueño: en `cosas`, con `solo: 'dueno'`; en `arreglos`, escritos como `{ t: '…', solo: 'dueno' }`. Decidirlo al escribir cada línea. Lo filtra `novVisibles()` (46-lo-nuevo.js) en el mensaje corto, «¿Qué se ha mejorado?», la guía «Nuevo» y el historial; si una versión de letra se queda sin nada para los demás, a ellos no les sale. La lista detallada del historial (cambios.json) solo la ve el dueño. Prueba: tests/novedades-dueno.spec.js.
- Cada actualización lleva sus novedades. `cambios.json` se edita a mano si el clon es corto (cambios.py necesita todo el historial).
