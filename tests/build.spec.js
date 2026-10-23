// Lo que tiene que cumplir el build (dist/), sin abrir la app.
import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..');
const dist = (...p) => join(RAIZ, 'dist', ...p);
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'una vez basta'));

test('VERSION está en un solo sitio y es la primera de NOVEDADES', () => {
  const v = readFileSync(join(RAIZ, 'src/js/version.js'), 'utf8').match(/const VERSION = '([^']+)'/)[1];
  const nov = readFileSync(join(RAIZ, 'src/js/39-versiones-y-novedades.js'), 'utf8');
  expect(nov.match(/const NOVEDADES = \[\n {2}\{ v: '([^']+)'/)[1]).toBe(v);
  const todo = readdirSync(join(RAIZ, 'src/js'), { recursive: true }).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(RAIZ, 'src/js', f), 'utf8')).join('');
  expect(todo.match(/const VERSION = /g)).toHaveLength(1);
  // el service worker publicado lleva la versión en el nombre de su caché
  expect(readFileSync(dist('sw.js'), 'utf8')).toContain(`var CACHE = 'gf-${v}-`);
});

test('el build trae el CSS y el JS minificados, con huella, y todo lo que pide la página', () => {
  const html = readFileSync(dist('index.html'), 'utf8');
  const css = html.match(/href="(assets\/app-[0-9a-f]{10}\.css)"/), js = html.match(/src="(assets\/app-[0-9a-f]{10}\.js)"/);
  expect(css && js, 'index.html enlaza el CSS y el JS del build').toBeTruthy();
  const codigo = readFileSync(dist(js[1]), 'utf8');
  expect(codigo.startsWith('"use strict";'), 'el modo estricto sigue siendo lo primero').toBe(true);
  // las funciones de arriba del todo conservan su nombre (las usan las pruebas, el widget y unas a otras entre secciones)
  for (const f of ['function pintar(', 'function iniciar(', 'function abrirAjustes(', 'NOVEDADES=']) expect(codigo).toContain(f);
  for (const f of ['manifest.webmanifest', 'favicon.svg', 'growfolio-192.png', 'instrumentos.json', 'mapa-mundo.json', 'lib/html2canvas.min.js', 'sw.js']) {
    expect(existsSync(dist(f)), f).toBe(true);
  }
  const sw = readFileSync(dist('sw.js'), 'utf8');
  expect(sw).toContain(`'${js[1]}'`);
  expect(sw).toContain(`'${css[1]}'`);
});
