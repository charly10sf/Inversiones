/* =====================================================================
   Importar la cartera desde capturas o PDF del bróker: Gemini lee lo que se ve (nombre, ISIN, cuántas,
   precio medio, valor), la web lo empareja con su lista o con el radar y tú lo revisas antes de guardar.
   Las imágenes van de tu navegador a Google con tu clave; no se guardan en ningún sitio.
   ===================================================================== */
const CRIPTOS = { bitcoin: 'BTC', btc: 'BTC', ethereum: 'ETH', ether: 'ETH', eth: 'ETH', solana: 'SOL', sol: 'SOL', cardano: 'ADA', ada: 'ADA', xrp: 'XRP', ripple: 'XRP', dogecoin: 'DOGE', doge: 'DOGE', polkadot: 'DOT', litecoin: 'LTC', chainlink: 'LINK', avalanche: 'AVAX', polygon: 'POL', bnb: 'BNB', tron: 'TRX', pepe: 'PEPE', shiba: 'SHIB', usdc: 'USDC', tether: 'USDT' };
function instCripto(nombre, ticker) {
  const sym = (CRIPTOS[normTxt(ticker)] || CRIPTOS[normTxt(nombre).split(' ')[0]] || String(ticker || '').toUpperCase().replace(/[^A-Z0-9]/g, '')).slice(0, 8);
  if (!sym) return null;
  const ya = S.instOrden.find((id) => S.inst[id].clase === 'Cripto' && String(S.inst[id].yahoo || S.inst[id].bitvavo || '').toUpperCase().startsWith(sym + '-'));
  if (ya) return ya;
  let id = sym.toLowerCase(); while (S.inst[id]) id += '-2';
  S.inst[id] = { id, nombre: nombre || sym, corto: nombre ? nombreCorto(nombre) : sym, yahoo: `${sym}-EUR`, bitvavo: `${sym}-EUR`, tipo: 'Cripto', clase: 'Cripto', region: { Global: 100 }, sector_fijo: 'Cripto' };
  S.instOrden.push(id); S.instCambiados = true;
  return id;
}
/* parecido entre dos nombres de fondo o empresa: palabras en común, sin las de relleno */
const RELLENO = new Set(['fund', 'fondo', 'index', 'indice', 'acc', 'eur', 'class', 'clase', 'the', 'inc', 'plc', 'sa', 'ag', 'nv', 'de', 'la', 'el', 'y', 'and', 'ie', 'lu', 'ucits', 'etf', 'p', 's', 'd', 'a', 'b', 'c', 'i', 'r']);
const palabras = (t) => new Set(normTxt(t).split(' ').filter((w) => w && !RELLENO.has(w)));
function parecido(a, b) { const A = palabras(a), B = palabras(b); if (!A.size || !B.size) return 0; let k = 0; for (const w of A) if (B.has(w)) k++; return k / Math.max(A.size, B.size); }
/* busca el instrumento de una posición leída: ISIN, ticker, nombre; si es un fondo con ISIN que no
   conoce, lo da de alta con ese ISIN */
function emparejar(x) {
  const isin = String(x.isin || '').toUpperCase().replace(/\s/g, '');
  if (isin) { const id = S.instOrden.find((k) => String(S.inst[k].isin || '').toUpperCase() === isin); if (id) return { id, como: 'ISIN' }; }
  if (isin) { const c = Object.entries((S.cat && S.cat.v) || {}).find(([, x]) => String(x.isin || '').toUpperCase() === isin); if (c) return { id: instDeCatalogo(c[0]), como: 'ISIN' }; }
  if (x.tipo === 'Cripto' || CRIPTOS[normTxt(x.nombre)] || CRIPTOS[normTxt(x.ticker)]) { const id = instCripto(x.nombre, x.ticker); if (id) return { id, como: 'cripto' }; }
  const lista = candidatosBusqueda();
  if (x.ticker) { const T = String(x.ticker).toUpperCase().trim(); const r = buscarEn(lista, T).find((c) => String(c.s).toUpperCase().split('.')[0].split('-')[0] === T || String(c.s).toUpperCase() === T || (c.a || []).some((a) => String(a).toUpperCase() === T)); if (r) return { id: idDeCandidato(r), como: 'ticker' }; }
  let mejor = null, p = 0;
  for (const c of lista) { const v = Math.max(parecido(x.nombre, c.l), parecido(x.nombre, c.n)); if (v > p) { p = v; mejor = c; } }
  if (mejor && p >= 0.6) return { id: idDeCandidato(mejor), como: 'nombre' };
  if (isin) {
    let id = nombreCorto(x.nombre || isin).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || isin.toLowerCase();
    while (S.inst[id]) id += '-2';
    const fondo = /fond|fund|index|indice/i.test(x.nombre || '') || x.tipo === 'Fondo';
    S.inst[id] = { id, nombre: x.nombre || isin, corto: nombreCorto(x.nombre || isin), isin, tipo: fondo ? 'Fondo indexado' : x.tipo === 'ETF' ? 'ETF' : 'Acción', clase: 'Renta variable', region: { Global: 100 }, pais: isin.slice(0, 2) };
    S.instOrden.push(id); S.instCambiados = true;
    return { id, como: 'nuevo' };
  }
  return null;
}
