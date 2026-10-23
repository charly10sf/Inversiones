/* =====================================================================
   «Añadir con su ISIN»: lo que no está en el catálogo se busca en el momento (el Worker se lo pregunta a Yahoo) y se
   añade con su nombre, su precio y su último año. Mientras los demás no lo tengan, vive en este dispositivo
   («catálogo local», inv-cat-local) y se deja pedido: en la siguiente pasada del catálogo, unos minutos después,
   pasa a ser de todos y desde ahí se actualiza solo. Si Yahoo no lo encuentra, se puede añadir igualmente y queda
   pedido: el catálogo lo vuelve a buscar cada día.
   ===================================================================== */
const CAT_LOCAL = 'inv-cat-local';
function isinValido(c) {
  c = String(c || '').toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(c)) return false;
  const d = c.slice(0, 11).split('').map((x) => (/[0-9]/.test(x) ? x : String(x.charCodeAt(0) - 55))).join('');
  let s = 0, doble = true;
  for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (doble) { n *= 2; if (n > 9) n -= 9; } s += n; doble = !doble; }
  return (10 - (s % 10)) % 10 === +c[11];
}
// cuántos euros vale una unidad de cada moneda (los peniques de libra, a 1/100)
function eurPor(m) {
  if (!m || m === 'EUR') return 1;
  const fx = (S.precios && S.precios.fx) || {};
  if (m === 'GBp' || m === 'GBX') return fx.GBP ? fx.GBP / 100 : null;
  return fx[m] || null;
}
// lo mismo que hace el catálogo (scripts/catalogo.py) con el nombre que da Yahoo: tipo, clase, región, nombre corto y web
function tipoDeYahoo(d) {
  const n = String(d.n || '').toLowerCase(), q = String(d.tipo || '').toUpperCase();
  if (q === 'MUTUALFUND' || /^0P/.test(d.s || '')) return 'Fondo';
  if (q === 'ETF') return /\b(etc|etp|etn)\b/.test(n) ? 'ETC' : 'ETF';
  if (q === 'EQUITY') return /\b(etc|etp|etn|physical)\b/.test(n) ? 'ETC' : /\b(etf|ucits|fund|fonds|index)\b/.test(n) ? 'ETF' : 'Acción';
  return 'ETF';
}
function claseDeNombre(nombre, tipo) {
  const n = String(nombre || '').toLowerCase();
  if ((tipo === 'ETC' || tipo === 'ETF') && /bitcoin|ethereum|crypto|solana|\bxrp\b/.test(n)) return 'Cripto';
  if (tipo === 'Acción' || /miner|mining/.test(n)) return 'Renta variable';
  if (/gold|\boro\b/.test(n)) return 'Oro';
  if (/silver|platinum|palladium|copper|commodit|brent|crude|\bwti\b|precious metal/.test(n) && (tipo === 'ETC' || /physical|commodit|2x|3x|leveraged/.test(n))) return 'Materias primas';
  if (/overnight|tr[ée]sorerie|liquidity|monetari|money market|\bcash\b/.test(n)) return 'Monetario';
  if (/bond|govt|government|aggregate|renta fija|ultrashort|duration|credit|treasury/.test(n)) return 'Renta fija';
  return 'Renta variable';
}
function regionDeNombre(nombre, isin, tipo) {
  const n = String(nombre || '').toLowerCase(), pais = String(isin || '').slice(0, 2);
  if (tipo === 'Acción') return pais === 'US' ? { EEUU: 100 } : ['JP', 'AU', 'HK', 'SG', 'NZ'].includes(pais) ? { 'Japón y Pacífico': 100 } : ['CN', 'IN', 'BR', 'TW', 'KR', 'MX', 'ZA'].includes(pais) ? { Emergentes: 100 } : pais === 'CA' ? { Canadá: 100 } : { Europa: 100 };
  if (/s&p|\bus\b|u\.s\.|usa|america|nasdaq|russell|dow/.test(n)) return { EEUU: 100 };
  if (/all[- ]world|acwi|all cap|lifestrategy|global aggregate/.test(n)) return { EEUU: 62, Europa: 14, 'Japón y Pacífico': 7, Emergentes: 11, Canadá: 3, Otros: 3 };
  if (/emerging|emergentes|\bem\b|india|china|brasil|brazil/.test(n)) return { Emergentes: 100 };
  if (/japan|jap[oó]n|pacific/.test(n)) return { 'Japón y Pacífico': 100 };
  if (/europe|europ|euro |eurozone|emu|stoxx|dax|ibex|espa/.test(n)) return { Europa: 100 };
  if (/world|global|developed|mundial|internacional/.test(n)) return { EEUU: 70, Europa: 15, 'Japón y Pacífico': 8, Canadá: 3, Otros: 4 };
  return { Global: 100 };
}
const GESTORAS_WEB = [[/^vanguard/i, 'vanguard.com'], [/^ishares/i, 'ishares.com'], [/^fidelity/i, 'fidelity.es'], [/^amundi|^lyxor/i, 'amundi.com'], [/^xtrackers/i, 'dws.com'], [/^spdr/i, 'ssga.com'], [/^invesco/i, 'invesco.com'], [/^wisdomtree/i, 'wisdomtree.eu'], [/^vaneck/i, 'vaneck.com'], [/^21shares/i, '21shares.com'], [/^coinshares/i, 'coinshares.com'], [/^hanetf/i, 'hanetf.com'], [/^ubs/i, 'ubs.com'], [/^bnp/i, 'bnpparibas-am.com'], [/^pictet/i, 'pictet.com'], [/^jpm|^jpmorgan/i, 'jpmorgan.com'], [/^global x/i, 'globalxetfs.com']];
function cortoDeNombre(nombre, tipo) {
  if (tipo === 'Acción') return nombreCorto(nombre);
  let t = String(nombre || '').replace(/\s(?:[A-Z]|[A-Z]{2}-[A-Z]|\d[A-Z]|IC|M)(?=\s+(?:Acc|Dist|EUR|FI)\b|\s*$)/g, ' ').replace('(IE)', ' ').replace(/Hedged/g, 'cubierto');
  t = t.replace(/\b(Index Fund|Index|Fund|Stock|UCITS|ETF|Acc|Dist|EUR|Class|FI|Investor)\b/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[-, ]+|[-, ]+$/g, '');
  return (t || String(nombre || '')).slice(0, 28).trim();
}
// lo que devuelve el Worker, como una entrada del catálogo (con los precios ya en euros)
function entradaDeYahoo(d) {
  const f = eurPor(d.m), t = tipoDeYahoo(d), cl = claseDeNombre(d.n, t), tw = t === 'Fondo' ? (['Renta fija', 'Monetario'].includes(cl) ? 'Fondo de renta fija' : /index|indice|s&p|msci|ftse|stoxx/i.test(d.n) ? 'Fondo indexado' : 'Fondo') : t === 'ETF' && ['Oro', 'Materias primas'].includes(cl) && !/commodit/i.test(d.n) ? 'ETC' : t;
  const h = f ? (d.h || []).map(([x, v]) => [x, +(v * f).toFixed(6)]) : [];
  const ult = h[h.length - 1], ant = h[h.length - 2], gw = GESTORAS_WEB.find(([re]) => re.test(d.n || ''));
  return {
    n: d.n || d.isin, c: cortoDeNombre(d.n || d.isin, t), isin: d.isin, s: d.s, t: tw, cl, r: ['Oro', 'Materias primas', 'Cripto'].includes(cl) ? { Global: 100 } : regionDeNombre(d.n, d.isin, t),
    m: d.m || 'EUR', pais: String(d.isin).slice(0, 2), dom: gw ? gw[1] : null, p: ult ? ult[1] : null, pa: ant ? ant[1] : null, f: ult ? ult[0] : null,
    r1a: h.length > 1 ? +(((ult[1] / h[0][1]) - 1) * 100).toFixed(2) : null, bolsa: d.bolsa || '', local: 1, h,
  };
}
function catLocalGuardar(cid, x) { const o = LS.get(CAT_LOCAL, {}) || {}; o[cid] = { ...x, guardado: Date.now() }; LS.set(CAT_LOCAL, o); }
// al cargar el catálogo: lo local entra si el de todos aún no lo tiene; si ya lo tiene, se olvida la copia local
function catLocalMezclar() {
  const o = LS.get(CAT_LOCAL, {}) || {}, ks = Object.keys(o);
  if (!ks.length) return;
  S.cat = S.cat || { v: {} }; S.cat.v = S.cat.v || {};
  let cambio = false;
  for (const cid of ks) {
    if (S.cat.v[cid] && !S.cat.v[cid].local) { delete o[cid]; cambio = true; continue; }
    S.cat.v[cid] = o[cid];
  }
  if (cambio) LS.set(CAT_LOCAL, o);
}
async function buscarIsinWorker(isin, pedir) {
  const ctl = new AbortController(), tt = setTimeout(() => ctl.abort(), 20000);
  try {
    const h = {};
    if (pedir && FB.user) { try { h.Authorization = `Bearer ${await FB.user.getIdToken()}`; } catch (e) { /* sin sesión: solo se busca */ } }
    const r = await fetch(`${urlWorker()}/isin?c=${encodeURIComponent(isin)}${pedir ? '&pedir=1' : ''}`, { headers: h, signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    return r.ok || j.error === 'no-esta' ? j : { ok: false, error: j.error || `http ${r.status}` };
  } catch (e) { return { ok: false, error: 'red' }; } finally { clearTimeout(tt); }
}
// los añadidos así que llevan días sin que el catálogo los coja (o en el perfil local): se les renueva el precio
async function refrescarCatLocal() {
  const o = LS.get(CAT_LOCAL, {}) || {}, usados = new Set((S.cartera && S.cartera.posiciones || []).map((p) => S.inst[p.instrumento] && S.inst[p.instrumento].cat).filter(Boolean));
  const viejos = Object.entries(o).filter(([cid, x]) => usados.has(cid) && Date.now() - (x.guardado || 0) > 12 * 3600e3).slice(0, 4);
  for (const [cid, x] of viejos) {
    const d = await buscarIsinWorker(x.isin, false);
    if (!d.ok || (S.cat && S.cat.v[cid] && !S.cat.v[cid].local)) continue;
    const nx = entradaDeYahoo(d); catLocalGuardar(cid, nx); S.cat.v[cid] = nx;
    for (const id of S.instOrden) if (S.inst[id] && S.inst[id].cat === cid && nx.h.length) S.catHist[id] = nx.h;
  }
  if (viejos.length && S.cartera) { S.M = calcular(); pintar(); }
}
/* la hoja: pones el ISIN, se busca y, si es el bueno, se añade. alListo(cid) recibe el id del catálogo; sinEncontrar(isin),
   lo que se hace si no se encuentra (en compra: añadirlo a mano y dejarlo pedido) */
function anadirPorIsin(inicial, alListo, sinEncontrar) {
  const h = hoja(L('Añadir con su ISIN', 'Add by ISIN'), `<form id="fIsin" novalidate>
    <p class="nota" style="margin:0 0 14px">${L('El ISIN son 12 letras y números, como IE00B4L5Y983. Sale en tu bróker (en la ficha del fondo o en el extracto) y en el folleto. GrowFolio lo busca y lo añade con su precio y su gráfica.', 'The ISIN is 12 letters and numbers, like IE00B4L5Y983. Your broker shows it (on the fund page or your statement), and so does the prospectus. GrowFolio looks it up and adds it with its price and chart.')}</p>
    <label class="campo">ISIN<input name="isin" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="16" placeholder="IE00B4L5Y983" value="${esc(String(inicial || '').toUpperCase())}"></label>
    <div class="isin-res" id="isinRes" aria-live="polite"></div>
    <div class="error" id="errIsin"></div>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>${L('Cancelar', 'Cancel')}</button><button type="submit" class="btn pri" id="bIsin">${L('Buscarlo', 'Look it up')}</button></div>
  </form>`);
  const f = $('#fIsin', h.el), inp = f.isin, res = $('#isinRes', h.el), err = (t) => { $('#errIsin', h.el).textContent = t; }, boton = $('#bIsin', h.el);
  let hallado = null, buscando = false;
  setTimeout(() => { inp.focus(); if (inicial) inp.select(); }, 80);
  inp.oninput = () => { hallado = null; res.innerHTML = ''; err(''); boton.textContent = L('Buscarlo', 'Look it up'); boton.disabled = false; };
  const terminar = (cid) => { h.cerrar(true); alListo(cid); };
  const pedido = (isin) => {
    res.innerHTML = `<div class="isin-no">${ICONOS.alerta}<div><b>${L('No lo encontramos ahora mismo', "We couldn't find it right now")}</b><p>${L('Puede que sea muy nuevo o que Yahoo aún no lo tenga. Si lo añades igualmente, queda pedido: GrowFolio lo vuelve a buscar en cada actualización del catálogo y, en cuanto aparezca, sale con su precio. Mientras, pon tú lo que vale en Editar.', "It may be very new or Yahoo may not have it yet. If you add it anyway, it stays requested: GrowFolio looks for it again on every catalog update and, as soon as it shows up, it gets its price. In the meantime, enter its value yourself in Edit.")}</p></div></div>`;
    boton.textContent = sinEncontrar ? L('Añadirlo igualmente', 'Add it anyway') : L('Dejarlo pedido', 'Request it');
    hallado = { pedido: isin };
  };
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    if (buscando) return;
    const isin = String(inp.value || '').toUpperCase().replace(/[\s-]+/g, '');
    if (hallado && hallado.pedido) {
      // no estaba: se deja pedido (el catálogo lo busca cada día) y, si es una compra, se añade a mano
      pedirComun(isin, '', isin); buscarIsinWorker(isin, true);
      h.cerrar(true);
      if (sinEncontrar) sinEncontrar(isin); else toast(L('Pedido: en cuanto GrowFolio lo encuentre, saldrá al buscarlo', 'Requested: as soon as GrowFolio finds it, it will show up in search'), 4500);
      return;
    }
    if (hallado) {
      const cid = `c-${isin.toLowerCase()}`, x = hallado;
      S.cat = S.cat || { v: {} }; S.cat.v = S.cat.v || {}; S.cat.v[cid] = x; catLocalGuardar(cid, x);
      if (x.t === 'Acción') pedirComun(x.s, x.s, isin); else pedirComun(isin, '', isin);
      buscarIsinWorker(isin, true);   // con tu sesión, lanza ya el catálogo para que lo tengan todos
      return terminar(cid);
    }
    if (!isinValido(isin)) return err(L('Ese ISIN no es válido: tiene que tener 12 caracteres (2 letras, 9 letras o números y una cifra al final). Revisa que no falte ni sobre ninguno.', "That ISIN isn't valid: it needs 12 characters (2 letters, 9 letters or numbers and a final digit). Check nothing is missing or extra."));
    err('');
    // si ya está en el catálogo (o lo añadiste antes), directo
    const ya = Object.entries((S.cat && S.cat.v) || {}).find(([, x]) => String(x.isin || '').toUpperCase() === isin);
    if (ya) return terminar(ya[0]);
    buscando = true; boton.disabled = true; boton.textContent = L('Buscando…', 'Looking…');
    res.innerHTML = `<div class="isin-busca"><span class="isin-giro" aria-hidden="true"></span>${L('Buscándolo en Yahoo Finance…', 'Looking it up on Yahoo Finance…')}</div>`;
    const d = await buscarIsinWorker(isin, false);
    buscando = false; boton.disabled = false;
    if (!d.ok) return pedido(isin);
    const x = entradaDeYahoo(d);
    hallado = x;
    res.innerHTML = `<div class="isin-ok">${logo(x.dom, x.c)}<div class="isin-ok-t"><b>${esc(x.n)}</b><small>${esc([x.t, x.bolsa && L(`cotiza en ${x.bolsa}`, `listed on ${x.bolsa}`), x.m !== 'EUR' && x.m].filter(Boolean).join(' · '))}</small>
      <span class="isin-ok-p">${x.p != null ? `<b>${precioFmt(x.p)}</b>${x.r1a != null ? ` <span class="${cls(x.r1a)}">${pctS(x.r1a, 1)}</span> <small>${L('en un año', 'in a year')}</small>` : ''}` : `<small>${L('Sin precio en euros todavía: lo tendrá en la próxima actualización.', 'No euro price yet: it will have one after the next update.')}</small>`}</span></div></div>
      <p class="nota" style="margin:10px 0 0">${L('¿Es este? Si no, añádelo a mano con su nombre.', 'Is this the one? If not, add it by hand with its name.')} <button type="button" class="enlace acento" id="isinOtro">${L('No es este', "It's not this one")}</button></p>`;
    boton.textContent = L('Añadirlo', 'Add it');
    $('#isinOtro', h.el).onclick = () => { h.cerrar(true); if (sinEncontrar) sinEncontrar(isin); else nuevoInstrumento(() => {}, { isin }); };
  };
  if (inicial && isinValido(inicial)) setTimeout(() => f.requestSubmit(), 120);
}
// al abrir: lo que tienes sin precio común, se pide (una vez cada tres días como mucho)
function revisarPedidos() {
  if (!PERFIL_CUENTA || !S.cartera) return;
  const ids = new Set((S.cartera.posiciones || []).map((p) => p.instrumento));
  for (const id of ids) pedirPrecio(S.inst[id]);
}
/* Las empresas que sigue la web (el radar) sirven para dar de alta una acción sin escribir nada: nombre,
   ticker, país, mercado y logo salen de ahí. Sin ISIN: la Action busca su precio por el ticker. */
function radarPorSim(sim) {
  const r = S.radar && S.radar.valores;
  if (!r || !sim) return null;
  if (!S.radarMapa || S.radarMapa.ver !== S.radarVer || S.radarMapa.n !== r.length) S.radarMapa = { ver: S.radarVer, n: r.length, m: new Map(r.map((x) => [String(x.s).toUpperCase(), x])) };
  return S.radarMapa.m.get(String(sim).toUpperCase()) || null;
}
function instPorSim(sim) {
  const S2 = String(sim || '').toUpperCase();
  return S.instOrden.find((id) => { const i = S.inst[id], p = S.precios && S.precios.instrumentos && S.precios.instrumentos[id]; return (i.yahoo && i.yahoo.toUpperCase() === S2) || (p && String(p.simbolo || '').toUpperCase() === S2); }) || null;
}
// 0.3.9: la industria de Yahoo, en español (si no está en la lista, no se enseña: salía «Oil & Gas Integrated»)
const INDUSTRIA_ES = {"Banks - Regional": "Bancos regionales", "Aerospace & Defense": "Aeroespacial y defensa", "Engineering & Construction": "Ingeniería y construcción", "Specialty Industrial Machinery": "Maquinaria industrial", "Semiconductors": "Semiconductores", "Asset Management": "Gestión de activos", "Drug Manufacturers - General": "Farmacéuticas", "Biotechnology": "Biotecnología", "Software - Application": "Software de aplicaciones", "Specialty Chemicals": "Química especializada", "Software - Infrastructure": "Software de infraestructura", "Banks - Diversified": "Bancos", "Telecom Services": "Telecomunicaciones", "Utilities - Regulated Electric": "Eléctricas reguladas", "Drug Manufacturers - Specialty & Generic": "Farmacéuticas especializadas y genéricos", "Auto Manufacturers": "Fabricantes de coches", "Oil & Gas Integrated": "Petróleo y gas integrado", "Information Technology Services": "Servicios informáticos", "Insurance - Diversified": "Seguros", "Auto Parts": "Componentes de automoción", "Gold": "Oro", "Travel Services": "Viajes", "Utilities - Diversified": "Eléctricas y gas", "Packaged Foods": "Alimentación", "Medical Instruments & Supplies": "Material médico", "Communication Equipment": "Equipos de comunicaciones", "Internet Retail": "Comercio electrónico", "Diagnostics & Research": "Diagnóstico e investigación", "Medical Devices": "Dispositivos médicos", "Capital Markets": "Mercados de capitales", "Integrated Freight & Logistics": "Transporte y logística", "Financial Data & Stock Exchanges": "Bolsas y datos financieros", "Oil & Gas E&P": "Exploración y producción de petróleo y gas", "Electronic Components": "Componentes electrónicos", "Real Estate Services": "Servicios inmobiliarios", "Household & Personal Products": "Higiene y hogar", "Semiconductor Equipment & Materials": "Equipos para semiconductores", "Specialty Business Services": "Servicios a empresas", "Building Materials": "Materiales de construcción", "Oil & Gas Equipment & Services": "Servicios petroleros", "Industrial Distribution": "Distribución industrial", "Steel": "Acero", "Entertainment": "Entretenimiento", "Farm & Heavy Construction Machinery": "Maquinaria agrícola y pesada", "Electrical Equipment & Parts": "Equipos eléctricos", "Computer Hardware": "Ordenadores y hardware", "Restaurants": "Restauración", "Internet Content & Information": "Internet y contenidos", "Credit Services": "Servicios de crédito", "Scientific & Technical Instruments": "Instrumentos científicos", "Airlines": "Aerolíneas", "Utilities - Renewable": "Renovables", "Railroads": "Ferrocarriles", "Grocery Stores": "Supermercados", "Beverages - Non-Alcoholic": "Bebidas sin alcohol", "Oil & Gas Midstream": "Transporte de petróleo y gas", "Tobacco": "Tabaco", "Apparel Retail": "Tiendas de ropa", "Packaging & Containers": "Envases y embalajes", "Insurance - Property & Casualty": "Seguros generales", "Building Products & Equipment": "Productos para la construcción", "Waste Management": "Gestión de residuos", "Healthcare Plans": "Seguros de salud", "Conglomerates": "Conglomerados", "Leisure": "Ocio", "Lodging": "Hoteles", "Discount Stores": "Tiendas de descuento", "Luxury Goods": "Lujo", "Advertising Agencies": "Publicidad", "REIT - Retail": "Socimi de locales comerciales", "REIT - Specialty": "Socimi especializada", "Furnishings, Fixtures & Appliances": "Muebles y electrodomésticos", "REIT - Healthcare Facilities": "Socimi sanitaria", "Medical Distribution": "Distribución médica", "REIT - Office": "Socimi de oficinas", "Utilities - Regulated Gas": "Gas regulado", "Security & Protection Services": "Seguridad", "Real Estate - Development": "Promoción inmobiliaria", "Paper & Paper Products": "Papel", "Publishing": "Editoriales", "Insurance - Reinsurance": "Reaseguros", "Beverages - Brewers": "Cerveceras", "Medical Care Facilities": "Hospitales y clínicas", "Beverages - Wineries & Distilleries": "Vinos y licores", "Electronic Gaming & Multimedia": "Videojuegos", "Other Industrial Metals & Mining": "Minería industrial", "Consulting Services": "Consultoría", "REIT - Industrial": "Socimi logística", "Utilities - Independent Power Producers": "Productores de electricidad", "Auto & Truck Dealerships": "Concesionarios", "Rental & Leasing Services": "Alquiler y leasing", "Residential Construction": "Construcción de viviendas", "Chemicals": "Química", "Apparel Manufacturing": "Fabricantes de ropa", "Resorts & Casinos": "Resorts y casinos", "Footwear & Accessories": "Calzado y complementos", "Marine Shipping": "Transporte marítimo", "Insurance - Life": "Seguros de vida", "Home Improvement Retail": "Bricolaje", "Confectioners": "Dulces", "Farm Products": "Productos agrícolas", "Metal Fabrication": "Fabricación metálica", "Real Estate - Diversified": "Inmobiliaria", "Gambling": "Juego", "Pollution & Treatment Controls": "Control de la contaminación", "Other Precious Metals & Mining": "Metales preciosos", "Specialty Retail": "Comercio especializado", "Insurance Brokers": "Corredurías de seguros", "Airports & Air Services": "Aeropuertos", "Aluminum": "Aluminio", "Consumer Electronics": "Electrónica de consumo", "Education & Training Services": "Educación", "Recreational Vehicles": "Vehículos recreativos", "Food Distribution": "Distribución de alimentos", "Uranium": "Uranio", "Department Stores": "Grandes almacenes", "Copper": "Cobre", "Shell Companies": "Sociedades instrumentales", "Electronics & Computer Distribution": "Distribución de electrónica", "Health Information Services": "Información sanitaria", "REIT - Diversified": "Socimi diversificada", "Financial Conglomerates": "Conglomerados financieros", "Oil & Gas Refining & Marketing": "Refino de petróleo", "Thermal Coal": "Carbón", "Coking Coal": "Carbón", "Solar": "Solar", "Trucking": "Transporte por carretera", "Staffing & Employment Services": "Empleo y trabajo temporal", "Agricultural Inputs": "Fertilizantes y agroquímicos", "Lumber & Wood Production": "Madera", "Silver": "Plata", "Mortgage Finance": "Hipotecas", "Banks - Regional - Europe": "Bancos regionales", "Infrastructure Operations": "Infraestructuras", "Tools & Accessories": "Herramientas", "Textile Manufacturing": "Textil", "Personal Services": "Servicios personales", "Broadcasting": "Televisión y radio", "Pharmaceutical Retailers": "Farmacias", "REIT - Residential": "Socimi residencial", "REIT - Mortgage": "Socimi hipotecaria", "REIT - Hotel & Motel": "Socimi hotelera", "Real Estate Services ": "Servicios inmobiliarios"};
const nombreCorto = (n) => {
  // la forma jurídica fuera; el punto final, solo si no es de una abreviatura tipo «B.F.»
  const t0 = String(n || '').replace(FORMA_JUR, ' ').replace(/\s+/g, ' ').trim(), t = /\b[A-Z]\.[A-Z]\.$/.test(t0) ? t0 : t0.replace(/[,.]+\s*$/, '');
  // hasta 3 palabras y 24 letras, sin dejar una palabra a medias («Taiwan Semiconductor Man»)
  const r = (t || String(n || '')).split(' ').slice(0, 3).join(' ');
  return r.length <= 24 ? r : r.slice(0, 25).replace(/\s+\S*$/, '') || r.slice(0, 24);
};
/* devuelve el id del instrumento (el que ya tienes o uno nuevo hecho con los datos del radar) */
function instDeRadar(sim) {
  const ya = instPorSim(sim);
  if (ya) return ya;
  const x = radarPorSim(sim);
  if (!x) return null;
  const o = origenRadar(x);
  const nombre = /^[A-Z0-9 .,&'-]+$/.test(x.n) ? x.n.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : x.n;
  const corto = nombreCorto(nombre);
  let id = corto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'accion';
  while (S.inst[id]) id += '-2';
  const inst = { id, nombre, corto, yahoo: x.s, tipo: 'Acción', clase: 'Renta variable', region: { [x.z === 'EEUU' ? 'EEUU' : 'Europa']: 100 } };
  // la moneda en la que cotiza (Londres, en peniques): sin ella, el precio en directo se tomaría como euros
  if (x.m) inst.moneda = x.m;
  if (o.sede || o.bolsa) inst.pais = o.sede || o.bolsa;
  // si cotiza en un país y tiene la sede en otro (HBX: Madrid y Reino Unido), la tasa de compra no aplica
  if (o.bolsa && o.bolsa !== inst.pais) inst.bolsa = o.bolsa;
  if (o.ciudad) inst.mercado = o.ciudad;
  if (x.w) inst.dominio = x.w;
  inst.noticias = corto;
  S.inst[id] = inst; S.instOrden.push(id); S.instCambiados = true;
  return id;
}
const opcionesEmpresas = () => (radarVals() || []).filter((x) => x.n && x.s).map((x) => `<option value="${esc(`${x.n} (${x.s})`)}"></option>`).join('');

