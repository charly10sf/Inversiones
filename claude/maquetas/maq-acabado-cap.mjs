// Maqueta del acabado híbrido en el resto del ordenador (11 nov, noche).
// node tests/maq-acabado-cap.mjs <marmol|marfil> <1440|1280> <ahora,hibrido> [hoy,rentab,mercados,ajustes,ia]
//   ahora   = la barra A en híbrido (maq-barra*) y el resto de la app como está
//   hibrido = lo mismo + maq-acabado.css (body.ac-h): todo plano, el oro solo en lo elegido
// INVENTARIO=1: en vez de capturas, saca la lista de lo que lleva degradado, sombra o cristal en cada pantalla
// Capturas a 1,5× en /home/claude/acabado/cap/<pantalla>-<tema>-<ancho>-<version>.png
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { preparar, crearCuenta, quitarCapas } from './ayuda.js';
const [,, tema, ancho, versiones = 'ahora,hibrido', pantallas = 'hoy,rentab,mercados,ajustes,ia'] = process.argv;
const w = +ancho, dir = '/home/claude/acabado/cap/';
mkdirSync(dir, { recursive: true });
const INV = !!process.env.INVENTARIO;
const VJS = readFileSync('tests/maq-barra.js', 'utf8');
const CSS_BARRA = readFileSync('tests/maq-barra.css', 'utf8') + readFileSync('tests/maq-barra-acabado.css', 'utf8');
const CSS_AC = readFileSync('tests/maq-acabado.css', 'utf8');
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: w, height: 860 }, deviceScaleFactor: INV ? 1 : 1.5, locale: 'es-ES' });
const errores = await preparar(context, { ajustes: { 'inv-tema': JSON.stringify(tema), 'inv-modo': JSON.stringify('avanzado'), 'inv-empezar-no': true, 'inv-empezar-fin': true, 'inv-ia-grande': true } });
const page = await context.newPage();
await crearCuenta(page);
// la cartera de prueba de siempre (23.380 €, cinco posiciones)
await page.evaluate(async () => {
  const pos = [];
  const add = (i, pl, f) => S.inst[i] && pos.push({ id: 'p' + (pos.length + 1), instrumento: i, plataforma: pl, cantidad: 1, coste: 1, fecha: f });
  add('fidelity-world', 'MyInvestor', '2023-03-06'); add('vanguard-em', 'MyInvestor', '2023-09-04'); add('phau', 'Trade Republic', '2024-02-05'); add('repsol', 'Trade Republic', '2024-05-13'); add('btc', 'Bitvavo', '2024-01-22');
  const eur = [11240, 3180, 2850, 3960, 2150], g = [16, 6, 24, 9, 41];
  pos.forEach((p, i) => { const pr = precioInst(p.instrumento); p.cantidad = Math.round(eur[i] / pr * 1e6) / 1e6; p.coste = Math.round(p.cantidad * pr / (1 + g[i] / 100) * 100) / 100; });
  S.cartera.posiciones.push(...pos); S.cartera.efectivo = [{ plataforma: 'Trade Republic', importe: 240 }];
  await guardarCartera('prueba'); pintar();
});
await page.waitForTimeout(3500);
await page.addStyleTag({ content: CSS_BARRA + CSS_AC + ' #toast,.toast{display:none!important}' });
await page.addScriptTag({ content: VJS });

// lo que lleva degradado, sombra o cristal (lo visible), agrupado por la clase del elemento
const inventario = () => page.evaluate(() => {
  const out = {};
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight + 1200) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const marcas = [];
    for (const [pseudo, c] of [['', cs], ['::before', getComputedStyle(el, '::before')], ['::after', getComputedStyle(el, '::after')]]) {
      if (pseudo && c.content === 'none') continue;
      if (/gradient/.test(c.backgroundImage)) marcas.push(pseudo + 'degradado');
      if (c.boxShadow !== 'none') marcas.push(pseudo + 'sombra');
      if ((c.backdropFilter || c.webkitBackdropFilter || 'none') !== 'none') marcas.push(pseudo + 'cristal');
      if (c.textShadow !== 'none') marcas.push(pseudo + 'sombra-texto');
    }
    if (!marcas.length) continue;
    const k = el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : el.id ? '#' + el.id : '') + (el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-current') === 'page' ? '[elegido]' : '');
    const anc = el.closest('[class]:not(body)')?.parentElement?.closest('[class]:not(body)');
    (out[k] ||= { n: 0, m: new Set(), dentro: anc ? anc.className.toString().split(' ')[0] : '' }).n++;
    marcas.forEach((m) => out[k].m.add(m));
  }
  return Object.entries(out).map(([k, v]) => `${k}  ×${v.n}  ${[...v.m].join(',')}  (en ${v.dentro})`);
});

async function irA(pg) {
  await quitarCapas(page);
  await page.evaluate(() => { typeof cerrarAsesor === 'function' && $('#asesorFondo') && cerrarAsesor(true); for (const h of $$('.hoja-fondo')) h.remove(); document.body.classList.remove('ia-lado', 'ia-grande'); document.body.style.overflow = ''; });
  await page.evaluate(() => typeof quitarBarra === 'function' && quitarBarra());
  const dest = { hoy: 'hoy', rentab: 'rentab', mercados: 'mercados', ajustes: 'hoy', ia: 'rentab' }[pg];
  await page.evaluate((d) => { location.hash = d === 'hoy' ? '#hoy' : hrefPag(PAG[d]); }, dest);
  await page.waitForTimeout(1600);
  await quitarCapas(page);
  await page.evaluate(() => { scrollTo(0, 0); pintarK2(); });
  // la IA agrandada va en la segunda barra de la K2, que A todavía no tiene: esa pantalla sale con la K2 de ahora en híbrido
  await page.evaluate((pg) => { if (pg !== 'ia') { montarBarra('A'); document.body.classList.add('mb-ac', 'mb-ac-hibrido'); } }, pg);
  if (pg === 'ajustes') { await page.evaluate(() => abrirAjustes()); await page.waitForTimeout(900); }
  if (pg === 'ia') {
    await page.evaluate(async () => { await abrirAsesor(); agrandarIA(true); });
    await page.waitForTimeout(1500);
    // una conversación corta de ejemplo para que se vea la caja con burbujas (solo el dibujo; no llama a nadie)
    await page.evaluate(() => {
      const c = $('#asCuerpo'); if (!c) return;
      c.innerHTML = htmlTurno({ rol: 'yo', texto: '¿Voy bien para jubilarme a los 60?' }, 0) + htmlTurno({ rol: 'ia', partes: [
        { tipo: 'paso', txt: 'Mirado tu perfil, tu cartera y tus aportaciones' },
        { tipo: 'texto', texto: 'Con lo que tienes (23.380 €) y metiendo 300 € al mes, a los 60 llegarías a unos **412.000 €** si la cartera rinde como hasta ahora (un 6,8 % al año).\n\nPara vivir de ello sacando un 3,5 % al año serían unos 1.200 € al mes. Si quieres más, lo que más mueve la cifra es lo que aportas, no dónde lo metes.' }],
        citas: [], resultados: [] }, 1);
      const pie = $('#asPie'); if (pie) pie.hidden = false;
    });
    await page.waitForTimeout(400);
  }
  await page.mouse.move(w - 30, 840);
}

// los recortes de la página (en px de CSS): dónde está cada pieza en cada pantalla
const PIEZAS = {
  hoy: { arriba: '.k2-top', periodos: '.hero-rangos', aviso: '.pf-recuerda', botones: '.hero-top', chips: '.hp-cmp', hero: '.hero-panel' },
  rentab: { tarjetas: '.ts-grupo ~ *, #vista .tarjeta' },
  mercados: { busca: '.merc-busca', mapa: '.mapa-w' },
  ajustes: { hoja: '.hoja' },
  ia: { panel: '.asesor', pestanas: '.k2-pest', modo: '.as-modo', campo: '.as-pie' },
};
const rects = {};
const informe = [];
for (const pg of pantallas.split(',')) {
  await irA(pg);
  rects[pg] = await page.evaluate((m) => Object.fromEntries(Object.entries(m).map(([k, sel]) => {
    const el = [...document.querySelectorAll(sel)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 10 && r.top < innerHeight; });
    if (!el) return [k, null];
    const r = el.getBoundingClientRect();
    return [k, [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(Math.min(r.height, innerHeight - r.top))]];
  })), PIEZAS[pg] || {});
  if (INV) { informe.push(`## ${pg} (${tema}, ${w})`, ...(await inventario()), ''); continue; }
  for (const v of versiones.split(',')) {
    await page.evaluate(([h, ia]) => { document.body.classList.toggle('ac-h', h); if (ia) document.body.classList.toggle('mb-ac', h), document.body.classList.toggle('mb-ac-hibrido', h); }, [v === 'hibrido', pg === 'ia']);
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${dir}${pg}-${tema}-${w}-${v}.png` });
    console.log('cap', pg, tema, w, v);
  }
}
writeFileSync(`/home/claude/acabado/rects-${tema}-${w}.json`, JSON.stringify(rects));
if (INV) writeFileSync(`/home/claude/acabado/inventario-${tema}-${w}.txt`, informe.join('\n'));
if (errores.length) console.log('errores', errores.slice(0, 4));
await browser.close();
