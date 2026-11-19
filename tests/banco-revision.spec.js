// Mejorar la IA, parte 4 (19 nov 2026) · Banco de la revisión diaria del fundador: que la revisión automática (la de las
// 5:00 y las 16:30) avise de lo importante, con cifras, sin rellenar ni repetir lo de ayer, y que diga qué hacer.
// Dos partes:
// 1) Siempre (en «Pruebas»): el banco está bien hecho y cada día se monta sin errores.
// 2) Solo con una clave de la API de Anthropic (la Action «Banco de la IA con Claude» con solo = «revision» o
//    «revision:r1,r3»): cada día con la app de verdad, la cartera fija del banco del fundador, el día de
//    revision-casos.js y Claude de verdad (Haiku, como la automática), por la imitación del Worker
//    (tests/banco/worker-imitacion.js). Guarda la revisión (el JSON), la foto y lo que ha costado; la puntuación la hace
//    un agente aparte.
//      GF_BANCO_ANTHROPIC, GF_BANCO_SOLO («revision» o «revision:r1,r2»), GF_BANCO_TOPE (dólares), GF_BANCO_SALIDA
import { test as base, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';
import { carteraFundador } from './banco/cartera-fundador.js';
import { casoRevision } from './banco/revision-casos.js';
import { imitarWorker } from './banco/worker-imitacion.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CLAVE = process.env.GF_BANCO_ANTHROPIC || '';
const SOLO0 = String(process.env.GF_BANCO_SOLO || '');
const ES_REVISION = SOLO0.startsWith('revision');
if (ES_REVISION && !/^revision(:|$)/.test(SOLO0)) throw new Error(`GF_BANCO_SOLO mal escrito: «${SOLO0}» (vale «revision» o «revision:r1,r2»)`);
const SOLO = ES_REVISION ? SOLO0.replace(/^revision:?/, '').split(',').map((x) => x.trim()).filter(Boolean) : [];
const TOPE = Number(process.env.GF_BANCO_TOPE) > 0 ? Number(process.env.GF_BANCO_TOPE) : 1;
const SALIDA = process.env.GF_BANCO_SALIDA || join(AQUI, '..', 'banco-revision.json');
const BANCO = JSON.parse(readFileSync(join(AQUI, 'banco', 'revision.json'), 'utf8')).casos;
const PASAN = SOLO.length ? BANCO.filter((q) => SOLO.includes(q.id) || (q.caso === 'normal' && SOLO.some((s) => BANCO.find((b) => b.id === s && b.caso === 'ayer')))) : BANCO;
const WORKER = 'https://growfolio.growfolio-web-app.workers.dev/claude';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Expose-Headers': 'X-Reglas, X-Quedan, X-Nivel, X-Quedan-Tareas, X-Quedan-Revisiones' };
const CASOS = ['normal', 'ayer', 'caida', 'resultados', 'atascado', 'aplazada', 'dividendo'];

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'stub-verificar': '1' } });
    await use(errores);
  },
});

async function montar(page) {
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(() => { S.acceso = 'privado'; LS.set('inv-acceso', { a: 'privado', uid: FB.user.uid, t: Date.now() }); LS.del('inv-ia-fundador-no'); });
  await page.evaluate(`(${carteraFundador.toString()})()`);
  // lo de cada día se pone sobre una copia de los precios y la prensa de partida
  await page.evaluate(() => { window.__base = JSON.stringify({ i: S.precios.instrumentos, m: S.precios.mercados, l: (S.escaneo && S.escaneo.lectura) || {}, inf: S.informe || null }); });
}
const reponer = (page) => page.evaluate(async () => {
  const b = JSON.parse(window.__base);
  S.precios.instrumentos = b.i; S.precios.mercados = b.m; if (S.escaneo) S.escaneo.lectura = b.l; S.informe = b.inf;
});

test.describe('el banco de la revisión, sin Claude', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'una vez, en el móvil'));

  test('el banco de la revisión está bien hecho', () => {
    expect(BANCO.length).toBeGreaterThanOrEqual(5);
    expect(BANCO.length).toBeLessThanOrEqual(8);
    expect(new Set(BANCO.map((q) => q.id)).size).toBe(BANCO.length);
    for (const q of BANCO) { expect(CASOS, q.id).toContain(q.caso); expect(q.comprueba.length >= 3, q.id).toBe(true); }
    // «ayer» va justo detrás de «normal» (usa su revisión como la de ayer)
    const i = BANCO.findIndex((q) => q.caso === 'ayer');
    if (i >= 0) expect(BANCO[i - 1].caso).toBe('normal');
  });

  test('cada día del banco se monta sin errores y se ve en la foto de la revisión', async ({ page, errores }) => {
    await montar(page);
    await page.evaluate(`window.__casoRevision = ${casoRevision.toString()}`);
    for (const caso of CASOS) {
      await reponer(page);
      await page.evaluate(`(${carteraFundador.toString()})()`);
      const r = await page.evaluate((c) => { const h = window.__casoRevision(c); return { h, hoy: hoyIso(), foto: contextoAsesor(S.M, 'revision', false), fotoEst: contextoAsesor(S.M, 'revision', true) }; }, caso);
      expect(r.fotoEst, caso).not.toContain('Hoy corta dividendo');
      expect(r.h.caso).toBe(caso);
      if (caso === 'ayer') {
        // con una revisión de ayer, la foto la lleva (niveles y hoja de ruta): es lo que mide r2
        const f2 = await page.evaluate(() => { if (S.ia && !S.ia.fecha) S.ia = { ...S.ia, fecha: '2000-01-01' }; S.iaPropio = { fecha: new Date(Date.now() - 86400000).toISOString(), modelo: 'claude-haiku-5-5', json: { titular: 'Ayer, nada nuevo.', resumen: ['Sin cambios.'], posiciones: { p6: { nivel: 'mantener', veredicto: 'Sigue igual' } }, hoja_de_ruta: { mes: [{ t: 'Este mes, nada' }] } } }; const f = contextoAsesor(S.M, 'revision', false); S.iaPropio = null; return f; });
        expect(f2).toContain('## Tu último análisis');
        expect(f2).toMatch(/Nivel que diste a cada posición: [^\n]*: mantener \(«Sigue igual»\)/);
        expect(f2).toContain('Tu hoja de ruta de este mes: Este mes, nada');
      }
      if (caso === 'resultados') expect(r.foto).toContain('beneficio neto cae un 38 %');
      if (caso === 'atascado') expect(r.foto).toContain('valor liquidativo atascado');
      if (caso === 'aplazada') expect(r.foto).toMatch(/490[^\n]*no restan este año por la regla de recompra/);
      // mejorar-ia-2: los fallos del propio banco. La caída es de un 7,0 % justo en las tres (BAT salía a −9,8 %) y va sin el
      // informe de prensa de la mañana; el día del dividendo no lleva otro dividendo de IAG por llegar este año
      if (caso === 'caida') { for (const n of ['Repsol', 'BAT', 'IAG']) expect(r.foto, n).toMatch(new RegExp(`### ${n}[^\\n]*\\n[^\\n]*\\n[^\\n]*hoy −7,0\\s%`)); expect(r.foto).not.toContain('## Informe de prensa de la IA'); }
      else expect(r.foto, caso).toContain('## Informe de prensa de la IA');
      if (caso === 'dividendo') {
        // un solo pago de IAG este año en la lista, el de hoy; y la línea que lo relaciona con la bajada
        const deIag = r.foto.match(new RegExp(`${new Date().getFullYear()}-\\d\\d-\\d\\d IAG \\d+ € netos`, 'g')) || [];
        expect(deIag).toHaveLength(1);
        expect(deIag[0].startsWith(r.hoy)).toBe(true);
        expect(r.foto).toMatch(/Hoy corta dividendo[^\n]*IAG \d+ € brutos \(\d+ € netos\), un 0,9 % de su valor/);
        expect(r.foto).toMatch(/### IAG[^\n]*\n[^\n]*\n[^\n]*hoy −1,1\s%/);
      } else expect(r.foto, caso).not.toContain('Hoy corta dividendo');
      if (caso === 'normal') {
        // (revisión aparte, I3) el aniversario del corte del año pasado, sin ex-dividendo anunciado para hoy, no es «Hoy corta dividendo»
        const f3 = await page.evaluate(() => { const hoy = hoyIso(), I = S.precios.instrumentos, x0 = I.iag; I.iag = { ...x0, ex_dividendo: null, dividendos_pagos: [[sumarMeses(hoy, -12), 0.05]] }; S.M = calcular(); const f = contextoAsesor(S.M, 'revision', false); I.iag = x0; S.M = calcular(); return { f, hoy }; });
        expect(f3.f).not.toContain('Hoy corta dividendo'); // una fecha estimada no se da por hecho
      }
    }
    expect(errores).toEqual([]);
  });
});

test.describe('la revisión del fundador, con Claude de verdad', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(({}, info) => {
    test.skip(!CLAVE || !ES_REVISION, 'sin clave de Anthropic o sin GF_BANCO_SOLO=revision: solo corre en su Action');
    test.skip(info.project.name !== 'pc', 'una vez, en el ordenador');
  });
  test.setTimeout(80 * 60_000);

  test('banco de la revisión diaria del fundador con Claude', async ({ page, context, errores }) => {
    const gasto = { peticiones: 0, entrada: 0, cache_lee: 0, cache_escribe: 0, salida: 0, dolares: 0, rechazadas: 0 };
    let sinFundador = 0;
    await context.route(WORKER, imitarWorker({ clave: CLAVE, gasto, cors: CORS, alPedir: (c) => { if (c.model && c.reglas !== 'fundador') sinFundador++; } }));
    await context.route('https://generativelanguage.googleapis.com/**', (r) => r.abort());
    await montar(page);
    await page.evaluate(async () => {
      guardarCfgAsesor({ auto: 'manual' });
      LS.set('inv-claude-ok', FB.user.uid); LS.del('inv-claude-pausa');
      RED_CLAUDE.primero = 280000; RED_CLAUDE.hilo = 280000;
      await sondearClaude();
      await cargarEscaneo().catch(() => {});
      await cargarFichas().catch(() => {});
    });
    await page.evaluate(`window.__casoRevision = ${casoRevision.toString()}`);
    await page.evaluate(() => { window.__base = JSON.stringify({ i: S.precios.instrumentos, m: S.precios.mercados, l: (S.escaneo && S.escaneo.lectura) || {}, inf: S.informe || null }); });
    const resultados = [];
    let deAyer = null;
    const guardar = (parcial) => writeFileSync(SALIDA, JSON.stringify({ v: 1, generado: new Date().toISOString(), ...(parcial ? { parcial: true } : {}), total: resultados.length, gasto: { ...gasto, dolares: Math.round(gasto.dolares * 1000) / 1000 }, tope: TOPE, sin_reglas_fundador: sinFundador, errores_pagina: errores.slice(0, 10), casos: resultados }, null, 1));
    for (const q of PASAN) {
      if (gasto.dolares >= TOPE) { console.log(`tope de ${TOPE} $: no se hace ${q.id} ni los siguientes`); break; }
      await reponer(page);
      await page.evaluate(`(${carteraFundador.toString()})()`);
      const t0 = Date.now(), d0 = gasto.dolares;
      const r = await page.evaluate(async ([caso, ayer]) => {
        S.acceso = 'privado'; LS.set('inv-acceso', { a: 'privado', uid: FB.user.uid, t: Date.now() }); LS.del('inv-ia-fundador-no'); LS.del('inv-claude-pausa');
        const hecho = window.__casoRevision(caso);
        // cada día, sin revisión anterior; «ayer», con la del día normal hecha hace un día
        S.iaPropio = caso === 'ayer' && ayer ? { ...ayer, fecha: new Date(Date.now() - 86400000).toISOString() } : null;
        // 19 nov (mejorar-ia-2): la cartera fija pone sus reglas en S.ia sin fecha, y iaActual() se quedaba con eso en vez de con
        // la revisión de ayer: r2 no recibía la revisión anterior y medía otra cosa. En la app, S.ia sin fecha no se da
        if (S.ia && !S.ia.fecha) S.ia = { ...S.ia, fecha: '2000-01-01' };
        IA.generando = false; IA.ultimoIntento = 0; IA.error = null;
        LS.set('inv-claude-quedan', { ...(LS.get('inv-claude-quedan') || {}), rv: null });
        if (window.__viejoNB && S.precios.instrumentos['nb-short']) S.precios.instrumentos['nb-short'] = { ...S.precios.instrumentos['nb-short'], fecha: window.__viejoNB };
        S.M = calcular();
        const foto = contextoAsesor(S.M, 'revision', false);
        let turno = null;
        const vigia = setInterval(() => { if (IA.turno) turno = IA.turno; }, 200);
        await generarAnalisisIA('revisión de la mañana');
        clearInterval(vigia);
        const p = S.iaPropio;
        return { hecho, foto, error: IA.error, json: (p && p.json) || null, guardada: p ? { ...p } : null, modelo: (p && p.modelo) || (turno && turno.modelo) || null, estandar: turno ? turno.estandar : null };
      }, [q.caso, deAyer]);
      if (q.caso === 'normal' && r.guardada) deAyer = r.guardada;
      resultados.push({ id: q.id, caso: q.caso, cambio: r.hecho.cambio || null, comprueba: q.comprueba, error: r.error, modelo: r.modelo, estandar: r.estandar, segundos: Math.round((Date.now() - t0) / 1000), dolares: Math.round((gasto.dolares - d0) * 10000) / 10000, revision: r.json, ...(q.caso === 'ayer' && deAyer ? { revision_de_ayer: deAyer.json } : {}), foto: r.foto });
      console.log(`${r.json && !r.error ? '✓' : '✘'} ${q.id} ${q.caso} (${Math.round((gasto.dolares - d0) * 1000) / 1000} $)${r.error ? ': ' + r.error : ''}`);
      guardar(true);
      await page.waitForTimeout(1500);
    }
    guardar(false);
    console.log(`banco de la revisión: ${resultados.length} días, ${gasto.peticiones} peticiones, ${Math.round(gasto.dolares * 1000) / 1000} $`);
    expect(resultados.filter((x) => !x.revision).length, 'días sin revisión').toBeLessThanOrEqual(1);
    expect(sinFundador, 'peticiones sin las reglas del fundador').toBe(0);
  });
});
