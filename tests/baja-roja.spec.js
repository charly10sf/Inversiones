// 0.8.2e: las bajadas son rojas de verdad (Carlos, 6 nov: «demasiado naranja»). En los tres diseños, --baja tiene un tono
// de rojo (menos de 8° de matiz; el coral de antes estaba en 13–14°) y se lee (AA, 4,5) sobre el fondo, la tarjeta y la
// losa; no se confunde con el aviso ni con el oro; y la app de Android (Tema.java) usa el mismo color que la web.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { preparar } from './ayuda.js';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lum = (h) => { const [r, g, b] = hex(h).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function matiz(h) {
  const [r, g, b] = hex(h), mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  const m = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round(((m * 60) + 360) % 360);
}
const JAVA = readFileSync(new URL('../android/app/src/main/java/es/inversiones/app/Tema.java', import.meta.url), 'utf8');
const EN_JAVA = { marmol: 'FFFF5F5A', marfil: 'FFA61E1E', borgona: 'FFFF7B78' };

for (const tema of ['marmol', 'marfil', 'borgona']) {
  test(`la bajada es roja en ${tema}`, async ({ context, page }) => {
    await preparar(context, { ajustes: { 'inv-tema': tema } });
    await page.goto('/');
    await page.waitForFunction(() => typeof ponerTema === 'function');
    const c = await page.evaluate((t) => {
      ponerTema(t);
      const r = getComputedStyle(document.documentElement), v = (n) => r.getPropertyValue(n).trim();
      return { baja: v('--baja'), fondo: v('--fondo'), sup: v('--superficie'), sup2: v('--superficie-2'), aviso: v('--aviso'), oro: v('--oro-texto') };
    }, tema);
    expect(matiz(c.baja), `matiz de ${c.baja}`).toBeLessThanOrEqual(8);
    for (const f of [c.fondo, c.sup, c.sup2]) expect(contraste(c.baja, f), `${c.baja} sobre ${f}`).toBeGreaterThanOrEqual(4.5);
    // lejos del aviso (naranja) y del oro en el matiz
    expect(Math.abs(matiz(c.aviso) - matiz(c.baja))).toBeGreaterThanOrEqual(20);
    expect(Math.abs(matiz(c.oro) - matiz(c.baja))).toBeGreaterThanOrEqual(20);
    // la app de Android pinta lo mismo (el widget y los avisos)
    expect(JAVA.toUpperCase()).toContain('0X' + EN_JAVA[tema]);
    expect(c.baja.toLowerCase()).toBe('#' + EN_JAVA[tema].slice(2).toLowerCase());
  });
}
