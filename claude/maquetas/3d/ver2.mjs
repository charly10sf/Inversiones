// mira la página de fuera entera: pasos = esperas (ms), cap, o JS para evaluar en la página de fuera; "f:..." evalúa dentro del marco
import { chromium } from '/home/claude/inversiones/node_modules/@playwright/test/index.mjs';
const [,, ancho, alto, fuera, ...pasos] = process.argv;
const w = +ancho, movil = w < 600;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const c = await b.newContext({ viewport: { width: w, height: +alto }, deviceScaleFactor: movil ? 2 : 1, isMobile: movil, hasTouch: movil });
const p = await c.newPage(); const err = [];
p.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall/.test(m.text())) err.push(m.text().slice(0, 300)); });
p.on('pageerror', (e) => err.push('PAGEERROR ' + String(e).slice(0, 400)));
await p.goto('http://localhost:8799/index.html');
await p.waitForTimeout(2500);
let n = 0;
for (const s of pasos) {
  if (/^\d+$/.test(s)) await p.waitForTimeout(+s);
  else if (s === 'cap') await p.screenshot({ path: `${fuera}-${++n}.png` });
  else if (s === 'capf') { const f = await p.$('#marcoF'); await f.screenshot({ path: `${fuera}-${++n}.png` }); }
  else if (s.startsWith('f:')) { const fr = p.frames().find((x) => x !== p.mainFrame()); console.log('f>', JSON.stringify(await fr.evaluate(s.slice(2)))); }
  else console.log('>', JSON.stringify(await p.evaluate(s)));
}
if (err.length) console.log('ERRORES', err.slice(0, 8));
await b.close();
