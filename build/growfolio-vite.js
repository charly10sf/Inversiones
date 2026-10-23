// El plugin de Vite de GrowFolio (0.6). El código está partido en src/css y src/js por secciones, pero sigue siendo un
// script clásico: todas las secciones comparten el ámbito global, como cuando era un solo index.html. Así que no se
// usan módulos: el CSS y el JS se juntan en el orden de src/partes.json y se minifican.
// - npm run dev: index.html con los CSS de src/css y el JS juntado al vuelo en /@gf/app.js (se recarga al guardar).
// - npm run build: dist/ con assets/app-<huella>.css y .js (minificados) más los archivos de siempre (iconos, JSON, sw.js).
import { readFileSync, writeFileSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { transform } from 'esbuild';

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
export const juntarJS = (archivos = partes().js) => leer('js', archivos);
export const juntarCSS = (archivos = partes().css) => leer('css', archivos);
const huella = (t) => createHash('sha256').update(t).digest('hex').slice(0, 10);

export default function growfolio() {
  let modo = 'serve';
  const salida = {};   // en el build: { css: {nombre, codigo}, js: {...} }
  return {
    name: 'growfolio',
    configResolved(c) { modo = c.command; },

    // en desarrollo: el JS juntado al vuelo
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/@gf/app.js')) return next();
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(juntarJS());
      });
      // al guardar algo de src/, se recarga la página entera (no hay módulos que cambiar en caliente)
      server.watcher.add(join(RAIZ, 'src'));
      server.watcher.on('change', (f) => { if (f.includes('/src/')) server.ws.send({ type: 'full-reload' }); });
    },

    async buildStart() {
      if (modo !== 'build') return;
      const css = (await transform(juntarCSS(), { loader: 'css', minify: true, charset: 'utf8', legalComments: 'none' })).code;
      // el JS sin envolver (es un script, no un módulo): los nombres de arriba del todo no se cambian
      const js = (await transform(juntarJS(), { loader: 'js', minify: true, target: 'es2022', charset: 'utf8', legalComments: 'none' })).code;
      salida.css = { nombre: `assets/app-${huella(css)}.css`, codigo: css };
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
      for (const x of [salida.css, salida.js]) this.emitFile({ type: 'asset', fileName: x.nombre, source: x.codigo });
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
      sw = sw.replace(/var CACHE = '[^']*';/, `var CACHE = 'gf-${version()}-${huella(todo)}';`)
        .replace(/var CORE = \[([^\]]*)\];/, (m, lista) => `var CORE = [${lista}, ${assets.map((a) => `'${a}'`).join(', ')}];`);
      writeFileSync(join(dist, 'sw.js'), sw);
    },
  };
}
