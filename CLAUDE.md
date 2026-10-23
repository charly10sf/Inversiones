# GrowFolio: cómo se trabaja en este repositorio

GrowFolio es la web y app de Android de Carlos para llevar inversiones (GitHub Pages + Firebase + Actions). El roadmap y el plan de cada versión están en el Proyecto de claude.ai (claude/roadmap.md, claude/plan-0.X.md): se trabaja ciñéndose a ellos.

## Código (desde la 0.6)

- El código está en `src/css` y `src/js`, partido por secciones; el orden, en `src/partes.json`. Es un único script clásico: todas las secciones comparten el ámbito global (no son módulos). No hace falta importar nada entre archivos.
- Lo que no hace falta para abrir Inicio va en trozos (`src/js/trozos`, `trozos` en `src/partes.json`), que se bajan al usarlos. El build pone funciones de relevo en el núcleo y se para si un trozo se usa de una forma que no puede esperar. `node build/analizar.js` enseña las entradas de cada trozo; `node build/mover.js <de> <a> nombres…` mueve declaraciones entre archivos.
- `index.html` es solo la cáscara: el build (`npm run build`, Vite + `build/growfolio-vite.js`) mete el CSS y el JS minificados con huella en `dist/`.
- `npm run dev` para trabajar (http://localhost:5173). `?dev` en la dirección carga los datos de `dev/` y salta Firebase en algunas cosas: para probar de verdad, las pruebas de Playwright.

## Versiones

- `src/js/version.js` tiene VERSION y tiene que ser la primera de `NOVEDADES` (`src/js/39-versiones-y-novedades.js`).
- Arreglos: letra (0.5a, 0.5b), con su línea en `arreglos` y sin presentación ni guía. Novedades: número, con `cosas` en español e inglés (en.json), dibujo y guía.
- Cada actualización lleva sus novedades. `cambios.json` se edita a mano si el clon es corto (cambios.py necesita todo el historial).
- version.json lo escribe la Action del release; app.json, la de Android.

## Pruebas

- `sh tests/traer-datos.sh`, `npx playwright install chromium`, `npm test` (build + Playwright en 390, 360 y 1440; Firebase de imitación en tests/stub y sin internet). `npm run rendimiento` (presupuesto: < 800 KB por la red y lista en < 2 s). `python -m unittest discover -s tests/scripts`.
- Una prueba nueva por cada cosa nueva. Todo pasa en la Action «Pruebas» en cada push.
- Antes de publicar algo de cifrado, cuentas, Hacienda, pagos o el prompt público de GrowIA: revisión aparte.

## Textos

- Español natural y directo; la IA se llama GrowIA y la app, GrowFolio. Inglés por en.json (frases con cifras como «#») o `L('es', 'en')` en el código.
