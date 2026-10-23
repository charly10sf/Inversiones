/* =====================================================================
   0.7 · Las fichas de GrowIA: lo que pesa ahora en cada empresa, factor por factor
   La Action (scripts/informe.py y scripts/fichas.py) lee la prensa con Gemini Flash-Lite y deja en fichas.json, en
   la rama datos, una ficha por empresa con seis factores (negocio, sector, economía, política y leyes, sociedad y
   mercado) y la marca de cada titular: de qué factor es, si es bueno o malo para la acción y cuánto importa. Además,
   los temas que tocan a muchas empresas a la vez (aranceles, tipos, huelgas…), con a qué zonas, países y sectores.
   Se bajan solo cuando hacen falta (una lista de noticias, una ficha, GrowIA): no frenan la entrada.
   ===================================================================== */
const ORDEN_FACTORES = ['negocio', 'sector', 'macro', 'politico', 'social', 'mercado'];
function factorTxt(k) {
  return ({ negocio: L('Negocio', 'Business'), sector: L('Sector', 'Sector'), macro: L('Economía', 'Economy'), politico: L('Política y leyes', 'Politics and rules'),
    social: L('Sociedad', 'Society'), mercado: L('Mercado', 'Market') })[k] || k;
}
const signoClase = (s) => ({ '+': 'up', '-': 'down', '±': 'warn' })[s] || 'flat';
const flechaSigno = (s) => ({ '+': '▲', '-': '▼', '±': '◆' })[s] || '•';
function signoTxt(s) { return ({ '+': L('bueno para la acción', 'good for the stock'), '-': L('malo para la acción', 'bad for the stock'), '±': L('mixto', 'mixed') })[s] || L('neutro', 'neutral'); }
function pesoTxt(p) { return [L('relleno', 'filler'), L('pesa poco', 'minor'), L('importante', 'important'), L('cambia la tesis', 'changes the thesis')][p] || ''; }
function plazoFactorTxt(p) { return ({ corto: L('días o semanas', 'days or weeks'), medio: L('meses', 'months'), largo: L('años', 'years') })[p] || ''; }

/* La clave de un titular: la misma cuenta que clave_titulo en scripts/fichas.py (si cambia una, cambia la otra).
   Sin tildes ni nada que no sea ASCII, en minúsculas, solo letras y números, y FNV-1a de 32 bits. */
const normTitular = (t) => String(t || '').normalize('NFD').replace(/[^\x00-\x7f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
function claveTitular(t) {
  const s = normTitular(t);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return (h >>> 0).toString(16).padStart(8, '0');
}

async function cargarFichas() {
  const id = (S.precios && S.precios.fichas_id) || '';
  if (S.fichas && S.fichasId === id && !CFG.dev) return S.fichas;
  if (S.fichasCargando) return S.fichasCargando;
  S.fichasCargando = (async () => {
    let txt = null;
    try {
      const r = await fetch(CFG.dev ? 'dev/fichas.json' : GH.raw('fichas.json', 'datos') + '?v=' + encodeURIComponent(id || 'sin'), { cache: CFG.dev ? 'no-store' : 'no-cache' }).catch(() => null);
      if (r && r.ok) txt = await r.text();
    } catch (e) { console.warn(e); }
    if (txt) { try { S.fichas = JSON.parse(txt); S.fichasId = id; indexarFichas(); if (IDIOMA === 'en') { if (S.trEn) aplicarTrEn(); else cargarTrEn(); } } catch (e) { console.warn(e); } }
    S.fichasCargando = null;
    return S.fichas;
  })();
  return S.fichasCargando;
}
/* desde una lista de noticias o una ficha sin las fichas bajadas: se bajan y se vuelve a pintar lo que se ve */
function fichasLuego() {
  if ((S.fichas && S.fichasId === ((S.precios && S.precios.fichas_id) || '')) || S.fichasCargando || S.fichasPedidas > 2) return;
  S.fichasPedidas = (S.fichasPedidas || 0) + 1;
  cargarFichas().then((f) => {
    if (!f || !S.cartera) return;
    // lo que espera en una hoja (la consulta de una empresa): se rellena en su sitio
    document.querySelectorAll('[data-ficha-sim]').forEach((el) => { el.outerHTML = htmlFichaFactores(el.dataset.fichaSim) || ''; });
    if (S.ficha && typeof refrescarFicha === 'function') refrescarFicha();
    else if (typeof pintar === 'function' && !$('.hoja-fondo')) pintar();
  }).catch(() => {});
}
function indexarFichas() {
  const tit = new Map();
  for (const x of Object.values((S.fichas && S.fichas.e) || {})) {
    for (const [k, v] of Object.entries(x.tit || {})) { const o = tit.get(k); if (!o || (v[2] || 0) > (o[2] || 0)) tit.set(k, v); }
  }
  // los titulares de los temas: su factor y cuánto importa (si es bueno o malo depende de cada empresa)
  for (const t of (S.fichas && S.fichas.temas) || []) {
    const p = Math.max(1, ...(t.afecta || []).map((a) => a.p || 1));
    for (const f of t.fuentes || []) { const k = claveTitular(f.t); if (!tit.has(k)) tit.set(k, [t.fa, '=', p, String(f.d || t.d || '').slice(0, 10), t.k]); }
  }
  S.fichasTit = tit;
}
// con el titular en español (t0 si la app está en inglés y ya lo ha traducido)
const marcaTitular = (n) => (S.fichasTit && n && n.t ? S.fichasTit.get(claveTitular(n.t0 || n.t)) || null : null);

/* los temas que tocan a una empresa del radar: por su sector y por su sitio (su país o su zona; España también es
   Europa) y, si el tema lo dice, por su industria (aerolíneas, defensa…). Gemini a veces pone el país y la zona a
   la vez: basta con que case uno. De cada tema, lo que más se le ajusta: el país antes que la zona, la zona exacta antes que «Europa», y si empatan, lo que más pesa */
function temasDe(x) {
  if (!x || !S.fichas) return [];
  const sitio = (a) => {
    if (!a.pais && !a.zona) return 0.5;
    if (a.pais && a.pais === x.pais) return 3;
    if (a.zona && a.zona === x.z) return 2;
    if (a.zona === 'Europa' && x.z === 'España') return 1;
    return 0;
  };
  const out = [];
  for (const t of S.fichas.temas || []) {
    const ind = (a) => !a.industria || String(x.ind || '').toLowerCase() === String(a.industria).toLowerCase();
    const ok = (t.afecta || []).map((a) => ({ a, n: sitio(a) + (a.sector ? 1 : 0) + (a.industria ? 1 : 0) })).filter(({ a, n }) => n > (a.sector ? 1 : 0) + (a.industria ? 1 : 0) && (!a.sector || a.sector === x.sector) && ind(a));
    if (!ok.length) continue;
    const { a } = ok.sort((p, q) => q.n - p.n || (q.a.p || 1) - (p.a.p || 1))[0];
    out.push({ ...t, s: a.s, p: a.p || 1 });
  }
  return out.sort((a, b) => b.p - a.p || String(b.d).localeCompare(String(a.d)));
}
/* la ficha de una empresa: sus factores (lo más importante primero) y los temas que le tocan */
function fichaDe(sim) {
  if (!S.fichas || !sim) return null;
  const e = (S.fichas.e || {})[sim] || null;
  const x = (typeof radarVals === 'function' ? radarVals() : []).find((r) => r.s === sim) || null;
  const fa = e ? ORDEN_FACTORES.filter((k) => e.fa && e.fa[k]).map((k) => ({ k, ...e.fa[k] })).sort((a, b) => (b.p || 1) - (a.p || 1)) : [];
  const temas = temasDe(x).slice(0, 4);
  return fa.length || temas.length ? { sim, d: e && e.d, fa, temas } : null;
}

function chipMarca(m) {
  if (!m) return '';
  const [fa, s, p] = m;
  return `<span class="marca ${signoClase(s)}${p >= 2 ? ' fuerte' : ''}" title="${esc(`${factorTxt(fa)} · ${signoTxt(s)} · ${pesoTxt(p)}`)}"><i aria-hidden="true">${flechaSigno(s)}</i>${esc(factorTxt(fa))}</span>`;
}
/* Una lista de noticias, con lo importante arriba, el relleno abajo y sin el mismo titular de cinco medios: se queda
   uno y dice cuántos más lo cuentan. El orden de llegada (de más nueva a más vieja) manda dentro de cada grupo. */
function ordenarNoticias(lista) {
  const out = [];
  // parecidos: comparten al menos el 60 % de las palabras largas y, si los dos llevan cifras, alguna cifra (dos
  // recompras de acciones de semanas distintas no son la misma noticia)
  const pals = (t) => ({ p: new Set(normTitular(t).split(' ').filter((x) => x.length > 3 && !/^\d/.test(x))), c: new Set(String(t).match(/\d+(?:[.,]\d+)*/g) || []) });
  const comunes = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n; };
  const parecidos = (a, b) => a.p.size >= 3 && b.p.size >= 3 && comunes(a.p, b.p) / Math.min(a.p.size, b.p.size) >= 0.6 && (!a.c.size || !b.c.size || comunes(a.c, b.c) > 0);
  for (const n of lista || []) {
    if (!n || !n.t) continue;
    const pal = pals(n.t), m = marcaTitular(n);
    const igual = out.find((o) => parecidos(o.pal, pal));
    if (igual) { igual.mas++; if (m && (!igual.m || (m[2] || 0) > (igual.m[2] || 0))) { igual.n = n; igual.m = m; } continue; }
    out.push({ n, m, pal, mas: 0, k: out.length });
  }
  const peso = (o) => (o.m ? (o.m[2] ?? 1) : 1);
  return out.sort((a, b) => (peso(b) >= 2) - (peso(a) >= 2) || (peso(a) === 0) - (peso(b) === 0) || a.k - b.k);
}

/* «Lo que pesa ahora», arriba de las noticias de una empresa */
function htmlFichaFactores(sim) {
  if (!sim) return '';
  if (!S.fichas) { fichasLuego(); return `<div class="ficha-ia-sitio" data-ficha-sim="${esc(sim)}"></div>`; }
  const F = fichaDe(sim);
  if (!F) return '';
  const fuentes = (fs) => { const v = [], vistos = new Set(); for (const f of fs || []) { const k = f.f || L('fuente', 'source'); if (f.u && !vistos.has(k)) { vistos.add(k); v.push(`<a href="${esc(f.u)}" target="_blank" rel="noopener noreferrer" class="enlace">${esc(k)}</a>`); } } return v.length ? ' · ' + v.slice(0, 2).join(', ') : ''; };
  const fila = (x, tema) => `<li class="fac ${signoClase(x.s)}"><span class="fac-k"><i aria-hidden="true">${flechaSigno(x.s)}</i>${esc(factorTxt(x.fa || x.k))}${tema ? `<em>${L('tema', 'theme')}</em>` : ''}</span><p data-no-trad>${escIA(x.txt)}</p><small>${esc(signoTxt(x.s))} · ${esc(pesoTxt(x.p || 1))}${x.plazo ? ` · ${L('pesa a', 'over')} ${esc(plazoFactorTxt(x.plazo))}` : ''} · ${haceCuanto(x.d)}${fuentes(x.fuentes)}</small></li>`;
  return `<section class="ficha-ia" aria-labelledby="hFichaIA"><div class="sec-cab"><h3 id="hFichaIA" data-no-trad>${conIA('Lo que pesa ahora, según GrowIA', 'What matters now, according to GrowIA')}</h3><span class="k">${F.d ? `${L('leído', 'read')} ${haceCuanto(F.d)}` : ''}</span></div>
    <ul class="factores">${F.fa.map((x) => fila(x, false)).join('')}${F.temas.map((t) => fila(t, true)).join('')}</ul></section>`;
}

/* ---------- lo que lee GrowIA ----------
   En vez de titulares sueltos, la ficha de cada acción en pocas líneas: así sabe qué pesa en cada factor sin tener
   que buscar en internet, y gasta menos (src/js/55-asesor-contexto.js y la herramienta buscar_empresa) */
function fichaGrowIA(sim, maxTemas = 3) {
  const F = fichaDe(sim);
  if (!F) return null;
  const linea = (x, k) => `${factorTxt(k)} (${signoTxt(x.s)}, ${pesoTxt(x.p || 1)}${x.plazo ? `, pesa a ${plazoFactorTxt(x.plazo)}` : ''}, ${String(x.d || '').slice(0, 10)}): ${x.txt}`;
  return { leida: F.d ? String(F.d).slice(0, 10) : null, factores: F.fa.map((x) => linea(x, x.k)), temas: F.temas.slice(0, maxTemas).map((t) => linea(t, t.fa)) };
}
/* los temas de la semana que más pesan, para todos (aranceles, tipos, huelgas…), con a quién tocan */
function temasGrowIA(n = 6) {
  const lugar = (a) => [a.pais || a.zona, a.sector, a.industria].filter(Boolean).join(' · ') || L('todos', 'everyone');
  return ((S.fichas && S.fichas.temas) || []).map((t) => ({ t, p: Math.max(1, ...(t.afecta || []).map((a) => a.p || 1)) })).sort((a, b) => b.p - a.p || String(b.t.d).localeCompare(String(a.t.d))).slice(0, n)
    .map(({ t }) => `${factorTxt(t.fa)}, ${String(t.d || '').slice(0, 10)}: ${t.txt} (toca a: ${(t.afecta || []).slice(0, 4).map((a) => `${lugar(a)} ${a.s}`).join('; ')})`);
}
/* un titular para GrowIA, con su marca si la tiene */
const titularGrowIA = (n, m = marcaTitular(n)) => `${n.d ? String(n.d).slice(0, 10) + ' ' : ''}${n.t} (${n.f || ''})${m ? ` [${factorTxt(m[0])}, ${signoTxt(m[1])}, ${pesoTxt(m[2])}]` : ''}`;
