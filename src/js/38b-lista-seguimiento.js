/* ---------- 0.8.6 · Lista de seguimiento (pestaña 1 del plan; claude/encargo-pestana-1-lista.md) ----------
   Ideas, tercera pestaña (antes «Siguiendo»). Reutiliza lo de siempre: la lista vive en S.cartera.siguiendo (cifrada con la
   cartera), con seguir(), editarAvisoSeguido() y los avisos de 38-consulta.js. Lo nuevo:
   - dos vistas en el ordenador (Tabla y Tarjetas, el conmutador se recuerda en inv-lista-vista); en el móvil, solo tabla
   - «Columnas» en la tabla del modo avanzado: 1 mes, PER (con candado), volatilidad y del máximo (inv-lista-cols)
   - debajo, a la par: «Lo que supondría en tu cartera» (de la fila o tarjeta marcada) y «Lo que la IA ha leído hoy de lo que
     sigues» con el tono de cada noticia y lo que viene (resultados y dividendos). El tono sale del campo «imp» del escaneo
     de prensa, el mismo de siempre: sin llamada nueva ni coste extra. Si falta, o es «mixto», Neutral
   - listas: «Mi lista» y las que crees (S.cartera.listasSeg; cada empresa lleva su lista en «l»)
   - candados de Toisón Dorado: la columna PER, más de 10 empresas y más de una lista. Hoy no hay cobro: lo abre tieneDorado()
   Sin «compra», «vende» ni órdenes (CNMV): lo que supondría, y lo decide cada uno. */
const SEG_TOPE = 10;
const SEG_COLS = [['mes', '1 mes', '1 month'], ['per', 'PER', 'P/E'], ['vol', 'Volatilidad', 'Volatility'], ['max', 'Del máximo', 'From the high']];
const segPc = () => innerWidth >= 900;
const segVista = () => (LS.get('inv-lista-vista', 'tabla') === 'tarjetas' ? 'tarjetas' : 'tabla');
const segColsVistas = () => { const c = LS.get('inv-lista-cols', null); return SEG_COLS.map((x) => x[0]).filter((k) => (Array.isArray(c) ? c.includes(k) : true)); };
const segCand = () => `<span class="ls-cand" title="${L('Con Toisón Dorado', 'With Toisón Gold')}">${ICONOS_PL.candado}</span>`;
const listasSeg = () => [{ id: 'mi', n: L('Mi lista', 'My list') }, ...((S.cartera && S.cartera.listasSeg) || []).filter((l) => l && l.id && l.n)];
const listaActiva = () => (listasSeg().some((l) => l.id === S.segLista) ? S.segLista : 'mi');
const itemsDeLista = (id) => siguiendo().filter((x) => (x.l || 'mi') === id);
const segDeLimite = () => !tieneDorado() && siguiendo().length >= SEG_TOPE;

/* el tono de una noticia: positivo, negativo o neutral (lo mixto y lo que no viene, neutral) */
const SEG_TONOS = { positivo: ['up', '▲', 'Buena', 'Good'], negativo: ['down', '▼', 'Negativa', 'Negative'], neutral: ['neu', '●', 'Neutral', 'Neutral'] };
const segTono = (imp) => SEG_TONOS[imp] || SEG_TONOS.neutral;
const segChipTono = (imp) => { const t = segTono(imp); return `<i class="ls-tono ${t[0]}" data-tono="${t[0]}">${t[1]} ${L(t[2], t[3])}</i>`; };

/* los números de una empresa del radar: 1 mes, volatilidad y del máximo salen de los cierres semanales del radar */
function segPedirHist() {
  if (S.segHist !== undefined || S.segHistPedido || typeof radarHist !== 'function') return;
  S.segHistPedido = true;
  radarHist().then((rh) => { S.segHist = rh && rh.s ? rh : null; segRepintar(); }).catch(() => { S.segHist = null; });
}
function segMetricas(x) {
  const rh = S.segHist, e = rh && rh.s && rh.s[x.s];
  let pts = null, mes = null, vol = null;
  if (e && e.d && Array.isArray(e.v)) { pts = puntosRadarHist(e, rh); if (x.p > 0) pts.push([hoyIso(), +x.p]); }
  if (pts && pts.length > 6) {
    const lim = iso(new Date(Date.now() - 30 * 864e5));
    let ref = null;
    for (const [d, v] of pts) if (d <= lim) ref = v;
    if (ref > 0 && x.p > 0) mes = (x.p / ref - 1) * 100;
    const r = [];
    for (let i = 1; i < pts.length; i++) if (pts[i - 1][1] > 0 && pts[i][1] > 0) r.push(Math.log(pts[i][1] / pts[i - 1][1]));
    if (r.length >= 12) { const m = r.reduce((a, b) => a + b, 0) / r.length; vol = Math.sqrt(r.reduce((a, b) => a + (b - m) ** 2, 0) / (r.length - 1)) * Math.sqrt(52) * 100; }
  }
  return { mes, vol, max: x.mx > 0 && x.p > 0 ? Math.min(0, (x.p / x.mx - 1) * 100) : null, per: x.per > 0 ? x.per : null, spark: pts ? pts.slice(-6).map((p) => p[1]) : null };
}
function segSpark(v, w = 90, h = 26) {
  if (!v || v.length < 2) return '';
  const mn = Math.min(...v), mx = Math.max(...v), sube = v[v.length - 1] >= v[0];
  const d = v.map((y, i) => `${i ? 'L' : 'M'}${((i / (v.length - 1)) * w).toFixed(1)} ${(h - 3 - (mx > mn ? ((y - mn) / (mx - mn)) * (h - 6) : (h - 6) / 2)).toFixed(1)}`).join('');
  return `<svg class="ls-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--${sube ? 'sube' : 'baja'})" stroke-width="1.6"/></svg>`;
}
const segPill = (n, d = 1) => (n == null || !isFinite(n) ? '<span class="ls-pill flat">—</span>' : `<span class="ls-pill ${cls(n)}">${n >= 0 ? '▲' : '▼'} ${fmtNum(Math.abs(n), d)} %</span>`);

function segFilas(listaId) {
  return itemsDeLista(listaId).map((it) => { const x = radarPorSim(it.s), pr = precioSeguido(it); return { it, x, pr, m: x ? segMetricas(x) : {} }; });
}
/* lo que supondría meter 1.000 €: cuánto pesaría en tu cartera, lo que ya tienes de ella por dentro de tus fondos (o suelta), país y sector */
function segSupone(M, f) {
  const x = f.x, total = (M && M.total) || 0;
  const dentro = x && M && M.filas ? dentroDeFondos(M)(nombreRadar(x)) : 0;
  const suelta = x && M && M.filas ? M.filas.filter((q) => q.inst.yahoo && String(q.inst.yahoo).toUpperCase() === String(f.it.s).toUpperCase()).reduce((a, q) => a + (q.valor || 0), 0) : 0;
  const o = x ? origenRadar(x) : null;
  return { pesaria: ((1000 + dentro + suelta) / (total + 1000)) * 100, dentro, suelta, pais: o ? (o.sedeNombre || (o.bolsa && PAISES[o.bolsa]) || '—') : '—', sector: (x && x.sector) || '—' };
}
const segKpis = (xs) => `<div class="ls-kpis">${xs.map(([k, v, s = '']) => `<div class="ls-kpi"><small>${k}</small><b>${v}</b>${s ? `<span>${s}</span>` : ''}</div>`).join('')}</div>`;

/* resultados y dividendos de lo que sigues, en orden */
function segProximos(filas, dias = 90) {
  const hoy = hoyIso(), hasta = iso(new Date(Date.now() + dias * 864e5)), ev = [];
  for (const f of filas) {
    if (!f.x) continue;
    const n = f.it.n || nombreRadar(f.x);
    if (f.x.rd && f.x.rd >= hoy && f.x.rd <= hasta) ev.push({ d: f.x.rd, n, t: L('resultados', 'results') });
    if (f.x.xd && f.x.xd >= hoy && f.x.xd <= hasta) ev.push({ d: f.x.xd, n, t: L('ex-dividendo', 'ex-dividend') });
  }
  return ev.sort((a, b) => a.d.localeCompare(b.d));
}
const segNombre = (f) => esc(f.it.n || (f.x ? nombreRadar(f.x) : f.it.s));
const segLogo = (f) => logo(f.x && f.x.w, f.it.n, 'peq');
const segDato = (v, d = 1, suf = ' %') => (v == null || !isFinite(v) ? '—' : fmtNum(v, d) + suf);

function segCabecera(av, pc, vista) {
  const act = listaActiva(), n = siguiendo().length;
  const listas = `<div class="ls-listas" role="group" aria-label="${L('Listas', 'Lists')}">${listasSeg().map((l) => `<button type="button" class="ls-ch" data-seg-lista="${esc(l.id)}" aria-pressed="${l.id === act}">${esc(l.n)}</button>`).join('')}<button type="button" class="ls-ch ls-ch-nueva" data-seg-nueva>${ICONOS_PL.suma}${L('Nueva lista', 'New list')}${tieneDorado() ? '' : segCand()}</button></div>`;
  const conm = pc && av ? `<div class="ls-conm" role="group" aria-label="${L('Vista', 'View')}"><span>${L('Vista', 'View')}</span><button type="button" data-seg-vista="tabla" aria-pressed="${vista === 'tabla'}">${L('Tabla', 'Table')}</button><button type="button" data-seg-vista="tarjetas" aria-pressed="${vista === 'tarjetas'}">${L('Tarjetas', 'Cards')}</button></div>` : '';
  const cols = pc && av && vista === 'tabla' ? `<button type="button" class="ls-ch ls-cols" data-seg-cols>${ICONOS_PL.ajustes}${L('Columnas', 'Columns')}</button>` : '';
  const cont = `<button type="button" class="ls-cont" data-seg-dorado="limite" aria-label="${L(`${n} de ${SEG_TOPE} empresas; sin límite con Toisón Dorado`, `${n} of ${SEG_TOPE} companies; no limit with Toisón Gold`)}">${L(`${n} de ${SEG_TOPE}`, `${n} of ${SEG_TOPE}`)} ${segCand()}<small>${L('sin límite con Dorado', 'no limit with Gold')}</small></button>`;
  return `<div class="ls-cab">${listas}<div class="ls-der">${conm}${cols}${cont}</div></div>`;
}
function segTabla(filas, sel, av, pc) {
  const cols = av && pc ? segColsVistas() : [];
  const cab = [L('Nombre', 'Name'), pc ? L('Precio', 'Price') : L('Precio · hoy', 'Price · today'), ...(pc ? [L('Hoy', 'Today')] : []), ...cols.map((k) => { const c = SEG_COLS.find((x) => x[0] === k); return L(c[1], c[2]) + (k === 'per' ? ' ' + segCand() : ''); })];
  const celda = (f, k) => {
    const m = f.m;
    if (k === 'mes') return `<td><div class="ls-mes">${segSpark(m.spark)}<span class="${cls(m.mes)}">${segDato(m.mes)}</span></div></td>`;
    if (k === 'per') return `<td class="ls-per">${tieneDorado() ? segDato(m.per, 1, '') : segCand()}</td>`;
    if (k === 'vol') return `<td>${segDato(m.vol, 0)}</td>`;
    return `<td class="${cls(m.max)}">${segDato(m.max, 0)}</td>`;
  };
  const filasH = filas.map((f) => {
    const hoy = f.pr && f.pr.dia, pe = f.pr && f.pr.eur, marcada = sel && sel.it.s === f.it.s;
    const nom = `<button type="button" class="ls-nom" data-seg-sel="${esc(f.it.s)}" aria-pressed="${!!marcada}">${segLogo(f)}<span><b>${segNombre(f)}</b><small>${f.x ? lineaOrigenCorta(f.x) : esc(f.it.s)}</small></span></button>`;
    const precio = pc ? `<td>${pe ? precioFmt(pe) : '—'}</td><td>${segPill(hoy)}</td>` : `<td><b>${pe ? precioFmt(pe) : '—'}</b><br>${segPill(hoy)}</td>`;
    return `<tr data-seg-sel="${esc(f.it.s)}" class="${marcada ? 'ls-sel' : ''}"><td>${nom}</td>${precio}${cols.map((k) => celda(f, k)).join('')}</tr>`;
  }).join('');
  return `<div class="ls-tabla"><table><thead><tr>${cab.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${filasH}</tbody></table></div>`;
}
function segTarjetas(M, filas, sel, av) {
  const tj = filas.map((f) => {
    const s = segSupone(M, f), pe = f.pr && f.pr.eur, marcada = sel && sel.it.s === f.it.s;
    return `<article class="ls-tj${marcada ? ' ls-sel' : ''}" data-seg-sel="${esc(f.it.s)}"><button type="button" class="ls-tj-cab" data-seg-sel="${esc(f.it.s)}" aria-pressed="${!!marcada}">${segLogo(f)}<span><b>${segNombre(f)}</b><small>${f.x ? lineaOrigenCorta(f.x) : esc(f.it.s)}</small></span></button>
      <div class="ls-tj-p"><b>${pe ? precioFmt(pe) : '—'}</b>${segPill(f.pr && f.pr.dia)}</div>${segSpark(f.m.spark, 260, 44)}
      <footer><span><small>${L('Pesaría', 'Weight')}</small>${segDato(s.pesaria, 1)}</span><span><small>${L('Solape', 'Overlap')}</small>${s.dentro + s.suelta > 0 ? eurosFmt0(s.dentro + s.suelta) : L('ninguno', 'none')}</span>${av ? `<span><small>${L('Volat.', 'Vol.')}</small>${segDato(f.m.vol, 0)}</span><span><small>${L('Del máx.', 'From high')}</small><em class="${cls(f.m.max)}">${segDato(f.m.max, 0)}</em></span>` : `<span><small>${L('País', 'Country')}</small>${esc(s.pais)}</span>`}</footer></article>`;
  }).join('');
  const quedan = Math.max(0, SEG_TOPE - siguiendo().length);
  const nueva = `<button type="button" class="ls-tj ls-tj-nueva" data-seg-otra><span>${ICONOS_PL.suma}</span><b>${L('Seguir otra', 'Follow another')}</b><small>${tieneDorado() ? L(`Quedan ${quedan} de ${SEG_TOPE} · sin límite con Dorado`, `${quedan} of ${SEG_TOPE} left · no limit with Gold`) : L(`Quedan ${quedan} de ${SEG_TOPE} · sin límite con Dorado`, `${quedan} of ${SEG_TOPE} left · no limit with Gold`)} ${segCand()}</small></button>`;
  return `<div class="ls-rejilla">${tj}${nueva}</div>`;
}
const eurosFmt0 = (n) => fmtNum(n, 0) + ' €';

function segSupondria(M, sel, pc) {
  if (!sel) return '';
  const s = segSupone(M, sel), tengo = s.dentro + s.suelta, prox = segProximos([sel], 30);
  const botones = `<div class="ls-btns"><button type="button" class="btn peq" data-consulta="${esc(sel.it.s)}">${L('Ver la ficha', 'Open the card')}</button><button type="button" class="btn peq" data-seg-aviso="${esc(sel.it.s)}">${ICONOS.campana}${sel.it.baja || sel.it.sube ? L('Cambiar aviso', 'Change alert') : L('Ponerle aviso', 'Add alert')}</button><button type="button" class="btn peq" data-seguir="${esc(sel.it.s)}">${L('Dejar de seguir', 'Stop following')}</button>${listasSeg().length > 1 ? `<select class="ls-mover" data-seg-mover="${esc(sel.it.s)}" aria-label="${L('Mover a otra lista', 'Move to another list')}">${listasSeg().map((l) => `<option value="${esc(l.id)}"${l.id === (sel.it.l || 'mi') ? ' selected' : ''}>${esc(l.n)}</option>`).join('')}</select>` : ''}</div>`;
  const cuerpo = `<p class="ls-sup-t">${L('Si metieras 1.000 € en', 'If you put €1,000 into')} <b>${segNombre(sel)}</b></p>${segKpis([
    [L('Pesaría', 'It would weigh'), segDato(s.pesaria, 1), L('de tu cartera', 'of your portfolio')],
    [L('Solape', 'Overlap'), tengo > 0 ? eurosFmt0(tengo) : L('ninguno', 'none'), tengo > 0 ? (s.suelta > 0 ? L('ya la tienes', 'you already own it') : L('ya la llevas en tus fondos', 'already inside your funds')) : L('no la tienes ni por tus fondos', 'not in your holdings or funds')],
    [L('País', 'Country'), esc(s.pais)], [L('Sector', 'Sector'), esc(s.sector)]])}
    <p class="ls-nota">${prox.length ? L(`Próximos 30 días: ${prox.map((e) => `${fechaCortaL(e.d)}, ${e.t}`).join(' · ')}.`, `Next 30 days: ${prox.map((e) => `${fechaCortaL(e.d)}, ${e.t}`).join(' · ')}.`) : L('No hay fechas de esta empresa en los próximos 30 días.', 'No dates for this company in the next 30 days.')}</p>${botones}`;
  return `<section class="ls-t" aria-labelledby="hLsSup"><div class="ls-et"><h2 id="hLsSup">${L('Lo que supondría en tu cartera', 'What it would mean in your portfolio')}</h2></div>${cuerpo}<p class="ls-como"><b>${L('Cómo se calcula', 'How it is worked out')} ·</b> ${L('«Pesaría» es lo que sería con 1.000 € más, junto con lo que ya tengas de ella; «Solape», lo que ya llevas de esa empresa dentro de tus fondos o suelta. No es una recomendación.', '“It would weigh” is its share with €1,000 more, together with what you already hold; “Overlap” is what you already hold of that company inside your funds or directly. It is not a recommendation.')}</p></section>`;
}
function segIA(filas) {
  const lect = filas.map((f) => ({ f, i: informeIdea(f.it.s) })).filter((q) => q.i && q.i.novedades);
  lect.sort((a, b) => ((lecturaDe(b.f.it.s) || {}).rel || 0) - ((lecturaDe(a.f.it.s) || {}).rel || 0));
  const lista = lect.length ? `<ul class="ls-noticias">${lect.slice(0, 6).map(({ f, i }) => `<li><b>${segNombre(f)}</b><span>${segChipTono(i.impacto)}${escIA(i.novedades)}</span></li>`).join('')}</ul>
    <p class="ls-nota">${L('El tono es el de la noticia, leído por la IA: no dice qué hacer.', 'The tone is the news item’s, read by the AI: it doesn’t say what to do.')}</p>` : `<p class="ls-nota">${L('La IA aún no ha leído noticias de lo que sigues.', 'The AI hasn’t read news on what you follow yet.')}</p>`;
  const prox = segProximos(filas).slice(0, 4);
  const viene = `<div class="ls-viene"><small>${L('Lo que viene', 'What’s coming')}</small>${prox.length ? `<p>${prox.map((e) => `<b>${fechaCortaL(e.d)}</b> · ${L(e.t, e.t)} ${L('de', 'of')} ${esc(e.n)}`).join(' &nbsp;·&nbsp; ')}</p>` : `<p>${L('No hay fechas de resultados ni dividendos en los próximos 90 días.', 'No results or dividend dates in the next 90 days.')}</p>`}</div>`;
  return `<section class="ls-t" aria-labelledby="hLsIA"><div class="ls-et"><h2 id="hLsIA">${L('Lo que la IA ha leído hoy de lo que sigues', 'What the AI read today on what you follow')}</h2></div>${lista}${viene}</section>`;
}
function segPregunta() {
  const qs = [L('¿Qué ha pasado hoy con lo que sigo?', 'What happened today with what I follow?'), L('¿Se parece algo de mi lista a lo que ya tengo?', 'Does anything on my list resemble what I already hold?')];
  return `<section class="ls-t" aria-labelledby="hLsPreg"><div class="ls-et"><h2 id="hLsPreg">${ICONOS_PL.asistente}${L('Pregúntale a la IA', 'Ask the AI')}</h2></div><div class="ls-pregs">${qs.map((q) => `<button type="button" class="btn peq" data-accion="asesor" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div></section>`;
}
function segCuerpo(M) {
  const pc = segPc(), av = modoApp() === 'avanzado', vista = pc && av ? segVista() : 'tabla';
  const act = listaActiva(), filas = segFilas(act), nombreLista = (listasSeg().find((l) => l.id === act) || {}).n;
  const sel = filas.find((f) => f.it.s === S.segSel) || filas[0] || null;
  const cuerpoLista = !filas.length ? `<p class="ls-nota ls-vacia">${L('Esta lista está vacía. Toca «Seguir» en una empresa de «Del radar» para añadirla aquí.', 'This list is empty. Tap “Follow” on a company under “From the radar” to add it here.')}</p>`
    : vista === 'tarjetas' ? segTarjetas(M, filas, sel, av) : segTabla(filas, sel, av, pc);
  const como = vista === 'tabla' && av && pc ? L('Tabla o tarjetas: se queda la que elijas. «Columnas» elige lo que ves; los múltiplos salen de datos con licencia y van con Toisón Dorado.', 'Table or cards: your choice is kept. “Columns” picks what you see; multiples come from licensed data and go with Toisón Gold.')
    : vista === 'tarjetas' ? L('Tabla o tarjetas: se queda la que elijas. «Pesaría»: lo que sería en tu cartera con 1.000 €. «Solape»: lo que ya llevas de esa empresa por tus fondos.', 'Table or cards: your choice is kept. “Weight”: what it would be in your portfolio with €1,000. “Overlap”: what you already hold of that company through your funds.')
    : '';
  const lista = `<section class="ls-t ls-lista" aria-labelledby="hSeg"><div class="ls-et"><h2 id="hSeg">${esc(nombreLista || '')}</h2></div>${segCabecera(av, pc, vista)}${cuerpoLista}
    <p class="ls-como">${como ? como + ' ' : ''}${L('Lo que sigues no es una recomendación: es tu lista. Precios del radar de Toisón, en euros.', 'What you follow is not a recommendation: it’s your list. Prices from the Toisón radar, in euros.')}</p></section>`;
  const abajo = pc ? `<div class="ls-dos">${segSupondria(M, sel, pc)}${segIA(filas)}</div>` : `${segSupondria(M, sel, pc)}${segPregunta()}`;
  return lista + abajo;
}
const segRepintar = () => { const r = document.getElementById('segRaiz'); if (r && S.vista === 'expertos' && S.expTab === 'siguiendo' && S.M) r.innerHTML = segCuerpo(S.M); };

function htmlListaSeguimiento(M) {
  segPedirHist();
  if (!siguiendo().length) return `<section class="ov-vacio seg-vacio"><h2>${L('Sigue empresas sin tenerlas', 'Follow companies you don’t own')}</h2><p>${L('En cualquier idea o empresa del radar, toca «Seguir». Aquí verás cómo van, lo que supondría tenerlas en tu cartera, lo que ha leído la IA de ellas y lo que viene; y te aviso al precio que digas. Lo que sigues no es una recomendación: es tu lista.', 'On any idea or radar company, tap “Follow”. Here you’ll see how they’re doing, what owning them would mean for your portfolio, what the AI has read about them and what’s coming; and I’ll alert you at the price you choose. What you follow is not a recommendation: it’s your list.')}</p></section>`;
  return `<div id="segRaiz">${segCuerpo(M)}</div>`;
}

/* ---------- candados de Toisón Dorado (hoy sin cobro: los abre tieneDorado) ---------- */
function hojaDoradoSeg(que) {
  const t = { per: [L('Los múltiplos', 'Multiples'), L('La columna del PER, y los múltiplos que vengan, salen de datos con licencia.', 'The P/E column, and any multiples to come, use licensed data.')],
    limite: [L('Sin límite de empresas', 'No limit on companies'), L(`Sin Toisón Dorado puedes seguir hasta ${SEG_TOPE} empresas. Con él, las que quieras.`, `Without Toisón Gold you can follow up to ${SEG_TOPE} companies. With it, as many as you like.`)],
    listas: [L('Más de una lista', 'More than one list'), L('Varias listas (una de dividendos, otra por si baja…) son de Toisón Dorado. «Mi lista» es de todos.', 'Several lists (one for dividends, another in case it drops…) are part of Toisón Gold. “My list” is for everyone.')] }[que] || ['', ''];
  hoja(t[0], `<div class="hoja-escr"><p class="et-dorado-g">${selloDorado('sd-peq')}${L('Toisón Dorado', 'Toisón Gold')}</p><p>${t[1]}</p>
    <p class="nota">${tieneDorado() ? L('Ya tienes Toisón Dorado.', 'You already have Toisón Gold.') : L('Será parte de Toisón Dorado, el plan de pago. Todavía no está disponible.', 'It will be part of Toisón Gold, the paid plan. It isn’t available yet.')}</p>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>${L('Entendido', 'Got it')}</button></div></div>`);
}
function hojaColumnasSeg() {
  const act = segColsVistas();
  const h = hoja(L('Columnas', 'Columns'), `<form id="fCols" class="ls-cols-f">${SEG_COLS.map(([k, es, en]) => `<label class="ls-col-o"><input type="checkbox" name="${k}" ${act.includes(k) ? 'checked' : ''}${k === 'per' && !tieneDorado() ? ' data-cand' : ''}><span>${L(es, en)}${k === 'per' && !tieneDorado() ? ' ' + segCand() : ''}</span></label>`).join('')}
    <p class="nota">${L('Los múltiplos (PER) salen de datos con licencia y van con Toisón Dorado.', 'Multiples (P/E) use licensed data and go with Toisón Gold.')}</p>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>${L('Cancelar', 'Cancel')}</button><button type="submit" class="btn pri">${L('Listo', 'Done')}</button></div></form>`);
  for (const i of $$('input[data-cand]', h.el)) i.addEventListener('change', () => { if (i.checked) { i.checked = false; hojaDoradoSeg('per'); } });
  $('#fCols', h.el).onsubmit = (ev) => { ev.preventDefault(); LS.set('inv-lista-cols', SEG_COLS.map((x) => x[0]).filter((k) => ev.target[k] && ev.target[k].checked)); h.cerrar(); segRepintar(); };
}
function hojaNuevaListaSeg() {
  const h = hoja(L('Nueva lista', 'New list'), `<form id="fLista" novalidate><label class="campo">${L('Nombre', 'Name')}<input name="n" maxlength="24" autocomplete="off" placeholder="${L('Dividendos', 'Dividends')}"></label><div class="error" id="errLista"></div>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>${L('Cancelar', 'Cancel')}</button><button type="submit" class="btn pri">${L('Crear', 'Create')}</button></div></form>`);
  $('#fLista', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    const n = ev.target.n.value.trim().slice(0, 24);
    if (!n) { $('#errLista', h.el).textContent = L('Ponle un nombre.', 'Give it a name.'); return; }
    if (listasSeg().some((l) => l.n.toLowerCase() === n.toLowerCase())) { $('#errLista', h.el).textContent = L('Ya tienes una lista con ese nombre.', 'You already have a list with that name.'); return; }
    const id = 'l' + Date.now().toString(36);
    (S.cartera.listasSeg = S.cartera.listasSeg || []).push({ id, n });
    S.segLista = id; S.segSel = null;
    h.cerrar();
    await guardarCartera(`Lista nueva: ${n}`);
    segRepintar();
  };
}
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-seg-lista],[data-seg-nueva],[data-seg-vista],[data-seg-cols],[data-seg-sel],[data-seg-dorado],[data-seg-otra]');
  if (!b || !S.cartera) return;
  const d = b.dataset;
  if (d.segLista) { S.segLista = d.segLista; S.segSel = null; segRepintar(); }
  else if (b.matches('[data-seg-nueva]')) { if (!tieneDorado()) hojaDoradoSeg('listas'); else hojaNuevaListaSeg(); }
  else if (d.segVista) { LS.set('inv-lista-vista', d.segVista); segRepintar(); }
  else if (b.matches('[data-seg-cols]')) hojaColumnasSeg();
  else if (d.segDorado) hojaDoradoSeg(d.segDorado);
  else if (b.matches('[data-seg-otra]')) { if (segDeLimite()) hojaDoradoSeg('limite'); else { S.expTab = 'ideas'; pintar(); toast(L('Toca «Seguir» en la empresa que quieras añadir.', 'Tap “Follow” on the company you want to add.'), 4000); } }
  else if (d.segSel) { if (e.target.closest('a, select, [data-seguir], [data-seg-aviso], [data-consulta]')) return; S.segSel = d.segSel; segRepintar(); }
});
document.addEventListener('change', async (e) => {
  const s = e.target.closest && e.target.closest('[data-seg-mover]');
  if (!s || !S.cartera) return;
  const it = siguiendo().find((x) => x.s === s.dataset.segMover); if (!it) return;
  it.l = s.value === 'mi' ? undefined : s.value;
  S.segLista = s.value;
  await guardarCartera(`Mover ${it.n}`);
  segRepintar();
});
