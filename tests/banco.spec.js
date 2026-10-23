// 0.7 · Banco de preguntas de GrowIA con Gemini DE VERDAD. Solo corre si se le da una clave (GF_BANCO_CLAVE): lo lanza
// cada noche la Action «Banco de GrowIA» con la clave de la Action; en «Pruebas» se salta.
//   GF_BANCO_CLAVE   la clave de Gemini
//   GF_BANCO_MODELO  el modelo (por defecto gemini-3.5-flash-lite)
//   GF_BANCO_MUESTRA 1 = solo las preguntas marcadas como «muestra» (la tanda semanal con el modelo bueno)
//   GF_BANCO_SALIDA  dónde escribir el resultado (por defecto banco.json)
// Cada pregunta, en una conversación nueva, con la app de verdad y la cartera de prueba. Se comprueba lo que dice
// (lo que tiene que salir y lo que no), las herramientas que usa y cuántas peticiones gasta.
import { test as base, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CLAVE = process.env.GF_BANCO_CLAVE || '';
const MODELO = process.env.GF_BANCO_MODELO || 'gemini-3.5-flash-lite';
const SALIDA = process.env.GF_BANCO_SALIDA || join(AQUI, '..', 'banco.json');
const BANCO = JSON.parse(readFileSync(join(AQUI, 'banco', 'preguntas.json'), 'utf8')).preguntas.filter((q) => process.env.GF_BANCO_MUESTRA !== '1' || q.muestra);

const test = base.extend({
  errores: async ({ context }, use) => {
    const errores = await preparar(context, { ajustes: { 'stub-dueno': 'lucia@prueba.com' } });
    await use(errores);
  },
});
test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
  test.skip(!CLAVE, 'sin clave de Gemini (GF_BANCO_CLAVE): el banco solo corre en su Action');
  test.skip(info.project.name !== 'pc', 'una vez, en el ordenador');
});
// 42 preguntas de hasta 4 minutos cada una en el peor caso: hora y media, y lo hecho se guarda tras cada pregunta
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

test('banco de preguntas de GrowIA', async ({ page, context, errores }) => {
  // Gemini de verdad (lo demás de fuera sigue cortado)
  const peticiones = [];
  await context.route('https://generativelanguage.googleapis.com/**', (r) => { if (/:(stream)?[gG]enerateContent/.test(r.request().url())) peticiones.push(r.request().url()); return r.continue(); });
  await crearCuenta(page);
  await quitarCapas(page);
  await meterCartera(page);
  await page.evaluate(async ({ clave, modelo }) => {
    guardarCfgAsesor({ auto: 'manual', modelo });
    AS.clave = clave;
    LS.del('inv-ia-agotados');
    await cargarEscaneo().catch(() => {});
    await cargarFichas().catch(() => {});
    // las herramientas que usa cada respuesta
    window.__herr = [];
    const orig = ejecutarHerramienta;
    window.ejecutarHerramienta = (n, i) => { window.__herr.push(n); return orig(n, i); };
  }, { clave: CLAVE, modelo: MODELO });

  const resultados = [];
  const guardar = (parcial) => {
    const bien = resultados.filter((x) => x.ok).length;
    const salida = {
      v: 1, generado: new Date().toISOString(), modelo: MODELO, muestra: process.env.GF_BANCO_MUESTRA === '1', ...(parcial ? { parcial: true, de: BANCO.length } : {}),
      total: resultados.length, bien, pct: resultados.length ? Math.round((bien / resultados.length) * 100) : 0,
      peticiones_media: resultados.length ? Math.round((resultados.reduce((s, x) => s + x.peticiones, 0) / resultados.length) * 10) / 10 : 0,
      errores_pagina: errores.slice(0, 10), preguntas: resultados,
    };
    writeFileSync(SALIDA, JSON.stringify(salida, null, 1));
    return salida;
  };
  for (const q of BANCO) {
    // al cambiar de modo, las señales se recalculan (en estándar son las de los analistas, no las de GrowFolio).
    // Los modelos que no se prueban, como agotados: la clave es la de la Action, y si GrowIA saltaba al 3.6 o al 3.8
    // cuando Flash-Lite no contestaba, les gastaba el cupo que necesitan el informe y las ideas (23 oct: el banco dejó
    // al 3.6 sin cupo y el informe salió con Flash-Lite)
    await page.evaluate(({ modo, modelo }) => {
      S.acceso = modo === 'estandar' ? 'publico' : 'privado'; S.M = calcular(); AS.conv = []; AS.api = []; AS.foto = null; window.__herr = [];
      const d = diaGoogle(); LS.set('inv-ia-agotados', Object.fromEntries(['gemini-3.8-flash', 'gemini-3.6-flash'].filter((m) => m !== modelo).map((m) => [m, d])));
      if (typeof cerrarAsesor === 'function') cerrarAsesor();
    }, { modo: q.modo, modelo: MODELO });
    const antes = peticiones.length, t0 = Date.now();
    await page.evaluate((x) => abrirAsesor(x, true), q.q);
    await expect.poll(() => page.evaluate(() => !AS.cargando && AS.conv.length >= 2), { timeout: 240_000, intervals: [1000] }).toBe(true);
    const r = await page.evaluate(() => {
      const t = AS.conv[AS.conv.length - 1];
      const texto = t.partes.filter((p) => p.tipo === 'texto').map((p) => p.texto).join('\n\n');
      const herramientas = [...window.__herr, ...t.partes.filter((p) => p.tipo === 'paso' && /Busca en internet/.test(p.txt || '')).map(() => 'buscar_en_internet')];
      return { texto, error: t.error || null, modelo: t.modelo || null, herramientas };
    });
    r.peticiones = peticiones.length - antes;
    r.segundos = Math.round((Date.now() - t0) / 1000);
    const mal = revisar(q, r);
    resultados.push({ id: q.id, modo: q.modo, q: q.q, ok: !mal.length, mal, peticiones: r.peticiones, segundos: r.segundos, modelo: r.modelo, herramientas: [...new Set(r.herramientas)], respuesta: r.texto.slice(0, 800) });
    console.log(`${mal.length ? '✘' : '✓'} ${q.id} (${r.peticiones} peticiones, ${r.segundos} s)${mal.length ? ': ' + mal.join('; ') : ''}`);
    // si la Action se queda sin tiempo, lo hecho hasta aquí se publica igual
    guardar(true);
    // Google cuenta las peticiones por minuto: un respiro entre pregunta y pregunta
    await page.waitForTimeout(4000);
  }
  const salida = guardar(false);
  console.log(`banco: ${salida.bien} de ${salida.total} (${salida.pct} %), ${salida.peticiones_media} peticiones de media`);
});
