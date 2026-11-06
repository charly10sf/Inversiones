// 0.7 · Banco de preguntas de la IA, con la IA de verdad. Solo corre si se le da una clave (GF_BANCO_ANTHROPIC): lo lanza la
// Action «Banco de la IA» los martes (las 42 con Haiku) y los viernes (la muestra de 10 con Sonnet); en «Pruebas» se salta.
// 0.8.2d (6 nov 2026, «todo con Claude»): antes, Gemini con la clave gratis de la Action; ahora Claude, con la clave del
// banco o la de la app (gasta créditos: unos 0,25 US$ las 42 con Haiku y 0,40 US$ la muestra con Sonnet).
//   GF_BANCO_ANTHROPIC  la clave de la API de Anthropic
//   GF_BANCO_MOTOR      haiku | sonnet (por defecto haiku)
//   GF_BANCO_MUESTRA    1 = solo las preguntas marcadas como «muestra»
//   GF_BANCO_SALIDA     dónde escribir el resultado (por defecto banco.json)
// Cada pregunta, en una conversación nueva, con la app de verdad y la cartera de prueba. El Worker se imita aquí con sus
// mismas reglas (su CLAUDE_NOTA delante del sistema y solo los campos que deja pasar) y la petición va directa a la API. Se
// comprueba lo que dice (lo que tiene que salir y lo que no), las herramientas que usa, cuántas peticiones gasta y lo que
// cuesta.
import { test as base, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CLAVE = process.env.GF_BANCO_ANTHROPIC || '';
const MOTOR = process.env.GF_BANCO_MOTOR === 'sonnet' ? 'sonnet' : 'haiku';
const MODELO = MOTOR === 'sonnet' ? 'claude-sonnet-5-5' : 'claude-haiku-5-5';
const SALIDA = process.env.GF_BANCO_SALIDA || join(AQUI, '..', 'banco.json');
const BANCO = JSON.parse(readFileSync(join(AQUI, 'banco', 'preguntas.json'), 'utf8')).preguntas.filter((q) => process.env.GF_BANCO_MUESTRA !== '1' || q.muestra);
const WORKER = 'https://growfolio.growfolio-web-app.workers.dev/claude';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
// precio por millón (entrada, salida, leer caché, escribir caché), el del Worker
const PRECIO = { 'claude-haiku-5-5': [0.10, 0.50, 0.01, 0.125], 'claude-sonnet-5-5': [2, 10, 0.10, 2.5] };

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'stub-dueno': 'lucia@prueba.com', 'stub-verificar': '1' } });
    await use(errores);
  },
});
test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
  test.skip(!CLAVE, 'sin clave de Anthropic (GF_BANCO_ANTHROPIC): el banco solo corre en su Action');
  test.skip(info.project.name !== 'pc', 'una vez, en el ordenador');
});
// 42 preguntas de hasta 3 minutos cada una en el peor caso: hora y media, y lo hecho se guarda tras cada pregunta
test.setTimeout(100 * 60_000);

/** Lo que sale mal de una respuesta (vacío si está bien) */
export function revisar(q, r) {
  const mal = [];
  const txt = String(r.texto || '');
  if (r.error) mal.push(`error: ${r.error}`);
  if (!txt.trim()) mal.push('sin respuesta');
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(txt)) mal.push('sale undefined, NaN u [object Object]');
  for (const d of q.debe || []) if (!new RegExp(d, 'i').test(txt)) mal.push(`falta /${d}/`);
  for (const d of q.no_debe || []) { const m = txt.match(new RegExp(d, 'i')); if (m) mal.push(`sobra «${m[0]}»`); }
  for (const h of q.herramientas || []) if (!(r.herramientas || []).includes(h)) mal.push(`no usa ${h}`);
  if (r.peticiones > (q.max || 4)) mal.push(`${r.peticiones} peticiones (máximo ${q.max || 4})`);
  return mal;
}

test('banco de preguntas de la IA', async ({ page, context, errores }) => {
  // las reglas del Worker, leídas de su código para que no se separen
  const w = readFileSync(join(AQUI, '..', 'worker', 'src', 'index.js'), 'utf8');
  const NOTA = /const CLAUDE_NOTA = '([^']+)'/.exec(w)[1];
  const CAMPOS = JSON.parse(/const CLAUDE_CAMPOS = (\[[^\]]+\])/.exec(w)[1].replace(/'/g, '"'));
  const gasto = { peticiones: 0, entrada: 0, salida: 0, coste: 0 };
  let peticiones = 0;
  await context.route(WORKER, async (r) => {
    const q = r.request();
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const texto = q.postData() || '';
    if (texto === '{}') return r.fulfill({ status: 400, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: 'peticion', motivo: 'modelo' }) });
    const c = JSON.parse(texto), cuerpo = {};
    for (const k of CAMPOS) if (c[k] !== undefined) cuerpo[k] = c[k];
    cuerpo.system = [{ type: 'text', text: NOTA }, ...(Array.isArray(cuerpo.system) ? cuerpo.system : cuerpo.system ? [{ type: 'text', text: String(cuerpo.system) }] : [])];
    peticiones++; gasto.peticiones++;
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': CLAVE, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
    const sse = await res.text();
    // lo que cobra Anthropic: el «usage» de message_start y de message_delta
    const uso = {};
    for (const m of sse.matchAll(/"usage":(\{[^{}]*\})/g)) { try { Object.assign(uso, JSON.parse(m[1])); } catch (e) { /* trozo raro */ } }
    const p = PRECIO[String(cuerpo.model)] || PRECIO[MODELO], n = (x) => Number(x) || 0;
    gasto.entrada += n(uso.input_tokens) + n(uso.cache_read_input_tokens) + n(uso.cache_creation_input_tokens); gasto.salida += n(uso.output_tokens);
    gasto.coste += (n(uso.input_tokens) * p[0] + n(uso.output_tokens) * p[1] + n(uso.cache_read_input_tokens) * p[2] + n(uso.cache_creation_input_tokens) * p[3]) / 1e6;
    return r.fulfill({ status: res.status, headers: { ...CORS, 'content-type': res.headers.get('content-type') || 'text/event-stream' }, body: sse });
  });
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(async (motor) => {
    guardarCfgAsesor({ auto: 'manual' });
    LS.set('inv-ia-motor', motor); LS.set('inv-claude-ok', FB.user.uid); LS.del('inv-claude-pausa');
    // el Worker de aquí devuelve la respuesta entera al final (no en directo): más margen para el primer dato
    RED_CLAUDE.primero = 170000; RED_CLAUDE.hilo = 170000;
    await sondearClaude();
    await cargarEscaneo().catch(() => {});
    await cargarFichas().catch(() => {});
    // las herramientas que usa cada respuesta
    window.__herr = [];
    const orig = ejecutarHerramienta;
    window.ejecutarHerramienta = (...a) => { window.__herr.push(a[0]); return orig(...a); };
  }, MOTOR);

  const resultados = [];
  const guardar = (parcial) => {
    const bien = resultados.filter((x) => x.ok).length;
    const salida = {
      v: 2, generado: new Date().toISOString(), modelo: MODELO, muestra: process.env.GF_BANCO_MUESTRA === '1', ...(parcial ? { parcial: true, de: BANCO.length } : {}),
      total: resultados.length, bien, pct: resultados.length ? Math.round((bien / resultados.length) * 100) : 0,
      peticiones_media: resultados.length ? Math.round((resultados.reduce((s, x) => s + x.peticiones, 0) / resultados.length) * 10) / 10 : 0,
      gasto: { ...gasto, coste: Math.round(gasto.coste * 10000) / 10000 },
      errores_pagina: errores.slice(0, 10), preguntas: resultados,
    };
    writeFileSync(SALIDA, JSON.stringify(salida, null, 1));
    return salida;
  };
  for (const q of BANCO) {
    // al cambiar de modo, las señales se recalculan (en estándar son las de los analistas, no las de Toisón)
    await page.evaluate((modo) => {
      const a = modo === 'estandar' ? 'publico' : 'privado';
      S.acceso = a; LS.set('inv-acceso', { a, uid: FB.user.uid, t: Date.now() }); LS.del('inv-claude-pausa');
      S.M = calcular(); AS.conv = []; AS.api = []; AS.foto = null; AS.cargando = false; window.__herr = [];
      if (typeof cerrarAsesor === 'function') cerrarAsesor();
    }, q.modo);
    const antes = peticiones, t0 = Date.now();
    await page.evaluate((x) => abrirAsesor(x, true), q.q);
    await expect.poll(() => page.evaluate(() => !AS.cargando && AS.conv.length >= 2), { timeout: 180_000, intervals: [1000] }).toBe(true);
    const r = await page.evaluate(() => {
      const t = AS.conv[AS.conv.length - 1];
      const texto = t.partes.filter((p) => p.tipo === 'texto').map((p) => p.texto).join('\n\n');
      const herramientas = [...window.__herr, ...t.partes.filter((p) => p.tipo === 'paso' && /Busca en internet/.test(p.txt || '')).map(() => 'buscar_en_internet')];
      return { texto, error: t.error || null, modelo: t.modelo || null, herramientas };
    });
    r.peticiones = peticiones - antes;
    r.segundos = Math.round((Date.now() - t0) / 1000);
    const mal = revisar(q, r);
    resultados.push({ id: q.id, modo: q.modo, q: q.q, ok: !mal.length, mal, peticiones: r.peticiones, segundos: r.segundos, modelo: r.modelo, herramientas: [...new Set(r.herramientas)], respuesta: r.texto.slice(0, 800) });
    console.log(`${mal.length ? '✘' : '✓'} ${q.id} (${r.peticiones} peticiones, ${r.segundos} s)${mal.length ? ': ' + mal.join('; ') : ''}`);
    // si la Action se queda sin tiempo, lo hecho hasta aquí se publica igual
    guardar(true);
    await page.waitForTimeout(1500);
  }
  const salida = guardar(false);
  console.log(`banco (${MOTOR}): ${salida.bien} de ${salida.total} (${salida.pct} %), ${salida.peticiones_media} peticiones de media, ${salida.gasto.coste} US$`);
});
