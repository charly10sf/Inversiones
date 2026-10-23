/* =====================================================================
   Radar de ideas (radar.json, rama datos): unas 400 empresas fijas más las que la Action encuentra cada
   día en toda la bolsa de EEUU y Europa con recomendación de compra. La Action renueva la ficha de cada
   una cada 3 horas y los precios cada 20 minutos; aquí, además, las que se ven en pantalla y las
   mejores ideas llegan en directo por el mismo canal que tu cartera.
   ===================================================================== */
async function cargarRadar() {
  const id = S.precios && S.precios.radar_id;
  if (!id) { if (S.precios && S.precios.radar && !S.radar) { S.radar = S.precios.radar; S.radarVer = (S.radarVer || 0) + 1; } return; }
  if (S.radar && S.radarId === id) return;
  let txt = null;
  try {
    if (CFG.dev) { const r = await fetch('dev/radar.json', { cache: 'no-store' }); if (r.ok) txt = await r.text(); }
    else {
      const r = await fetch(GH.raw('radar.json', 'datos') + '?v=' + encodeURIComponent(id), { cache: 'no-cache' }).catch(() => null);
      if (r && r.ok) txt = await r.text();
      else { const f = await GH.leer('radar.json', 'datos'); if (f) txt = f.texto; }
    }
  } catch (e) { console.warn(e); }
  if (txt) { try { localStorage.setItem('inv-cache-radar', txt); } catch (e) {} }
  else { try { txt = localStorage.getItem('inv-cache-radar'); } catch (e) {} }
  try { const j = txt ? JSON.parse(txt) : null; if (j) S.radar = j; } catch (e) {}
  S.radarId = id; S.radarVer = (S.radarVer || 0) + 1;
}

/* el radar con los precios en directo encima (y el potencial recalculado con ellos) */
function radarVals() {
  const r = S.radar && S.radar.valores && S.radar.valores.filter((x) => !x.pd);
  if (!r) return [];
  const c = S.radarCache;
  if (c && c.ver === S.radarVer && c.live === S.liveRVer) return c.v;
  const v = r.map((x) => {
    const l = S.liveR[x.s];
    if (!l || !(l.p > 0)) return x;
    const k = x.p ? l.p / x.p : 1;
    return { ...x, p: l.p, pe: x.pe != null ? x.pe * k : null, v: l.v != null ? l.v : x.v, pot: x.obj ? (x.obj / l.p - 1) * 100 : x.pot, vivo: true };
  });
  S.radarCache = { ver: S.radarVer, live: S.liveRVer, v };
  return v;
}
/* las que se siguen en directo: las de la tabla que estás viendo y las mejores para ti */
function simsRadarVivos() {
  const s = new Set(S.radarVisibles || []);
  for (const x of S.ideasTop || []) s.add(x);
  for (const i of (S.escaneo && S.escaneo.decision && S.escaneo.decision.ideas) || []) s.add(i.s);
  return [...s].slice(0, 90);
}

/* lo que ya tienes de cada empresa dentro de tus fondos (para no doblar la apuesta sin saberlo) */
const SOBRA_NOMBRE = new Set(['inc', 'corp', 'corporation', 'plc', 'sa', 'nv', 'ag', 'se', 'ltd', 'co', 'holding', 'holdings', 'group', 'class', 'a', 'b', 'c', 'the', 'company', 'ordinary', 'shares', 'new', 'registered', 'participating', 'preferred', 's', 'p', 'spa', 'asa', 'ab', 'oyj']);
const normEmpresa = (n) => normTxt(n).split(' ').filter((w) => w && !SOBRA_NOMBRE.has(w)).join(' ');
function dentroDeFondos(M) {
  if (S.dentroCache && S.dentroCache.M === M) return S.dentroCache.fn;
  const mapa = new Map(empresasPorDentro(M).filas.filter((e) => !e.directa).map((e) => [normEmpresa(e.n), e.v]));
  const fn = (n) => { const k = normEmpresa(n); let v = 0; for (const [kk, vv] of mapa) if (kk && k && (kk === k || kk.startsWith(k + ' ') || k.startsWith(kk + ' '))) v += vv; return v; };
  S.dentroCache = { M, fn };
  return fn;
}

/* ---------- contraste: siete comprobaciones independientes para cada empresa ----------
   Cada una mira una fuente distinta (analistas, sus revisiones, el rango de objetivos, las cuentas,
   la valoración frente a su sector, la tendencia del precio y la solidez del negocio). Una idea
   solo es buena si coinciden varias. 1 = a favor, -1 = en contra, 0 = neutral o sin datos. */
function perSectorMediano() {
  const c = S.perSectorCache;
  if (c && c.ver === S.radarVer) return c.m;
  const g = {};
  for (const x of (S.radar && S.radar.valores) || []) if (x.sector && x.perf > 0 && x.perf < 80) (g[x.sector] = g[x.sector] || []).push(x.perf);
  const m = {};
  for (const [k, a] of Object.entries(g)) { a.sort((p, q) => p - q); m[k] = a[Math.floor(a.length / 2)]; }
  S.perSectorCache = { ver: S.radarVer, m };
  return m;
}
function contraste(x) {
  const checks = [];
  const add = (k, ok, txt) => checks.push({ k, ok, txt });
  // 1. consenso de los analistas
  if (x.na && x.rm != null) add('Analistas', x.na >= 8 && x.rm <= 2.2 ? 1 : x.rm >= 2.8 || x.na < 4 ? -1 : 0, `${x.na} analistas, nota media ${fmtNum(x.rm, 1)} (1 es compra fuerte, 5 venta fuerte)`);
  else add('Analistas', 0, 'sin consenso de analistas');
  // 2. hacia dónde se mueven: votos de compra ahora frente a hace 3 meses
  if (x.v0 && x.v3 && sum(x.v0) && sum(x.v3)) {
    const a = (x.v0[0] + x.v0[1]) / sum(x.v0), b = (x.v3[0] + x.v3[1]) / sum(x.v3);
    add('Revisiones', a - b >= 0.03 ? 1 : a - b <= -0.03 ? -1 : 0, a - b >= 0.03 ? `más analistas a favor que hace 3 meses (${fmtNum(a * 100, 0)} % frente a ${fmtNum(b * 100, 0)} %)` : a - b <= -0.03 ? `menos analistas a favor que hace 3 meses (${fmtNum(a * 100, 0)} % frente a ${fmtNum(b * 100, 0)} %)` : 'los mismos analistas a favor que hace 3 meses');
  } else add('Revisiones', 0, 'sin histórico de recomendaciones');
  // 3. recorrido, y si hasta el analista más pesimista la ve cerca o por encima
  if (x.pot != null && x.p) {
    const bajo = x.tb ? (x.tb / x.p - 1) * 100 : null;
    add('Recorrido', x.pot >= 15 && (bajo == null || bajo >= -12) ? 1 : x.pot < 5 ? -1 : 0, `objetivo medio ${pctS(x.pot, 0)}${bajo != null ? `; el más pesimista, ${pctS(bajo, 0)}` : ''}`);
  } else add('Recorrido', 0, 'sin precio objetivo');
  // 4. beneficios: lo que esperan que gane el año que viene frente al último
  const crec = x.epsg != null ? x.epsg : x.eg;
  if (crec != null) add('Beneficios', crec >= 5 ? 1 : crec <= -5 ? -1 : 0, `beneficio por acción esperado ${pctS(crec, 0)}`);
  else add('Beneficios', 0, 'sin estimaciones de beneficio');
  // 5. valoración frente a su sector
  const med = x.sector && perSectorMediano()[x.sector];
  if (x.perf > 0 && med) add('Valoración', x.perf <= med * 0.9 ? 1 : x.perf >= med * 1.35 ? -1 : 0, `PER futuro (años de beneficio que pagas) de ${fmtNum(x.perf, 1)} frente a ${fmtNum(med, 1)} de su sector`);
  else if (x.perf != null && x.perf <= 0) add('Valoración', -1, 'se espera que pierda dinero');
  else add('Valoración', 0, 'sin PER futuro');
  // 6. tendencia del precio
  if (x.m200 && x.m50 && x.p) {
    const s200 = (x.p / x.m200 - 1) * 100;
    add('Tendencia', x.p > x.m200 && x.m50 > x.m200 ? 1 : x.p < x.m200 && x.m50 < x.m200 ? -1 : 0, `${pctS(s200, 0)} sobre su media de 200 sesiones${x.p < x.m50 ? ', por debajo de la de 50' : ''}`);
  } else add('Tendencia', 0, 'sin medias de precio');
  // 7. solidez del negocio: rentabilidad sobre el capital y deuda
  if (x.roe != null) {
    const banco = x.sector === 'Financiero';
    const ok = x.roe >= 12 && (banco || x.de == null || x.de < 150);
    const mal = x.roe < 4 || (!banco && x.de != null && x.de > 250);
    add('Solidez', ok ? 1 : mal ? -1 : 0, `rentabilidad sobre su capital (ROE) del ${fmtNum(x.roe, 0)} %${!banco && x.de != null ? `, deuda del ${fmtNum(x.de, 0)} % de su capital` : ''}`);
  } else add('Solidez', 0, 'sin datos de rentabilidad');
  const favor = checks.filter((c) => c.ok === 1).length, contra = checks.filter((c) => c.ok === -1).length;
  return { checks, favor, contra, total: checks.length };
}
function htmlContraste(ctr, conTexto) {
  const t = ctr.checks.map((c) => `${trad(c.k)}: ${trad(c.ok === 1 ? 'a favor' : c.ok === -1 ? 'en contra' : 'neutral')}, ${trad(c.txt)}`).join('. ');
  return `<span class="ctr" role="img" aria-label="${ctr.favor} de ${ctr.total} señales a favor y ${ctr.contra} en contra. ${esc(t)}" title="${esc(t)}">${ctr.checks.map((c) => `<i class="${c.ok === 1 ? 'si' : c.ok === -1 ? 'no' : ''}"></i>`).join('')}${conTexto ? `<b>${ctr.favor}/${ctr.total}</b>` : ''}</span>`;
}
function htmlContrasteLista(ctr) {
  return `<ul class="ctr-lista">${ctr.checks.map((c) => `<li class="${c.ok === 1 ? 'si' : c.ok === -1 ? 'no' : ''}"><b>${esc(c.k)}</b><span>${esc(c.txt)}</span></li>`).join('')}</ul>`;
}

