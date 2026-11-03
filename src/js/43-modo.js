/* =========================== 0.9 · modo básico y avanzado, y el ordenador ===========================
   Maqueta del 3 nov (claude.ai/artifact/3fZsQxKneG6W57umD8vMzB). Dos maneras de ver Hoy:
   - Básico: lo esencial, con un «¿Qué es?» de una línea en cada bloque.
   - Avanzado: encima de Hoy, trece pestañas. «Resumen» es Hoy de siempre; las otras se pintan en el trozo «avanzado»
     (trozos/avanzado.js), que solo se baja la primera vez que abres una.
   Se guarda en este dispositivo (inv-modo). Si no lo has elegido, sale del «Estoy empezando / Llevo años invirtiendo»
   de la presentación (inv-nivel): empezando, básico; si no, avanzado (lo que veía todo el mundo hasta ahora).
   En el ordenador (desde 1.180 px) el menú va a la izquierda (.riel) y la IA se abre al lado, en una columna a la
   derecha, solo al pulsarla (body.ia-lado; lo pone abrirAsesor). */
const LS_MODO = 'inv-modo', LS_PEST_AV = 'inv-pest-av';
function modoApp() {
  const m = LS.get(LS_MODO, null);
  if (m === 'basico' || m === 'avanzado') return m;
  return LS.get('inv-nivel', null) === 'nov' ? 'basico' : 'avanzado';
}
function ponerModo(m) {
  LS.set(LS_MODO, m === 'basico' ? 'basico' : 'avanzado');
  marcarModo();
  if (S.cartera && $('#vista')) pintar();
}
function marcarModo() {
  const m = modoApp();
  document.body.classList.toggle('modo-basico', m === 'basico');
  document.body.classList.toggle('modo-avanzado', m === 'avanzado');
  for (const b of $$('[data-modo]')) b.setAttribute('aria-pressed', String(b.dataset.modo === m));
}
const PEST_AV = [
  ['resumen', 'Resumen', 'Summary'], ['rentab', 'Rentabilidad', 'Returns'], ['pos', 'Posiciones', 'Holdings'],
  ['pnl', 'Día a día', 'Day by day'], ['grafico', 'Gráfico técnico', 'Technical chart'], ['reparto', 'Reparto y X-Ray', 'Allocation and X-Ray'],
  ['riesgo', 'Riesgo', 'Risk'], ['div', 'Dividendos', 'Dividends'], ['costes', 'Costes', 'Costs'], ['hacienda', 'Hacienda', 'Taxes'],
  ['mov', 'Movimientos', 'Transactions'], ['rebal', 'Tu reparto objetivo', 'Your target mix'], ['lab', 'Laboratorio', 'Lab'],
];
function pestAv() {
  const p = S.pestAv || LS.get(LS_PEST_AV, 'resumen');
  return PEST_AV.some(([k]) => k === p) ? p : 'resumen';
}
const enAvanzado = () => modoApp() === 'avanzado' && !S.carEdit;
function htmlPestAv() {
  const p = pestAv();
  return `<nav class="pest-av" role="tablist" aria-label="${L('Pestañas del modo avanzado', 'Advanced mode tabs')}">${PEST_AV.map(([k, t, en]) => `<button type="button" role="tab" data-pest-av="${k}" aria-selected="${p === k}">${L(t, en)}</button>`).join('')}</nav>`;
}
// el sitio de una pestaña que no es el Resumen: lo llena pintarPanelAv (en el trozo) después de pintar
const htmlPanelAv = () => `<div class="panel-av" id="panelAv" data-p="${pestAv()}" role="tabpanel" aria-busy="true"><p class="nota pav-carga">${L('Preparando la pestaña…', 'Getting the tab ready…')}</p></div>`;
function htmlSelectorModo(enRiel) {
  const m = modoApp();
  const bs = `<button type="button" data-modo="basico" aria-pressed="${m === 'basico'}">${L('Básico', 'Basic')}</button><button type="button" data-modo="avanzado" aria-pressed="${m === 'avanzado'}">${L('Avanzado', 'Advanced')}</button>`;
  if (enRiel) return `<div class="riel-pie"><small>${L('Cómo la ves', 'How you see it')}</small><div class="seg-modo" role="group" aria-label="${L('Modo', 'Mode')}">${bs}</div></div>`;
  return `<div class="seccion-ed aj-idioma"><h3>${ICONOS_PL.ver}${L('Cómo la ves', 'How you see it')}</h3>
    <div class="idiomas seg-modo" role="group" aria-label="${L('Modo', 'Mode')}">${bs}</div>
    <small>${L('Básico: lo esencial, explicado. Avanzado: Hoy con trece pestañas de datos (rentabilidad, riesgo, Hacienda, reparto…). Se guarda en este dispositivo.', 'Basic: the essentials, explained. Advanced: Today with thirteen data tabs (returns, risk, taxes, allocation…). Saved on this device.')}</small></div>`;
}
// el menú de la izquierda en el ordenador: las cinco secciones, la IA y el modo
function htmlRiel() {
  return `<aside class="riel" aria-label="${L('Secciones', 'Sections')}">
    <div class="riel-marca"><span class="marca-ts" role="img" aria-label="Toisón"><i><svg viewBox="-82 -78 164 147"><path class="s-o" d="${TS_O_D}"/><path class="s-t" d="${TS_T_D}"/></svg></i><b>TOISÓN</b></span></div>
    <nav class="riel-nav">${['cartera', 'posiciones', 'mercados', 'expertos', 'tu'].map((k) => { const g = GRUPOS.find((x) => x.k === k); return `<a href="#${k}" data-ir="${k}">${k === 'cartera' ? `<span class="riel-med">${ICONOS_TS.cartera()}</span>` : ICONOS_TS[k]()}<span>${L(g.t, g.en)}</span></a>`; }).join('')}</nav>
    <button type="button" class="riel-ia" data-accion="asesor" aria-expanded="false">${ICONOS_PL.asistente}<span>${L('Pregúntale a la IA', 'Ask the AI')}</span></button>
    ${htmlSelectorModo(true)}
  </aside>`;
}
const iaAlLado = () => innerWidth >= 1180;
// los textos y ponerQueEs van en el trozo «avanzado»
const QUE_K = new Set(['patrimonio', 'posiciones', 'reparto', 'agenda', 'ia', 'cifras', 'mapa', 'informe', 'noticias', 'movidas', 'futuro', 'metas', 'renta', 'vistazo']);
// una marca delante de cada bloque; ponerQueEs, ya pintado, pone la línea detrás de la cabecera del bloque
function conQueEs(k, html) {
  if (!QUE_K.has(k) || !html || modoApp() !== 'basico') return html;
  return `<i class="que-es-m" data-que-es="${k}" hidden></i>${html}`;
}
document.addEventListener('click', (e) => {
  const m = e.target.closest('[data-modo]');
  if (m) { ponerModo(m.dataset.modo); return; }
  const t = e.target.closest('[data-pest-av]');
  if (t) {
    S.pestAv = t.dataset.pestAv; LS.set(LS_PEST_AV, S.pestAv);
    pintar();
    const n = $(`[data-pest-av="${S.pestAv}"]`); if (n) { n.scrollIntoView({ block: 'nearest', inline: 'center' }); n.focus({ preventScroll: true }); }
  }
});
// las flechas mueven entre pestañas (como en cualquier lista de pestañas)
document.addEventListener('keydown', (e) => {
  const t = e.target.closest && e.target.closest('[data-pest-av]');
  if (!t || !/^Arrow(Left|Right)$|^Home$|^End$/.test(e.key)) return;
  e.preventDefault();
  const ks = PEST_AV.map(([k]) => k), i = ks.indexOf(t.dataset.pestAv);
  const j = e.key === 'Home' ? 0 : e.key === 'End' ? ks.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + ks.length) % ks.length;
  const b = $(`[data-pest-av="${ks[j]}"]`); if (b) b.click();
});
