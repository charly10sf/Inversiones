// Saca la cáscara REAL de la app (Hoy y Reparto) como HTML sin scripts y con capturas, para la maqueta del 3D.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { preparar, crearCuenta, quitarCapas, meterCartera } from './ayuda.js';
const [,, ancho, tema, acabado] = process.argv;
const w = +ancho, movil = w < 600;
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: w, height: movil ? 844 : 900 }, deviceScaleFactor: movil ? 2 : 1, isMobile: movil, hasTouch: movil, locale: 'es-ES' });
const errores = await preparar(context, { ajustes: { 'inv-tema': JSON.stringify(tema), 'inv-modo': JSON.stringify('avanzado'), 'inv-acabado': JSON.stringify(acabado), 'inv-empezar-no': true, 'inv-empezar-fin': true } });
const page = await context.newPage();
await crearCuenta(page);
await meterCartera(page);
await page.evaluate(() => { S.recienCreada = false; S.acceso = 'privado'; LS.set('inv-acceso', { a: 'privado', uid: FB.user.uid, t: Date.now() }); pintar(); });
await page.waitForTimeout(3500);
const sacar = async (nombre) => {
  await quitarCapas(page); await page.waitForTimeout(500);
  await page.screenshot({ path: `/home/claude/snap/${nombre}-${w}.png` });
  const hh = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
  await page.setViewportSize({ width: w, height: Math.min(hh, 5200) }); await page.waitForTimeout(500);
  await page.screenshot({ path: `/home/claude/snap/${nombre}-${w}-larga.png` });
  await page.setViewportSize({ width: w, height: movil ? 844 : 900 }); await page.waitForTimeout(300);
  const html = await page.evaluate(() => {
    const d = document.documentElement.cloneNode(true);
    d.querySelectorAll('script, link[rel=modulepreload], link[rel=manifest], link[rel=icon], link[rel=apple-touch-icon], noscript').forEach((n) => n.remove());
    return '<!doctype html>\n' + d.outerHTML;
  });
  writeFileSync(`/home/claude/snap/${nombre}-${w}.html`, html);
  console.log('ok', nombre, w, html.length);
};
await page.evaluate(() => { location.hash = '#hoy'; }); await page.waitForTimeout(1800);
await sacar('hoy');
await page.evaluate(() => { location.hash = hrefPag(PAG.reparto); }); await page.waitForTimeout(2500);
await sacar('reparto');
if (errores.length) console.log('errores', errores.slice(0, 4));
await browser.close();
