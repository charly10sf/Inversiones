/* ---------- buscador: lo que tienes, tu lista y las ~800 empresas del radar ---------- */
function precioInst(id) {
  const v = S.live[id], p = S.precios && S.precios.instrumentos && S.precios.instrumentos[id];
  if (v) return v.precio; if (p && p.precio) return p.precio;
  const c = catDe(S.inst[id]); if (c && c.p) return c.p;
  const r = radarPorSim(S.inst[id] && S.inst[id].yahoo); return r && r.pe ? r.pe : null;
}
function candidatosBusqueda() {
  const tengo = new Set(((S.cartera && S.cartera.posiciones) || []).map((p) => p.instrumento));
  const out = [];
  for (const id of S.instOrden) { const i = S.inst[id]; out.push({ k: 'inst:' + id, n: i.corto || i.nombre, l: i.nombre || '', s: i.yahoo || '', isin: i.isin || '', a: aliasDe(i.yahoo), dom: i.dominio, cot: cotiza(i), tengo: tengo.has(id), pr: () => precioInst(id) }); }
  const vistos = new Set(S.instOrden.map((id) => String(S.inst[id].yahoo || '').toUpperCase()).filter(Boolean));
  const isins = new Set(S.instOrden.map((id) => String(S.inst[id].isin || '').toUpperCase()).filter(Boolean));
  for (const [cid, x] of Object.entries((S.cat && S.cat.v) || {})) {
    if ((x.isin && isins.has(String(x.isin).toUpperCase())) || (x.s && vistos.has(String(x.s).toUpperCase()))) continue;
    out.push({ k: 'cat:' + cid, n: x.c || x.n, l: x.n, s: x.s || '', isin: x.isin || '', a: [...(x.a || []), ...aliasDe(x.s)], dom: x.dom, cot: x.cl === 'Cripto' ? { cod: null, txt: 'cripto, 24 h' } : { cod: x.pais, txt: /^Fondo/.test(x.t || '') ? `fondo${x.pais ? ' de ' + (PAISES[x.pais] || x.pais) : ''}` : x.t || '' }, pr: () => x.p });
    if (x.s) vistos.add(String(x.s).toUpperCase());
  }
  for (const x of [...radarVals(), ...((S.radar && S.radar.valores) || []).filter((y) => y.pd)]) if (x.s && !vistos.has(x.s.toUpperCase())) { const o = origenRadar(x); out.push({ k: 'radar:' + x.s, n: x.n, l: x.n, s: x.s, isin: '', a: aliasDe(x.s), dom: x.w, cot: { cod: o.bolsa || o.sede, txt: o.ciudad ? 'bolsa de ' + o.ciudad : x.z || '' }, pr: () => x.pe }); }
  return out;
}
// empresas que la gente busca por su nombre de siempre, no por el oficial (Inditex es «Industria de Diseño Textil»)
const NOMBRES_COMUNES = {
  'ITX.MC': ['inditex', 'zara'], GOOGL: ['google', 'youtube'], GOOG: ['google', 'youtube'], META: ['facebook', 'instagram', 'whatsapp'],
  'BRK-B': ['berkshire', 'buffett'], TSM: ['tsmc'], 'TEF.MC': ['telefonica', 'movistar'], 'CABK.MC': ['lacaixa', 'caixa'],
  'NOVO-B.CO': ['ozempic', 'novo'], NVO: ['ozempic', 'novo'], 'MC.PA': ['louisvuitton', 'vuitton'], 'OR.PA': ['loreal'], 'NESN.SW': ['nestle'],
  AAPL: ['iphone'], 'AIR.PA': ['airbus'], 'SAN.MC': ['santander'], 'BBVA.MC': ['bbva'], 'IBE.MC': ['iberdrola'], 'AMS.MC': ['amadeus'],
  'IAG.MC': ['iberia', 'vueling', 'britishairways'], 'ACS.MC': ['acs'], 'GRF.MC': ['grifols'], 'REP.MC': ['repsol'], 'ELE.MC': ['endesa'],
  'MAP.MC': ['mapfre'], 'NTGY.MC': ['naturgy', 'gasnatural'], 'FER.MC': ['ferrovial'], 'MRL.MC': ['merlin'], 'ANA.MC': ['acciona'],
};
const aliasDe = (sym) => NOMBRES_COMUNES[String(sym || '').toUpperCase()] || [];
// palabras que la gente escribe de otra forma que el nombre del fondo
const SINONIMOS_BUSCA = { plata: 'silver', platino: 'platinum', paladio: 'palladium', cobre: 'copper', mineras: 'miners', indexado: 'index', indice: 'index', mundial: 'world', mundo: 'world', emergentes: 'emerging', europa: 'europe', oro: 'gold', japon: 'japan', tecnologia: 'technology', tecnologicas: 'technology', bonos: 'bond', dividendos: 'dividend' };
function buscarEn(lista, q) {
  const t = normTxt(q), T = t.replace(/ /g, '');
  if (!t) return [];
  const sc = (c) => {
    const n = normTxt(c.n), l = normTxt(c.l), s = String(c.s || '').toLowerCase(), base = s.split('.')[0].split('-')[0], isin = String(c.isin || '').toLowerCase();
    if (isin && isin === T) return 100;
    if (base === T || s === T || (c.a || []).some((x) => String(x).toLowerCase() === T)) return 90;
    if (T.length >= 3 && (c.a || []).some((x) => String(x).toLowerCase().startsWith(T))) return 72;
    if (n === t) return 85;
    if (n.startsWith(t) || l.startsWith(t)) return 70;
    if (T.length >= 2 && base.startsWith(T)) return 55;
    if ((' ' + n + ' ' + l).includes(' ' + t)) return 50;
    // "SP500", "sp 500" o "S&P500" tienen que encontrar el "S&P 500": se compara también sin espacios
    const nC = n.replace(/ /g, ''), lC = l.replace(/ /g, '');
    if (T.length >= 3 && (nC.startsWith(T) || lC.startsWith(T))) return 48;
    if (t.length >= 4 && (n.includes(t) || l.includes(t))) return 35;
    if (T.length >= 4 && (nC.includes(T) || lC.includes(T))) return 33;
    const todo = n + ' ' + l, todoC = nC + ' ' + lC;
    const crudas = t.split(' ').filter((w) => w.length >= 2), ws = crudas.map((w) => SINONIMOS_BUSCA[w] || w);
    // «plata» encuentra «Physical Silver» aunque sea una sola palabra
    if ((ws.length > 1 || crudas.some((w) => SINONIMOS_BUSCA[w])) && ws.every((w) => todo.includes(w) || todoC.includes(w))) return 30;
    return 0;
  };
  return lista.map((c) => ({ c, p: sc(c) })).filter((x) => x.p > 0).map((x) => ({ c: x.c, p: x.p + (x.c.tengo ? 6 : 0) + (x.c.k.startsWith('inst:') ? 3 : 0) })).sort((a, b) => b.p - a.p).map((x) => x.c);
}
const idDeCandidato = (c) => (c.k.startsWith('inst:') ? c.k.slice(5) : c.k.startsWith('cat:') ? instDeCatalogo(c.k.slice(4)) : instDeRadar(c.k.slice(6)));
/* pinta un buscador en "cont"; al elegir llama a alElegir(idInstrumento) */
function buscador(cont, alElegir, opt = {}) {
  cont.innerHTML = `<div class="busca"><span class="busca-ico" aria-hidden="true">${SVG('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', 2)}</span><input type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="${esc(opt.placeholder || 'Busca por nombre, ticker o ISIN')}" aria-label="Buscar"><ul class="busca-res" role="listbox" hidden></ul></div>`;
  const inp = cont.querySelector('input'), ul = cont.querySelector('ul');
  const lista = (opt.lista || candidatosBusqueda()).filter((c) => !opt.soloTengo || c.tengo);
  let res = [], sel = 0;
  const fila = (c, i) => { const pr = c.pr && c.pr(); return `<li role="option" data-i="${i}" aria-selected="${i === sel}">${logo(c.dom, c.n)}<span class="busca-t"><b>${esc(c.n)}</b>${c.l && normTxt(c.l) !== normTxt(c.n) ? `<small class="busca-l">${esc(c.l)}</small>` : ''}<small>${bandera(c.cot.cod)}${esc(c.cot.txt || '')}${c.isin ? ` · ${esc(c.isin)}` : c.s ? ` · ${esc(c.s)}` : ''}</small></span><span class="busca-p">${pr ? precioFmt(pr) : ''}${c.tengo ? '<small>la tienes</small>' : ''}</span></li>`; };
  const pintarRes = () => {
    const q = inp.value.trim();
    if (!res.length && !q) { ul.hidden = true; return; }
    const isin = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/i.test(q.replace(/\s+/g, '')) && !res.some((c) => String(c.isin).toUpperCase() === q.replace(/\s+/g, '').toUpperCase());
    // un ticker que no sale (AGIO, BATS.L…): se ofrece añadirlo tal cual; GrowFolio pide su precio
    const tk = !opt.alCandidato && !isin && /^[A-Za-z][A-Za-z0-9]{0,6}([.-][A-Za-z]{1,3})?$/.test(q) && !res.some((c) => String(c.s).toUpperCase() === q.toUpperCase() || String(c.s).toUpperCase().split('.')[0] === q.toUpperCase() || normTxt(c.n).startsWith(normTxt(q)) || normTxt(c.l).startsWith(normTxt(q)) || (c.a || []).includes(normTxt(q).replace(/ /g, '')));
    ul.innerHTML = res.map(fila).join('') + (tk ? `<li role="option" data-ticker="${esc(q.toUpperCase())}">${logo(null, '+')}<span class="busca-t"><b>¿No sale? Añadir el ticker ${esc(q.toUpperCase())}</b><small>Por su ticker de Yahoo: GrowFolio pide su precio y lo tendrá en unos minutos</small></span></li>` : '') + (isin ? `<li role="option" data-isin="${esc(q.replace(/\s+/g, '').toUpperCase())}">${logo(null, '+')}<span class="busca-t"><b>${L(`Buscar el ISIN ${esc(q.replace(/\s+/g, '').toUpperCase())}`, `Look up ISIN ${esc(q.replace(/\s+/g, '').toUpperCase())}`)}</b><small>${L('No está en el catálogo: GrowFolio lo busca ahora y lo añade con su precio', "It's not in the catalog: GrowFolio looks it up now and adds it with its price")}</small></span></li>` : '')
      + (!res.length && !isin && q.length >= 2 ? `<li class="busca-nada">${L('No lo encuentro con ese nombre.', "Can't find it by that name.")}</li>` : '')
      + (!isin && q.length >= 2 ? `<li role="option" class="busca-isin" data-isin-form="1">${logo(null, '#')}<span class="busca-t"><b>${L('¿No lo encuentras? Añádelo con su ISIN', "Can't find it? Add it by its ISIN")}</b><small>${L('Sale en tu bróker: GrowFolio lo busca y lo añade solo', 'Your broker shows it: GrowFolio looks it up and adds it for you')}</small></span></li>` : '');
    ul.hidden = false;
  };
  const buscar = () => { res = inp.value.trim() ? buscarEn(lista, inp.value).slice(0, 8) : lista.filter((c) => c.tengo).slice(0, 8); sel = 0; pintarRes(); };
  const elegir = (li) => {
    if (!li) return;
    if (li.dataset.isin || li.dataset.isinForm) {
      ul.hidden = true; inp.blur();
      // encontrado: en Mercados se abre su consulta; al apuntar, queda elegido. Si no se encuentra, al apuntar se añade a mano
      const alListo = (cid) => {
        if (opt.alCandidato) { const c = candidatosBusqueda().find((x) => x.k === `cat:${cid}`); if (c) opt.alCandidato(c); return; }
        const id = instDeCatalogo(cid); if (id) alElegir(id);
      };
      anadirPorIsin(li.dataset.isin || '', alListo, opt.alCandidato ? null : (isin) => nuevoInstrumento((nid) => { if (nid) alElegir(nid); }, { isin }));
      return;
    }
    if (li.dataset.ticker) { ul.hidden = true; nuevoInstrumento((nid) => { if (nid) alElegir(nid); }, { yahoo: li.dataset.ticker }); return; }
    const c = res[+li.dataset.i]; if (!c) return;
    if (opt.alCandidato) { ul.hidden = true; inp.blur(); opt.alCandidato(c); return; }
    const id = idDeCandidato(c);
    ul.hidden = true; if (id) alElegir(id);
  };
  let t0; inp.addEventListener('input', () => { clearTimeout(t0); t0 = setTimeout(buscar, 90); });
  inp.addEventListener('focus', buscar);
  inp.addEventListener('blur', () => setTimeout(() => { ul.hidden = true; }, 180));
  inp.addEventListener('keydown', (e) => {
    const n = ul.querySelectorAll('li[role=option]').length;
    if (e.key === 'ArrowDown') { sel = Math.min(n - 1, sel + 1); pintarRes(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); pintarRes(); e.preventDefault(); }
    else if (e.key === 'Enter') { e.preventDefault(); elegir(ul.querySelectorAll('li[role=option]')[sel]); }
    else if (e.key === 'Escape') { ul.hidden = true; }
  });
  // se elige al soltar (con el dedo, al tocar sin arrastrar): antes se elegía al apoyar el dedo y, al intentar
  // deslizar la lista para buscar otro, se quedaba elegido el que hubiera debajo
  ul.addEventListener('mousedown', (e) => { if (e.target.closest('li[role=option]')) e.preventDefault(); });
  ul.addEventListener('click', (e) => { const li = e.target.closest('li[role=option]'); if (li) elegir(li); });
  if (opt.foco) setTimeout(() => inp.focus({ preventScroll: true }), 60);
  return inp;
}

