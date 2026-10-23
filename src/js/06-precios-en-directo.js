/* =====================================================================
   Precios en directo
   - Yahoo Finance (streaming): acciones, oro, índices, materias primas y divisas. Madrid va 15 min
     por detrás y Londres 20; las divisas y los futuros, casi al instante.
   - Bitvavo (WebSocket público): Bitcoin al instante.
   Los fondos no cotizan durante el día: su valor llega una vez al día con la Action.
   ===================================================================== */
const TD8 = new TextDecoder();
function decodificarPrecio(b64txt) {
  // Mensaje protobuf "PricingData" de Yahoo: solo leemos los campos que usamos
  const buf = b64.dec(b64txt);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const o = {};
  let i = 0;
  const varint = () => { let r = 0n, sh = 0n, b; do { b = buf[i++]; r |= BigInt(b & 0x7f) << sh; sh += 7n; } while (b & 0x80 && i < buf.length); return r; };
  while (i < buf.length) {
    const clave = Number(varint()); const campo = clave >> 3, tipo = clave & 7;
    if (tipo === 0) o[campo] = varint();
    else if (tipo === 1) { o[campo] = dv.getFloat64(i, true); i += 8; }
    else if (tipo === 2) { const n = Number(varint()); o[campo] = TD8.decode(buf.subarray(i, i + n)); i += n; }
    else if (tipo === 5) { o[campo] = dv.getFloat32(i, true); i += 4; }
    else break;
  }
  const zz = (v) => (typeof v === 'bigint' ? Number((v >> 1n) ^ -(v & 1n)) : null);
  return { id: o[1], price: o[2], time: zz(o[3]), currency: o[4], changePercent: o[8] };
}

/* la moneda en la que cotiza un ticker de Yahoo, por su terminación (sin terminación, EE. UU.: dólares) */
const MONEDA_SUFIJO = { L: 'GBp', MC: 'EUR', PA: 'EUR', DE: 'EUR', F: 'EUR', AS: 'EUR', MI: 'EUR', BR: 'EUR', LS: 'EUR', HE: 'EUR', VI: 'EUR', IR: 'EUR', MU: 'EUR', SG: 'EUR', BE: 'EUR', DU: 'EUR', HM: 'EUR', HA: 'EUR', SW: 'CHF', CO: 'DKK', ST: 'SEK', OL: 'NOK', T: 'JPY', TO: 'CAD', V: 'CAD', HK: 'HKD', AX: 'AUD' };
function monedaPorSufijo(sim) {
  const t = String(sim || '').toUpperCase().trim();
  if (!t || /[=^]/.test(t)) return null;
  const c = t.match(/-(EUR|USD|GBP)$/); if (c) return c[1];
  const m = t.match(/\.([A-Z]{1,3})$/);
  return m ? MONEDA_SUFIJO[m[1]] || null : 'USD';
}
function aEuros(p, moneda) {
  const fx = (S.precios && S.precios.fx) || {};
  const usd = S.fxVivo.USD || fx.USD, gbp = S.fxVivo.GBP || fx.GBP;
  if (!moneda || moneda === 'EUR') return p;
  if (moneda === 'USD') return usd ? p * usd : null;
  if (moneda === 'GBP') return gbp ? p * gbp : null;
  if (moneda === 'GBp' || moneda === 'GBX') return gbp ? (p / 100) * gbp : null;
  // el resto de monedas (francos suizos, coronas, yenes…), con el cambio del día de precios.json
  return fx[moneda] ? p * fx[moneda] : null;
}

const LIVE = {
  yahoo: 'off', bitvavo: 'off', wsY: null, wsB: null, mapaY: {}, mapaB: {}, mercY: new Set(), mercB: new Set(), radarY: new Set(), latido: null, esperaY: 1000, esperaB: 1000,
  mapas() {
    this.mapaY = {}; this.mapaB = {}; this.mercY = new Set(); this.mercB = new Set();
    const usados = new Set((S.cartera.posiciones || []).map((p) => p.instrumento));
    for (const i of Object.values(S.inst)) {
      if (!usados.has(i.id) || /^Fondo/.test(i.tipo || '')) continue;
      const sym = (S.precios && S.precios.instrumentos && S.precios.instrumentos[i.id] && S.precios.instrumentos[i.id].simbolo) || i.yahoo;
      if (i.clase === 'Cripto') { const m = i.bitvavo || (sym && /-EUR$/.test(sym) ? sym : null); if (m) this.mapaB[m] = i.id; continue; }
      if (sym) this.mapaY[sym] = i.id;
    }
    for (const sym of Object.keys((S.precios && S.precios.mercados) || {})) {
      if (/-EUR$/.test(sym)) this.mercB.add(sym); else this.mercY.add(sym);
    }
    this.radarY = new Set(simsRadarVivos());
  },
  iniciar() {
    this.mapas();
    if (CFG.dev) {
      // en pruebas no hay red: se simulan los precios desde la consola
      this.yahoo = 'ok';
      window.__tick = (sym, precio, variacion, moneda = 'EUR') => this.alPrecioYahoo({ id: sym, price: precio, changePercent: variacion, currency: moneda, time: Date.now() });
      return;
    }
    this.conectarYahoo();
    this.conectarBitvavo();
  },
  subs() { return [...new Set([...Object.keys(this.mapaY), ...this.mercY, ...this.radarY, 'EURUSD=X', 'EURGBP=X'])]; },
  conectarYahoo() {
    if (typeof WebSocket === 'undefined') return;
    const viejo = this.wsY; this.wsY = null; try { viejo && viejo.close(); } catch (e) {}
    let ws;
    try { ws = new WebSocket('wss://streamer.finance.yahoo.com/?version=2'); } catch (e) { return; }
    this.wsY = ws;
    ws.onopen = () => {
      this.yahoo = 'ok'; this.esperaY = 1000;
      const s = () => { try { ws.send(JSON.stringify({ subscribe: this.subs() })); } catch (e) {} };
      s(); clearInterval(this.latido); this.latido = setInterval(s, 15000);
      programarParche();
    };
    ws.onmessage = (e) => {
      let j; try { j = JSON.parse(e.data); } catch (err) { return; }
      if (!j || !j.message) return;
      let d; try { d = decodificarPrecio(j.message); } catch (err) { return; }
      this.alPrecioYahoo(d);
    };
    ws.onclose = () => {
      if (this.wsY !== ws) return;
      this.yahoo = 'off'; clearInterval(this.latido); programarParche();
      setTimeout(() => { if (this.wsY === ws) this.conectarYahoo(); }, this.esperaY);
      this.esperaY = Math.min(this.esperaY * 2, 60000);
    };
  },
  alPrecioYahoo(d) {
    if (!d || !d.id || !(d.price > 0)) return;
    const t = d.time || Date.now();
    if (this.mercY.has(d.id)) S.liveM[d.id] = { precio: d.price, var: d.changePercent != null ? d.changePercent : null, t };
    if (d.id === 'EURUSD=X') S.fxVivo.USD = 1 / d.price;
    if (d.id === 'EURGBP=X') S.fxVivo.GBP = 1 / d.price;
    if (this.radarY.has(d.id)) { S.liveR[d.id] = { p: d.price, v: d.changePercent != null ? d.changePercent : null, t }; S.liveRVer++; }
    const id = this.mapaY[d.id];
    if (id) {
      // la moneda buena es la de precios.json: Yahoo a veces manda ticks sin ella, y BAT (en peniques) salía
      // como si fueran euros, 100 veces más. Y por si acaso, un precio que se aleja más de 3 veces del
      // último cierre no se usa: ninguna acción hace eso en un día, es un dato roto.
      const P = S.precios && S.precios.instrumentos && S.precios.instrumentos[id];
      // las que añade cada uno (no están en precios.json): la moneda, de la ficha o del radar; si no, la del tick;
      // y si no viene, por la bolsa (Londres cotiza en peniques). El precio de referencia, el del radar en euros
      const i = S.inst[id], r = !P && i ? radarPorSim(i.yahoo || d.id) : null;
      const moneda = (P && P.moneda) || (i && i.moneda) || (r && r.m) || d.currency || monedaPorSufijo(d.id) || 'EUR';
      const precio = aEuros(d.price, moneda);
      const ref = P ? (P.cierre_anterior || P.precio) : r && r.pe;
      const roto = precio != null && ref > 0 && (precio / ref > 3 || precio / ref < 1 / 3);
      if (roto) console.warn('Precio descartado', d.id, d.price, d.currency, precio, ref);
      else if (precio != null) S.live[id] = { precio, var: d.changePercent != null ? d.changePercent : null, t, fuente: 'Yahoo Finance' };
    }
    programarParche();
  },
  conectarBitvavo() {
    const mercados = [...new Set([...Object.keys(this.mapaB), ...this.mercB])];
    if (!mercados.length || typeof WebSocket === 'undefined') return;
    const viejo = this.wsB; this.wsB = null; try { viejo && viejo.close(); } catch (e) {}
    let ws;
    try { ws = new WebSocket('wss://ws.bitvavo.com/v2/'); } catch (e) { return; }
    this.wsB = ws;
    ws.onopen = () => { this.bitvavo = 'ok'; this.esperaB = 1000; ws.send(JSON.stringify({ action: 'subscribe', channels: [{ name: 'ticker24h', markets: mercados }] })); programarParche(); };
    ws.onmessage = (e) => {
      let j; try { j = JSON.parse(e.data); } catch (err) { return; }
      if (!j || j.event !== 'ticker24h' || !Array.isArray(j.data)) return;
      for (const d of j.data) {
        const last = +d.last, open = +d.open;
        if (!(last > 0)) continue;
        const v = { precio: last, var: open > 0 ? (last / open - 1) * 100 : null, t: d.timestamp || Date.now(), fuente: 'Bitvavo' };
        const id = this.mapaB[d.market];
        if (id) S.live[id] = v;
        if (this.mercB.has(d.market)) S.liveM[d.market] = v;
      }
      programarParche();
    };
    ws.onclose = () => {
      if (this.wsB !== ws) return;
      this.bitvavo = 'off'; programarParche();
      setTimeout(() => { if (this.wsB === ws) this.conectarBitvavo(); }, this.esperaB);
      this.esperaB = Math.min(this.esperaB * 2, 60000);
    };
  },
  asegurar() {
    if (CFG.dev) return;
    if (!this.wsY || this.wsY.readyState > 1) this.conectarYahoo();
    if ((Object.keys(this.mapaB).length || this.mercB.size) && (!this.wsB || this.wsB.readyState > 1)) this.conectarBitvavo();
  },
  resuscribir() {
    this.mapas();
    if (CFG.dev) return;
    if (this.wsY && this.wsY.readyState === 1) { try { this.wsY.send(JSON.stringify({ subscribe: this.subs() })); } catch (e) {} }
    if (!this.wsB || this.wsB.readyState > 1) this.conectarBitvavo();
  },
};

/* arriba, solo la luz y dos palabras (antes una frase que se cortaba); el detalle de cada bolsa, al pasar el ratón
   o al tocarlo */
function estadoDirecto() {
  const conectado = LIVE.yahoo === 'ok' || LIVE.bitvavo === 'ok';
  const hace = S.precios && S.precios.generado ? haceCuanto(S.precios.generado) : '';
  // el texto largo (ordenador) y, para cuando no cabe, uno corto en dos líneas: «Bolsa / abierta»
  const pon = (txt, cls, corto) => ({ txt, cls, html: `<span class="est-l">${esc(trad(txt))}</span><span class="est-c" aria-hidden="true"><small>${esc(L('Bolsa', 'Market'))}</small><b>${esc(corto)}</b></span>` });
  if (!conectado) return pon(hace ? hace.replace(/^./, (c) => c.toUpperCase()) : 'Sin conexión', 'off', L('sin datos', 'offline'));
  if (BOLSAS_MUNDO.filter((b) => ['mad', 'lon', 'us'].includes(b.k)).some((b) => estadoBolsa(b).on)) return pon('En directo', 'on', L('abierta', 'open'));
  return pon('Bolsas cerradas', 'cerr', L('cerrada', 'closed'));
}
// las principales bolsas, con su horario (y sus festivos, los que hay apuntados) en hora de España
const BOLSAS_MUNDO = [
  { k: 'mad', n: 'Madrid', tz: 'Europe/Madrid', abre: 540, cierra: 1050 },
  { k: 'fra', n: 'Fráncfort', tz: 'Europe/Berlin', abre: 540, cierra: 1050 },
  { k: 'eur', n: 'París y Ámsterdam', tz: 'Europe/Paris', abre: 540, cierra: 1050 },
  { k: 'lon', n: 'Londres', tz: 'Europe/London', abre: 480, cierra: 990 },
  { k: 'us', n: 'Nueva York', tz: 'America/New_York', abre: 570, cierra: 960 },
  { k: 'tok', n: 'Tokio', tz: 'Asia/Tokyo', abre: 540, cierra: 930 },
  { k: 'hk', n: 'Hong Kong', tz: 'Asia/Hong_Kong', abre: 570, cierra: 960 },
];
function partesTz(tz, d = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const g = (t) => (p.find((x) => x.type === t) || {}).value;
  return { fecha: `${g('year')}-${g('month')}-${g('day')}`, dow: g('weekday'), min: +g('hour') * 60 + +g('minute') };
}
function estadoBolsa(b) {
  try {
    const t = partesTz(b.tz), fest = (d) => AG_CIERRES.find(([x, donde]) => x === d && donde.split(' ').includes(b.k));
    const med = AG_MEDIAS.find(([x, bo, m]) => x === t.fecha && bo === b.k && m != null), cierra = med ? med[2] : b.cierra;
    const hm = (d, m) => horaEspana(d, b.tz, Math.floor(m / 60), m % 60) || '';
    const finde = (d) => { const x = new Date(d + 'T12:00:00Z').getUTCDay(); return x === 0 || x === 6; };
    const hoyF = fest(t.fecha);
    if (!finde(t.fecha) && !hoyF && t.min >= b.abre && t.min < cierra) return { on: true, txt: `abierta, cierra a las ${hm(t.fecha, cierra)}${med ? ` (media sesión por ${med[3]})` : ''}` };
    for (let k = 0; k < 10; k++) {
      const x = new Date(t.fecha + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + k);
      const d = x.toISOString().slice(0, 10);
      if (finde(d) || fest(d) || (k === 0 && t.min >= b.abre)) continue;
      const medD = AG_MEDIAS.find(([x, bo, m]) => x === d && bo === b.k && m != null);
      // hoy, mañana o el día de la semana, contados con la fecha de España (no la de esa bolsa)
      const dEs = diaEspana(d, b.tz, Math.floor(b.abre / 60), b.abre % 60), hoyEs = hoyIso(), dif = diasEntre(hoyEs, dEs);
      const cuando = dif <= 0 ? 'hoy' : dif === 1 ? 'mañana' : `el ${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][new Date(dEs + 'T12:00:00Z').getUTCDay()]}`;
      return { on: false, txt: `${hoyF ? `cerrada por ${hoyF[2]}` : 'cerrada'}, abre ${cuando} a las ${hm(d, b.abre)}${medD ? ` (solo hasta las ${hm(d, medD[2])})` : ''}` };
    }
  } catch (e) {}
  return { on: false, txt: 'cerrada' };
}
function htmlBolsasPanel() {
  const conectado = LIVE.yahoo === 'ok' || LIVE.bitvavo === 'ok';
  const hace = S.precios && S.precios.generado ? haceCuanto(S.precios.generado) : '';
  const tuyas = new Set(((S.M && S.M.filas) || []).map((f) => bolsaDe(f.inst)).filter(Boolean));
  return `<div class="bp-cab"><b>Las bolsas ahora</b><small>en hora de España</small></div>
    <ul class="bp-l">${BOLSAS_MUNDO.map((b) => { const e = estadoBolsa(b); return `<li class="${e.on ? 'on' : ''}"><i class="bp-led" aria-hidden="true"></i><span class="bp-n">${esc(b.n)}${tuyas.has(b.k) ? '<em>tienes algo</em>' : ''}</span><span class="bp-t">${esc(e.txt)}</span></li>`; }).join('')}
      <li class="${LIVE.bitvavo === 'ok' ? 'on' : ''}"><i class="bp-led" aria-hidden="true"></i><span class="bp-n">Bitcoin y cripto</span><span class="bp-t">abiertas siempre${LIVE.bitvavo === 'ok' ? ', en directo' : ''}</span></li></ul>
    <p class="bp-pie">${conectado ? 'Precios en directo de Yahoo Finance y Bitvavo mientras las bolsas están abiertas.' : `Ahora no llega el directo: los precios son de ${esc(hace || 'la última actualización')}.`}</p>`;
}
