// Mejorar la IA (19 nov 2026, claude/sesion-mejorar-ia.md): los ajustes del fundador tras puntuar su banco, y que el
// estándar no cambia (lo que va a Claude con sus reglas: su nota, sus instrucciones; tocarlo pide revisión aparte y el sí
// de Carlos, y entonces se cambia aquí la huella a propósito).
import { test as base, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'solo en el móvil'));

async function conCartera(page) { await crearCuenta(page); await quitarCapas(page); await meterCartera(page); }

test('buscar_empresa y simular_compra encuentran la empresa con el nombre y el ticker juntos', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => {
    const x = radarVals().find((y) => /\./.test(y.s) && y.n && y.n.split(' ')[0].length > 4) || radarVals()[0];
    const nombre = x.n.split(' ')[0];
    return { s: x.s, juntos: (buscarRadar(`${nombre} ${x.s}`) || {}).s, parent: (buscarRadar(`${nombre} (${x.s})`) || {}).s, solo: (buscarRadar(x.s) || {}).s,
      herr: ejecutarHerramienta('buscar_empresa', { consulta: `${nombre} ${x.s}` }, false).error || null, nada: buscarRadar('Glowmark Biotech GLWX') };
  });
  expect(r.juntos).toBe(r.s);
  expect(r.parent).toBe(r.s);
  expect(r.solo).toBe(r.s);
  expect(r.herr).toBeNull();
  expect(r.nada).toBeNull();
});

test('una pregunta en inglés lleva la nota delante y detrás', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => ({ t: conNotaInglesIA('Should I sell?'), b: conNotaInglesIA([{ type: 'image', source: {} }, { type: 'text', text: 'What is this?' }]) }));
  expect(r.t).toMatch(/^\(Reply entirely in English, headings included\.\)\n\nShould I sell\?\n\n\(Answer in English\.\)$/);
  expect(r.b[1].text).toMatch(/^\(Reply entirely in English[\s\S]*\(Answer in English\.\)$/);
  expect(r.b[0]).toEqual({ type: 'image', source: {} });
});

test('las instrucciones del fundador llevan lo que se confundía en el banco; el estándar no cambia', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => ({ f: instruccionesAsesor(false), e: instruccionesAsesor(true), ne: NOTA_CLAUDE, nf: NOTA_CLAUDE_FUNDADOR, anio: String(new Date().getFullYear()) }));
  for (const t of ['Una acción, un ETF o un ETC (su oro) no se traspasan', 'pérdidas de años anteriores pendientes', 'nunca «la mayor parte»', '«Ese dinero»', 'simular_compra del importe total', 'retiene a cuenta el 19 % de la ganancia', '«no lo tengo en Toisón»', 'Acaba siempre con tu recomendación clara', 'nunca digas que no tiene pérdidas que compensar', 'tras apartar el impuesto', 'Una paga extra', 'Su precio medio no dice si algo está caro']) {
    expect(r.f, t).toContain(t);
    expect(r.e, t).not.toContain(t);
  }
  // la huella del estándar (sin el año): si cambia, es que algo ha llegado al estándar
  const huella = (x) => createHash('sha256').update(x.split(r.anio).join('AAAA')).digest('hex').slice(0, 16);
  expect({ instrucciones: huella(r.e), nota: huella(r.ne) }).toEqual({ instrucciones: 'abdb65f31b1d749b', nota: '137a3f8b20bfd03f' });
});

test('el pedido de la revisión del fundador lleva lo que fallaba en su banco; el del estándar no cambia', async ({ page }) => {
  await conCartera(page);
  const r = await page.evaluate(() => ({ f: pedidoAnalisis(['repsol'], 'prueba', false, true, false), e: pedidoAnalisisPublico(['repsol'], 'prueba', false, true), anio: String(new Date().getFullYear()) }));
  for (const t of ['El titular empieza por lo que ha pasado hoy', 'Un fondo que aún no tiene el precio de hoy no se ha movido hoy', 'su bajada es el dividendo', 'nada de «valora», «decide si»', '"fuentes" vacío', 'da la cifra que ya calcula Toisón']) {
    expect(r.f, t).toContain(t);
    expect(r.e, t).not.toContain(t);
  }
  const huella = createHash('sha256').update(r.e.split(r.anio).join('AAAA')).digest('hex').slice(0, 16);
  expect(huella).toBe('beca2a7f8d7ceefe');
});
