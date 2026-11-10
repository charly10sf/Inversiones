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
// las pestañas que se pintan en el trozo «avanzado» (vista «av»); las demás de Análisis son pantallas de siempre
const PEST_AV = [
  ['entiende', 'Entiende tu cartera', 'Understand your portfolio'], ['rentab', 'Rentabilidad', 'Returns'], ['frente', 'Frente a un indexado', 'Against an index fund'], ['riesgo', 'Riesgo', 'Risk'], ['reparto', 'Reparto y X-Ray', 'Allocation and X-Ray'],
  ['div', 'Dividendos', 'Dividends'], ['costes', 'Costes', 'Costs'], ['mov', 'Movimientos', 'Transactions'], ['pnl', 'Día a día', 'Day by day'],
  ['grafico', 'Gráfico técnico', 'Technical chart'], ['rebal', 'Tu reparto objetivo', 'Your target mix'], ['lab', 'Laboratorio', 'Lab'],
];
function pestAv() {
  const p = S.pestAv || LS.get(LS_PEST_AV, 'rentab');
  // 0.8.3a: en básico, Dividendos y Costes van dentro de Rentabilidad (dos tarjetas)
  if (modoApp() === 'basico' && (p === 'div' || p === 'costes')) return 'rentab';
  return PEST_AV.some(([k]) => k === p) ? p : 'rentab';
}
// 0.8.3a: las pestañas de Análisis (htmlPestAna) y el menú del ordenador (htmlRiel), en 43b-navegacion.js
// el sitio de una pestaña de «av»: lo llena pintarPanelAv (en el trozo) después de pintar
const htmlPanelAv = () => `<div class="panel-av" id="panelAv" data-p="${pestAv()}" aria-busy="true"><div class="pav-esq" role="status" aria-label="${L('Preparando la pestaña…', 'Getting the tab ready…')}"><i></i><i></i><i></i><i></i></div></div>`;
function htmlSelectorModo(enRiel) {
  const m = modoApp();
  const bs = `<button type="button" data-modo="basico" aria-pressed="${m === 'basico'}">${L('Básico', 'Basic')}</button><button type="button" data-modo="avanzado" aria-pressed="${m === 'avanzado'}">${L('Avanzado', 'Advanced')}</button>`;
  if (enRiel) return `<div class="riel-pie"><small>${L('Cómo la ves', 'How you see it')}</small><div class="seg-modo" role="group" aria-label="${L('Modo', 'Mode')}">${bs}</div></div>`;
  return `<div class="seccion-ed aj-idioma"><h3>${ICONOS_PL.ver}${L('Cómo la ves', 'How you see it')}</h3>
    <div class="idiomas seg-modo" role="group" aria-label="${L('Modo', 'Mode')}">${bs}</div>
    <small>${L('Básico: lo esencial, explicado. Avanzado: Análisis con siete pestañas (posiciones, rentabilidad, riesgo, reparto, ingresos y costes, Hacienda y la IA) y las herramientas. Se guarda en este dispositivo.', 'Basic: the essentials, explained. Advanced: Analysis with seven tabs (holdings, returns, risk, allocation, income and costs, taxes and the AI) and the tools. Saved on this device.')}</small></div>`;
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
    e.preventDefault();
    S.pestAv = t.dataset.pestAv; LS.set(LS_PEST_AV, S.pestAv); vibrar();
    // 0.8.3a: cada pestaña del trozo tiene su dirección (#av-rentab…), así «Atrás» vuelve a la de antes
    const h = 'av-' + S.pestAv;
    if (location.hash.slice(1) !== h) location.hash = h; else { S.scrollTop = true; pintar(); }
  }
});
// la pestaña elegida, a la vista en la fila (al cambiar de pantalla se repinta entera)
// solo se mueve la fila de pestañas, no la página (scrollIntoView subía la página al repintar)
function centrarPest() { const n = $('.pest-av [aria-current="page"]'), nav = n && n.closest('.pest-av'); if (nav) nav.scrollLeft = n.offsetLeft - (nav.clientWidth - n.offsetWidth) / 2; }
/* «Pregúntale» en cada tarjeta: abre la IA con lo que hay en ella (su título y lo que se lee) */
function ponerPreguntale(raiz) {
  if (!raiz || !['cartera', 'posiciones', 'av', 'fiscal'].includes(S.vista)) return;
  for (const c of $$('.sec-cab, .pav-et', raiz)) {
    if (c.querySelector('.preg-ia') || (c.closest('.car-plan') && !c.querySelector('#hPlanC'))) continue;
    const h = c.querySelector('h2, h3') || c, tit = (h.firstChild && h.firstChild.textContent || h.textContent || '').trim().slice(0, 60);
    if (!tit) continue;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'preg-ia'; b.dataset.accion = 'asesor';
    b.dataset.q = L(`Explícame «${tit}» con mi cartera: qué significa, de dónde salen las cifras y qué hay que vigilar.`, `Explain «${tit}» with my portfolio: what it means, where the numbers come from and what to watch.`);
    b.innerHTML = `${ICONOS_PL.asistente}<span>${L('Pregúntale', 'Ask')}</span>`;
    b.setAttribute('aria-label', L(`Pregúntale a la IA por ${tit}`, `Ask the AI about ${tit}`));
    c.appendChild(b);
  }
}
// un toque corto en Android al cambiar de pestaña o marcar algo (se puede quitar: LS inv-vibrar = false)
function vibrar(ms = 8) { try { if (LS.get('inv-vibrar', true) !== false && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
// las flechas mueven entre pestañas (todas: Posiciones, Hacienda y La IA explica también) y el foco se queda en la nueva
document.addEventListener('keydown', (e) => {
  const t = e.target.closest && e.target.closest('.pest-av a');
  if (!t || !/^Arrow(Left|Right)$|^Home$|^End$/.test(e.key)) return;
  e.preventDefault();
  const as = $$('.pest-av a'), i = as.indexOf(t);
  const j = e.key === 'Home' ? 0 : e.key === 'End' ? as.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + as.length) % as.length;
  const sel = (a) => (a.dataset.pestAv ? `.pest-av [data-pest-av="${a.dataset.pestAv}"]` : `.pest-av a[href="${a.getAttribute('href')}"]:not([data-pest-av])`), s = sel(as[j]);
  as[j].click();
  for (const ms of [0, 120, 400]) setTimeout(() => { const n = $(s); if (n && document.activeElement !== n) n.focus({ preventScroll: true }); }, ms);
});

/* ---------- 0.9 · acabado (Carlos, 3 nov: «muchísima mayor calidad percibida»; maqueta claude.ai/artifact/3JSdgotzA9gSQmwNGYLHCn) ---------- */
const sinMovimiento = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
function pulirHoy(M) {
  if (S.vista !== 'cartera') return;
  celebrarMetas(M);
  // la cifra que cuenta: la primera vez que se ve Hoy en esta visita sube hasta su valor
  const n = $('#heroNum [data-b="totalE"]');
  if (n && !S.contado && !S.oculto && !sinMovimiento()) {
    S.contado = true;
    const fin = n.textContent, v = +fin.replace(/\D/g, '');
    if (v > 999) {
      const t0 = performance.now();
      let puesto = fin;
      const paso = (t) => {
        if (!n.isConnected) return;
        if ($('#heroNum[data-antes]')) { n.textContent = fin; return; }   // recorres la gráfica: la cuenta se para en el dato
        if (n.textContent !== puesto) return;   // llegó un precio nuevo a mitad: manda el dato
        const k = Math.min(1, (t - t0) / 900), e = 1 - (1 - k) ** 3;
        puesto = k < 1 ? fmtNum(Math.round(v * (0.94 + 0.06 * e)), 0) : fin;
        n.textContent = puesto;
        if (k < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    }
  }
  // un momento: si tu patrimonio está en su máximo, se dice (una vez al día se calcula)
  const h = $('.car-hero'); if (!h || !M.filas.length) return;
  const kMax = `${hoyIso()}|${(S.hist && S.hist.generado) || ''}|${Math.round(M.total / 100)}`;
  if (!S.maxCalc || S.maxCalc.d !== kMax) { let c = null; try { c = caidaDetalle(serieCartera(M, 3650)); } catch (e) {} S.maxCalc = { d: kMax, en: !!(c && c.ahora > -0.3 && c.dd.length > 60) }; }
  if (S.maxCalc.en && !h.querySelector('.hero-max')) {
    h.classList.add('en-maximo');
    const lbl = h.querySelector('.hero-lbl');
    if (lbl) lbl.insertAdjacentHTML('beforeend', `<span class="hero-max">${ICONOS.chispa || ''}${L('En máximos', 'At its high')}</span>`);
  }
}
/* el destello al cumplir una meta: la primera vez que tu patrimonio llega a lo que pide una meta, su fila de Hoy brilla
   en oro una vez y un aviso lo dice. Cada meta, una sola vez (LS inv-metas-hechas) */
function celebrarMetas(M) {
  // sin la proyección: basta con lo que tienes hoy contra lo que pide cada una (lo mismo que su barra en Hoy)
  const ms = ((S.cartera && S.cartera.metas) || []).filter((m) => m && +m.importe > 0 && isFinite(M.total));
  // se guarda una huella de cada meta, no su nombre ni su importe (el dispositivo no tiene por qué contarlo)
  const huella = (m) => { let h = 0x811c9dc5; for (const c of claveMeta(m) + '|' + uidActual()) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
  const hechas = new Set(LS.get('inv-metas-hechas', []) || []), nuevas = ms.filter((m) => M.total >= +m.importe && !hechas.has(huella(m)));
  if (!nuevas.length) return;
  for (const m of nuevas) hechas.add(huella(m));
  LS.set('inv-metas-hechas', [...hechas].slice(-50));
  const m = nuevas[0];
  setTimeout(() => {
    const li = $$('.car-metas li').find((x) => textoLimpio(x.querySelector('b')) === String(m.n || '').trim());
    if (li && !sinMovimiento()) { li.classList.remove('meta-brilla'); void li.offsetWidth; li.classList.add('meta-brilla'); }
    vibrar(30);
    // «llegar a» se cumple de verdad; las de gastar (un piso, un coche) solo dicen que la cifra ya está, porque tu patrimonio
    // cuenta para todas a la vez
    toast(m.tipo === 'llegar' ? L(`Has llegado a tu meta «${m.n}»: tu patrimonio ya pasa de ${eur(m.importe, 0)}.`, `You reached your goal «${m.n}»: your net worth is now above ${eur(m.importe, 0)}.`)
      : L(`Tu patrimonio ya pasa de ${eur(m.importe, 0)}, lo que pide «${m.n}». Cuenta todo lo que tienes, también lo de otras metas.`, `Your net worth is now above ${eur(m.importe, 0)}, what «${m.n}» needs. It counts everything you own, including other goals.`), 6000);
  }, 1200);
}
// la cabecera del móvil: al bajar por Hoy, el patrimonio se queda arriba en pequeño
addEventListener('scroll', () => {
  const m = $('#topMini'); if (!m) return;
  const h = S.vista === 'cartera' && $('.car-hero'), on = !!h && h.getBoundingClientRect().bottom < 80;
  if (on) { const t = $('#heroNum'), d = $('.hero-sub [data-b="dia"]'); m.innerHTML = `<b>${esc(t ? t.textContent.trim() : '')}</b>${d ? `<small class="${esc(d.className)}">${esc(d.textContent.trim())}</small>` : ''}`; }
  document.body.classList.toggle('mini-total', on);
}, { passive: true });
// un toque corto al cambiar de sección o de pestaña
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.navbar [data-ir], .riel [data-ir], .grupo-tabs a, .tabs button, .chip-btn')) vibrar(); }, true);

/* ---------- 0.9 · «Explícame una cifra» (encargo de Carlos, 3 nov: la IA metida en toda la app) ----------
   Tocar una cifra (tu patrimonio, las de Hoy y las de las pestañas de Análisis) abre un globo con lo que es y
   «Explícamela», que abre la IA con la cifra, su tarjeta y su pestaña. La IA la explica con tu cartera: qué significa,
   de dónde sale y cómo se compara; no dice qué hacer (CNMV y política de uso de Anthropic). */
const SEL_CIFRA = '#heroNum, .pav-kpi b, .kpis .kpi:not(a) .v';
const textoLimpio = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
function etiquetaCifra(v) {
  if (v.id === 'heroNum') return textoLimpio($('#heroLbl')) || L('Patrimonio', 'Net worth');
  const k = v.closest('.pav-kpi, .kpi');
  const e = k && k.querySelector(':scope > small, :scope > .k');
  return textoLimpio(e).slice(0, 60);
}
function marcarCifras(raiz) {
  if (!raiz) return;
  for (const v of $$(SEL_CIFRA, raiz)) {
    if (v.dataset.cifra || v.closest('a, button') || v.querySelector('a, button')) continue;
    const et = etiquetaCifra(v); if (!et) continue;
    // el nombre lo da el contenido (que cambia con cada precio); la ayuda va aparte, en un texto escondido
    v.dataset.cifra = et; v.tabIndex = 0; v.setAttribute('role', 'button'); v.setAttribute('aria-haspopup', 'dialog'); v.setAttribute('aria-describedby', 'cifraAyuda');
    if (!$('#cifraAyuda')) document.body.insertAdjacentHTML('beforeend', `<span id="cifraAyuda" hidden>${L('Toca para que la IA te explique esta cifra', 'Tap for the AI to explain this figure')}</span>`);
  }
}
// dónde está la cifra: la tarjeta (su título) y la pestaña o la pantalla
function dondeCifra(v) {
  const t = v.closest('.pav-t, .card, .car-bloque, section'), h = t && t.querySelector('h2, h3');
  const tarjeta = h ? String((h.firstChild && h.firstChild.nodeType === 3 ? h.firstChild.textContent : h.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  const p = $('.pest-av [aria-current="page"]'), pest = S.vista === 'cartera' ? L('Hoy', 'Today') : textoLimpio(p) || '';
  return { tarjeta, pest };
}
function cerrarGloboCifra(enfocar = true) { const g = $('#globoCifra'); if (g) { g.remove(); const o = $('[data-cifra].cifra-on'); if (o) { o.classList.remove('cifra-on'); if (enfocar) o.focus({ preventScroll: true }); } } }
function globoCifra(v) {
  cerrarGloboCifra();
  const et = v.dataset.cifra, val = S.oculto ? '' : textoLimpio(v), { tarjeta, pest } = dondeCifra(v);
  const donde = [pest, tarjeta && tarjeta !== et ? tarjeta : ''].filter(Boolean).join(' · ');
  const q = L(`Explícame la cifra «${et}»${val ? ` (${val})` : ''}${donde ? `, de ${donde},` : ''} con mi cartera: qué significa, de dónde sale y cómo se compara con lo normal. Sin decirme qué hacer.`,
    `Explain the figure «${et}»${val ? ` (${val})` : ''}${donde ? ` in ${donde}` : ''} with my portfolio: what it means, where it comes from and how it compares with what is usual. Without telling me what to do.`);
  const g = document.createElement('div');
  g.id = 'globoCifra'; g.className = 'globo-cifra'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-label', et);
  g.innerHTML = `<div class="gc-cab"><small>${esc(donde || L('Tu cartera', 'Your portfolio'))}</small><button type="button" class="ib gc-x" data-gc="x" aria-label="${L('Cerrar', 'Close')}">${ICONOS.cerrar}</button></div>
    <b class="gc-et">${esc(et)}</b>${val ? `<span class="gc-v">${esc(val)}</span>` : ''}
    <button type="button" class="btn pri peq gc-ia" data-accion="asesor" data-q="${esc(q)}">${ICONOS_PL.asistente || ''}<span>${L('Explícamela', 'Explain it')}</span></button>
    <p class="gc-nota">${L('La IA te la explica con tus datos. No te dice qué hacer: eso lo decides tú.', 'The AI explains it with your data. It does not tell you what to do.')}</p>`;
  document.body.appendChild(g);
  v.classList.add('cifra-on');
  // al lado de la cifra: debajo si cabe, si no encima; sin salirse de la pantalla
  const r = v.getBoundingClientRect(), gw = g.offsetWidth, gh = g.offsetHeight, m = 10;
  const x = Math.max(m, Math.min(innerWidth - gw - m, r.left + r.width / 2 - gw / 2));
  const y = r.bottom + gh + m < innerHeight ? r.bottom + 8 : Math.max(m, r.top - gh - 8);
  g.style.left = `${Math.round(x)}px`; g.style.top = `${Math.round(y)}px`;
  if (!sinMovimiento()) g.classList.add('entra');
  vibrar();
  setTimeout(() => { const b = g.querySelector('.gc-ia'); if (b) b.focus({ preventScroll: true }); }, 30);
}
document.addEventListener('click', (e) => {
  const g = $('#globoCifra');
  if (g) {
    if (e.target.closest('[data-gc="x"]')) { cerrarGloboCifra(); return; }
    if (e.target.closest('.gc-ia')) { S.origenIA = $('[data-cifra].cifra-on'); setTimeout(() => { const x = $('#globoCifra'); if (x) x.remove(); $$('.cifra-on').forEach((o) => o.classList.remove('cifra-on')); }, 0); return; }
    if (!g.contains(e.target) && !e.target.closest('[data-cifra]')) cerrarGloboCifra(false);
  }
  const v = e.target.closest && e.target.closest('[data-cifra]');
  if (!v || e.defaultPrevented) return;
  // en la gráfica del patrimonio, el dedo que recorre la línea cambia la cifra: ahí no se abre
  if (v.id === 'heroNum' && v.dataset.antes) return;
  if (v.classList.contains('cifra-on')) { cerrarGloboCifra(); return; }
  globoCifra(v);
});
// Escape cierra primero el globo (antes que la IA abierta al lado, que también escucha Escape)
addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#globoCifra')) { e.stopPropagation(); cerrarGloboCifra(); } }, true);
// con Tab fuera del globo, se cierra sin devolver el foco atrás
document.addEventListener('focusout', (e) => { const g = $('#globoCifra'); if (g && g.contains(e.target) && e.relatedTarget && !g.contains(e.relatedTarget) && !e.relatedTarget.closest('[data-cifra]')) cerrarGloboCifra(false); });
document.addEventListener('keydown', (e) => {
  const v = e.target.closest && e.target.closest('[data-cifra]');
  if (v && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); globoCifra(v); }
});
/* Lo que va con la pregunta (Carlos, 4 nov: la IA contestaba «no tengo el dato de origen» del VaR, la beta o las
   correlaciones). Con «Explícamela» o «Pregúntale» viaja, sin que se vea en el chat, lo que pone la tarjeta entera (sus
   cifras, su tabla y su «Cómo se calcula») y, si la pestaña lo tiene, el detalle del cálculo (S.detAv: con qué números
   sale cada cifra y la misma medida en el MSCI World, para comparar). Lo recoge preguntarAsesor. */
function contextoIA(el) {
  const t = el && el.closest('.pav-t, .card, .car-bloque, section'); if (!t) return null;
  const c = t.cloneNode(true);
  // fuera los titulares de noticias (texto de terceros: no viaja con voz del usuario)
  for (const x of c.querySelectorAll('.preg-ia, button, svg, script, style, [hidden], .noticias, a.noti')) x.remove();
  // las celdas de las tablas, separadas; si no, el texto sale pegado
  for (const x of c.querySelectorAll('td, th')) x.append(' | ');
  for (const x of c.querySelectorAll('.pav-kpi > small, .kpi > small, .kpi > .k')) x.append(': ');
  for (const x of c.querySelectorAll('.pav-kpi > b, .kpi > .v')) x.append(' ');
  for (const x of c.querySelectorAll('tr, p, li, .pav-kpi, .kpi, h2, h3')) x.append('\n');
  const texto = (c.textContent || '').replace(/[ \t  ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim().slice(0, 3500);
  const { tarjeta, pest } = dondeCifra(el);
  // la pestaña de verdad (tras recargar, S.pestAv aún no está: la da pestAv()); el cálculo, solo si es de esta cuenta
  const k = S.vista === 'av' ? pestAv() : '', d = S.detAv && S.detAv.uid === uidActual() ? S.detAv[k] : '';
  return { donde: [pest, tarjeta].filter(Boolean).join(' · '), texto, calculo: d || '', t: Date.now() };
}
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('.gc-ia, .preg-ia'); if (!b) return;
  const x = contextoIA(b.classList.contains('gc-ia') ? $('[data-cifra].cifra-on') : b);
  S.ctxIA = x ? { ...x, q: String(b.dataset.q || '').trim() } : null;
}, true);
addEventListener('scroll', () => { if ($('#globoCifra')) cerrarGloboCifra(false); }, { passive: true, capture: true });
addEventListener('resize', () => { if ($('#globoCifra')) cerrarGloboCifra(false); });
addEventListener('hashchange', () => { if ($('#globoCifra')) cerrarGloboCifra(false); });
