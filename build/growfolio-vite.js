// El plugin de Vite de GrowFolio (0.6). El código está partido en src/css y src/js por secciones, pero sigue siendo un
// script clásico: todas las secciones comparten el ámbito global, como cuando era un solo index.html. Así que no se
// usan módulos: el CSS y el JS se juntan en el orden de src/partes.json y se minifican.
// - npm run dev: index.html con los CSS de src/css y el JS juntado al vuelo en /@gf/app.js (se recarga al guardar).
// - npm run build: dist/ con assets/app-<huella>.css y .js (minificados) más los archivos de siempre (iconos, JSON, sw.js).
//
// Trozos (src/partes.json, «trozos»): partes que no hacen falta para abrir Inicio y se bajan la primera vez que se usan
// (la hoja de GTA VI, el asesor…). Cada trozo es su propio script. En el núcleo, por cada función del trozo que se usa
// desde fuera, va una de relevo con el mismo nombre que baja el trozo y la llama; al cargarse, la del trozo ocupa su
// sitio. Solo vale para funciones a las que se llama sin usar lo que devuelven (o con await): si el resto usara una
// constante del trozo o lo que devuelve una función suya, el build se para y dice cuál (build/analizar.js).
import { readFileSync, writeFileSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { transform } from 'esbuild';
import { analizar, entradas } from './analizar.js';

const RAIZ = join(dirname(new URL(import.meta.url).pathname), '..');
// lo que se sirve tal cual desde la raíz del repositorio
const PUBLICOS = [
  'manifest.webmanifest', 'favicon.svg', 'growfolio.svg', 'growfolio-nombre.svg', 'growia.svg', 'growia-nombre.svg',
  'growfolio-16.png', 'growfolio-32.png', 'growfolio-180.png', 'growfolio-192.png', 'growfolio-512.png', 'growfolio-maskable-512.png',
  'growfolio-aviso.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
  'instrumentos.json', 'mapa-mundo.json', 'mapa-detalle.json', 'cambios.json', 'version.json', 'app.json', 'en.json', 'lib',
];

export const version = () => (readFileSync(join(RAIZ, 'src', 'js', 'version.js'), 'utf8').match(/const VERSION = '([^']+)'/) || [])[1] || '0';
export const partes = () => JSON.parse(readFileSync(join(RAIZ, 'src', 'partes.json'), 'utf8'));
const leer = (dir, archivos) => archivos.map((a) => readFileSync(join(RAIZ, 'src', dir, a), 'utf8')).join('');
export const juntarCSS = (archivos = partes().css) => leer('css', archivos);
const huella = (t) => createHash('sha256').update(t).digest('hex').slice(0, 10);

/** las funciones de relevo de cada trozo; se para si algo del trozo se usa de una forma que no puede esperar */
export function relevos(p = partes()) {
  const trozos = p.trozos || {}, todos = [...p.js, ...Object.values(trozos).flat()];
  const A = analizar(todos), out = {}, malos = [];
  for (const [n, archivos] of Object.entries(trozos)) {
    const r = entradas(archivos, todos, A);
    for (const e of r.entradas) if (!e.aplazable) malos.push(`${n}: ${e.tipo} ${e.nombre} (${e.como.join(', ')}${e.alCargar ? ', al cargar' : ''}) desde ${e.desde.join(', ')}`);
    out[n] = r.entradas.map((e) => e.nombre).sort();
  }
  if (malos.length) throw new Error('Esto de un trozo se usa desde fuera de una forma que no puede esperar a bajarlo; tiene que ir en el núcleo:\n  ' + malos.join('\n  '));
  return out;
}

/** el código que va al principio del núcleo: dónde está cada trozo, cómo se baja y las funciones de relevo */
function cargador(urls, rel) {
  const r = [`/* generado por el build (build/growfolio-vite.js): los trozos que se bajan la primera vez que se usan */`,
    `const TROZOS = ${JSON.stringify(urls)};`,
    `const trozosEnCamino = {};`,
    `function cargarTrozo(n) {`,
    `  return trozosEnCamino[n] || (trozosEnCamino[n] = new Promise((ok, no) => {`,
    `    const s = document.createElement('script'); s.src = TROZOS[n];`,
    `    s.onload = () => ok(); s.onerror = () => { delete trozosEnCamino[n]; s.remove(); no(new Error('Sin conexión: no se ha podido bajar ' + n)); };`,
    `    document.head.appendChild(s);`,
    `  }));`,
    `}`,
    `function trozoFallido(e) { console.warn(e); try { toast(L('Sin conexión: no se ha podido abrir. Prueba otra vez en un momento.', "No connection: it couldn't be opened. Try again in a moment."), 6000); } catch (x) {} }`];
  for (const [n, fs] of Object.entries(rel)) for (const f of fs) {
    r.push(`function ${f}(...a) { const yo = ${f}; return cargarTrozo(${JSON.stringify(n)}).then(() => { if (${f} === yo) throw new Error('El trozo ${n} no trae ${f}'); return ${f}(...a); }).catch(trozoFallido); }`);
  }
  return r.join('\n') + '\n';
}

/** el núcleo: las partes de src/partes.json con el cargador detrás de la versión (lo primero sigue siendo 'use strict') */
export function juntarJS(urls, p = partes()) {
  const rel = relevos(p), tr = Object.keys(p.trozos || {});
  const u = urls || Object.fromEntries(tr.map((n) => [n, `/@gf/trozo/${n}.js`]));
  return p.js.map((a) => readFileSync(join(RAIZ, 'src', 'js', a), 'utf8') + (a === 'version.js' ? cargador(u, rel) : '')).join('');
}
const juntarTrozo = (n, p = partes()) => "'use strict';\n" + leer('js', p.trozos[n]);

export default function growfolio() {
  let modo = 'serve';
  const salida = { trozos: {} };   // en el build: { css: {nombre, codigo}, js: {...}, trozos: {n: {...}} }
  return {
    name: 'growfolio',
    configResolved(c) { modo = c.command; },

    // en desarrollo: el JS juntado al vuelo
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const t = req.url.match(/^\/@gf\/trozo\/([a-z0-9-]+)\.js/);
        if (!req.url.startsWith('/@gf/app.js') && !t) return next();
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        try { res.end(t ? juntarTrozo(t[1]) : juntarJS()); } catch (e) { res.end(`console.error(${JSON.stringify(String(e.message || e))})`); }
      });
      // al guardar algo de src/, se recarga la página entera (no hay módulos que cambiar en caliente)
      server.watcher.add(join(RAIZ, 'src'));
      server.watcher.on('change', (f) => { if (f.includes('/src/')) server.ws.send({ type: 'full-reload' }); });
    },

    async buildStart() {
      if (modo !== 'build') return;
      const p = partes();
      const css = (await transform(juntarCSS(), { loader: 'css', minify: true, charset: 'utf8', legalComments: 'none' })).code;
      salida.css = { nombre: `assets/app-${huella(css)}.css`, codigo: css };
      // el JS sin envolver (es un script, no un módulo): los nombres de arriba del todo no se cambian
      const min = async (c) => (await transform(c, { loader: 'js', minify: true, target: 'es2022', charset: 'utf8', legalComments: 'none' })).code;
      const urls = {};
      for (const n of Object.keys(p.trozos || {})) {
        const c = await min(juntarTrozo(n, p));
        salida.trozos[n] = { nombre: `assets/${n}-${huella(c)}.js`, codigo: c };
        urls[n] = salida.trozos[n].nombre;
      }
      const js = await min(juntarJS(urls, p));
      salida.js = { nombre: `assets/app-${huella(js)}.js`, codigo: js };
    },

    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const css = modo === 'build'
          ? `<link rel="stylesheet" href="${salida.css.nombre}">`
          : partes().css.map((a) => `<link rel="stylesheet" href="/src/css/${a}">`).join('\n');
        const js = modo === 'build' ? `<script src="${salida.js.nombre}"></script>` : '<script src="/@gf/app.js"></script>';
        return html.replace(/<!-- gf:css[^>]*-->/, css).replace(/<!-- gf:js[^>]*-->/, js);
      },
    },

    generateBundle() {
      for (const x of [salida.css, salida.js, ...Object.values(salida.trozos)]) this.emitFile({ type: 'asset', fileName: x.nombre, source: x.codigo });
    },

    // los archivos de siempre y el service worker con la caché de esta versión
    writeBundle(opts) {
      const dist = opts.dir;
      for (const p of PUBLICOS) {
        const de = join(RAIZ, p);
        if (!existsSync(de)) continue;
        cpSync(de, join(dist, p), { recursive: true });
      }
      const assets = readdirSync(join(dist, 'assets')).map((a) => `assets/${a}`);
      const todo = assets.map((a) => readFileSync(join(dist, a), 'utf8')).join('') + readFileSync(join(dist, 'index.html'), 'utf8');
      let sw = readFileSync(join(RAIZ, 'sw.js'), 'utf8');
      // la caché, con la versión y la huella de todo; los trozos van también en CORE: se guardan al instalar (después de
      // abrir), así funcionan sin conexión aunque no se hayan usado nunca
      sw = sw.replace(/var CACHE = '[^']*';/, `var CACHE = 'gf-${version()}-${huella(todo)}';`)
        .replace(/var CORE = \[([^\]]*)\];/, (m, lista) => `var CORE = [${lista}, ${assets.map((a) => `'${a}'`).join(', ')}];`);
      writeFileSync(join(dist, 'sw.js'), sw);
    },
  };
}
