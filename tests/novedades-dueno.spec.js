// 0.8a · Novedades para todos o solo para el dueño (lo pidió Carlos el 3 nov). Una cosa con «solo: 'dueno'», o un arreglo
// escrito como { t: '…', solo: 'dueno' }, lo ve el dueño y nadie más: en el mensaje corto de las versiones de letra, en
// «¿Qué se ha mejorado?», en la guía «Nuevo» y en el historial. Si una versión de letra se queda sin nada para ti, no sale.
// En la 0.8a, «El correo de Tú, en una línea» es solo para el dueño; los otros dos arreglos, para todos.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

for (const dueno of [false, true]) {
  const test = base.extend({
    errores: [async ({ context }, use) => {
      const errores = await preparar(context, { ajustes: dueno ? { 'stub-dueno': 'lucia@prueba.com' } : {} });
      await use(errores);
      expect(errores, 'errores de JavaScript en la página').toEqual([]);
    }, { auto: true }],
  });

  test.describe(dueno ? 'novedades: el dueño lo ve todo' : 'novedades: una cuenta normal no ve lo del dueño', () => {
    test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'en el móvil'));

    test('de la 0.8 a la 0.8a: el mensaje corto, «¿Qué se ha mejorado?», la guía y el historial', async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto('/');
      await crearCuenta(page);
      await quitarCapas(page);
      await meterCartera(page);
      await page.waitForFunction(() => LS.get('inv-version') === VERSION, null, { timeout: 30_000 });
      expect(await page.evaluate(() => VERSION)).toBe('0.8a');
      await page.evaluate(() => { LS.set('inv-version', '0.8'); LS.set('inv-vnum', 2); LS.set('inv-perfil-pedido', true); LS.set('inv-perfil-luego', { t: Date.now(), n: 1 }); LS.set('inv-resumen-off', true); });
      await page.reload();
      await page.locator('#entrada').click({ timeout: 20_000 }).catch(() => {});

      // el mensaje corto de la 0.8a
      // el mensaje espera a que no haya ninguna hoja encima (la pregunta de la IA y demás): se van quitando
      const aviso = page.locator('.aviso-arr');
      for (let i = 0; i < 40 && !(await aviso.count()); i++) { await quitarCapas(page); await page.waitForTimeout(1500); }
      await expect(aviso).toBeVisible();
      await expect(aviso).toContainText(dueno ? '3 arreglos' : '2 arreglos');
      await expect(aviso).toContainText('sin poner la clave de Google');
      if (dueno) await expect(aviso).toContainText('tu correo en Tú'); else await expect(aviso).not.toContainText('tu correo en Tú');
      expect(await page.evaluate(() => LS.get('inv-dueno', 0))).toBe(dueno ? 1 : 0);

      // «¿Qué se ha mejorado?» en lista: los arreglos de la 0.8a
      await page.evaluate(() => { document.querySelectorAll('.aviso-arr').forEach((x) => x.remove()); mostrarNovedades('0.8', () => {}, true); });
      const hoja = page.locator('.hoja-nov');
      await expect(hoja).toBeVisible();
      await expect(hoja).toContainText('sin poner la clave de Google');
      if (dueno) await expect(hoja).toContainText('tu correo en Tú'); else await expect(hoja).not.toContainText('tu correo en Tú');
      await page.evaluate(() => document.querySelectorAll('.hoja-fondo').forEach((x) => x.remove()));

      const r = await page.evaluate(async () => {
        const n08a = NOVEDADES.find((n) => n.v === '0.8a'), n08 = NOVEDADES.find((n) => n.v === '0.8');
        // la guía «Nuevo»: una cosa de la 0.8 que fuera solo para el dueño
        const pasos = pasosGuia().length;
        n08.cosas[0].solo = 'dueno';
        const pasosSolo = pasosGuia().length;
        delete n08.cosas[0].solo;
        // una versión de letra con todo solo para el dueño: a los demás, ni el mensaje ni en el historial ni en la lista
        const antes = n08a.arreglos;
        n08a.arreglos = antes.map((a) => ({ t: typeof a === 'string' ? a : a.t, solo: 'dueno' }));
        const visible = novVisibles().some((n) => n.v === '0.8a');
        arreglosVistos('0.8', () => {});
        await new Promise((ok) => setTimeout(ok, 1800));
        const avisa = !!document.querySelector('.aviso-arr');
        document.querySelectorAll('.aviso-arr').forEach((x) => x.remove());
        mostrarNovedades('0.8', () => {}, true);
        const enLista = [...document.querySelectorAll('.hoja-nov .nov-num')].map((x) => x.textContent);
        document.querySelectorAll('.hoja-fondo').forEach((x) => x.remove());
        await abrirRegistro(() => {});
        const reg = document.querySelector('.registro');
        const enRegistro = [...reg.querySelectorAll('.reg-indice a')].map((a) => a.textContent);
        const detalle = reg.querySelectorAll('.reg-det').length;
        document.querySelectorAll('.hoja-fondo').forEach((x) => x.remove());
        n08a.arreglos = antes;
        return { pasos, pasosSolo, visible, avisa, enLista, enRegistro, detalle };
      });
      expect(r.pasos).toBeGreaterThan(0);
      expect(r.pasosSolo).toBe(dueno ? r.pasos : r.pasos - 1);
      expect(r.visible).toBe(dueno);
      expect(r.avisa).toBe(dueno);
      expect(r.enLista.includes('0.8a')).toBe(dueno);
      expect(r.enRegistro.includes('0.8a')).toBe(dueno);
      expect(r.enRegistro).toContain('0.8');
      // la lista detallada (sale de los commits) solo la ve el dueño
      if (!dueno) expect(r.detalle).toBe(0);
    });
  });
}
