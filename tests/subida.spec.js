// «Nadie nota nada» (0.6): quien tiene la cartera con la versión publicada (la de main) abre esta y sigue igual.
// GF_ANTES: la carpeta con la web de main ya lista para servir (en CI la prepara el workflow; a mano:
//   git worktree add /tmp/antes origin/main, y si main ya tiene build, npm ci && npm run build allí y usar su dist).
// Las dos se sirven en el mismo origen, una después de la otra, como pasa al publicar.
import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const ANTES = process.env.GF_ANTES;
const PUERTO = 8790;
const servir = (dir) => new Promise((ok) => {
  const p = spawn('node', [join(import.meta.dirname, 'servidor.js'), dir, String(PUERTO)], { stdio: ['ignore', 'pipe', 'inherit'] });
  p.stdout.once('data', () => ok(p));
});
const parar = (p) => new Promise((ok) => { p.once('exit', ok); p.kill(); });

test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil' || !ANTES || !existsSync(join(ANTES || '', 'index.html')), 'hace falta GF_ANTES (la web de main)'));

test('la cartera de la versión publicada se abre igual con esta', async ({ page, context }) => {
  const errores = await preparar(context, {});
  const base = `http://localhost:${PUERTO}/`;
  let srv = await servir(ANTES);
  await crearCuenta(page, { base });
  await quitarCapas(page);
  await meterCartera(page);
  const antes = await page.evaluate(() => ({ v: VERSION, total: Math.round(S.M.total), pos: S.cartera.posiciones.length, kit: !!S.kv }));
  await parar(srv);

  srv = await servir(join(import.meta.dirname, '..', 'dist'));
  await page.reload();
  await page.locator('#entrada').click({ timeout: 20_000 }).catch(() => {});
  await expect(page.locator('.hero-num')).toBeVisible({ timeout: 30_000 });
  const ahora = await page.evaluate(() => ({ v: VERSION, total: Math.round(S.M.total), pos: S.cartera.posiciones.length, kit: !!S.kv }));
  await parar(srv);
  console.log('antes', antes, 'ahora', ahora);
  expect(ahora.total).toBe(antes.total);
  expect(ahora.pos).toBe(antes.pos);
  expect(ahora.kit).toBe(antes.kit);
  expect(errores).toEqual([]);
});
