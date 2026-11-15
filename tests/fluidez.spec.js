// La fluidez del cambio de pestañas (0.9a, Carlos, 15 nov: «hay que mejorar mucho la fluidez de las animaciones, al
// cambiar de pestañas, la barra de abajo liquid que se quita al cambiar…»). Se mide aparte y solo (npm run fluidez),
// como el rendimiento: en el móvil, con la CPU frenada ×4 y ×6 por CDP, tocando la barra de abajo Hoy → Análisis →
// Mercados → Hoy dos veces (la primera baja trozos; la segunda es la de todos los días), con el movimiento y el 3D puestos.
// Por cada toque: cuánto tarda en verse la página nueva, cuánto hasta que la página deja de moverse, cuánto hasta que no
// se mueve nada, los fotogramas largos (más de 50 ms entre uno y otro) y los «long animation frames» del navegador.
// Deja el resultado en test-results/fluidez-<etiqueta>.json (GF_ETIQUETA; «antes», «despues»…).
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const RECORRIDO = ['posiciones', 'mercados', 'cartera'];
const VUELTAS = 2;
// los topes, con la CPU ×4 y en la segunda vuelta (antes de la 0.9a: Hoy tardaba 2,9 s en verse y la página no se estaba
// quieta hasta 3,7 s; después, en la máquina de las sesiones, ~0,3 y ~0,6 s). Con holgura para la máquina de las Actions
const TOPE = { cpu: 4, verseMs: 700, paginaMs: 1000, peorMs: 800 };

// la traza de Playwright fotografía la página en cada paso: aquí estorba a lo que se mide
test.use({ trace: 'off', screenshot: 'off' });
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'se mide en el móvil'));

for (const cpu of [4, 6]) {
  test(`cambiar de pestaña con la CPU ×${cpu}`, async ({ page, context }) => {
    test.setTimeout(240_000);
    const errores = await preparar(context, {});
    await context.addInitScript(() => {
      window.__loaf = [];
      try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__loaf.push({ t: e.startTime, d: e.duration, b: e.blockingDuration || 0, s: (e.scripts || []).map((x) => `${x.invoker || ''}·${x.sourceFunctionName || ''}·${Math.round(x.duration)}`).slice(0, 4) }); }).observe({ type: 'long-animation-frame', buffered: true }); } catch (e) { /* sin LoAF */ }
    });
    await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
    await page.evaluate(() => {
      LS.set('inv-empezar-no', true); LS.set('inv-empezar-fin', true); S.recienCreada = false;
      LS.set('inv-mov-prueba', true); LS.set('inv-3d-prueba', true);
      // cuánto tarda cada pintar() (el núcleo lo llama por su nombre global)
      const p0 = window.pintar; window.__pint = [];
      window.pintar = function () { const a = performance.now(); const r = p0.apply(this, arguments); window.__pint.push({ t: a, d: performance.now() - a, v: S.vista }); return r; };
      location.hash = 'cartera';
    });
    await quitarCapas(page);
    await expect(page.locator('#heroNum')).toBeVisible();
    // que se baje el 3D y se calme todo antes de medir
    await page.waitForTimeout(5000); await quitarCapas(page);

    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });

    const pasos = [];
    for (let v = 0; v < VUELTAS; v++) {
      for (const k of RECORRIDO) {
        await quitarCapas(page);
        const r = await page.evaluate(async (k) => {
          const a = document.querySelector(`.navbar a[data-ir="${k}"]`);
          const vista = document.querySelector('#vista');
          window.__loaf.length = 0; window.__pint.length = 0;
          let tNueva = null, tVista = null, finPagina = null, quieto = null, barra = null;
          const mo = new MutationObserver(() => { if (tNueva == null) { tNueva = performance.now(); requestAnimationFrame(() => { tVista = performance.now(); }); } });
          mo.observe(vista, { childList: true });
          const frames = [];
          const t0 = performance.now();
          await new Promise((fin) => {
            const paso = () => {
              const t = performance.now(); frames.push(t);
              const html = document.documentElement, enVt = html.classList.contains('vt');
              // la barra durante el cambio: ¿tiene su cristal y queda fuera de las fotos de la transición?
              const fotos = document.getAnimations().some((x) => /view-transition/.test(x.effect.pseudoElement || ''));
              if (frames.length > 1 && tVista == null || enVt || fotos) {
                const nb = document.querySelector('.navbar'), cs = getComputedStyle(nb);
                const b = { cristal: (cs.backdropFilter || cs.webkitBackdropFilter || 'none') !== 'none', enFoto: enVt || fotos ? getComputedStyle(html).viewTransitionName !== 'none' || cs.viewTransitionName !== 'none' : false };
                barra = barra ? { cristal: barra.cristal && b.cristal, enFoto: barra.enFoto || b.enFoto } : b;
              }
              const anims = document.getAnimations().filter((x) => x.playState === 'running' && isFinite(x.effect.getComputedTiming().endTime));
              const pag = anims.filter((x) => /view-transition/.test(x.effect.pseudoElement || '') || (x.effect.target && x.effect.target.id === 'vista'));
              if (tVista != null && finPagina == null && !pag.length && !enVt) finPagina = t;
              if (tVista != null && quieto == null && !anims.length) quieto = t;
              if ((quieto != null && finPagina != null && t - quieto > 250) || t - t0 > 6000) return fin();
              requestAnimationFrame(paso);
            };
            requestAnimationFrame(paso);
            a.click();
          });
          mo.disconnect();
          const fin = quieto != null ? quieto : performance.now();
          const gaps = []; for (let i = 1; i < frames.length; i++) if (frames[i] <= fin + 16) gaps.push(frames[i] - frames[i - 1]);
          const loaf = window.__loaf.filter((e) => e.t >= t0 - 5 && e.t <= fin);
          const r = (x) => (x == null ? null : Math.round(x));
          return {
            a: k, vista: S.vista,
            verseMs: r(tVista && tVista - t0), paginaMs: r(finPagina && finPagina - t0), quietoMs: r(quieto && quieto - t0),
            largos: gaps.filter((g) => g > 50).length, peorMs: r(Math.max(0, ...gaps)), perdidos: gaps.reduce((s, g) => s + Math.max(0, Math.round(g / 16.7) - 1), 0),
            loaf: loaf.length, loafMs: r(loaf.reduce((s, e) => s + e.d, 0)), bloqueoMs: r(loaf.reduce((s, e) => s + e.b, 0)),
            pintarMs: window.__pint.map((p) => r(p.d)), barra,
            loafTop: loaf.sort((x, y) => y.d - x.d).slice(0, 3).map((e) => `${r(e.d)}ms ${e.s.join(' | ')}`),
          };
        }, k);
        r.vuelta = v + 1; pasos.push(r);
        await page.waitForTimeout(600);
      }
    }
    // lo de fondo: Hoy quieto un segundo y medio (la moneda, la cinta…) y bajar por Hoy con el dedo (la barra de cristal encima)
    const huecos = (fr) => { const g = []; for (let i = 1; i < fr.length; i++) g.push(fr[i] - fr[i - 1]); return { largos: g.filter((x) => x > 50).length, perdidos: g.reduce((s, x) => s + Math.max(0, Math.round(x / 16.7) - 1), 0), peorMs: Math.round(Math.max(0, ...g)), fotogramas: fr.length }; };
    const grabar = (ms) => page.evaluate((ms) => new Promise((ok) => { const fr = [], t0 = performance.now(); const p = () => { const t = performance.now(); fr.push(t); if (t - t0 < ms) requestAnimationFrame(p); else ok(fr); }; requestAnimationFrame(p); }), ms);
    await page.waitForTimeout(2500);
    const quietoHoy = huecos(await grabar(1500));
    const [frBaja] = await Promise.all([grabar(1800), cdp.send('Input.synthesizeScrollGesture', { x: 195, y: 600, yDistance: -1600, speed: 1600, gestureSourceType: 'touch' })]);
    const bajar = huecos(frBaja);
    console.log(`\nHoy quieto 1,5 s: ${JSON.stringify(quietoHoy)} · bajar por Hoy: ${JSON.stringify(bajar)}`);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const media = (xs) => Math.round(xs.reduce((s, x) => s + (x || 0), 0) / xs.length);
    const v2 = pasos.filter((p) => p.vuelta === VUELTAS);
    const resumen = { cpu, verseMs: media(v2.map((p) => p.verseMs)), paginaMs: media(v2.map((p) => p.paginaMs)), quietoMs: media(v2.map((p) => p.quietoMs)), largos: v2.reduce((s, p) => s + p.largos, 0), perdidos: v2.reduce((s, p) => s + p.perdidos, 0), peorMs: Math.max(...v2.map((p) => p.peorMs)) };
    const etq = process.env.GF_ETIQUETA || 'medida';
    mkdirSync('test-results', { recursive: true });
    writeFileSync(`test-results/fluidez-${etq}-cpu${cpu}.json`, JSON.stringify({ resumen, pasos, quietoHoy, bajar }, null, 1));
    console.log(`\nCPU ×${cpu} (${etq}) · segunda vuelta, media por toque: se ve ${resumen.verseMs} ms · página quieta ${resumen.paginaMs} ms · todo quieto ${resumen.quietoMs} ms · ${resumen.largos} fotogramas largos, ${resumen.perdidos} perdidos, el peor de ${resumen.peorMs} ms`);
    for (const p of pasos) console.log(`  v${p.vuelta} → ${p.a.padEnd(10)} se ve ${String(p.verseMs).padStart(4)} · página ${String(p.paginaMs).padStart(4)} · quieto ${String(p.quietoMs).padStart(4)} · largos ${p.largos} (peor ${p.peorMs}) · perdidos ${p.perdidos} · pintar ${p.pintarMs.join('+')} · barra ${p.barra ? `${p.barra.cristal ? 'con cristal' : 'SIN CRISTAL'}${p.barra.enFoto ? ', EN LA FOTO' : ', viva'}` : '?'}`);
    expect(errores).toEqual([]);
    for (const p of pasos) expect(p.barra && p.barra.cristal && !p.barra.enFoto, `la barra con su cristal y fuera de las fotos hacia ${p.a}`).toBe(true);
    if (cpu === TOPE.cpu) for (const p of v2) {
      expect(p.verseMs, `${p.a}: en verse`).toBeLessThanOrEqual(TOPE.verseMs);
      expect(p.paginaMs, `${p.a}: hasta que la página se está quieta`).toBeLessThanOrEqual(TOPE.paginaMs);
      expect(p.peorMs, `${p.a}: el peor fotograma`).toBeLessThanOrEqual(TOPE.peorMs);
    }
  });
}
