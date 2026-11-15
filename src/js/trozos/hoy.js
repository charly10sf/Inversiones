/* =====================================================================
   Trozo «hoy» (0.9, maqueta del 15 nov, B2): las pestañas Rendimiento, Caída y Cobros de la gráfica de Hoy. Valor sigue
   en el núcleo (grafHero). Rendimiento y Caída salen de lo que tienes hoy con los precios de cada día (serieCartera),
   igual que Valor: no hay aportaciones dentro, así que el rendimiento no las cuenta y la caída no la tapan. Cobros, de
   lo que pagó cada acción (dividendos_pagos) por las acciones que tenías ese día, ya con la retención; lo de los
   próximos meses, de dividendosMeses. Se pinta con window.HOY_GRAF(contenedor, M); el núcleo lo baja al abrir una.
   ===================================================================== */
(() => {
  const EN_R = {
    '1S': ['en la última semana', 'over the last week'], '1M': ['en el último mes', 'over the last month'], '3M': ['en los últimos 3 meses', 'over the last 3 months'],
    '6M': ['en los últimos 6 meses', 'over the last 6 months'], '1A': ['en el último año', 'over the last year'], '3A': ['en los últimos 3 años', 'over the last 3 years'],
    '5A': ['en los últimos 5 años', 'over the last 5 years'], 'Máx': ['desde que hay precios', 'since prices began'], 'Inicio': ['desde tu primera compra', 'since your first purchase'],
  };
  const enR = (rg) => L(...(EN_R[rg] || EN_R['1A']));
  const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const mesC = (m) => (IDIOMA === 'en' ? MESES_EN[m].slice(0, 3) : MESES[m]);
  const camino = (P) => P.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
  const deR = (rg) => enR(rg).replace(/^en el /, 'del ').replace(/^en los /, 'de los ').replace(/^en la /, 'de la ');
  let N = 0;

  if (!$('#hgCss')) {
    const s = document.createElement('style'); s.id = 'hgCss';
    s.textContent = `.hg{display:block;width:100%;height:auto;overflow:visible;touch-action:pan-y}.hg-eje{font:500 11px/1 var(--ui);fill:var(--tenue);font-variant-numeric:tabular-nums}.hg-y{paint-order:stroke;stroke:var(--fondo);stroke-width:3px;stroke-linejoin:round}.hg-rej{stroke:var(--borde);stroke-width:1;opacity:.55}.hg-cero{stroke:var(--borde);stroke-width:1;stroke-dasharray:2 5}.hg-otra{fill:none;stroke:var(--texto-2);stroke-width:1.6;stroke-dasharray:5 5;opacity:.85}.hg-otra-p{fill:var(--fondo);stroke:var(--texto-2);stroke-width:1.6}.hg-fin{font:500 12px/1 var(--ui);fill:var(--texto-2)}.hg-fin .v{font-weight:700;font-size:15px;font-variant-numeric:tabular-nums;fill:var(--texto)}.hg-fin.tu .v{fill:var(--grafica,var(--primario))}.hg-et{font:600 11.5px/1 var(--ui);fill:var(--texto-2);paint-order:stroke;stroke:var(--fondo);stroke-width:4px;stroke-linejoin:round}.hg-barra{fill:var(--grafica,var(--primario))}.hg-barra.prev{fill:color-mix(in srgb,var(--grafica,var(--primario)) 12%,transparent);stroke:var(--grafica,var(--primario));stroke-width:1.4;stroke-dasharray:3 3}.hg-barra-n{font:600 11px/1 var(--ui);fill:var(--texto-2);font-variant-numeric:tabular-nums}.hg-barra-n.prev{fill:var(--tenue)}.hg-mira line{stroke:var(--texto-2);stroke-width:1;stroke-dasharray:2 3}.hg-mira circle{fill:var(--fondo);stroke:var(--texto);stroke-width:2}.hm-mc b{display:block;font:700 24px/1.05 var(--ui);letter-spacing:-.025em;font-variant-numeric:tabular-nums;color:var(--texto);white-space:nowrap}.hm-mc span{display:flex;align-items:center;gap:7px;margin-top:6px;font:var(--nota-s);color:var(--texto-2);white-space:nowrap}.hm-tu b{font-size:46px}.hm-tu.up b,.hm-dif.up b{color:var(--sube)}.hm-tu.down b,.hm-dif.down b{color:var(--baja)}.hm-ln{flex:none;width:20px;height:0;border-top:3px solid var(--grafica,var(--primario));border-radius:2px}.hm-ln.p{height:2px;border:0;border-radius:0;background:repeating-linear-gradient(90deg,var(--texto-2) 0 5px,transparent 5px 9px)}.hm-dif{padding:8px 13px 9px;border-radius:13px;background:color-mix(in srgb,var(--sube) 11%,transparent)}.hm-dif.down{background:color-mix(in srgb,var(--baja) 11%,transparent)}.hm-dif b{font-size:19px}.hm-dif span{margin-top:4px}.hoy-marc p{flex-basis:100%;margin:2px 0 0;font:var(--nota-s);color:var(--tenue)}@media (max-width:759px){.hm-tu b{font-size:38px}.hm-mc b{font-size:20px}.hm-dif b{font-size:16px}.hg-fin{font-size:10.5px}.hg-fin .v{font-size:12.5px}}`;
    document.head.appendChild(s);
  }

  /* el svg con su mira: al pasar el ratón o el dedo, la fecha y el dato (mira(x) dice dónde y qué) */
  function montar(g, W, H, dentro, titulo, mira) {
    const u = 'hg' + (++N);
    g.innerHTML = `<svg class="hg" viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(titulo)}"><defs><linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--grafica,var(--primario));stop-opacity:.34"/><stop offset=".6" style="stop-color:var(--grafica,var(--primario));stop-opacity:.08"/><stop offset="1" style="stop-color:var(--grafica,var(--primario));stop-opacity:0"/></linearGradient><linearGradient id="${u}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--baja);stop-opacity:.05"/><stop offset="1" style="stop-color:var(--baja);stop-opacity:.38"/></linearGradient><filter id="${u}b" x="-5%" y="-40%" width="110%" height="180%"><feGaussianBlur stdDeviation="${W < 500 ? 4 : 6.5}"/></filter></defs>${dentro.replace(/#U/g, '#' + u)}<g class="hg-mira" visibility="hidden"><line y1="10" y2="${H - 30}"/><circle r="5"/></g><rect class="zona" width="${W}" height="${H}" fill="transparent"/></svg><div class="gh-fecha" hidden></div>`;
    const sv = g.firstChild, f = g.lastChild, cz = sv.querySelector('.hg-mira'), ln = cz.querySelector('line'), ci = cz.querySelector('circle');
    const ver = (ev) => {
      const r = sv.getBoundingClientRect(), o = mira(((ev.clientX - r.left) / r.width) * W); if (!o) return;
      cz.setAttribute('visibility', o.y == null ? 'hidden' : 'visible');
      ln.setAttribute('x1', o.x); ln.setAttribute('x2', o.x); ci.setAttribute('cx', o.x); if (o.y != null) ci.setAttribute('cy', o.y);
      f.innerHTML = o.t; f.hidden = false;
      const cw = g.clientWidth, an = f.offsetWidth || 90;
      f.style.left = Math.min(Math.max((o.x / W) * cw, an / 2 + 4), cw - an / 2 - 4) + 'px';
    };
    const fuera = () => { cz.setAttribute('visibility', 'hidden'); f.hidden = true; };
    const z = sv.querySelector('.zona');
    z.addEventListener('pointermove', ver); z.addEventListener('pointerdown', ver); z.addEventListener('pointerleave', fuera); z.addEventListener('pointercancel', fuera);
  }
  const vacio = (g, t) => { g.innerHTML = `<div class="vacio">${t || L('Faltan precios para dibujarlo.', 'Not enough prices to draw it.')}</div>`; };
  function ejeX(T, X, W, H, movil) {
    const k = movil ? 3 : 6, t0 = T[0], t1 = T[T.length - 1], dias = (t1 - t0) / 864e5, o = [];
    for (let j = 0; j < k; j++) {
      const t = t0 + (j / (k - 1)) * (t1 - t0), d = new Date(t);
      const tx = dias < 9 ? `${DIAS_SEM[d.getDay()]} ${d.getDate()}` : dias < 120 ? `${d.getDate()} ${mesC(d.getMonth())}` : `${mesC(d.getMonth())} ${d.getFullYear()}`;
      o.push(`<text class="hg-eje" x="${(j === 0 ? 6 : j === k - 1 ? W - 6 : X(t)).toFixed(1)}" y="${H - 9}" text-anchor="${j === 0 ? 'start' : j === k - 1 ? 'end' : 'middle'}">${tx}</text>`);
    }
    return o.join('');
  }
  const cerca = (P, x) => { let k = 0, b = 1e9; P.forEach((p, j) => { const d = Math.abs(p[0] - x); if (d < b) { b = d; k = j; } }); return k; };
  const ponCab = (h) => { const c = $('#evoCab'); if (c) c.innerHTML = h; };

  /* ---------- Rendimiento: tu % y el del índice, sin aportaciones; el marcador arriba y el dato al final de cada línea ---------- */
  function rend(g, M, rg, W, H, movil) {
    const s = serieCartera(M, diasRango(rg));
    if (s.length < 2) return vacio(g);
    const T = s.map((x) => tiempoDe(x.d)), p = s.map((x) => (x.v / s[0].v - 1) * 100);
    const bn = nombreBench(benchDe(S.bench)), bm = rendCmp() ? new Map(serieComparada(s, S.bench).map((x) => [x.d, (x.v / s[0].v - 1) * 100])) : null;
    const b = bm && bm.size > 1 ? s.map((x) => (bm.has(x.d) ? bm.get(x.d) : null)) : null;
    const bFin = b ? b.filter((v) => v != null).pop() : null;
    const hueco = movil ? 70 : 152, Wd = W - hueco, yT = 16, y0 = H - 30;
    const todo = p.concat(b ? b.filter((v) => v != null) : [], [0]);
    let mn = Math.min(...todo), mx = Math.max(...todo); if (mx - mn < 0.4) { mx += 0.2; mn -= 0.2; }
    const X = (t) => ((t - T[0]) / Math.max(1, T[T.length - 1] - T[0])) * Wd, Y = (v) => yT + (1 - (v - mn) / (mx - mn)) * (y0 - yT);
    const P = p.map((v, i) => [X(T[i]), Y(v)]), d = camino(P);
    const paso = [0.5, 1, 2, 5, 10, 20, 50, 100].find((q) => (mx - mn) / q <= 4) || 200;
    let h = '';
    for (let v = Math.ceil(mn / paso) * paso; v <= mx; v += paso) if (Math.abs(v) > 1e-9) h += `<line class="hg-rej" x1="0" x2="${Wd}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="hg-eje hg-y" x="4" y="${(Y(v) - 5).toFixed(1)}">${pctS(v, paso < 1 ? 1 : 0)}</text>`;
    h += `<line class="hg-cero" x1="0" x2="${Wd}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/><path d="${d}L${Wd} ${y0}L0 ${y0}Z" fill="url(#Ua)"/>`;
    if (b) { const Q = b.map((v, i) => (v == null ? null : [X(T[i]), Y(v)])).filter(Boolean); if (Q.length > 1) h += `<path class="hg-otra" d="${camino(Q)}"/><circle class="hg-otra-p" cx="${Q[Q.length - 1][0].toFixed(1)}" cy="${Q[Q.length - 1][1].toFixed(1)}" r="3"/>`; }
    h += `<path d="${d}" fill="none" stroke="var(--grafica,var(--primario))" stroke-width="${movil ? 7 : 10}" opacity=".4" filter="url(#Ub)"/><path d="${d}" fill="none" stroke="var(--grafica,var(--primario))" stroke-width="${movil ? 2.4 : 3}" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${P[P.length - 1][0].toFixed(1)}" cy="${P[P.length - 1][1].toFixed(1)}" r="4.5" fill="var(--fondo)" stroke="var(--grafica,var(--primario))" stroke-width="2.5"/>`;
    // el dato de cada línea, a su altura y al final (si quedan pegados, se separan)
    const fin = [{ v: p[p.length - 1], k: 'tu', t: movil ? L('Tú', 'You') : L('Tu cartera', 'Your portfolio') }].concat(bFin != null ? [{ v: bFin, k: 'ref', t: movil ? bn.split(' ')[0] : bn }] : []);
    const sep = movil ? 34 : 42, gx = Wd + (movil ? 9 : 16), lo = yT + 14, hi = y0 - 22;
    fin.forEach((x) => { x.y = Math.min(hi, Math.max(lo, Y(x.v))); });
    const [a1, a2] = [...fin].sort((x, z) => x.y - z.y);
    if (a2 && a2.y - a1.y < sep) { const m = Math.min(hi - sep / 2, Math.max(lo + sep / 2, (a1.y + a2.y) / 2)); a1.y = m - sep / 2; a2.y = m + sep / 2; }
    h += fin.map((x) => { const y = x.y; return `<text class="hg-fin ${x.k}" x="${gx}" y="${(y - 4).toFixed(1)}"><tspan>${esc(x.t)}</tspan><tspan class="v" x="${gx}" dy="${movil ? 15 : 18}">${pctS(x.v, 2)}</tspan></text>`; }).join('');
    h += ejeX(T, X, Wd, H, movil);
    montar(g, W, H, h, L('Rendimiento', 'Return'), (x) => { const k = cerca(P, x); return { x: P[k][0], y: P[k][1], t: `${esc(fechaPunto(s[k].d))} · ${L('tú', 'you')} ${pctS(p[k], 1)}${b && b[k] != null ? ` · ${esc(bn)} ${pctS(b[k], 1)}` : ''}` }; });
    // el marcador: tu %, el del índice y la diferencia en puntos
    const marc = $('#hoyMarc'), pt = p[p.length - 1];
    if (marc) {
      const dif = bFin == null ? null : pt - bFin, d1 = dif == null ? 0 : Math.round(dif * 10) / 10;
      marc.innerHTML = `<div class="hm-mc hm-tu ${cls(pt)}"><b>${pctS(pt, 2)}</b><span><i class="hm-ln" aria-hidden="true"></i>${L('Tu cartera', 'Your portfolio')}</span></div>`
        + (dif == null ? '' : `<div class="hm-mc hm-ref"><b>${pctS(bFin, 2)}</b><span><i class="hm-ln p" aria-hidden="true"></i>${esc(bn)}</span></div><div class="hm-mc hm-dif ${d1 >= 0 ? 'up' : 'down'}"><b>${d1 > 0 ? '+' : ''}${fmtNum(d1, 1)} ${Math.abs(d1) === 1 ? L('punto', 'point') : L('puntos', 'points')}</b><span>${d1 > 0 ? L('le ganas al índice', 'you beat the index') : d1 < 0 ? L('te gana el índice', 'the index beats you') : L('igual que el índice', 'level with the index')}</span></div>`)
        + `<p>${mayus(enR(rg))}, ${L('sin contar lo que has aportado: lo que tienes hoy, con los precios de cada día.', 'not counting what you put in: what you hold today, at each day’s prices.')}</p>`;
    }
    ponCab(`<span class="hv-p ${cls(pt)}">${pctS(pt, 2)}</span><span class="k">${L('tu cartera', 'your portfolio')} ${enR(rg)}</span>`);
  }

  /* ---------- Caída: lo lejos que está de su máximo, la peor del periodo, su fecha y lo que tardó en recuperarse ---------- */
  function caida(g, M, rg, W, H, movil) {
    // el máximo cuenta desde antes del periodo (hasta 10 años): una caída que empezó antes no sale como «en máximos»
    const todo = serieCartera(M, Math.max(diasRango(rg), 3650));
    if (todo.length < 2) return vacio(g);
    const desde = iso(new Date(Date.now() - diasRango(rg) * 864e5));
    let mx = 0; const dd = [], imx = [];
    todo.forEach((x, i) => { if (x.v > todo[mx].v) mx = i; dd.push((x.v / todo[mx].v - 1) * 100); imx.push(mx); });
    let a = todo.findIndex((x) => x.d >= desde); if (a < 0 || a > todo.length - 2) a = Math.max(0, todo.length - 2);
    const s = todo.slice(a), D = dd.slice(a), T = s.map((x) => tiempoDe(x.d));
    let k = 0; D.forEach((v, j) => { if (v < D[k]) k = j; });
    let rec = -1; for (let i = a + k; i < todo.length; i++) if (dd[i] > -0.05) { rec = i; break; }
    const yT = 18, y0 = H - 30, mn = Math.min(-0.5, ...D) * 1.06;
    const X = (t) => ((t - T[0]) / Math.max(1, T[T.length - 1] - T[0])) * W, Y = (v) => yT + (v / mn) * (y0 - yT - 22);
    const P = D.map((v, i) => [X(T[i]), Y(v)]), d = camino(P);
    let h = `<line class="hg-cero" x1="0" x2="${W}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/><path d="${d}L${W} ${Y(0).toFixed(1)}L0 ${Y(0).toFixed(1)}Z" fill="url(#Ur)"/><path d="${d}" fill="none" stroke="var(--baja)" stroke-width="${movil ? 2.4 : 3}" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${P[P.length - 1][0].toFixed(1)}" cy="${P[P.length - 1][1].toFixed(1)}" r="4.5" fill="var(--fondo)" stroke="var(--baja)" stroke-width="2.5"/>`;
    if (D[k] < -0.5) { const x = Math.min(W - 8, Math.max(8, P[k][0])); h += `<text class="hg-et" x="${x.toFixed(1)}" y="${Math.min(y0 - 4, P[k][1] + 16).toFixed(1)}" text-anchor="${x > W * 0.75 ? 'end' : x < W * 0.25 ? 'start' : 'middle'}">${pctS(D[k], 1)} · ${esc(fechaCorta(s[k].d))}</text>`; }
    h += ejeX(T, X, W, H, movil);
    montar(g, W, H, h, L('Caída desde el máximo', 'Drawdown from the high'), (x) => { const j = cerca(P, x); return { x: P[j][0], y: P[j][1], t: `${esc(fechaPunto(s[j].d))} · ${pctS(D[j], 1)}` }; });
    const ahora = D[D.length - 1], dias = (i, j) => Math.round((tiempoDe(todo[j].d) - tiempoDe(todo[i].d)) / 864e5);
    const peor = D[k] > -0.5 ? L(`sin caídas que contar ${enR(rg)}`, `no drops worth mentioning ${enR(rg)}`)
      : L(`la peor ${deR(rg)}, ${pctS(D[k], 1)} el ${fechaConAnio(s[k].d)}, ${rec > 0 ? `tardó ${duracion(dias(a + k, rec))} en recuperarse` : 'aún sin recuperar'}`, `the worst ${enR(rg)}, ${pctS(D[k], 1)} on ${fechaConAnio(s[k].d)}, ${rec > 0 ? `back in ${dias(a + k, rec)} days` : 'not recovered yet'}`);
    ponCab(`${ahora > -0.3 ? `<span class="hv-p up">${L('En máximos', 'At its high')}</span>` : `<span class="hv-p down"><i aria-hidden="true">▼</i>${pctS(ahora, 2)}</span>`}<span class="k">${ahora > -0.3 ? '' : L(`desde tu máximo del ${fechaConAnio(todo[imx[imx.length - 1]].d)} · `, `from your high of ${fechaConAnio(todo[imx[imx.length - 1]].d)} · `)}${peor}</span>`);
  }

  /* ---------- Cobros: dividendos netos por mes; lo cobrado, lleno, y lo previsto, en hueco ---------- */
  function cobros(g, M, rg, W, H, movil) {
    const hoy = hoyIso(), t = tramoAhorro(), mesHoy = hoy.slice(0, 7);
    const nM = { '6M': 6, '1A': 12, '3A': 36, '5A': 60, 'Máx': 120 }[rg] || Math.max(6, Math.min(120, Math.round(diasRango(rg) / 30.4)));
    const ini = sumarMeses(hoy.slice(0, 8) + '01', -nM + 1);
    const meses = new Map();
    for (let i = 0; i < nM + 3; i++) { const k = sumarMeses(ini, i).slice(0, 7); meses.set(k, { k, c: 0, p: 0, de: [] }); }
    // lo cobrado: lo que pagó cada una (fecha ex-dividendo) por las acciones que tenías ese día, menos lo que retiene su
    // país y no recuperas y menos tu tramo del ahorro (como dividendosMeses)
    for (const f of M.filas) {
      const q = f.p || {}; if (!Array.isArray(q.dividendos_pagos)) continue;
      let lotes = null; try { lotes = lotesDe(f.pos); } catch (e) {}
      const aEur = q.precio > 0 && q.precio_local > 0 ? q.precio / q.precio_local : 1, fis = fiscalidadSede(f.inst.pais, f.inst.tipo);
      for (const [d, v] of q.dividendos_pagos) {
        if (d < ini || d >= hoy || !(v > 0)) continue;
        const m = meses.get(d.slice(0, 7)); if (!m) continue;
        const uds = lotes ? sum(lotes.filter((l) => (l.mezcla ? !f.pos.desde || f.pos.desde < d : l.f < d)), (l) => l.u) : (!f.pos.desde || f.pos.desde < d ? f.uds || 0 : 0);
        if (!(uds > 0)) continue;
        const neto = uds * v * aEur * (1 - t - (fis.pierde || 0) / 100);
        m.c += neto; m.de.push(f.inst.corto || f.inst.nombre);
      }
    }
    // lo previsto, de aquí a tres meses
    let prox = null;
    try {
      const DM = dividendosMeses(M);
      for (const x of DM.meses) { const m = meses.get(x.k); if (m && x.k >= mesHoy) { m.p += x.neto; x.de.forEach((y) => m.de.push(y.n)); } }
      prox = DM.meses.flatMap((x) => x.de).filter((y) => y.d >= hoy).sort((a, z) => (a.d < z.d ? -1 : 1))[0] || null;
    } catch (e) {}
    let ms = [...meses.values()];
    // sin los meses vacíos del principio (de antes de que hubiera precios de dividendos), pero al menos seis
    const pri = ms.findIndex((m) => m.c > 0 || m.p > 0);
    if (pri < 0) { vacio(g, L('Lo que tienes no ha repartido dividendos en este tiempo.', 'What you hold hasn’t paid dividends in this period.')); ponCab(`<span class="hv-p">${eur(0, 0)}</span><span class="k">${L('cobrados', 'received')} ${enR(rg)}</span>`); return; }
    ms = ms.slice(Math.min(pri, Math.max(0, ms.length - 9)));
    const yT = 16, y0 = H - 30, top = Math.max(...ms.map((m) => m.c + m.p), 1), bw = W / ms.length, oc = S.oculto;
    let h = '';
    ms.forEach((m, j) => {
      const x = j * bw + bw * 0.18, w = bw * 0.64, alto = y0 - yT - 18, hc = (m.c / top) * alto, hp = (m.p / top) * alto, mi = +m.k.slice(5) - 1;
      if (m.c > 0) h += `<rect class="hg-barra" x="${x.toFixed(1)}" y="${(y0 - Math.max(2, hc)).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(2, hc).toFixed(1)}" rx="${Math.min(4, w / 3).toFixed(1)}"/>`;
      if (m.p > 0) h += `<rect class="hg-barra prev" x="${x.toFixed(1)}" y="${(y0 - hc - Math.max(2, hp)).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(2, hp).toFixed(1)}" rx="${Math.min(4, w / 3).toFixed(1)}"/>`;
      const tot = m.c + m.p;
      if (!oc && ms.length <= 16 && tot >= 10) h += `<text class="hg-barra-n${m.p > m.c ? ' prev' : ''}" x="${(x + w / 2).toFixed(1)}" y="${(y0 - hc - hp - 6).toFixed(1)}" text-anchor="middle">${fmtNum(tot, 0)}</text>`;
      if (ms.length <= 16 || mi === 0) h += `<text class="hg-eje" x="${(x + w / 2).toFixed(1)}" y="${H - 9}" text-anchor="middle">${ms.length > 16 ? m.k.slice(0, 4) : movil && ms.length > 9 ? 'EFMAMJJASOND'[mi] : mesC(mi)}</text>`;
    });
    h += `<line class="hg-cero" x1="0" x2="${W}" y1="${y0}" y2="${y0}"/>`;
    montar(g, W, H, h, L('Cobros por mes', 'Income by month'), (x) => {
      const j = Math.max(0, Math.min(ms.length - 1, Math.floor(x / bw))), m = ms[j], mi = +m.k.slice(5) - 1;
      const cifra = oc ? '' : `${m.c > 0 ? ` · ${eur(m.c, 0)} ${L('netos', 'net')}` : ''}${m.p > 0 ? ` · ${eur(m.p, 0)} ${L('previstos', 'expected')}` : ''}${!m.c && !m.p ? ` · ${L('nada', 'nothing')}` : ''}`;
      return { x: (j + 0.5) * bw, y: null, t: `${mesC(mi)} ${m.k.slice(0, 4)}${cifra}${m.de.length ? ` <small>${esc([...new Set(m.de)].join(', '))}</small>` : ''}` };
    });
    const pas = ms.filter((m) => m.k <= mesHoy), tot = sum(pas, (m) => m.c), media = tot / Math.min(nM, pas.length || 1);
    ponCab(`<span class="hv-p">${oc ? '•••' : eur(tot, 0)}</span><span class="k">${L(`cobrados ${enR(rg)}, ya con la retención (con lo que pagó cada una) · ${oc ? '•••' : eur(media, 0)} al mes`, `received ${enR(rg)}, after withholding (from what each one paid) · ${oc ? '•••' : eur(media, 0)} a month`)}${prox ? L(` · lo próximo: ${esc(prox.n)}, el ${fechaCorta(prox.d)}, unos ${oc ? '•••' : eur(prox.neto, 0)}`, ` · next: ${esc(prox.n)}, ${fechaCorta(prox.d)}, about ${oc ? '•••' : eur(prox.neto, 0)}`) : ''}</span>`);
  }

  window.HOY_GRAF = (g, M) => {
    const pest = hoyPest(), rg = rangoHoy(), movil = innerWidth < 760, W = Math.max(260, g.clientWidth || 600), H = movil ? 250 : 330;
    try { ({ rend, caida, cobros })[pest](g, M, rg, W, H, movil); } catch (e) { console.warn(e); vacio(g, L('No se ha podido dibujar.', 'It could not be drawn.')); }
  };
})();
