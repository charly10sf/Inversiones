// 0.7v: cuenta los colores escritos a mano (#hex, rgb/rgba/hsl/hsla, white y black) fuera de los bloques de tema.
// Bloques de tema: los que llevan [data-tema en el selector (src/css/00-temas.css) y, mientras siga GrowFolio, los :root
// de 01-base.css y 21-como-el-icono.css. Lo usan tests/colores-sueltos.spec.js y, a mano, «node tests/colores.js»
// (dice cuántos hay en cada archivo, para ir bajando los topes de tests/colores-topes.json).
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const COLOR = /#[0-9a-fA-F]{3,8}(?![\w-])|\b(?:rgba?|hsla?)\(|(?<![\w-])(?:white|black)(?![\w-])/g;
const ROOT_GF = new Set(['01-base.css', '21-como-el-icono.css']);

const contar = (t) => (t.match(COLOR) || []).length;

export function coloresCSS(nombre, css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let n = 0, i = 0;
  // recorre los bloques; los de @media/@supports se abren y se mira dentro
  const pila = [];
  let desde = 0, saltar = 0;
  for (; i < css.length; i++) {
    const c = css[i];
    if (c === '{') {
      const sel = css.slice(desde, i).trim();
      const esTema = /\[data-tema/.test(sel) || (ROOT_GF.has(nombre) && /^:root$/.test(sel));
      if (!saltar) n += contar(sel);
      pila.push(esTema);
      if (esTema) saltar++;
      desde = i + 1;
    } else if (c === '}') {
      if (!saltar) n += contar(css.slice(desde, i));
      if (pila.pop()) saltar--;
      desde = i + 1;
    } else if (c === ';' && !saltar) {
      n += contar(css.slice(desde, i + 1)); desde = i + 1;
    } else if (c === ';') desde = i + 1;
  }
  return n;
}
export function coloresJS(js) {
  // fuera los comentarios de línea entera y de bloque (aproximado, basta para contar)
  js = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return contar(js);
}
export function cuentaTodo() {
  const r = {};
  for (const f of readdirSync(join(RAIZ, 'src', 'css')).filter((f) => f.endsWith('.css')).sort()) r['css/' + f] = coloresCSS(f, readFileSync(join(RAIZ, 'src', 'css', f), 'utf8'));
  for (const d of ['', 'trozos/']) for (const f of readdirSync(join(RAIZ, 'src', 'js', d)).filter((f) => f.endsWith('.js')).sort()) r['js/' + d + f] = coloresJS(readFileSync(join(RAIZ, 'src', 'js', d, f), 'utf8'));
  return r;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = cuentaTodo(), total = (p) => Object.entries(r).filter(([k]) => k.startsWith(p)).reduce((a, [, v]) => a + v, 0);
  for (const [k, v] of Object.entries(r)) if (v) console.log(String(v).padStart(4), k);
  console.log(`CSS ${total('css/')} · JS ${total('js/')}`);
}
