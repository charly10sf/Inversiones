// 0.8 (paso 5c) · Accesibilidad en los tres diseños: contraste y ARIA con axe-core (WCAG 2.1 A y AA), el foco se ve al
// moverse con el teclado y los botones pequeños se pueden tocar en 48 × 48 px sin quitarle el toque a otro.
// Fuera a propósito, la regla «label-content-name-mismatch» (2.5.3, el nombre que se lee empieza distinto de lo que se
// ve): quedan la cuenta atrás de GTA («VI 15d» se lee «GTA VI: faltan 15 días»), los días del calendario («V 6» se lee
// «viernes 6 de noviembre: …») y los botones del mapa con nombre corto; se leen mejor así. El área de 48 px va en
// 00-temas.css («Accesibilidad»); el saludo con el nombre y «Esta semana · Ver el mes» se quedan fuera (su caja recorta o
// es estática por otra regla y el área se saldría).
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const PANTALLAS = ['hoy', 'posiciones', 'analisis', 'fiscal', 'mercados', 'ideas', 'tu', 'objetivos', 'ruta', 'proyeccion', 'agenda'];
const PEQUENOS = '.hero-ojo, .hv-info, .t-check, .ib:not(.ib-fallo), .as-boton, .enlace, .rh-mas, .hp-cmp, .t-hecho, .btn.peq, .mv-c, .vista-volver';
const TOCABLE = 'button, a[href], [role="button"], input, select, summary, label';

const conTema = (tema) => base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'inv-tema': JSON.stringify(tema), 'stub-dueno': 'lucia@prueba.com' } });
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});

async function axe(page) {
  await page.waitForTimeout(500);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).disableRules(['label-content-name-mismatch']).analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' ' + (n.failureSummary || '').split('\n')[1]).join(' | ')}`);
}

/** Cada botón pequeño visible responde en 48 × 48 alrededor de su centro, y el centro de cada cosa tocable sigue siendo suyo */
function tactil() {
  const fallos = [];
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width && r.height && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && getComputedStyle(el).visibility !== 'hidden' ? r : null; };
  const nombre = (el) => el.tagName.toLowerCase() + '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') + ' «' + (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 20) + '»';
  const tapado = (el, x, y) => { const e = document.elementFromPoint(x, y); return !e || e.closest('.tour, .hoja-fondo, .top, nav.barra, .barra, .intro, .k2-top, .riel') && !el.closest('.tour, .hoja-fondo, .top, nav.barra, .barra, .intro, .k2-top, .riel'); };
  for (const el of document.querySelectorAll(window.__PEQ)) {
    const r = vis(el); if (!r || getComputedStyle(el).pointerEvents === 'none') continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    // si en su centro no sale él, está tapado o recortado (dentro de algo plegado): no se ve, no cuenta
    const c = document.elementFromPoint(cx, cy); if (!c || !el.contains(c)) continue;
    for (const [x, y] of [[cx, cy - 22], [cx, cy + 22], [cx - 22, cy], [cx + 22, cy]]) {
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight || tapado(el, x, y)) continue;
      const e = document.elementFromPoint(x, y);
      const dueño = e && e.closest(window.__TOC);
      // vale si responde él, o si a esa distancia hay otra cosa tocable (no se le puede quitar el sitio a otro)
      if (dueño !== el && !(dueño && dueño !== el && !dueño.contains(el))) fallos.push(`${nombre(el)} no responde a ${Math.round(x - cx)},${Math.round(y - cy)} (sale ${e ? nombre(e) : 'nada'})`);
    }
  }
  for (const el of document.querySelectorAll(window.__TOC)) {
    const r = vis(el); if (!r || getComputedStyle(el).pointerEvents === 'none') continue;
    const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!e || tapado(el, r.left + r.width / 2, r.top + r.height / 2)) continue;
    const d = e.closest(window.__TOC);
    if (d && d !== el && !el.contains(d) && !d.contains(el) && d.matches(window.__PEQ)) fallos.push(`el área de ${nombre(d)} tapa el centro de ${nombre(el)}`);
  }
  return fallos;
}

for (const tema of ['marmol', 'marfil']) {
  conTema(tema)(`${tema}: contraste, ARIA, foco y 48 px en las pantallas`, async ({ page }, info) => {
    base.skip(info.project.name !== 'movil' && tema !== 'marmol', 'en 360 y en el ordenador, con un diseño basta');
    base.setTimeout(180_000);
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    // el «Guardado en tu cuenta» de meter la cartera tapa botones si aún está (carrera según lo rápida que vaya la máquina)
    await page.waitForSelector('.toast', { state: 'detached', timeout: 20_000 }).catch(() => {});
    await page.evaluate(([p, t]) => { window.__PEQ = p; window.__TOC = t; }, [PEQUENOS, TOCABLE]);
    const fallos = {};
    for (const h of PANTALLAS) {
      await page.evaluate((h) => { location.hash = h; scrollTo(0, 0); }, h);
      await page.waitForTimeout(350); await quitarCapas(page);
      const v = await axe(page);
      const t = [];
      // la pantalla entera, a trozos del alto de la ventana
      const alto = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < alto; y += 700) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(60); t.push(...await page.evaluate(tactil)); }
      if (v.length || t.length) fallos[h] = [...v, ...new Set(t)];
    }
    await page.evaluate(() => { location.hash = 'hoy'; scrollTo(0, 0); }); await page.waitForTimeout(300);
    await page.evaluate(() => abrirAjustes());
    const va = await axe(page); if (va.length) fallos.ajustes = va;
    expect(fallos).toEqual({});
  });
}

conTema('marfil')('con el teclado: el foco se ve siempre', async ({ page }, info) => {
  base.skip(info.project.name !== 'pc', 'con teclado, en el ordenador');
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => { location.hash = 'hoy'; scrollTo(0, 0); document.activeElement?.blur(); });
  const sinAro = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const el = document.activeElement; if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const aro = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1 || cs.boxShadow !== 'none';
      return aro ? null : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + ' «' + (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 20) + '»';
    });
    if (r) sinAro.push(r);
  }
  expect([...new Set(sinAro)]).toEqual([]);
});

for (const tema of ['marmol', 'marfil']) {
  conTema(tema)(`${tema}: la presentación, la cuenta y el tutorial`, async ({ page }, info) => {
    base.skip(info.project.name !== 'movil', 'una vez basta');
    await page.goto('/#cuenta');
    await page.waitForSelector('.intro.pres');
    expect(await axe(page), 'presentación').toEqual([]);
    await page.click('.intro-saltar');
    await page.waitForSelector('#fCorreo');
    expect(await axe(page), 'cuenta').toEqual([]);
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    await page.evaluate(() => iniciarTour(0));
    await page.waitForSelector('.tour-tarjeta, .tour');
    expect(await axe(page), 'tutorial').toEqual([]);
  });
}

// 0.8.3a · El cristal de la barra (acabado «liquid»): las letras de la barra se leen (≥ 4,5:1) aunque pase por debajo
// lo más claro posible, un bloque blanco, y con «reducir transparencia» del sistema la barra se vuelve opaca y sin
// desenfoque. El contraste se mide en la captura: el color más repetido debajo de cada etiqueta (que no sea el de la
// propia letra) frente al color de la letra.
async function contrasteBarra(page) {
  const cajas = await page.evaluate(() => [...document.querySelectorAll('.navbar a span')].map((s) => {
    const r = s.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, t: s.textContent.trim(), c: getComputedStyle(s).color };
  }));
  const png = (await page.screenshot()).toString('base64');
  return page.evaluate(async ({ png, cajas }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
    const k = img.width / innerWidth, cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    return cajas.map((c) => {
      const letra = (c.c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const d = cx.getImageData(Math.round(c.x * k), Math.round(c.y * k), Math.max(1, Math.round(c.w * k)), Math.max(1, Math.round(c.h * k))).data;
      const n = new Map();
      for (let i = 0; i < d.length; i += 4) { const key = `${d[i]},${d[i + 1]},${d[i + 2]}`; n.set(key, (n.get(key) || 0) + 1); }
      // los tres más repetidos: el primero que no sea casi la letra (con un degradado, la moda puede salir del texto)
      const top = [...n].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s.split(',').map(Number));
      const fondo = top.find((f) => ratio(f, letra) > 1.5) || top[0];
      return [c.t, +ratio(fondo, letra).toFixed(1)];
    });
  }, { png, cajas });
}

for (const tema of ['marmol', 'marfil']) {
  conTema(tema)(`${tema}: las letras de la barra de cristal se leen con blanco detrás y con «reducir transparencia»`, async ({ page }, info) => {
    base.skip(info.project.name !== 'movil', 'la barra es del móvil; una vez basta');
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    await page.evaluate(() => { location.hash = 'cartera'; });
    await page.waitForTimeout(500); await quitarCapas(page);
    // lo peor que puede pasar por debajo: un bloque blanco (detrás del fundido de abajo, como cualquier cosa de la página)
    await page.evaluate(() => { document.querySelectorAll('.toast').forEach((t) => t.remove()); const b = document.createElement('div'); b.id = 'estres'; b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:140px;z-index:38;background:#fff'; document.querySelector('#app').appendChild(b); });
    await page.waitForTimeout(300);
    const conBlanco = await contrasteBarra(page);
    for (const [t, r] of conBlanco) expect(r, `«${t}» con blanco detrás: ${r}:1`).toBeGreaterThanOrEqual(4.5);
    // con «reducir transparencia», opaca y sin desenfoque
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
    await page.waitForTimeout(300);
    const barra = await page.locator('.navbar').evaluate((e) => { const s = getComputedStyle(e); return [s.backgroundColor, s.backdropFilter]; });
    expect(barra[0]).toBe(tema === 'marmol' ? 'rgb(11, 11, 11)' : 'rgb(60, 11, 22)');
    expect(barra[1]).toMatch(/^blur\(0px\)/);
    for (const [t, r] of await contrasteBarra(page)) expect(r, `«${t}» opaca: ${r}:1`).toBeGreaterThanOrEqual(7);
  });
}
