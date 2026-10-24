/* =========================== Expertos =========================== */
const CONSENSO = { strong_buy: 'Compra fuerte', buy: 'Comprar', hold: 'Mantener', underperform: 'Infraponderar', sell: 'Vender', strong_sell: 'Venta fuerte' };
function htmlVotos(v, conLeyenda = true) {
  if (!v) return '';
  const n = v.strongBuy + v.buy + v.hold + v.sell + v.strongSell;
  if (!n) return '';
  const partes = [['sb', v.strongBuy, 'Compra fuerte'], ['b', v.buy, 'Comprar'], ['h', v.hold, 'Mantener'], ['s', v.sell, 'Vender'], ['ss', v.strongSell, 'Venta fuerte']];
  return `<div class="votos" role="img" aria-label="${esc(partes.filter((x) => x[1]).map((x) => `${x[2]}: ${x[1]}`).join(', '))}">${partes.filter((x) => x[1]).map(([c, k]) => `<i class="${c}" style="flex:${k}"></i>`).join('')}</div>
    ${conLeyenda ? `<div class="votos-ley">${partes.filter((x) => x[1]).map(([c, k, t]) => `<span><i class="${c}"></i>${t} ${k}</span>`).join('')}</div>` : ''}`;
}
const precioCorto = (p) => (p == null ? '—' : fmtNum(p, p >= 1000 ? 0 : 2) + ' €');
const capital = (n) => (n == null ? '—' : n >= 1e12 ? L(`${fmtNum(n / 1e12, 2)} billones €`, `${fmtNum(n / 1e12, 2)} trillion €`) : n >= 1e9 ? fmtNum(n / 1e9, n >= 1e11 ? 0 : 1) + ' mil millones €' : fmtNum(n / 1e6, 0) + ' millones €');
function htmlObjetivo(a, precio) {
  if (!a || !a.objetivo || !precio) return '';
  const lo = Math.min(a.objetivo_bajo || a.objetivo, precio), hi = Math.max(a.objetivo_alto || a.objetivo, precio);
  const pad = (hi - lo) * 0.08 || hi * 0.05;
  const x = (v) => (((v - (lo - pad)) / (hi - lo + 2 * pad)) * 100).toFixed(2) + '%';
  const pot = (a.objetivo / precio - 1) * 100;
  return `<div><div class="objetivo" role="img" aria-label="Precio ${precioFmt(precio)}, objetivo medio ${precioFmt(a.objetivo)}, rango ${precioFmt(a.objetivo_bajo)} a ${precioFmt(a.objetivo_alto)}">
      <div class="pista"></div>
      ${a.objetivo_bajo && a.objetivo_alto ? `<div class="rango" style="left:${x(a.objetivo_bajo)};width:calc(${x(a.objetivo_alto)} - ${x(a.objetivo_bajo)})"></div>` : ''}
      <div class="marca" style="left:${x(a.objetivo)}"></div><div class="hoy" style="left:${x(precio)}" title="Precio actual"></div>
    </div>
    <div class="objetivo-ley"><span>Mínimo ${precioCorto(a.objetivo_bajo)}</span><span>Medio <b class="${cls(pot)}">${precioCorto(a.objetivo)} (${pctS(pot, 1)})</b></span><span>Máximo ${precioCorto(a.objetivo_alto)}</span></div></div>`;
}

const RE_ANALISTA = /analista|precio objetivo|recomienda|recomendaci|potencial|eleva|rebaja|sobreponderar|infraponderar|comprar|vender|JP ?Morgan|Goldman|Morgan Stanley|Citi|UBS|Barclays|Jefferies|Bernstein|Deutsche|Bankinter|Renta 4|Santander|BBVA Research|CaixaBank|Kepler|HSBC|RBC|Bank of America|BofA|Berenberg|Alantra|Sabadell/i;
function noticiasCartera(soloAnalistas) {
  const N = (S.precios && S.precios.noticias) || {};
  const out = [];
  const ids = new Set((S.cartera.posiciones || []).map((p) => p.instrumento));
  for (const id of ids) for (const n of N[id] || []) if (!soloAnalistas || RE_ANALISTA.test(n.t)) out.push({ ...n, id });
  const vistos = new Set();
  return out.sort((a, b) => ((b.d || '') > (a.d || '') ? 1 : -1)).filter((n) => { const k = n.t.slice(0, 50); if (vistos.has(k)) return false; vistos.add(k); return true; });
}
/* 0.7: cada titular, con su marca de las fichas de GrowIA (factor, positivo o negativo para la empresa según la prensa, cuánto importa); lo importante
   arriba, el relleno abajo y el mismo titular de varios medios, una vez (13b-fichas.js) */
function htmlNoticias(lista, conActivo = false, max = 12, desde = 0) {
  if (!lista.length) return '<div class="vacio">No hay noticias recientes.</div>';
  if (!S.fichas) fichasLuego();
  return `<ul class="noticias">${ordenarNoticias(lista).slice(desde, desde + max).map(({ n, m, mas }) => `<li${m && m[2] === 0 ? ' class="relleno"' : ''}><a class="noti" href="${esc(urlSegura(n.u))}" target="_blank" rel="noopener noreferrer" data-nf="${esc(n.f || '')}" data-nd="${esc(n.d || '')}">${esc(n.t)}</a><small>${chipMarca(m)}${conActivo && n.id ? `${esc((S.inst[n.id] && S.inst[n.id].corto) || n.id)}, ` : ''}${esc(n.f || '')}${n.d ? `, ${haceCuanto(n.d)}` : ''}${mas ? `<span class="mas-medios">${L(`y ${mas} ${mas === 1 ? 'medio más' : 'medios más'}`, `and ${mas} more ${mas === 1 ? 'outlet' : 'outlets'}`)}</span>` : ''}</small></li>`).join('')}</ul>`;
}

/* Las noticias se leen dentro (0.2.4): al tocar una sale una hoja con su resumen, que escribe GrowIA (Gemini, con tu
   clave de Google) leyendo el enlace y, si no puede abrirlo, buscándola por su titular y su medio. Abajo, la original.
   Sin clave de Google, la hoja ofrece activarla o abrir la noticia. Con Ctrl o Cmd se abre la web, como siempre. */
const RES_NOT = new Map();
document.addEventListener('click', (e) => {
  const a = e.target.closest('a.noti'); if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button) return;
  e.preventDefault();
  abrirNoticia({ t: a.textContent.trim(), f: a.dataset.nf || '', d: a.dataset.nd || '', u: a.href });
});
function abrirNoticia(n) {
  const clave = AS.claves && AS.claves.google;
  const h = hoja(L('La noticia', 'The article'), `<div class="not-h">
    <p class="not-src">${esc(n.f || '')}${n.d ? `${n.f ? ', ' : ''}${haceCuanto(n.d)}` : ''}</p>
    <h3 class="not-t" data-no-trad>${esc(n.t)}</h3>
    <div class="not-cuerpo" aria-live="polite">${clave ? `<p class="not-lee">${ICONOS.growia}${L('GrowIA está leyendo la noticia…', 'GrowIA is reading the article…')}</p><div class="not-esq" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`
      : `<p class="nota" style="margin:0">${L('Con GrowIA activada (gratis, con tu clave de Google) aquí te sale el resumen de la noticia entera sin salir de GrowFolio.', 'With GrowIA on (free, with your Google key) you get a summary of the whole article here, without leaving GrowFolio.')}</p>`}</div>
    <div class="fila-btns not-btns">${clave ? '' : `<button type="button" class="btn pri" data-not-ia>${ICONOS.growia}${L('Activar GrowIA', 'Turn on GrowIA')}</button>`}<a class="btn" href="${esc(n.u)}" target="_blank" rel="noopener noreferrer">${L('Abrir la original', 'Open the original')}</a></div>
  </div>`);
  h.el.classList.add('hoja-not');
  const bIA = $('[data-not-ia]', h.el); if (bIA) bIA.onclick = () => { h.cerrar(true); abrirAsesor(); };
  if (!clave) return;
  const ctl = new AbortController(), cuerpo = $('.not-cuerpo', h.el);
  new MutationObserver((m, o) => { if (!document.body.contains(h.el)) { ctl.abort(); o.disconnect(); } }).observe(document.body, { childList: true });
  resumirNoticia(n, clave, ctl.signal).then((r) => {
    if (!document.body.contains(cuerpo)) return;
    if (r.noEncontrada) { cuerpo.innerHTML = `<p class="nota" style="margin:0">${L('GrowIA no ha podido leer esta noticia (puede que sea de pago o que la web no la deje abrir). Ábrela en su web con el botón de abajo.', 'GrowIA could not read this article (it may be paywalled or the site blocks it). Open it on its site with the button below.')}</p>`; return; }
    const par = r.texto.split(/\n\s*\n|\n(?=Para tu cartera:)/).map((x) => x.replace(/\*\*/g, '').trim()).filter(Boolean);
    cuerpo.innerHTML = par.map((x) => /^Para tu cartera:/i.test(x) ? `<p class="not-tuyo"><b>${L('Para tu cartera', 'For your portfolio')}:</b> ${esc(x.replace(/^Para tu cartera:\s*/i, ''))}</p>` : `<p>${esc(x)}</p>`).join('')
      + `<p class="not-pie">${L('Resumen de GrowIA: puede equivocarse en algún detalle; la original manda.', 'Summary by GrowIA: it may get a detail wrong; the original is what counts.')}${r.fuentes.length ? ` ${L('Leído en', 'Read on')} ${r.fuentes.slice(0, 3).map((f) => `<a href="${esc(f.u)}" target="_blank" rel="noopener noreferrer">${esc(f.t)}</a>`).join(', ')}.` : ''}</p>`;
  }).catch((e) => {
    if (e.name === 'AbortError' || !document.body.contains(cuerpo)) return;
    cuerpo.innerHTML = `<p class="nota" style="margin:0">${esc(e.message || L('No se ha podido hacer el resumen.', 'Could not make the summary.'))} ${L('Puedes abrir la noticia en su web.', 'You can open it on its site.')}</p>`;
  });
}
async function resumirNoticia(n, clave, signal) {
  if (RES_NOT.has(n.u)) return RES_NOT.get(n.u);
  const mias = ((S.M && S.M.filas) || []).map((f) => f.inst.corto || f.inst.nombre).filter(Boolean).slice(0, 30).join(', ');
  const pedido = `Lee esta noticia y resúmela en español de España para alguien que invierte su dinero.
Titular: «${n.t}»
Medio: ${n.f || 'no se sabe'}${n.d ? `\nPublicada: ${String(n.d).slice(0, 10)}` : ''}
Enlace (de Google Noticias, lleva a la noticia): ${n.u}
Si no puedes abrir el enlace, búscala en internet por su titular y su medio. Resume solo esa noticia, no otras parecidas.
Escribe 3 o 4 párrafos cortos, separados por una línea en blanco, con lo que cuenta: qué ha pasado, quién, las cifras y las fechas, y por qué importa. Sin título, sin listas y sin markdown.${mias ? `\nSi la noticia afecta a algo de lo que tiene en su cartera (${mias}), añade al final un párrafo que empiece por «Para tu cartera:» con cómo le afecta, en una o dos frases. Si no le afecta, no lo pongas.` : ''}
Si no encuentras la noticia, contesta solo NO_ENCONTRADA.`;
  const pide = (modelo, tools) => fetchGoogle(`${GEMINI}/models/${modelo}:generateContent`, { method: 'POST', signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: pedido }] }], tools, generationConfig: { temperature: 0.3, maxOutputTokens: 1400 } }) }, clave);
  let ultimo = null;
  // primero la rápida (la de más cupo); si se le ha acabado, la buena. Primero leyendo el enlace y buscando; si el
  // modelo no deja leer enlaces, solo buscando
  for (const modelo of [MODELO_RAPIDO, MODELO_DEF].filter((m, i, a) => a.indexOf(m) === i && !agotadosIA().includes(m))) {
    for (const tools of [[{ url_context: {} }, { google_search: {} }], [{ google_search: {} }]]) {
      const r = await pide(modelo, tools);
      if (!r.ok) {
        let j = null; try { j = await r.json(); } catch (e) {}
        ultimo = errorGoogle(r.status, j);
        if (ultimo.diario) marcarAgotado(modelo);
        if (r.status === 400 && tools.length > 1) continue;
        break;
      }
      const j = await r.json(), c = (j.candidates || [])[0] || {};
      const texto = ((c.content && c.content.parts) || []).map((x) => x.text || '').join('').trim();
      if (!texto || /NO_ENCONTRADA/.test(texto)) return { noEncontrada: true };
      const fuentes = ((c.groundingMetadata && c.groundingMetadata.groundingChunks) || []).map((g) => g.web).filter((w) => w && w.uri).map((w) => ({ t: w.title || w.uri, u: w.uri }));
      const res = { texto, fuentes };
      RES_NOT.set(n.u, res);
      return res;
    }
  }
  throw ultimo || new Error(L('No se ha podido hacer el resumen.', 'Could not make the summary.'));
}

const ORDEN_SENAL = ['vender', 'recoger', 'reducir', 'comprar', 'vigilar', 'aportar', 'mantener'];
function resumenSenales(M) {
  if (esPublico()) {
    const c = {}; for (const f of M.filas) if (f.senal.nivel !== 'nada') c[f.senal.nivel] = (c[f.senal.nivel] || 0) + 1;
    const pal = { comprar: L('comprar', 'buy'), mantener: L('mantener', 'hold'), vender: L('vender', 'sell') };
    const t = ['comprar', 'mantener', 'vender'].filter((k) => c[k]).map((k) => `${c[k]} ${pal[k]}`).join(', ');
    return t ? `${L('Analistas', 'Analysts')}: ${t}` : '';
  }
  const c = {};
  for (const f of M.filas) c[f.senal.nivel] = (c[f.senal.nivel] || 0) + 1;
  return ORDEN_SENAL.filter((k) => c[k]).map((k) => `${c[k]} ${trad(SENALES[k]).toLowerCase()}`).join(', ');
}
const ZONAS = ['Todas', 'España', 'Europa', 'EEUU'];
/* ---------- de qué lado cae cada recomendación (para ver si la web y la IA coinciden) ---------- */
const LADO = { comprar: 1, aportar: 0, mantener: 0, vigilar: 0, recoger: -1, reducir: -1, vender: -1 };
const NIVELES = new Set(Object.keys(LADO));

/* qué tan frescos están los datos que hay detrás de cada recomendación */
function htmlFrescura() {
  const ia = iaActual();
  const lento = Object.values((S.precios && S.precios.instrumentos) || {}).map((p) => p.lento).filter(Boolean).sort().pop();
  const rg = S.radar && S.radar.generado, rp = S.radar && S.radar.precios;
  const hora = (t) => { const d = new Date(t); return isNaN(d) ? '—' : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); };
  const cuando = (t) => { const d = new Date(t); if (isNaN(d)) return '—'; const hoy = new Date(); return d.toDateString() === hoy.toDateString() ? `hoy a las ${hora(t)}` : fechaLarga(iso(d)) + ` a las ${hora(t)}`; };
  const datos = [
    lento && `Analistas de tus posiciones: ${haceCuanto(lento)}`,
    rg && `Radar: ${radarVals().length} empresas, fichas ${haceCuanto(rg)}${rp ? `, precios ${haceCuanto(rp)}` : ''}`,
    S.informe && S.informe.generado && `Prensa de tu cartera leída por GrowIA: ${haceCuanto(S.informe.generado)}`,
    S.escaneo && S.escaneo.leidas_24h && `Escaneo de prensa: ${S.escaneo.leidas_24h} empresas leídas en 24 h`,
    ia && ia.propio ? `Análisis de ${esc(ia.autor)}: ${cuando(ia.fecha)}` : AS.clave ? `${nombreIA()}: sin análisis propio todavía` : '',
  ].filter(Boolean);
  return `<div class="frescura" aria-label="Frescura de los datos">
    <details><summary><span class="vivo-dot${S.precios && S.precios.generado && Date.now() - new Date(S.precios.generado) > 3 * 3600e3 ? ' viejo' : ''}">${S.precios && S.precios.generado && Date.now() - new Date(S.precios.generado) > 3 * 3600e3 ? L(`Precios de ${haceCuanto(S.precios.generado)}`, `Prices from ${haceCuanto(S.precios.generado)}`) : L('Al día', 'Up to date')}${S.precios && S.precios.generado && Date.now() - new Date(S.precios.generado) > 3 * 3600e3 ? '' : `<span class="fr-hora"> · ${B('recalc')}</span>`}</span>${S.informe && S.informe.generado ? `<span>· ${L('prensa de', 'news from')} ${haceCuanto(S.informe.generado)}</span>` : ''}<span class="fr-mas" title="${L('De cuándo es cada dato', 'How fresh each figure is')}" aria-label="${L('De cuándo es cada dato', 'How fresh each figure is')}">${ICONOS.info}</span></summary>
      <ul>${datos.map((x) => `<li>${x}</li>`).join('')}<li>Señales, planes e ideas: se recalculan con cada precio en directo</li></ul></details>
    ${AS.clave ? '' : '<button class="enlace acento" data-accion="asesor">GrowIA ya lee la prensa para todos; con tu clave gratis de Google revisará también tus cifras cada día</button>'}
    ${(() => { const g = S.escaneo && S.escaneo.gemini; if (!g || g.ok) return ''; const e = (g.errores || []).join(' '); const por = !g.con_clave ? 'falta el secreto GEMINI_API_KEY en GitHub' : /429/.test(e) ? `se ha acabado el cupo gratuito de Google por hoy; se renueva a las ${horaRenuevaIA()}` : /40[13]/.test(e) ? 'Google no acepta la clave del secreto GEMINI_API_KEY' : 'Google no ha respondido bien'; return `<span class="fr-aviso">${ICONOS.alerta}En la última pasada automática GrowIA no ha podido leer la prensa: ${esc(por)}. Se queda lo último que leyó.</span>`; })()}
  </div>`;
}

function datosExperto(f) {
  const p = f.p || {}, a = p.analistas;
  if (a && a.num) {
    return `<div class="fx-an"><span class="k">${a.num} analistas${a.recomendacion ? `, consenso <b>${esc(a.recomendacion.toLowerCase())}</b>` : ''}</span>${a.votos && a.votos.ahora ? htmlVotos(a.votos.ahora, false) : ''}</div>${htmlObjetivo(a, f.precio)}`;
  }
  const r = p.rent || {}, d = [];
  if (p.fondo && p.fondo.morningstar) d.push(`<span>Morningstar <span class="estrellas">${'★'.repeat(p.fondo.morningstar)}<span class="k">${'★'.repeat(5 - p.fondo.morningstar)}</span></span></span>`);
  if (f.inst.ter != null) d.push(`<span>Gastos <b>${pct(f.inst.ter, 2)}</b> al año</span>`);
  if (r['5a_anual'] != null) d.push(`<span>5 años <b class="${cls(r['5a_anual'])}">${pctS(r['5a_anual'], 1)}</b> al año</span>`);
  else if (r['1a'] != null) d.push(`<span>1 año <b class="${cls(r['1a'])}">${pctS(r['1a'], 1)}</b></span>`);
  if (p.volatilidad) d.push(`<span>Volatilidad <b>${fmtNum(p.volatilidad, 0)} %</b></span>`);
  return d.length ? `<div class="fx-kv">${d.join('')}</div>` : '';
}
/* 0.3: cada posición en una fila que se abre: el nombre, la señal (y si GrowIA coincide) y el motivo principal en una
   línea; al tocarla, todos los porqués */
function filaExperto2(f, ia, vIA = {}) {
  const i = f.inst, s = f.senal;
  const c = ia && ia.posiciones && ia.posiciones[i.id];
  const nivelC = c && NIVELES.has(c.nivel) ? c.nivel : null;
  const coinciden = nivelC && LADO[nivelC] === LADO[s.nivel];
  const [m0, ...resto] = s.motivos;
  const prensa = htmlPrensaIA(informeDe(i.id)), datos = datosExperto(f);
  const iaTxt = !c ? L('GrowIA aún no la ha revisado', 'Not yet reviewed by GrowIA') : !nivelC ? L('GrowIA la ha revisado', 'Reviewed by GrowIA') : coinciden ? L('GrowIA coincide', 'GrowIA agrees') : L(`GrowIA dice «${(c.veredicto || SENALES[nivelC] || '').toLowerCase()}»`, `GrowIA says «${(c.veredicto || SENALES[nivelC] || '').toLowerCase()}»`);
  return `<details class="fx3">
    <summary>${logo(i.dominio, i.corto || i.nombre)}<span class="fx3-n"><b>${esc(i.corto || i.nombre)}</b><small>${m0 ? esc(m0) : `${esc(f.pos.plataforma || '')}`}</small>${potCorto(esperadaPos(f))}</span>
      <span class="fx3-s"><span class="senal ${s.nivel}">${esc(s.txt)}</span><small class="${!c ? '' : coinciden ? 'ok' : 'no'}">${esc(iaTxt)}</small></span><i class="aj-flecha" aria-hidden="true"></i></summary>
    <div class="fx3-det">
      <p class="fx3-pos">${chipCotiza(i)}<span>${esc(f.pos.plataforma || '')}, ${B('pw:' + f.pos.id)} ${L('de tu cartera', 'of your portfolio')}</span></p>
      ${m0 ? `<p class="fx2-m">${esc(m0)}</p>` : ''}
      ${resto.length ? `<div><span class="fx-de">${L('Números', 'Numbers')}</span><ul class="motivos">${resto.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
      ${c && (c.texto || c.vigilar) ? `<div><span class="fx-de">${NOM_IA}${nivelC ? ` · <span class="senal ${nivelC}">${esc(c.veredicto || SENALES[nivelC])}</span>` : ''}</span>${c.texto ? `<p>${rellenarIA(c.texto, vIA)}</p>` : ''}${c.vigilar ? `<p class="fx-vig"><b>${L('Vigilar.', 'Watch.')}</b> ${rellenarIA(c.vigilar, vIA)}</p>` : ''}</div>` : ''}
      ${prensa}
      ${datos ? `<div class="fx-datos">${datos}</div>` : ''}
      <button class="btn peq" data-pos="${esc(f.pos.id)}">${L('Abrir su ficha', 'Open its details')}</button>
    </div>
  </details>`;
}
function filaExperto(f, ia, vIA = {}) {
  const i = f.inst, s = f.senal;
  const c = ia && ia.posiciones && ia.posiciones[i.id];
  const nivelC = c && NIVELES.has(c.nivel) ? c.nivel : 'mantener';
  const choca = c && LADO[nivelC] !== LADO[s.nivel];
  const [m0, ...resto] = s.motivos;
  const prensa = htmlPrensaIA(informeDe(i.id));
  const datos = datosExperto(f);
  return `<article class="fx2">
    <div class="fx2-cab">${logo(i.dominio, i.corto || i.nombre)}<div><button class="enlace" data-pos="${esc(f.pos.id)}">${esc(i.corto || i.nombre)}</button><small>${chipCotiza(i)}<span>${esc(f.pos.plataforma || '')}, ${B('pw:' + f.pos.id)} de tu cartera</span></small></div></div>
    ${c && !choca && normTxt(c.veredicto || SENALES[nivelC]) === normTxt(s.txt)
      ? `<div class="fx2-senales"><span class="fx-par"><span class="fx-de">Números e IA</span><span class="senal ${s.nivel}">${esc(s.txt)}</span></span><span class="fx-ok">coinciden</span></div>`
      : `<div class="fx2-senales"><span class="fx-par"><span class="fx-de">Números</span><span class="senal ${s.nivel}">${esc(s.txt)}</span></span><span class="fx-par"><span class="fx-de">${NOM_IA}</span>${c ? `<span class="senal ${nivelC}">${esc(c.veredicto || SENALES[nivelC])}</span>` : '<span class="k">sin revisar</span>'}</span>${c ? (choca ? '<span class="chip warn">no coinciden</span>' : '<span class="chip" title="Van en la misma dirección, pero GrowIA lo dice con otro matiz: lee su motivo">GrowIA matiza</span>') : ''}</div>`}
    ${m0 ? `<p class="fx2-m">${esc(m0)}</p>` : ''}
    ${resto.length || c || prensa || datos ? `<details class="mas"><summary>Por qué</summary><div class="fx2-det">
      ${resto.length ? `<div><span class="fx-de">Números</span><ul class="motivos">${resto.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
      ${c && (c.texto || c.vigilar) ? `<div><span class="fx-de">${NOM_IA}</span>${c.texto ? `<p>${rellenarIA(c.texto, vIA)}</p>` : ''}${c.vigilar ? `<p class="fx-vig"><b>Vigilar.</b> ${rellenarIA(c.vigilar, vIA)}</p>` : ''}</div>` : ''}
      ${prensa}
      ${datos ? `<div class="fx-datos">${datos}</div>` : ''}
    </div></details>` : ''}
  </article>`;
}

/* Expertos va en tres pestañas: el resumen (qué hacer), el detalle de cada posición y las ideas de compra */
const EXPERTOS = [['posiciones', 'Tus posiciones'], ['ideas', 'Ideas de compra'], ['siguiendo', 'Siguiendo']];
const idxSenal = (n) => { const i = ORDEN_SENAL.indexOf(n); return i < 0 ? 99 : i; };
const ordenSenales = (M) => [...M.filas].sort((a, b) => idxSenal(a.senal.nivel) - idxSenal(b.senal.nivel) || b.valor - a.valor);
function htmlVistazo(M, ia) {
  const vistos = new Set();
  const filas = ordenSenales(M).filter((f) => { if (vistos.has(f.inst.id)) return false; vistos.add(f.inst.id); return true; });
  return `<section aria-labelledby="hVis"><div class="sec-cab"><h2 id="hVis">Tus posiciones de un vistazo</h2><span class="k">${resumenSenales(M)}</span></div>
    <ul class="vistazo">${filas.map((f) => {
      const s = f.senal, c = ia && ia.posiciones && ia.posiciones[f.inst.id];
      const nivelC = c && NIVELES.has(c.nivel) ? c.nivel : null;
      const choca = nivelC && LADO[nivelC] !== LADO[s.nivel];
      return `<li><button class="vistazo-f" data-pos="${esc(f.pos.id)}">${logo(f.inst.dominio, f.inst.corto || f.inst.nombre)}
        <span class="vistazo-t"><b>${esc(f.inst.corto || f.inst.nombre)}</b><small>${esc(s.motivos[0] || '')}</small>${choca ? `<small class="vistazo-ia">GrowIA dice otra cosa: ${esc((c.veredicto || SENALES[nivelC]).toLowerCase())}</small>` : ''}</span>
        <span class="senal ${s.nivel}">${esc(s.txt)}</span></button></li>`;
    }).join('')}</ul>
    <button class="enlace acento ver-mas" data-exp="posiciones">Ver los motivos, GrowIA y los analistas de cada una</button>
  </section>`;
}
function vistaExpertos(M) {
  if (S.expTab === 'resumen') S.expTab = 'posiciones';
  if (!EXPERTOS.some(([k]) => k === S.expTab)) S.expTab = 'posiciones';
  const ia = iaActual();
  const planes = M.filas.map((f) => planVenta(f, M)).filter(Boolean);
  S.radarVisibles = [];
  let cuerpo = '';
  if (S.expTab === 'posiciones') {
    const prensa = noticiasCartera(true);
    cuerpo = `${planes.length ? `<section aria-labelledby="hPlanV">
      <div class="sec-cab"><h2 id="hPlanV">Qué vender o recortar</h2><span class="k">${planes.length === 1 ? 'una posición' : planes.length + ' posiciones'}, con el plan completo</span></div>
      <div class="pila" style="gap:16px">${planes.map((pl) => htmlPlanVenta(pl, 'plegado')).join('')}</div>
    </section>` : ''}
    <section aria-labelledby="hSen" class="bloque-sec">
      <div class="sec-cab"><h2 id="hSen">Posición a posición</h2><span class="k">${resumenSenales(M)}</span></div>
      <div class="fx3-lista">${(() => { const vIA = ia ? valoresIA(M) : {}; const vistos = new Set(); return ordenSenales(M).filter((f) => !vistos.has(f.pos.id) && vistos.add(f.pos.id)).map((f) => filaExperto2(f, ia, vIA)).join(''); })()}</div>
      <p class="nota">${esPublico() ? L('La etiqueta es lo que opinan los analistas que siguen cada empresa (Yahoo Finance): su opinión, no un consejo de GrowFolio. GrowIA lee las noticias de cada una.', 'The label is what the analysts covering each company think (Yahoo Finance): their opinion, not advice from GrowFolio. GrowIA reads the news on each one.') : 'GrowFolio mira el consenso de los analistas, lo que queda hasta su precio objetivo, la tendencia, tus reglas de salida y lo que pesa en tu cartera. GrowIA, además, lee las noticias. Si no coinciden, lee los dos motivos antes de decidir.'}</p>
    </section>
    ${htmlResumenInforme(true)}
    <details class="num-sec"><summary><span><b>Analistas en prensa</b><small>titulares sobre lo que tienes, de los últimos 30 días</small></span></summary><div class="num-cuerpo">${htmlNoticias(prensa.length ? prensa : noticiasCartera(false), true, 10)}</div></details>`;
  } else if (S.expTab === 'siguiendo') {
    cuerpo = htmlSiguiendo(M);
  } else {
    cuerpo = `<section aria-labelledby="hIdeas" class="bloque-sec">${htmlIdeas(M, ia)}</section>`;
  }
  const marca = { posiciones: planes.length, siguiendo: siguiendo().length };
  return `
  <div class="vista-cab vc-corta"><h1>Expertos</h1><p>Lo que dicen analistas, prensa y GrowIA de lo tuyo y de lo que podrías comprar.</p></div>
  ${htmlFrescura()}
  <div class="subvistas exp-tabs" role="group" aria-label="Qué ver">${EXPERTOS.map(([k, t]) => `<button data-exp="${k}" aria-pressed="${S.expTab === k}">${t}${marca[k] ? `<span class="cuenta">${marca[k]}</span>` : ''}</button>`).join('')}</div>
  <div class="pila">${cuerpo}</div>`;
}

/* ---------- ideas para comprar ---------- */
function puntuarIdea(x, ctx) {
  const motivos = [], pegas = [];
  let p = 0;
  // el recorrido cuenta con su plazo: si Gemini ha estimado cuánto y en cuánto tiempo, se promedia con
  // lo de los analistas (a 12 meses) pasado a "al año"
  const g = plazoGemini(x.s);
  const potG = g ? anualizar(g.subida_pct, Math.max(g.meses, 3)) : null;
  const pot = Math.max(-50, Math.min(potG != null ? (x.pot + potG) / 2 : x.pot, 50));
  p += 1.2 * (pot / 50);
  motivos.push(L(`los analistas creen que puede subir un ${fmtNum(x.pot, 0)} %${g ? ` y GrowIA, un ${fmtNum(g.subida_pct, 0)} % en ${plazoTxt(g.meses)}` : ''}`, `analysts see ${fmtNum(x.pot, 0)} % upside${g ? ` and GrowIA ${fmtNum(g.subida_pct, 0)} % in ${plazoTxt(g.meses)}` : ''}`));
  const rm = x.rm ?? 3;
  p += Math.max(-1, Math.min(1, (2.6 - rm) / 1.6));
  if (rm <= 1.6) motivos.push(L(`consenso de compra fuerte entre ${x.na} analistas`, `strong buy consensus among ${x.na} analysts`));
  else motivos.push(L(`${x.na} analistas, consenso de compra`, `${x.na} analysts, buy consensus`));
  p += 0.5 * (Math.min(x.na || 0, 30) / 30);
  if (x.perf > 0 && x.perf < 10) { p += 0.4; motivos.push(L(`barata: PER futuro de ${fmtNum(x.perf, 1)}`, `cheap: forward P/E of ${fmtNum(x.perf, 1)}`)); }
  else if (x.perf > 0 && x.perf < 15) { p += 0.3; motivos.push(L(`PER futuro de ${fmtNum(x.perf, 1)}`, `forward P/E of ${fmtNum(x.perf, 1)}`)); }
  else if (x.perf > 0 && x.perf < 22) p += 0.1;
  else if (x.perf >= 30) { p -= 0.3; pegas.push(L(`cara: PER futuro de ${fmtNum(x.perf, 0)}`, `expensive: forward P/E of ${fmtNum(x.perf, 0)}`)); }
  if (x.c1a != null) {
    if (x.c1a < -15) { p -= 0.3; pegas.push(L(`ha caído un ${fmtNum(-x.c1a, 0)} % en un año: el mercado duda de algo`, `down ${fmtNum(-x.c1a, 0)} % in a year: the market doubts something`)); }
    else if (x.c1a > 90) { p -= 0.15; pegas.push(L(`ya ha subido un ${fmtNum(x.c1a, 0)} % en un año`, `already up ${fmtNum(x.c1a, 0)} % in a year`)); }
  }
  if (x.div >= 2) { p += 0.1; motivos.push(L(`dividendo del ${fmtNum(x.div, 1)} %`, `${fmtNum(x.div, 1)} % dividend`)); }
  const ctr = contraste(x);
  p += 0.22 * ctr.favor - 0.3 * ctr.contra;
  motivos.push(L(`contrastada: ${ctr.favor} de ${ctr.total} señales a favor`, `checked: ${ctr.favor} of ${ctr.total} signals in favour`));
  for (const c of ctr.checks) if (c.ok === -1) pegas.push(`${c.k.toLowerCase()} en contra: ${c.txt}`);
  const pesoSector = x.sector ? ctx.sectores[x.sector] || 0 : 0;
  const sectorT = x.sector ? trad(x.sector).toLowerCase() : '';
  if (pesoSector > 20) { p -= 0.3; pegas.push(L(`ya tienes un ${fmtNum(pesoSector, 0)} % en ${sectorT} a través de tus fondos`, `you already have ${fmtNum(pesoSector, 0)} % in ${sectorT} through your funds`)); }
  else if (x.sector) { p += 0.1; motivos.push(L(`${sectorT}: solo un ${fmtNum(pesoSector, 0)} % de tu bolsa`, `${sectorT}: only ${fmtNum(pesoSector, 0)} % of your stocks`)); }
  const dentro = ctx.dentro(x.n);
  if (dentro > 0.01 * ctx.total) { p -= 0.35; pegas.push(L(`ya tienes ${eur(dentro, 0)} en ella dentro de tus fondos`, `you already hold ${eur(dentro, 0)} of it inside your funds`)); }
  const gemelas = x.ind && ctx.industrias && ctx.industrias[x.ind];
  if (gemelas) { p -= 0.6; pegas.push(L(`es la misma apuesta que ${gemelas.join(' y ')}, que ya tienes: dependen de lo mismo y subirían y caerían a la vez`, `it's the same bet as ${gemelas.join(' and ')}, which you already own: they depend on the same thing and would rise and fall together`)); }
  if (x.z === 'EEUU') pegas.push(L('cotiza en dólares: el cambio euro/dólar también cuenta', 'priced in dollars: the euro/dollar rate also counts'));
  const tc = tasaRadar(x);
  if (tc) pegas.push(`al comprar pagas un ${fmtNum(tc.tipo * 100, 1)} % de ${tc.nombre}`);
  const fis = fiscalidadSede(origenRadar(x).sede);
  if (x.div >= 1.5 && fis.pierde > 0) { p -= 0.05 * (x.div * fis.pierde) / 10; pegas.push(`sus dividendos pierden un ${fmtNum(fis.pierde, 1)} % por la retención de ${PAISES[origenRadar(x).sede]}`); }
  return { ...x, puntos: p, motivos, pegas, ctr };
}
function ctxIdeas(M) {
  // 0.5, modo público: las ideas del radar, iguales para todos (sin mirar tu cartera)
  if (esPublico()) return { sectores: {}, total: 0, dentro: () => 0, industrias: {} };
  const sect = {};
  for (const x of reparto(M, 'sector', 'rv').filas) sect[x.k] = x.pct;
  // las acciones que ya tienes sueltas, por industria (aerolíneas, petroleras…): otra de la misma es repetir apuesta
  const industrias = {};
  for (const f of M.filas) if (f.inst.tipo === 'Acción' && f.p && f.p.industria && f.valor) industrias[f.p.industria] = [...new Set([...(industrias[f.p.industria] || []), f.inst.corto])];
  return { sectores: sect, total: M.total, dentro: dentroDeFondos(M), industrias };
}
/* lo caro se calcula una vez por cada cálculo de la cartera (M): pintar, la firma de las recomendaciones,
   el paso a paso y el widget lo piden varias veces seguidas */
function cacheDe(obj, k) { if (!obj[k]) Object.defineProperty(obj, k, { value: new Map(), enumerable: false }); return obj[k]; }
function mejoresIdeas(M, excluir = {}) {
  const c = cacheDe(M, '__ideas'), k = JSON.stringify(excluir);
  if (!c.has(k)) c.set(k, mejoresIdeas0(M, excluir));
  return c.get(k).slice();
}
/* Constancia: lo que GrowFolio ha propuesto estos días (en este dispositivo o, según el escaneo, entre las mejores
   del radar o las ideas de GrowIA) sigue arriba aunque sus números se muevan un poco. Solo sale si deja de
   cumplir de verdad (los analistas ya no dicen comprar, ya casi ha llegado al objetivo) o si GrowIA la pasa a
   "evitar", cosa que solo hace con una noticia que cambia la tesis. Nada de cinco ideas distintas en dos días. */
const MEM_IDEAS = 'inv-ideas-propuestas';
function memoriaIdeas() { if (S.demo) return {}; try { return JSON.parse(localStorage.getItem(MEM_IDEAS) || '{}') || {}; } catch (e) { return {}; } }
function apuntarIdeas(syms) {
  if (S.demo) return;  // 0.6d: las ideas de la cartera de prueba no cuentan para las tuyas
  const m = memoriaIdeas(), hoy = hoyIso();
  for (const s of syms) m[s] = { d: (m[s] && m[s].d) || hoy, u: hoy };
  for (const k of Object.keys(m)) if (diasEntre(m[k].u, hoy) > 30) delete m[k];
  try { localStorage.setItem(MEM_IDEAS, JSON.stringify(m)); } catch (e) {}
}
function propuestaReciente(s) {
  const hoy = hoyIso(), m = esPublico() ? null : memoriaIdeas()[s];
  if (m && diasEntre(m.u, hoy) <= 7) return true;
  const h = S.escaneo && S.escaneo.decision && S.escaneo.decision.hist && S.escaneo.decision.hist[s];
  return !!h && ['idea', 'radar'].some((k) => h[k] && diasEntre(h[k][1], hoy) <= 7);
}
const evitaGrowIA = () => new Set(((S.escaneo && S.escaneo.decision && S.escaneo.decision.evitar) || []).map((v) => v.s));
function mejoresIdeas0(M, excluir = {}) {
  const r = radarVals();
  if (!r.length) return [];
  const tuyas = esPublico() ? new Set() : new Set(M.filas.map((f) => (f.p && f.p.simbolo) || f.inst.yahoo));
  const ctx = ctxIdeas(M);
  const evita = evitaGrowIA();
  // las que también elige GrowIA tras leer su prensa van por delante: así el Paso a paso y las ideas apuntan a lo mismo
  const deGrowIA = new Set(((S.escaneo && S.escaneo.decision && S.escaneo.decision.ideas) || []).map((v) => v.s));
  // las que ya se propusieron tienen un margen: un 9 % de recorrido en vez de 10 o un consenso de 2,5 en vez de 2,4 no las saca
  const pasa = (x) => {
    const ya = propuestaReciente(x.s);
    return x.pot != null && x.pot >= (ya ? 5 : 10) && (x.na || 0) >= (ya ? 6 : 8) && (x.rm ?? 9) <= (ya ? 2.6 : 2.4) && ['buy', 'strong_buy'].includes(x.r) && !(x.c1a < (ya ? -45 : -35));
  };
  const out = r
    .filter((x) => !tuyas.has(x.s) && !evita.has(x.s) && pasa(x) && (!excluir.sector || x.sector !== excluir.sector))
    .map((x) => { const y = puntuarIdea(x, ctx); if (propuestaReciente(x.s)) { y.puntos += 0.8; y.sigue = true; } if (deGrowIA.has(x.s)) y.puntos += 0.6; return y; })
    .filter((x) => (x.sigue ? x.ctr.favor >= 2 && x.ctr.contra <= 3 : x.ctr.favor >= 3 && x.ctr.contra <= 2))
    .sort((a, b) => b.puntos - a.puntos);
  if (!excluir.sector) { S.ideasTop = out.slice(0, 12).map((x) => x.s); apuntarIdeas(out.slice(0, 3).map((x) => x.s)); }
  return out;
}

const ORDEN_RADAR = { pot: ['Puede subir', (x) => x.pot ?? -999], neto: ['Te quedas', (x) => x._neto ?? -999], ctr: ['Señales', (x) => x._ctr.favor - x._ctr.contra * 0.9 + (x.pot || 0) / 1000], rm: ['Consenso', (x) => -(x.rm ?? 9)], div: ['Dividendo', (x) => x.div ?? -1], perf: ['PER', (x) => -(x.perf > 0 ? x.perf : 999)], c1a: ['1 año', (x) => x.c1a ?? -999] };
// Londres cotiza en peniques (GBp): se enseña en libras, que se entiende mejor
const precioR = (p, m) => { const v = m === 'GBp' ? p / 100 : p; return `${fmtNum(v, v >= 1000 ? 0 : 2)} ${monedaR(m)}`; };
const monedaR = (m) => (m === 'EUR' ? '€' : m === 'USD' ? '$' : m === 'GBp' ? '£' : m === 'CHF' ? 'CHF' : m === 'DKK' ? 'DKK' : m === 'SEK' ? 'SEK' : m === 'NOK' ? 'NOK' : esc(m || ''));
/* ---------- 0.4: lo que escribe Gemini en la Action, en inglés ----------
   El informe, las ideas, las lecturas de prensa y los titulares en español los traduce la propia Action una vez
   (scripts/traducir.py → traduccion-en.json, rama datos). Con la app en inglés se cambian en los datos al cargarlos;
   lo que aún no esté traducido se queda en español hasta la siguiente pasada. La clave es la misma que en Python. */
const claveTr = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0') + s.length.toString(16); };
async function cargarTrEn() {
  if (IDIOMA !== 'en' || S.trEnCargando) return;
  if (S.trEn && Date.now() - (S.trEnT || 0) < 15 * 60000) { aplicarTrEn(); return; }
  S.trEnCargando = true;
  let txt = null;
  try {
    if (CFG.dev) { const r = await fetch('dev/traduccion-en.json', { cache: 'no-store' }).catch(() => null); if (r && r.ok) txt = await r.text(); }
    else { const r = await fetch(GH.raw('traduccion-en.json', 'datos') + '?v=' + Math.floor(Date.now() / 900000), { cache: 'no-cache' }).catch(() => null); if (r && r.ok) txt = await r.text(); }
  } catch (e) { /* sin conexión: lo guardado */ }
  try {
    if (txt) { S.trEn = JSON.parse(txt).t || {}; try { localStorage.setItem('inv-cache-tren', JSON.stringify({ t: S.trEn })); } catch (e) {} }
    else if (!S.trEn) { const c = localStorage.getItem('inv-cache-tren'); if (c) S.trEn = JSON.parse(c).t || {}; }
  } catch (e) {}
  S.trEnT = Date.now(); S.trEnCargando = false;
  aplicarTrEn();
}
function trDatos(o) {
  if (!o || typeof o !== 'object') return 0;
  let n = 0;
  for (const k of Object.keys(o)) {
    const v = o[k];
    // 0.7: el titular en español se guarda en t0, que es con el que se buscan sus marcas en las fichas de GrowIA
    if (k === 't0') continue;
    if (typeof v === 'string') { if (v.length >= 12) { const t = S.trEn[claveTr(v.trim())]; if (t) { if (k === 't' && o.t0 == null) o.t0 = v; o[k] = t; n++; } } }
    else if (v && typeof v === 'object' && k !== 'fuentes' && k !== 'noticias') n += trDatos(v);
  }
  return n;
}
// cambia lo que haya cargado (se puede llamar varias veces: lo ya cambiado no vuelve a coincidir)
function aplicarTrEn() {
  if (IDIOMA !== 'en' || !S.trEn) return 0;
  const n = trDatos(S.informe) + trDatos(S.escaneo) + trDatos(S.precios && S.precios.noticias) + trDatos(S.fichas && { e: S.fichas.e, temas: S.fichas.temas });
  if (n && S.cartera && !S.ficha) pintar();
  return n;
}

/* ---------- informe de prensa de Gemini (informe.json, rama datos) ----------
   Lo escribe la Action cada 2 horas con las noticias de tus posiciones, del mercado y de las mejores
   ideas del radar, aunque la web esté cerrada. Sin cantidades: tus cifras las pone la web. */
async function cargarInforme() {
  const id = S.precios && S.precios.informe_id;
  if (!id && !CFG.dev) { if (!S.informe) { try { const c = localStorage.getItem('inv-cache-informe'); if (c) S.informe = JSON.parse(c); } catch (e) {} } return; }
  if (S.informe && S.informeId === id && !CFG.dev) return;
  let txt = null;
  try {
    if (CFG.dev) { const r = await fetch('dev/informe.json', { cache: 'no-store' }); if (r.ok) txt = await r.text(); }
    else { const r = await fetch(GH.raw('informe.json', 'datos') + '?v=' + encodeURIComponent(id), { cache: 'no-cache' }).catch(() => null); if (r && r.ok) txt = await r.text(); }
  } catch (e) { console.warn(e); }
  if (txt) { try { S.informe = JSON.parse(txt); localStorage.setItem('inv-cache-informe', txt); } catch (e) {} }
  else { try { const c = localStorage.getItem('inv-cache-informe'); if (c && !S.informe) S.informe = JSON.parse(c); } catch (e) {} }
  S.informeId = id;
  if (IDIOMA === 'en') cargarTrEn();
}
/* El escaneo de prensa (unos 500 KB) no hace falta para pintar: al abrir se usa el guardado y el nuevo se baja
   después, sin frenar la entrada. Solo lo leen las ideas de Expertos y Mercados. */
function escaneoDeCache() { if (!S.escaneo) { try { const c = localStorage.getItem('inv-cache-escaneo'); if (c) S.escaneo = JSON.parse(c); } catch (e) {} } return Promise.resolve(); }
function escaneoLuego(ms = 6000) { setTimeout(() => cargarEscaneo().then(() => { if (S.cartera && ['expertos', 'mercados'].includes(S.vista) && !S.ficha) pintar(); }).catch(() => {}), ms); }
async function cargarEscaneo() {
  const id = S.precios && S.precios.escaneo_id;
  if (!id && !CFG.dev) { if (!S.escaneo) { try { const c = localStorage.getItem('inv-cache-escaneo'); if (c) S.escaneo = JSON.parse(c); } catch (e) {} } return; }
  if (S.escaneo && S.escaneoId === id && !CFG.dev) return;
  let txt = null;
  try {
    if (CFG.dev) { const r = await fetch('dev/escaneo.json', { cache: 'no-store' }); if (r.ok) txt = await r.text(); }
    else { const r = await fetch(GH.raw('escaneo.json', 'datos') + '?v=' + encodeURIComponent(id), { cache: 'no-cache' }).catch(() => null); if (r && r.ok) txt = await r.text(); }
  } catch (e) { console.warn(e); }
  if (txt) { try { S.escaneo = JSON.parse(txt); localStorage.setItem('inv-cache-escaneo', txt); } catch (e) {} }
  else { try { const c = localStorage.getItem('inv-cache-escaneo'); if (c && !S.escaneo) S.escaneo = JSON.parse(c); } catch (e) {} }
  S.escaneoId = id;
  if (IDIOMA === 'en') cargarTrEn();
}
/* lo que ha leído Gemini de la prensa de una empresa (el escaneo recorre todo el radar) */
const lecturaDe = (sim) => (S.escaneo && S.escaneo.lectura && S.escaneo.lectura[sim]) || null;
const informeDe = (id) => (S.informe && S.informe.posiciones && S.informe.posiciones[id]) || null;
const informeIdea = (sim) => { const v = S.informe && S.informe.ideas && S.informe.ideas[sim]; if (v) return v; const l = lecturaDe(sim); return l && l.txt ? { novedades: l.txt, impacto: l.imp, fuentes: l.fuentes, vigilar: l.cat } : null; };
// en femenino, que vale para «prensa» y para «noticia» («Prensa: Bueno» no concordaba)
const IMPACTO = { positivo: ['up', 'Buena'], negativo: ['down', 'Mala'], mixto: ['warn', 'Mixta'], neutral: ['flat', 'Neutral'] };
const chipImpacto = (i) => { const x = IMPACTO[i] || IMPACTO.neutral; return `<span class="imp ${x[0]}">${x[1]}</span>`; };
function enlacesFuentes(fs, n = 3) {
  const dom = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  // varias noticias del mismo medio van en un solo enlace: "Yahoo Finance (3)"
  const grupos = new Map();
  for (const f of (fs || []).filter((x) => x && /^https?:\/\//.test(x.u || ''))) { const k = f.f || dom(f.u); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(f); }
  const v = [...grupos.entries()].slice(0, n);
  return v.length ? `<div class="as-fuentes">${v.map(([k, g]) => `<a href="${esc(g[0].u)}" target="_blank" rel="noopener noreferrer" title="${esc(g.map((x) => x.t || '').filter(Boolean).join(' · '))}">${esc(k)}${g.length > 1 ? ` (${g.length})` : ''}</a>`).join('')}</div>` : '';
}
function htmlPrensaIA(x, conEtiqueta = true) {
  if (!x || !x.novedades) return '';
  return `<div class="prensa-ia"><p class="pi-t">${conEtiqueta ? '<span class="fx-de">Prensa</span>' : ''}${chipImpacto(x.impacto)} ${escIA(x.novedades)}</p>${x.contraste ? `<p class="k">${escIA(x.contraste)}</p>` : ''}${x.vigilar && !/^nada( especial)?\.?$/i.test(String(x.vigilar).trim()) ? `<p class="pi-v"><b>Vigilar.</b> ${escIA(x.vigilar)}</p>` : ''}${x.riesgo ? `<p class="k">Riesgo: ${escIA(x.riesgo)}</p>` : ''}${enlacesFuentes(x.fuentes)}</div>`;
}
function cabInforme(inf) {
  return `${haceCuanto(inf.generado)}, tras leer ${inf.noticias_leidas || 'las'} noticias${inf.busqueda_google ? ' y buscar en Google' : ''}`;
}
/* el resumen y las alertas del informe hablan de la cartera del repositorio: en una cartera de este
   dispositivo solo se enseña lo del mercado y lo de las posiciones que también tiene */
function informeVisible() {
  const inf = S.informe;
  if (!inf || !PERFIL_LOCAL) return inf;
  const ids = new Set(((S.M && S.M.filas) || []).map((f) => f.inst.id));
  // el informe se escribe para la cartera del repositorio: si esta es esa misma (casi todas sus posiciones coinciden), entero
  const suyas = Object.keys(inf.posiciones || {});
  if (suyas.length && suyas.filter((id) => ids.has(id)).length / suyas.length >= 0.7) return inf;
  // si no, sin lo que habla de esa otra cartera: el resumen y el «Para tu cartera» de cada noticia del mercado
  return { ...inf, resumen: '', mercado: (inf.mercado || []).map((m) => ({ ...m, implica: '' })), alertas: (inf.alertas || []).filter((a) => a.id && ids.has(a.id)), posiciones: Object.fromEntries(Object.entries(inf.posiciones || {}).filter(([id]) => ids.has(id))) };
}
/* 0.7, en Inicio (al lado del mapa de tu cartera en el ordenador): debajo del resumen, lo que más se ha movido hoy de
   lo tuyo y por qué, según el informe de la prensa (el mismo para todos). Sin el «Bueno/Malo para tu…» del principio:
   el color de la cifra ya dice si sube o baja, y en estándar no es un consejo */
function htmlHoyInforme(M) {
  const inf = informeVisible(), P = (inf && inf.posiciones) || {};
  if (!M) return '';
  const vistos = new Set(), top = [];
  for (const f of [...M.filas].filter((x) => P[x.inst.id] && P[x.inst.id].novedades && x.varDia != null).sort((a, b) => Math.abs(b.dia || 0) - Math.abs(a.dia || 0))) {
    if (vistos.has(f.inst.id)) continue;
    vistos.add(f.inst.id); top.push(f);
    if (top.length === 5) break;
  }
  if (!top.length) return '';
  const porque = (t) => { let s = String(limpiaIA(t || '')).trim(); const m = /^[^:.]{3,48}:\s+/.exec(s); if (m) s = s.slice(m[0].length); return s.charAt(0).toUpperCase() + s.slice(1); };
  return `<div class="ini-hoy"><p class="ini-hoy-t">${L('Hoy, en lo tuyo', 'Today, in your holdings')}</p><ul>${top.map((f) => `<li><button type="button" data-mc-ficha="${esc(f.pos.id)}">${logo(f.inst.dominio || null, f.inst.corto || f.inst.nombre, 'peq')}<span class="ini-hoy-n"><b>${esc(f.inst.corto || f.inst.nombre)}</b><small data-no-trad>${escIA(porque(P[f.inst.id].novedades))}</small></span><span class="ini-hoy-v ${cls(f.varDia)}">${esc(pctS(f.varDia, 1))}</span></button></li>`).join('')}</ul></div>`;
}
function htmlResumenInforme(corto, extra = '') {
  const inf = informeVisible();
  if (!inf || (!inf.resumen && !(inf.alertas || []).length)) return '';
  if (corto) {
    const fr = String(limpiaIA(inf.resumen || '')).replace(/\.\s+/g, '.\u0001').split('\u0001');
    return `<section class="informe corto" aria-labelledby="hInf"><div class="sec-cab"><h2 id="hInf" data-no-trad>${conIA('Lo último, según GrowIA', 'The latest, according to GrowIA')}</h2><span class="k">${cabInforme(inf)}</span></div>
      ${fr[0] ? `<p class="informe-res">${esc(fr[0])}</p>` : (inf.alertas || []).length ? `<p class="informe-res informe-al">${inf.alertas[0].urgencia === 'alta' ? ICONOS.alerta : ICONOS.info}${escIA(inf.alertas[0].t)}</p>` : ''}
      ${fr.length > 1 || (inf.alertas || []).length ? `<details class="mas"><summary>${(inf.alertas || []).length ? `Seguir leyendo y ${inf.alertas.length} ${inf.alertas.length === 1 ? 'alerta' : 'alertas'}` : 'Seguir leyendo'}</summary>${fr.length > 1 ? `<p class="informe-res">${esc(fr.slice(1).join(' '))}</p>` : ''}${(inf.alertas || []).length ? `<ul class="lista">${inf.alertas.map((a) => `<li class="${a.urgencia === 'alta' ? 'warn' : 'info'}">${a.urgencia === 'alta' ? ICONOS.alerta : ICONOS.info}<div><b>${escIA(a.t)}</b></div></li>`).join('')}</ul>` : ''}</details>` : ''}
      ${extra}
    </section>`;
  }
  return `<section class="informe" aria-labelledby="hInf"><div class="sec-cab"><h2 id="hInf" data-no-trad>${conIA('Lo último, según GrowIA', 'The latest, according to GrowIA')}</h2><span class="k">${cabInforme(inf)}</span></div>
    ${inf.resumen ? `<p class="informe-res">${escIA(inf.resumen)}</p>` : ''}
    ${(inf.alertas || []).length ? `<ul class="lista">${inf.alertas.map((a) => `<li class="${a.urgencia === 'alta' ? 'warn' : 'info'}">${a.urgencia === 'alta' ? ICONOS.alerta : ICONOS.info}<div><b>${escIA(a.t)}</b></div></li>`).join('')}</ul>` : ''}
  </section>`;
}
const ZONA_BANDERA = { EEUU: 'US', Europa: 'EU', 'España': 'ES', Asia: 'JP', Emergentes: null, Global: null };
function htmlMercadoInforme(abierto = true) {
  const inf = informeVisible();
  if (!inf || !(inf.mercado || []).length) return '';
  // los titulares a la vista; el detalle de cada uno, al tocarlo. Plegado (en el móvil), el primer titular de adelanto
  return `<details class="informe merc-pleg"${abierto ? ' open' : ''}><summary class="sec-cab"><h2 id="hInfM">Qué mueve hoy los mercados, según GrowIA</h2><span class="k">${cabInforme(inf)}</span><span class="mp-ade">${escIA(inf.mercado[0].t)}${inf.mercado.length > 1 ? `<em>${L(`+${inf.mercado.length - 1} ${inf.mercado.length === 2 ? 'tema más' : 'temas más'}`, `+${inf.mercado.length - 1} more`)}</em>` : ''}</span><i class="aj-flecha" aria-hidden="true"></i></summary>
    <ul class="informe-merc plegados">${inf.mercado.map((m) => `<li><details><summary>${chipImpacto(m.impacto)}${m.zona ? `<span class="zona-ia">${bandera(ZONA_BANDERA[m.zona])}${esc(m.zona)}</span>` : ''}<b>${escIA(m.t)}</b></summary><p>${escIA(m.detalle)}</p>${m.implica ? `<p class="ia-implica"><b>Para tu cartera:</b> ${escIA(m.implica)}</p>` : ''}${enlacesFuentes(m.fuentes, 2)}</details></li>`).join('')}</ul>
    ${(inf.macro || []).length ? `<div class="macro-ia">${inf.macro.map((x) => `<div><small>${escIA(x.t)}</small><b>${esc(datoIA(x.dato))}</b><p>${escIA(x.lectura)}</p></div>`).join('')}</div>` : ''}
  </details>`;
}
/* GrowIA a veces hablaba de una meta lejana como si estuviera al caer («sostienen el rumbo hacia los 500.000 €»).
   Los análisis nuevos dicen la distancia, pero los de antes siguen guardados: al enseñarlos, esa coletilla se quita
   si la cifra es más de vez y media lo que tienes. */
const NUM_IA = String.raw`\*{0,2}([\d.]+(?:,\d+)?)\s?(?:€|euros)\*{0,2}`;
const RUMBO_IA = [
  new RegExp(String.raw`\b(?:el|su|tu) (?:rumbo|camino) (?:hacia|a|de) (?:(?:los|las|tus|tu meta de|la meta de) )?` + NUM_IA, 'gi'),
  new RegExp(String.raw`,?\s*(?:rumbo|camino) (?:hacia|a|de) (?:(?:los|las|tus|tu meta de|la meta de) )?` + NUM_IA, 'gi'),
  new RegExp(String.raw`\s+(?:hacia|rumbo a) (?:(?:los|las|tus|tu meta de) )?` + NUM_IA, 'gi'),
];
function sinRumbo(t) {
  const total = (S.M && S.M.total) || 0;
  const lejos = (x) => total > 0 && +String(x).replace(/\./g, '').replace(',', '.') > total * 1.5;
  return t.replace(RUMBO_IA[0], (m, x) => (lejos(x) ? 'la cartera' : m)).replace(RUMBO_IA[1], (m, x) => (lejos(x) ? '' : m)).replace(RUMBO_IA[2], (m, x) => (lejos(x) ? '' : m));
}
/* GrowIA a veces escribe las cifras a la inglesa (5.117%, 1.1235): en español, coma decimal y espacio antes del % */
function datoIA(t) {
  let x = limpiaIA(t).trim();
  if (IDIOMA === 'en') return x;
  x = x.replace(/(-?\d+)\.(\d+)\s*%/g, '$1,$2 %').replace(/(\d)%/g, '$1 %');
  if (/^-?\d\.\d{3,}$/.test(x)) x = x.replace('.', ',');
  // 0.3.9: como el resto de la app: «111,50 $» y no «111.50 USD»; los porcentajes, con dos decimales como mucho
  x = x.replace(/(\d+)\.(\d+)\s*USD\b/g, '$1,$2 $').replace(/(\d)\s*USD\b/g, '$1 $').replace(/(\d+),(\d{3,})\s*%/g, (m, e, d) => `${(Math.round(+`${e}.${d}` * 100) / 100).toFixed(2).replace('.', ',')} %`);
  return x;
}
/* las fechas sueltas que a veces escribe GrowIA (2026-10-28) se leen como el resto: «28 oct» */
const fechaIA = (t) => String(t).replace(/\b(20\d\d)-(\d\d)-(\d\d)\b/g, (m, a, me, d) => `${+d} ${MESES[+me - 1] || me}${+a !== new Date().getFullYear() ? ` de ${a}` : ''}`);
const limpiaIA = (t) => fechaIA(sinRumbo(String(t || '').replace(/\s*\[\d+(?:\s*[,–-]\s*\d+)*\]/g, '')));
const escIA = (t) => esc(limpiaIA(t));
const noticiasIdea = (sim) => ((S.precios && S.precios.noticias_ideas) || {})[sim] || [];
/* ---------- las mejores ideas: la web, Gemini y tu análisis, juntas ----------
   Cada fuente elige por su lado: la web, las tres mejor contrastadas del radar; Gemini, las que
   elige tras leer la prensa de todo el radar; y el análisis de la IA, las que propone para tu cartera.
   Si dos o tres coinciden en la misma empresa, sale una sola tarjeta y va primero. */
function ideasJuntas(M, ia, n = 9) {
  const mapa = new Map();
  const add = (q, nombre, o) => {
    const r = q ? buscarRadar(q) : null;
    const k = r ? r.s : String(q || nombre || '').toUpperCase();
    if (!k) return;
    const x = mapa.get(k) || { s: r ? r.s : String(q || ''), r, n: (r && r.n) || nombre || q };
    mapa.set(k, Object.assign(x, o));
  };
  const web = mejoresIdeas(M);
  web.slice(0, 3).forEach((x, i) => add(x.s, x.n, { web: { ...x, puesto: i + 1 } }));
  const d = S.escaneo && S.escaneo.decision;
  for (const i of (d && d.ideas) || []) if (i && i.s) add(i.s, i.n, { gem: i });
  for (const x of (ia && Array.isArray(ia.ideas) ? ia.ideas : [])) if (x && x.nombre) add(x.ticker || x.nombre, x.nombre, { tuya: x });
  // las de GrowIA o de tu análisis que el radar también tiene entre sus doce mejores cuentan también como del radar
  web.slice(3, 12).forEach((x, i) => { const y = mapa.get(x.s); if (y && !y.web) y.web = { ...x, puesto: i + 4 }; });
  // hasta completar n (9, tres filas de tres), las siguientes mejor contrastadas de la web
  for (let i = 3; i < web.length && mapa.size < n; i++) if (!mapa.has(web[i].s)) add(web[i].s, web[i].n, { web: { ...web[i], puesto: i + 1 } });
  // el orden: primero las que eligen más; entre ellas, lo que darían al año, pero sin dejar que un plazo de dos meses
  // multiplique la cifra (se cuenta como mínimo medio año)
  const clave = (x) => { const p = x.esp && x.esp.prin; return p && p.netoP != null && p.meses ? Math.pow(1 + p.netoP / 100, 12 / Math.max(p.meses, 6)) - 1 : -9; };
  return [...mapa.values()].map((x) => { const y = { ...x, votos: (x.web ? 1 : 0) + (x.gem ? 1 : 0) + (x.tuya ? 1 : 0) }; y.esp = esperadaIdea(y); return y; })
    .sort((a, b) => b.votos - a.votos || clave(b) - clave(a));
}
/* lo que puede dar cada idea y en cuánto tiempo: el objetivo de los analistas es a 12 meses; si Gemini
   (o tu análisis) ha estimado su propio plazo por un catalizador, manda el suyo */
/* el plazo de cada idea: el que estima Gemini por su catalizador (en su escaneo o en tu análisis) o, si no hay,
   los 12 meses del objetivo de los analistas */
const plazoGemini = (sim) => { const p = S.escaneo && S.escaneo.decision && S.escaneo.decision.plazos; return (p && p[sim]) || null; };
function esperadaRadar(r, extra) {
  if (!r || r.pot == null) return null;
  const ana = rentaEsperada(r, r.pot, 12, 'analistas');
  const g = extra && extra.subida_pct != null && +extra.plazo_meses > 0 ? { meses: +extra.plazo_meses, subida_pct: +extra.subida_pct, por: extra.catalizador || '', fuente: extra.fuente } : plazoGemini(r.s) ? { ...plazoGemini(r.s), fuente: 'GrowIA' } : null;
  const ia = g ? { ...rentaEsperada(r, g.subida_pct, g.meses, g.fuente || 'GrowIA'), por: g.por } : null;
  return { ana, ia, prin: ia || ana };
}
function esperadaIdea(x) {
  const g = [x.gem, x.tuya].find((y) => y && y.subida_pct != null && +y.plazo_meses > 0);
  return esperadaRadar(x.r, g ? { ...g, fuente: g === x.gem ? 'GrowIA' : 'tu análisis' } : null);
}
/* lo mismo para una acción que ya tienes: hasta el objetivo medio de los analistas (a 12 meses) o, si GrowIA le ha
   estimado su propio plazo por un catalizador, el suyo. Neto como en las ideas (tu tramo al vender y su dividendo),
   pero sin la tasa de compra, que ya pagaste; y en euros, con lo que tienes */
function rentaPos(f, subida, meses, fuente) {
  if (subida == null || !isFinite(subida) || !(meses > 0)) return null;
  const t = tramoAhorro(), fis = fiscalidadSede(f.inst.pais, f.inst.tipo);
  const divP = (((f.p && f.p.dividendo_pct) || 0) * meses) / 12;
  const netoP = (subida > 0 ? subida * (1 - t) : subida) + divP * (1 - t - (fis.pierde || 0) / 100);
  return { subida, meses, fuente, divP, netoP, netoE: (f.valor * netoP) / 100, t, fis };
}
function esperadaPos(f) {
  const i = f.inst, p = f.p || {}, a = p.analistas;
  if (i.tipo !== 'Acción' || !(f.precio > 0) || !(f.valor > 0)) return null;
  const ana = a && a.objetivo > 0 ? rentaPos(f, (a.objetivo / f.precio - 1) * 100, 12, 'analistas') : null;
  if (ana) Object.assign(ana, { obj: a.objetivo, n: a.num || null });
  const sim = p.simbolo || i.yahoo, d = S.escaneo && S.escaneo.decision;
  const gi = sim && d && (d.ideas || []).find((x) => x && x.s === sim && x.subida_pct != null && +x.plazo_meses > 0);
  const g = gi ? { subida_pct: +gi.subida_pct, meses: +gi.plazo_meses, por: gi.catalizador || '' } : sim ? plazoGemini(sim) : null;
  const ia = g && g.subida_pct != null && +g.meses > 0 ? rentaPos(f, +g.subida_pct, +g.meses, 'GrowIA') : null;
  if (ia) Object.assign(ia, { obj: f.precio * (1 + ia.subida / 100), por: g.por || '' });
  return ana || ia ? { ana, ia, prin: ia || ana } : null;
}
// en una línea, para la lista de Expertos: «+17 % en 12 meses, neto»
function potCorto(e) {
  const p = e && e.prin;
  if (!p || p.netoP == null) return '';
  return `<span class="fx3-pot ${cls(p.netoP)}" title="${esc(L(`Lo que te quedarías si se cumple ${p === e.ia ? 'lo que estima GrowIA' : 'el objetivo medio de los analistas'}, ya restados los impuestos y con su dividendo`, `What you'd keep if ${p === e.ia ? "GrowIA's estimate" : "the analysts' average target"} is met, after tax and with its dividend`))}">${pctS(p.netoP, 0)} ${L(`en ${plazoTxt(p.meses)}`, `in ${plazoTxt(p.meses)}`)}<span class="fx3-neto">${L(', neto', ', net')}</span></span>`;
}
// en la ficha: el objetivo, cuánto puede subir o bajar, en cuánto tiempo y lo que te quedarías, en euros
function htmlEsperaPos(f) {
  const e = esperadaPos(f), p = e && e.prin;
  if (!p) return '';
  const deIA = p === e.ia, baja = p.subida < 0;
  const plazoDe = deIA ? (p.por ? L(`según GrowIA: ${limpiaIA(p.por)}`, `according to GrowIA: ${limpiaIA(p.por)}`) : L('según GrowIA', 'according to GrowIA')) : L('el de los analistas', "the analysts' horizon");
  return `<section class="pos-espera" aria-labelledby="hEspera">
    <h3 id="hEspera">${L('Lo que esperan', 'What they expect')}</h3>
    <div class="idea-cifras4">
      <div><span class="k">${L('Precio objetivo', 'Price target')}</span><b>${precioFmt(p.obj)}</b><small>${deIA ? L('el que estima GrowIA', "GrowIA's estimate") : p.n ? L(`media de ${p.n} analistas`, `average of ${p.n} analysts`) : L('media de los analistas', 'analysts’ average')}</small></div>
      <div><span class="k">${baja ? L('Puede bajar', 'Could fall') : L('Puede subir', 'Could rise')}</span><b class="${cls(p.subida)}">${pctS(p.subida, 0)}</b><small>${deIA && e.ana ? L(`analistas: ${pctS(e.ana.subida, 0)} a 12 meses`, `analysts: ${pctS(e.ana.subida, 0)} in 12 months`) : L('desde el precio de ahora', 'from today’s price')}</small></div>
      <div><span class="k">${L('En cuánto tiempo', 'How long')}</span><b>${plazoTxt(p.meses)}</b><small>${esc(plazoDe)}</small></div>
      <div><span class="k">${L('Te quedas, si se cumple', 'You keep, if it happens')}</span><b class="${cls(p.netoP)}">${pctS(p.netoP, 0)}</b><small>${L(`${eurS(p.netoE, 0)} con lo que tienes, ya restados los impuestos${p.divP > 0 ? ' y con su dividendo' : ''}`, `${eurS(p.netoE, 0)} on what you hold, after tax${p.divP > 0 ? ' and with its dividend' : ''}`)}</small></div>
    </div>
  </section>`;
}
function quienIdea(x) {
  const w = x.web ? (IDIOMA === 'en' ? `GrowFolio's radar (${x.web.puesto === 1 ? 'the best-backed on it' : `number ${x.web.puesto} by backing`})` : `el radar de GrowFolio (${x.web.puesto === 1 ? 'la mejor contrastada del radar' : `la ${x.web.puesto}.ª mejor contrastada`})`) : null;
  const g = x.gem ? `GrowIA tras leer su prensa (confianza ${esc(x.gem.confianza || 'media')}${x.gem.desde && x.gem.desde < hoyIso() ? `, desde el ${fechaCorta(x.gem.desde)}` : ''})` : null;
  const t = x.tuya ? `tu análisis${x.tuya.importe ? `, con ${eur(+x.tuya.importe, 0)}` : ''}` : null;
  const p = [w, g, t].filter(Boolean);
  return `La propone ${yLista(p.map(trad))}.`;
}
/* precio, objetivo, plazo y lo que daría al año neto de impuestos, en cuatro cifras */
/* "Puede subir un 51 % en 12 meses (los analistas): un 43 % al año tras impuestos." */
function planTxt(e) {
  const p = e.prin;
  return `Si se cumple: ${pctS(p.subida, 0)} en ${plazoTxt(p.meses)} (${p === e.ia ? `según ${esc(p.fuente)}${e.ia.por ? `, por ${esc(limpiaIA(e.ia.por).replace(/^./, (c) => c.toLowerCase()))}` : ''}` : 'el objetivo de los analistas'}). Después de impuestos te quedarías un ${pctS(p.netoP, 0)}.`;
}
function htmlCifrasIdea(r, e) {
  if (!r || !r.p) return '';
  const p = e && e.prin;
  const plazo = p ? `<b>${plazoTxt(p.meses)}</b><small>${p === e.ia ? esc(`según ${p.fuente}${e.ia.por ? `: ${limpiaIA(e.ia.por)}` : ''}`) : 'el de los analistas'}</small>` : '—';
  const neto = p && p.netoP != null ? `<b class="${cls(p.netoP)}">${pctS(p.netoP, 0)}</b><small>en ${plazoTxt(p.meses)}, ya restados los impuestos. Tu fondo indexado da un ${fmtNum(bolsaAnual(), 0)} % al año</small>` : '—';
  return `<div class="idea-cifras4">
    <div><span class="k">Precio</span><b>${B('rp:' + r.s)}</b></div>
    <div><span class="k">Puede subir</span><b class="${cls(p ? p.subida : r.pot)}">${pctS(p ? p.subida : r.pot, 0)}</b><small>${p && p === e.ia ? `analistas: ${pctS(r.pot, 0)} a 12 meses` : 'hasta el objetivo medio'}</small></div>
    <div><span class="k">En cuánto tiempo</span>${plazo}</div>
    <div><span class="k">Te quedas, si se cumple</span>${neto}</div>
  </div>`;
}
function htmlFiscalIdea(r, e) {
  if (!r) return '';
  const o = origenRadar(r), fis = fiscalidadSede(o.sede), tasa = tasaRadar(r), t = e ? e.prin.t : tramoAhorro();
  const partes = [`al vender pagas el ${pctTramo(t)} % de lo que ganes (tu tramo de este año)`];
  if (r.div > 0.3) partes.push(fis.txt.replace(/^Dividendos: /, `su dividendo del ${fmtNum(r.div, 1)} %: `));
  partes.push(tasa ? `al comprar, ${fmtNum(tasa.tipo * 100, 1)} % de ${tasa.nombre}` : 'sin tasa al comprar');
  return `<p class="idea-linea"><b>Impuestos.</b> ${esc(partes.map((x) => x.replace(/\.\s*$/, '')).join('; ').replace(/^./, (c) => c.toUpperCase()))}.</p>`;
}
function tarjetaIdea(x, ctx, compacta = false, puesto = 0) {
  const r = x.r;
  const pu = x.web || (r && r.p != null && r.pot != null ? puntuarIdea(r, ctx) : null);
  const ctr = pu ? pu.ctr : r && r.p ? contraste(r) : null;
  const T = (t) => rellenarIA(t || '', {});
  const de = (k) => (x.gem && x.gem[k] ? escIA(x.gem[k]) : x.tuya && x.tuya[k] ? T(limpiaIA(x.tuya[k])) : '');
  const motivos = pu ? pu.motivos.slice(0, 3).join(', ') : '';
  const tesis = de('tesis') || (motivos ? esc(motivos.charAt(0).toUpperCase() + motivos.slice(1)) + '.' : '');
  const pegas = pu ? pu.pegas.filter((p) => !p.startsWith('al comprar pagas') && !p.startsWith('sus dividendos pierden')).slice(0, 2) : [];
  const contra = [de('riesgo'), ...pegas.map((p) => esc(p.charAt(0).toUpperCase() + p.slice(1)))].filter(Boolean).map((y) => y.replace(/\.\s*$/, '')).join('. ');
  const fuentes = [...((x.gem && x.gem.fuentes) || []), ...((x.tuya && x.tuya.fuentes) || [])];
  const prensa = !x.gem && informeIdea(x.s);
  const mas = [
    de('catalizador') ? `<p class="idea-linea"><b>Qué la puede mover.</b> ${de('catalizador')}</p>` : '',
    contra ? `<p class="idea-linea"><b>En contra.</b> ${contra.replace(/\.?$/, '.')}</p>` : '',
    prensa && prensa.novedades ? `<p class="idea-linea"><b>Prensa.</b> ${chipImpacto(prensa.impacto)}${escIA(prensa.novedades)}</p>` : '',
    htmlFiscalIdea(r, x.esp),
    ctr ? `<div><p class="idea-linea" style="margin-bottom:6px"><b>Las siete señales.</b></p>${htmlContrasteLista(ctr)}</div>` : '',
    enlacesFuentes(fuentes, 4),
  ].filter(Boolean).join('');
  const resumen = x.esp && x.esp.prin && x.esp.prin.netoP != null ? { n: pctS(x.esp.prin.netoP, 0), en: `en ${plazoTxt(x.esp.prin.meses)}, neto` } : null;
  return `<article class="idea${x.votos > 1 ? ' coinciden' : ''}${puesto && puesto <= 3 ? ' podio' : ''}"${compacta ? ` data-compacta style="--k:${Math.max(0, puesto - 1)}"` : ''}>
    <header${compacta ? ' data-idea-toggle role="button" tabindex="0" aria-expanded="false"' : ''}>${puesto ? `<span class="idea-n" aria-label="${L(`Número ${puesto}`, `Number ${puesto}`)}">${puesto}</span>` : ''}${logo(r && r.w, x.n)}<div><b>${esc(nombreRadar(x))}</b><small>${r ? (compacta ? lineaOrigenCorta(r) : lineaOrigen(r)) : esc(x.s)}</small></div>${compacta ? `<span class="idea-res">${resumen ? `<b class="${cls(x.esp.prin.netoP)}">${esc(resumen.n)}</b><small>${esc(resumen.en)}</small>` : ''}</span>` : ''}</header>
    <p class="idea-quien">${quienIdea(x)}${ctr ? ` <span class="ctr-q">${htmlContraste(ctr, true)} señales a favor</span>` : ''}</p>
    ${htmlCifrasIdea(r, x.esp)}
    ${tesis ? `<p class="idea-tesis">${tesis}</p>` : ''}
    ${mas ? `<details class="mas"><summary>Qué la mueve, pegas, impuestos y señales</summary><div class="idea-mas">${mas}</div></details>` : ''}
    <div class="idea-btns">${esPublico() ? `<button class="btn peq" data-accion="asesor" data-q="${esc(`¿Qué hace ${x.n} (${x.s}) y qué dicen los analistas? Contrástalo con las noticias de esta semana y dime qué pagaría de impuestos y comisiones si la comprara.`)}">${ICONOS.growia}${L('Pregúntale', 'Ask')}</button>` : `<button class="btn peq" data-accion="asesor" data-q="${esc(`¿Compro ${x.n} (${x.s})? Contrástalo con las noticias de esta semana y dime cuánto meter, desde dónde, en qué plazo espero ganarlo, lo que pago de impuestos y con qué regla de salida.`)}">${ICONOS.growia}¿Cuánto meto?</button>`}${r && r.s ? `<button class="btn peq" data-accion="operacion" data-tipo="compra" data-sim="${esc(r.s)}">${ICONOS.compra}Ya la he comprado</button>${botonSeguir(r.s, nombreRadar(x))}` : ''}</div>
  </article>`;
}
function htmlEvitar() {
  const d = S.escaneo && S.escaneo.decision;
  if (!d || !(d.evitar || []).length) return '';
  // lo contrario de las ideas de compra, con su mismo estilo de tarjeta pero en rojo: quién es, de dónde, cuánto
  // se ha movido hoy y por qué GrowIA no la compraría (el motivo en tres líneas, entero al tocarlo)
  const tarjeta = (v) => {
    const r = buscarRadar(v.s), dia = r && r.v != null ? +r.v : null;
    return `<article class="evita">
      <header>${logo(r && r.w, v.n || v.s)}<div><b>${esc(v.n || (r && r.n) || v.s)}</b><small>${r ? lineaOrigenCorta(r) : ''}<span class="ev-tk">${esc(v.s)}</span></small></div>
        <span class="ev-res">${dia != null ? `<b class="${cls(dia)}">${pctS(dia, 1)}</b><small>${L('hoy', 'today')}</small>` : ''}</span></header>
      ${(() => { const c = cambiosIdeas().find((y) => y.s === v.s && y.ahora === 'evitar'); return c ? `<p class="ev-antes">${ICONOS.alerta}<span>${L('Hasta hace poco estaba entre las ideas. Cambia por una noticia que cambia la tesis.', 'Until recently it was among the ideas. It changes because of news that changes the thesis.')}</span></p>` : ''; })()}
      <p class="ev-motivo" data-ev-abre tabindex="0">${escIA(v.motivo)}</p>
      ${enlacesFuentes(v.fuentes, 3)}
    </article>`;
  };
  return `<section class="evitar" aria-labelledby="hEvi"><details class="sec-det" open><summary class="sec-cab"><h3 id="hEvi"><span class="ev-ico" aria-hidden="true">${ICONOS.alerta}</span><span data-no-trad>${conIA('Las que GrowIA evitaría', 'The ones GrowIA would avoid')}</span> <span class="k">${d.evitar.length}, por lo que dice su prensa</span></h3></summary>
    <div class="evitas">${d.evitar.map(tarjeta).join('')}</div></details></section>`;
}
/* lo que ha entrado o salido de las ideas en los últimos tres días, con su motivo: si GrowIA cambia de opinión, lo dice */
function cambiosIdeas() {
  const d = S.escaneo && S.escaneo.decision, hoy = hoyIso();
  return ((d && d.cambios) || []).filter((c) => c && c.s && c.d && diasEntre(c.d, hoy) <= 3);
}
function htmlCambiosIdeas() {
  const cs = cambiosIdeas().filter((c) => c.antes !== 'nada' || c.ahora !== 'idea' || c.motivo);
  if (!cs.length) return '';
  const que = (c) => c.ahora === 'idea' ? (c.antes === 'evitar' ? L('Deja de estar entre las que evitaría y pasa a idea', 'Moves from avoid to idea') : L('Entra en las ideas', 'Joins the ideas'))
    : c.ahora === 'evitar' ? L('Sale de las ideas y pasa a evitar', 'Leaves the ideas and moves to avoid') : L('Sale de las ideas', 'Leaves the ideas');
  return `<section class="cambios-ia" aria-labelledby="hCamb"><h3 id="hCamb">${L('Qué ha cambiado y por qué', 'What changed and why')}</h3>
    <p class="nota">${L('Las ideas solo cambian de un día para otro si llega una noticia que cambia la tesis o se rompen sus números. Cada cambio, con su motivo:', 'Ideas only change from one day to the next if news changes the thesis or the numbers break. Each change, with its reason:')}</p>
    <ul>${cs.map((c) => { const r = buscarRadar(c.s); return `<li class="${c.ahora === 'idea' ? 'entra' : 'sale'}"><b>${esc((r && r.n) || c.n || c.s)}</b> <span class="cm-que">${que(c)} · ${fechaCorta(c.d)}</span>${c.motivo ? `<p>${escIA(c.motivo)}</p>` : ''}${enlacesFuentes(c.fuentes, 2)}</li>`; }).join('')}</ul></section>`;
}
function htmlIdeas(M, ia) {
  const todas = radarVals();
  if (!todas.length) return '<div class="sec-cab"><h2 id="hIdeas">Ideas para comprar</h2></div><div class="vacio">La lista de ideas llega con la próxima actualización de datos.</div>';
  const tuyas = new Set(M.filas.map((f) => (f.p && f.p.simbolo) || f.inst.yahoo));
  const juntas = ideasJuntas(M, ia, 9).slice(0, 9);
  const movil = innerWidth <= 680;
  const ctx = ctxIdeas(M);
  const d = S.escaneo && S.escaneo.decision;
  let v = todas.filter((x) => (S.radarZona === 'Todas' || x.z === S.radarZona) && (!S.radarMin || (x.na || 0) >= 5) && x.pot != null).map((x) => { const e = esperadaRadar(x); return { ...x, _ctr: contraste(x), _neto: e ? e.prin.netoP : null, _meses: e ? e.prin.meses : null }; });
  if (S.radarSolidas) v = v.filter((x) => x._ctr.favor >= 4 && x._ctr.contra <= 1);
  const [, clave] = ORDEN_RADAR[S.radarOrden] || ORDEN_RADAR.pot;
  v = v.sort((a, b) => clave(b) - clave(a));
  const total = v.length;
  const corte = movil ? 10 : 20;
  if (!S.radarTodo) v = v.slice(0, corte);
  S.radarVisibles = [...new Set([...v.map((x) => x.s), ...juntas.filter((x) => x.r).map((x) => x.r.s)])];
  const th = (k, t, c = 'r') => `<th class="${c}"><button data-orden="${k}" aria-pressed="${S.radarOrden === k}">${t}${S.radarOrden === k ? ' ↓' : ''}</button></th>`;
  const lecturas = Object.keys((S.escaneo && S.escaneo.lectura) || {}).length;
  return `<div class="sec-cab"><h2 id="hIdeas">Las mejores ahora</h2><span class="k">${esPublico() ? L('las que eligen el radar y GrowIA, iguales para todos', 'picked by the radar and GrowIA, the same for everyone') : 'las que eligen el radar, GrowIA y tu análisis'}</span></div>
    ${d && d.comentario ? `<p class="idea-panorama">${NOM_IA} ${haceCuanto(d.generado)}${L(`, tras leer la prensa de ${lecturas} empresas: `, `, after reading the press on ${lecturas} companies: `)}${escIA(d.comentario)}</p>` : ''}
    ${juntas.length ? `<div class="ideas-top3">${juntas.map((x, i) => tarjetaIdea(x, ctx, true, i + 1)).join('')}</div>` : `<div class="vacio">${L('Ahora mismo ninguna pasa los filtros: mejor esperar.', 'None passes the filters right now: better to wait.')}</div>`}
    <p class="nota">Cómo se eligen: GrowFolio se queda con las mejor respaldadas (los analistas dicen comprar, aún tienen margen para subir, al menos 3 de las 7 señales a favor y no repiten lo que ya llevan tus fondos). GrowIA lee sus noticias y elige las suyas una vez al día. Primero salen las que eligen los dos. Lo que ya se ha propuesto se mantiene salvo que llegue una noticia que cambie la tesis o se rompan sus números, y nada sale a la vez como idea y como «evitar». En las barras, verde es a favor, rojo en contra y gris neutral.</p>
    ${htmlEvitar()}
    ${htmlCambiosIdeas()}
    <div class="sec-cab" style="margin-top:44px"><h2>Todo el radar</h2><span class="k">${todas.length} empresas de España, Europa y EEUU, cada una con siete señales</span></div>
    <div class="tabs-fila"><div class="tabs" role="group" aria-label="Zona">${ZONAS.map((z) => `<button data-zona="${z}" aria-pressed="${S.radarZona === z}">${z}</button>`).join('')}</div>
      <label class="check-mini"><input type="checkbox" data-radar-min ${S.radarMin ? 'checked' : ''}> Con 5 analistas o más</label>
      <label class="check-mini"><input type="checkbox" data-radar-solidas ${S.radarSolidas ? 'checked' : ''}> Solo bien contrastadas (4 señales a favor o más)</label></div>
    <div class="tabla-w"><table class="ideas resp"><thead><tr><th>Empresa</th><th class="r">Precio</th><th>Consenso</th>${th('pot', 'Puede subir')}${th('neto', 'Te quedas')}${th('ctr', 'Señales', '')}<th>Prensa</th>${th('perf', 'PER futuro')}${th('div', 'Dividendo')}${th('c1a', '1 año')}</tr></thead><tbody>
    ${v.map((x) => `<tr class="${tuyas.has(x.s) ? 'tuya' : ''}"><td><div class="idea-cab">${logo(x.w, x.n, 'peq')}<b style="font-weight:600">${esc(nombreRadar(x))}</b></div><small>${lineaOrigen(x)}</small></td>
      <td class="r">${B('rp:' + x.s)}${B('rv:' + x.s, 'sub')}</td>
      <td>${esc(CONSENSO[x.r] || '—')}<small>${x.na ? x.na + ' analistas' : ''}</small></td>
      <td class="r">${B('ro:' + x.s)}</td><td class="r ${cls(x._neto)}" title="Lo que te quedaría si se cumple lo esperado (en el plazo de GrowIA o en los 12 meses de los analistas), con su dividendo y ya restados la tasa de compra, la retención que no se recupera y tus impuestos">${x._neto == null ? '—' : pctS(x._neto, 0)}${x._meses ? `<small>en ${plazoTxt(x._meses)}</small>` : ''}</td><td>${htmlContraste(x._ctr, true)}</td><td>${(() => { const l = lecturaDe(x.s); return l && l.txt ? `<span title="${esc(l.txt)}">${chipImpacto(l.imp)}</span>${l.rel >= 2 ? '<small>importante</small>' : ''}` : '<span class="k">—</span>'; })()}</td><td class="r">${x.perf > 0 ? fmtNum(x.perf, 1) : '—'}</td><td class="r">${x.div ? pct(x.div, 1) : '—'}</td><td class="r ${cls(x.c1a)}">${pctS(x.c1a, 0)}</td></tr>`).join('')}
    </tbody></table></div>
    ${total > corte ? `<button class="mas-filas" data-radar-todo>${S.radarTodo ? `Ver solo las ${corte} primeras` : `Ver las ${total}${S.radarMin ? ' con 5 analistas o más' : S.radarZona !== 'Todas' ? ` de ${esc(S.radarZona)}` : ''}`}</button>` : ''}
    <p class="nota">Puede subir: cuánto le queda para llegar al precio que esperan los analistas dentro de 12 meses. Te quedas: lo que ganarías si se cumple lo esperado, con el dividendo y ya restados la tasa de compra y los impuestos; si GrowIA tiene su propio objetivo y plazo para esa empresa (sale «en 2 meses», por ejemplo), es el suyo, y si no, el de los analistas a 12 meses. Prensa: lo que ha leído GrowIA en sus noticias. Señales: siete pruebas (analistas, si mejoran su opinión, beneficios, precio frente a su sector, tendencia y solidez del negocio).</p>`;
}

/* ---------- repintar solo cuando cambia una recomendación ---------- */
function firmaRecom(M) {
  const s = M.filas.map((f) => `${f.pos.id}:${f.senal.nivel}`).join('|');
  const pl = M.filas.map((f) => planVenta(f, M)).filter(Boolean).map((p) => `${p.f.pos.id}:${fmtNum(p.uds, 0)}:${p.ideas[0] ? p.ideas[0].s : ''}`).join('|');
  const id = mejoresIdeas(M).slice(0, 3).map((x) => x.s).join(',');
  return `${s}#${pl}#${id}`;
}
let repintadoT = null;
function vigilarRecomendaciones(M) {
  if (!S.firmaPintada) return;
  const f = firmaRecom(M);
  if (f === S.firmaPintada) return;
  const antes = Object.fromEntries(S.firmaPintada.split('#')[0].split('|').map((x) => x.split(':')));
  for (const fila of M.filas) {
    const a = antes[fila.pos.id];
    if (a && a !== fila.senal.nivel && !esPublico()) toast(`${fila.inst.corto}: la señal pasa de «${SENALES[a] || a}» a «${fila.senal.txt}»`, 6000);
  }
  S.firmaPintada = f;
  clearTimeout(repintadoT);
  repintadoT = setTimeout(() => {
    const ocupado = $('.hoja-fondo') || $('#asesorFondo') || (document.activeElement && document.activeElement.matches('input, textarea, select'));
    if (ocupado) { S.firmaPintada = 'pendiente'; return; }
    pintar();
  }, 1200);
}

