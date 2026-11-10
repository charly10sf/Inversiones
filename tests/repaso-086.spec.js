// Repaso de la 0.8.6 para mirar a ojo (no es una prueba): GF_REPASO=1 npx playwright test tests/repaso-086.spec.js
// Cada página nueva de la 0.8.6 en Mármol y Marfil, básico y avanzado, a 390 y 1.440: captura entera en
// /tmp/repaso-086/ (o GF_REPASO_DIR; fuera de test-results, que Playwright vacía) y, al lado, un .json con lo que se sale del ancho, el texto cortado, los candados, las
// palabras que la CNMV no quiere en boca de la app y los errores de la consola. Sin GF_REPASO, se salta.
import { test } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';
import { meterCarteraTuAno } from './tuano-cartera.js';

const DIR = process.env.GF_REPASO_DIR || '/tmp/repaso-086';
test.beforeEach(({}, info) => test.skip(!process.env.GF_REPASO || info.project.name === 'movil-pequeno' && !process.env.GF_CAP360, 'solo a mano'));
const ancho = (info) => ({ pc: 1440, movil: 390, 'movil-pequeno': 360 }[info.project.name]);

async function medir(page) {
  return page.evaluate(() => {
    const W = innerWidth, fuera = [], cortado = [];
    const nombre = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    // dentro de una tira que hace scroll o de algo que recorta (un svg, overflow: hidden), no se ve fuera
    const enTira = (el) => { if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') return true; for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'clip') return true; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
    for (const el of document.querySelectorAll('#app *, body > .hoja-fondo *, body > [class*="ta-"] *')) {
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      if ((r.right > W + 1 || r.left < -1) && !enTira(el) && !el.closest('[aria-hidden="true"], .sr-only, .vh')) fuera.push(`${nombre(el)} ${Math.round(r.left)}→${Math.round(r.right)} «${(el.innerText || '').trim().slice(0, 40)}»`);
      const hoja = !Array.from(el.children).some((c) => c.textContent.trim());
      if (hoja && el.textContent.trim() && el.scrollWidth > el.clientWidth + 1 && /hidden|clip/.test(cs.overflowX + cs.overflow)) cortado.push(`${nombre(el)} ${el.scrollWidth}/${el.clientWidth}${cs.textOverflow === 'ellipsis' ? ' (…)' : ''} «${el.textContent.trim().slice(0, 60)}»`);
    }
    const txt = document.querySelector('#app').innerText;
    const cnmv = [...txt.matchAll(/[^\n]{0,40}\b(compra|vende|compre|venda|comprar|vender|deberías|debes|te recomendamos|garantiza)\b[^\n]{0,40}/gi)].map((m) => m[0].trim());
    const cand = document.querySelectorAll('#app .ls-cand, #app .fr-cand, #app .es-candado, #app [class*="candado"]').length;
    return { W, scroll: document.documentElement.scrollWidth, fuera: fuera.slice(0, 30), cortado: cortado.slice(0, 30), cand, cnmv: [...new Set(cnmv)].slice(0, 30) };
  });
}

async function base(page, context, tema, modo, tuano = false) {
  const errores = await preparar(context, { ajustes: { 'inv-tema': JSON.stringify(tema) } });
  await crearCuenta(page);
  if (tuano) await meterCarteraTuAno(page); else await meterCartera(page);
  await quitarCapas(page);
  await page.evaluate(async (m) => {
    LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); LS.set('inv-dueno', 0); S.esDueno = false; S.noDueno = true;
    if (!S.cartera.posiciones.some((p) => p.lotes)) for (const p of S.cartera.posiciones) p.desde = '2021-03-01';
    await guardarCartera('prueba'); ponerModo(m);
  }, modo);
  return errores;
}
const ir = async (page, h, sel) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForSelector(sel, { timeout: 25000 }); await page.waitForTimeout(900); await quitarCapas(page); };
async function guardar(page, info, nombre, errores, extra = {}) {
  mkdirSync(DIR, { recursive: true });
  const f = `${DIR}/${nombre}-${ancho(info)}`;
  await page.screenshot({ path: f + '.png', fullPage: true });
  writeFileSync(f + '.json', JSON.stringify({ ...(await medir(page)), errores: [...errores], ...extra }, null, 1));
}

for (const tema of ['marmol', 'marfil']) for (const modo of ['basico', 'avanzado']) {
  const k = `${tema}-${modo}`;
  test(`lista · ${k}`, async ({ page, context }, info) => {
    const e = await base(page, context, tema, modo);
    await page.waitForFunction(() => S.radar && S.radar.valores && S.radar.valores.length > 30 && S.escaneo, null, { timeout: 30_000 });
    await page.evaluate(() => {
      const xs = S.radar.valores.filter((x) => x.pe > 0 && x.p > 0).slice(0, 8);
      S.cartera.siguiendo = xs.map((x) => ({ s: x.s, n: nombreRadar(x), desde: hoyIso(), p0: +x.pe }));
      S.escaneo.lectura = S.escaneo.lectura || {};
      xs.slice(0, 4).forEach((x, i) => { S.escaneo.lectura[x.s] = { d: new Date().toISOString(), imp: ['positivo', 'negativo', 'neutral', 'mixto'][i], rel: 3, txt: `Noticia de ${nombreRadar(x)} para el repaso, con un titular largo de los que ocupan dos líneas.`, cat: '', fuentes: [] }; });
      S.expTab = 'siguiendo'; S.segLista = 'mi'; S.segSel = null; LS.set('inv-lista-vista', 'tabla');
    });
    await ir(page, '#expertos', '#segRaiz .ls-lista');
    await page.evaluate(() => { S.expTab = 'siguiendo'; pintar(); });
    await page.waitForSelector('#segRaiz .ls-lista'); await page.waitForTimeout(600); await quitarCapas(page);
    await guardar(page, info, `lista-tabla-${k}`, e);
    if (info.project.name === 'pc') {
      await page.evaluate(() => { LS.set('inv-lista-vista', 'tarjetas'); pintar(); });
      await page.waitForTimeout(800); await quitarCapas(page);
      await guardar(page, info, `lista-tarjetas-${k}`, e);
    }
  });
  test(`frente · ${k}`, async ({ page, context }, info) => {
    const e = await base(page, context, tema, modo);
    await ir(page, 'av-frente', '#frGraf svg');
    await guardar(page, info, `frente-${k}`, e);
  });
  test(`tuano · ${k}`, async ({ page, context }, info) => {
    const e = await base(page, context, tema, modo, true);
    await ir(page, 'av-tuano', '#panelAv[data-p="tuano"]:not([aria-busy]) .ta-t');
    await guardar(page, info, `tuano-${k}`, e);
    await page.evaluate(() => ponerDiscreto(true)); await page.waitForTimeout(900); await quitarCapas(page);
    await guardar(page, info, `tuano-discreto-${k}`, e);
  });
  test(`hoy · ${k}`, async ({ page, context }, info) => {
    const e = await base(page, context, tema, modo, true);
    await page.evaluate(() => { location.hash = '#cartera'; }); await page.waitForTimeout(800);
    await page.evaluate(async () => { S.cartera.inicio = { ...(S.cartera.inicio || {}), v03: true, bloques: ['patrimonio', 'movidas', 'posiciones', 'ia', 'reparto'] }; await guardarCartera('prueba'); montar(); pintar(); });
    await page.waitForSelector('#vista .movidas-tuyas', { timeout: 25000 }); await page.waitForTimeout(900); await quitarCapas(page);
    await guardar(page, info, `hoy-${k}`, e);
  });
  if (modo === 'basico') test(`entiende · ${tema}`, async ({ page, context }, info) => {
    const e = await base(page, context, tema, modo);
    await ir(page, 'av-entiende', '.ent-tira');
    await guardar(page, info, `entiende-${tema}`, e);
    if (info.project.name !== 'pc') { await page.click('[data-ent-cap="cuesta"]'); await page.click('[data-ent-abrir="ter"]'); }
    else await page.locator('[data-ent-abrir]').nth(3).click();
    await page.waitForTimeout(700); await quitarCapas(page);
    await guardar(page, info, `entiende-leccion-${tema}`, e);
  });
}

// la hoja corta de NOVEDADES de la 0.8.6 (de la 0.8.3d a la 0.8.6), y su «Ir» de Frente a un indexado
for (const tema of ['marmol', 'marfil']) test(`novedades · ${tema}`, async ({ page, context }, info) => {
  const e = await base(page, context, tema, 'avanzado');
  const camino = await page.evaluate(async () => { await cargarTrozo('novedades'); document.querySelectorAll('.hoja-fondo, .tour').forEach((x) => x.remove()); hojaIntermedia('0.8.3d', () => {}, '0.8.6'); return caminoNovedades('0.8.3d', '0.8.6'); });
  await page.waitForSelector('.hoja [data-corta-ir]'); await page.waitForTimeout(900);
  await guardar(page, info, `novedades-${tema}`, e, { camino });
  await page.locator('.hoja').first().screenshot({ path: `${DIR}/novedades-hoja-${tema}-${ancho(info)}.png` });
  await page.evaluate(() => { for (const el of document.querySelectorAll('.hoja, .hoja *')) if (el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY)) el.scrollTop = 1e5; });
  await page.waitForTimeout(500);
  await page.locator('.hoja').first().screenshot({ path: `${DIR}/novedades-hoja-fin-${tema}-${ancho(info)}.png` });
  await page.evaluate(() => { for (const el of document.querySelectorAll('.hoja, .hoja *')) el.scrollTop = 0; });
  await page.locator('[data-corta-ir="1"]').click();
  await page.waitForTimeout(1500);
  writeFileSync(`${DIR}/novedades-ir-${tema}-${ancho(info)}.json`, JSON.stringify({ hash: await page.evaluate(() => location.hash), tour: await page.locator('.tour').count() }));
  await page.screenshot({ path: `${DIR}/novedades-ir-${tema}-${ancho(info)}.png` });
});
