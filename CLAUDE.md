# GrowFolio: cómo se trabaja en este repositorio

GrowFolio es la web y app de Android de Carlos para llevar inversiones (GitHub Pages + Firebase + Actions). Lo que toca está en ESTADO.md, en el Proyecto de claude.ai. En `claude/` de este repositorio: cada versión pendiente (`versiones/0.X.md`), sus planes, el historial, el backlog, la marca y las redes. Se trabaja ciñéndose a ellos.

## Código

- El código está en `src/css` y `src/js`, partido por secciones; el orden, en `src/partes.json`. Es un único script clásico: todas las secciones comparten el ámbito global (no son módulos). No hace falta importar nada entre archivos.
- Lo que no hace falta para abrir Inicio va en trozos (`src/js/trozos`, `trozos` en `src/partes.json`), que se bajan al usarlos. El build pone funciones de relevo en el núcleo y se para si un trozo se usa de una forma que no puede esperar. `node build/analizar.js` enseña las entradas de cada trozo; `node build/mover.js <de> <a> nombres…` mueve declaraciones entre archivos.
- `index.html` es solo la cáscara: el build (`npm run build`, Vite + `build/growfolio-vite.js`) mete el CSS y el JS minificados con huella en `dist/`.
- `npm run dev` para trabajar (http://localhost:5173). `?dev` en la dirección carga los datos de `dev/` y salta Firebase en algunas cosas: para probar de verdad, las pruebas de Playwright.

## Pruebas

- `sh tests/traer-datos.sh`, `npx playwright install chromium`, `npm test` (build + Playwright en 390, 360 y 1440; Firebase de imitación en tests/stub y sin internet). `npm run rendimiento` (presupuesto: < 800 KB por la red y lista en < 2 s). `python -m unittest discover -s tests/scripts`.
- Una prueba nueva por cada cosa nueva. Todo pasa en la Action «Pruebas» en cada push.
- Antes de publicar algo de cifrado, cuentas, Hacienda, pagos o el prompt público de GrowIA: revisión aparte.

## Desplegar

- Se trabaja en una rama (v0.X, o v0.Xa para un arreglo) y se publica con el merge a main.
- En main, «Pruebas» y, si pasa, «Pages» hace el build y publica (unos 10 minutos). A mano: `gh workflow run pages.yml --ref main`.
- «Release de la versión» crea el release con la etiqueta de VERSION y escribe version.json; «App Android» compila la APK y escribe app.json. No se tocan a mano.
- Un cambio en `firestore.rules` lo publica «Reglas de Firestore»; uno en `worker/`, «Worker».

## Versiones

Para cerrar una versión, lee claude/cerrar-version.md.

## Textos

- Español natural y directo; la IA se llama GrowIA y la app, GrowFolio. Inglés por en.json (frases con cifras como «#») o `L('es', 'en')` en el código.
