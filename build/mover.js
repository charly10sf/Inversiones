// Herramienta para repartir el código entre el núcleo y los trozos (0.6): saca declaraciones de arriba del todo de un
// archivo de src/js (con los comentarios que llevan justo encima) y las deja, en el mismo orden, en otro.
// Uso: node build/mover.js <de.js> <a.js> nombre [nombre…]   (rutas relativas a src/js; «a» se crea si no existe)
import { parse } from 'acorn';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'js');
const [de, a, ...nombres] = process.argv.slice(2);
if (!de || !a || !nombres.length) { console.error('Uso: node build/mover.js <de.js> <a.js> nombre [nombre…]'); process.exit(1); }
const codigo = readFileSync(join(JS, de), 'utf8');
const ast = parse(codigo, { ecmaVersion: 'latest', sourceType: 'script' });
const nombresDe = (n) => {
  if (n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') return [n.id.name];
  if (n.type === 'VariableDeclaration') return n.declarations.flatMap((d) => (d.id.type === 'Identifier' ? [d.id.name] : []));
  return [];
};
// inicio de la línea del nodo y, hacia arriba, los comentarios pegados a él
function desde(n) {
  let i = codigo.lastIndexOf('\n', n.start - 1) + 1;
  for (;;) {
    const fin = i - 1; if (fin <= 0) break;
    const ini = codigo.lastIndexOf('\n', fin - 1) + 1, linea = codigo.slice(ini, fin);
    if (/^\s*\/\//.test(linea)) { i = ini; continue; }
    if (/\*\/\s*$/.test(linea)) { const abre = codigo.lastIndexOf('/*', fin); const li = codigo.lastIndexOf('\n', abre - 1) + 1; if (/^\s*$/.test(codigo.slice(li, abre))) { i = li; continue; } }
    break;
  }
  return i;
}
const hasta = (n) => { const j = codigo.indexOf('\n', n.end); return j < 0 ? codigo.length : j + 1; };
const quiero = new Set(nombres), trozos = [];
for (const n of ast.body) {
  const ns = nombresDe(n);
  if (!ns.some((x) => quiero.has(x))) continue;
  if (!ns.every((x) => quiero.has(x))) { console.error(`«${ns.join(', ')}» van en la misma declaración: hay que moverlos juntos`); process.exit(1); }
  ns.forEach((x) => quiero.delete(x));
  trozos.push([desde(n), hasta(n)]);
}
if (quiero.size) { console.error('No están arriba del todo en ' + de + ': ' + [...quiero].join(', ')); process.exit(1); }
let resto = codigo, sacado = '';
for (const [i, j] of [...trozos].reverse()) { sacado = codigo.slice(i, j) + sacado; resto = resto.slice(0, i) + resto.slice(j); }
writeFileSync(join(JS, de), resto);
const dest = join(JS, a), previo = existsSync(dest) ? readFileSync(dest, 'utf8') : '';
writeFileSync(dest, previo + (previo && !previo.endsWith('\n') ? '\n' : '') + sacado);
console.log(`${nombres.length} declaraciones de ${de} a ${a} (${sacado.length} caracteres)`);
