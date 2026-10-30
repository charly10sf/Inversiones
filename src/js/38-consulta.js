/* =====================================================================
   Consulta (pestaña Mercados): buscar cualquier fondo, acción, cripto o mercado aunque no lo tengas, ver su
   precio, su gráfica, sus datos y sus noticias, y añadirlo a la cartera desde ahí. Las que más suben y bajan
   salen de las empresas del radar (unas 840), con su último cierre.
   ===================================================================== */
function candidatosConsulta() {
  const merc = Object.entries((S.precios && S.precios.mercados) || {}).map(([sym, m]) => ({ k: 'merc:' + sym, n: m.nombre, l: m.grupo || '', s: sym, isin: '', dom: null, cot: { cod: null, txt: m.grupo || 'mercado' }, tengo: false }));
  return [...candidatosBusqueda(), ...merc];
}
function candidatoDeSim(sim) {
  const id = instPorSim(sim), k = id ? 'inst:' + id : 'radar:' + sim;
  return candidatosBusqueda().find((c) => c.k === k) || null;
}
const nombreRadar = (x) => nombreCorto(/^[A-Z0-9 .,&'-]+$/.test(x.n) ? x.n.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : x.n);
function htmlBuscaMercados() {
  const n = candidatosBusqueda().length;
  return `<section class="merc-busca" aria-labelledby="hBusca"><h2 id="hBusca">Busca un fondo, una acción o una cripto</h2><div id="mercBusca"></div><p class="merc-busca-t">Unos ${fmtNum(Math.floor(n / 50) * 50, 0)} entre fondos, cripto, empresas y mercados: su precio, su gráfica, sus noticias y añadirlo a tu cartera.</p></section>`;
}
function htmlMovidas(abierto = true) {
  const r = ((S.radar && S.radar.valores) || []).filter((x) => !x.pd && x.v != null && isFinite(x.v) && x.p > 0 && Math.abs(x.v) < 60);
  if (r.length < 30) return '';
  const orden = [...r].sort((a, b) => b.v - a.v), suben = orden.slice(0, 5), bajan = orden.slice(-5).reverse();
  const li = (x) => `<li><button type="button" class="mov" data-consulta="${esc(x.s)}">${logo(x.w, nombreRadar(x), 'peq')}<span class="busca-t"><b>${esc(nombreRadar(x))}</b><small>${esc(x.s)}${x.sector ? ` · <span>${esc(x.sector)}</span>` : ''}</small></span><span class="mov-v"><b class="${cls(x.v)}">${pctS(x.v, 1)}</b><small>${precioR(x.p, x.m)}</small></span></button></li>`;
  const ade = (x) => `${esc(nombreRadar(x))} <b class="${cls(x.v)}">${pctS(x.v, 1)}</b>`;
  return `<details class="movidas merc-pleg"${abierto ? ' open' : ''}><summary class="sec-cab"><h2 id="hMov">Las que más se han movido</h2><span class="k">en su último día de bolsa, de las ${fmtNum(radarVals().length, 0)} empresas del radar${S.radar.generado ? `, ${haceCuanto(S.radar.generado)}` : ''}</span><span class="mp-ade">${ade(suben[0])}, ${ade(bajan[0])}</span><i class="aj-flecha" aria-hidden="true"></i></summary>
    <div class="mov-cols"><div><h3 class="mov-h up">Suben</h3><ul class="mov-l">${suben.map(li).join('')}</ul></div><div><h3 class="mov-h down">Bajan</h3><ul class="mov-l">${bajan.map(li).join('')}</ul></div></div></details>`;
}
/* gráfica sencilla del último año a partir de [[fecha, precio], …] */
// el histórico semanal del radar: se baja la primera vez que abres la ficha de una empresa que no tienes
let radarHistP = null;
const radarHist = () => radarHistP || (radarHistP = fetch(CFG.dev ? 'dev/radar-hist.json' : GH.raw('radar-hist.json', 'datos') + '?v=' + Math.floor(Date.now() / 3600000), { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => { radarHistP = null; return null; }));
function graficaConsulta(h, mon) {
  const desde = iso(new Date(Date.now() - 366 * 864e5));
  const se = (h || []).filter(([d, v]) => d >= desde && v > 0);
  if (se.length < 10) return '';
  const W = 600, H = 170, vs = se.map((x) => x[1]), mn = Math.min(...vs), mx = Math.max(...vs);
  const pts = vs.map((v, i) => `${((i / (vs.length - 1)) * W).toFixed(1)},${(H - 8 - ((v - mn) / (mx - mn || 1)) * (H - 22)).toFixed(1)}`);
  const ch = (vs[vs.length - 1] / vs[0] - 1) * 100, col = ch >= 0 ? 'var(--up)' : 'var(--down)';
  return `<figure class="cons-graf"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Precio desde el ${fechaLarga(se[0][0])}: ${pctS(ch, 1)}"><defs><linearGradient id="consG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity="0.28"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs><path d="M0,${H} L${pts.join(' L')} L${W},${H} Z" fill="url(#consG)"/><polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
    <figcaption><span class="k">Desde el ${fechaLarga(se[0][0])}</span><b class="${cls(ch)}">${pctS(ch, 1)}</b><span class="k">máximo ${precioR(mx, mon)}, mínimo ${precioR(mn, mon)}</span></figcaption></figure>`;
}
/* sin histórico (empresas del radar): dónde está el precio dentro de su rango del año y su objetivo */
function rangoConsulta(x) {
  if (!(x.mx > x.mn) || !x.p) return '';
  const p = (v) => Math.max(0, Math.min(100, ((v - x.mn) / (x.mx - x.mn)) * 100)).toFixed(1);
  return `<div class="cons-rango"><div class="cr-t"><span class="k">Rango del último año</span>${x.c1a != null ? `<b class="${cls(x.c1a)}">${pctS(x.c1a, 1)} en un año</b>` : ''}</div>
    <div class="cr-barra" role="img" aria-label="Precio ${precioR(x.p, x.m)} entre ${precioR(x.mn, x.m)} y ${precioR(x.mx, x.m)}"><i class="cr-p" style="left:${p(x.p)}%"></i>${x.obj ? `<i class="cr-o" style="left:${p(Math.min(x.obj, x.mx))}%" title="Objetivo medio de los analistas"></i>` : ''}</div>
    <div class="cr-et"><span>${precioR(x.mn, x.m)}</span>${x.obj ? `<span class="cr-leg"><i></i>objetivo ${precioR(x.obj, x.m)}</span>` : ''}<span>${precioR(x.mx, x.m)}</span></div></div>`;
}
/* 0.7i: si GrowIA la tiene entre las que evitaría o entre sus ideas, la hoja de la empresa lo dice, con su motivo */
function htmlConsultaIA(sim) {
  const d = S.escaneo && S.escaneo.decision;
  if (!sim || !d) return '';
  const ev = (d.evitar || []).find((v) => v && v.s === sim);
  if (ev) return `<p class="cons-ia ev">${ICONOS.alerta}<span><b>${L('GrowIA la evitaría, por lo que dice su prensa.', 'GrowIA would avoid it, going by its press.')}</b> ${escIA(ev.motivo || '')}</span></p>`;
  const id = (d.ideas || []).find((v) => v && v.s === sim);
  if (id) return `<p class="cons-ia idea">${ICONOS.growia}<span><b>${esPublico() ? L('Está entre las ideas de GrowIA, iguales para todos.', "It's among GrowIA's ideas, the same for everyone.") : L('Está entre las ideas de GrowIA.', "It's among GrowIA's ideas.")}</b> ${escIA(id.tesis || '')}</span></p>`;
  return '';
}
function abrirConsulta(c) {
  if (!c) return;
  if (c.k.startsWith('merc:')) {
    const d = document.querySelector(`details.mfila[data-sym="${CSS.escape(c.k.slice(5))}"]`);
    if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    return;
  }
  const idI = c.k.startsWith('inst:') ? c.k.slice(5) : null;
  const pos = idI && (S.cartera.posiciones || []).find((p) => p.instrumento === idI);
  if (pos) { abrirFicha(pos.id); return; }
  const inst = idI ? S.inst[idI] : null;
  const cid = c.k.startsWith('cat:') ? c.k.slice(4) : (inst && inst.cat) || null;
  const ca = cid ? S.cat && S.cat.v && S.cat.v[cid] : inst ? catDe(inst) : null;
  const sim = c.k.startsWith('radar:') ? c.k.slice(6) : c.s || (inst && inst.yahoo) || '';
  const x = sim ? radarPorSim(sim) : null;
  const pi = idI && S.precios && S.precios.instrumentos && S.precios.instrumentos[idI];
  let precio = null, mon = 'EUR', dia = null, fecha = null;
  if (idI && pi && pi.precio) { precio = precioInst(idI); dia = pi.variacion_dia; fecha = pi.fecha; mon = pi.moneda || 'EUR'; }
  if (precio == null && ca && ca.p) { precio = ca.p; mon = ca.m || 'EUR'; dia = ca.pa ? (ca.p / ca.pa - 1) * 100 : null; fecha = ca.f; }
  if (precio == null && x) { precio = x.p; mon = x.m || 'EUR'; dia = x.v; }
  const nombre = x && c.k.startsWith('radar:') ? nombreRadar(x) : c.n;
  // lo que cotiza fuera del euro, también en euros (la lista de Mercados lo enseña en euros)
  const fxP = mon === 'EUR' ? 1 : (S.precios && S.precios.fx && S.precios.fx[mon === 'GBp' ? 'GBP' : mon]) || null;
  const enEur = precio == null ? null : x && x.pe && mon === (x.m || 'EUR') ? x.pe : fxP ? precio * fxP / (mon === 'GBp' ? 100 : 1) : null;
  const fondo = /^Fondo/.test((ca && ca.t) || (inst && inst.tipo) || '');
  const datos = [];
  if (x) {
    if (x.na) datos.push(['Analistas', `${fmtNum(x.na, 0)}, ${esc((CONSENSO[x.r] || '').toLowerCase() || 'sin consenso')}`]);
    if (x.pot != null && x.obj) datos.push(['Precio objetivo de los analistas', `${precioR(x.obj, x.m)} <span class="${cls(x.pot)}">(${pctS(x.pot, 1)}${x.pot < 0 ? ', ya lo pasa' : ''})</span>`]);
    if (x.div) datos.push(['Dividendo', pct(x.div, 1)]);
    if (x.perf) datos.push(['PER futuro', fmtNum(x.perf, 1)]);
    // la capitalización llega en la moneda de la bolsa: se pasa a euros con el cambio del día
    const fxC = x.m === 'EUR' ? 1 : (S.precios && S.precios.fx && S.precios.fx[x.m === 'GBp' ? 'GBP' : x.m]) || null;
    if (x.cap && fxC) datos.push(['Capitalización', capital(x.cap * fxC)]);
    if (x.sector) datos.push(['Sector', esc(x.sector)]);
    if (x.z) datos.push(['País', esc(x.z)]);
  }
  if (ca && ca.r && Object.keys(ca.r).length > 1) datos.push(['Dónde invierte', esc(Object.entries(ca.r).sort((a, b) => (a[0] === 'Otros') - (b[0] === 'Otros') || b[1] - a[1]).map(([k, v]) => `${trad(k)}\u00a0${fmtNum(v, 0)}\u00a0%`).join(', '))]);
  const nots = sim ? noticiasIdea(sim) : [];
  const gnews = `https://news.google.com/search?q=${encodeURIComponent(nombre)}&hl=es&gl=ES&ceid=ES:es`;
  const h = hoja(nombre, `<div class="cons">
      <div class="cons-cab">${logo(c.dom, nombre)}<div class="busca-t"><b>${esc(nombre)}</b><small>${bandera(c.cot.cod)}${esc(c.cot.txt || '')}${c.isin ? ` · ${esc(c.isin)}` : sim ? ` · ${esc(sim)}` : ''}</small></div></div>
      ${precio != null ? `<div class="cons-precio"><b>${precioR(precio, mon)}</b>${mon !== 'EUR' && enEur ? `<span class="k">≈ ${precioFmt(enEur)}</span>` : ''}${dia != null ? `<span class="${cls(dia)}">${pctS(dia, 2)}</span>` : ''}<small class="k">${fecha ? `${fondo ? 'valor liquidativo del' : 'cierre del'} ${fechaCorta(fecha)}` : 'último cierre'}</small></div>` : ''}
      <div id="consGraf">${cid || (idI && histDe(idI)) ? '<div class="vacio">Cargando la gráfica…</div>' : x ? rangoConsulta(x) : ''}</div>
      <div class="fila-btns cons-btns"><button type="button" class="btn pri" data-cons-add>${ICONOS.mas}Añadir a mi cartera</button><button type="button" class="btn" data-cons-ia>${ICONOS.growia}Pregúntale a GrowIA</button>${x ? botonSeguir(x.s, nombre, false) : ''}</div>
      ${htmlConsultaIA(sim)}
      ${datos.length ? `<dl class="kv">${datos.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}
      ${x ? `<details class="mas"><summary>Las siete señales de GrowFolio</summary>${htmlContrasteLista(contraste(x))}</details>` : ''}
      ${x ? htmlFichaFactores(x.s) : ''}
      <section class="cons-not"><h3>Noticias</h3>${nots.length ? htmlNoticias(nots, false, 5) : ''}<a class="enlace" href="${esc(gnews)}" target="_blank" rel="noopener noreferrer">Ver las noticias de ${esc(nombre)} en Google Noticias</a></section>
    </div>`);
  $('[data-cons-add]', h.el).onclick = () => { h.cerrar(); operacion('compra', null, null, c); };
  $('[data-cons-ia]', h.el).onclick = () => { h.cerrar(); abrirAsesor(`¿Qué me dices de ${nombre}${sim ? ` (${sim})` : c.isin ? ` (${c.isin})` : ''}? Qué es, cómo le va, qué riesgos tiene y si encajaría en mi cartera.`); };
  // la gráfica: histórico del catálogo (fondos y cripto) o el de la web; si no hay, el rango del año
  const gr = $('#consGraf', h.el);
  (async () => {
    let serie = idI ? histDe(idI) : null;
    if (!serie && ca && ca.local && ca.h && ca.h.length) serie = ca.h;
    if (!serie && cid && !(ca && ca.local)) {
      const id2 = cid;
      try { const r = await fetch(CFG.dev ? `dev/cat/${id2}.json` : GH.raw(`cat/${id2}.json`, 'catalogo') + '?v=' + Math.floor(Date.now() / 3600000), { cache: 'no-cache' }); if (r.ok) { const j = await r.json(); serie = j && j.h; } } catch (e) { console.warn(e); }
    }
    // las empresas del radar que no tienes: su año en cierres semanales (radar-hist.json, una vez al día)
    if (!serie && sim) {
      const rh = await radarHist(), e = rh && rh.s && rh.s[sim];
      if (e && e.d && e.v) { const d0 = deIso(e.d), paso = rh.paso || 7; serie = e.v.map((v, k) => { const x2 = new Date(d0); x2.setDate(d0.getDate() + k * paso); return [iso(x2), v]; }); }
    }
    const g = serie ? graficaConsulta(serie, mon) : '';
    gr.innerHTML = g || (x ? rangoConsulta(x) : '');
  })();
}
/* ---------- 0.3.11: empresas que sigues sin tenerlas ----------
   Se guardan en tu cartera (cifradas, en todos tus dispositivos): el símbolo del radar, el nombre, el día que
   empezaste a seguirla y su precio ese día en euros, y los dos precios a los que quieres que te avise (si baja de uno
   o sube de otro). Los precios, los del radar, que la Action pone al día cada 20 minutos. */
const siguiendo = () => ((S.cartera && S.cartera.siguiendo) || []).filter((x) => x && x.s);
const sigoA = (sim) => !!sim && siguiendo().some((x) => x.s === String(sim).toUpperCase());
function precioSeguido(it) {
  const x = radarPorSim(it.s);
  if (!x) return null;
  const eur = x.pe != null ? x.pe : x.m === 'EUR' ? x.p : null;
  return { eur, local: x.p, m: x.m || 'EUR', dia: x.v, x };
}
async function seguir(sim, nombre) {
  sim = String(sim || '').toUpperCase();
  if (!sim || !S.cartera) return;
  const lista = (S.cartera.siguiendo = S.cartera.siguiendo || []);
  const i = lista.findIndex((x) => x.s === sim);
  const x = radarPorSim(sim), n = nombre || (x ? nombreRadar(x) : sim);
  if (i >= 0) lista.splice(i, 1);
  else { const pr = precioSeguido({ s: sim }); lista.push({ s: sim, n, desde: hoyIso(), p0: pr && pr.eur ? +pr.eur.toFixed(4) : null }); }
  for (const b of $$(`[data-seguir="${CSS.escape(sim)}"]`)) { const si = i < 0; b.setAttribute('aria-pressed', String(si)); const t = b.querySelector('.seg-t'); if (t) t.textContent = si ? L('Siguiendo', 'Following') : L('Seguir', 'Follow'); }
  await guardarCartera(i >= 0 ? `Dejar de seguir ${n}` : `Seguir ${n}`);
  toast(i >= 0 ? L(`Ya no sigues ${n}`, `No longer following ${n}`) : L(`Sigues ${n}: la tienes en Expertos, Siguiendo. Ponle un aviso de precio si quieres.`, `Following ${n}: it's in Experts, Following. Add a price alert if you like.`), 4500);
  AS.foto = null;
  if (S.vista === 'expertos') pintar();
}
const botonSeguir = (sim, nombre, peq = true) => { const si = sigoA(sim); return `<button type="button" class="btn${peq ? ' peq' : ''} btn-seg" data-seguir="${esc(String(sim).toUpperCase())}" data-seguir-n="${esc(nombre || '')}" aria-pressed="${si}">${ICONOS.estrella}<span class="seg-t">${si ? L('Siguiendo', 'Following') : L('Seguir', 'Follow')}</span></button>`; };
function editarAvisoSeguido(sim) {
  const it = siguiendo().find((x) => x.s === sim); if (!it) return;
  const pr = precioSeguido(it), ahora = pr && pr.eur;
  const h = hoja(L(`Aviso de ${it.n}`, `${it.n} alert`), `<form id="fSeg" novalidate>
    <p class="nota" style="margin:0">${ahora ? L(`Ahora está a ${precioFmt(ahora)}.`, `It's at ${precioFmt(ahora)} now.`) : ''} ${L('Te aviso una vez cuando llegue (en el móvil, con la app y los avisos activados; en el navegador, con GrowFolio abierto).', 'I’ll alert you once when it gets there (on your phone with the app and alerts on; in the browser, with GrowFolio open).')}</p>
    <div class="form-grid">
      <label class="campo">${L('Avísame si baja de (€)', 'Alert me if it falls below (€)')}<input name="baja" inputmode="decimal" value="${it.baja ? fmtNum(it.baja, 2) : ''}" placeholder="${ahora ? fmtNum(ahora * 0.9, 2) : ''}"><small>${L('Por ejemplo, el precio al que la comprarías.', 'For example, the price you’d buy at.')}</small></label>
      <label class="campo">${L('Avísame si sube de (€)', 'Alert me if it rises above (€)')}<input name="sube" inputmode="decimal" value="${it.sube ? fmtNum(it.sube, 2) : ''}" placeholder="${ahora ? fmtNum(ahora * 1.1, 2) : ''}"></label>
    </div>
    <div class="error" id="errSeg"></div>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>${L('Cancelar', 'Cancel')}</button><button type="submit" class="btn pri">${L('Guardar', 'Save')}</button></div></form>`);
  $('#fSeg', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.target, baja = numero(f.baja.value), sube = numero(f.sube.value);
    if ((f.baja.value.trim() && !(baja > 0)) || (f.sube.value.trim() && !(sube > 0))) { $('#errSeg', h.el).textContent = L('Pon un precio en euros, por ejemplo 12,50.', 'Enter a price in euros, e.g. 12.50.'); return; }
    if (baja > 0 && sube > 0 && baja >= sube) { $('#errSeg', h.el).textContent = L('El de bajada tiene que ser menor que el de subida.', 'The lower one must be below the upper one.'); return; }
    it.baja = baja > 0 ? baja : null; it.sube = sube > 0 ? sube : null;
    const c = avisosCfg();
    await guardarYPintar(`Aviso de ${it.n}`, h);
    if (!c.on) toast(L('Guardado. Para que te llegue, activa los avisos en Ajustes > Avisos y resumen.', 'Saved. To get it, turn on alerts in Settings > Alerts and summary.'), 6000);
  };
}
function htmlSiguiendo(M) {
  const xs = siguiendo();
  if (!xs.length) return `<section class="ov-vacio seg-vacio"><h2>${L('Sigue empresas sin tenerlas', 'Follow companies you don’t own')}</h2><p>${L('En cualquier idea de compra o empresa del radar, toca «Seguir». Aquí verás cómo van desde que las sigues, lo que esperan los analistas, y te aviso al precio que digas.', 'On any buy idea or radar company, tap «Follow». Here you’ll see how they’ve done since, what analysts expect, and I’ll alert you at the price you choose.')}</p><button type="button" class="btn pri" data-exp="ideas">${L('Ver las ideas de compra', 'See the buy ideas')}</button></section>`;
  const filas = xs.map((it) => {
    const pr = precioSeguido(it), x = pr && pr.x;
    const desde = pr && pr.eur && it.p0 ? (pr.eur / it.p0 - 1) * 100 : null;
    const e = x ? esperadaRadar(x, null) : null, q = e && e.prin;
    const aviso = [it.baja && L(`si baja de ${precioFmt(it.baja)}`, `below ${precioFmt(it.baja)}`), it.sube && L(`si sube de ${precioFmt(it.sube)}`, `above ${precioFmt(it.sube)}`)].filter(Boolean);
    const cerca = pr && pr.eur && ((it.baja && pr.eur <= it.baja * 1.03) || (it.sube && pr.eur >= it.sube * 0.97));
    return `<article class="seg">
      <button type="button" class="seg-cab" data-consulta="${esc(it.s)}">${logo(x && x.w, it.n)}<span class="seg-n"><b>${esc(it.n)}</b><small>${x ? lineaOrigenCorta(x) : esc(it.s)}</small></span>
        <span class="seg-p">${pr && pr.eur ? `<b>${precioFmt(pr.eur)}</b>` : '<b>—</b>'}${pr && pr.dia != null ? `<small class="${cls(pr.dia)}">${pctS(pr.dia, 1)} ${L('hoy', 'today')}</small>` : ''}</span></button>
      <div class="seg-datos">
        <div><span class="k">${L('Desde que la sigues', 'Since you followed')}</span><b class="${cls(desde)}">${desde == null ? '—' : pctS(desde, 1)}</b><small>${L(`el ${fechaCorta(it.desde)}`, `on ${fechaCorta(it.desde)}`)}${it.p0 ? `, ${precioFmt(it.p0)}` : ''}</small></div>
        <div><span class="k">${L('Lo que esperan', 'What they expect')}</span><b class="${cls(q && q.subida)}">${q ? pctS(q.subida, 0) : '—'}</b><small>${q ? `${L('en', 'in')} ${plazoTxt(q.meses)}${x && x.na ? L(`, ${x.na} analistas`, `, ${x.na} analysts`) : ''}` : L('sin objetivo de analistas', 'no analyst target')}</small></div>
        <div><span class="k">${L('Aviso', 'Alert')}</span><b class="${cerca ? 'warn' : ''}">${aviso.length ? esc(aviso.join(L(' o ', ' or '))) : L('ninguno', 'none')}</b><small>${cerca ? L('¡ya está cerca!', 'it’s close!') : ''}</small></div>
      </div>
      <div class="seg-btns"><button type="button" class="btn peq" data-seg-aviso="${esc(it.s)}">${ICONOS.campana}${aviso.length ? L('Cambiar aviso', 'Change alert') : L('Ponerle aviso', 'Add alert')}</button><button type="button" class="btn peq" data-accion="asesor" data-q="${esc(L(`¿Qué me dices de ${it.n} (${it.s})? La sigo sin tenerla: ¿es momento de comprar, a qué precio y cuánto meter?`, `What do you think of ${it.n} (${it.s})? I follow it without owning it: is it time to buy, at what price and how much?`))}">${ICONOS.growia}${L('¿La compro?', 'Should I buy?')}</button>${botonSeguir(it.s, it.n)}</div>
    </article>`;
  }).join('');
  return `<section aria-labelledby="hSeg" class="bloque-sec"><div class="sec-cab"><h2 id="hSeg">${L('Las que sigues', 'What you follow')}</h2><span class="k">${xs.length === 1 ? L('una empresa', 'one company') : L(`${xs.length} empresas`, `${xs.length} companies`)}</span></div>
    <div class="pila" style="gap:14px">${filas}</div>
    <p class="nota">${L('Precios del radar de GrowFolio, en euros. Los avisos te llegan una vez, sin abrir la app si la tienes en el móvil con los avisos activados.', 'Prices from the GrowFolio radar, in euros. Alerts reach you once, without opening the app if you have it on your phone with alerts on.')}</p></section>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-seguir],[data-seg-aviso]'); if (!b || !S.cartera) return;
  e.preventDefault(); e.stopPropagation();
  if (b.dataset.segAviso) editarAvisoSeguido(b.dataset.segAviso);
  else seguir(b.dataset.seguir, b.dataset.seguirN);
}, true);
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-consulta]'); if (!b || !S.cartera || e.gfHecho) return;
  // 0.7i: en una tarjeta o fila que abre la empresa, los enlaces y botones de dentro hacen lo suyo
  const dentro = e.target.closest('a, button, input, select, label, summary');
  if (dentro && dentro !== b && b.contains(dentro)) return;
  const sim = b.dataset.consulta, c = candidatoDeSim(sim);
  const x = radarPorSim(sim);
  abrirConsulta(c || (x ? { k: 'radar:' + sim, n: nombreRadar(x), l: x.n, s: sim, isin: '', dom: x.w, cot: { cod: null, txt: x.z || '' }, tengo: false } : null));
});

