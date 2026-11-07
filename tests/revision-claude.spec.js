// 0.8.3 · Banco de la revisión de la cartera con Claude de verdad: la revisión automática (la de las 5:00 y las 16:30),
// con la app de verdad (el build), la cartera de prueba y las reglas del estándar, para medir tokens, tiempo, coste y
// si cabe a la primera, y leer el JSON que sale. Solo con una clave de la API de Anthropic (la Action «Banco de la
// revisión», que se lanza a mano o al cambiar tests/revision/pedir.cfg en una rama que no sea main).
//   GF_BANCO_ANTHROPIC  la clave
//   GF_REV_VARIANTES    las vueltas, separadas por comas: «app» es la petición tal cual la monta la app; detrás, con «+»,
//                       lo que se cambia en la petición antes de mandarla: «sinpensar» (thinking disabled), «bajo»
//                       (esfuerzo low), «tope16» (max_tokens 16000). Por ejemplo: app,app,app+sinpensar
//   GF_REV_SALIDA       dónde escribir el resultado (por defecto revision-claude.json)
// Sin clave no corre: el resto de pruebas de la revisión (sin gastar) están en tests/claude-app.spec.js.
import { test as base, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CLAVE = process.env.GF_BANCO_ANTHROPIC || '';
const VARIANTES = (process.env.GF_REV_VARIANTES || 'app').split(',').map((x) => x.trim()).filter(Boolean);
const SALIDA = process.env.GF_REV_SALIDA || join(AQUI, '..', 'revision-claude.json');
const API = process.env.GF_REV_API || 'https://api.anthropic.com/v1/messages';
const WORKER = 'https://growfolio.growfolio-web-app.workers.dev/claude';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

/** lo que se cambia en la petición según la variante */
export function ajustarPeticion(cuerpo, variante) {
  const c = { ...cuerpo };
  for (const m of variante.split('+').slice(1)) {
    if (m === 'sinpensar') c.thinking = { type: 'disabled' };
    else if (m === 'bajo') c.output_config = { ...(c.output_config || {}), effort: 'low' };
    else if (m === 'tope16') c.max_tokens = Math.min(c.max_tokens, 16000);
    else throw new Error(`variante desconocida: ${m}`);
  }
  return c;
}

/** lo que trae una respuesta en SSE: uso, por qué paró y cuántos caracteres de pensar y de texto */
export function leerSSE(sse) {
  const r = { uso: {}, stop: null, pensar: 0, texto: 0 };
  for (const l of String(sse).split('\n')) {
    if (!l.startsWith('data:')) continue;
    let e; try { e = JSON.parse(l.slice(5)); } catch (x) { continue; }
    if (e.type === 'message_start' && e.message && e.message.usage) Object.assign(r.uso, e.message.usage);
    if (e.type === 'message_delta') { if (e.usage) Object.assign(r.uso, e.usage); if (e.delta && e.delta.stop_reason) r.stop = e.delta.stop_reason; }
    if (e.type === 'content_block_delta' && e.delta) {
      if (e.delta.type === 'thinking_delta') r.pensar += String(e.delta.thinking || '').length;
      if (e.delta.type === 'text_delta') r.texto += String(e.delta.text || '').length;
    }
  }
  return r;
}

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'stub-verificar': '1' } });
    await use(errores);
  },
});

test('las variantes del banco de la revisión se entienden', () => {
  expect(ajustarPeticion({ max_tokens: 24000, output_config: { effort: 'medium' } }, 'app+sinpensar+bajo+tope16')).toEqual({ max_tokens: 16000, output_config: { effort: 'low' }, thinking: { type: 'disabled' } });
  expect(ajustarPeticion({ max_tokens: 24000 }, 'app')).toEqual({ max_tokens: 24000 });
  expect(() => ajustarPeticion({}, 'app+otra')).toThrow();
  const sse = ['data: {"type":"message_start","message":{"usage":{"input_tokens":10,"cache_read_input_tokens":5}}}',
    'data: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"abc"}}',
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hola"}}',
    'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":7}}'].join('\n');
  expect(leerSSE(sse)).toEqual({ uso: { input_tokens: 10, cache_read_input_tokens: 5, output_tokens: 7 }, stop: 'end_turn', pensar: 3, texto: 4 });
});

test.describe('la revisión, con Claude de verdad', () => {
  test.beforeEach(({}, info) => {
    test.skip(!CLAVE, 'sin clave de Anthropic (GF_BANCO_ANTHROPIC): solo corre en su Action');
    test.skip(info.project.name !== 'pc', 'una vez, en el ordenador');
  });
  test.setTimeout(VARIANTES.length * 6 * 60_000 + 60_000);

  test(`revisión automática: ${VARIANTES.join(', ')}`, async ({ page, context, errores }) => {
    const w = readFileSync(join(AQUI, '..', 'worker', 'src', 'index.js'), 'utf8');
    const NOTA = /const CLAUDE_NOTA = '([^']+)'/.exec(w)[1];
    const CAMPOS = JSON.parse(/const CLAUDE_CAMPOS = (\[[^\]]+\])/.exec(w)[1].replace(/'/g, '"'));
    let variante = 'app', llamadas = [];
    await context.route(WORKER, async (r) => {
      const q = r.request();
      if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
      const texto = q.postData() || '';
      if (texto === '{}') return r.fulfill({ status: 400, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: 'peticion', motivo: 'modelo' }) });
      const c = JSON.parse(texto);
      let cuerpo = {};
      for (const k of CAMPOS) if (c[k] !== undefined) cuerpo[k] = c[k];
      cuerpo.system = [{ type: 'text', text: NOTA }, ...(Array.isArray(cuerpo.system) ? cuerpo.system : cuerpo.system ? [{ type: 'text', text: String(cuerpo.system) }] : [])];
      cuerpo = ajustarPeticion(cuerpo, variante);
      const t0 = Date.now();
      const res = await fetch(API, { method: 'POST', headers: { 'x-api-key': CLAVE, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
      const sse = await res.text();
      const l = leerSSE(sse);
      llamadas.push({ estado: res.status, segundos: Math.round((Date.now() - t0) / 100) / 10, max_tokens: cuerpo.max_tokens, esfuerzo: (cuerpo.output_config || {}).effort || null, pensar_api: cuerpo.thinking || null, bytes_peticion: texto.length, ...l, ...(res.status >= 400 ? { error: sse.slice(0, 400) } : {}) });
      return r.fulfill({ status: res.status, headers: { ...CORS, 'content-type': res.headers.get('content-type') || 'text/event-stream' }, body: sse });
    });
    await context.route('https://generativelanguage.googleapis.com/**', (r) => r.abort());
    await crearCuenta(page);
    await quitarCapas(page);
    await meterCartera(page);
    await page.evaluate(async () => {
      guardarCfgAsesor({ auto: 'manual' });
      LS.set('inv-claude-ok', FB.user.uid); LS.del('inv-claude-pausa');
      RED_CLAUDE.primero = 280000; RED_CLAUDE.hilo = 280000;
      await sondearClaude();
      await cargarEscaneo().catch(() => {});
      await cargarFichas().catch(() => {});
    });

    const vueltas = [];
    const guardar = () => writeFileSync(SALIDA, JSON.stringify({ v: 1, generado: new Date().toISOString(), variantes: VARIANTES, vueltas }, null, 1));
    for (const v of VARIANTES) {
      variante = v; llamadas = [];
      const t0 = Date.now();
      const r = await page.evaluate(async () => {
        // cada vuelta, sin revisión anterior (si no, la segunda leería la primera) y con sus revisiones del día
        S.iaPropio = null; IA.generando = false; IA.ultimoIntento = 0; IA.error = null;
        LS.set('inv-claude-quedan', { ...(LS.get('inv-claude-quedan') || {}), rv: null });
        const antes = textoDiarioIA().length;
        await generarAnalisisIA('revisión de la mañana');
        const t = IA.turno || {};
        const texto = (t.partes || []).filter((p) => p.tipo === 'texto').map((p) => p.texto).join('\n');
        const json = S.iaPropio && S.iaPropio.json;
        return { error: IA.error, coste: t.coste || 0, modelo: t.modelo || null, consejo: frasesConsejoIA(texto), diario: textoDiarioIA().slice(antes).split('\n').filter((x) => /Revisión|ronda|sin espacio|Ojo/.test(x)).slice(-8), json: json || null, texto_largo: texto.length };
      });
      // el coste de cada llamada, con la cuenta de la app (costeClaude: Haiku cobra el tramo alto por encima de 100.000)
      for (const x of llamadas) x.coste = await page.evaluate(([m, u]) => costeClaude(m, u), [r.modelo || 'claude-haiku-5-5', x.uso]);
      r.coste = llamadas.reduce((s, x) => s + (x.coste || 0), 0);
      const sal = llamadas.reduce((s, x) => s + (x.uso.output_tokens || 0), 0);
      const ent = llamadas.reduce((s, x) => s + (x.uso.input_tokens || 0) + (x.uso.cache_read_input_tokens || 0) + (x.uso.cache_creation_input_tokens || 0), 0);
      const vuelta = { variante: v, ok: !r.error && !!r.json, error: r.error, segundos: Math.round((Date.now() - t0) / 1000), coste: Math.round(r.coste * 10000) / 10000, entrada: ent, salida: sal, repetida: llamadas.length > 1, llamadas, consejo: r.consejo, diario: r.diario, modelo: r.modelo, texto_largo: r.texto_largo, json: r.json };
      vueltas.push(vuelta);
      console.log(`${vuelta.ok ? '✓' : '✘'} ${v}: ${vuelta.segundos} s, ${ent} de entrada, ${sal} de salida, ${vuelta.coste} US$${vuelta.repetida ? ', repetida' : ''}${r.consejo.length ? `, consejo: ${r.consejo.join(' | ')}` : ''}`);
      guardar();
      await page.waitForTimeout(2000);
    }
    guardar();
    expect(vueltas.length).toBe(VARIANTES.length);
  });
});
