// 0.8.3 · La pestaña Tú nueva (propuesta 4 del lienzo, 7 nov): la cabecera con quién eres y el gráfico de tus límites,
// los apartados (filas en el móvil, menú en el ordenador), la pantalla Límites con − y +, el aviso desde ahí, el perfil y
// el colchón guardados en su pantalla y el modo estándar sin órdenes. En 390, 360 y 1440; en español y en inglés.
import { test as base, expect } from '@playwright/test';
import { preparar, crearCuenta, meterCartera, quitarCapas } from './ayuda.js';

const test = base.extend({
  errores: [async ({ context }, use) => {
    const errores = await preparar(context);
    await use(errores);
    expect(errores, 'errores de JavaScript en la página').toEqual([]);
  }, { auto: true }],
});
const ir = async (page, h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(350); await quitarCapas(page); };
const esPc = (info) => info.project.name === 'pc';
// al crear la cuenta, la hoja de «Primeros pasos» sale sola al rato: si tapa lo que se toca, se quita y se vuelve a probar
const clic = async (loc) => { for (let i = 0; i < 6; i++) { await quitarCapas(loc.page()); try { await loc.click({ timeout: 2500 }); return; } catch (e) { if (i === 5) throw e; } } };
// la cartera de ayuda.js con un perfil lleno: acciones sueltas 17,3 % (límite 15), Repsol 7,8 % (6), cripto 4,5 % (5), oro 7,7 % (10)
async function conPerfil(page, extra = {}) {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(async (extra) => {
    S.cartera.perfil = { ...(S.cartera.perfil || {}), nombre: 'Lucía', edad: 31, situacion: 'trabajando', horizonte: 20, riesgo: 'medio', limite_cripto: 5, limite_empresa: 6, limite_oro: 10, ...extra };
    S.cartera.limite_acciones = 15;
    // 14 nov 2026: el peso de la cripto sale del precio del día y estas pruebas lo daban por fijo (4,5 %, «cerca» de su límite
    // de 5). Con el bitcoin en 62.000 € bajó del 4 % y «Cerca» pasó a «Dentro», también en main. La cantidad de bitcoin se
    // pone aquí para que pese el 4,5 % con el precio que haya
    const M = calcular(), b = M.filas.find((f) => f.inst.id === 'btc'), pos = S.cartera.posiciones.find((x) => x.instrumento === 'btc');
    if (b && pos && b.valor > 0) pos.cantidad *= (0.045 * (M.total - b.valor) / 0.955) / b.valor;
    LS.set('inv-perfil-luego', { t: Date.now(), n: 3 });
    await guardarCartera('prueba');
  }, extra);
}

test('los estados de cada límite: pasado, cerca, dentro y sin límite, con su frase', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof filasLimites === 'function');
  await quitarCapas(page);
  const r = await page.evaluate(() => {
    S.cartera = S.cartera || {};
    S.cartera.limite_acciones = 15;
    S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_cripto: 5, limite_empresa: 6, limite_oro: 10, limite_caida: null };
    const f = (id, tipo, clase, valor) => ({ inst: { id, corto: id, nombre: id, tipo, clase }, valor, peso: 0 });
    // 1000: ACME 80 (8 %), BETA 93 (9,3 %): sueltas 17,3 %; cripto 45 (4,5 %); oro 77 (7,7 %)
    const M = { total: 1000, liquidez: 0, filas: [f('ACME', 'Acción', 'Renta variable', 80), f('BETA', 'Acción', 'Renta variable', 93), f('BTC', 'Cripto', 'Cripto', 45), f('ORO', 'Fondo', 'Oro', 77), f('MUNDO', 'Fondo', 'Renta variable', 705)] };
    const filas = filasLimites(M), res = resumenLimites(filas);
    // dentro del margen de medio punto (15,3 de 15) no es «pasado», es «cerca»
    const enMargen = estadoLim(15.3, 15), justo = estadoLim(14.2, 15), lejos = estadoLim(12, 15), cero = estadoLim(0, 0);
    return { est: filas.map((x) => [x.k, x.estado]), t: res.titulo, l: res.linea, enMargen, justo, lejos, cero, html: htmlGraficoLim(filas) };
  });
  expect(r.est).toEqual([['lim', 'pasa'], ['empresa', 'pasa'], ['cripto', 'cerca'], ['oro', 'dentro'], ['caida', 'sin']]);
  expect(r.t).toBe('Pasas 2 de tus 4 límites');
  expect(r.l).toBe('Acciones sueltas y BETA. Cripto, cerca.');
  expect([r.enMargen, r.justo, r.lejos, r.cero]).toEqual(['cerca', 'cerca', 'dentro', 'dentro']);
  // siempre con cifra o palabra, no solo color; la caída sin límite, con «Poner límite»
  expect(r.html).toContain('<span class="sr">Cripto: 4,5 % de un límite de 5 %, cerca</span>');
  expect(r.html).toContain('Poner límite');
  expect(r.html).toContain('La raya es tu límite.');
});

test('las reglas de − y +: los tres no pasan de 100 y una empresa nunca más que las acciones sueltas', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof moverLimite === 'function');
  await quitarCapas(page);
  const r = await page.evaluate(() => {
    S.cartera = S.cartera || {};
    S.cartera.limite_acciones = 90;
    S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_cripto: 5, limite_empresa: 10, limite_oro: 5, limite_caida: null };
    S.tuLim = null;
    moverLimite('cripto', 1); moverLimite('cripto', 1);           // 90 + 7 + 5 = 102: baja acciones sueltas (la mayor) a 88
    const a = { ...S.tuLim };
    for (let i = 0; i < 90; i++) moverLimite('lim', -1);           // acciones a 0: la empresa baja con ellas
    const b = { ...S.tuLim };
    moverLimite('empresa', 1);                                      // y no puede subir por encima
    const c = { ...S.tuLim };
    moverLimite('caida', 'poner'); const d = S.tuLim.caida; moverLimite('caida', -1); const e = S.tuLim.caida;
    moverLimite('caida', 'quitar'); const g = S.tuLim.caida;
    S.tuLim = null; moverLimite('empresa', 1); moverLimite('empresa', -1); // vuelve a lo guardado: sin borrador
    return { a, b, c, d, e, g, sinCambios: S.tuLim };
  });
  expect([r.a.lim, r.a.cripto, r.a.oro]).toEqual([88, 7, 5]);
  expect([r.b.lim, r.b.empresa]).toEqual([0, 0]);
  expect(r.c.empresa).toBe(0);
  expect([r.d, r.e, r.g]).toEqual([15, 14, null]);
  expect(r.sinCambios).toBeNull();
});

test('la portada y los apartados: filas en el móvil, menú y apartado abierto en el ordenador', async ({ page }, info) => {
  await conPerfil(page);
  await ir(page, 'objetivos');
  const cab = page.locator('#vista .tuv-cab');
  await expect(cab).toBeVisible();
  await expect(cab).toContainText('Lucía');
  await expect(cab).toContainText('31 años, por cuenta ajena. El dinero, en 10 a 20 años; si cayera un 30 %, esperaría: perfil equilibrado.');
  await expect(cab).toContainText('Pasas 2 de tus 4 límites');
  await expect(cab).toContainText('Acciones sueltas y Repsol. Cripto, cerca.');
  await expect(page.locator('#vista .tuv-menu a')).toHaveCount(6);
  await expect(page.locator('#vista .tuv-menu a[data-ap="limites"]')).toContainText('Pasas 2 de 4');
  if (esPc(info)) {
    // el ordenador abre Límites a la derecha y cambia de apartado sin dejar la cabecera
    await expect(page.locator('#tuPanel')).toBeVisible();
    await expect(page.locator('#tuPanel .tuv-t')).toHaveText('Límites');
    await clic(page.locator('.tuv-menu a[data-ap="metas"]'));
    await page.waitForTimeout(300);
    await expect(page.locator('.tuv-menu a[data-ap="metas"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#tuPanel .tuv-t')).toHaveText('Metas');
    await expect(cab).toBeVisible();
    await expect(page.locator('.tuv-atras')).toBeHidden();
  } else {
    // el móvil: la portada sin apartado; cada fila abre su pantalla con «‹ Tú» y sin la cabecera
    await expect(page.locator('#tuPanel')).toBeHidden();
    const fila = page.locator('.tuv-menu a[data-ap="limites"]');
    expect((await fila.boundingBox()).height).toBeGreaterThanOrEqual(63);
    await clic(fila);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => location.hash)).toBe('#tu-limites');
    await expect(page.locator('#tuPanel .tuv-t')).toHaveText('Límites');
    await expect(page.locator('.tuv-atras')).toBeVisible();
    await expect(cab).toBeHidden();
    await expect(page.locator('.ts-grupo')).toBeHidden();
    await clic(page.locator('.tuv-atras'));
    await page.waitForTimeout(300);
    await expect(cab).toBeVisible();
  }
  // cada dirección abre su apartado, también la proyección de siempre
  for (const [h, t] of [['tu-colchon', 'Colchón y bolsa'], ['tu-perfil', 'Perfil'], ['tu-ia', 'Para la IA'], ['proyeccion', 'Lo que podrías tener']]) {
    await ir(page, h);
    await expect(page.locator('#tuPanel .tuv-t')).toHaveText(t);
  }
  await expect(page.locator('#grafProy')).toBeVisible();
  // nada se sale de lado
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('Límites: − y + cambian el borrador, «Guardar los cambios» solo cuando hay algo y «Deshacer» lo deja como estaba', async ({ page }) => {
  await conPerfil(page);
  await ir(page, 'tu-limites');
  const pie = page.locator('.tlm-pie');
  await expect(pie).toBeHidden();
  const cripto = page.locator('.tlm-fila[data-lim="cripto"]');
  await expect(cripto.locator('.tlm-est')).toContainText('Cerca');
  await clic(cripto.getByRole('button', { name: 'Subir Cripto' }));
  await expect(cripto.locator('output')).toHaveText('6 %');
  // con el límite en 6, el 4,5 % de cripto ya no está cerca: el estado cambia al momento
  await expect(cripto.locator('.tlm-est')).toContainText('Dentro');
  await expect(pie).toBeVisible();
  await clic(page.getByRole('button', { name: 'Deshacer' }));
  await expect(cripto.locator('output')).toHaveText('5 %');
  await expect(pie).toBeHidden();
  // y se guarda
  await clic(cripto.getByRole('button', { name: 'Subir Cripto' }));
  await clic(cripto.getByRole('button', { name: 'Subir Cripto' }));
  await clic(page.getByRole('button', { name: 'Guardar los cambios' }));
  await page.waitForFunction(() => S.cartera.perfil.limite_cripto === 7);
  await expect(page.locator('.tlm-pie')).toBeHidden();
  await expect(page.locator('.tlm-fila[data-lim="cripto"] output')).toHaveText('7 %');
  // el foco sigue en el botón que tocaste (se puede seguir con el teclado)
  await page.locator('.tlm-fila[data-lim="oro"]').getByRole('button', { name: 'Bajar Oro y materias primas' }).focus();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-tulim'))).toBe('oro:-1');
});

test('Límites: la caída se pone desde 15 %, se cambia, se quita y la cabecera lo enseña', async ({ page }, info) => {
  await conPerfil(page);
  await ir(page, 'objetivos');
  // «Poner límite» de la cabecera lleva a la pantalla Límites con la caída ya en 15 %
  await clic(page.locator('.tuv-cab .tl-poner'));
  await page.waitForTimeout(350);
  if (!esPc(info)) expect(await page.evaluate(() => location.hash)).toBe('#tu-limites');
  const caida = page.locator('.tlm-fila[data-lim="caida"]');
  await expect(caida.locator('output')).toHaveText('15 %');
  await clic(caida.getByRole('button', { name: 'Bajar Caída desde máximos' }));
  await expect(caida.locator('output')).toHaveText('14 %');
  await clic(page.getByRole('button', { name: 'Guardar los cambios' }));
  await page.waitForFunction(() => S.cartera.perfil.limite_caida === 14);
  await ir(page, 'objetivos');
  await expect(page.locator('.tuv-cab .tl-poner')).toHaveCount(0);
  await expect(page.locator('.tuv-cab .tl-graf')).toContainText('de 14');
  // y se quita
  await ir(page, 'tu-limites');
  await clic(page.locator('.tlm-fila[data-lim="caida"]').getByRole('button', { name: 'Quitar' }));
  await clic(page.getByRole('button', { name: 'Guardar los cambios' }));
  await page.waitForFunction(() => S.cartera.perfil.limite_caida === null);
  await expect(page.locator('.tlm-fila[data-lim="caida"]')).toContainText('Sin límite');
});

test('el aviso de límites se enciende desde Límites (y enciende los avisos si estaban apagados)', async ({ page }) => {
  await page.addInitScript(() => { try { Notification.requestPermission = async () => 'granted'; } catch (e) {} });
  await conPerfil(page);
  await page.evaluate(() => LS.set('inv-avisos', { on: false, lim: true }));
  await ir(page, 'tu-limites');
  const sw = page.getByRole('switch', { name: 'Avisarme si paso uno' });
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('.tuv-aviso')).toContainText('se encienden los avisos de Toisón');
  await clic(sw);
  await expect(page.getByRole('switch', { name: 'Avisarme si paso uno' })).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => { const c = LS.get('inv-avisos'); return [c.on, c.lim]; })).toEqual([true, true]);
  // es la misma casilla que Ajustes > Avisos
  expect(await page.evaluate(() => htmlAjAvisos())).toMatch(/data-av="lim" checked/);
  await ir(page, 'objetivos');
  await expect(page.locator('.tuv-cab')).toContainText('Tu aviso está activado.');
  // apagarlo solo quita los de límites
  await ir(page, 'tu-limites');
  await clic(page.getByRole('switch', { name: 'Avisarme si paso uno' }));
  expect(await page.evaluate(() => { const c = LS.get('inv-avisos'); return [c.on, c.lim]; })).toEqual([true, false]);
});

test('el perfil y el colchón se guardan en su pantalla, sin los límites', async ({ page }) => {
  await conPerfil(page);
  await ir(page, 'tu-perfil');
  const f = page.locator('#tuPanel #fPerfil');
  await expect(f).toBeVisible();
  await expect(f.locator('[name="caida"], [name="cripto"], [name="gastos"]')).toHaveCount(0);
  await f.locator('[name="edad"]').fill('150');
  await clic(f.getByRole('button', { name: 'Guardar' }));
  await expect(page.locator('#errPerfil')).toHaveText('Revisa la edad.');
  // si algo repinta la vista mientras escribes (llegan datos), lo escrito y el error siguen ahí
  await page.locator('#tuPanel #fPerfil [name="edad"]').fill('34');
  await page.evaluate(() => pintar());
  await expect(page.locator('#tuPanel #fPerfil [name="edad"]')).toHaveValue('34');
  await expect(page.locator('#errPerfil')).toHaveText('Revisa la edad.');
  await f.locator('[name="edad"]').fill('33');
  await clic(f.getByRole('button', { name: 'Guardar' }));
  await page.waitForFunction(() => S.cartera.perfil.edad === 33);
  // los límites no se tocan al guardar el perfil
  expect(await page.evaluate(() => [S.cartera.limite_acciones, S.cartera.perfil.limite_empresa])).toEqual([15, 6]);
  await ir(page, 'tu-colchon');
  const c = page.locator('#tuPanel #fColchon');
  await c.locator('[name="gastos"]').fill('1.500');
  await c.locator('[name="colchon"]').selectOption('9');
  await clic(c.getByRole('button', { name: 'Guardar' }));
  await page.waitForFunction(() => S.cartera.perfil.gastos_mes === 1500 && S.cartera.perfil.colchon_meses === 9);
  await expect(page.locator('#tuPanel')).toContainText('9 meses de tus gastos');
});

test('modo estándar: el medidor de bolsa da el hecho y la regla, sin decir qué hacer; el fundador conserva sus textos', async ({ page }) => {
  await conPerfil(page, { riesgo: 'bajo', horizonte: 5 });   // regla de Toisón 35-55 %: la cartera de prueba va por encima
  const textos = await page.evaluate(() => {
    const out = {};
    for (const a of ['publico', 'privado']) { S.acceso = a; out[a] = panelColchon(S.M).replace(/<[^>]+>/g, ' '); }
    return out;
  });
  expect(textos.publico).toContain('La regla fija de Toisón para tus respuestas');
  expect(textos.publico).toContain('Estás por encima de ese rango.');
  expect(textos.publico).not.toMatch(/mejor a renta fija|más bolsa suele|lo normal|compra|vende|deberías|reduce|añade|aporta(?!r)/i);
  expect(textos.privado).toContain('Lo que aportes, mejor a renta fija o monetario hasta acercarte.');
  // y la pantalla Límites, en el estándar, tampoco da órdenes
  const lim = await page.evaluate(() => { S.acceso = 'publico'; return panelLimites(S.M).replace(/<[^>]+>/g, ' '); });
  expect(lim).not.toMatch(/\b(vende|vender|compra|comprar|reduce|reducir|deberías)\b/i);
});

test('con el perfil vacío: «Cuéntale a Toisón quién eres» y los límites de partida', async ({ page }) => {
  await crearCuenta(page); await meterCartera(page); await quitarCapas(page);
  await page.evaluate(() => LS.set('inv-perfil-luego', { t: Date.now(), n: 3 }));
  await ir(page, 'objetivos');
  const cab = page.locator('#vista .tuv-cab');
  await expect(cab).toContainText('Cuéntale a Toisón quién eres');
  await expect(cab.getByRole('button', { name: 'Empezar' })).toBeVisible();
  await expect(cab).toContainText('Son los de partida de Toisón: cámbialos a tu gusto.');
  await expect(cab.locator('.tl-graf')).toContainText('de 20');
  await expect(page.locator('.tuv-menu a[data-ap="perfil"]')).toContainText('Sin hacer');
});

test('en inglés', async ({ page, context }) => {
  await context.addInitScript(() => { try { localStorage.setItem('inv-idioma', JSON.stringify('en')); } catch (e) {} });
  await conPerfil(page);
  await ir(page, 'objetivos');
  await expect(page.locator('.tuv-cab')).toContainText("You're over 2 of your 4 limits");
  await expect(page.locator('.tuv-menu a[data-ap="colchon"]')).toContainText('Cushion and stocks');
  await ir(page, 'tu-limites');
  await expect(page.locator('#tuPanel .tuv-t')).toHaveText('Limits');
  await clic(page.locator('.tlm-fila[data-lim="oro"]').getByRole('button', { name: 'Raise Gold and commodities' }));
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
});
