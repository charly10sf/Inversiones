// 0.8.3 · El correo de confirmación: sale solo al crear la cuenta con correo y contraseña (y la bienvenida lo dice), el panel
// de la IA deja mandarlo otra vez y explica que vale el último, y al volver con el enlace ya abierto la app lo nota sola.
import { test, expect } from '@playwright/test';
import { preparar, BASE, quitarCapas } from './ayuda.js';

const CORREO = 'marta@prueba.com';
const mandados = (page) => page.evaluate(() => window.__correosConfirmacion || 0);

async function crearSinConfirmar(page) {
  await page.goto(BASE + '#cuenta');
  await page.waitForSelector('.intro, #fCorreo', { timeout: 30000 });
  if (await page.$('.intro')) await page.click('.intro-saltar');
  await page.waitForSelector('#fCorreo', { timeout: 15000 });
  if (await page.$('.cuenta-modo [data-m="crear"][aria-pressed="false"]')) await page.click('.cuenta-modo [data-m="crear"]');
  if (await page.$('#cNombre')) await page.fill('#cNombre', 'Marta');
  await page.fill('#cEmail', CORREO);
  await page.fill('#cPass', 'secreta1');
  await page.click('#bCorreo');
  await page.waitForSelector('#fBien', { timeout: 20000 });
}

test('al crear la cuenta sale el correo de confirmación y la bienvenida lo dice', async ({ page, context }) => {
  const errores = await preparar(context);
  await crearSinConfirmar(page);
  expect(await mandados(page)).toBe(1);
  await expect(page.locator('#fBien .aviso-confirmar')).toContainText(CORREO);
  await expect(page.locator('#fBien .aviso-confirmar')).toContainText('hace falta para usar la IA');
  expect(errores).toEqual([]);
});

test('con el correo ya confirmado (Google o stub-verificar) no se manda ni se avisa', async ({ page, context }) => {
  await preparar(context, { ajustes: { 'stub-verificar': '1' } });
  await crearSinConfirmar(page);
  expect(await mandados(page)).toBe(0);
  await expect(page.locator('#fBien .aviso-confirmar')).toHaveCount(0);
});

test('el panel de la IA deja mandarlo otra vez y, al confirmarlo, la app lo nota sola', async ({ page, context }) => {
  const errores = await preparar(context);
  await crearSinConfirmar(page);
  await page.click('#bSeguir');
  await page.waitForSelector('#fCrear', { timeout: 15000 });
  await page.fill('#p1', 'cartera-123');
  await page.fill('#p2', 'cartera-123');
  await page.click('#bCrear');
  await page.waitForSelector('.hero-num', { timeout: 30000 });
  await quitarCapas(page);
  // el sí a Claude ya dado, para que no salga el confirm
  await page.evaluate(() => { LS.set('inv-claude-ok', FB.user.uid); LS.set('inv-acceso', { acceso: 'publico' }); });

  await page.evaluate(() => abrirAsesor());
  const panel = page.locator('#asesorFondo .as-sin-ia');
  await expect(panel).toContainText('confirma tu correo');
  await expect(panel.locator('.as-reenviar')).toContainText(CORREO);
  await expect(panel.locator('.as-reenviar')).toContainText('último');
  await panel.locator('[data-as="reenviar-correo"]').click();
  await expect.poll(() => mandados(page)).toBe(2);
  await expect(page.locator('#toast')).toContainText('los de antes ya no valen');

  // «Ya lo he confirmado» sin haberlo hecho: lo dice y sigue igual
  await page.locator('#asesorFondo [data-as="reprobar"]').click();
  await expect(page.locator('#toast')).toContainText('Todavía no consta confirmado');
  await expect(page.locator('#asesorFondo [data-as="reenviar-correo"]')).toBeVisible();

  // abre el enlace en otro sitio (el stub lo marca) y vuelve a Toisón: lo nota sin tocar nada
  await page.evaluate((c) => { window.__stubConfirmar(c); VERIF_MIRADO = 0; document.dispatchEvent(new Event('visibilitychange')); }, CORREO);
  await expect(page.locator('#toast')).toContainText('Correo confirmado');
  expect(await page.evaluate(() => FB.user.emailVerified)).toBe(true);
  await expect(page.locator('#asesorFondo [data-as="reenviar-correo"]')).toHaveCount(0);
  // y en Ajustes ya no sale «Confirma tu correo»
  await page.evaluate(() => { cerrarAsesor(); abrirAjustes(); });
  await expect(page.locator('#aVerif')).toHaveCount(0);
  expect(errores).toEqual([]);
});
