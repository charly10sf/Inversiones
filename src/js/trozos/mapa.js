/* =========================== Mercados: el mapa del mundo (0.4) =========================== */
/* Cada país, entero, del color de su bolsa (hoy, en el mes o en lo que va de año) o, en «Tu dinero», de lo que tienes
   allí. Las formas salen de Natural Earth ya proyectadas: el mundo (mapa-mundo.json, a 1:110 millones) se pide la
   primera vez que abres Mercados; el mismo mundo con más detalle (mapa-detalle.json, a 1:50 millones) cuando te acercas.
   Los nombres van primero en los mercados que más pesan en el mundo, y en dorado donde tienes dinero. */
const BOLSA_PAIS = { ES: ['^IBEX'], DE: ['^GDAXI'], FR: ['^FCHI'], GB: ['^FTSE'], US: ['^GSPC', '^NDX', '^RUT'], JP: ['^N225'], CN: ['000001.SS'], HK: ['^HSI'], IN: ['^NSEI'], BR: ['^BVSP'] };
/* zonas (en las coordenadas de mapa-mundo.json, 1000 × 439, con la proporción del mapa; mandan sobre las suyas): América,
   de Canadá a São Paulo (entera no cabe sin quedarse casi como el mundo); Oriente Medio, de Turquía y Egipto a Irán; y
   Asia (0.5a), del este: de la India a Japón y de Corea a Indonesia, sin Oriente Medio (antes salían Turquía y Arabia) */
const MAPA_ZONAS_MAS = { am: [8, 40, 600, 263], om: [525, 106, 200, 88], as: [655, 112, 345, 151] };
// en esas vistas, solo los nombres de su zona: por la forma del mapa se cuela algo de Europa, India o Grecia
const ORIENTE_MEDIO = new Set(['TR', 'IL', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'IR', 'YE', 'CY']);
const FOCO_MAPA = { am: (c, p) => p[0] < 430, om: (c) => ORIENTE_MEDIO.has(c), as: (c, p) => !ORIENTE_MEDIO.has(c) && p[0] >= 655 };
// dónde empieza cada tono (por debajo del primero, gris: ni sube ni baja); en «Tu dinero», % de tu cartera
const MAPA_CORTES = { hoy: [0.25, 0.75, 1.5, 2.5], mes: [1, 3, 6, 10], anio: [3, 10, 20, 35], tuyo: [0, 1, 5, 20] };
// lo que pesa cada país en un fondo de todo el mundo (tipo MSCI ACWI), más o menos, en %
const PESO_MUNDO = { US: 64, JP: 4.8, GB: 3.2, CA: 2.9, CN: 2.8, FR: 2.4, TW: 2.2, CH: 2.1, DE: 2.1, IN: 1.8, AU: 1.6, KR: 1.3, NL: 1, SE: 0.8, IT: 0.7, ES: 0.7, DK: 0.5, BR: 0.5, HK: 0.5, SA: 0.4, SG: 0.35, ZA: 0.35, FI: 0.2, BE: 0.2, IL: 0.2, MX: 0.2, AE: 0.15, NO: 0.15, ID: 0.12, MY: 0.12, TH: 0.1, PL: 0.1, IE: 0.1, QA: 0.07, KW: 0.07, GR: 0.06, NZ: 0.05, AT: 0.05, TR: 0.05, CL: 0.04, PH: 0.04, PT: 0.04, HU: 0.02, PE: 0.02, EG: 0.01, CZ: 0.01, CO: 0.01 };
const CORTO_MAPA = { US: ['EEUU', 'US'], GB: ['R. Unido', 'UK'], KR: ['Corea', 'Korea'], AE: ['Emiratos', 'UAE'], SA: ['Arabia S.', 'Saudi Ar.'], ZA: ['Sudáfrica', 'S. Africa'], NL: ['P. Bajos', 'Netherl.'], NZ: ['N. Zelanda', 'NZ'], CH: ['Suiza', 'Switz.'] };
/* las bolsas de un país: las de Mercados (con su precio en directo) y las que solo están para el mapa */
function bolsasDe(c) {
  const merc = (S.precios && S.precios.mercados) || {}, mapa = (S.precios && S.precios.mapa) || {}, out = [];
  for (const sym of BOLSA_PAIS[c] || []) {
    const m = merc[sym];
    if (!m) continue;
    const lv = S.liveM && S.liveM[sym];
    out.push({ sym, n: m.nombre, v: lv && lv.var != null ? lv.var : m.variacion_dia, m: m.rent && m.rent['1m'], y: m.rent && m.rent.ytd, f: m.fecha });
  }
  for (const [sym, x] of Object.entries(mapa)) if (x.p === c) out.push({ sym, n: x.n, v: x.v, m: x.m, y: x.y, f: x.f, my: x.my });
  return out;
}
const nombrePaisMapa = (c) => { const n = S.mapaGeo && S.mapaGeo.n[c]; return n ? L(n[0], n[1]) : PAISES[c] || c; };
const cortoPaisMapa = (c) => (CORTO_MAPA[c] ? L(CORTO_MAPA[c][0], CORTO_MAPA[c][1]) : nombrePaisMapa(c));
function valorMapa(c, modo, ex) {
  if (modo === 'tuyo') { const e = ex.get(c); return e ? e.pct : null; }
  const b = bolsasDe(c)[0];
  if (!b) return null;
  // «hoy» con un cierre de hace más de una semana (la bolsa dejó de llegar) no es hoy: sin datos
  if (modo === 'hoy' && b.f && Date.now() - Date.parse(b.f) > 7 * 864e5) return null;
  return modo === 'hoy' ? b.v : modo === 'mes' ? b.m : b.y;
}
function tonoMapa(v, modo) {
  if (v == null || !isFinite(v)) return 'mp-0';
  const c = MAPA_CORTES[modo];
  if (modo === 'tuyo') return v <= 0 ? 'mp-0' : `mp-a${v >= c[3] ? 4 : v >= c[2] ? 3 : v >= c[1] ? 2 : 1}`;
  const a = Math.abs(v), k = a >= c[3] ? 4 : a >= c[2] ? 3 : a >= c[1] ? 2 : a >= c[0] ? 1 : 0;
  return k ? `mp-${v > 0 ? 'u' : 'd'}${k}` : 'mp-n';
}
const etqModoMapa = (modo) => ({ hoy: L('hoy', 'today'), mes: L('en el último mes', 'over the last month'), anio: L('en lo que va de año', 'so far this year') }[modo] || '');
const valorCortoMapa = (v, modo) => (modo === 'tuyo' ? `${fmtNumR(v, v < 1 ? 2 : v < 10 ? 1 : 0)} %` : pctS(v, 1));
// los países con algo que contar (bolsa o dinero tuyo) y su cifra en el modo elegido
function paisesMapa(modo, ex) {
  const cods = new Set([...Object.keys(BOLSA_PAIS), ...Object.values((S.precios && S.precios.mapa) || {}).map((x) => x.p), ...ex.keys()]);
  return [...cods].map((c) => ({ c, v: valorMapa(c, modo, ex) })).filter((x) => x.v != null && isFinite(x.v));
}
// en «Tu dinero» con una sola posición elegida, su nombre (las cifras son % de esa posición, no de la cartera)
const posMapa = () => (S.mapaPos && S.M && S.M.filas.find((f) => f.pos.id === S.mapaPos)) || null;
function textoValorMapa(v, modo) {
  const pos = modo === 'tuyo' ? posMapa() : null, pn = pos ? pos.inst.corto || pos.inst.nombre : '';
  if (v == null || !isFinite(v)) return modo === 'tuyo' ? (pn ? L(`nada de ${pn}`, `none of ${pn}`) : L('nada de tu cartera', 'none of your portfolio')) : L('sin datos de su bolsa', 'no stock market data');
  const n = fmtNumR(v, v < 1 ? 2 : 1);
  if (modo !== 'tuyo') return `${pctS(v, 1)} ${etqModoMapa(modo)}`;
  return pn ? L(`${n}\u00a0% de ${pn}`, `${n}% of ${pn}`) : L(`${n}\u00a0% de tu cartera`, `${n}% of your portfolio`);
}
/* lo que se ve del mapa: un recuadro [x, y, ancho, alto] en las coordenadas del mundo (1000 × 439). Se acerca con dos
   dedos, tocando dos veces (doble clic con ratón), con + y − o con los botones de Europa y Asia, y de cerca se arrastra
   con el dedo o el ratón. De lejos, el dedo vertical mueve la página como siempre */
const MAPA_ZOOM_MAX = 12, MAPA_DETALLE_DESDE = 1.7;
const vbMundoMapa = () => [0, 0, S.mapaGeo.w, S.mapaGeo.h];
const cajaVistaMapa = (v) => (v !== 'mundo' && S.mapaGeo.zonas[v] ? S.mapaGeo.zonas[v] : vbMundoMapa());
const anchoMapa = () => { const w = $('#mapaMundo'); return (w && w.clientWidth) || Math.min(innerWidth - 32, 1000); };
const zoomMapa = (vb = S.mapaVB) => (vb && S.mapaGeo ? S.mapaGeo.w / vb[2] : 1);
function limitarVB(vb) {
  const G = S.mapaGeo;
  const w = Math.min(G.w, Math.max(G.w / MAPA_ZOOM_MAX, vb[2])), h = (w * G.h) / G.w;
  const cx = vb[0] + vb[2] / 2, cy = vb[1] + (vb[3] || (vb[2] * G.h) / G.w) / 2;
  return [Math.min(Math.max(cx - w / 2, 0), G.w - w), Math.min(Math.max(cy - h / 2, 0), G.h - h), w, h];
}
// el botón de vista encendido: el de la zona que estás viendo, o ninguno si te has ido a otra parte
function vistaDeVB(vb) {
  for (const [k] of MAPA_VISTAS) {
    const z = cajaVistaMapa(k);
    if (Math.abs(z[2] - vb[2]) / z[2] < 0.08 && Math.abs(z[0] + z[2] / 2 - vb[0] - vb[2] / 2) < z[2] * 0.1 && Math.abs(z[1] + z[3] / 2 - vb[1] - vb[3] / 2) < z[3] * 0.12) return k;
  }
  return null;
}
// las formas: de lejos, las del mapa del mundo (ligeras); de cerca, las de detalle, que se piden la primera vez
function caminosMapa(modo, ex) {
  const G = S.mapaGeo, P = S.mapaDet && zoomMapa() >= MAPA_DETALLE_DESDE ? S.mapaDet : G.mundo;
  S.mapaCapa = P === G.mundo ? 'mundo' : 'detalle';
  // el elegido, el último: así su borde dorado se ve entero por encima de los vecinos
  const orden = Object.keys(P).filter((c) => c !== '_').sort((a, b) => (a === S.mapaSel) - (b === S.mapaSel));
  return (P._ ? `<path d="${P._}" class="mp-0"/>` : '') + orden.map((c) => `<path d="${P[c]}" data-c="${c}" class="${tonoMapa(valorMapa(c, modo, ex), modo)}${c === S.mapaSel ? ' sel' : ''}"/>`).join('');
}
async function cargarDetalleMapa() {
  if (S.mapaDet || S.mapaDetPidiendo) return;
  S.mapaDetPidiendo = true;
  try { const r = await fetch('mapa-detalle.json?v=1'); if (r.ok) S.mapaDet = await r.json(); } catch (e) { /* se queda con el del mundo */ }
  S.mapaDetPidiendo = false;
  if (S.mapaDet && zoomMapa() >= MAPA_DETALLE_DESDE) ponerVB(S.mapaVB, false);
}
/* Europa de lejos: tantos países juntos no caben. Una pastilla con la media de sus bolsas (cada una por lo que pesa en
   el mundo) o, en «Tu dinero», lo que tienes allí; al tocarla, el mapa se acerca */
function valorEuropaMapa(modo, ex) {
  const cods = Object.keys(ZONA_PAISES.Europa);
  if (modo === 'tuyo') { const s = sum(cods, (c) => (ex.get(c) || {}).pct || 0); return s > 0 ? s : null; }
  let n = 0, d = 0;
  for (const c of cods) { const v = valorMapa(c, modo, ex), w = PESO_MUNDO[c] || 0; if (v != null && isFinite(v) && w) { n += v * w; d += w; } }
  return d ? n / d : null;
}
/* los nombres: pastillas con la letra de la app encima del mapa. Primero los que más pesan en el mundo (en «Tu dinero»,
   donde más tienes). Un país grande lleva la pastilla encima; uno pequeño pero importante (Japón, Taiwán, Corea, Hong
   Kong…), al lado, con un punto donde está. Las que no caben sin pisarse se quedan sin poner */
function etiquetasMapa(vb, esc1, modo, ex) {
  const G = S.mapaGeo, items = [], exTodo = S.mapaExTodo || ex;
  // en un mapa estrecho (el móvil), la bandera en vez del nombre: caben el doble y se reconocen igual; en uno ancho, las dos
  const compacto = anchoMapa() < 600;
  const sitio = (p) => { const l = ((p[0] - vb[0]) / vb[2]) * 100, t = ((p[1] - vb[1]) / vb[3]) * 100; return l >= 1 && l <= 99 && t >= 2 && t <= 98 ? [l, t] : null; };
  // con banderas (el móvil) caben antes que con nombres
  const foco = FOCO_MAPA[S.mapaVista] || null;
  const eu = G.zonas.eu, euLejos = !foco && eu[2] * esc1 < (compacto ? 200 : 380);
  const enEuropa = (p) => p[0] >= eu[0] && p[0] <= eu[0] + eu[2] && p[1] >= eu[1] && p[1] <= eu[1] + eu[3];
  if (euLejos) {
    const s = sitio([eu[0] + eu[2] * 0.5, eu[1] + eu[3] * 0.5]), v = valorEuropaMapa(modo, ex);
    if (s && v != null) items.push({ s, peso: modo === 'tuyo' ? v : sum(Object.keys(ZONA_PAISES.Europa), (c) => PESO_MUNDO[c] || 0), html: `<button __A__ type="button" class="me grupo" data-mapa-vista="eu" aria-label="${L('Acercar a Europa', 'Zoom to Europe')}">${compacto ? `${bandera('eu')}<span class="sr">${L('Europa', 'Europe')}</span>` : `${bandera('eu')}<span>${L('Europa', 'Europe')}</span>`}<b class="${modo === 'tuyo' ? 'oro' : cls(v)}">${valorCortoMapa(v, modo)}</b><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6"/><path d="M10.4 10.4L14 14M7 5v4M5 7h4"/></svg></button>` });
  }
  for (const x of paisesMapa(modo, ex)) {
    const p = G.c[x.c];
    if (!p || (euLejos && enEuropa(p)) || (foco && !foco(x.c, p))) continue;
    const a = (G.a[x.c] || 0) * esc1 * esc1, peso = modo === 'tuyo' ? x.v : PESO_MUNDO[x.c] || 0;
    const grande = a >= 260, importante = foco ? (modo === 'tuyo' ? x.v >= 0.1 : true) : modo === 'tuyo' ? x.v >= 1 : peso >= 0.3;
    if (!grande && !importante) continue;
    const s = sitio(p);
    if (!s) continue;
    const tuyo = modo !== 'tuyo' && exTodo.get(x.c) && exTodo.get(x.c).pct >= 0.5;
    const cifra = `<b class="${modo === 'tuyo' ? 'oro' : cls(x.v)}">${valorCortoMapa(x.v, modo)}</b>`;
    items.push({ s, peso, chico: !grande, html: compacto
      ? `<span __A__ class="me compacto${tuyo ? ' tuyo' : ''}" data-mapa-c="${x.c}" title="${esc(nombrePaisMapa(x.c))}">${bandera(x.c)}<span class="sr">${esc(nombrePaisMapa(x.c))}</span>${cifra}</span>`
      : `<span __A__ class="me${tuyo ? ' tuyo' : ''}" data-mapa-c="${x.c}">${bandera(x.c)}<span>${esc(cortoPaisMapa(x.c))}</span>${cifra}</span>` });
  }
  return items.sort((a, b) => b.peso - a.peso).map((x) => x.html.replace('__A__', `data-l="${x.s[0].toFixed(2)}" data-t="${x.s[1].toFixed(2)}"${x.chico ? ' data-chico="1"' : ''}`)).join('');
}
// hacia dónde va mejor la pastilla de cada país si no cabe encima (c encima, d derecha, i izquierda, a arriba, b abajo)
const MAPA_LADO = { JP: 'dab!', KR: 'bd!', TW: 'db!', HK: 'b', SG: 'b', PH: 'd', MY: 'b', TH: 'i', VN: 'd', ID: 'cb', NZ: 'd', MX: 'i', CL: 'i', AR: 'cd', EU: 'ca',
  GB: 'i', IE: 'i', PT: 'i', ES: 'ib', FR: 'ic', DE: 'cd', IT: 'bd', CH: 'b', AT: 'bd', NL: 'a', CN: 'cib', IN: 'cb', BE: 'i', DK: 'a', NO: 'ci', SE: 'c', FI: 'cd', PL: 'cd', GR: 'b', TR: 'cb', IL: 'i', AE: 'b', QA: 'b', KW: 'a', SA: 'c', EG: 'cb', ZA: 'c' };
// ya en la página: cada pastilla en el primer hueco libre (encima del país o, si es pequeño, a un lado), en orden de
// importancia; las que se pisarían con una de antes o se saldrían del mapa no salen
function colocarEtiquetasMapa() {
  const capa = $('#mapaEtq');
  if (!capa) return;
  for (const p of capa.querySelectorAll('.me-punto')) p.remove();
  const W = capa.clientWidth, H = capa.clientHeight, puestas = [];
  // los botones de + y − y la pista de los gestos también ocupan sitio
  const c0 = capa.getBoundingClientRect();
  for (const o of capa.parentElement.querySelectorAll('.mapa-zoom, .mapa-pista')) { const r = o.getBoundingClientRect(); if (r.width) puestas.push([r.left - c0.left - 4, r.top - c0.top - 4, r.right - c0.left + 4, r.bottom - c0.top + 4]); }
  const cruza = (r, q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1];
  const choca = (r) => r[0] < 2 || r[1] < 2 || r[2] > W - 2 || r[3] > H - 2 || puestas.some((q) => cruza(r, q));
  for (const el of [...capa.querySelectorAll('.me')]) {
    const w = el.offsetWidth, h = el.offsetHeight, ax = (+el.dataset.l / 100) * W, ay = (+el.dataset.t / 100) * H, chico = el.dataset.chico === '1';
    // uno grande, encima; si no cabe, a un lado con un punto donde está (igual que los pequeños, que nunca lo tapan).
    // Primero hacia donde hay mar o sitio (MAPA_LADO): Japón a la derecha, Reino Unido a la izquierda…
    const lado = { c: [0, 0], d: [w / 2 + 8, 0], i: [-(w / 2 + 8), 0], a: [0, -(h / 2 + 8)], b: [0, h / 2 + 8] };
    const pref = MAPA_LADO[el.dataset.mapaC || (el.classList.contains('grupo') ? 'EU' : '')] || '';
    // con «!», solo esos lados (Japón nunca encima de China)
    const orden = [...new Set([...pref.replace('!', ''), ...(pref.endsWith('!') ? '' : chico ? 'diab' : 'cabdi')])].filter((k) => !(chico && k === 'c'));
    // encima, también un poco más arriba o más abajo (sin dejar de tocar su sitio)
    const huecos = orden.flatMap((k) => (k === 'c' ? [lado.c, [0, -h * 0.4], [0, h * 0.4]] : [lado[k]]));
    let ok = null;
    for (const [dx, dy] of huecos) {
      const x = ax + dx - w / 2, y = ay + dy - h / 2, r = [x - 2, y - 1, x + w + 2, y + h + 1];
      const lejos = Math.abs(dx) > w / 2 || Math.abs(dy) > h / 2;
      if (choca(r) || ((chico || lejos) && choca([ax - 4, ay - 4, ax + 4, ay + 4]))) continue;
      ok = { cx: ax + dx, cy: ay + dy, r };
      break;
    }
    if (!ok) { el.hidden = true; continue; }
    el.hidden = false;
    el.style.left = `${ok.cx.toFixed(1)}px`; el.style.top = `${ok.cy.toFixed(1)}px`;
    puestas.push(ok.r);
    if (chico || Math.abs(ok.cx - ax) > w / 2 || Math.abs(ok.cy - ay) > h / 2) {
      const p = document.createElement('i');
      p.className = 'me-punto';
      p.style.left = `${ax.toFixed(1)}px`; p.style.top = `${ay.toFixed(1)}px`;
      capa.appendChild(p);
      puestas.push([ax - 4, ay - 4, ax + 4, ay + 4]);
    }
  }
  capa.style.transform = '';
  capa.classList.add('listas');
}
function svgMapa(M) {
  const G = S.mapaGeo, modo = S.mapaModo;
  // en «Tu dinero» se puede ver una sola posición: dónde invierte ese fondo o esa acción
  if (S.mapaPos && !(M && M.filas.some((f) => f.pos.id === S.mapaPos && f.valor > 0 && paisesDeFila(f)))) S.mapaPos = null;
  const exTodo = exposicionPaises(M), ex = modo === 'tuyo' && S.mapaPos ? exposicionPaises(M, S.mapaPos) : exTodo;
  S.mapaEx = ex; S.mapaExTodo = exTodo;
  const vb = S.mapaVB;
  const top = paisesMapa(modo, ex).sort((a, b) => b.v - a.v).slice(0, 3).map((x) => `${nombrePaisMapa(x.c)} ${textoValorMapa(x.v, modo)}`);
  const pm = modo === 'tuyo' ? posMapa() : null;
  const resumen = top.length ? (modo === 'tuyo' ? (pm ? L(`Mapa de dónde invierte ${pm.inst.corto || pm.inst.nombre}. Donde más: `, `Map of where ${pm.inst.corto || pm.inst.nombre} invests. Most: `) : L('Mapa de dónde está tu dinero. Donde más: ', 'Map of where your money is. Most: ')) : L(`Mapa de cómo van las bolsas ${etqModoMapa(modo)}. Lo que más sube: `, `Map of how stock markets are doing ${etqModoMapa(modo)}. Best: `)) + top.join('; ') : L('Mapa del mundo', 'World map');
  // Hong Kong y Singapur no se ven a ninguna escala: de cerca, un aro alrededor para poder tocarlos
  const aros = ['HK', 'SG'].filter((c) => G.c[c]).map((c) => `<circle cx="${G.c[c][0]}" cy="${G.c[c][1]}" r="1" data-c="${c}" class="aro ${tonoMapa(valorMapa(c, modo, ex), modo)}${c === S.mapaSel ? ' sel' : ''}"/>`).join('');
  return `<svg viewBox="${vb.map((x) => +x.toFixed(2)).join(' ')}" role="img" aria-label="${esc(resumen)}"><g class="mp-paises">${caminosMapa(modo, ex)}</g><g class="mp-aros">${aros}</g></svg>`;
}
function htmlLeyendaMapa(modo) {
  const c = MAPA_CORTES[modo], f = (x) => fmtNumR(x, 2);
  if (modo === 'tuyo') {
    const pos = S.mapaPos && S.M && S.M.filas.find((x) => x.pos.id === S.mapaPos);
    const t = [['mp-a1', L(`menos del ${f(c[1])} %`, `under ${f(c[1])}%`)], ['mp-a2', `${f(c[1])}–${f(c[2])} %`], ['mp-a3', `${f(c[2])}–${f(c[3])} %`], ['mp-a4', L(`${f(c[3])} % o más`, `${f(c[3])}% or more`)]];
    return `<span class="ml-t">${pos ? L(`Parte de ${esc(pos.inst.corto || pos.inst.nombre)}`, `Share of ${esc(pos.inst.corto || pos.inst.nombre)}`) : L('Parte de tu cartera', 'Share of your portfolio')}</span><div class="ml-pasos">${t.map(([k, x]) => `<span><i class="${k}"></i>${x}</span>`).join('')}</div>`;
  }
  const pasos = [4, 3, 2, 1].map((k) => [`mp-d${k}`, k < 4 ? `${pctS(-c[k], 1)} ${L('a', 'to')} ${pctS(-c[k - 1], 1)}` : L(`${pctS(-c[3], 1)} o peor`, `${pctS(-c[3], 1)} or worse`)]).concat([['mp-n', L(`entre ${pctS(-c[0], 2)} y ${pctS(c[0], 2)}`, `between ${pctS(-c[0], 2)} and ${pctS(c[0], 2)}`)]], [1, 2, 3, 4].map((k) => [`mp-u${k}`, k < 4 ? `${pctS(c[k - 1], 1)} ${L('a', 'to')} ${pctS(c[k], 1)}` : L(`${pctS(c[3], 1)} o mejor`, `${pctS(c[3], 1)} or better`)]));
  return `<span class="ml-t">${esc(L({ hoy: 'Su bolsa hoy', mes: 'Su bolsa en un mes', anio: 'Su bolsa este año' }[modo], { hoy: 'Its market today', mes: 'Its market, 1 month', anio: 'Its market this year' }[modo]))}</span>
    <div class="ml-barra"><div class="ml-escala">${pasos.map(([k, t]) => `<i class="${k}" title="${esc(t)}"></i>`).join('')}</div><div class="ml-et"><span>${pctS(-c[3], 1)}</span><span>0</span><span>${pctS(c[3], 1)}</span></div></div>
    <div class="ml-pasos"><span><i class="mp-0"></i>${L('Sin datos', 'No data')}</span><span class="ml-tu"><i></i>${L('Tienes dinero', 'You hold some')}</span></div>`;
}
function selectorPaisMapa(sel, ex) {
  const cods = new Set([...Object.keys(BOLSA_PAIS), ...Object.values((S.precios && S.precios.mapa) || {}).map((x) => x.p), ...ex.keys()]);
  if (sel) cods.add(sel);
  const ops = [...cods].map((c) => [c, nombrePaisMapa(c)]).sort((a, b) => a[1].localeCompare(b[1], IDIOMA === 'en' ? 'en' : 'es'));
  return `<label class="mi-elige"><span>${L('Ir a un país', 'Go to a country')}</span><select id="mapaPais"><option value="">${L('Elige uno', 'Pick one')}</option>${ops.map(([c, n]) => `<option value="${c}"${c === sel ? ' selected' : ''}>${bandera(c)}${esc(n)}</option>`).join('')}</select></label>`;
}
// en «Tu dinero»: toda la cartera o una sola posición de bolsa
function selectorPosMapa(M) {
  const filas = ((M && M.filas) || []).filter((f) => f.valor > 0 && paisesDeFila(f)).sort((a, b) => b.valor - a.valor);
  if (filas.length < 2) return '';
  return `<label class="mi-elige mi-pos"><span>${L('Ver', 'Show')}</span><select id="mapaPos"><option value="">${L('Toda tu cartera', 'Your whole portfolio')}</option>${filas.map((f) => `<option value="${esc(f.pos.id)}"${f.pos.id === S.mapaPos ? ' selected' : ''}>${esc(f.inst.corto || f.inst.nombre)}${f.pos.plataforma && filas.filter((g) => g.inst.id === f.inst.id).length > 1 ? ` (${esc(f.pos.plataforma)})` : ''}</option>`).join('')}</select></label>`;
}
function htmlInfoMapa(c, M) {
  if (!S.mapaGeo) return `<p class="k">${S.mapaFallo ? L('No se ha podido cargar el mapa. Vuelve a abrir Mercados con conexión.', "Couldn't load the map. Open Markets again when you're online.") : L('Cargando el mapa…', 'Loading the map…')}</p>`;
  const modo = S.mapaModo, ex = S.mapaEx || exposicionPaises(M);
  const fila = (x, sub) => `<button type="button" class="mi-p" data-mapa-pais="${x.c}"><span class="mi-ban">${bandera(x.c)}</span><span class="mi-pn"><b>${esc(nombrePaisMapa(x.c))}</b>${sub ? `<small>${sub}</small>` : ''}</span><span class="mi-v ${modo === 'tuyo' ? 'oro' : cls(x.v)}">${valorCortoMapa(x.v, modo)}</span></button>`;
  if (!c) {
    const lista = paisesMapa(modo, ex).sort((a, b) => b.v - a.v);
    if (modo === 'tuyo') {
      if (!lista.length) return `${selectorPosMapa(M)}<p class="k">${L('Cuando tengas acciones o fondos de bolsa, aquí verás en qué países está tu dinero.', "Once you hold stocks or equity funds, you'll see here which countries your money is in.")}</p>`;
      const pos = S.mapaPos && M.filas.find((f) => f.pos.id === S.mapaPos), us = ex.get('US');
      const fuera = Math.max(0, 100 - sum(lista, (x) => x.v));
      const titulo = pos ? L(`Dónde invierte ${esc(pos.inst.corto || pos.inst.nombre)}`, `Where ${esc(pos.inst.corto || pos.inst.nombre)} invests`) : L('Dónde está tu dinero', 'Where your money is');
      const nota = pos
        ? (pos.inst.tipo === 'Acción' ? L('Una acción va entera al país de su sede, aunque venda en todo el mundo.', 'A stock counts fully in its home country, even if it sells worldwide.') : L('Repartido como su índice, más o menos.', 'Split like its index, roughly.'))
        : L(`En un fondo de todo el mundo, EEUU sería el ${fmtNumR(PESO_MUNDO.US, 0)} %${us ? `; en el tuyo es el ${fmtNumR(us.pct, 0)} %` : ''}. Los fondos, repartidos como su índice. El ${fmtNumR(fuera, 0)} % que falta no es bolsa (oro, cripto, renta fija, efectivo) o no se sabe de qué país es.`, `In a whole-world fund the US would be ${fmtNumR(PESO_MUNDO.US, 0)}%${us ? `; in yours it's ${fmtNumR(us.pct, 0)}%` : ''}. Funds are split like their index. The missing ${fmtNumR(fuera, 0)}% isn't stocks (gold, crypto, bonds, cash) or has no known country.`);
      return `${selectorPosMapa(M)}<div class="mi-sec"><h3 class="mi-t">${titulo}</h3><div class="mi-lista">${lista.slice(0, 7).map((x) => fila(x, PESO_MUNDO[x.c] ? L(`en el mundo, ${valorCortoMapa(PESO_MUNDO[x.c], 'tuyo')}`, `world: ${valorCortoMapa(PESO_MUNDO[x.c], 'tuyo')}`) : '')).join('')}</div></div>
        <p class="mi-nota">${nota}</p>${selectorPaisMapa(null, ex)}`;
    }
    if (!lista.length) return `<p class="k">${L('Aún no hay datos de las bolsas.', 'No stock market data yet.')}</p>`;
    const indice = (x) => { const b = bolsasDe(x.c)[0]; return b ? esc(b.n) : ''; };
    const suben = lista.filter((x) => x.v > 0).slice(0, 3), bajan = lista.filter((x) => x.v < 0).reverse().slice(0, 3);
    return `${suben.length ? `<div class="mi-sec"><h3 class="mi-t">${L('Lo que más sube', 'Up the most')} <span>${esc(etqModoMapa(modo))}</span></h3><div class="mi-lista">${suben.map((x) => fila(x, indice(x))).join('')}</div></div>` : ''}
      ${bajan.length ? `<div class="mi-sec"><h3 class="mi-t">${L('Lo que más baja', 'Down the most')} <span>${esc(etqModoMapa(modo))}</span></h3><div class="mi-lista">${bajan.map((x) => fila(x, indice(x))).join('')}</div></div>` : ''}
      ${selectorPaisMapa(null, ex)}`;
  }
  const bs = bolsasDe(c), exTodo = S.mapaExTodo || ex, e = exTodo.get(c), hoy = hoyIso(), pm = PESO_MUNDO[c];
  const info = bs[0] && MERC_INFO[bs[0].sym];
  const celda = (v) => `<td><span class="mi-v ${cls(v)}">${pctS(v, 1)}</span></td>`;
  const tabla = bs.length ? `<table class="mi-bolsas"><thead><tr><th scope="col"><span class="sr">${L('Índice', 'Index')}</span></th><th scope="col">${L('Hoy', 'Today')}</th><th scope="col">${L('1 mes', '1 mo')}</th><th scope="col">${L('Año', 'YTD')}</th></tr></thead><tbody>${bs.map((b) => `<tr><th scope="row">${esc(b.n)}${b.f && b.f < hoy ? `<small>${L(`cierre del ${fechaCorta(b.f)}`, `close of ${fechaCortaL(b.f)}`)}</small>` : ''}${b.my ? `<small>${L(`el mes y el año, del ETF ${esc(b.my)} (en dólares)`, `month and YTD from the ${esc(b.my)} ETF (in dollars)`)}</small>` : ''}</th>${celda(b.v)}${celda(b.m)}${celda(b.y)}</tr>`).join('')}</tbody></table>` : `<p class="k">${L('No seguimos su bolsa.', "We don't track its stock market.")}</p>`;
  // «por Repsol, IAG y MSCI Europe», o «por Repsol, IAG, MSCI Europe y 2 más»
  const de = e ? e.de.slice(0, 3).map((x) => `<b>${esc(x.n)}</b>`) : [], mas = e ? e.de.length - 3 : 0;
  const porQue = mas > 0 ? `${de.join(', ')} ${L(`y ${mas} más`, `and ${mas} more`)}` : yLista(de);
  const peso = pm ? L(`En un fondo de todo el mundo pesa un <b>${fmtNumR(pm, pm < 1 ? 2 : 1)} %</b>.`, `In a whole-world fund it weighs <b>${fmtNumR(pm, pm < 1 ? 2 : 1)}%</b>.`) : '';
  /* lo tuyo, lo primero: cuánto tienes aquí, qué parte de tu cartera es y, al lado, lo que pesaría en un fondo de todo el
     mundo (dos barras a la misma escala); debajo, por qué posiciones */
  const fp = (x) => `${fmtNumR(x, x < 1 ? 2 : 1)} %`;
  const tope = Math.max(e ? e.pct : 0, pm || 0) || 1;
  const barra = (x, cls2, txt) => `<div class="mt-fila"><span>${txt}</span><i class="mt-b"><i class="${cls2}" style="width:${Math.max(2, (x / tope) * 100).toFixed(1)}%"></i></i><b>${fp(x)}</b></div>`;
  const bloqueTuyo = e
    ? `<div class="mi-tuyo"><div class="mt-cab"><small>${L('Tienes aquí', 'You hold here')}</small><b>${eur(e.v, 0)}</b></div>
        <div class="mt-barras">${barra(e.pct, 'oro', L('Tu cartera', 'Your portfolio'))}${pm ? barra(pm, 'gris', L('Fondo mundial', 'World fund')) : ''}</div>
        <p>${L(`Por ${porQue}.`, `Through ${porQue}.`)}${e.de.some((x) => x.fondo) ? ` <span>${L('Lo de los fondos, más o menos: se reparten como su índice.', 'Funds are approximate: split like their index.')}</span>` : ''}</p></div>`
    : `<div class="mi-tuyo vacio"><p>${L('No tienes nada aquí.', 'You have nothing here.')}${pm ? ` ${peso}` : ''}</p></div>`;
  return `<div class="mi-cab"><span class="mi-ban">${bandera(c)}</span><h3>${esc(nombrePaisMapa(c))}</h3><button type="button" class="ib mi-x" data-mapa-pais="" aria-label="${L('Volver al resumen', 'Back to the summary')}">${ICONOS.cerrar}</button></div>
    ${bloqueTuyo}${tabla}${info && info.que ? `<p class="mi-que">${esc(info.que)}</p>` : ''}${selectorPaisMapa(c, ex)}`;
}
// en el móvil, el país elegido en una línea justo debajo del mapa (su ficha queda más abajo): así no se mueve la página
function htmlElegidoMapa() {
  const c = S.mapaSel;
  if (!c || !S.mapaGeo) return '';
  const v = valorMapa(c, S.mapaModo, S.mapaEx || new Map());
  const e = (S.mapaExTodo || new Map()).get(c);
  const mio = e ? L(`Tienes ${eur(e.v, 0)}, el ${fmtNumR(e.pct, e.pct < 1 ? 2 : 1)} % de tu cartera`, `You hold ${eur(e.v, 0)}, ${fmtNumR(e.pct, e.pct < 1 ? 2 : 1)}% of your portfolio`) : L('No tienes nada aquí', 'You have nothing here');
  return `<span class="mi-ban">${bandera(c)}</span><span class="me-txt"><b>${esc(nombrePaisMapa(c))}</b><small class="${e ? 'oro' : ''}">${mio}</small></span><span class="mi-v ${S.mapaModo === 'tuyo' || v == null ? 'oro' : cls(v)}">${v == null ? '—' : valorCortoMapa(v, S.mapaModo)}</span><span class="me-ver">${L('Más', 'More')}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg></span>`;
}
function repintarMapa() {
  const w = $('#mapaMundo');
  if (!w) return;
  const M = S.M;
  if (S.mapaGeo) {
    S.mapaVB = limitarVB(S.mapaVB || vbMundoMapa());
    w.innerHTML = svgMapa(M);
    ponerVB(S.mapaVB, false);
    pintarEtiquetasMapa();
  }
  const ley = $('#mapaLey'); if (ley) ley.innerHTML = htmlLeyendaMapa(S.mapaModo);
  const inf = $('#mapaInfo'); if (inf) inf.innerHTML = htmlInfoMapa(S.mapaSel, M);
  const el = $('#mapaElegido'); if (el) { el.innerHTML = htmlElegidoMapa(); el.hidden = !S.mapaSel; }
  const sec = $('.mapa-w'); if (sec) sec.dataset.modo = S.mapaModo;
  for (const b of $$('[data-mapa-modo]')) b.setAttribute('aria-pressed', String(b.dataset.mapaModo === S.mapaModo));
}
async function cargarMapa() {
  if (S.mapaGeo || S.mapaCargando) return;
  S.mapaCargando = true;
  try {
    const r = await fetch('mapa-mundo.json?v=1');
    if (r.ok) { S.mapaGeo = await r.json(); S.mapaGeo.zonas = { ...(S.mapaGeo.zonas || {}), ...MAPA_ZONAS_MAS }; }
  } catch (e) { /* sin conexión: se dice en el hueco del mapa */ }
  S.mapaCargando = false;
  S.mapaFallo = !S.mapaGeo;
  repintarMapa();
}
/* poner el recuadro: el dibujo se mueve al momento; los nombres, al terminar (mientras arrastras, se desplazan con el
   mapa; mientras acercas, se apagan) */
function ponerVB(vb, final) {
  S.mapaVB = vb;
  const svg = $('#mapaMundo svg');
  if (!svg) return;
  svg.setAttribute('viewBox', vb.map((x) => +x.toFixed(2)).join(' '));
  const z = zoomMapa(vb), caja = svg.closest('.mapa-caja');
  if (caja) caja.classList.toggle('cerca', z > 1.02);
  if (z >= MAPA_DETALLE_DESDE && !S.mapaDet) cargarDetalleMapa();
  const quiere = S.mapaDet && z >= MAPA_DETALLE_DESDE ? 'detalle' : 'mundo';
  if (quiere !== S.mapaCapa) { const g = svg.querySelector('.mp-paises'); if (g) g.innerHTML = caminosMapa(S.mapaModo, S.mapaEx || new Map()); }
  S.mapaVista = vistaDeVB(vb);
  for (const b of $$('.mapa-vistas [data-mapa-vista]')) b.setAttribute('aria-pressed', String(b.dataset.mapaVista === S.mapaVista));
  const zm = $$('[data-mapa-zoom]');
  for (const b of zm) b.disabled = b.dataset.mapaZoom === '1' ? z >= MAPA_ZOOM_MAX * 0.98 : z <= 1.01;
  const capa = $('#mapaEtq'), e = S.mapaVBEtq;
  if (capa && e && !final) {
    if (Math.abs(e[2] - vb[2]) < 0.01) { const k = capa.clientWidth / vb[2]; capa.style.transform = `translate(${((e[0] - vb[0]) * k).toFixed(1)}px, ${((e[1] - vb[1]) * k).toFixed(1)}px)`; }
    else capa.classList.remove('listas');
  }
  if (final) { clearTimeout(S.mapaEtqT); S.mapaEtqT = setTimeout(pintarEtiquetasMapa, 60); }
}
function pintarEtiquetasMapa() {
  const capa = $('#mapaEtq'), svg = $('#mapaMundo svg');
  if (!capa || !svg || !S.mapaGeo) return;
  const vb = S.mapaVB, esc1 = anchoMapa() / vb[2];
  capa.classList.remove('listas');
  capa.innerHTML = etiquetasMapa(vb, esc1, S.mapaModo, S.mapaEx || new Map());
  S.mapaVBEtq = vb.slice();
  colocarEtiquetasMapa();
  // los aros de Hong Kong y Singapur, siempre del mismo tamaño en pantalla y solo de cerca
  for (const a of svg.querySelectorAll('.aro')) { a.setAttribute('r', (7 / esc1).toFixed(2)); a.style.display = zoomMapa(vb) >= 2 ? '' : 'none'; }
}
// el viaje de un recuadro a otro: el ancho cambia en escala logarítmica, así acercarse y alejarse van igual de suaves
function animarVB(hasta, dur = 460) {
  if (!S.mapaGeo) return;
  hasta = limitarVB(hasta);
  const desde = S.mapaVB || vbMundoMapa();
  cancelAnimationFrame(S.mapaAnim);
  if (!$('#mapaMundo svg') || matchMedia('(prefers-reduced-motion: reduce)').matches) { ponerVB(hasta, true); return; }
  const t0 = performance.now(), c0 = [desde[0] + desde[2] / 2, desde[1] + desde[3] / 2], c1 = [hasta[0] + hasta[2] / 2, hasta[1] + hasta[3] / 2];
  const paso = (t) => {
    const k = Math.min(1, (t - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    if (k >= 1) { S.mapaAnim = 0; ponerVB(hasta, true); return; }
    const w = desde[2] * Math.pow(hasta[2] / desde[2], e), h = (w * desde[3]) / desde[2];
    ponerVB(limitarVB([c0[0] + (c1[0] - c0[0]) * e - w / 2, c0[1] + (c1[1] - c0[1]) * e - h / 2, w, h]), false);
    S.mapaAnim = requestAnimationFrame(paso);
  };
  S.mapaAnim = requestAnimationFrame(paso);
}
function irVistaMapa(v) { if (S.mapaGeo) animarVB(cajaVistaMapa(v)); }
// acercar o alejar por un factor, sin mover el punto (x, y) de la pantalla (por defecto, el centro del mapa)
function zoomEnMapa(f, x, y) {
  const el = $('#mapaMundo');
  if (!el || !S.mapaVB) return;
  const r = el.getBoundingClientRect(), vb = S.mapaVB;
  const fx = x == null ? 0.5 : (x - r.left) / r.width, fy = y == null ? 0.5 : (y - r.top) / r.height;
  const px = vb[0] + fx * vb[2], py = vb[1] + fy * vb[3];
  let w = vb[2] / f, h = vb[3] / f;
  if (w > S.mapaGeo.w / 1.3) { w = S.mapaGeo.w; h = S.mapaGeo.h; }
  animarVB([px - fx * w, py - fy * h, w, h]);
}
// un país pequeño: el mapa se acerca hasta que se ve de unos 45 × 45 px, centrado en él
function acercarAPais(cod) {
  const G = S.mapaGeo, p = G && G.c[cod];
  if (!p) return;
  const base = anchoMapa() / G.w, a = Math.max(G.a[cod] || 0, 0.3);
  const z = Math.min(MAPA_ZOOM_MAX, Math.max(zoomMapa() * 1.4, Math.sqrt(2000 / a) / base)), w = G.w / z, h = (w * G.h) / G.w;
  animarVB([p[0] - w / 2, p[1] - h / 2, w, h]);
}
// llevar a un país elegido desde la lista o el desplegable: si es pequeño, se acerca; si no se ve, el mapa va hasta él
function verPaisMapa(cod) {
  const G = S.mapaGeo, p = G && G.c[cod], vb = S.mapaVB;
  if (!p || !vb) return;
  const esc1 = anchoMapa() / vb[2];
  if ((G.a[cod] || 0) * esc1 * esc1 < 450) { acercarAPais(cod); return; }
  const dentro = p[0] > vb[0] + vb[2] * 0.08 && p[0] < vb[0] + vb[2] * 0.92 && p[1] > vb[1] + vb[3] * 0.08 && p[1] < vb[1] + vb[3] * 0.92;
  if (!dentro) animarVB([p[0] - vb[2] / 2, p[1] - vb[3] / 2, vb[2], vb[3]]);
}
function elegirPaisMapa(c) {
  S.mapaSel = c || null;
  repintarMapa();
  // el panel se rehace con cada precio: lo que se lee en voz alta es solo el país elegido, una vez
  const an = $('#mapaAnuncio');
  if (an) an.textContent = c ? `${nombrePaisMapa(c)}: ${textoValorMapa(valorMapa(c, S.mapaModo, S.mapaEx || new Map()), S.mapaModo)}` : '';
}
/* los gestos: con un dedo (o el ratón) se arrastra cuando estás cerca; con dos, se acerca o se aleja alrededor de los
   dedos; dos toques seguidos (o doble clic), acerca ahí. Todo sobre el recuadro, sin esperar a ninguna animación */
const GM = { p: new Map(), movido: false, ultimo: null };
function baseGestoMapa() {
  const el = $('#mapaMundo');
  if (!el) return;
  GM.r = el.getBoundingClientRect(); GM.vb0 = (S.mapaVB || vbMundoMapa()).slice();
  const pts = [...GM.p.values()];
  if (pts.length >= 2) { GM.d0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1; GM.m0 = [(pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2]; }
  else if (pts.length === 1) GM.m0 = [pts[0].x, pts[0].y];
}
function pedirVBMapa(vb) {
  GM.vb = vb;
  if (GM.raf) return;
  GM.raf = requestAnimationFrame(() => { GM.raf = 0; ponerVB(GM.vb, false); });
}
document.addEventListener('pointerdown', (e) => {
  const caja = e.target.closest && e.target.closest('.mapa-caja');
  if (!caja || e.target.closest('.mapa-zoom') || !S.mapaGeo || !$('#mapaMundo svg')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  cancelAnimationFrame(S.mapaAnim); S.mapaAnim = 0;
  GM.p.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (GM.p.size === 1) { GM.movido = false; GM.ini = [e.clientX, e.clientY]; }
  baseGestoMapa();
  for (const t of $$('.mapa-tip')) t.hidden = true;
});
document.addEventListener('pointermove', (e) => {
  if (!GM.p.has(e.pointerId) || !GM.r) return;
  GM.p.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const pts = [...GM.p.values()], r = GM.r, vb0 = GM.vb0;
  if (pts.length >= 2) {
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, m = [(pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2];
    const w = (vb0[2] * GM.d0) / d, h = (w * vb0[3]) / vb0[2];
    // el punto del mundo que estaba entre los dedos sigue entre los dedos
    const px = vb0[0] + ((GM.m0[0] - r.left) / r.width) * vb0[2], py = vb0[1] + ((GM.m0[1] - r.top) / r.height) * vb0[3];
    GM.movido = true;
    pedirVBMapa(limitarVB([px - ((m[0] - r.left) / r.width) * w, py - ((m[1] - r.top) / r.height) * h, w, h]));
    return;
  }
  if (!GM.movido && Math.hypot(e.clientX - GM.ini[0], e.clientY - GM.ini[1]) < 6) return;
  if (zoomMapa(vb0) <= 1.02) return;   // de lejos no hay nada que arrastrar: el dedo mueve la página
  GM.movido = true;
  const caja = $('.mapa-caja'); if (caja) caja.classList.add('arrastrando');
  pedirVBMapa(limitarVB([vb0[0] - ((e.clientX - GM.m0[0]) / r.width) * vb0[2], vb0[1] - ((e.clientY - GM.m0[1]) / r.height) * vb0[3], vb0[2], vb0[3]]));
});
function soltarMapa(e) {
  if (!GM.p.has(e.pointerId)) return;
  GM.p.delete(e.pointerId);
  if (GM.p.size) { baseGestoMapa(); return; }   // queda un dedo: se sigue arrastrando desde ahí, sin saltos
  const caja = $('.mapa-caja'); if (caja) caja.classList.remove('arrastrando');
  if (GM.movido) {
    S.mapaSinClic = performance.now();
    if (GM.raf) { cancelAnimationFrame(GM.raf); GM.raf = 0; }
    ponerVB(GM.vb || S.mapaVB, true);
    gestoMapaVisto();
    return;
  }
  if (e.type === 'pointercancel' || e.pointerType === 'mouse') return;
  // dos toques seguidos en el mismo sitio: acercar ahí (el segundo toque no elige país)
  const ahora = performance.now(), u = GM.ultimo;
  if (u && ahora - u.t < 330 && Math.hypot(e.clientX - u.x, e.clientY - u.y) < 32) { GM.ultimo = null; S.mapaSinClic = ahora; dobleToqueMapa(e.clientX, e.clientY); return; }
  GM.ultimo = { t: ahora, x: e.clientX, y: e.clientY };
}
document.addEventListener('pointerup', soltarMapa);
document.addEventListener('pointercancel', soltarMapa);
function dobleToqueMapa(x, y) {
  if (zoomMapa() >= MAPA_ZOOM_MAX * 0.9) irVistaMapa('mundo'); else zoomEnMapa(2.4, x, y);
  gestoMapaVisto();
}
// la pista de los gestos se quita la primera vez que acercas
function gestoMapaVisto() { if (!LS.get('inv-mapa-gesto', 0)) LS.set('inv-mapa-gesto', 1); for (const p of $$('.mapa-pista')) p.remove(); }
document.addEventListener('dblclick', (e) => { if (e.target.closest && e.target.closest('#mapaMundo') && S.mapaGeo) { e.preventDefault(); dobleToqueMapa(e.clientX, e.clientY); } });
// en el ordenador: con el gesto de pellizcar del panel táctil (o Ctrl y la rueda); la rueda sola sigue moviendo la página
document.addEventListener('wheel', (e) => {
  if (!e.ctrlKey || !e.target.closest || !e.target.closest('.mapa-caja') || !S.mapaVB) return;
  e.preventDefault();
  const el = $('#mapaMundo'), r = el.getBoundingClientRect(), vb = S.mapaVB, f = Math.exp(-e.deltaY * 0.01);
  const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height, px = vb[0] + fx * vb[2], py = vb[1] + fy * vb[3];
  const w = vb[2] / f, h = vb[3] / f;
  cancelAnimationFrame(S.mapaAnim); S.mapaAnim = 0;
  ponerVB(limitarVB([px - fx * w, py - fy * h, w, h]), true);
  gestoMapaVisto();
}, { passive: false });
document.addEventListener('click', (e) => {
  const m = e.target.closest('[data-mapa-modo]');
  if (m) { S.mapaModo = m.dataset.mapaModo; LS.set('inv-mapa', S.mapaModo); repintarMapa(); return; }
  const zb = e.target.closest('[data-mapa-zoom]');
  if (zb) { zoomEnMapa(zb.dataset.mapaZoom === '1' ? 2 : 0.5); gestoMapaVisto(); return; }
  const enMapa = e.target.closest('.mapa-caja');
  // lo que acaba de ser un arrastre o un doble toque no cuenta como toque
  if (enMapa && (performance.now() - (S.mapaSinClic || 0) < 400 || e.detail > 1)) return;
  const z = e.target.closest('[data-mapa-vista]');
  if (z) { irVistaMapa(z.dataset.mapaVista); return; }
  const el = e.target.closest('#mapaElegido');
  if (el) { const inf = $('#mapaInfo'); if (inf) inf.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); return; }
  const p = e.target.closest('[data-mapa-pais]');
  if (p) { elegirPaisMapa(p.dataset.mapaPais); if (p.dataset.mapaPais && S.mapaGeo) verPaisMapa(p.dataset.mapaPais); return; }
  const c = e.target.closest('#mapaMundo [data-c], #mapaEtq [data-mapa-c]');
  if (c) {
    const cod = c.dataset.c || c.dataset.mapaC, G = S.mapaGeo, esc1 = anchoMapa() / S.mapaVB[2], a = (G.a[cod] || 0) * esc1 * esc1;
    // uno pequeño: se elige y el mapa se acerca a él (con el dedo es fácil haber tocado el de al lado: así se ve claro)
    const fino = !!(window.matchMedia && matchMedia('(pointer: fine)').matches);
    if (cod !== S.mapaSel && a < (fino ? 60 : 450) && zoomMapa() < MAPA_ZOOM_MAX * 0.7) { elegirPaisMapa(cod); acercarAPais(cod); return; }
    elegirPaisMapa(cod === S.mapaSel ? null : cod);
    return;
  }
  if (e.target.closest('#mapaMundo svg') && S.mapaSel) elegirPaisMapa(null);
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'mapaPais') { elegirPaisMapa(e.target.value); if (e.target.value && S.mapaGeo) verPaisMapa(e.target.value); }
  if (e.target.id === 'mapaPos') { S.mapaPos = e.target.value || null; repintarMapa(); }
});
// con ratón (no con el dedo): el nombre del país y su cifra, junto al puntero
document.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const w = e.target.closest ? e.target.closest('.mapa-caja') : null, tip = w && w.querySelector('.mapa-tip');
  for (const t of $$('.mapa-tip:not([hidden])')) if (t !== tip) t.hidden = true;
  if (!tip) return;
  const c = e.target.closest('[data-c], [data-mapa-c]');
  if (!c || GM.p.size || S.mapaAnim) { tip.hidden = true; return; }
  // solo se rehace al cambiar de país: rehacerlo en cada movimiento volvía a cargar la bandera y parpadeaba
  const cod = c.dataset.c || c.dataset.mapaC, k = `${cod}|${S.mapaModo}|${S.mapaPos || ''}|${IDIOMA}`;
  if (tip.dataset.k !== k || tip.hidden) {
    const v = valorMapa(cod, S.mapaModo, S.mapaEx || new Map());
    tip.dataset.k = k;
    tip.innerHTML = `<span class="mt-n"><span class="mi-ban">${bandera(cod)}</span><b>${esc(nombrePaisMapa(cod))}</b></span><span class="${S.mapaModo === 'tuyo' || v == null ? '' : cls(v)}">${esc(textoValorMapa(v, S.mapaModo))}</span>`;
  }
  tip.hidden = false;
  const r = w.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  tip.style.left = `${Math.max(4, Math.min(x + 14, r.width - tip.offsetWidth - 4))}px`;
  tip.style.top = `${y > r.height / 2 ? y - tip.offsetHeight - 12 : y + 16}px`;
});
const quitarTips = () => { for (const t of $$('.mapa-tip')) t.hidden = true; };
document.addEventListener('mouseleave', quitarTips);
addEventListener('scroll', quitarTips, { passive: true });   // la etiqueta del mapa de la cartera se esconde en el núcleo (17)
// los nombres dependen del ancho: al girar el móvil o cambiar la ventana, se vuelven a colocar
let mapaResize = 0;
addEventListener('resize', () => { clearTimeout(mapaResize); mapaResize = setTimeout(() => { if ($('#mapaMundo svg')) pintarEtiquetasMapa(); if ($('.mc-caja')) repintarMc(); }, 220); });

