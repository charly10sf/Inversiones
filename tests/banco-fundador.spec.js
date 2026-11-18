// Revisión de noche del 19 nov · Banco del fundador: que lo que recomienda la IA sin freno sea bueno (no que no recomiende).
// Aparte del banco de trampas del estándar (banco-claude.spec.js). Dos partes:
// 1) Siempre (en «Pruebas»): el banco está bien hecho (de 25 a 40 preguntas, ids distintos, comprobaciones escritas).
// 2) Solo con una clave de la API de Anthropic (GF_BANCO_ANTHROPIC; la Action «Banco de la IA con Claude» con solo =
//    «fundador» o «fundador:f01,f02»): cada pregunta en una conversación nueva, con la app de verdad, la cartera fija
//    (tests/banco/cartera-fundador.js) y Claude de verdad, con las reglas del fundador. El Worker se imita con sus mismas
//    reglas para el fundador (su CLAUDE_NOTA_FUNDADOR delante, solo los campos que deja pasar y X-Reglas: fundador).
//    La prueba guarda cada respuesta, las herramientas con lo que devolvieron, la foto de la cartera y lo que ha costado; la
//    puntuación de las comprobaciones la hace un agente aparte con el resultado delante. Aquí solo se mira lo automático:
//    que contesta, con las reglas del fundador, sin escudarse en que no es asesor, con las herramientas que tocan y en inglés
//    cuando se pregunta en inglés.
//      GF_BANCO_ANTHROPIC  la clave
//      GF_BANCO_MOTOR      haiku | sonnet
//      GF_BANCO_SOLO       «fundador» (todas) o «fundador:f01,f02» (solo esas)
//      GF_BANCO_TOPE       dólares como mucho en esta pasada (por defecto 3,5): al llegar, deja de preguntar
//      GF_BANCO_SALIDA     dónde escribir el resultado
import { test as base, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';
import { carteraFundador } from './banco/cartera-fundador.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CLAVE = process.env.GF_BANCO_ANTHROPIC || '';
const MOTOR = process.env.GF_BANCO_MOTOR === 'sonnet' ? 'sonnet' : 'haiku';
const SOLO0 = String(process.env.GF_BANCO_SOLO || '');
const ES_FUNDADOR = /^fundador\b/.test(SOLO0);
const SOLO = ES_FUNDADOR ? SOLO0.replace(/^fundador:?/, '').split(',').map((x) => x.trim()).filter(Boolean) : [];
const TOPE = Number(process.env.GF_BANCO_TOPE) > 0 ? Number(process.env.GF_BANCO_TOPE) : 3.5;
const SALIDA = process.env.GF_BANCO_SALIDA || join(AQUI, '..', 'banco-fundador.json');
const BANCO = JSON.parse(readFileSync(join(AQUI, 'banco', 'fundador.json'), 'utf8')).preguntas;
const PASAN = SOLO.length ? BANCO.filter((q) => SOLO.includes(q.id)) : BANCO;
const WORKER = 'https://growfolio.growfolio-web-app.workers.dev/claude';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Expose-Headers': 'X-Reglas, X-Quedan, X-Nivel' };
const ESCUDO = /recomendaci[oó]n(es)? personalizada|no (te )?(puedo|debo) (dar|hacer) recomendaciones|no (soy|es) (un |tu )?asesor|no (está|estoy) autorizad/i;
const HERRS = ['simular_venta', 'simular_compra', 'buscar_empresa', 'radar', 'proyectar', 'historico'];
// lo que suena a respuesta en español cuando se ha preguntado en inglés
const ES = /\b(tu|tus|que|con|para|los|las|una|pero|está|también)\b/gi, EN = /\b(the|your|and|with|you|this|it)\b/gi;

/** Lo que sale mal, de lo que se puede mirar sin leer (vacío si está bien) */
export function revisarFundador(q, r) {
  const mal = [];
  const txt = String(r.texto || '');
  if (r.error) mal.push(`error: ${r.error}`);
  if (!txt.trim()) mal.push('sin respuesta');
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(txt)) mal.push('sale undefined, NaN u [object Object]');
  // en el fundador, «no te lo recomiendo» o «no puedo decirte cuánto subirá» son respuestas: solo cuenta escudarse en que no
  // puede recomendar (recomendación personalizada, no es asesor, no está autorizado)
  if (q.tema !== 'identidad' && ESCUDO.test(txt)) mal.push('se escuda en que no puede recomendar');
  if (/consulta (a|con) un (asesor|profesional)|no soy (un )?asesor financiero/i.test(txt)) mal.push('le manda a un profesional o dice que no es asesor');
  for (const h of q.herramientas || []) if (!(r.herramientas || []).some((x) => x.n === h)) mal.push(`no usa ${h}`);
  if (q.idioma === 'en' && (txt.match(ES) || []).length > (txt.match(EN) || []).length) mal.push('no contesta en inglés');
  return mal;
}

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'stub-verificar': '1' } });
    await use(errores);
  },
});

test.describe('el banco del fundador, sin Claude', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'una vez, en el móvil'));

  test('el banco del fundador está bien hecho', () => {
    expect(BANCO.length).toBeGreaterThanOrEqual(25);
    expect(BANCO.length).toBeLessThanOrEqual(40);
    expect(new Set(BANCO.map((q) => q.id)).size).toBe(BANCO.length);
    for (const q of BANCO) {
      expect(q.q, q.id).toBeTruthy();
      expect(Array.isArray(q.comprueba) && q.comprueba.length >= 2, `${q.id}: al menos dos comprobaciones`).toBe(true);
      for (const h of q.herramientas || []) expect(HERRS, q.id).toContain(h);
    }
    // lo que pide el encargo: dato viejo, instrucciones metidas en una noticia, algo que no sabe, inglés, corta, confianza
    // baja y una que choca con el Paso a paso
    for (const t of ['dato-viejo', 'inyeccion', 'no-sabe', 'ingles', 'corta', 'confianza-baja', 'paso-a-paso', 'recompra', 'fifo', 'tramos', 'dividendos', 'neuberger-tr']) expect(BANCO.some((q) => q.tema === t), t).toBe(true);
    // lo automático
    expect(revisarFundador({ tema: 'mes' }, { texto: 'Eso ya sería una recomendación personalizada y no te la puedo dar.' })).toContain('se escuda en que no puede recomendar');
    expect(revisarFundador({ tema: 'mes', herramientas: ['simular_venta'] }, { texto: 'Vende 50 acciones de Repsol en Trade Republic: pagarías 120 €.', herramientas: [{ n: 'simular_venta' }] })).toEqual([]);
    expect(revisarFundador({ tema: 'lufthansa' }, { texto: '**No te lo recomiendo ahora.** Ya tienes IAG.' })).toEqual([]);
    expect(revisarFundador({ tema: 'ingles', idioma: 'en' }, { texto: 'Mantén tu bitcoin: es un 3,7 % de la cartera y cabe en tu límite.' })).toContain('no contesta en inglés');
    expect(revisarFundador({ tema: 'ingles', idioma: 'en' }, { texto: 'Hold your Bitcoin: it is 3.7 % of the portfolio and fits your limit.' })).toEqual([]);
  });

  test('la cartera fija del banco se monta sin errores y la foto lleva lo que miden las preguntas', async ({ page, errores }) => {
    await crearCuenta(page);
    await quitarCapas(page);
    await meterCartera(page);
    await page.evaluate(`(${carteraFundador.toString()})()`);
    const t = await page.evaluate(() => { S.acceso = 'privado'; LS.set('inv-acceso', { a: 'privado', uid: FB.user.uid, t: Date.now() }); S.M = calcular(); return contextoAsesor(S.M, 'chat', false); });
    expect(t).toContain('valor liquidativo atascado');
    expect(t).toMatch(/no restan este año por la regla de recompra/);
    expect(t).toContain('Entrada de un piso');
    expect(t).toContain('## Sus reglas de inversión');
    expect(errores).toEqual([]);
  });
});

test.describe('el banco del fundador, con Claude de verdad', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(({}, info) => {
    test.skip(!CLAVE || !ES_FUNDADOR, 'sin clave de Anthropic o sin GF_BANCO_SOLO=fundador: solo corre en su Action');
    test.skip(info.project.name !== 'pc', 'una vez, en el ordenador');
  });
  test.setTimeout(110 * 60_000);

  test(`banco del fundador con Claude (${MOTOR})`, async ({ page, context, errores }) => {
    const w = readFileSync(join(AQUI, '..', 'worker', 'src', 'index.js'), 'utf8');
    const NOTA_F = /const CLAUDE_NOTA_FUNDADOR = '([^']+)'/.exec(w)[1];
    const CAMPOS = JSON.parse(/const CLAUDE_CAMPOS = (\[[^\]]+\])/.exec(w)[1].replace(/'/g, '"'));
    const PRECIOS = JSON.parse(/const PRECIOS_CLAUDE = (\{[^}]+\})/.exec(w)[1].replace(/'/g, '"'));
    const gasto = { peticiones: 0, entrada: 0, cache_lee: 0, cache_escribe: 0, salida: 0, dolares: 0 };
    let sinFundador = 0;
    await context.route(WORKER, async (r) => {
      const q = r.request();
      if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
      const texto = q.postData() || '';
      if (texto === '{}') return r.fulfill({ status: 400, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: 'peticion', motivo: 'modelo' }) });
      const c = JSON.parse(texto), cuerpo = {};
      if (c.reglas !== 'fundador') sinFundador++;
      for (const k of CAMPOS) if (c[k] !== undefined) cuerpo[k] = c[k];
      cuerpo.system = [{ type: 'text', text: NOTA_F }, ...(Array.isArray(cuerpo.system) ? cuerpo.system : cuerpo.system ? [{ type: 'text', text: String(cuerpo.system) }] : [])];
      gasto.peticiones++;
      const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': CLAVE, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
      const sse = await res.text();
      // el uso de esta petición: el mayor de cada campo entre message_start y message_delta
      const u = { input_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 0 };
      for (const m of sse.matchAll(/^data: (.+)$/gm)) { let ev; try { ev = JSON.parse(m[1]); } catch (e) { continue; } const us = (ev.message && ev.message.usage) || ev.usage; if (us) for (const k of Object.keys(u)) if (us[k] > u[k]) u[k] = us[k]; }
      const p = PRECIOS[cuerpo.model] || [0, 0, 0, 0];
      gasto.entrada += u.input_tokens; gasto.cache_lee += u.cache_read_input_tokens; gasto.cache_escribe += u.cache_creation_input_tokens; gasto.salida += u.output_tokens;
      gasto.dolares += (u.input_tokens * p[0] + u.output_tokens * p[1] + u.cache_read_input_tokens * p[2] + u.cache_creation_input_tokens * p[3]) / 1e6;
      return r.fulfill({ status: res.status, headers: { ...CORS, 'content-type': res.headers.get('content-type') || 'text/event-stream', ...(res.ok ? { 'X-Reglas': 'fundador' } : {}) }, body: sse });
    });
    await context.route('https://generativelanguage.googleapis.com/**', (r) => r.abort());
    await crearCuenta(page);
    await quitarCapas(page);
    await meterCartera(page);
    await page.evaluate(async (motor) => {
      guardarCfgAsesor({ auto: 'manual' });
      LS.set('inv-ia-motor', motor); LS.set('inv-claude-ok', FB.user.uid); LS.del('inv-claude-pausa');
      RED_CLAUDE.primero = 170000; RED_CLAUDE.hilo = 170000;
      S.acceso = 'privado'; LS.set('inv-acceso', { a: 'privado', uid: FB.user.uid, t: Date.now() }); LS.del('inv-ia-fundador-no');
      await sondearClaude();
      await cargarEscaneo().catch(() => {});
      await cargarFichas().catch(() => {});
    }, MOTOR);
    await page.evaluate(`(${carteraFundador.toString()})()`);
    const foto = await page.evaluate(() => {
      window.__herr = [];
      const orig = ejecutarHerramienta;
      const corta = (x) => { try { const s = JSON.stringify(x); return s.length > 5000 ? s.slice(0, 5000) + '…' : s; } catch (e) { return String(x); } };
      window.ejecutarHerramienta = (n, a, est) => { const out = orig(n, a, est); window.__herr.push({ n, a, est, res: corta(out) }); return out; };
      S.M = calcular();
      return contextoAsesor(S.M, 'chat', false);
    });

    const resultados = [];
    const guardar = (parcial) => {
      const salida = { v: 1, generado: new Date().toISOString(), motor: MOTOR, ...(parcial ? { parcial: true, de: PASAN.length } : {}), ...(SOLO.length ? { solo: SOLO } : {}), total: resultados.length, automaticas_bien: resultados.filter((x) => !x.mal.length).length, gasto: { ...gasto, dolares: Math.round(gasto.dolares * 1000) / 1000 }, tope: TOPE, sin_reglas_fundador: sinFundador, errores_pagina: errores.slice(0, 10), foto_fundador: foto, preguntas: resultados };
      writeFileSync(SALIDA, JSON.stringify(salida, null, 1));
      return salida;
    };
    if (SOLO.length) expect(PASAN.map((q) => q.id).sort(), 'ids de GF_BANCO_SOLO que no están en el banco').toEqual([...new Set(SOLO)].sort());
    for (const q of PASAN) {
      if (gasto.dolares >= TOPE) { console.log(`tope de ${TOPE} $ alcanzado: no se pregunta ${q.id} ni las siguientes`); break; }
      await page.evaluate(() => {
        S.acceso = 'privado'; LS.set('inv-acceso', { a: 'privado', uid: FB.user.uid, t: Date.now() }); LS.del('inv-claude-pausa'); LS.del('inv-ia-fundador-no');
        // la app recarga los precios durante la pasada: el fondo atascado se repone antes de cada pregunta (19 nov: en la
        // primera pasada se pisó y la foto de casi todas llevaba el precio de verdad, no el atascado)
        if (window.__viejoNB && S.precios.instrumentos['nb-short']) S.precios.instrumentos['nb-short'] = { ...S.precios.instrumentos['nb-short'], fecha: window.__viejoNB };
        S.M = calcular(); AS.conv = []; AS.api = []; AS.foto = null; AS.cargando = false; window.__herr = [];
        if (typeof cerrarAsesor === 'function') cerrarAsesor();
      });
      const t0 = Date.now(), d0 = gasto.dolares;
      await page.evaluate((x) => abrirAsesor(x, true), q.q);
      await expect.poll(() => page.evaluate(() => !AS.cargando && AS.conv.length >= 2), { timeout: 240_000, intervals: [1000] }).toBe(true);
      let primera = null;
      if (q.sigue) {
        primera = await page.evaluate(() => AS.conv[AS.conv.length - 1].partes.filter((p) => p.tipo === 'texto').map((p) => p.texto).join('\n\n'));
        await page.evaluate((x) => preguntarAsesor(x), q.sigue);
        await expect.poll(() => page.evaluate(() => !AS.cargando && AS.conv.length >= 4), { timeout: 240_000, intervals: [1000] }).toBe(true);
      }
      const r = await page.evaluate(() => {
        const t = AS.conv[AS.conv.length - 1];
        const texto = t.partes.filter((p) => p.tipo === 'texto').map((p) => p.texto).join('\n\n');
        const fo = String(AS.foto || ''), i = fo.indexOf('Neuberger Berman'), nb = i >= 0 ? fo.slice(i, i + 900) : '';
        return { texto, error: t.error || null, modelo: t.modelo || null, estandar: t.estandar, herramientas: [...window.__herr], fuentes: (t.citas || []).map((c) => c.u).slice(0, 10), nb_atascado: /atascado/.test(nb) };
      });
      const mal = revisarFundador(q, r);
      if (r.estandar !== false) mal.push('no ha ido con las reglas del fundador');
      resultados.push({ id: q.id, tema: q.tema, q: q.q, ...(q.sigue ? { sigue: q.sigue, primera: (primera || '').slice(0, 6000) } : {}), comprueba: q.comprueba, mal, segundos: Math.round((Date.now() - t0) / 1000), dolares: Math.round((gasto.dolares - d0) * 10000) / 10000, modelo: r.modelo, nb_atascado_en_su_foto: r.nb_atascado, herramientas: r.herramientas, fuentes: r.fuentes, respuesta: r.texto.slice(0, 12000) });
      console.log(`${mal.length ? '✘' : '✓'} ${q.id} (${Math.round((gasto.dolares - d0) * 1000) / 1000} $)${mal.length ? ': ' + mal.join('; ') : ''}`);
      guardar(true);
      await page.waitForTimeout(1500);
    }
    const salida = guardar(false);
    console.log(`banco del fundador con Claude (${MOTOR}): ${salida.total} preguntas, ${salida.automaticas_bien} sin fallos automáticos · ${gasto.peticiones} peticiones, ${salida.gasto.dolares} $`);
    // la puntuación la hace el agente aparte; aquí solo cae si la infraestructura falla (sin respuesta o sin las reglas)
    expect(resultados.filter((x) => x.mal.some((m) => /^error|sin respuesta|reglas del fundador/.test(m))).length, 'preguntas sin respuesta o sin las reglas del fundador').toBeLessThanOrEqual(2);
    expect(sinFundador, 'peticiones sin las reglas del fundador').toBe(0);
  });
});
