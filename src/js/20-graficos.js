/* ---------- gráficos SVG ---------- */
function niceTicks(min, max, n = 4) {
  const span = max - min || Math.abs(max) || 1;
  const paso0 = span / n, mag = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= paso0) || mag * 10;
  const t = [];
  for (let v = Math.ceil(min / paso) * paso; v <= max + 1e-9; v += paso) t.push(+v.toFixed(10));
  return t;
}

/* series: [{datos:[{d,v}], color, disc, nombre}] — la primera manda en el eje X y en el color de relleno */
function grafLinea(cont, series, opt = {}) {
  cont.innerHTML = '';
  if (Array.isArray(series) && series.length && series[0].d) series = [{ datos: series }];
  const base = series[0] && series[0].datos;
  if (!base || base.length < 2) { cont.innerHTML = '<div class="vacio">Faltan precios para dibujarlo.</div>'; return; }
  const W = Math.max(240, cont.clientWidth || 600), H = opt.alto || 260;
  const ml = 4, mr = opt.sinEjes ? 4 : 54, mt = 10, mb = opt.sinEjes ? 4 : 26;
  const vals = series.flatMap((s) => s.datos.map((x) => x.v));
  if (opt.linea && opt.linea.v) vals.push(opt.linea.v);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.02 || 1; lo -= pad; hi += pad;
  const n = base.length;
  const idx = new Map(base.map((x, i) => [x.d, i]));
  // eje X por fecha (no por número de punto): lo antiguo viene semanal y lo reciente diario
  const T = base.map((p) => tiempoDe(p.d)), t0 = T[0], t1 = T[n - 1] > t0 ? T[n - 1] : t0 + 1;
  const xt = (t) => ml + ((t - t0) / (t1 - t0)) * (W - ml - mr);
  const x = (i) => xt(T[i]);
  const cercano = (t) => { let lo2 = 0, hi2 = n - 1; while (hi2 - lo2 > 1) { const m = (lo2 + hi2) >> 1; if (T[m] <= t) lo2 = m; else hi2 = m; } return t - T[lo2] <= T[hi2] - t ? lo2 : hi2; };
  const y = (v) => mt + (1 - (v - lo) / (hi - lo)) * (H - mt - mb);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', opt.titulo || 'Gráfico');
  const sube = base[n - 1].v >= base[0].v;
  const color = series[0].color || opt.color || (sube ? 'var(--up)' : 'var(--down)');
  let g = '';
  if (!opt.sinEjes) {
    const ticks = niceTicks(lo, hi, H < 150 ? 3 : 4);
    // si los rótulos compactos se repiten (80k, 80k), con un decimal más
    const fmtEje = (t) => { if (opt.ejeFmt) return opt.ejeFmt(t); const c = ticks.map(compacto); if (new Set(c).size === c.length) return compacto(t); const a = Math.abs(t); return a >= 1e3 ? fmtNum(t / 1e3, ticks.length > 1 && Math.abs(ticks[1] - ticks[0]) < 100 ? 2 : 1) + 'k' : fmtNum(t, 0); };
    for (const t of ticks) {
      g += `<line x1="${ml}" x2="${W - mr}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-width="1"/>`;
      g += `<text x="${W - mr + 8}" y="${y(t) + 4}" font-size="11" fill="var(--muted)" style="font-variant-numeric:tabular-nums">${opt.oculto ? '' : fmtEje(t)}</text>`;
    }
    const dias = (t1 - t0) / 864e5;
    const pasos = Math.min(6, Math.max(2, Math.floor((W - ml - mr) / 110)));
    if (dias < 8) {
      // 1 día: horas; 1 semana: el día de la semana
      for (let k = 0; k <= pasos; k++) {
        const d = new Date(t0 + (k / pasos) * (t1 - t0));
        const etq = dias < 1.6 ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : `${DIAS_SEM[d.getDay()]} ${d.getDate()}`;
        g += `<text x="${xt(d.getTime())}" y="${H - 6}" text-anchor="${k === 0 ? 'start' : k === pasos ? 'end' : 'middle'}" font-size="11" fill="var(--muted)">${etq}</text>`;
      }
    } else if (dias > 900) {
      // un rótulo por año, en el 1 de enero
      const anios = [];
      for (let a = new Date(t0).getFullYear() + 1; a <= new Date(t1).getFullYear(); a++) anios.push(a);
      const salto = Math.ceil(anios.length / Math.max(2, Math.floor((W - ml - mr) / 70)));
      anios.filter((a, k) => k % salto === 0).forEach((a) => { g += `<text x="${xt(new Date(a, 0, 1).getTime())}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--muted)">${a}</text>`; });
    } else {
      for (let k = 0; k <= pasos; k++) {
        const d = new Date(t0 + (k / pasos) * (t1 - t0));
        const etq = dias > 100 ? `${MESES[d.getMonth()]}${d.getMonth() === 0 || k === 0 ? ' ' + String(d.getFullYear()).slice(2) : ''}` : `${d.getDate()} ${MESES[d.getMonth()]}`;
        g += `<text x="${xt(d.getTime())}" y="${H - 6}" text-anchor="${k === 0 ? 'start' : k === pasos ? 'end' : 'middle'}" font-size="11" fill="var(--muted)">${etq}</text>`;
      }
    }
  }
  const pts = (datos) => datos.map((s) => { const i = idx.get(s.d); return i == null ? null : `${x(i).toFixed(1)},${y(s.v).toFixed(1)}`; }).filter(Boolean).join(' ');
  const pBase = pts(base);
  if (!opt.sinRef) g += `<line x1="${ml}" x2="${W - mr}" y1="${y(base[0].v)}" y2="${y(base[0].v)}" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="2 3"/>`;
  if (opt.linea && opt.linea.v) g += `<line x1="${ml}" x2="${W - mr}" y1="${y(opt.linea.v)}" y2="${y(opt.linea.v)}" stroke="var(--warn)" stroke-width="1" stroke-dasharray="4 4"/><text x="${ml + 4}" y="${y(opt.linea.v) - 6}" font-size="11" fill="var(--warn)">${esc(opt.linea.etiqueta || '')}</text>`;
  const yRel = opt.rellenoA != null ? y(opt.rellenoA) : H - mb;
  g += `<polygon points="${x(0)},${yRel} ${pBase} ${x(n - 1)},${yRel}" fill="${color}" fill-opacity="${opt.rellenoA != null ? 0.16 : 0.08}"/>`;
  if (opt.rellenoA != null) g += `<line x1="${ml}" x2="${W - mr}" y1="${yRel}" y2="${yRel}" stroke="var(--line-2)" stroke-width="1"/>`;
  for (const s of series.slice(1)) g += `<polyline points="${pts(s.datos)}" fill="none" stroke="${s.color || 'var(--text-2)'}" stroke-width="1.4" stroke-dasharray="${s.disc ? '5 4' : ''}" stroke-linejoin="round"/>`;
  g += `<polyline points="${pBase}" fill="none" stroke="${color}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/>`;
  g += `<circle cx="${x(n - 1)}" cy="${y(base[n - 1].v)}" r="3.5" fill="${color}" stroke="var(--bg)" stroke-width="2"/>`;
  if (opt.marca && idx.has(opt.marca.d)) { const i = idx.get(opt.marca.d), mx = x(i), my = y(base[i].v), izq = mx > W * 0.7; g += `<circle cx="${mx}" cy="${my}" r="4" fill="${color}" stroke="var(--bg)" stroke-width="2"/><text x="${mx + (izq ? -8 : 8)}" y="${Math.min(my + 4, H - mb - 4)}" text-anchor="${izq ? 'end' : 'start'}" font-size="11.5" font-weight="700" fill="${color}" style="font-variant-numeric:tabular-nums">${esc(opt.marca.txt)}</text>`; }
  g += `<g class="cruz" visibility="hidden"><line y1="${mt}" y2="${H - mb}" stroke="var(--line-2)" stroke-width="1"/><circle r="4" fill="${color}" stroke="var(--bg)" stroke-width="2"/></g>`;
  g += `<rect x="${ml}" y="0" width="${W - ml - mr}" height="${H}" fill="transparent" class="zona"/>`;
  svg.innerHTML = g;
  cont.appendChild(svg);
  const tt = document.createElement('div'); tt.className = 'tt'; tt.hidden = true; cont.appendChild(tt);
  const cruz = svg.querySelector('.cruz');
  const mapas2 = series.slice(1).map((s) => new Map(s.datos.map((p) => [p.d, p.v])));
  let actual = n - 1;
  const mostrar = (i) => {
    actual = Math.max(0, Math.min(n - 1, i));
    const s = base[actual];
    cruz.setAttribute('visibility', 'visible');
    cruz.querySelector('line').setAttribute('x1', x(actual)); cruz.querySelector('line').setAttribute('x2', x(actual));
    cruz.querySelector('circle').setAttribute('cx', x(actual)); cruz.querySelector('circle').setAttribute('cy', y(s.v));
    tt.innerHTML = '';
    if (opt.alMover) opt.alMover(s);
    const b = document.createElement('b'); b.textContent = opt.fmt ? opt.fmt(s.v) : fmtNum(s.v);
    if (!opt.alMover) tt.append(b);
    if (opt.cambio) { const c = document.createElement('span'); const p = (s.v / base[0].v - 1) * 100; c.textContent = pctS(p) + ' en el periodo'; c.className = cls(p); tt.append(c); }
    series.slice(1).forEach((se, k) => { const v = mapas2[k].get(s.d); if (v != null) { const c = document.createElement('span'); c.textContent = `${se.nombre}: ${opt.fmt ? opt.fmt(v) : fmtNum(v)}`; tt.append(c); } });
    const sp = document.createElement('span'); sp.textContent = fechaPunto(s.d); tt.append(sp);
    tt.hidden = false;
    const px = (x(actual) / W) * cont.clientWidth;
    tt.style.left = Math.min(Math.max(px, 80), cont.clientWidth - 80) + 'px';
    tt.style.top = ((y(s.v) / H) * svg.getBoundingClientRect().height - 10) + 'px';
  };
  const ocultar = () => { cruz.setAttribute('visibility', 'hidden'); tt.hidden = true; if (opt.alMover) opt.alMover(null); };
  const zona = svg.querySelector('.zona');
  zona.addEventListener('pointermove', (ev) => {
    const r = svg.getBoundingClientRect();
    const sx = ((ev.clientX - r.left) / r.width) * W;
    mostrar(cercano(t0 + ((sx - ml) / (W - ml - mr)) * (t1 - t0)));
  });
  zona.addEventListener('pointerleave', ocultar);
  svg.setAttribute('tabindex', '0');
  svg.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') { mostrar(actual - 1); ev.preventDefault(); }
    else if (ev.key === 'ArrowRight') { mostrar(actual + 1); ev.preventDefault(); }
  });
  svg.addEventListener('focus', () => mostrar(actual));
  svg.addEventListener('blur', ocultar);
}

/* una curva suave que pasa por todos los puntos sin inventarse picos (Fritsch-Carlson: monótona entre punto y punto) */
function curvaSuave(P) {
  const n = P.length, f = (v) => v.toFixed(1);
  if (n < 3) return 'M' + P.map(([a, b]) => `${f(a)},${f(b)}`).join('L');
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = P[i + 1][0] - P[i][0]; m[i] = dx[i] ? (P[i + 1][1] - P[i][1]) / dx[i] : 0; }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (!m[i]) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${f(P[0][0])},${f(P[0][1])}`;
  for (let i = 0; i < n - 1; i++) { const h = dx[i] / 3; d += `C${f(P[i][0] + h)},${f(P[i][1] + t[i] * h)} ${f(P[i + 1][0] - h)},${f(P[i + 1][1] - t[i + 1] * h)} ${f(P[i + 1][0])},${f(P[i + 1][1])}`; }
  return d;
}

/* la gráfica grande de Cartera: la curva con brillo y un relleno que se desvanece, el punto de ahora latiendo, el máximo
   y el mínimo marcados, y sin eje de cifras (la cifra es la de arriba). Al pasar el dedo, lo de después se apaga, la
   fecha sale abajo y opt.alMover recibe el punto (para la cifra grande); al soltar, todo vuelve a ahora */
let grafHeroN = 0;
/* la textura bajo la curva de Inicio: grano dorado fino, como de película, que se apaga hacia abajo. El grano es una
   imagen pequeña hecha una vez (a la resolución de la pantalla) que se repite: sin filtros, para que pasar el dedo por
   la curva vaya igual de fino en cualquier móvil */
let granoCache = null;
function granoGraf() {
  if (granoCache) return granoCache;
  try {
    const dpr = Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1))), px = 96 * dpr;
    const c = document.createElement('canvas'); c.width = c.height = px;
    const x = c.getContext('2d'), im = x.createImageData(px, px), d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = Math.max(0, Math.min(1, Math.random() * 2.2 - 0.95));
      d[i] = 236; d[i + 1] = 192; d[i + 2] = 112; d[i + 3] = Math.round(a * 255);
    }
    x.putImageData(im, 0, 0);
    granoCache = { url: c.toDataURL('image/png'), l: 96 };
  } catch (e) { granoCache = null; }
  return granoCache;
}
function texturaGraf({ id, W, H }) {
  return granoGraf() ? `<rect class="gh-area gh-tex" x="0" y="0" width="${W}" height="${H}" fill="url(#${id}n)" mask="url(#${id}m)"/>` : '';
}
function grafHero(cont, series, opt = {}) {
  cont.innerHTML = '';
  const base = series[0] && series[0].datos;
  if (!base || base.length < 2) { cont.innerHTML = '<div class="vacio">Faltan precios para dibujarlo.</div>'; return; }
  const id = 'gh' + (++grafHeroN), NS = 'http://www.w3.org/2000/svg';
  const W = Math.max(260, cont.clientWidth || 600), H = opt.alto || 280;
  const ml = 0, mr = 14, mt = opt.arriba || 60, mb = 30, borde = opt.borde || 20;
  const vals = series.flatMap((se) => se.datos.map((p) => p.v));
  // la línea de referencia (el principio del periodo o el cierre de ayer) entra en la escala si no queda muy lejos;
  // si queda lejos, no se pinta, para no aplastar la curva
  const ref = opt.ref != null && isFinite(opt.ref) ? opt.ref : base[0].v;
  const dmin = Math.min(...vals), dmax = Math.max(...vals), dr = dmax - dmin || Math.abs(dmax) * 0.01 || 1;
  const refVis = ref >= dmin - dr * 0.6 && ref <= dmax + dr * 0.6;
  if (refVis) vals.push(ref);
  const vmin = Math.min(...vals), vmax = Math.max(...vals), rango = vmax - vmin || Math.abs(vmax) * 0.02 || 1;
  const lo = vmin - rango * 0.12, hi = vmax + rango * 0.05;
  const n = base.length, T = base.map((p) => tiempoDe(p.d)), t0 = T[0], t1 = T[n - 1] > t0 ? T[n - 1] : t0 + 1;
  const xt = (t) => ml + ((t - t0) / (t1 - t0)) * (W - ml - mr);
  const y = (v) => mt + (1 - (v - lo) / (hi - lo)) * (H - mt - mb);
  const P = base.map((p, i) => [xt(T[i]), y(p.v)]);
  const color = series[0].color || 'var(--accent)';
  const curva = curvaSuave(P), suelo = H - mb;
  const area = `${curva}L${P[n - 1][0].toFixed(1)},${suelo}L${P[0][0].toFixed(1)},${suelo}Z`;
  // fechas de abajo, metidas hacia dentro para que no peguen al borde
  const dias = (t1 - t0) / 864e5, ejes = [];
  const sitio = Math.min(5, Math.max(2, Math.floor((W - 2 * borde) / 120)));
  const etq = (d) => (dias < 1.6 ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : dias < 8 ? `${DIAS_SEM[d.getDay()]} ${d.getDate()}` : dias > 900 ? String(d.getFullYear()) : dias > 300 ? `${MESES[d.getMonth()]} ${d.getFullYear()}` : dias > 100 ? `${MESES[d.getMonth()]}${d.getMonth() === 0 ? ' ' + String(d.getFullYear()).slice(2) : ''}` : `${d.getDate()} ${MESES[d.getMonth()]}`);
  if (dias > 900) {
    const anios = []; for (let a = new Date(t0).getFullYear() + 1; a <= new Date(t1).getFullYear(); a++) anios.push(a);
    const salto = Math.ceil(anios.length / sitio);
    anios.filter((a, k) => k % salto === 0).forEach((a) => ejes.push([xt(new Date(a, 0, 1).getTime()), String(a)]));
  } else if (dias < 1.6) {
    // en un día, horas en punto (cada 1, 2, 3, 4 o 6 h, las que quepan)
    const paso = [1, 2, 3, 4, 6, 12].find((h) => (t1 - t0) / (h * 36e5) <= sitio + 1) || 12;
    const h0 = new Date(t0); h0.setMinutes(0, 0, 0); h0.setHours(Math.ceil((h0.getHours() + (new Date(t0).getMinutes() ? 1 : 0)) / paso) * paso);
    for (let t = h0.getTime(); t <= t1; t += paso * 36e5) ejes.push([xt(t), etq(new Date(t))]);
  } else if (dias < 8) {
    // en una semana, un rótulo por día, a mediodía de cada uno
    const d0 = new Date(t0); d0.setHours(12, 0, 0, 0); if (d0.getTime() < t0) d0.setDate(d0.getDate() + 1);
    const todos = []; for (const d = new Date(d0); d.getTime() <= t1; d.setDate(d.getDate() + 1)) if (d.getDay() % 6) todos.push(d.getTime());
    const salto = Math.ceil(todos.length / (sitio + 1));
    todos.filter((t, k) => k % salto === 0).forEach((t) => ejes.push([xt(t), etq(new Date(t))]));
  } else for (let k = 0; k <= sitio; k++) { const tt = t0 + (k / sitio) * (t1 - t0); ejes.push([xt(tt), etq(new Date(tt))]); }
  let g = `<defs>
    <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${color};stop-opacity:0.46"/><stop offset="0.55" style="stop-color:${color};stop-opacity:0.12"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></linearGradient>
    <linearGradient id="${id}t" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0"><stop offset="0" style="stop-color:${color};stop-opacity:0.5"/><stop offset="0.7" style="stop-color:${color};stop-opacity:1"/><stop offset="1" style="stop-color:#F8DC9C;stop-opacity:1"/></linearGradient>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${color};stop-opacity:0.55"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></linearGradient>
    <linearGradient id="${id}mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.7" stop-color="#fff" stop-opacity="0.2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="${id}m"><path d="${area}" fill="url(#${id}mg)"/></mask>
    ${(() => { const gr = granoGraf(); return gr ? `<pattern id="${id}n" width="${gr.l}" height="${gr.l}" patternUnits="userSpaceOnUse"><image href="${gr.url}" width="${gr.l}" height="${gr.l}" style="image-rendering:pixelated"/></pattern>` : ''; })()}
    <radialGradient id="${id}r"><stop offset="0" style="stop-color:${color};stop-opacity:0.28"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></radialGradient>
    <linearGradient id="${id}c" gradientUnits="userSpaceOnUse" x1="0" y1="${mt - 20}" x2="0" y2="${suelo}"><stop offset="0" style="stop-color:var(--text-2);stop-opacity:0"/><stop offset="0.3" style="stop-color:var(--text-2);stop-opacity:0.5"/><stop offset="1" style="stop-color:var(--text-2);stop-opacity:0.15"/></linearGradient>
    <filter id="${id}b" x="-5%" y="-40%" width="110%" height="180%"><feGaussianBlur stdDeviation="6.5"/></filter>
    <clipPath id="${id}k"><rect class="gh-corte" x="0" y="0" width="${W}" height="${H}"/></clipPath>
  </defs>`;
  for (const [ex, tx] of ejes) {
    const xx = Math.min(Math.max(ex, borde), W - borde);
    g += `<text class="gh-eje" x="${xx.toFixed(1)}" y="${H - 9}" text-anchor="${xx <= borde + 1 ? 'start' : xx >= W - borde - 1 ? 'end' : 'middle'}">${esc(tx)}</text>`;
  }
  // la línea de donde empezó el periodo, muy tenue
  if (!opt.sinRef && refVis) g += `<line x1="0" x2="${W}" y1="${y(ref).toFixed(1)}" y2="${y(ref).toFixed(1)}" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="2 5"/>`;
  // la misma curva en gris por debajo: es lo que se ve a la derecha del dedo
  g += `<path d="${curva}" fill="none" stroke="var(--line-2)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  for (const se of series.slice(1)) {
    const Q = se.datos.map((p) => { const i = base.findIndex((b) => b.d === p.d); return i < 0 ? null : [P[i][0], y(p.v)]; }).filter(Boolean);
    if (Q.length > 1) g += `<path d="${curvaSuave(Q)}" fill="none" stroke="${se.color || 'var(--text-2)'}" stroke-width="1.5" stroke-dasharray="${se.disc ? '5 5' : ''}" stroke-linejoin="round" opacity="0.85"/>`;
  }
  g += `<g clip-path="url(#${id}k)">
    <path class="gh-area" d="${area}" fill="url(#${id}a)" opacity="0.6"/>
    ${texturaGraf({ id, W, H })}
    <path class="gh-trazo" d="${curva}" fill="none" stroke="url(#${id}t)" stroke-width="10" opacity="0.45" filter="url(#${id}b)"/>
    <path class="gh-trazo" d="${curva}" fill="none" stroke="url(#${id}t)" stroke-width="${opt.grueso || 2.8}" stroke-linejoin="round" stroke-linecap="round"/>
  </g>`;
  // el máximo y el mínimo del periodo (si no son el punto de ahora, que ya está arriba en grande)
  if (!opt.oculto) {
    let iMax = 0, iMin = 0; base.forEach((p, i) => { if (p.v > base[iMax].v) iMax = i; if (p.v < base[iMin].v) iMin = i; });
    const marca = (i, arriba) => {
      if (P[n - 1][0] - P[i][0] < 56 || base[iMax].v === base[iMin].v) return '';
      const [px, py] = P[i], ancla = px < 60 ? 'start' : px > W - 60 ? 'end' : 'middle';
      return `<g class="gh-ext"><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.6" fill="${color}"/><text x="${Math.min(Math.max(px, 8), W - 8).toFixed(1)}" y="${(arriba ? py - 10 : py + 18).toFixed(1)}" text-anchor="${ancla}">${esc((opt.fmt || fmtNum)(base[i].v))}</text></g>`;
    };
    g += marca(iMax, true) + marca(iMin, false);
  }
  const [fx, fy] = P[n - 1];
  g += `<g class="gh-fin"><circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${Math.min(80, H * 0.3).toFixed(0)}" fill="url(#${id}r)"/><line x1="${fx.toFixed(1)}" x2="${fx.toFixed(1)}" y1="${(fy + 6).toFixed(1)}" y2="${suelo}" stroke="url(#${id}h)" stroke-width="1.2"/><circle class="gh-pulso" cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="4" fill="${color}"/><circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="4.2" fill="${color}" stroke="var(--bg)" stroke-width="2"/></g>`;
  g += `<g class="gh-cruz" visibility="hidden"><line y1="${mt - 20}" y2="${suelo}" stroke="url(#${id}c)" stroke-width="1"/><circle r="11" fill="${color}" opacity="0.18"/><circle r="4.6" fill="${color}" stroke="var(--bg)" stroke-width="2"/></g>`;
  g += `<rect class="zona" x="0" y="0" width="${W}" height="${H}" fill="transparent"/>`;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', opt.titulo || 'Gráfico');
  svg.innerHTML = g;
  cont.appendChild(svg);
  // al estrenar periodo, la curva se dibuja de izquierda a derecha (una vez; las recargas de precios no la repiten)
  if (opt.animar && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const p of svg.querySelectorAll('.gh-trazo')) { try { p.style.setProperty('--l', Math.ceil(p.getTotalLength()) + 1); } catch (e) {} }
    svg.classList.add('entra');
  }
  const fecha = document.createElement('div'); fecha.className = 'gh-fecha'; fecha.hidden = true; cont.appendChild(fecha);
  const cruz = svg.querySelector('.gh-cruz'), corte = svg.querySelector('.gh-corte');
  const mapas2 = series.slice(1).map((se) => new Map(se.datos.map((p) => [p.d, p.v])));
  const cercano = (t) => { let a = 0, b = n - 1; while (b - a > 1) { const m = (a + b) >> 1; if (T[m] <= t) a = m; else b = m; } return t - T[a] <= T[b] - t ? a : b; };
  let actual = n - 1;
  const mostrar = (i) => {
    actual = Math.max(0, Math.min(n - 1, i));
    const s = base[actual], [px, py] = P[actual];
    cruz.setAttribute('visibility', 'visible');
    const ln = cruz.querySelector('line'); ln.setAttribute('x1', px); ln.setAttribute('x2', px);
    for (const c of cruz.querySelectorAll('circle')) { c.setAttribute('cx', px); c.setAttribute('cy', py); }
    corte.setAttribute('width', Math.max(0, px));
    svg.classList.add('mirando');
    fecha.innerHTML = esc(fechaPunto(s.d)) + series.slice(1).map((se, k) => { const v = mapas2[k].get(s.d); return v == null ? '' : `<small>${esc(se.nombre)}: ${esc(opt.fmt ? opt.fmt(v) : fmtNum(v))}</small>`; }).join('');
    fecha.hidden = false;
    const cw = cont.clientWidth, ancho = fecha.offsetWidth || 90;
    fecha.style.left = Math.min(Math.max((px / W) * cw, ancho / 2 + 4), cw - ancho / 2 - 4) + 'px';
    if (opt.alMover) opt.alMover(s);
  };
  const soltar = () => { cruz.setAttribute('visibility', 'hidden'); corte.setAttribute('width', W); svg.classList.remove('mirando'); fecha.hidden = true; if (opt.alMover) opt.alMover(null); };
  const zona = svg.querySelector('.zona');
  zona.addEventListener('pointermove', (ev) => { const r = svg.getBoundingClientRect(); const sx = ((ev.clientX - r.left) / r.width) * W; mostrar(cercano(t0 + ((sx - ml) / (W - ml - mr)) * (t1 - t0))); });
  zona.addEventListener('pointerleave', soltar);
  zona.addEventListener('pointercancel', soltar);
  svg.setAttribute('tabindex', '0');
  svg.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') { mostrar(actual - 1); ev.preventDefault(); }
    else if (ev.key === 'ArrowRight') { mostrar(actual + 1); ev.preventDefault(); }
    else if (ev.key === 'Escape') soltar();
  });
  svg.addEventListener('focus', () => mostrar(actual));
  svg.addEventListener('blur', soltar);
}

/* cada celda se lleva el nombre de su columna para la vista apilada del móvil */
function etiquetarTablas(raiz = document) {
  for (const t of $$('table.resp', raiz)) {
    const hs = [...t.querySelectorAll('thead th')].map((th) => th.textContent.replace('↓', '').trim());
    for (const tr of t.querySelectorAll('tbody tr')) [...tr.children].forEach((td, i) => { if (i && hs[i]) td.dataset.l = hs[i]; });
  }
}
// 0.3.9: la gráfica de estos periodos es lo que tienes hoy con los precios de entonces: se dice, para que no choque
// con «Ganado desde que compraste» (salía «+11.091 € en el último año» frente a «+9.433 €» ganados en total)
const ETQ_RANGO = { '1D': ['hoy', 'today'], '1S': ['lo que tienes, en la última semana', 'what you hold, over the last week'], '1M': ['lo que tienes, en el último mes', 'what you hold, over the last month'], '3M': ['lo que tienes, en los últimos 3 meses', 'what you hold, over the last 3 months'], '6M': ['lo que tienes, en los últimos 6 meses', 'what you hold, over the last 6 months'], '1A': ['lo que tienes, en el último año', 'what you hold, over the last year'], '3A': ['lo que tienes, en los últimos 3 años', 'what you hold, over the last 3 years'], '5A': ['lo que tienes, en los últimos 5 años', 'what you hold, over the last 5 years'] };
let grafHeroUltimo = '';
const enSuSitio = () => { const se = document.scrollingElement || document.documentElement; if (se.scrollLeft) se.scrollLeft = 0; if (document.body.scrollLeft) document.body.scrollLeft = 0; };
document.addEventListener('visibilitychange', () => { if (!document.hidden) { enSuSitio(); setTimeout(enSuSitio, 300); } });
window.addEventListener('pageshow', enSuSitio);
window.addEventListener('resize', () => setTimeout(enSuSitio, 50));
function dibujar(M) {
  enSuSitio();
  etiquetarTablas($('#vista'));
  const gp = $('#grafProy'); if (gp) grafAbanico(gp, proyeccion(M, cfgProy()), (S.horizonte || 20) * 12);
  const g = $('#grafEvo');
  if (g) {
    const dias = diasRango(S.rango);
    const intra = INTRADIA.has(S.rango);
    let serie = intra ? serieIntradia(M, S.rango) : serieCartera(M, dias), deIntra = intra;
    if (intra && serie.length < 2) { serie = serieCartera(M, S.rango === '1D' ? 4 : 9); deIntra = false; }
    // la serie diaria solo suma las posiciones con histórico: el efectivo (y lo que no tiene histórico) entra como
    // una cantidad fija, para que la gráfica, la pastilla y la cifra grande hablen del mismo patrimonio
    if (!deIntra && serie.length) { const extra = M.total - serie[serie.length - 1].v; if (isFinite(extra) && Math.abs(extra) > 0.005) serie = serie.map((x) => ({ d: x.d, v: x.v + extra })); }
    // la variación del periodo, en una pastilla debajo de la cifra grande
    const t0s = serie.length ? tiempoDe(serie[0].d) : Date.now();
    const corto = (Date.now() - t0s) < dias * 864e5 * 0.85;
    const etqRango = S.rango === '1D' && deIntra ? L('desde el último cierre', 'since the last close')
      : S.rango === 'Inicio' && inicioDicho() && serie.length ? L(`ganado desde que empezaste a invertir, en ${deIso(inicioDicho()).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`, `gained since you started investing, ${deIso(inicioDicho()).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`)
      : S.rango === 'Inicio' && inicioCartera() && serie.length ? L(`desde tu primera compra apuntada, el ${fechaPunto(serie[0].d)}`, `since your first logged purchase, ${fechaPunto(serie[0].d)}`)
      : S.rango === 'Inicio' && serie.length ? L('ganado desde que compraste', 'gained since you bought')
      : !serie.length ? '' : corto || S.rango === 'Máx' || !ETQ_RANGO[S.rango] ? L(`desde el ${fechaPunto(serie[0].d)}`, `since ${fechaPunto(serie[0].d)}`) : L(...ETQ_RANGO[S.rango]);
    const pintarVar = (desde, hasta, etq, fijo) => {
      const cab = $('#evoCab'); if (!cab || !desde || !hasta) return;
      const d = fijo ? fijo.d : hasta.v - desde.v, p = fijo ? fijo.p : (hasta.v / desde.v - 1) * 100, c = cls(d);
      cab.innerHTML = `<span class="hv-p ${c}"><i aria-hidden="true">${d > 0 ? '▲' : d < 0 ? '▼' : '•'}</i>${esc(eurS(d, 0))}<em>${esc(pctS(p))}</em></span><span class="k">${esc(etq)}</span>`;
    };
    // desde dónde se cuenta: el primer punto del periodo o, en 1D, el cierre de ayer (así cuadra con «Hoy»)
    const ref0 = S.rango === '1D' && deIntra && isFinite(M.dia) && serie.length ? { d: serie[0].d, v: M.total - M.dia } : serie[0] || null;
    const ahora = { d: hoyIso(), v: isFinite(M.total) ? M.total : (serie[serie.length - 1] || {}).v };
    const real = (M2) => (S.rango === 'Inicio' && isFinite(M2.pl) && isFinite(M2.plPct) ? { d: M2.pl, p: M2.plPct } : null);
    if (serie.length > 1) pintarVar(ref0, ahora, etqRango, real(M));
    const series = [{ datos: serie, color: 'var(--accent)' }];
    if (S.comparar && !intra) series.push({ datos: serieComparada(serie, S.bench), color: 'var(--text-2)', disc: true, nombre: nombreBench(benchDe(S.bench)) });
    // al pasar el dedo, la cifra grande de arriba enseña lo que tenías ese día y la pastilla, lo que iba desde el
    // principio del periodo; al soltar, todo vuelve a ahora
    const alMover = (p) => {
      const hn = $('#heroNum'), lbl = $('#heroLbl'); if (!hn || !lbl) return;
      if (p) {
        if (!S.oculto) {
          if (!hn.dataset.antes) { hn.dataset.antes = hn.innerHTML; hn.classList.add('mira'); }
          { const r = Math.round(p.v * 100) / 100, e = Math.trunc(r), c = Math.round(Math.abs(r - e) * 100); hn.innerHTML = `<span>${fmtNum(e, 0)}</span><span class="dec">,${String(c).padStart(2, '0')} €</span>`; }
        }
        lbl.textContent = L(`El ${fechaPunto(p.d)}`, fechaPunto(p.d));
        pintarVar(ref0, p, ref0 === serie[0] ? L(`desde el ${fechaPunto(ref0.d)}`, `since ${fechaPunto(ref0.d)}`) : L('desde el último cierre', 'since the last close'));
      } else {
        if (hn.dataset.antes) { hn.innerHTML = hn.dataset.antes; delete hn.dataset.antes; hn.classList.remove('mira'); }
        lbl.textContent = L('Patrimonio', 'Net worth');
        if (serie.length > 1) pintarVar(ref0, ahora, etqRango, real(S.M || M));
      }
    };
    // con los precios en directo cambia el patrimonio: la pastilla se pone al día con él (salvo con el dedo encima)
    S.heroVar = (M2) => {
      const hn = $('#heroNum'); if (!hn || hn.dataset.antes || serie.length < 2) return;
      const desde = S.rango === '1D' && deIntra && isFinite(M2.dia) ? { v: M2.total - M2.dia } : ref0;
      pintarVar(desde, { v: isFinite(M2.total) ? M2.total : ahora.v }, etqRango, real(M2));
    };
    const movil = innerWidth < 760;
    const animar = grafHeroUltimo !== S.rango + (S.comparar ? '+' : ''); grafHeroUltimo = S.rango + (S.comparar ? '+' : '');
    grafHero(g, series, { titulo: L('Evolución del valor de la cartera', 'Portfolio value over time'), fmt: (v) => eur(v, 0), oculto: S.oculto, alto: movil ? 250 : 330, arriba: movil ? 58 : 76, borde: movil ? 16 : 28, grueso: movil ? 2.6 : 3, ref: ref0 && ref0.v, alMover, animar });
  }
  if ($('#mapaMundo')) { if (S.mapaGeo) repintarMapa(); else cargarMapa(); }
  for (const c of $$('.mc-caja')) pintarMapaCartera(c, M);
  const gc = $('#grafCaida'); if (gc && !gc.closest('details:not([open])')) dibujarCaida(gc, M);
  // las de Mercados se dibujan al abrir cada fila (cerradas no tienen ancho)
  for (const el of $$('[data-spark-m]')) if (!el.closest('details:not([open])')) dibujarSparkM(el);
}
function dibujarSparkM(el) {
  const h = histMercado(el.dataset.sparkM) || [];
  grafLinea(el, h.map(([d, v]) => ({ d, v })), { alto: window.innerWidth < 560 ? 56 : 70, sinEjes: true, sinRef: false, titulo: 'Último año', fmt: (v) => fmtMerc(el.dataset.sparkM, v) });
}
/* las ideas compactas del móvil se abren al tocar su cabecera */
function abrirIdea(h) { const a = h.closest('.idea'); if (!a) return; const on = a.classList.toggle('abierta'); h.setAttribute('aria-expanded', String(on)); }
document.addEventListener('click', (e) => { const h = e.target.closest('[data-idea-toggle]'); if (h && !e.target.closest('a, button')) abrirIdea(h); });
document.addEventListener('click', (e) => { const m = e.target.closest('[data-ev-abre]'); if (m) m.classList.toggle('abierto'); });
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-idea-toggle]')) { e.preventDefault(); abrirIdea(e.target); } });
document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (d.matches && d.matches('details.mfila') && d.open) { const el = d.querySelector('[data-spark-m]'); if (el) requestAnimationFrame(() => dibujarSparkM(el)); }
  if (d.matches && d.matches('details.num-sec') && d.open) { const el = d.querySelector('#grafCaida'); if (el) requestAnimationFrame(() => dibujarCaida(el, S.M)); }
}, true);
/* lo que antes iba en una nota debajo de la gráfica, ahora detrás de la «i» junto a la pastilla */
function infoGrafica() {
  hoja(L('Qué enseña la gráfica', 'What the chart shows'), `<div class="info-graf">
    <p>${L('Cómo se habría movido lo que tienes hoy, con las cantidades de hoy. Lo que has ganado tú de verdad, con lo que pagaste, es «Ganado desde que compraste».', 'How what you hold today would have moved, with today\'s amounts. What you have really made, with what you paid, is «Gained since you bought».')}</p>
    <p>${L('La pastilla de debajo de la cifra es lo que ha cambiado en el periodo que elijas. En 1D se cuenta desde el cierre de ayer.', 'The pill under the figure is how much it changed over the period you pick. In 1D it counts from yesterday\'s close.')}</p>
    <p>${L('Pasa el dedo por la curva para ver cuánto tenías cada día. Desde 1M puedes compararla con el mismo dinero metido en el S&P 500 (la línea discontinua). Antes de que existieran algunos fondos se usa un ETF del mismo índice, y lo que aún no cotizaba (una salida a bolsa reciente) cuenta a su primer precio.', 'Run your finger along the curve to see what you had each day. From 1M you can compare it with the same money in the S&P 500 (the dashed line). Before some funds existed, an ETF on the same index is used, and anything not yet listed (a recent IPO) counts at its first price.')}</p>
    <p>${L('«Inicio» va desde tu primera compra; «Máx», tan atrás como hay precios de lo que tienes.', '«Start» goes from your first purchase; «Max», as far back as there are prices for what you own.')}</p>
    <div class="fila-btns"><button class="btn" data-cerrar>${L('Entendido', 'Got it')}</button></div>
  </div>`);
}
/* en el móvil, las notas largas (cómo se calcula, de dónde sale) se pliegan para no hacer scroll */
/* las filas de pestañas que no caben (Reparto en un móvil estrecho: Tipo, Región… Riesgo) se difuminan por el
   lado que sigue, para que se vea que hay más deslizando */
function marcarDeslizables(raiz) {
  if (!raiz) return;
  for (const t of raiz.querySelectorAll('.tabs, .mg-tabs')) {
    const mira = () => { const mas = t.scrollWidth - t.clientWidth; t.classList.toggle('sigue-d', mas > 4 && t.scrollLeft < mas - 4); t.classList.toggle('sigue-i', mas > 4 && t.scrollLeft > 4); };
    mira();
    if (!t.dataset.desl) { t.dataset.desl = '1'; t.addEventListener('scroll', mira, { passive: true }); }
  }
}
function plegarNotas(raiz) {
  if (!raiz || innerWidth > 680) return;
  for (const p of raiz.querySelectorAll('p.nota')) {
    if (p.closest('details, .pf-preguntas, .rg-pasos') || p.textContent.length < 170) continue;
    const d = document.createElement('details'); d.className = 'nota-plegada';
    d.innerHTML = '<summary>Más detalles</summary>';
    p.replaceWith(d); d.appendChild(p);
  }
}
/* la mini gráfica de cada fila de Mercados: los últimos 3 meses, sin ejes */
function miniSpark(sym) {
  const h = (histMercado(sym) || []).slice(-66).map(([, v]) => v).filter((v) => v != null);
  if (h.length < 3) return '<span class="mf-spark"></span>';
  const lo = Math.min(...h), hi = Math.max(...h), W = 64, H = 22;
  const pts = h.map((v, i) => `${((i / (h.length - 1)) * W).toFixed(1)},${(H - 2 - ((v - lo) / (hi - lo || 1)) * (H - 4)).toFixed(1)}`).join(' ');
  const ch = (h[h.length - 1] / h[0] - 1) * 100;
  return `<svg class="mf-spark ${ch >= 0 ? 'up' : 'down'}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('Últimos tres meses', 'Last three months')}: ${pctS(ch, 1)}"><title>${L('Últimos tres meses', 'Last three months')}: ${pctS(ch, 1)}</title><polyline points="${pts}"/></svg>`;
}

let rsT;
window.addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { if (S.M) { dibujar(S.M); if (S.ficha) dibujarFicha(); } }, 150); });
