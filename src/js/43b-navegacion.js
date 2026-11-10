/* =========================== 0.8.3a · la navegación nueva: A en el móvil y K2 en el ordenador ===========================
   Decidido con Carlos el 7 nov (Doc del básico y el avanzado, «Propuesta A · Cinco y Más», y Doc del menú del
   ordenador, «K2»). Todo sale de una lista de páginas (PAGINAS), que usan a la vez:
   - el móvil: abajo Análisis · Mercados · Hoy · Ideas · Más. «Más» (el sitio de Tú) abre una hoja con el buscador,
     Lo tuyo, tus fijados y todas las funciones por grupos. Análisis, con 7 pestañas en avanzado y 6 en básico; lo que
     era pestaña suelta pasa a apartado de su pestaña (Movimientos y Día a día en Posiciones, Tu reparto objetivo en
     Reparto, Dividendos y Costes en Ingresos y costes); Gráfico técnico y Laboratorio, a Más › Herramientas;
   - el ordenador (desde 1.180 px): una barra de iconos de 64 px con las 10 secciones, que no se mueve, y otra de 252 px
     con las páginas de la sección arriba y la IA abajo. Arriba, el buscador (Ctrl K), la estrella de fijados,
     Escritorios (Toisón Dorado), los avisos y tu cuenta. Al agrandar la IA, su barra pasa a 440 px y las páginas suben a
     pestañas encima de la página (body.ia-grande).
   Las direcciones de siempre siguen valiendo; las pestañas del trozo «avanzado» tienen ya la suya (#av-rentab…). */
const SECCIONES = [
  { k: 'hoy', t: 'Hoy', en: 'Today', ir: 'cartera' },
  { k: 'cartera', t: 'Cartera', en: 'Portfolio', ir: 'posiciones' },
  { k: 'rendimiento', t: 'Rendimiento', en: 'Performance' },
  { k: 'riesgo', t: 'Riesgo', en: 'Risk' },
  { k: 'reparto', t: 'Reparto', en: 'Allocation' },
  { k: 'hacienda', t: 'Hacienda', en: 'Taxes' },
  { k: 'mercados', t: 'Mercados', en: 'Markets', ir: 'mercados' },
  { k: 'ideas', t: 'Ideas', en: 'Ideas', ir: 'expertos' },
  { k: 'tuplan', t: 'Tu plan', en: 'Your plan', ir: 'tu' },
  { k: 'herramientas', t: 'Herramientas', en: 'Tools' },
];
const ICO_SEC = {
  hoy: () => ICONOS_TS.cartera(), cartera: () => ICONOS_PL.cartera, rendimiento: () => ICONOS_PL.futuro, hacienda: () => ICONOS_PL.fiscalidad,
  mercados: () => ICONOS_PL.mercados, ideas: () => ICONOS_PL.expertos, tuplan: () => ICONOS_PL.tu,
  // 0.8.3a: los tres que faltaban, de plumilla como los demás (2,2 × 1,1, puntas rectas; los dibuja scripts/plumilla_k2.py)
  riesgo: () => PL('M4.3 5.7l7-2.6 .8-.1 7.9 2.8 .1 .3-.1 6.9-.8 2.5-1.5 2.1-2.5 2.1-1.5 .8-1.5 .5-.8 0-1.7-.8-2.7-1.8-1.1-1.2-.8-1.3-1-2.4-.2-1.6 0-5.8zM17.9 6.4l-5.9-2.2-5.9 2.2 0 5.5 .2 1.5 .5 1.4 .6 1.2 1.2 1.5 1.5 1.2 1.6 1 .3 .1 .7-.3 2-1.4 1.3-1.3 1-1.6 .5-1.3 .3-1.5zM10.2 14.6l-2.3-2.3 2-.4 1.2 1.2 3.3-3.4 2 .4-4.4 4.5-.9 .2z'),
  reparto: () => PL('M13.9 10.5l-.9-.2-.1-.3 0-6.4 .1-.3 1.2-.2 2.2 .3 1.6 .7 1.5 1.1 1.2 1.6 .7 2.1 .1 1.3-.4 .2zM15.1 4.3l0 5.1 4.2 0-.5-1.7-.9-1.6-1.2-1.1zM12.1 4.6l0 7.8 7.7 .1 .7 .4-.1 1.2-.6 2.2-.8 1.5-1.1 1.4-1.3 1.1-1.6 .9-1.9 .5-2 .2-1.5 0-1.9-.5-1.7-.7-1.5-1.1-1.2-1.3-.9-1.4-.6-1.6-.3-1.7 .1-1.7 .6-2.2 .8-1.5 1.1-1.4 1.3-1.1 2.2-1.1 2-.5 1.7 0 .6 .2zM9.9 13l0-7.7-1.4 .4-1.3 .6-1.8 1.8-.9 1.3-.5 1.5-.3 2.6 .6 2.6 .8 1.4 .9 1.2 2.1 1.4 1.2 .5 1.3 .2 1.6-.1 1.3-.4 1.3-.6 1.2-1 .9-1.2 .8-1.4 .6-2.5-7.4-.1-.8-.2z'),
  herramientas: () => PL('M18.6 8.5l-.1-.7 2.2-.1 .1 1.5-.3 1.1-.7 1.3-.9 .9-1.5 .8-1.6 .3-1.9-.1-1.6-.6-6.7 6.7-2-.4 7.4-7.4-1-1.7-.2-1.9 .3-1.1 .5-1 1.3-1.4 1.2-.6 1-.2 2.5 0-.7 1-1.2 0-1.2 .7-.8 .9-.5 .8-.2 1.3 .2 1.3 .6 1.2 1.1 1 .9 .4 .7 0 1.6-.6 1.1-1.5z'),
};
// Hoy en la barra de iconos del ordenador: una casa, porque el símbolo ya va arriba con el nombre (Carlos, 8 nov: «dos logos seguidos»)
const ICO_K2_HOY = () => PL('M19.5 11.7l-.3-.2 0 8.4-.2 .3-.9 .2-12.2 0-.7-.1-.4-.2 0-8.6-.3 .2-1.8-.6 8.5-7.2 .9-.1 .8 .2 8.4 7.1zM17 9.6l-5-4.2-5 4.2 0 9.7 2 0 0-4.9 .2-.3 .8-.2 3.9-.1 .7 .2 .4 .3 0 5 2 0zM11.2 15l0 4.3 1.6 0 0-4.3z');
const ICO_BUSCA = SVG('<circle cx="10.8" cy="10.8" r="6.3"/><path d="M15.6 15.6l4.6 4.6"/>', 1.9);
/* las páginas: id, nombre, sección del ordenador (s), grupo de la rejilla de Más (g), adónde lleva (v, y p si es una
   pestaña del trozo «avanzado»; h si tiene dirección propia), av si solo sale en el avanzado y kw para el buscador */
const PAGINAS = [
  { id: 'hoy', t: 'Hoy', en: 'Today', s: 'hoy', v: 'cartera', kw: 'inicio patrimonio grafica' },
  { id: 'agenda', t: 'Calendario', en: 'Calendar', s: 'hoy', g: 'cartera', v: 'agenda', kw: 'fechas resultados dividendos aportaciones' },
  { id: 'posiciones', t: 'Posiciones', en: 'Holdings', s: 'cartera', g: 'cartera', v: 'posiciones', kw: 'cartera fondos acciones' },
  // 0.8.6: la pestaña 11, solo en básico (soloBas)
  { id: 'entiende', t: 'Entiende tu cartera', en: 'Understand your portfolio', s: 'cartera', g: 'cartera', v: 'av', p: 'entiende', soloBas: true, kw: 'aprender lecciones formacion ter twr tir hacienda riesgo' },
  { id: 'mov', t: 'Movimientos', en: 'Transactions', s: 'cartera', g: 'cartera', v: 'av', p: 'mov', kw: 'compras ventas operaciones' },
  { id: 'pnl', t: 'Día a día', en: 'Day by day', s: 'cartera', g: 'cartera', v: 'av', p: 'pnl', av: true, kw: 'ganancias diarias' },
  { id: 'rentab', t: 'Rentabilidad', en: 'Returns', apT: 'Resumen', apEn: 'Summary', s: 'rendimiento', g: 'rr', v: 'av', p: 'rentab', kw: 'twr mwr indexado msci divisa' },
  // 0.8.6: la pestaña 2; en el móvil, un apartado de Rentabilidad
  { id: 'frente', t: 'Frente a un indexado', en: 'Against an index fund', s: 'rendimiento', g: 'rr', v: 'av', p: 'frente', kw: 'indexado msci world comparar referencia alfa beta tracking mismo dinero' },
  { id: 'div', t: 'Dividendos', en: 'Dividends', s: 'rendimiento', g: 'rr', v: 'av', p: 'div', bas: 'rentab', kw: 'cobros ingresos' },
  { id: 'costes', t: 'Costes', en: 'Costs', s: 'rendimiento', g: 'rr', v: 'av', p: 'costes', bas: 'rentab', kw: 'ter comisiones gastos' },
  { id: 'analisis', t: 'La IA explica', en: 'AI explains', s: 'rendimiento', g: 'rr', v: 'analisis', kw: 'informe ia' },
  { id: 'riesgo', t: 'Riesgo', en: 'Risk', s: 'riesgo', g: 'rr', v: 'av', p: 'riesgo', kw: 'volatilidad var estres caida factores' },
  { id: 'reparto', t: 'Reparto y X-Ray', en: 'Allocation and X-Ray', s: 'reparto', g: 'rr', v: 'av', p: 'reparto', kw: 'paises sectores temas xray' },
  { id: 'rebal', t: 'Tu reparto objetivo', en: 'Your target mix', s: 'reparto', g: 'rr', v: 'av', p: 'rebal', kw: 'rebalancear objetivo' },
  { id: 'fiscal', t: 'Hacienda', en: 'Taxes', s: 'hacienda', g: 'hacienda', v: 'fiscal', h: 'impuestos', kw: 'impuestos irpf plusvalias' },
  { id: 'renta', t: 'Guía de la renta', en: 'Tax return guide', s: 'hacienda', g: 'hacienda', v: 'fiscal', h: 'renta', kw: 'declaracion renta' },
  { id: 'mercados', t: 'Mercados', en: 'Markets', s: 'mercados', g: 'mi', v: 'mercados', kw: 'bolsas tipos divisas materias primas buscar' },
  { id: 'ideas', t: 'Ideas', en: 'Ideas', s: 'ideas', g: 'mi', v: 'expertos', h: 'ideas', kw: 'radar analistas expertos seguimiento' },
  { id: 'tu', t: 'Tu cuenta', en: 'Your account', s: 'tuplan', g: 'tuyo', v: 'tu', kw: 'diseno tema perfil' },
  { id: 'objetivos', t: 'Objetivos', en: 'Goals', s: 'tuplan', g: 'tuyo', v: 'futuro', h: 'objetivos', kw: 'limites metas perfil colchon' },
  { id: 'ruta', get t() { return RUTA_NOM.t; }, get en() { return RUTA_NOM.en; }, s: 'tuplan', g: 'tuyo', v: 'ruta', kw: 'paso a paso plan aportar' },
  { id: 'grafico', t: 'Gráfico técnico', en: 'Technical chart', s: 'herramientas', g: 'herr', v: 'av', p: 'grafico', av: true, kw: 'velas medias' },
  { id: 'lab', t: 'Laboratorio', en: 'Lab', s: 'herramientas', g: 'herr', v: 'av', p: 'lab', av: true, kw: 'simular probar' },
];
const PAG = Object.fromEntries(PAGINAS.map((p) => [p.id, p]));
// lo de «La app» en Más y en el buscador: no son páginas, abren una hoja
const ACCIONES_APP = [
  { id: 'ajustes', t: 'Ajustes', en: 'Settings', a: 'ajustes', ico: () => ICONOS_PL.ajustes, kw: 'idioma cuenta contrasena' },
  { id: 'novedades', t: 'Novedades', en: "What's new", a: 'novedades', ico: () => ICONOS_PL.novedades, kw: 'version' },
  { id: 'tour', t: 'Ver el tutorial', en: 'See the tutorial', a: 'tour', ico: () => ICONOS.ruta, kw: 'ayuda guia' },
  { id: 'opinion', t: 'Avisar de un fallo', en: 'Report a bug', a: 'opinion', ico: () => ICONOS.bicho, kw: 'idea fallo error' },
];
const GRUPOS_MAS = [['cartera', 'Tu cartera', 'Your portfolio'], ['rr', 'Riesgo y rentabilidad', 'Risk and returns'], ['hacienda', 'Hacienda', 'Taxes'], ['mi', 'Mercados e ideas', 'Markets and ideas'], ['herr', 'Herramientas', 'Tools']];
const verPag = (p) => p && (!p.av || modoApp() === 'avanzado') && (!p.soloBas || modoApp() === 'basico');
// 0.8.3a: en básico, Dividendos y Costes son dos tarjetas de Rentabilidad (bas): llevan allí y no salen sueltas en las listas
const enBas = (p) => p && p.bas && modoApp() === 'basico';
const enLista = (p) => verPag(p) && !enBas(p);
const nomPag = (p) => L(p.t, p.en);
const hrefPag = (p) => { if (enBas(p)) p = PAG[p.bas]; return '#' + (p.h || (p.v === 'av' ? 'av-' + p.p : p.v)); };
// la página en la que estás (para marcarla en las barras y en el buscador)
function paginaActual() {
  const v = S.vista;
  if (v === 'av') { const p = pestAv(); return (PAGINAS.find((x) => x.p === p) || PAG.rentab).id; }
  if (v === 'fiscal') return S.fisTab === 'renta' ? 'renta' : 'fiscal';
  return { cartera: 'hoy', futuro: 'objetivos', expertos: 'ideas' }[v] || (PAG[v] ? v : 'hoy');
}
const seccionActual = () => (PAG[paginaActual()] || PAG.hoy).s;
const paginasDe = (s) => PAGINAS.filter((p) => p.s === s && enLista(p));
const hrefSeccion = (s) => { const ps = paginasDe(s); return ps.length ? hrefPag(ps[0]) : hrefPag(PAGINAS.find((p) => p.s === s)); };
// Herramientas no tiene sección en la barra del móvil: se marca Más (que es donde está)
const enHerramientas = () => S.vista === 'av' && ['grafico', 'lab'].includes(pestAv());

/* ---------- el móvil: Análisis por dentro ---------- */
const PEST_ANA = [
  { k: 'posiciones', t: 'Posiciones', en: 'Holdings', ap: ['posiciones', 'mov', 'pnl'] },
  { k: 'entiende', t: 'Entiende tu cartera', en: 'Understand your portfolio', ap: ['entiende'], soloBas: true },
  { k: 'rentab', t: 'Rentabilidad', en: 'Returns', ap: ['rentab', 'frente'] },
  { k: 'riesgo', t: 'Riesgo', en: 'Risk', ap: ['riesgo'] },
  { k: 'reparto', t: 'Reparto', en: 'Allocation', ap: ['reparto', 'rebal'] },
  { k: 'ingresos', t: 'Ingresos y costes', en: 'Income and costs', ap: ['div', 'costes'], av: true },
  { k: 'fiscal', t: 'Hacienda', en: 'Taxes', ap: ['fiscal', 'renta'], sinAp: true },
  { k: 'analisis', t: 'La IA explica', en: 'AI explains', ap: ['analisis'] },
];
const pestAnaVisibles = () => PEST_ANA.filter((x) => (!x.av || modoApp() === 'avanzado') && (!x.soloBas || modoApp() === 'basico'));
// el enlace de una página: las del trozo llevan además data-pest-av (lo de siempre: se cambia sin dejar el trozo)
const aPag = (p, act, cls = '') => `<a href="${hrefPag(p)}"${p.v === 'av' ? ` data-pest-av="${p.p}"` : ''}${cls ? ` class="${cls}"` : ''} aria-current="${act ? 'page' : 'false'}">${esc(nomPag(p))}</a>`;
function htmlPestAna() {
  const pa = paginaActual();
  return `<div class="pest-tira"><nav class="pest-av" aria-label="${L('Qué ver', 'What to see')}">${pestAnaVisibles().map((x) => {
    const p = PAG[x.ap.find((id) => verPag(PAG[id]))];
    return `<a href="${hrefPag(p)}"${p.v === 'av' ? ` data-pest-av="${p.p}"` : ''} data-pest="${x.k}" aria-current="${x.ap.includes(pa) ? 'page' : 'false'}">${L(x.t, x.en)}</a>`;
  }).join('')}</nav></div>${htmlApartados()}`;
}
// los apartados de la pestaña abierta (Posiciones · Movimientos · Día a día…), si tiene más de uno
function htmlApartados(lista) {
  const pa = paginaActual();
  if (!lista) { const x = PEST_ANA.find((y) => y.ap.includes(pa)); if (!x || x.sinAp) return ''; lista = x.ap; }
  const ps = lista.map((id) => PAG[id]).filter(verPag);
  if (ps.length < 2) return '';
  // 0.8.6: un apartado puede tener otro nombre que su página (Rentabilidad › Resumen · Frente a un indexado)
  return `<nav class="apartados" aria-label="${L('Apartados', 'Sections')}">${ps.map((p) => aPag(p.apT ? { ...p, t: p.apT, en: p.apEn || p.apT } : p, p.id === pa)).join('')}</nav>`;
}
// la vuelta a la hoja de Más desde lo que se abre en ella (Tú, Herramientas)
const htmlVolverMas = () => `<button type="button" class="volver-mas" data-mas>${L('‹ Más', '‹ More')}</button>`;
// el título de la cabecera: en el ordenador, el de la sección abierta
const titSeccion = (movil, en) => { const s = SECCIONES.find((x) => x.k === seccionActual()); return `<span class="t-movil">${L(movil, en)}</span><span class="t-pc">${L(s.t, s.en)}</span>`; };
function htmlHerramientas() {
  return `<div class="ts-grupo">${htmlVolverMas()}<h1 class="ts-tit">${L('Herramientas', 'Tools')}</h1>${htmlApartados(['grafico', 'lab'])}</div>`;
}

/* ---------- los fijados (hasta 8) y lo reciente ---------- */
const MAX_FIJ = 8;
const fijados = () => (LS.get('inv-fijados', []) || []).filter((id) => PAG[id] || ACCIONES_APP.some((a) => a.id === id));
function fijar(id) {
  const f = fijados(), i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1);
  else { if (f.length >= MAX_FIJ) { toast(L(`Caben ${MAX_FIJ} fijados: quita uno para poner otro.`, `There's room for ${MAX_FIJ} pinned: unpin one first.`)); return false; } f.push(id); }
  LS.set('inv-fijados', f); vibrar();
  for (const b of $$(`[data-fijar="${id}"]`)) { b.setAttribute('aria-pressed', String(i < 0)); b.title = i < 0 ? L('Quitar de fijados', 'Unpin') : L('Fijar', 'Pin'); }
  for (const c of $$('.mas-fij')) c.outerHTML = htmlMasFijados();
  if (S.vista === 'cartera' && S.cartera) pintar();
  return true;
}
function apuntarReciente(id) {
  if (!id || id === 'hoy') return;
  const r = (LS.get('inv-recientes', []) || []).filter((x) => x !== id && PAG[x]);
  r.unshift(id); LS.set('inv-recientes', r.slice(0, 6));
}
const itemFijado = (id) => PAG[id] || ACCIONES_APP.find((a) => a.id === id);
// cada página con su icono si lo tiene; si no, el de su sección
const ICO_PAG = { agenda: () => ICONOS_PL.calendario, tu: () => ICONOS_PL.tu, objetivos: () => ICONOS_PL.objetivos, ruta: () => ICONOS_PL.paso, mov: () => ICONOS_PL.ordenar,
  div: () => ICONOS.dividendo, costes: () => ICONOS.calc, analisis: () => ICONOS_PL.asistente, renta: () => ICONOS.resultados, grafico: () => ICONOS_PL.analisis };
const icoItem = (x) => (x.a ? x.ico() : (ICO_PAG[x.id] || ICO_SEC[x.s])());
// un enlace corto (el chip de los fijados en Hoy y en Más)
const chipItem = (x) => (x.a ? `<button type="button" class="chip-fij" data-accion="${x.a}" data-cerrar>${icoItem(x)}<span>${esc(L(x.t, x.en))}</span></button>`
  : verPag(x) ? `<a class="chip-fij" href="${hrefPag(x)}" data-cerrar>${icoItem(x)}<span>${esc(nomPag(x))}</span></a>` : '');
function htmlFijadosHoy() {
  const f = fijados().map(itemFijado).filter(Boolean).map(chipItem).join('');
  return f ? `<nav class="fijados-hoy" aria-label="${L('Tus fijados', 'Your pinned')}">${f}</nav>` : '';
}
function htmlMasFijados() {
  const f = fijados().map(itemFijado).filter(Boolean).map(chipItem).join('');
  return `<div class="mas-fij">${f || `<p class="nota">${L('Toca la estrella de cualquier función para tenerla aquí y en Hoy (hasta 8).', 'Tap the star on any feature to keep it here and in Today (up to 8).')}</p>`}</div>`;
}

/* ---------- el buscador de páginas y funciones (en Más y con Ctrl K) ---------- */
const estrella = (id) => { const on = fijados().includes(id); return `<button type="button" class="fij-b" data-fijar="${id}" aria-pressed="${on}" title="${on ? L('Quitar de fijados', 'Unpin') : L('Fijar', 'Pin')}" aria-label="${L('Fijar', 'Pin')}">${ICONOS.estrella}</button>`; };
function buscarFunciones(q) {
  const n = normTxt(q); if (!n) return [];
  const todo = [...PAGINAS, ...ACCIONES_APP];
  return todo.map((x) => {
    const t = normTxt(L(x.t, x.en)), kw = normTxt(x.kw || ''), sec = x.s ? normTxt(L(SECCIONES.find((s) => s.k === x.s).t, '')) : '';
    const r = t.startsWith(n) ? 3 : t.includes(n) ? 2 : kw.split(' ').some((w) => w.startsWith(n)) || sec.startsWith(n) ? 1 : 0;
    return { x, r };
  }).filter((o) => o.r).sort((a, b) => b.r - a.r).slice(0, 10).map((o) => o.x);
}
function htmlResultados(q) {
  const rs = buscarFunciones(q);
  if (!rs.length) return `<p class="nota">${L('No hay ninguna página con ese nombre. Para buscar un fondo o una acción, ve a Mercados.', 'No page by that name. To look up a fund or a share, go to Markets.')}</p>`;
  return `<ul class="busca-res">${rs.map((x) => {
    const donde = x.a ? L('La app', 'The app') : L(SECCIONES.find((s) => s.k === x.s).t, SECCIONES.find((s) => s.k === x.s).en);
    if (!x.a && !verPag(x)) return `<li><button type="button" class="busca-it" data-ver-av="${x.id}">${icoItem(x)}<span><b>${esc(nomPag(x))}</b><small>${L('Está en el avanzado: verlo', "It's in advanced: see it")}</small></span></button></li>`;
    const dentro = `${icoItem(x)}<span><b>${esc(L(x.t, x.en))}</b><small>${esc(donde)}</small></span>`;
    return `<li>${x.a ? `<button type="button" class="busca-it" data-accion="${x.a}" data-cerrar>${dentro}</button>` : `<a class="busca-it" href="${hrefPag(x)}" data-cerrar>${dentro}</a>`}${estrella(x.id)}</li>`;
  }).join('')}</ul>`;
}
// la caja del buscador: escribe y salen las páginas; Intro abre la primera
function activarBusca(raiz) {
  const i = $('.busca-fun', raiz), res = $('.busca-sal', raiz), resto = $('.mas-cuerpo', raiz); if (!i) return;
  i.addEventListener('input', () => { const q = i.value.trim(); res.hidden = !q; if (resto) resto.hidden = !!q; res.innerHTML = q ? htmlResultados(q) : ''; });
  i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const a = $('.busca-it', res); if (a) a.click(); } });
}
const htmlCajaBusca = () => `<label class="busca-caja">${ICO_BUSCA}<input type="search" class="busca-fun" placeholder="${L('Buscar páginas y funciones', 'Search pages and features')}" aria-label="${L('Buscar páginas y funciones', 'Search pages and features')}" autocomplete="off" enterkeyhint="go"></label><div class="busca-sal" aria-live="polite" hidden></div>`;
function abrirBuscaFunciones() {
  if ($('.hoja-busca')) return;
  const h = hoja(L('Buscar en Toisón', 'Search Toisón'), `<div class="hoja-busca">${htmlCajaBusca()}</div>`);
  activarBusca(h.el);
  setTimeout(() => { const i = $('.busca-fun', h.el); if (i) i.focus(); }, 40);
}
// en básico, lo del avanzado sale en el buscador con «verlo»: pasa al avanzado y lo abre
function verEnAvanzado(id) {
  const p = PAG[id]; if (!p) return;
  // la hoja se cierra y, en el mismo momento, se cambia de dirección (así su «Atrás» no deshace el paso)
  LS.set(LS_MODO, 'avanzado'); marcarModo();
  for (const h of $$('.hoja-fondo [data-cerrar]')) { h.click(); break; }
  if (location.hash !== hrefPag(p)) location.hash = hrefPag(p); else pintar();
  toast(L('Ahora ves el modo avanzado. Se cambia en Más o en Tú.', "You're now in advanced mode. Change it in More or in You."));
}

/* ---------- Más (el móvil) ---------- */
const segModo = () => { const m = modoApp(); return `<div class="seg-modo" role="group" aria-label="${L('Modo', 'Mode')}"><button type="button" data-modo="basico" aria-pressed="${m === 'basico'}">${L('Básico', 'Basic')}</button><button type="button" data-modo="avanzado" aria-pressed="${m === 'avanzado'}">${L('Avanzado', 'Advanced')}</button></div>`; };
function abrirMas() {
  if ($('.hoja-mas')) return;
  const tuyo = PAGINAS.filter((p) => p.g === 'tuyo');
  const casilla = (p) => `<li><a href="${hrefPag(p)}" data-cerrar aria-current="${paginaActual() === p.id ? 'page' : 'false'}">${icoItem(p)}<span>${esc(nomPag(p))}</span></a>${estrella(p.id)}</li>`;
  const app = `<li><span class="mas-modo">${ICONOS_PL.ver}<span>${L('Cómo la ves', 'How you see it')}</span></span>${segModo()}</li>` + ACCIONES_APP.map((a) => `<li><button type="button" data-accion="${a.a}" data-cerrar>${a.ico()}<span>${esc(L(a.t, a.en))}</span></button>${estrella(a.id)}</li>`).join('');
  const h = hoja(L('Más', 'More'), `<div class="hoja-mas">${htmlCajaBusca()}
    <div class="mas-cuerpo">
      <h3 class="mas-g">${L('Lo tuyo', 'Yours')}</h3><ul class="mas-rejilla mas-tuyo">${tuyo.map(casilla).join('')}</ul>
      <h3 class="mas-g">${L('Tus fijados', 'Your pinned')}</h3>${htmlMasFijados()}
      ${GRUPOS_MAS.map(([g, t, en]) => { const ps = PAGINAS.filter((p) => p.g === g && enLista(p)); return ps.length ? `<h3 class="mas-g">${L(t, en)}</h3><ul class="mas-rejilla">${ps.map(casilla).join('')}</ul>` : ''; }).join('')}
      <h3 class="mas-g">${L('La app', 'The app')}</h3><ul class="mas-rejilla mas-app">${app}</ul>
    </div></div>`);
  h.el.classList.add('hoja-mas-f');
  activarBusca(h.el);
}

/* ---------- el ordenador: la K2 ---------- */
function htmlRiel() {
  return `<aside class="riel k2" aria-label="${L('Menú', 'Menu')}">
    <nav class="riel-nav k2-iconos" aria-label="${L('Secciones', 'Sections')}">
      <span class="k2-marca marca-ts" role="img" aria-label="Toisón"><i><svg viewBox="-82 -78 164 147"><path class="s-o" d="${TS_O_D}"/><path class="s-t" d="${TS_T_D}"/></svg></i>${selloDorado()}</span>
      ${SECCIONES.map((s) => `<a href="${hrefSeccion(s.k)}" data-sec="${s.k}"${s.ir ? ` data-ir="${s.ir}"` : ''} title="${L(s.t, s.en)}">${s.k === 'hoy' ? ICO_K2_HOY() : ICO_SEC[s.k]()}<span class="sr">${L(s.t, s.en)}</span></a>`).join('')}
      <button type="button" class="riel-aj" data-accion="ajustes" title="${L('Ajustes', 'Settings')}" aria-label="${L('Ajustes', 'Settings')}">${ICONOS_PL.ajustes}</button>
    </nav>
    <div class="k2-col">
      <div class="k2-marca-tx" aria-hidden="true"><b>TOISÓN</b>${marcaDorado()}</div>
      <div class="k2-pags" id="k2Pags"></div>
      ${htmlSelectorModo(true)}
      <div class="k2-ia" id="k2Ia">
        <div class="k2-ia-cab">${AVATAR_IA}<b>${L('La IA', 'The AI')}</b></div>
        <button type="button" class="riel-ia" data-accion="asesor" aria-expanded="false">${ICONOS_PL.asistente}<span>${L('Pregúntale lo que quieras', 'Ask anything')}</span></button>
        <small>${L('Explica y hace las cuentas con tus números.', 'Explains and does the maths with your numbers.')}</small>
      </div>
    </div>
  </aside>
  <div class="k2-top" role="toolbar" aria-label="${L('Herramientas de la app', 'App tools')}">
    <button type="button" class="k2-busca" data-accion="buscar-funciones">${ICO_BUSCA}<span>${L('Buscar páginas y funciones', 'Search pages and features')}</span><kbd>Ctrl K</kbd></button>
    <div class="k2-der">
      <button type="button" class="ib k2-fij" data-accion="fijados" title="${L('Fijados y recientes', 'Pinned and recent')}" aria-label="${L('Fijados y recientes', 'Pinned and recent')}">${ICONOS.estrella}</button>
      <button type="button" class="k2-escr" data-accion="escritorios">${L('Escritorios', 'Desktops')}<i class="et-dorado">${selloDorado('sd-peq')}${L('Dorado', 'Gold')}</i></button>
      <button type="button" class="ib" data-accion="avisos" title="${L('Avisos', 'Alerts')}" aria-label="${L('Avisos', 'Alerts')}">${ICONOS_PL.campana}</button>
      <a class="k2-cuenta" href="#tu" title="${L('Tu cuenta', 'Your account')}" aria-label="${L('Tu cuenta', 'Your account')}">${ICONOS_PL.tu}</a>
    </div>
  </div>`;
}
// la segunda barra: las páginas de la sección abierta, y la sección marcada en la de iconos
function pintarK2() {
  const r = $('.k2'); if (!r) return;
  const pa = paginaActual(), sec = seccionActual(), s = SECCIONES.find((x) => x.k === sec);
  for (const a of $$('[data-sec]', r)) { a.setAttribute('aria-current', a.dataset.sec === sec ? 'page' : 'false'); a.setAttribute('href', hrefSeccion(a.dataset.sec)); }
  const ps = paginasDe(sec);
  $('#k2Pags').innerHTML = `<h2 class="k2-tit">${L(s.t, s.en)}</h2>${ps.length ? `<nav class="k2-lista" aria-label="${L(`Páginas de ${s.t}`, `${s.en} pages`)}">${ps.map((p) => aPag(p, p.id === pa)).join('')}</nav>`
    : `<p class="nota">${L('Está en el modo avanzado.', "It's in advanced mode.")}</p><button type="button" class="btn peq" data-modo="avanzado">${L('Pasar al avanzado', 'Switch to advanced')}</button>`}`;
  colocarIAK2(); ubicarGta(); ponerTiradorK2();
}
// la cuenta atrás de GTA VI va arriba con lo demás: en el ordenador, en la barra de la K2 (la cabecera de siempre se esconde)
function ubicarGta() {
  const g = $('#gtaTop'), k = $('.k2-der'), fila = $('.top .fila-top'); if (!g || !k || !fila) return;
  if (iaAlLado()) { if (g.parentElement !== k) k.prepend(g); } else if (g.parentElement === k) fila.insertBefore(g, $('#estadoW'));
}
// las pestañas de la sección encima de la página (solo se ven con la IA agrandada)
function htmlK2Pest() {
  const pa = paginaActual(), ps = paginasDe(seccionActual());
  return ps.length > 1 ? `<nav class="k2-pest" aria-label="${L('Páginas', 'Pages')}">${ps.map((p) => aPag(p, p.id === pa)).join('')}</nav>` : '';
}
// la IA abierta en el ordenador ocupa el hueco de abajo de la segunda barra (o la barra entera si está agrandada)
function colocarIAK2() {
  const d = $('#k2Ia'); if (!d || !iaAlLado()) return;
  document.body.style.setProperty('--k2-ia-top', Math.round(d.getBoundingClientRect().top) + 'px');
}
addEventListener('resize', (e) => requestAnimationFrame(() => { colocarIAK2(); ubicarGta(); if (!e.k2) aplicarAnchoK2(); }));
function agrandarIA(si) {
  const on = si == null ? !document.body.classList.contains('ia-grande') : si;
  document.body.classList.toggle('ia-grande', on);
  for (const b of $$('[data-as="agrandar"]')) { b.setAttribute('aria-pressed', String(on)); b.title = on ? L('Reducir la IA', 'Shrink the AI') : L('Agrandar la IA', 'Enlarge the AI'); }
  LS.set('inv-ia-grande', on);
  marcarTiradorK2();
  requestAnimationFrame(colocarIAK2);
}

/* 0.8.3c · la segunda barra de la K2 (y la IA, que va en ella) se ensancha arrastrando su borde derecho (lo pidió Carlos el
   8 nov). Un ancho para la barra normal y otro para la IA agrandada, guardados en este dispositivo (inv-k2-ancho); doble
   clic en el borde vuelve al de siempre. Con el teclado: el borde se enfoca con Tab y las flechas lo mueven de 16 en 16.
   La página siempre se queda con al menos 640 px */
const K2_ANCHO = { n: [252, 220, 560], g: [440, 340, 800] };   // [el de siempre, el mínimo, el máximo]
const LS_K2_ANCHO = 'inv-k2-ancho';
const k2Modo = () => (document.body.classList.contains('ia-grande') ? 'g' : 'n');
function k2Limites(k) { const [d, min, max] = K2_ANCHO[k]; return [d, min, Math.max(min, Math.min(max, innerWidth - 64 - 640))]; }
function k2AnchoGuardado() { const g = LS.get(LS_K2_ANCHO, {}); return g && typeof g === 'object' ? g : {}; }
function ponerAnchoK2(k, w) {
  const [d, min, max] = k2Limites(k), v = Math.round(Math.max(min, Math.min(max, w || d)));
  if (v === d && !w) document.body.style.removeProperty(`--k2-col-${k}`); else document.body.style.setProperty(`--k2-col-${k}`, v + 'px');
  return v;
}
function aplicarAnchoK2() { const g = k2AnchoGuardado(); ponerAnchoK2('n', +g.n || 0); ponerAnchoK2('g', +g.g || 0); marcarTiradorK2(); }
function anchoK2Ahora() { const k = k2Modo(), v = parseFloat(document.body.style.getPropertyValue(`--k2-col-${k}`)); return v || K2_ANCHO[k][0]; }
function marcarTiradorK2() {
  const t = $('#k2Tirador'); if (!t) return;
  const [, min, max] = k2Limites(k2Modo());
  t.setAttribute('aria-valuemin', min); t.setAttribute('aria-valuemax', max); t.setAttribute('aria-valuenow', Math.round(anchoK2Ahora()));
}
function guardarAnchoK2(k, w) {
  const g = k2AnchoGuardado();
  if (w == null) delete g[k]; else g[k] = Math.round(w);
  LS.set(LS_K2_ANCHO, g);
  // los gráficos de la página se vuelven a dibujar con su ancho nuevo (escuchan «resize»); e.k2 para no recolocar otra vez
  const ev = new Event('resize'); ev.k2 = true; dispatchEvent(ev);
}
// fuera de #app (que hace su propia capa), para quedar encima de la IA abierta
function ponerTiradorK2() {
  if (!$('#k2Tirador')) document.body.insertAdjacentHTML('beforeend', `<div class="k2-tirador" id="k2Tirador" role="separator" aria-orientation="vertical" tabindex="0" aria-label="${L('Cambiar el ancho de la barra', 'Resize the sidebar')}" title="${L('Arrastra para cambiar el ancho; doble clic, el de siempre', 'Drag to resize; double-click to reset')}"></div>`);
  aplicarAnchoK2();
}
document.addEventListener('pointerdown', (e) => {
  const t = e.target.closest && e.target.closest('#k2Tirador');
  if (!t || e.button !== 0) return;
  e.preventDefault();
  const k = k2Modo(), [, min, max] = k2Limites(k);
  const w0 = anchoK2Ahora(); let w = w0;
  document.body.classList.add('k2-arrastra');
  try { t.setPointerCapture(e.pointerId); } catch (x) { /* sin captura, sigue igual */ }
  const mover = (ev) => { w = ponerAnchoK2(k, Math.max(min, Math.min(max, ev.clientX - 64))); marcarTiradorK2(); colocarIAK2(); };
  const soltar = () => {
    t.removeEventListener('pointermove', mover); t.removeEventListener('pointerup', soltar); t.removeEventListener('pointercancel', soltar);
    document.body.classList.remove('k2-arrastra');
    // el clic que sale al soltar no cuenta (si se soltaba encima de la IA, tocaba una de sus sugerencias)
    if (w !== w0) { const parar = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; addEventListener('click', parar, { capture: true, once: true }); setTimeout(() => removeEventListener('click', parar, true), 0); }
    if (w !== w0) guardarAnchoK2(k, w);
    colocarIAK2();
  };
  t.addEventListener('pointermove', mover); t.addEventListener('pointerup', soltar); t.addEventListener('pointercancel', soltar);
});
document.addEventListener('dblclick', (e) => {
  if (!(e.target.closest && e.target.closest('#k2Tirador'))) return;
  const k = k2Modo(); ponerAnchoK2(k, 0); guardarAnchoK2(k, null); marcarTiradorK2(); requestAnimationFrame(colocarIAK2);
});
document.addEventListener('keydown', (e) => {
  if (!(e.target && e.target.id === 'k2Tirador')) return;
  const k = k2Modo(), [d, min, max] = k2Limites(k), w = anchoK2Ahora();
  const n = { ArrowLeft: w - 16, ArrowRight: w + 16, Home: min, End: max }[e.key] ?? (e.key === 'Enter' ? d : null);
  if (n == null) return;
  e.preventDefault();
  const v = ponerAnchoK2(k, n); guardarAnchoK2(k, v === d ? null : v); marcarTiradorK2(); requestAnimationFrame(colocarIAK2);
});
function hojaFijados() {
  const f = fijados().map(itemFijado).filter(Boolean), r = (LS.get('inv-recientes', []) || []).map((id) => PAG[id]).filter(verPag);
  hoja(L('Fijados y recientes', 'Pinned and recent'), `<div class="hoja-fij">
    <h3 class="mas-g">${L('Fijados', 'Pinned')}</h3>${f.length ? `<div class="mas-fij">${f.map(chipItem).join('')}</div>` : `<p class="nota">${L('Aún no tienes ninguno. Busca una página (Ctrl K) y toca su estrella.', 'None yet. Search for a page (Ctrl K) and tap its star.')}</p>`}
    <h3 class="mas-g">${L('Reciente', 'Recent')}</h3>${r.length ? `<div class="mas-fij">${r.map(chipItem).join('')}</div>` : `<p class="nota">${L('Aquí salen las últimas páginas que has abierto.', 'The last pages you opened show up here.')}</p>`}</div>`);
}
function hojaEscritorios() {
  // 0.8.3a: el candado de lo que es del plan, con el sello pequeño de Toisón Dorado
  hoja(L('Escritorios', 'Desktops'), `<div class="hoja-escr"><p class="et-dorado-g">${selloDorado('sd-peq')}${L('Toisón Dorado', 'Toisón Gold')}</p>
    <p>${L('Un escritorio a tu medida: varias páginas a la vez, en paneles que colocas tú, y tantos escritorios como quieras.', 'A desktop your way: several pages at once, in panels you arrange, and as many desktops as you like.')}</p>
    <p class="nota">${tieneDorado() ? L('Ya tienes Toisón Dorado: los Escritorios llegarán en una versión próxima.', 'You already have Toisón Gold: Desktops are coming in a future version.') : L('Será parte de Toisón Dorado, el plan de pago. Todavía no está disponible.', "It'll be part of Toisón Gold, the paid plan. It isn't available yet.")}</p>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>${L('Entendido', 'Got it')}</button></div></div>`);
}
function abrirAvisos() {
  abrirAjustes();
  setTimeout(() => { const x = $('.hoja-fondo [data-av="on"]'); if (x) x.closest('label').scrollIntoView({ block: 'center' }); }, 80);
}

/* ---------- clics y teclas ---------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest && e.target.closest('[data-mas], [data-fijar], [data-ver-av], [data-as="agrandar"], [data-accion="buscar-funciones"], [data-accion="fijados"], [data-accion="escritorios"], [data-accion="avisos"]');
  if (!t) return;
  if (t.matches('[data-mas]')) { e.preventDefault(); if (!document.querySelector('.tour')) abrirMas(); else location.hash = 'tu'; return; }
  if (t.dataset.fijar) { e.preventDefault(); fijar(t.dataset.fijar); return; }
  if (t.dataset.verAv) { verEnAvanzado(t.dataset.verAv); return; }
  if (t.dataset.as === 'agrandar') { agrandarIA(); return; }
  const a = t.dataset.accion;
  if (a === 'buscar-funciones') abrirBuscaFunciones();
  else if (a === 'fijados') hojaFijados();
  else if (a === 'escritorios') hojaEscritorios();
  else if (a === 'avisos') abrirAvisos();
});
// Ctrl K (o «/» fuera de un campo) abre el buscador
document.addEventListener('keydown', (e) => {
  if (!S.cartera || !$('#vista')) return;
  const enCampo = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
  if (((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') || (e.key === '/' && !enCampo && !e.ctrlKey && !e.metaKey)) {
    if (document.querySelector('.tour')) return;
    e.preventDefault(); abrirBuscaFunciones();
  }
});
