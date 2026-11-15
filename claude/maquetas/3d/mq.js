/* Toisón · maqueta del 3D y del movimiento (15 nov 2026). Corre dentro de la cáscara REAL de la app (el DOM de Hoy y de
   Reparto sin sus scripts, con el CSS de verdad) y pone encima lo que hay que elegir: la moneda, el anillo, las cifras,
   las gráficas y las transiciones. La página de fuera manda el estado con postMessage ({ mqEstado }). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const H = document.documentElement, DISP = H.dataset.mqDisp || 'pc', MOVIL = DISP === 'movil';
  const E = { tema: 'marmol', moneda: 'canto', anillo: 'volumen', cifras: 'rueda', graf: 'transforma', paso: 'fondo', quieto: false, discreto: false, sin3d: false };
  let vista = 'hoy';
  const quietoSO = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { return { matches: false }; } })();
  const quieto = () => E.quieto || quietoSO.matches;
  window.T3D_QUIETO = quieto;
  const fuera = (m) => { try { parent.postMessage(Object.assign({ mq: 1 }, m), '*'); } catch (e) { /* suelta */ } };
  const fmt = (n, d = 0) => { const s = Math.abs(n).toFixed(d).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (n < 0 ? '−' : '') + s.join(','); };
  const sig = (n, d = 0) => (n > 0 ? '+' : '') + fmt(n, d);
  const lim = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const sale = (x) => 1 - Math.pow(1 - lim(x), 3), saleFuerte = (x) => 1 - Math.pow(1 - lim(x), 4), entraSale = (x) => { x = lim(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  /* una animación con requestAnimationFrame; con «reducir movimiento» va directa al final */
  function anima(ms, paso, fin) {
    if (quieto() || ms <= 0) { paso(1); if (fin) fin(); return { parar() {} }; }
    let id = 0, t0 = 0, vivo = true;
    const f = (t) => { if (!vivo) return; if (!t0) t0 = t; const k = lim((t - t0) / ms); paso(k); if (k < 1) id = requestAnimationFrame(f); else if (fin) fin(); };
    id = requestAnimationFrame(f);
    return { parar() { vivo = false; cancelAnimationFrame(id); } };
  }

  /* ---------- las dos páginas de la cáscara ---------- */
  for (const x of $$('.pf-recuerda, .nov-aviso, #toast, .tour, .hoja-fondo')) x.remove();
  const tpl = $('#mqReparto');
  const PAG = { hoy: { vista: $('#vista').innerHTML, clase: $('#vista').className }, reparto: null };
  const riel0 = $('.riel-nav');
  if (riel0) PAG.hoy.riel = $$(':scope > :not(.k2-marca)', riel0).map((n) => n.outerHTML).join('');
  if (tpl) {
    const d = tpl.content; for (const x of $$('.pf-recuerda, .nov-aviso', d)) x.remove();
    PAG.reparto = { vista: $('#vista', d).innerHTML, clase: 'wrap' };
    const r = $('.riel-nav', d); if (r) PAG.reparto.riel = $$(':scope > :not(.k2-marca)', r).map((n) => n.outerHTML).join('');
  }

  /* =====================================================================
     CIFRAS · la cifra del patrimonio: cuenta, rueda o aparece
     ===================================================================== */
  /*#cifras*/
  let TOTAL = 88849.54, DIA = 68.57;
  const partes = (n) => { const e = Math.trunc(n), c = Math.round((n - e) * 100); return [fmt(e), ',' + String(c).padStart(2, '0') + ' €']; };
  function ponerCifra(modo, desde) {
    const h = $('#heroNum'); if (!h) return;
    const ent = $('[data-b="totalE"]', h), dec = $('[data-b="totalD"]', h), [te, td] = partes(TOTAL);
    h.classList.remove('mq-nitida'); ent.classList.remove('mq-rueda');
    if (E.discreto) { ent.textContent = '••••••'; dec.textContent = ' €'; return; }
    dec.textContent = td;
    const v = quieto() ? 'nada' : E.cifras;
    if (v === 'rueda') {
      // cada dígito es una columna del 0 al 9 que rueda hasta el suyo; los puntos no se mueven
      const viejas = $$('.mq-d', ent), mismo = modo === 'tick' && viejas.length === te.replace(/\D/g, '').length;
      if (!mismo) {
        ent.classList.add('mq-rueda');
        ent.innerHTML = [...te].map((c) => (/\d/.test(c) ? `<span class="mq-d" data-d="${c}"><span class="mq-col" style="transform:translateY(0)">${'0123456789'.split('').map((x) => `<i>${x}</i>`).join('')}</span></span>` : `<span class="mq-p">${c}</span>`)).join('');
        ent.setAttribute('aria-label', te);
        const cols = $$('.mq-col', ent); void ent.offsetWidth;
        cols.forEach((c, i) => { c.style.transition = `transform ${820 + i * 70}ms cubic-bezier(.16,1,.3,1) ${i * 55}ms`; c.style.transform = `translateY(${-10 * +c.parentNode.dataset.d}%)`; });
      } else {
        ent.classList.add('mq-rueda');
        const ds = te.replace(/\D/g, '');
        viejas.forEach((d, i) => { if (d.dataset.d !== ds[i]) { d.dataset.d = ds[i]; const c = d.firstChild; c.style.transition = 'transform 620ms cubic-bezier(.16,1,.3,1)'; c.style.transform = `translateY(${-10 * +ds[i]}%)`; } });
        ent.setAttribute('aria-label', te);
      }
    } else if (v === 'cuenta') {
      const a = desde != null ? desde : TOTAL * 0.94, b = TOTAL;
      anima(modo === 'tick' ? 520 : 760, (k) => { ent.textContent = fmt(Math.trunc(a + (b - a) * saleFuerte(k))); });
    } else {
      ent.textContent = te;
      if (v === 'nitida' && modo !== 'tick') { void h.offsetWidth; h.classList.add('mq-nitida'); }
    }
    if (modo === 'tick' && !quieto()) { h.classList.remove('hn-sube', 'hn-baja'); void h.offsetWidth; h.classList.add(TOTAL >= (desde || 0) ? 'hn-sube' : 'hn-baja'); }
  }
  /* un número suelto que cuenta hasta su valor (los de la línea de la gráfica) */
  function cuenta(el, a, b, f, ms = 480) { if (!el) return; anima(ms, (k) => { el.textContent = f(a + (b - a) * saleFuerte(k)); }); }
  /*#fin*/

  /* =====================================================================
     GRÁFICAS · la de Hoy, con sus cuatro pestañas y sus periodos
     ===================================================================== */
  // datos de prueba: cinco años de cierres que acaban en el patrimonio de la cáscara, y un índice que se le parece
  const azar = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const SERIE = (() => {
    const r = azar(208), r2 = azar(77), g = (f) => { let u = 0; for (let i = 0; i < 6; i++) u += f(); return (u - 3) / 0.7071; };
    const n = 1300, c = [0], x = [0];
    for (let i = 1; i < n; i++) { const z = g(r), z2 = g(r2); c.push(c[i - 1] + 0.00052 + 0.0082 * z + (i > 840 && i < 870 ? -0.004 : 0)); x.push(x[i - 1] + 0.00046 + 0.0080 * (0.74 * z + 0.67 * z2) + (i > 840 && i < 870 ? -0.0035 : 0)); }
    // el último año, a +16,97 % (lo que dice la cáscara), sin tocar la forma
    const obj = Math.log(1.1697), hay = c[n - 1] - c[n - 261];
    for (let i = n - 260; i < n; i++) c[i] += (obj - hay) * (i - (n - 261)) / 260;
    const k = Math.log(88849.54) - c[n - 1];
    return { v: c.map((y) => Math.exp(y + k)), ix: x.map((y) => Math.exp(y)) };
  })();
  const DIAS = { '1D': 1, '1S': 5, '1M': 22, '3M': 66, '6M': 130, '1A': 260, '3A': 780, '5A': 1299, 'Máx': 1299, 'Inicio': 480 };
  const DICE = { '1D': 'hoy', '1S': 'en la última semana', '1M': 'en el último mes', '3M': 'en tres meses', '6M': 'en seis meses', '1A': 'en el último año', '3A': 'en tres años', '5A': 'en cinco años', 'Máx': 'desde que hay datos', 'Inicio': 'desde tu primera compra' };
  const VALE = { valor: null, rend: ['1S', '1M', '3M', '6M', '1A', '3A', '5A', 'Máx', 'Inicio'], caida: ['1M', '3M', '6M', '1A', '3A', '5A', 'Máx', 'Inicio'], cobros: ['6M', '1A', '3A', '5A', 'Máx', 'Inicio'] };
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
  const HOYF = new Date(2026, 10, 15);
  const COBRO_MES = [97, 0, 53, 0, 0, 79, 97, 0, 53, 0, 0, 79];   // lo que se cobra cada mes del año (de prueba)
  /*#graf*/
  const G = { N: 140, pest: 'valor', rango: '1A', cur: null, an: null, svg: null, W: 0, Hh: 0, id: 0 };
  const rangoBueno = () => (VALE[G.pest] && !VALE[G.pest].includes(G.rango) ? '1A' : G.rango);
  function remuestra(a, n) { const o = new Array(n); for (let i = 0; i < n; i++) { const p = i / (n - 1) * (a.length - 1), j = Math.floor(p), f = p - j; o[i] = a[j] + ((a[Math.min(a.length - 1, j + 1)] - a[j]) * f); } return o; }
  /* la forma que tiene que tener la gráfica para una pestaña y un periodo: todo ya en píxeles */
  function forma(pest, rango) {
    const W = G.W, Hh = G.Hh, arr = MOVIL ? 30 : 18, aba = Hh - 30, alto = aba - arr, n = SERIE.v.length, d = DIAS[rango];
    let v = SERIE.v.slice(n - 1 - d), ix = SERIE.ix.slice(n - 1 - d);
    if (rango === '1D') { const r = azar(9), a = TOTAL - DIA; v = Array.from({ length: 60 }, (_, i) => a + DIA * (i / 59) + (i && i < 59 ? (r() - 0.5) * 34 : 0)); ix = v.map(() => 1); }
    v[v.length - 1] = TOTAL;
    const f = { pest, rango, y1: null, y2: null, aL1: 1, aL2: 0, aArea: 0.6, base: aba, barras: null, rej: [], xs: [], cab: '', nums: [] };
    const escala = (lo, hi) => { const m = (hi - lo) * 0.10 || 1; lo -= m; hi += m * 0.6; return (x) => arr + (1 - (x - lo) / (hi - lo)) * alto; };
    const lineas = (lo, hi, y, t) => { for (const p of [0.2, 0.5, 0.8]) { const x = lo + (hi - lo) * p; f.rej.push({ y: y(x), t: t(x) }); } };
    const flecha = (x) => `<i aria-hidden="true">${x >= 0 ? '▲' : '▼'}</i>`, cl = (x) => (x >= 0 ? 'up' : 'down');
    if (pest === 'valor') {
      const lo = Math.min(...v), hi = Math.max(...v), y = escala(lo, hi), dif = TOTAL - v[0], pc = dif / v[0] * 100;
      f.y1 = remuestra(v, G.N).map(y); lineas(lo, hi, y, (x) => (E.discreto ? '' : fmt(Math.round(x / 100) * 100) + ' €'));
      f.cab = `<span class="hv-p ${cl(dif)}">${flecha(dif)}<span data-mq-n="0">${E.discreto ? '••••' : sig(dif) + ' €'}</span><em data-mq-n="1">${sig(pc, 2)} %</em></span><span class="k">lo que tienes, ${DICE[rango]}</span>`;
      f.nums = [E.discreto ? null : [dif, (x) => sig(Math.round(x)) + ' €'], [pc, (x) => sig(x, 2) + ' %']];
    } else if (pest === 'rend') {
      const a = v.map((x) => (x / v[0] - 1) * 100), b = ix.map((x) => (x / ix[0] - 1) * 100), lo = Math.min(...a, ...b), hi = Math.max(...a, ...b), y = escala(lo, hi), p = a[a.length - 1], q = b[b.length - 1];
      f.y1 = remuestra(a, G.N).map(y); f.y2 = remuestra(b, G.N).map(y); f.aL2 = 1; f.aArea = 0.22; lineas(lo, hi, y, (x) => sig(Math.round(x)) + ' %');
      f.cab = `<span class="hv-p ${cl(p)}">${flecha(p)}<span data-mq-n="0">${sig(p, 2)} %</span></span><span class="k">tú · MSCI World <b data-mq-n="1">${sig(q, 2)} %</b> · <b class="${cl(p - q)}" data-mq-n="2">${sig(p - q, 1)} puntos</b></span>`;
      f.nums = [[p, (x) => sig(x, 2) + ' %'], [q, (x) => sig(x, 2) + ' %'], [p - q, (x) => sig(x, 1) + ' puntos']];
    } else if (pest === 'caida') {
      let mx = Math.max(...SERIE.v.slice(Math.max(0, n - 1 - d - 400), n - d)); const dd = v.map((x) => { mx = Math.max(mx, x); return (x / mx - 1) * 100; });
      const lo = Math.min(...dd, -1), y = (x) => arr + 8 + (x / (lo * 1.12)) * (alto - 8), peor = Math.min(...dd), ip = dd.indexOf(peor), fp = new Date(HOYF - (dd.length - 1 - ip) * 1.404 * 864e5), act = dd[dd.length - 1];
      f.y1 = remuestra(dd, G.N).map(y); f.base = arr + 8; f.aArea = 0.5; f.rej.push({ y: arr + 8, t: '0 %' }); for (const p of [0.5, 1]) f.rej.push({ y: y(lo * p), t: fmt(lo * p, 1) + ' %' });
      f.cab = `<span class="hv-p ${act < -0.05 ? 'down' : 'up'}"><span data-mq-n="0">${fmt(act, 2)} %</span></span><span class="k">bajo tu máximo · la peor, <b class="down" data-mq-n="1">${fmt(peor, 1)} %</b> el ${fp.getDate()} ${MES[fp.getMonth()]}</span>`;
      f.nums = [[act, (x) => fmt(x, 2) + ' %'], [peor, (x) => fmt(x, 1) + ' %']];
    } else {
      const m = rango === '6M' ? 6 : rango === '1A' ? 12 : rango === '3A' ? 36 : rango === 'Inicio' ? 22 : 60, prev = 3, tot = m + prev, b = [];
      for (let i = 0; i < tot; i++) { const k = i - (m - 1), fe = new Date(2026, 10 + k, 1), q = COBRO_MES[fe.getMonth()] * (k > 0 ? 1 : Math.max(0.35, 1 + k * 0.012)); b.push({ v: Math.round(q), hueco: k > 0, fe }); }
      const hi = Math.max(...b.map((x) => x.v), 1), an = W / tot, cob = b.filter((x) => !x.hueco).reduce((s, x) => s + x.v, 0);
      f.barras = b.map((x, i) => ({ x: i * an + an * 0.2, w: an * 0.6, h: x.v / hi * (alto - 14), hueco: x.hueco }));
      f.y1 = new Array(G.N).fill(aba); f.aL1 = 0; f.aArea = 0;
      f.rej.push({ y: aba - (alto - 14), t: E.discreto ? '' : hi + ' €' });
      const paso = Math.max(1, Math.round(tot / 6)); b.forEach((x, i) => { if (i % paso === 0) f.xs.push({ x: i * an + an / 2, t: MES[x.fe.getMonth()] + (m > 12 ? ' ' + String(x.fe.getFullYear()).slice(2) : '') }); });
      f.cab = `<span class="hv-p up"><span data-mq-n="0">${E.discreto ? '••••' : fmt(cob) + ' €'}</span></span><span class="k">cobrados ${DICE[rango]} · <b data-mq-n="1">${E.discreto ? '••' : fmt(cob / m) + ' €'}</b> al mes · lo próximo, en dic</span>`;
      f.nums = E.discreto ? [null, null] : [[cob, (x) => fmt(Math.round(x)) + ' €'], [cob / m, (x) => fmt(Math.round(x)) + ' €']];
    }
    if (!f.xs.length) {
      const k = MOVIL ? 4 : 6;
      for (let i = 0; i < k; i++) { const p = i / (k - 1), fe = new Date(HOYF - (1 - p) * d * 1.404 * 864e5); f.xs.push({ x: lim(p * W, 26, W - 30), t: rango === '1D' ? `${9 + Math.round(p * 8)}:00` : d <= 66 ? `${fe.getDate()} ${MES[fe.getMonth()]}` : d > 600 ? String(fe.getFullYear()) : `${MES[fe.getMonth()]} ${fe.getFullYear()}` }); }
    }
    return f;
  }
  const camino = (ys, W) => { let s = ''; const n = ys.length; for (let i = 0; i < n; i++) s += (i ? 'L' : 'M') + (i / (n - 1) * (W - 8)).toFixed(1) + ' ' + ys[i].toFixed(1); return s; };
  function montarGraf() {
    const caja = $('#grafEvo'); if (!caja) return;
    const viejo = $('svg', caja); G.W = Math.max(300, caja.clientWidth || +(viejo && viejo.viewBox.baseVal.width) || 354); G.Hh = +(viejo && viejo.getAttribute('height')) || (MOVIL ? 250 : 330);
    const id = 'mqg' + (++G.id);
    caja.innerHTML = `<svg class="mq-graf" viewBox="0 0 ${G.W} ${G.Hh}" height="${G.Hh}" role="img" aria-label="Gráfica de Hoy"><defs>
      <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--grafica)" stop-opacity=".42"/><stop offset=".6" stop-color="var(--grafica)" stop-opacity=".10"/><stop offset="1" stop-color="var(--grafica)" stop-opacity="0"/></linearGradient>
      <linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--baja)" stop-opacity=".05"/><stop offset="1" stop-color="var(--baja)" stop-opacity=".42"/></linearGradient>
      <filter id="${id}b" x="-5%" y="-40%" width="110%" height="180%"><feGaussianBlur stdDeviation="5"/></filter></defs>
      <g class="mq-g-rej"></g><path class="mq-g-area" fill="url(#${id}a)"/><path class="mq-g-area2" fill="url(#${id}c)"/>
      <g class="mq-g-barras"></g>
      <path class="mq-g-l2" pathLength="1" fill="none"/><path class="mq-g-halo" pathLength="1" fill="none" filter="url(#${id}b)"/><path class="mq-g-l1" pathLength="1" fill="none"/>
      <circle class="mq-g-fin2" r="9"/><circle class="mq-g-fin" r="4.5"/><g class="mq-g-x"></g></svg>`;
    G.svg = $('svg', caja); G.cur = null;
    cambiaGraf('entra');
  }
  function pintaGraf(c, dib) {
    const s = G.svg; if (!s) return; const W = G.W, d1 = camino(c.y1, W), n = c.y1.length, xf = W - 8, yf = c.y1[n - 1];
    const l1 = $('.mq-g-l1', s), halo = $('.mq-g-halo', s), l2 = $('.mq-g-l2', s), ar = $('.mq-g-area', s), ar2 = $('.mq-g-area2', s);
    const esCaida = c.base < G.Hh / 2, traza = dib == null ? 1 : sale(dib / 0.85), relleno = dib == null ? 1 : lim((dib - 0.45) / 0.55);
    l1.setAttribute('d', d1); halo.setAttribute('d', d1);
    for (const p of [l1, halo]) { p.style.strokeDasharray = '1'; p.style.strokeDashoffset = String(1 - traza); }
    l1.style.opacity = c.aL1; halo.style.opacity = c.aL1 * 0.4; l1.style.stroke = halo.style.stroke = c.rojo > 0.5 ? 'var(--baja)' : 'var(--grafica)';
    const area = d1 + `L${xf} ${c.base.toFixed(1)}L0 ${c.base.toFixed(1)}Z`;
    ar.setAttribute('d', area); ar2.setAttribute('d', area); ar.style.opacity = c.aArea * relleno * (1 - c.rojo); ar2.style.opacity = c.aArea * relleno * c.rojo;
    if (c.y2) { l2.setAttribute('d', camino(c.y2, W)); l2.style.strokeDasharray = '1'; l2.style.strokeDashoffset = String(1 - (dib == null ? 1 : sale((dib - 0.15) / 0.85))); }
    l2.style.opacity = c.y2 ? c.aL2 : 0;
    const fin = $('.mq-g-fin', s), fin2 = $('.mq-g-fin2', s), verFin = c.aL1 * (dib == null ? 1 : lim((dib - 0.8) / 0.2));
    fin.setAttribute('cx', xf); fin.setAttribute('cy', yf); fin2.setAttribute('cx', xf); fin2.setAttribute('cy', yf); fin.style.opacity = verFin; fin2.style.opacity = verFin * 0.22;
    fin.style.stroke = fin2.style.fill = c.rojo > 0.5 ? 'var(--baja)' : 'var(--grafica)';
  }
  function pintaBarras(b, k, aba) {
    const g = $('.mq-g-barras', G.svg); if (!g) return;
    if (!b) { g.innerHTML = ''; return; }
    if (g.childElementCount !== b.length) g.innerHTML = b.map((x) => `<rect rx="3" class="${x.hueco ? 'hueco' : ''}"/>`).join('');
    [...g.children].forEach((r, i) => { const h = Math.max(b[i].h > 0 ? 2 : 0, b[i].h * sale(k * 1.7 - i / b.length * 0.7)); r.setAttribute('x', b[i].x.toFixed(1)); r.setAttribute('width', b[i].w.toFixed(1)); r.setAttribute('y', (aba - h).toFixed(1)); r.setAttribute('height', h.toFixed(1)); });
  }
  function pintaEjes(f, op) {
    const s = G.svg, rej = $('.mq-g-rej', s), gx = $('.mq-g-x', s);
    rej.innerHTML = f.rej.map((r) => `<line x1="0" x2="${G.W}" y1="${r.y.toFixed(1)}" y2="${r.y.toFixed(1)}"/><text x="2" y="${(r.y - 5).toFixed(1)}">${r.t}</text>`).join('');
    gx.innerHTML = f.xs.map((x) => `<text x="${x.x.toFixed(1)}" y="${G.Hh - 8}" text-anchor="middle">${x.t}</text>`).join('');
    rej.style.opacity = gx.style.opacity = op;
  }
  const mezcla = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k);
  /* cambia la gráfica a lo que digan la pestaña y el periodo, con el movimiento elegido: 'entra' la dibuja siempre */
  function cambiaGraf(como) {
    const s = G.svg; if (!s) return;
    const rango = rangoBueno(), f = forma(G.pest, rango), aba = G.Hh - 30, rojo = G.pest === 'caida' ? 1 : 0;
    const obj = { y1: f.y1, y2: f.y2, aL1: f.aL1, aL2: f.aL2, aArea: f.aArea, base: f.base, rojo };
    const antes = G.cur, modo = como === 'entra' || !antes ? 'dibuja' : como === 'tick' ? 'transforma' : E.graf;
    if (G.an) G.an.parar();
    // los botones
    for (const b of $$('.hoy-pest [data-hpest]')) b.setAttribute('aria-selected', String(b.dataset.hpest === G.pest));
    for (const b of $$('.hero-rangos [data-rango]')) { b.setAttribute('aria-pressed', String(b.dataset.rango === rango)); b.disabled = !!(VALE[G.pest] && !VALE[G.pest].includes(b.dataset.rango)); }
    const cmp = $('.hero-pie'); if (cmp) cmp.style.visibility = G.pest === 'valor' ? '' : 'hidden';
    // la línea de debajo de la cifra, con sus números contando
    const cab = $('#evoCab'); if (cab) { const vi = G.nums || []; cab.innerHTML = f.cab; if (como !== 'entra' && !quieto() && G.cabPest === G.pest) f.nums.forEach((x, i) => { if (x && vi[i]) cuenta($(`[data-mq-n="${i}"]`, cab), vi[i][0], x[0], x[1]); }); G.nums = f.nums; G.cabPest = G.pest; }
    const barrasAntes = G.barras; G.barras = f.barras;
    if (modo === 'funde' && antes && !quieto()) {
      const copia = s.cloneNode(true); copia.classList.add('mq-g-copia'); s.parentNode.appendChild(copia);
      G.cur = obj; pintaGraf(obj); pintaEjes(f, 1); pintaBarras(f.barras, 1, aba);
      G.an = anima(300, (k) => { copia.style.opacity = 1 - k; s.style.opacity = k; }, () => { copia.remove(); s.style.opacity = ''; });
      return;
    }
    if (modo === 'dibuja' || quieto()) {
      G.cur = obj; pintaEjes(f, 1);
      if (!f.barras) pintaBarras(null);
      G.an = anima(como === 'entra' ? 1100 : 900, (k) => { pintaGraf(obj, k); if (f.barras) pintaBarras(f.barras, sale(k), aba); });
      return;
    }
    // transforma: cada punto de la línea viaja a su sitio nuevo; el relleno, el índice y las barras cambian a la vez
    const de = { y1: antes.y1, y2: antes.y2 || antes.y1, aL1: antes.aL1, aL2: antes.y2 ? antes.aL2 : 0, aArea: antes.aArea, base: antes.base, rojo: antes.rojo };
    const a2 = f.y2 || antes.y2 || f.y1;
    pintaEjes(f, 0);
    G.an = anima(como === 'tick' ? 420 : 560, (k) => {
      const e = entraSale(k), c = { y1: mezcla(de.y1, obj.y1, e), y2: (f.y2 || antes.y2) ? mezcla(de.y2, a2, e) : null, aL1: de.aL1 + (obj.aL1 - de.aL1) * e, aL2: de.aL2 + ((f.y2 ? obj.aL2 : 0) - de.aL2) * e, aArea: de.aArea + (obj.aArea - de.aArea) * e, base: de.base + (obj.base - de.base) * e, rojo: de.rojo + (obj.rojo - de.rojo) * e };
      G.cur = c; pintaGraf(c);
      if (f.barras) pintaBarras(f.barras, lim((k - 0.25) / 0.75), aba); else if (barrasAntes) { pintaBarras(barrasAntes, 1 - lim(k / 0.5), aba); if (k >= 0.5) pintaBarras(null); }
      const op = lim((k - 0.35) / 0.5); $('.mq-g-rej', s).style.opacity = $('.mq-g-x', s).style.opacity = op;
    }, () => { G.cur = obj; });
  }
  /*#fin*/

  /* =====================================================================
     EL ANILLO DEL REPARTO
     ===================================================================== */
  const REPARTOS = {
    clase: ['Clase de activo', [['Renta variable', 84.5], ['Oro', 7.3], ['Renta fija', 4.0], ['Cripto', 3.9], ['Efectivo', 0.3]]],
    region: ['Región', [['Europa', 48.5], ['EEUU', 31.6], ['Global', 11.2], ['Emergentes', 8.3], ['Efectivo', 0.3]]],
    sector: ['Sector', [['Tecnología', 21.3], ['Industria', 14.2], ['Financiero', 13.7], ['Energía', 13.1], ['Consumo básico', 11.4], ['Otros', 26.2]]],
    tipo: ['Tipo de producto', [['Fondo indexado', 66.9], ['Acción', 17.6], ['ETC', 7.3], ['Fondo de renta fija', 4.0], ['Cripto', 3.9], ['Efectivo', 0.3]]],
    broker: ['Bróker', [['MyInvestor', 78.3], ['Trade Republic', 17.8], ['Bitvavo', 3.9]]],
  };
  const A = { dim: 'clase', sel: -1, tres: null, fr: null };
  const hexRgb = (h) => { h = h.trim(); if (h[0] === '#') { if (h.length === 4) h = '#' + [...h.slice(1)].map((c) => c + c).join(''); return [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16) / 255); } const m = h.match(/[\d.]+/g) || [128, 128, 128]; return m.slice(0, 3).map((x) => x / 255); };
  const lineal = (c) => c;
  function coloresAnillo() {
    const cs = getComputedStyle(H), base = [1, 2, 3, 4, 5, 6].map((i) => cs.getPropertyValue('--reparto-' + i) || '#888');
    const lista = REPARTOS[A.dim][1];
    if (E.anillo === 'joya') { const o = hexRgb(cs.getPropertyValue('--primario') || '#e3b45f'); return lista.map((_, i) => { const k = 1 - i / Math.max(1, lista.length - 1) * 0.72; return { css: `rgb(${o.map((x) => Math.round(x * 255 * (0.35 + 0.65 * k))).join(' ')})`, gl: o.map((x) => x * (0.30 + 0.70 * k)) }; }); }
    return lista.map((_, i) => ({ css: base[i % 6].trim(), gl: lineal(hexRgb(base[i % 6])) }));
  }
  function montarAnillo() {
    const panel = $('#panelAv'); if (!panel || $('.mq-anillo', panel)) return;
    const sec = document.createElement('section'); sec.className = 'pav-t mq-anillo';
    sec.innerHTML = `<div class="pav-et"><h2>De un vistazo</h2><div class="seg2 mq-dim" role="tablist" aria-label="Repartido por">${Object.keys(REPARTOS).map((k) => `<button type="button" role="tab" data-mq-dim="${k}" aria-selected="${k === A.dim}">${REPARTOS[k][0].replace(' de activo', '').replace(' de producto', '')}</button>`).join('')}</div></div>
      <div class="mq-an-cuerpo"><div class="mq-an-fig"><i class="mq-an-sombra" aria-hidden="true"></i><svg class="mq-an-plano" viewBox="-120 -120 240 240" aria-hidden="true"></svg><canvas class="mq-an-3d" aria-hidden="true"></canvas>
      <div class="mq-an-centro" aria-live="polite"></div></div><ul class="mq-an-ley"></ul></div>`;
    panel.insertBefore(sec, panel.firstChild);
    A.sel = -1; A.tres = null; A.fr = null;
    ponerAnillo(true);
  }
  function arco(a0, a1, r) { const p = (a) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`; return `M${p(a0)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`; }
  function pintaPlano(k) {
    const s = $('.mq-an-plano'); if (!s) return; const lista = REPARTOS[A.dim][1], cols = coloresAnillo(), tot = lista.reduce((p, x) => p + x[1], 0);
    let ac = 0, h = '';
    const fr = lista.map((x) => Math.max(0.012, x[1] / tot)), sf = fr.reduce((p, x) => p + x, 0);
    fr.forEach((f, i) => { f /= sf; const hueco = Math.min(0.02, f * Math.PI * 0.4), a0 = -Math.PI / 2 + ac * 2 * Math.PI * k + hueco * k, a1 = -Math.PI / 2 + (ac + f) * 2 * Math.PI * k - hueco * k; ac += f; if (a1 > a0) h += `<path d="${arco(a0, a1, 86)}" fill="none" stroke="${cols[i].css}" stroke-width="${A.sel === i ? 40 : 32}" opacity="${A.sel < 0 || A.sel === i ? 1 : 0.35}" data-mq-seg="${i}"/>`; });
    const luz = E.anillo === 'plano' && !E.sin3d ? `<circle r="86" fill="none" stroke="url(#mqAnLuz)" stroke-width="32" pointer-events="none" transform="rotate(-90)" stroke-dasharray="${(540.4 * k).toFixed(1)} 541"/><circle class="mq-an-destello" r="86" fill="none" stroke="#fff" stroke-width="30" stroke-dasharray="26 600" stroke-linecap="round" pointer-events="none"/>` : '';
    s.innerHTML = `<defs><linearGradient id="mqAnLuz" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".30"/></linearGradient></defs>${h}${luz}`;
  }
  function pintaCentro() {
    const c = $('.mq-an-centro'), ley = $('.mq-an-ley'); if (!c) return; const lista = REPARTOS[A.dim][1], cols = coloresAnillo();
    const eur = (p) => (E.discreto ? '' : `<span>${fmt(Math.round(TOTAL * p / 100))} €</span>`);
    if (A.sel >= 0 && lista[A.sel]) c.innerHTML = `<small>${lista[A.sel][0]}</small>${E.discreto ? '' : `<b>${fmt(lista[A.sel][1], 1)} %</b>`}${eur(lista[A.sel][1])}`;
    else c.innerHTML = `<small>${E.discreto ? REPARTOS[A.dim][0] : 'Patrimonio'}</small>${E.discreto ? '' : `<b class="mq-an-total">${fmt(Math.trunc(TOTAL))} €</b>`}<span>${lista.length} ${A.dim === 'broker' ? 'brókeres' : 'partes'}</span>`;
    ley.innerHTML = lista.map((x, i) => `<li><button type="button" data-mq-seg="${i}" aria-pressed="${A.sel === i}"><i style="background:${cols[i].css}"></i><span>${x[0]}</span><b>${fmt(x[1], 1)} %</b>${E.discreto ? '' : `<em>${fmt(Math.round(TOTAL * x[1] / 100))} €</em>`}</button></li>`).join('');
  }
  function ponerAnillo(entra, soloColor) {
    const fig = $('.mq-an-fig'); if (!fig) return;
    const lista = REPARTOS[A.dim][1], cols = coloresAnillo(), con3d = !E.sin3d && E.anillo !== 'plano' && window.T3D;
    fig.dataset.modo = con3d ? E.anillo : 'plano';
    for (const b of $$('.mq-dim [data-mq-dim]')) b.setAttribute('aria-selected', String(b.dataset.mqDim === A.dim));
    pintaCentro();
    if (A.an) A.an.parar();
    if (entra && !con3d) A.an = anima(1000, (k) => pintaPlano(sale(k))); else pintaPlano(1);
    if (entra && !con3d && E.anillo === 'plano' && !quieto()) { const d = $('.mq-an-destello'); if (d) d.classList.add('va'); }
    if (!con3d) { if (A.tres) { A.tres.destruir(); A.tres = null; const cv = $('.mq-an-3d'); const n = cv.cloneNode(false); cv.replaceWith(n); } fig.classList.remove('con3d'); return; }
    const datos = lista.map((x, i) => ({ v: x[1], c: cols[i].gl }));
    if (!A.tres) {
      A.tres = window.T3D.anillo($('.mq-an-3d'), { alPintar() { fig.classList.add('con3d'); }, alFallar() { fig.classList.remove('con3d'); }, alElegir(i) { A.sel = i; pintaCentro(); } });
      if (!A.tres) { fig.dataset.modo = 'plano'; return; }
      A.tres.poner(datos, true); A.tres.material(E.anillo === 'joya' ? 1 : 0, E.anillo === 'joya'); A.tres.entrar();
    } else {
      A.tres.material(E.anillo === 'joya' ? 1 : 0, E.anillo === 'joya'); A.tres.poner(datos, !!soloColor);
      if (entra) A.tres.entrar();
    }
  }
  function elegirTrozo(i) {
    A.sel = A.sel === i ? -1 : i;
    if (A.tres) A.tres.elegir(i, true); else pintaPlano(1);
    pintaCentro();
  }

  /* =====================================================================
     LA MONEDA DE HOY (en el móvil, el botón del centro de la barra; en el ordenador, el sello de la marca)
     ===================================================================== */
  const M = { tres: null, caja: null, ancla: null };
  function montarMoneda() {
    const plano = MOVIL ? $('.navbar a.nav-centro svg.nav-med') : $('.riel-nav .k2-marca > i');
    if (!plano) return;
    M.ancla = plano; let padre = plano.parentNode; while (padre !== document.body && getComputedStyle(padre).position === 'static') padre = padre.parentNode;
    if (!M.caja) { M.caja = document.createElement('mq-moneda'); M.caja.className = 'mq-mon'; M.caja.style.cssText = 'position:absolute;display:block'; M.caja.setAttribute('aria-hidden', 'true'); M.caja.innerHTML = '<i class="mq-mon-vidrio"></i><i class="mq-mon-brillo"></i><canvas></canvas>'; padre.appendChild(M.caja); }
    const r = plano.getBoundingClientRect(), rp = padre.getBoundingClientRect();
    Object.assign(M.caja.style, { left: (r.left - rp.left - padre.clientLeft + padre.scrollLeft) + 'px', top: (r.top - rp.top - padre.clientTop + padre.scrollTop) + 'px', width: r.width + 'px', height: r.height + 'px' });
    { const rr = M.caja.getBoundingClientRect(); if (Math.abs(rr.left - r.left) + Math.abs(rr.top - r.top) > 1) { M.caja.style.left = (parseFloat(M.caja.style.left) + r.left - rr.left) + 'px'; M.caja.style.top = (parseFloat(M.caja.style.top) + r.top - rr.top) + 'px'; } }
    const con3d = !E.sin3d && E.moneda !== 'luz' && window.T3D;
    H.dataset.mqMoneda = E.sin3d ? 'plana' : E.moneda;
    if (!con3d) { if (M.tres) { M.tres.destruir(); M.tres = null; const cv = $('canvas', M.caja), n = cv.cloneNode(false); cv.replaceWith(n); } M.caja.classList.remove('con3d'); plano.classList.remove('mq-oculta'); return; }
    if (!M.tres) {
      const svg = MOVIL ? plano : $('svg', plano), vb = svg.viewBox.baseVal;
      M.tres = window.T3D.moneda($('canvas', M.caja), { tema: E.tema, cristal: true, alGirar(c) { M.caja.style.setProperty('--mq-gx', c.toFixed(3)); }, sello: { o: $('.s-o', svg).getAttribute('d'), t: $('.s-t', svg).getAttribute('d'), vb: [vb.x, vb.y, vb.width, vb.height] }, alPintar() { M.caja.classList.add('con3d'); plano.classList.add('mq-oculta'); }, alFallar() { M.caja.classList.remove('con3d'); plano.classList.remove('mq-oculta'); } });
      if (!M.tres) return;
    }
    M.tres.tema(E.tema); M.tres.vivo(E.moneda === 'viva');
  }
  function monedaSaluda() {
    if (quieto()) return;
    if (M.tres) M.tres.girar(1);
    else if (!E.sin3d && E.moneda === 'luz' && M.caja) { const b = $('.mq-mon-brillo', M.caja); b.classList.remove('va'); void b.offsetWidth; b.classList.add('va'); }
  }
  // la luz sigue al dedo o al ratón (en el móvil de verdad, también a la inclinación del teléfono)
  let luzRaf = 0, luzEv = null;
  addEventListener('pointermove', (e) => {
    luzEv = e; if (luzRaf || !M.caja) return;
    luzRaf = requestAnimationFrame(() => {
      luzRaf = 0; const r = M.caja.getBoundingClientRect(), dx = (luzEv.clientX - (r.left + r.width / 2)) / (MOVIL ? 180 : 500), dy = (luzEv.clientY - (r.top + r.height / 2)) / (MOVIL ? 320 : 500);
      if (M.tres) M.tres.inclinar(lim(dx, -1, 1), lim(dy, -1, 1));
      else { M.caja.style.setProperty('--mx', (50 + lim(dx, -1, 1) * 38) + '%'); M.caja.style.setProperty('--my', (30 + lim(dy, -1, 1) * 30) + '%'); }
    });
  }, { passive: true });
  addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse' && M.tres) M.tres.soltar(); }, { passive: true });
  document.addEventListener('pointerleave', () => { if (M.tres) M.tres.soltar(); });

  /* =====================================================================
     TRANSICIONES ENTRE PÁGINAS
     ===================================================================== */
  /*#paso*/
  let pasando = false;
  function marcarNav() {
    for (const a of $$('.navbar a')) a.setAttribute('aria-current', (vista === 'hoy' ? a.classList.contains('nav-centro') : a.getAttribute('href') === '#posiciones') ? 'page' : 'false');
    const riel = $('.riel-nav'); if (riel && PAG[vista].riel) { for (const n of $$(':scope > :not(.k2-marca)', riel)) n.remove(); riel.insertAdjacentHTML('beforeend', PAG[vista].riel); }
  }
  function alEntrar(como) {
    if (vista === 'hoy') { G.cabPest = null; ponerCifra('entra'); montarGraf(); ponerDia(); } else montarAnillo();
    if (E.discreto) discreto();
    fuera({ vista });
  }
  function irA(dest) {
    if (pasando || !PAG[dest]) return;
    if (dest === vista) { scrollTo({ top: 0, behavior: quieto() ? 'auto' : 'smooth' }); if (dest === 'hoy') monedaSaluda(); return; }
    const v = $('#vista'), modo = quieto() ? 'nada' : E.paso, haciaHoy = dest === 'hoy';
    // lo que viaja de una página a otra: la cifra del patrimonio, entre la cabecera de Hoy y el centro del anillo
    let viaje = null;
    if (modo === 'viaja' && !E.discreto) { const o = haciaHoy ? $('.mq-an-total') : $('#heroNum [data-b="totalE"]'); if (o && o.getBoundingClientRect().bottom > 0) { const r = o.getBoundingClientRect(), cs = getComputedStyle(o); viaje = { r, fs: parseFloat(cs.fontSize), fw: cs.fontWeight, ff: cs.fontFamily, ls: cs.letterSpacing, color: cs.color, tx: fmt(Math.trunc(TOTAL)) + (haciaHoy ? '' : '') }; } }
    const cambia = () => {
      if (A.tres) { A.tres.destruir(); A.tres = null; } if (G.an) G.an.parar(); G.svg = null; G.cur = null;
      v.innerHTML = PAG[dest].vista; v.className = PAG[dest].clase.replace(/\bentra\b/, ''); v.removeAttribute('style'); vista = dest; marcarNav(); scrollTo(0, 0);
      if (dest === 'hoy') { $$('.pf-recuerda, .nov-aviso', v).forEach((x) => x.remove()); }
      alEntrar(); if (haciaHoy) monedaSaluda();
    };
    if (modo === 'nada') { cambia(); return; }
    pasando = true; const libre = () => { pasando = false; };
    if (modo === 'fondo') {
      // profundidad: la página que se va se aleja y se apaga; la nueva llega desde delante y sus bloques entran en escalera
      const r = v.getBoundingClientRect(), fantasma = v.cloneNode(true); fantasma.removeAttribute('id'); fantasma.classList.add('mq-fantasma');
      Object.assign(fantasma.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: 0 });
      for (const x of $$('.con3d', fantasma)) x.classList.remove('con3d');
      document.body.appendChild(fantasma); cambia();
      fantasma.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.955)' }], { duration: 300, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).onfinish = () => fantasma.remove();
      v.animate([{ opacity: 0, transform: 'scale(1.03)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 460, easing: 'cubic-bezier(.16,1,.3,1)', delay: 90, fill: 'backwards' }).onfinish = libre;
      const bloques = dest === 'hoy' ? $$('.car-fila > *, .car > :not(.car-fila)', v) : $$('#panelAv > *', v);
      bloques.slice(0, 9).forEach((b, i) => b.animate([{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)', delay: 140 + i * 55, fill: 'backwards' }));
      return;
    }
    // fundido corto (y la base de «viaja»): la que se va se apaga; la nueva entra desde su lado
    const dx = haciaHoy ? -16 : 16;
    v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
      cambia(); v.getAnimations().forEach((a) => a.cancel());
      v.animate([{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = libre;
      if (viaje) {
        const d = haciaHoy ? $('#heroNum [data-b="totalE"]') : $('.mq-an-total'); if (!d) return;
        const rd = d.getBoundingClientRect(), cd = getComputedStyle(d), fsd = parseFloat(cd.fontSize), n = document.createElement('span');
        n.className = 'mq-viaja'; n.textContent = fmt(Math.trunc(TOTAL)) + (haciaHoy ? '' : ' €');
        Object.assign(n.style, { left: rd.left + 'px', top: rd.top + 'px', fontSize: fsd + 'px', fontWeight: cd.fontWeight, fontFamily: cd.fontFamily, letterSpacing: cd.letterSpacing, color: cd.color, lineHeight: cd.lineHeight });
        document.body.appendChild(n); d.style.visibility = 'hidden';
        const esc = viaje.fs / fsd;
        n.animate([{ transform: `translate(${viaje.r.left - rd.left}px, ${viaje.r.top - rd.top}px) scale(${esc})`, fontWeight: viaje.fw }, { transform: 'none' }], { duration: 620, easing: 'cubic-bezier(.65,0,.35,1)' }).onfinish = () => { n.remove(); d.style.visibility = ''; };
      }
    };
  }
  /*#fin*/

  /* ---------- lo demás de la cáscara ---------- */
  function ponerDia() { const d = $('[data-b="dia"]'); if (d) d.textContent = E.discreto ? '•••• (' + sig(DIA / (TOTAL - DIA) * 100, 2) + ' %)' : `${sig(DIA, 2)} € (${sig(DIA / (TOTAL - DIA) * 100, 2)} %)`; }
  function discreto() {
    // importes ocultos: fuera los euros de Hoy (los porcentajes se quedan) y, en el anillo, ninguna cifra
    const pl = $('[data-b="pl"]'); if (pl) pl.textContent = E.discreto ? '•••• (+10,43 %)' : '+8.368,74 € (+10,43 %)';
    for (const x of $$('.hd-frase b, .hd-ayer b, .hd-mv-v b')) { if (!x.dataset.mqT) x.dataset.mqT = x.textContent; x.textContent = E.discreto ? '••••' : x.dataset.mqT; }
    const ojo = $('.hero-ojo'); if (ojo) ojo.setAttribute('aria-pressed', String(E.discreto));
  }
  function tick() {
    if (vista !== 'hoy') return;
    const antes = TOTAL, d = Math.round((Math.random() * 260 - 95) * 100) / 100; TOTAL = Math.round((TOTAL + d) * 100) / 100; DIA = Math.round((DIA + d) * 100) / 100;
    ponerCifra('tick', antes); ponerDia(); const dd = $('[data-b="dia"]'); if (dd) dd.className = DIA >= 0 ? 'up' : 'down';
    if (G.pest !== 'cobros') cambiaGraf('tick');
  }
  function repetir() {
    if (vista === 'hoy') { G.cabPest = null; ponerCifra('entra'); montarGraf(); monedaSaluda(); }
    else { A.sel = -1; ponerAnillo(true); monedaSaluda(); }
  }
  function aplicar(nuevo, op) {
    const antes = Object.assign({}, E); Object.assign(E, nuevo);
    H.setAttribute('data-tema', E.tema); H.classList.toggle('mq-quieto', quieto()); H.classList.toggle('mq-discreto', E.discreto);
    if (op.silencio) { montarMoneda(); if (!empezada) { empezada = true; alEntrar(); } else if (vista === 'hoy') { ponerCifra('nada'); discreto(); } else ponerAnillo(false, true); return; }
    const cambia = (k) => antes[k] !== E[k];
    if (cambia('tema') || cambia('moneda') || cambia('sin3d')) montarMoneda();
    const demo = !op.calla;   // con «calla» (va a cambiar de página enseguida) no se enseña nada: ya lo hará la página al entrar
    if (vista === 'hoy') {
      if (cambia('discreto') || cambia('quieto')) { ponerCifra('nada'); ponerDia(); discreto(); if (G.svg) { G.cur = null; G.cabPest = null; cambiaGraf('entra'); } }
      else if (demo && (cambia('cifras') || op.repetir === 'cifras')) ponerCifra('entra');
      if (demo && (cambia('graf') || op.repetir === 'graf') && G.svg) { const p = ['valor', 'rend', 'caida', 'cobros']; G.pest = p[(p.indexOf(G.pest) + 1) % 4]; cambiaGraf(); }
    } else if (cambia('tema') || cambia('anillo') || cambia('sin3d') || cambia('discreto') || cambia('quieto') || op.repetir === 'anillo') ponerAnillo(cambia('anillo') || cambia('sin3d') || op.repetir === 'anillo' || cambia('quieto'), cambia('tema'));
    if (demo && (cambia('moneda') || op.repetir === 'moneda')) setTimeout(monedaSaluda, 250);
    if (demo && (cambia('paso') || op.repetir === 'paso')) setTimeout(() => irA(vista === 'hoy' ? 'reparto' : 'hoy'), 120);
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest ? e.target : e.target.parentNode;
    const seg = t.closest('[data-mq-seg]'); if (seg) { e.preventDefault(); elegirTrozo(+seg.dataset.mqSeg); return; }
    const dim = t.closest('[data-mq-dim]'); if (dim) { A.dim = dim.dataset.mqDim; A.sel = -1; ponerAnillo(false); return; }
    const hp = t.closest('[data-hpest]'); if (hp) { G.pest = hp.dataset.hpest; cambiaGraf(); return; }
    const rg = t.closest('[data-rango]'); if (rg) { if (!rg.disabled) { G.rango = rg.dataset.rango; cambiaGraf(); } return; }
    const ojo = t.closest('.hero-ojo'); if (ojo) { aplicar({ discreto: !E.discreto }, {}); fuera({ estado: { discreto: E.discreto } }); return; }
    const a = t.closest('a, button'); if (!a) return;
    if (a.tagName === 'A') e.preventDefault();
    const h = a.getAttribute('href') || '', ir = a.dataset.ir || a.dataset.sec || '';
    if (h === '#cartera' || ir === 'cartera' || ir === 'hoy') irA('hoy');
    else if (/reparto/.test(h + ir) || a.dataset.pest === 'reparto' || (MOVIL && h === '#posiciones')) irA('reparto');
  }, true);
  document.addEventListener('submit', (e) => e.preventDefault(), true);
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.an) { /* en segundo plano no se anima nada: rAF ya se para solo */ } });
  addEventListener('message', (ev) => {
    const m = ev.data; if (!m) return;
    if (m.mqEstado) aplicar(m.mqEstado, m.ir && m.ir !== vista ? { calla: true } : m);
    if (m.ir) irA(m.ir);
    if (m.tick) tick();
    if (m.repetirTodo) repetir();
    if (m.arriba) scrollTo(0, 0);
  });
  let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (vista === 'hoy') montarGraf(); montarMoneda(); }, 200); });
  // los fotogramas por segundo de verdad, para verlos debajo de la maqueta
  setInterval(() => { const f = window.T3D && window.T3D.fps; if (f && performance.now() - f.t < 600) fuera({ fps: Math.round(f.v) }); else fuera({ fps: 0 }); }, 700);

  let empezada = false;
  const arranca = () => {
    H.classList.add('mq-lista'); marcarNav(); fuera({ listo: true });
    // dentro de la página para elegir, espera el estado; suelta, arranca sola
    setTimeout(() => { if (!empezada) aplicar({}, { silencio: true }); }, parent === window ? 0 : 700);
  };
  if (document.readyState === 'complete') arranca(); else addEventListener('load', arranca);
})();
