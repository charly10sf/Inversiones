// 0.8.3 (15 nov) · La lista de espera en Ajustes (solo el dueño): las solicitudes de toison.es con «Dar acceso», que pide
// al Worker el correo «Ya tienes acceso» y marca la solicitud; y el enlace del correo, que abre la app en «Crear cuenta».
import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { preparar, crearCuenta, quitarCapas, BASE } from './ayuda.js';

const W = 'https://growfolio.growfolio-web-app.workers.dev/correo';
const SOLICITUDES = {
  'stub-fs:acceso/a1': { correo: 'amigo@gmail.com', cuando: '2026-11-14T22:10:00.000Z', idioma: 'es', desde: 'web' },
  'stub-fs:acceso/a2': { correo: 'friend@gmail.com', cuando: '2026-11-12T09:00:00.000Z', idioma: 'en', desde: 'web' },
  'stub-fs:acceso/a3': { correo: 'viejo@gmail.com', cuando: '2026-11-05T09:00:00.000Z', idioma: 'es', desde: 'web', dado: true, dadoCuando: { __ts: Date.now() - 3 * 864e5 } },
};
const test = base.extend({
  ajustes: [{}, { option: true }],
  errores: [async ({ context, ajustes }, use) => { await use(await preparar(context, { ajustes })); }, { auto: true }],
});

async function workerDeMentira(page, respuesta = () => [200, { ok: true }]) {
  const vistos = [];
  await page.route(W, (r) => {
    const c = JSON.parse(r.request().postData() || '{}');
    vistos.push({ ...c, auth: r.request().headers().authorization || '' });
    const [status, cuerpo] = respuesta(c.tipo);
    return r.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(cuerpo) });
  });
  return vistos;
}

test.describe('el dueño', () => {
  test.use({ ajustes: { 'stub-dueno': 'lucia@prueba.com', ...SOLICITUDES } });

  test('ve la lista de espera, da acceso (correo del Worker en el idioma de cada uno) y no lo repite sin querer', async ({ page, errores }) => {
    const vistos = await workerDeMentira(page);
    await crearCuenta(page);
    await quitarCapas(page);
    await expect.poll(() => page.evaluate(() => S.esDueno)).toBe(true);
    await page.evaluate(() => abrirAjustes());
    await expect(page.locator('#aEspera')).toBeVisible();
    await page.click('#aEspera');
    const l = page.locator('.esp-l li');
    await expect(l).toHaveCount(3);
    // primero las que esperan (la más reciente arriba) y al final la que ya tiene acceso
    await expect(l.nth(0)).toContainText('amigo@gmail.com');
    await expect(l.nth(1)).toContainText('friend@gmail.com');
    await expect(l.nth(2)).toContainText('viejo@gmail.com');
    await expect(l.nth(2)).toContainText('Acceso dado');
    await expect(page.locator('.hoja-priv')).toContainText('3 en total, 2 esperando');
    // en el móvil, el correo y el botón caben
    const caja = await l.nth(1).boundingBox(), vp = page.viewportSize();
    expect(caja.x + caja.width).toBeLessThanOrEqual(vp.width);

    await l.nth(1).locator('[data-dar]').click();
    await expect(l.nth(1)).toContainText('Acceso dado');
    await expect(l.nth(1).locator('[data-dar]')).toHaveText('Volver a mandar');
    const a = vistos.filter((x) => x.tipo === 'acceso');
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ tipo: 'acceso', correo: 'friend@gmail.com', lang: 'en' });
    expect(a[0].auth).toMatch(/^Bearer /);
    const doc = await page.evaluate(() => JSON.parse(localStorage.getItem('stub-fs:acceso/a2')));
    expect(doc.dado).toBe(true);
    expect(doc.dadoCuando.__ts).toBeGreaterThan(Date.now() - 60000);
    expect(doc.correo).toBe('friend@gmail.com');

    // la que ya tiene acceso pide confirmación; con «Cancelar» no sale nada
    await l.nth(2).locator('[data-dar]').click();
    await expect(page.locator('#espOtra')).toBeVisible();
    await page.locator('.hoja [data-cerrar]').last().click();
    expect(vistos.filter((x) => x.tipo === 'acceso')).toHaveLength(1);
    await l.nth(2).locator('[data-dar]').click();
    await page.click('#espOtra');
    await expect.poll(() => vistos.filter((x) => x.tipo === 'acceso').length).toBe(2);
    expect(errores).toEqual([]);
  });

  test('si el Worker dice que no, la solicitud sigue esperando y se explica por qué', async ({ page }) => {
    await workerDeMentira(page, (tipo) => (tipo === 'acceso' ? [503, { ok: false, motivo: 'cupo' }] : [200, { ok: true }]));
    await crearCuenta(page);
    await quitarCapas(page);
    await expect.poll(() => page.evaluate(() => S.esDueno)).toBe(true);
    await page.evaluate(() => verListaEspera());
    const li = page.locator('.esp-l li').first();
    await li.locator('[data-dar]').click();
    await expect(page.locator('#toast')).toContainText('cupo de correos');
    await expect(li).toContainText('Esperando');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('stub-fs:acceso/a1')).dado)).toBeUndefined();
  });
});

test.describe('otra cuenta', () => {
  test.use({ ajustes: { 'stub-dueno': 'carlos@prueba.com', ...SOLICITUDES } });
  test('no ve la lista de espera ni puede leerla ni marcarla', async ({ page }) => {
    await crearCuenta(page);
    await quitarCapas(page);
    await page.evaluate(() => abrirAjustes());
    await expect(page.locator('#aAcceso')).toBeAttached();
    await expect(page.locator('#aEspera')).toHaveCount(0);
    const r = await page.evaluate(async () => {
      const f = FB.fs, out = [];
      try { await f.getDocs(f.collection(FB.db, 'acceso')); out.push('leyó'); } catch (e) { out.push(e.code); }
      try { await f.updateDoc(f.doc(FB.db, 'acceso', 'a1'), { dado: true, dadoCuando: f.serverTimestamp() }); out.push('marcó'); } catch (e) { out.push(e.code); }
      return out;
    });
    expect(r).toEqual(['permission-denied', 'permission-denied']);
  });
});

test('el enlace del correo (?entrar=crear) abre en «Crear cuenta» y se quita de la dirección', async ({ page }) => {
  await page.goto(BASE + '?entrar=crear#cuenta');
  await page.waitForSelector('.intro, #fCorreo', { timeout: 30000 });
  if (await page.$('.intro')) await page.click('.intro-saltar');
  await page.waitForSelector('#fCorreo', { timeout: 15000 });
  await expect(page.locator('.cuenta-modo [data-m="crear"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#bCorreo')).toHaveText('Crear cuenta');
  expect(await page.evaluate(() => location.search)).toBe('');
});

test('las reglas de Firestore: en «acceso», el dueño solo puede marcar «dado» y «dadoCuando», y nadie borra', ({}, info) => {
  test.skip(info.project.name !== 'movil', 'una vez basta');
  const r = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const bloque = r.slice(r.indexOf('match /acceso/{id}'), r.indexOf('}', r.indexOf('allow delete', r.indexOf('match /acceso/{id}'))));
  expect(bloque).toContain("allow read, list: if esDueno();");
  expect(bloque).toMatch(/allow update: if esDueno\(\)\s*&& request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['dado', 'dadoCuando'\]\)/);
  expect(bloque).toContain('request.resource.data.dado == true');
  expect(bloque).toContain('request.resource.data.dadoCuando == request.time');
  expect(bloque).toContain('allow delete: if false;');
  // la creación desde la web sigue con sus cuatro campos (sin «dado»: nadie puede apuntarse ya con acceso)
  expect(bloque).toContain("request.resource.data.keys().hasOnly(['correo', 'cuando', 'idioma', 'desde'])");
});
