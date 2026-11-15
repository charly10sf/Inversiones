// mira una cáscara suelta: capturas en varios momentos y los errores de consola
import { chromium } from '/home/claude/inversiones/node_modules/@playwright/test/index.mjs';
const [,, pag, ancho, alto, fuera, ...pasos] = process.argv;
const w = +ancho, movil = w < 600;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const c = await b.newContext({ viewport: { width: w, height: +alto }, deviceScaleFactor: movil ? 2 : 1, isMobile: movil, hasTouch: movil });
const p = await c.newPage(); const err = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') err.push(m.text().slice(0, 300)); });
p.on('pageerror', (e) => err.push('PAGEERROR ' + String(e).slice(0, 400)));
await p.goto('http://localhost:8799/' + pag);
await p.waitForTimeout(1800);
let n = 0;
for (const s of pasos) {
  if (/^\d+$/.test(s)) await p.waitForTimeout(+s);
  else if (s.startsWith('cap')) await p.screenshot({ path: `${fuera}-${++n}.png` });
  else await p.evaluate(s);
}
if (err.length) console.log('ERRORES', err.slice(0, 8));
await b.close();
