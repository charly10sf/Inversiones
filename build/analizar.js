// Análisis del código partido (0.6): qué declara cada archivo de src/js arriba del todo y qué nombres de otros archivos
// usa, para saber qué se puede bajar más tarde (un «trozo») y por qué funciones entra el resto en él.
// Uso: node build/analizar.js [trozo ...]   (sin nada, los trozos de src/partes.json)
import { parse } from 'acorn';
import { ancestor } from 'acorn-walk';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (a) => readFileSync(join(RAIZ, 'src', 'js', a), 'utf8');

// declaraciones de arriba del todo: nombre → tipo
function declaraciones(ast) {
  const out = new Map();
  const nombres = (p, f) => {
    if (!p) return;
    if (p.type === 'Identifier') f(p.name);
    else if (p.type === 'ObjectPattern') p.properties.forEach((x) => nombres(x.type === 'RestElement' ? x.argument : x.value, f));
    else if (p.type === 'ArrayPattern') p.elements.forEach((x) => nombres(x, f));
    else if (p.type === 'RestElement') nombres(p.argument, f);
    else if (p.type === 'AssignmentPattern') nombres(p.left, f);
  };
  for (const n of ast.body) {
    if (n.type === 'FunctionDeclaration') out.set(n.id.name, 'function');
    else if (n.type === 'ClassDeclaration') out.set(n.id.name, 'class');
    else if (n.type === 'VariableDeclaration') for (const d of n.declarations) nombres(d.id, (x) => out.set(x, n.kind));
  }
  return out;
}

// identificadores que se leen o se llaman (no los nombres de propiedades ni las claves de objetos)
function referencias(ast) {
  const usos = new Map();   // nombre → { arriba: se usa al cargar el archivo (fuera de funciones), dentro: dentro de funciones }
  ancestor(ast, {
    Identifier(n, st, anc) {
      const p = anc[anc.length - 2];
      if (p && ((p.type === 'MemberExpression' && p.property === n && !p.computed) || (p.type === 'Property' && p.key === n && !p.computed && !p.shorthand)
        || (p.type === 'MethodDefinition' && p.key === n) || (p.type === 'PropertyDefinition' && p.key === n) || p.type === 'LabeledStatement'
        || p.type === 'BreakStatement' || p.type === 'ContinueStatement')) return;
      // dentro de una función que no se llama al momento → se usa más tarde
      let alCargar = true;
      for (let i = anc.length - 2; i >= 0; i--) {
        const a = anc[i];
        if (a.type === 'FunctionDeclaration' || a.type === 'FunctionExpression' || a.type === 'ArrowFunctionExpression') {
          const padre = anc[i - 1];
          const iife = padre && padre.type === 'CallExpression' && padre.callee === a;
          if (!iife) { alCargar = false; break; }
        }
      }
      const u = usos.get(n.name) || { arriba: false, dentro: false, como: new Set() };
      if (alCargar) u.arriba = true; else u.dentro = true;
      // cómo se usa: llamada cuyo resultado no se usa (o se espera con await), o algo más
      let como = 'valor';
      if (p && p.type === 'CallExpression' && p.callee === n) {
        const q = anc[anc.length - 3];
        como = !q || q.type === 'ExpressionStatement' ? 'llamada' : q.type === 'AwaitExpression' ? 'await'
          : q.type === 'ArrowFunctionExpression' && q.body === p ? 'llamada-flecha' : q.type === 'UnaryExpression' && q.operator === 'void' ? 'llamada'
          : q.type === 'LogicalExpression' && anc[anc.length - 4] && anc[anc.length - 4].type === 'ExpressionStatement' ? 'llamada' : 'resultado';
      }
      u.como.add(como);
      usos.set(n.name, u);
    },
  });
  return usos;
}

export function analizar(archivos) {
  const info = {};
  for (const a of archivos) {
    const codigo = leer(a);
    const ast = parse(codigo, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true });
    info[a] = { decl: declaraciones(ast), usos: referencias(ast), bytes: Buffer.byteLength(codigo) };
  }
  const dueno = new Map();
  for (const a of archivos) for (const [n, t] of info[a].decl) dueno.set(n, { a, t });
  return { info, dueno };
}

/** Lo que el resto usa de un trozo: { entradas: [{nombre, tipo, desde: [archivos], alCargar}], bytes } */
export function entradas(trozo, todos, analisis = analizar(todos)) {
  const { info, dueno } = analisis, dentro = new Set(trozo);
  const out = new Map();
  for (const a of todos) {
    if (dentro.has(a)) continue;
    for (const [n, u] of info[a].usos) {
      const d = dueno.get(n);
      if (!d || !dentro.has(d.a)) continue;
      const e = out.get(n) || { nombre: n, tipo: d.t, archivo: d.a, desde: new Set(), alCargar: false, como: new Set() };
      e.desde.add(a); if (u.arriba) e.alCargar = true;
      for (const c of u.como) e.como.add(c);
      out.set(n, e);
    }
  }
  return { entradas: [...out.values()].map((e) => ({ ...e, desde: [...e.desde], como: [...e.como], aplazable: e.tipo === 'function' && !e.alCargar && [...e.como].every((c) => c !== 'resultado' && c !== 'valor') })), bytes: trozo.reduce((s, a) => s + info[a].bytes, 0) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const partes = JSON.parse(readFileSync(join(RAIZ, 'src', 'partes.json'), 'utf8'));
  const todos = [...partes.js, ...Object.values(partes.trozos || {}).flat()];
  const A = analizar(todos);
  const pedidos = process.argv.slice(2);
  const grupos = pedidos.length ? { pedido: pedidos } : partes.trozos || {};
  for (const [nombre, archivos] of Object.entries(grupos)) {
    const r = entradas(archivos, todos, A);
    console.log(`\n== ${nombre}: ${archivos.join(', ')} (${Math.round(r.bytes / 1024)} KB)`);
    for (const e of r.entradas.sort((x, y) => x.desde.length - y.desde.length)) {
      console.log(`  ${e.aplazable ? 'ok' : 'NO'} ${e.alCargar ? '!! AL CARGAR ' : ''}${e.tipo.padEnd(8)} ${e.nombre.padEnd(26)} [${e.como.join(',')}] ← ${e.desde.join(', ')}`);
    }
  }
}
