// 0.7v: los colores escritos a mano no pueden subir. El rediseño a Toisón (0.8) los va pasando a los tokens de
// src/css/00-temas.css; cada archivo tiene su tope en tests/colores-topes.json, que solo baja, hasta llegar a 0 en la 0.8.
// Sin navegador. Si un archivo tiene menos que su tope, la prueba lo dice: baja el tope a lo que tenga
// (node tests/colores.js da la cuenta de cada uno).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { cuentaTodo, coloresCSS } from './colores.js';

test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'una vez basta'));

const TOPES = JSON.parse(readFileSync(new URL('./colores-topes.json', import.meta.url), 'utf8'));

test('ningún archivo tiene más colores sueltos que su tope', () => {
  const r = cuentaTodo(), pasados = [], bajar = [];
  for (const [f, n] of Object.entries(r)) {
    const tope = TOPES[f] || 0;
    if (n > tope) pasados.push(`${f}: ${n} (tope ${tope})`);
    else if (n < tope) bajar.push(`${f}: ${n} (tope ${tope})`);
  }
  if (bajar.length) console.log('Se puede bajar el tope de tests/colores-topes.json en:\n  ' + bajar.join('\n  '));
  expect(pasados, 'Colores escritos a mano de más: usa los tokens de src/css/00-temas.css (var(--fondo), var(--texto)…)').toEqual([]);
});

test('el archivo de los temas solo tiene colores dentro de sus bloques', () => {
  expect(coloresCSS('00-temas.css', readFileSync(new URL('../src/css/00-temas.css', import.meta.url), 'utf8'))).toBe(0);
});

test('el contador ve lo que tiene que ver', () => {
  const css = `:root { --a: #fff; } [data-tema="x"] { --b: #000; } .a { color: #123456; background: rgba(0,0,0,.5); }
    @media (max-width: 9px) { .b { border-color: white; white-space: nowrap; } [data-tema] .c { color: #abc; } }`;
  expect(coloresCSS('99-x.css', css)).toBe(4);
  expect(coloresCSS('01-base.css', css)).toBe(3);
});
