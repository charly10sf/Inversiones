// 0.8.6b: los arreglos del repaso del 11 nov (claude/repaso-toison-competencia.md, punto 4)
import { test, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

async function dentro(page, context, opc) {
  await preparar(context, opc); await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); });
}

test('la subida del día que escribe la IA dice de qué hora es', async ({ page, context }) => {
  await dentro(page, context);
  const r = await page.evaluate(() => {
    const hoy = new Date(); hoy.setHours(20, 5, 0, 0);
    const ayer = new Date(hoy.getTime() - 864e5);
    const t = 'La cartera vale 79.579 € (+1.013 € hoy, +1,3 %) con un 89 % en bolsa.';
    return {
      hoy: hoyConHoraIA(t, { propio: true, fecha: hoy.toISOString() }),
      negrita: hoyConHoraIA('Vale **79.579 €** (**−240 €** hoy) y poco más.', { propio: true, fecha: hoy.toISOString() }),
      ayer: hoyConHoraIA(t, { propio: true, fecha: ayer.toISOString() }),
      partida: hoyConHoraIA(t, { propio: false, fecha: '2026-11-01' }),
      otra: hoyConHoraIA('Hoy sube la bolsa y hoy, además, baja el oro.', { propio: true, fecha: hoy.toISOString() }),
    };
  });
  expect(r.hoy).toContain('(+1.013 € hoy a las 20:05, +1,3 %)');
  expect(r.negrita).toContain('(**−240 €** hoy a las 20:05)');
  expect(r.ayer).toContain('(+1.013 € ese día, +1,3 %)');
  expect(r.partida).toContain('(+1.013 € hoy, +1,3 %)');   // el análisis de partida no es de nadie ni de ninguna hora
  expect(r.otra).toBe('Hoy sube la bolsa y hoy, además, baja el oro.');   // solo la cifra entre paréntesis
});

test('Objetivos se llama Objetivos, sin el «Más» de delante', async ({ page, context }, info) => {
  await dentro(page, context);
  await page.evaluate(() => { location.hash = 'cartera'; });
  const en = page.locator('.ir-objetivos small');
  await expect(en).toHaveText('están en Objetivos');
  expect(await page.evaluate(() => document.body.innerText.includes('Más › Objetivos'))).toBe(false);
});
test('Objetivos, en inglés', async ({ page, context }) => {
  await dentro(page, context, { idioma: 'en' });
  await page.evaluate(() => { location.hash = 'cartera'; });
  await expect(page.locator('.ir-objetivos small')).toHaveText('are in Goals');
});

test('en la ficha se apunta: ni «Comprar» ni «Vender»', async ({ page, context }) => {
  await dentro(page, context);
  await page.evaluate(() => abrirFicha(S.M.filas.find((f) => f.inst.id === 'repsol').pos.id));
  const b = page.locator('.ficha-botones');
  await expect(b.locator('[data-tipo="compra"]')).toHaveText('Apuntar compra');
  await expect(b.locator('[data-tipo="venta"]')).toHaveText('Apuntar venta');
});

test('la cuenta atrás de la cabecera cuenta los días como el Calendario', async ({ page, context }) => {
  await dentro(page, context);
  const r = await page.evaluate(() => {
    const f = gtaActivo() && gtaFalta(); if (!f || !f.d) return null;
    pintarGtaTop();
    return { chip: (document.querySelector('.gta-top-d') || {}).textContent, dias: diasEntre(hoyIso(), iso(GTA.salida)) };
  });
  test.skip(!r, 'ya ha salido o falta menos de un día');
  expect(r.chip).toBe(`${r.dias}d`);
});

test('en Más, la estrella no pisa el nombre', async ({ page, context }, info) => {
  test.skip(info.project.name === 'pc', 'Más es del móvil');
  await dentro(page, context);
  await page.evaluate(() => { ponerModo('avanzado'); abrirMas(); });
  await page.waitForSelector('.hoja-mas .mas-rejilla li');
  const pisan = await page.evaluate(() => [...document.querySelectorAll('.hoja-mas .mas-rejilla li')].filter((li) => {
    const t = li.querySelector('a > span, button:not(.fij-b) > span'), e = li.querySelector('.fij-b'); if (!t || !e) return false;
    const r = document.createRange(); r.selectNodeContents(t);
    return r.getBoundingClientRect().right > e.getBoundingClientRect().left + 0.5;
  }).map((li) => li.innerText.trim()));
  expect(pisan).toEqual([]);
});

test('en básico, el mapa explica el gris', async ({ page, context }) => {
  await dentro(page, context);
  // el bloque del mapa lo puede tener quitado cada uno en «Personalizar»: se mira el texto de su «¿Qué es?»
  await page.evaluate(() => { ponerModo('basico'); location.hash = 'cartera'; });
  await page.waitForFunction(() => typeof QUE_ES !== 'undefined', null, { timeout: 20000 });
  const t = await page.evaluate(() => QUE_ES.mapa);
  expect(t[0]).toContain('gris si apenas se mueve');
  expect(t[1]).toContain('grey if it barely moves');
});
