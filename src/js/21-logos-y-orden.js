/* =====================================================================
   Logo y país de cada activo
   El logo es el icono de la web de la empresa o la gestora (servicio de iconos de Google);
   si no carga, se ven las iniciales. Las banderas, de flagcdn.com.
   ===================================================================== */
const PAISES = { ES: 'España', GB: 'Reino Unido', IE: 'Irlanda', LU: 'Luxemburgo', JE: 'Jersey', US: 'EEUU', DE: 'Alemania', FR: 'Francia', NL: 'Países Bajos', IT: 'Italia', CH: 'Suiza', DK: 'Dinamarca', BE: 'Bélgica', SE: 'Suecia', FI: 'Finlandia', PT: 'Portugal', JP: 'Japón', CA: 'Canadá', NO: 'Noruega', AT: 'Austria', HK: 'Hong Kong', TW: 'Taiwán', CN: 'China', BR: 'Brasil', KR: 'Corea del Sur', AU: 'Australia', GR: 'Grecia', IL: 'Israel', MX: 'México', IN: 'India', SG: 'Singapur', ZA: 'Sudáfrica', CY: 'Chipre', UY: 'Uruguay', BM: 'Bermudas', KY: 'Islas Caimán', IM: 'Isla de Man', PE: 'Perú', CZ: 'Chequia', NG: 'Nigeria' };
const PAIS_DE_NOMBRE = { Spain: 'ES', 'United Kingdom': 'GB', Ireland: 'IE', Luxembourg: 'LU', Jersey: 'JE', 'United States': 'US', Germany: 'DE', France: 'FR', Netherlands: 'NL', Italy: 'IT', Switzerland: 'CH', Denmark: 'DK', Belgium: 'BE', Sweden: 'SE', Finland: 'FI', Portugal: 'PT', Japan: 'JP', Canada: 'CA', Norway: 'NO', Austria: 'AT', 'Hong Kong': 'HK', Taiwan: 'TW', China: 'CN', Brazil: 'BR', 'South Korea': 'KR', Australia: 'AU', Greece: 'GR', Israel: 'IL', Mexico: 'MX', India: 'IN', Singapore: 'SG', 'South Africa': 'ZA', Cyprus: 'CY', Uruguay: 'UY', Bermuda: 'BM', 'Cayman Islands': 'KY', 'Isle of Man': 'IM', Peru: 'PE', 'Czech Republic': 'CZ', Nigeria: 'NG' };
/* dónde cotiza (por el sufijo del ticker de Yahoo) y dónde tiene la sede (de su ficha): no siempre coinciden */
const BOLSA_SUFIJO = { MC: ['ES', 'Madrid'], AS: ['NL', 'Ámsterdam'], DE: ['DE', 'Fráncfort'], F: ['DE', 'Fráncfort'], PA: ['FR', 'París'], MI: ['IT', 'Milán'], BR: ['BE', 'Bruselas'], HE: ['FI', 'Helsinki'], CO: ['DK', 'Copenhague'], ST: ['SE', 'Estocolmo'], OL: ['NO', 'Oslo'], SW: ['CH', 'Zúrich'], L: ['GB', 'Londres'], LS: ['PT', 'Lisboa'], IR: ['IE', 'Dublín'], VI: ['AT', 'Viena'] };
function origenRadar(x) {
  const suf = String((x && x.s) || '').split('.')[1];
  // sin sufijo es EEUU, pero puede ser Nueva York o el Nasdaq: «bolsa de EEUU» no se equivoca
  const [bolsa, ciudad] = suf ? BOLSA_SUFIJO[suf] || [null, null] : ['US', 'EEUU'];
  const sede = PAIS_DE_NOMBRE[x && x.pais] || null;
  return { bolsa, ciudad, sede, sedeNombre: sede ? PAISES[sede] : (x && x.pais) || null, distinta: !!(sede && bolsa && sede !== bolsa) };
}
// en las ideas compactas, una línea que siempre cabe: la bandera de la bolsa y el sector (o la ciudad)
const lineaOrigenCorta = (x) => { const o = origenRadar(x); return `${bandera(o.bolsa || o.sede)}<span>${esc(x.sector || o.ciudad || x.z || '')}</span>`; };
const lineaOrigen = (x) => { const o = origenRadar(x); return `${bandera(o.bolsa || o.sede)} ${esc(x.sector || '')}${x.sector ? ', ' : ''}${o.ciudad ? `bolsa de ${esc(o.ciudad)}` : esc(x.z || '')}${o.distinta ? `, sede en ${esc(o.sedeNombre)}` : ''}`; };
const FORMA_JUR = /,?\s+(inc|corp|corporation|co|plc|s\.?a|n\.?v|ag|se|sa|spa|s\.p\.a|ltd|limited|holdings?|group|international|company|aktiengesellschaft|the)\.?(?=\s|,|$)/gi;
const iniciales = (t) => { const b = String(t || '?').replace(/\(.*?\)/g, '').trim(), c = b.replace(FORMA_JUR, ' ').replace(/\s+/g, ' ').trim() || b; return c.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase(); };
/* 0.8.3: logos desde Toisón. La Action «Logos» busca el icono más grande de la web de cada empresa y lo publica en la rama
   «logos» (logos/<dominio>.webp, 128 px); logos.json dice cuáles hay. Con el índice a mano (guardado de la vez anterior)
   la app pide el logo ahí y a Google ya no le dice qué empresas miras; los dominios que no están (un instrumento propio,
   la web de un medio) siguen con el servicio de iconos de Google, y si tampoco hay, las iniciales. */
const LS_LOGOS = 'inv-logos';
const dominioLogo = (d) => String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
const leerLogos = (j) => (j && Array.isArray(j.d) ? new Set(j.d.filter((x) => typeof x === 'string')) : null);
let LOGOS = leerLogos(LS.get(LS_LOGOS, null));
const urlLogoPropio = (d) => GH.raw(`logos/${encodeURIComponent(d)}.webp`, 'logos');
function imgLogo(dominio) {
  const d = dominioLogo(dominio);
  const propio = !!(LOGOS && LOGOS.has(d));
  const src = propio ? urlLogoPropio(d) : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(dominio)}&sz=64`;
  return `<img src="${src}" alt="" loading="lazy" referrerpolicy="no-referrer"${propio ? ' data-propio="1"' : ''} onload="if (this.naturalWidth < 24) this.remove(); else this.classList.add('ok')" onerror="this.remove()">`;
}
function logo(dominio, nombre, clase = '') {
  const ini = esc(iniciales(nombre));
  if (!dominio) return `<span class="logo-a ${clase}" aria-hidden="true"><span>${ini}</span></span>`;
  return `<span class="logo-a ${clase}" aria-hidden="true" data-d="${esc(dominioLogo(dominio))}"><span>${ini}</span>${imgLogo(dominio)}</span>`;
}
/* los logos que ya estaban pintados con el de Google (la primera vez, antes de tener el índice) pasan al propio */
function mejorarLogos(raiz = document) {
  if (!LOGOS) return;
  raiz.querySelectorAll('.logo-a[data-d]').forEach((el) => {
    const d = el.dataset.d, im = el.querySelector('img');
    if (!LOGOS.has(d) || (im && im.dataset.propio)) return;
    if (im) im.remove();
    el.insertAdjacentHTML('beforeend', imgLogo(d));
  });
}
async function cargarLogos() {
  if (CFG.dev) return;
  try {
    const r = await fetch(GH.raw('logos.json', 'logos') + '?v=' + Math.floor(Date.now() / 21600000), { cache: 'no-cache' });
    if (!r.ok) return;
    const j = await r.json(), nuevo = leerLogos(j);
    if (!nuevo || !nuevo.size) return;
    const igual = LOGOS && LOGOS.size === nuevo.size;
    LOGOS = nuevo;
    LS.set(LS_LOGOS, { g: j.g || '', d: [...nuevo] });
    if (!igual) mejorarLogos();
  } catch (e) { /* sin red o sin rama aún: se queda como estaba */ }
}
function bandera(cod) {
  if (!cod) return '<span class="bandera global" aria-hidden="true"></span>';
  return `<img class="bandera" src="https://flagcdn.com/${esc(cod.toLowerCase())}.svg" alt="" width="18" height="13" loading="lazy" onload="this.classList.add('ok')" onerror="this.remove()">`;
}
function origen(inst) {
  const cod = inst.pais || null;
  const nombre = cod ? PAISES[cod] || cod : 'Global';
  return `<span class="origen" title="${esc(donde(inst))}">${bandera(cod)}${esc(nombre)}</span>`;
}
function donde(inst) {
  const pais = inst.pais ? PAISES[inst.pais] || inst.pais : null;
  if (inst.tipo === 'Acción') return `Empresa de ${pais || 'fuera'}${inst.mercado ? `, cotiza en la bolsa de ${inst.mercado}` : ''}`;
  if (/^Fondo/.test(inst.tipo || '')) return `Fondo domiciliado en ${pais || '—'}: no cotiza en bolsa, tiene un valor liquidativo al día`;
  if (inst.tipo === 'ETC') return `Emitido en ${pais || '—'}${inst.mercado ? `, cotiza en la bolsa de ${inst.mercado}` : ''}`;
  if (inst.clase === 'Cripto') return 'Sin país: cotiza las 24 horas en exchanges de todo el mundo';
  return pais || '';
}
const dominioWeb = (u) => { try { return u ? new URL(/^https?:/.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, '') : null; } catch (e) { return null; } };

/* =====================================================================
   Orden de la tabla de posiciones
   ===================================================================== */
const ORDEN_CORTO = { activo: 'Nombre', precio: 'Precio', hoy: 'Hoy', valor: 'Valor', peso: 'Peso', gan: 'Ganado', pct: '%', senal: 'Señal' };
const tituloCol = (t) => (t === 'Señal' && esPublico() ? L('Analistas', 'Analysts') : t);
const COLS_POS = [['activo', 'Activo', ''], ['precio', 'Precio', 'r c-precio'], ['hoy', 'Hoy', 'r c-hoy'], ['valor', 'Valor', 'r c-val'], ['peso', 'Peso', 'r c-peso'], ['gan', 'Desde la compra', 'r c-gan'], ['pct', '%', 'r c-pct'], ['senal', 'Señal', 'r c-senal']];
const CLAVE_POS = {
  activo: (f) => (f.inst.corto || f.inst.nombre || '').toLowerCase(),
  precio: (f) => f.precio ?? -Infinity, hoy: (f) => f.varDia ?? -Infinity, valor: (f) => f.valor, peso: (f) => f.peso,
  gan: (f) => f.pl, pct: (f) => f.plPct ?? -Infinity, senal: (f) => idxSenal(f.senal.nivel),
};
const DIR_INICIAL = { activo: 'asc', senal: 'asc' };
function ordenarPos(filas) {
  const o = S.ordenPos || { k: 'valor', dir: 'desc' };
  const g = CLAVE_POS[o.k] || CLAVE_POS.valor;
  return [...filas].sort((a, b) => {
    const x = g(a), y = g(b);
    const c = typeof x === 'string' ? x.localeCompare(y, 'es') : x - y;
    return (o.dir === 'asc' ? c : -c) || b.valor - a.valor;
  });
}
function cambiarOrden(k) {
  const o = S.ordenPos || {};
  S.ordenPos = o.k === k ? { k, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { k, dir: DIR_INICIAL[k] || 'desc' };
  LS.set('inv-orden-pos', S.ordenPos);
  pintar();
}

