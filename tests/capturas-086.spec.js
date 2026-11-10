// Capturas de la 0.8.6 para revisar a ojo (no es una prueba): GF_CAPTURAS=1 npx playwright test tests/capturas-086.spec.js
// Las deja en claude/capturas/086/. Sin GF_CAPTURAS, se salta.
import { test } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const DIR = 'claude/capturas/086';
test.beforeEach(({}, info) => test.skip(!process.env.GF_CAPTURAS || info.project.name === 'movil-pequeno' && !process.env.GF_CAP360, 'solo a mano'));

async function cartera(page, modo) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(async (m) => {
    LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true);
    for (const p of S.cartera.posiciones) p.desde = '2021-03-01';
    await guardarCartera('prueba'); ponerModo(m);
  }, modo);
}
const ir = async (page, h, sel) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForSelector(sel, { timeout: 20000 }); await page.waitForTimeout(800); await quitarCapas(page); };
const ancho = (info) => ({ pc: 1440, movil: 390, 'movil-pequeno': 360 }[info.project.name]);

for (const modo of ['avanzado', 'basico']) {
  test(`frente · ${modo}`, async ({ page, context }, info) => {
    await preparar(context); await cartera(page, modo);
    await ir(page, 'av-frente', '#frGraf svg');
    await page.screenshot({ path: `${DIR}/frente-${modo}-${ancho(info)}.png`, fullPage: true });
    if (modo === 'avanzado' && info.project.name === 'pc') {
      await page.evaluate(() => { S.esDueno = true; LS.set('inv-dorado-ver', 1); repintarAv(); });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${DIR}/frente-dorado-${ancho(info)}.png`, fullPage: true });
    }
  });
}

test('entiende · índice y lección', async ({ page, context }, info) => {
  await preparar(context); await cartera(page, 'basico');
  await ir(page, 'av-entiende', '.ent-tira');
  await page.screenshot({ path: `${DIR}/entiende-${ancho(info)}.png`, fullPage: true });
  if (info.project.name !== 'pc') {
    await page.click('[data-ent-cap="cuesta"]'); await page.click('[data-ent-abrir="ter"]'); await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/entiende-leccion-${ancho(info)}.png`, fullPage: true });
  }
});
