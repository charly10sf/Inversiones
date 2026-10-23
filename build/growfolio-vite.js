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
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { transform } from 'esbuild';
import { analizar, entradas } from './analizar.js';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';

// fileURLToPath y no .pathname: en Windows, .pathname da /C:/… y la ruta acaba en C:\C:\…
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
// el texto de los archivos, siempre con \n: en Windows, Git los puede bajar con \r\n (core.autocrlf) y los cortes por
// líneas (NOVEDADES, el cargador) no los encontrarían
const texto = (f) => readFileSync(f, 'utf8').replace(/\r\n?/g, '\n');
// lo que se sirve tal cual desde la raíz del repositorio
const PUBLICOS = [
  'manifest.webmanifest', 'favicon.svg', 'growfolio.svg', 'growfolio-nombre.svg', 'growia.svg', 'growia-nombre.svg',
  'growfolio-16.png', 'growfolio-32.png', 'growfolio-180.png', 'growfolio-192.png', 'growfolio-512.png', 'growfolio-maskable-512.png',
  'growfolio-aviso.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
  'instrumentos.json', 'mapa-mundo.json', 'mapa-detalle.json', 'cambios.json', 'version.json', 'app.json', 'en.json', 'lib',
];

export const version = () => (texto(join(RAIZ, 'src', 'js', 'version.js')).match(/const VERSION = '([^']+)'/) || [])[1] || '0';
export const partes = () => JSON.parse(readFileSync(join(RAIZ, 'src', 'partes.json'), 'utf8'));
const leer = (dir, archivos) => archivos.map((a) => texto(join(RAIZ, 'src', dir, a))).join('');
export const juntarCSS = (archivos = partes().css) => leer('css', archivos);
const huella = (t) => createHash('sha256').update(t).digest('hex').slice(0, 10);

/** las funciones de relevo de cada trozo; se para si algo del trozo se usa de una forma que no puede esperar */
// un trozo es una lista de archivos o { archivos, siNoEsta, retornoOk }: siNoEsta, funciones que sin el trozo bajado no hacen
// nada (las de pintar o cerrar algo que solo existe si ya se abrió); retornoOk, funciones que alguien devuelve con «return f()»
// y se ha comprobado a mano que quien llama no usa lo que devuelven (o lo espera)
export const archivosDe = (t) => (Array.isArray(t) ? t : t.archivos);
export function relevos(p = partes()) {
  const trozos = p.trozos || {}, todos = [...p.js, ...Object.values(trozos).map(archivosDe).flat()];
  const A = analizar(todos), out = {}, malos = [];
  for (const [n, t] of Object.entries(trozos)) {
    const r = entradas(archivosDe(t), todos, A), quietas = new Set(t.siNoEsta || []), retOk = new Set(t.retornoOk || []);
    for (const e of r.entradas) if (retOk.has(e.nombre) && e.tipo === 'function' && !e.alCargar && e.como.every((c) => c !== 'resultado' && c !== 'valor')) e.aplazable = true;
    for (const e of r.entradas) if (!e.aplazable) malos.push(`${n}: ${e.tipo} ${e.nombre} (${e.como.join(', ')}${e.alCargar ? ', al cargar' : ''}) desde ${e.desde.join(', ')}`);
    for (const q of quietas) if (!r.entradas.some((e) => e.nombre === q)) malos.push(`${n}: siNoEsta dice ${q}, que no es una entrada del trozo`);
    out[n] = r.entradas.map((e) => ({ f: e.nombre, quieta: quietas.has(e.nombre) })).sort((a, b) => a.f.localeCompare(b.f));
  }
  // un nombre declarado arriba en dos sitios sería un error de sintaxis al bajar el trozo (o pisaría el cargador)
  const visto = new Map([['TROZOS', 'el cargador'], ['EN', 'el cargador'], ['trozosEnCamino', 'el cargador'], ['cargarTrozo', 'el cargador'], ['enTrozo', 'el cargador'], ['trozoFallido', 'el cargador']]);
  for (const a of todos) for (const [nombre, tipo] of A.info[a].decl) {
    if (visto.has(nombre) && !(tipo === 'function' && visto.get(nombre).endsWith('function'))) malos.push(`${nombre} está declarado en ${a} y en ${visto.get(nombre)}`);
    visto.set(nombre, `${a} (${tipo === 'function' ? 'function' : tipo})`);
  }
  if (malos.length) throw new Error('Esto de un trozo se usa desde fuera de una forma que no puede esperar a bajarlo; tiene que ir en el núcleo:\n  ' + malos.join('\n  '));
  return out;
}

/** el código que va al principio del núcleo: dónde está cada trozo, cómo se baja y las funciones de relevo */
function cargador(urls, rel, en) {
  const r = [`/* generado por el build (build/growfolio-vite.js): los trozos que se bajan la primera vez que se usan, y el diccionario de`,
    `   inglés partido igual (EN.nucleo al abrir en inglés; el de cada trozo, con él) */`,
    `const TROZOS = ${JSON.stringify(urls)};`,
    `const EN = ${JSON.stringify(en)};`,
    `const trozosEnCamino = {};`,
    `function cargarTrozo(n) {`,
    `  return trozosEnCamino[n] || (trozosEnCamino[n] = Promise.all([new Promise((ok, no) => {`,
    `    const s = document.createElement('script'); s.src = TROZOS[n];`,
    `    s.onload = () => ok(); s.onerror = () => { s.remove(); no(new Error('Sin conexión: no se ha podido bajar ' + n)); };`,
    `    document.head.appendChild(s);`,
    `  }), IDIOMA === 'en' && EN.trozos[n] ? fetch(EN.trozos[n]).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.t) enTrozo(j.t); }).catch(() => {}) : null])`,
    `    .catch((e) => { delete trozosEnCamino[n]; throw e; }));`,
    `}`,
    `// el inglés de un trozo: al diccionario si ya está; si no (red lenta), cuando llegue (cargarIdioma lo junta)`,
    `function enTrozo(t) { if (I18N.dic) Object.assign(I18N.dic, t); else (I18N.pend || (I18N.pend = [])).push(t); }`,
    `// no se ha podido bajar: con conexión, lo normal es que GrowFolio se haya actualizado y el trozo de antes ya no esté`,
    `// (se avisa para recargar); sin ella, se dice. Y lo que venía detrás (el último argumento, si es una función) sigue`,
    `function trozoFallido(e, a) {`,
    `  console.warn(e);`,
    `  try { if (navigator.onLine !== false && typeof avisoWebNueva === 'function') avisoWebNueva(); else toast(L('Sin conexión: no se ha podido abrir. Prueba otra vez en un momento.', "No connection: it couldn't be opened. Try again in a moment."), 6000); } catch (x) {}`,
    `  const sigue = a && a[a.length - 1];`,
    `  if (typeof sigue === 'function') try { sigue(); } catch (x) { console.warn(x); }`,
    `}`];
  // si el trozo se baja, la función de verdad se llama fuera del catch: sus errores salen como cualquier otro
  for (const [n, fs] of Object.entries(rel)) for (const { f, quieta } of fs) {
    r.push(`function ${f}(...a) { ${quieta ? `if (!trozosEnCamino[${JSON.stringify(n)}]) return; ` : ''}const yo = ${f}; return cargarTrozo(${JSON.stringify(n)}).then(() => true, (e) => { trozoFallido(e, a); return false; }).then((ok) => { if (!ok) return; if (${f} === yo) throw new Error('El trozo ${n} no trae ${f}'); return ${f}(...a); }); }`);
  }
  return r.join('\n') + '\n';
}

/* NOVEDADES (la historia de todas las versiones, unos 75 KB) va casi entera en el trozo de novedades: en el núcleo se quedan
   las de la versión actual hasta su versión de número (lo que usan la guía de lo nuevo y el botón de la barra) y el resto
   se añade al cargar el trozo (NOVEDADES.push). En src/ sigue siendo una sola lista, la que leen release.py y cambios.py. */
const ARCHIVO_NOV = '39-versiones-y-novedades.js';
export function partirNovedades(texto) {
  const i = texto.indexOf('const NOVEDADES = [\n'), j = texto.indexOf('\n];', i);
  if (i < 0 || j < 0) throw new Error('No encuentro NOVEDADES en ' + ARCHIVO_NOV);
  const ini = i + 'const NOVEDADES = [\n'.length, cuerpo = texto.slice(ini, j + 1);
  const cortes = [...cuerpo.matchAll(/^ {2}\{ v: '([\d.]+[a-z]?)'/gm)];
  const k = cortes.findIndex((m) => !/[a-z]$/.test(m[1]));   // la primera de número (sin letra)
  if (k < 0 || k + 1 >= cortes.length) return { nucleo: texto, resto: '' };
  const corte = cortes[k + 1].index;
  return { nucleo: texto.slice(0, ini) + cuerpo.slice(0, corte) + texto.slice(j + 1), resto: 'NOVEDADES.push(\n' + cuerpo.slice(corte) + ');\n' };
}
const leerParte = (a) => { const t = texto(join(RAIZ, 'src', 'js', a)); return a === ARCHIVO_NOV ? partirNovedades(t).nucleo : t; };

/** el núcleo: las partes de src/partes.json con el cargador detrás de la versión (lo primero sigue siendo 'use strict') */
export function juntarJS(urls, p = partes(), en = { nucleo: 'en.json', trozos: {} }) {
  const rel = relevos(p), tr = Object.keys(p.trozos || {});
  const u = urls || Object.fromEntries(tr.map((n) => [n, `/@gf/trozo/${n}.js`]));
  return p.js.map((a) => leerParte(a) + (a === 'version.js' ? cargador(u, rel, en) : '')).join('');
}

/* en.json partido. Una entrada va al trozo solo si es, entera, uno de los textos de su código (una cadena, o un trozo de
   una plantilla entre etiquetas, con las cifras y los ${…} como «#») y no sale en el núcleo ni entera ni a trozos; todo lo
   demás (lo del núcleo, lo que se monta al vuelo, lo que viene de los datos) va en el del núcleo. Ante la duda, núcleo:
   ahí siempre se traduce. */
function textosDe(codigo) {
  const out = new Set(), poner = (t) => { for (const x of String(t).split(/<[^>]*>/)) { const y = x.replace(/[-+−]?\d+(?:[.,]\d+)*/g, '#').replace(/\s+/g, ' ').trim(); if (y) out.add(y); } };
  const ast = parse(codigo, { ecmaVersion: 'latest', sourceType: 'script' });
  simple(ast, {
    Literal(n) { if (typeof n.value === 'string') poner(n.value); },
    TemplateLiteral(n) { poner(n.quasis.map((q) => q.value.cooked ?? q.value.raw).join('#')); },
  });
  return out;
}
export function partirIngles(p = partes()) {
  const en = JSON.parse(readFileSync(join(RAIZ, 'en.json'), 'utf8'));
  const nucleo = juntarJS(null, p), enNucleo = textosDe(nucleo);
  const trozos = Object.fromEntries(Object.keys(p.trozos || {}).map((n) => [n, textosDe(juntarTrozo(n, p))]));
  const frag = (k) => k.split('#').map((x) => x.trim()).filter((x) => x.length > 3).sort((a, b) => b.length - a.length)[0] || k;
  const enElNucleo = (k) => enNucleo.has(k) || nucleo.includes(frag(k)) || nucleo.includes(frag(k).replace(/'/g, "\\'"));
  const out = { nucleo: { ...en, t: {} } };
  for (const [k, v] of Object.entries(en.t || {})) {
    let d = 'nucleo';
    if (!enElNucleo(k)) { const t = Object.keys(trozos).filter((n) => trozos[n].has(k)); if (t.length === 1) d = t[0]; }
    (out[d] || (out[d] = { t: {} })).t[k] = v;
  }
  return out;
}
const juntarTrozo = (n, p = partes()) => "'use strict';\n"
  + (n === 'novedades' ? partirNovedades(texto(join(RAIZ, 'src', 'js', ARCHIVO_NOV))).resto : '')
  + leer('js', archivosDe(p.trozos[n]));

export default function growfolio() {
  let modo = 'serve';
  const salida = { trozos: {}, en: [] };   // en el build: { css: {nombre, codigo}, js, trozos: {n: {...}}, en: [{nombre, codigo}] }
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
      const ing = partirIngles(p), enUrls = { nucleo: '', trozos: {} };
      salida.en = [];
      for (const [n, d] of Object.entries(ing)) {
        const t = JSON.stringify(d), nombre = `en/${n}-${huella(t)}.json`;
        salida.en.push({ nombre, codigo: t });
        if (n === 'nucleo') enUrls.nucleo = nombre; else enUrls.trozos[n] = nombre;
      }
      const js = await min(juntarJS(urls, p, enUrls));
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
      for (const x of [salida.css, salida.js, ...Object.values(salida.trozos), ...salida.en]) this.emitFile({ type: 'asset', fileName: x.nombre, source: x.codigo });
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
      const ingles = existsSync(join(dist, 'en')) ? readdirSync(join(dist, 'en')).map((a) => `en/${a}`) : [];
      const todo = [...assets, ...ingles].map((a) => readFileSync(join(dist, a), 'utf8')).join('') + readFileSync(join(dist, 'index.html'), 'utf8');
      let sw = texto(join(RAIZ, 'sw.js'));
      // la caché, con la versión y la huella de todo; los trozos de código van también en CORE: se guardan al instalar (después
      // de abrir), así funcionan sin conexión aunque no se hayan usado nunca. El inglés (en/) no: se guarda al pedirlo
      sw = sw.replace(/var CACHE = '[^']*';/, `var CACHE = 'gf-${version()}-${huella(todo)}';`)
        .replace(/var CORE = \[([^\]]*)\];/, (m, lista) => `var CORE = [${lista}, ${assets.map((a) => `'${a}'`).join(', ')}];`);
      writeFileSync(join(dist, 'sw.js'), sw);
    },
  };
}
