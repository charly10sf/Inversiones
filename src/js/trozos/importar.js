/* 0.6: leer capturas, PDF y extractos del bróker con GrowIA va en este trozo; emparejar lo leído con el catálogo, en el núcleo (30-importar.js) */
/* Extractos en CSV, TXT o Excel: se leen aquí como texto (el Excel con SheetJS, que solo se baja si hace falta)
   y van a GrowIA como texto; imágenes y PDF van tal cual. */
const ES_TEXTO = /\.(csv|tsv|txt|qif|ofx|json)$/i, ES_HOJA = /\.(xlsx|xlsm|xls|ods)$/i;
let xlsxCarga = null;
function cargarXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  const urls = ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'];
  const una = (u) => new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = u; sc.onload = () => (window.XLSX ? res(window.XLSX) : rej(new Error('vacío'))); sc.onerror = () => { sc.remove(); rej(new Error('sin red')); }; document.head.appendChild(sc); });
  return xlsxCarga || (xlsxCarga = una(urls[0]).catch(() => una(urls[1])).catch(() => { xlsxCarga = null; throw new Error('No se ha podido abrir el Excel (sin conexión). Prueba a exportarlo como CSV.'); }));
}
async function leerComoTexto(file) {
  const buf = await file.arrayBuffer();
  const t = new TextDecoder('utf-8').decode(buf), malas = (x) => (x.match(/\uFFFD/g) || []).length;
  if (!malas(t)) return t;
  const w = new TextDecoder('windows-1252').decode(buf);   // los CSV de bancos españoles suelen ir en Windows-1252
  return malas(w) < malas(t) ? w : t;
}
const MAX_TEXTO_EXTRACTO = 200000;
async function leerExtracto(file) {
  let texto = null;
  if (ES_HOJA.test(file.name)) {
    const X = await cargarXLSX();
    const wb = X.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    texto = wb.SheetNames.map((n) => `--- Hoja «${n}» ---\n` + X.utils.sheet_to_csv(wb.Sheets[n], { FS: ';', blankrows: false, dateNF: 'yyyy-mm-dd' })).join('\n');
  } else if (ES_TEXTO.test(file.name) || /^text\//.test(file.type)) texto = await leerComoTexto(file);
  if (texto == null) return leerArchivo(file);
  const cortado = texto.length > MAX_TEXTO_EXTRACTO;
  return { texto: cortado ? texto.slice(0, MAX_TEXTO_EXTRACTO) : texto, cortado, nombre: file.name, data: '' };
}
/* una imagen grande se reduce (así pesa menos y Gemini la lee igual) */
function leerArchivo(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error('No se pudo leer ' + file.name));
    fr.onload = () => {
      const url = fr.result;
      if (!/^image\//.test(file.type) || file.size < 450000) return res({ mime: file.type || 'application/pdf', data: String(url).split(',')[1], nombre: file.name });
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 2000 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res({ mime: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.86).split(',')[1], nombre: file.name });
      };
      img.onerror = () => res({ mime: file.type, data: String(url).split(',')[1], nombre: file.name });
      img.src = url;
    };
    fr.readAsDataURL(file);
  });
}
const PEDIDO_IMPORTAR = `Estos archivos son de un bróker, un banco o un exchange (MyInvestor, Trade Republic, Bitvavo, DEGIRO, Revolut, ING, Interactive Brokers, Indexa, Openbank, Santander, BBVA, CaixaBank, Renta 4, eToro, Coinbase, Binance, Kraken…): capturas de la app, PDF de extractos o informes fiscales, o exportaciones en CSV o Excel.
Saca de ellos:
1. "posiciones": TODAS las posiciones que se tienen ahora, si se ven (acciones, ETF, fondos, cripto, oro…).
2. "operaciones": si hay un listado de movimientos de inversión, cada uno: compras, ventas, suscripciones y reembolsos de fondos, traspasos entre fondos, dividendos e intereses. Ignora lo que no sea de inversiones (nóminas, recibos, tarjeta, bizum, transferencias entre cuentas).
3. "efectivo": el dinero disponible de cada cuenta, si se ve. En un extracto o una lista de movimientos de una cuenta, es el saldo más reciente (el que queda tras el último movimiento) y su fecha. No lo calcules sumando movimientos: si no viene el saldo, no lo pongas.
No inventes nada: si un dato no está, pon null. Si algo sale en varios archivos o varias veces, ponlo una sola vez. Fechas como AAAA-MM-DD. Importes en euros: si una operación va en otra moneda y viene su cambio a euros, usa el de euros; si no viene, pon la moneda en "moneda".
Responde solo con JSON, con números con punto decimal y sin símbolos:
{"plataforma": "nombre del bróker o banco si se reconoce o null",
 "posiciones": [{"nombre": "como aparece", "isin": "si se ve", "ticker": "si se ve", "tipo": "Acción|ETF|Fondo|Cripto|Oro|Otro", "cantidad": número de acciones, participaciones o unidades, "precio_medio": precio medio de compra por unidad en euros, "invertido": total invertido en euros, "valor": valor actual en euros, "plataforma": "app de esta posición si se distingue"}],
 "operaciones": [{"fecha": "AAAA-MM-DD", "tipo": "compra|venta|traspaso_entrada|traspaso_salida|dividendo|interes", "nombre": "", "isin": "", "ticker": "", "tipoActivo": "Acción|ETF|Fondo|Cripto|Oro|Otro", "cantidad": unidades (sin signo), "precio": precio por unidad, "importe": total en euros sin signo, ya con comisiones (en una compra, lo que salió de la cuenta; en una venta, lo que entró), "comisiones": comisiones y tasas en euros, "retencion": impuesto retenido en euros (dividendos e intereses), "moneda": "EUR si no se dice", "plataforma": ""}],
 "efectivo": [{"plataforma": "bróker o banco de esa cuenta", "importe": número, "fecha": "AAAA-MM-DD del saldo, si se ve"}]}`;
/* 0.3.11c: con varias capturas, cada una se lee por separado y luego se juntan. Todas en una sola petición, Gemini se
   saltaba posiciones o las repetía, la respuesta podía no caber y, si fallaba, fallaba todo. Lo que sale en dos
   capturas (una lista desplazada) cuenta una vez. Si Google pide esperar un momento (su límite por minuto), se
   espera en vez de pasar a un modelo peor. */
const partesDe = (archivos, varias) => [...archivos.map((a) => (a.texto != null ? { text: `Archivo «${a.nombre}»${a.cortado ? ' (cortado: es muy largo)' : ''}:\n${a.texto}` } : { inlineData: { mimeType: a.mime, data: a.data } })), { text: PEDIDO_IMPORTAR + (varias ? '\nEs uno de varios archivos de la misma persona que se leen por separado: saca solo lo que se vea en este, completo.' : '') }];
async function leerUnaVez(partes, alPaso, etq = '') {
  const cuerpo = (pensar) => ({ contents: [{ role: 'user', parts: partes }], generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 32768, ...(pensar ? { thinkingConfig: { thinkingLevel: 'low' } } : {}) } });
  let ultimo = null;
  for (const modelo of ordenIA(modeloVivo()).filter((m) => !agotadosIA().includes(m))) {
    let pensar = !!(MODELOS[modelo] && MODELOS[modelo].pensar);
    for (let intento = 0; intento < 3; intento++) {
      alPaso(`${etq}${L('Leyendo con', 'Reading with')} ${MODELOS[modelo].n}…`);
      let r;
      try { r = await fetchGoogle(`${GEMINI}/models/${modelo}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo(pensar)) }); }
      catch (e) { ultimo = new Error(L('No hay conexión con Google.', 'No connection to Google.')); break; }
      if (!r.ok) {
        let j = null; try { j = await r.json(); } catch (e) {}
        const e = errorGoogle(r.status, j);
        if (r.status === 400 && pensar && /thinking/i.test(e.msg || '')) { pensar = false; intento--; continue; }
        if (r.status === 429 && !e.diario && intento < 2) { const seg = Math.ceil(Math.min(60, e.espera || 15 * (intento + 1))); alPaso(`${etq}${L(`Google pide esperar ${seg} s (su límite por minuto)…`, `Google asks to wait ${seg} s (its per-minute limit)…`)}`); await dormir(seg * 1000); continue; }
        if (e.diario) marcarAgotado(modelo);
        ultimo = e;
        if ([429, 404, 500, 503].includes(r.status)) break;
        throw e;
      }
      const j = await r.json(), c = (j.candidates || [])[0] || {};
      const txt = ((c.content && c.content.parts) || []).map((x) => x.text || '').join('');
      const o = extraerJSON(txt);
      if (o && (Array.isArray(o.posiciones) || Array.isArray(o.operaciones))) { o.posiciones = o.posiciones || []; o.operaciones = o.operaciones || []; o.efectivo = o.efectivo || []; return o; }
      ultimo = new Error(c.finishReason === 'MAX_TOKENS' ? L('Hay demasiado en un solo archivo: súbelo por partes.', 'Too much in one file: upload it in parts.') : L('GrowIA no ha devuelto las posiciones. Prueba con capturas más nítidas.', 'GrowIA returned no positions. Try sharper screenshots.'));
      break;
    }
  }
  throw ultimo || new Error(L('No se pudo leer.', 'Could not read it.'));
}
// lo leído en cada archivo, junto: cada posición una vez (la que trae más datos, completada con la otra); cada
// operación, tantas veces como salga en el archivo que más veces la tenga (dos compras iguales el mismo día en una
// lista son dos; la misma compra en dos capturas que se solapan es una); el efectivo, el saldo más reciente
function juntarLecturas(lista) {
  const kAct = (x) => String(x.isin || '').toUpperCase().replace(/\s/g, '') || String(x.ticker || '').toUpperCase().trim() || normTxt(x.nombre || '');
  const llenos = (x) => Object.values(x).filter((v) => v != null && v !== '').length;
  const mezclar = (a, b) => { const [mas, menos] = llenos(a) >= llenos(b) ? [a, b] : [b, a]; const out = { ...menos }; for (const [k, v] of Object.entries(mas)) if (v != null && v !== '') out[k] = v; return out; };
  const pos = new Map(), ops = new Map(), ef = new Map();
  for (const o of lista) {
    for (const x of o.posiciones || []) { if (!x || !(x.nombre || x.isin || x.ticker)) continue; const k = `${kAct(x)}|${normTxt(x.plataforma || '')}`; pos.set(k, pos.has(k) ? mezclar(pos.get(k), x) : x); }
    const aqui = new Map();
    for (const x of o.operaciones || []) { if (!x) continue; const k = [x.fecha, String(x.tipo || '').toLowerCase(), kAct(x), +x.cantidad || 0, Math.round((+x.importe || 0) * 100)].join('|'); const v = aqui.get(k) || { x, n: 0 }; v.n++; aqui.set(k, v); }
    for (const [k, v] of aqui) { const y = ops.get(k); if (!y || v.n > y.n) ops.set(k, v); }
    for (const e of o.efectivo || []) { if (!e) continue; const k = normTxt(e.plataforma || '') || '?'; const y = ef.get(k); if (!y || String(e.fecha || '') > String(y.fecha || '')) ef.set(k, e); }
  }
  return { plataforma: (lista.find((o) => o.plataforma) || {}).plataforma || null, posiciones: [...pos.values()], operaciones: [...ops.values()].flatMap((v) => Array(v.n).fill(v.x)), efectivo: [...ef.values()] };
}
async function leerCapturas(archivos, alPaso) {
  if (archivos.length <= 1) return leerUnaVez(partesDe(archivos, false), alPaso);
  const leidos = [], fallos = [];
  for (let k = 0; k < archivos.length; k++) {
    try { leidos.push(await leerUnaVez(partesDe([archivos[k]], true), alPaso, `${k + 1} ${L('de', 'of')} ${archivos.length} · `)); }
    catch (e) { fallos.push({ n: archivos[k].nombre, e }); }
  }
  if (!leidos.length) throw fallos[0].e;
  const o = juntarLecturas(leidos);
  if (fallos.length) o.fallos = fallos.map((x) => x.n);
  return o;
}
/* De un listado de operaciones a posiciones: por cada cosa, sus compras como lotes (fecha y coste), las ventas por
   FIFO con su resultado (para Fiscalidad) y los traspasos entre fondos, que se llevan su coste y su antigüedad, como
   dice Hacienda. Los dividendos e intereses, sumados por año. */
const ORDEN_OP = { traspaso_salida: 0, compra: 1, traspaso_entrada: 2, venta: 3, dividendo: 4, interes: 4 };
function procesarOperaciones(ops, platGen) {
  const cache = new Map(), grupos = new Map(), dividendos = {}, pool = [];
  let sueltas = 0;
  const clave = (o) => String(o.isin || '').toUpperCase().replace(/\s/g, '') || String(o.ticker || '').toUpperCase().trim() || normTxt(o.nombre || '');
  const platDe = (o, i) => PLATAFORMAS.find((p) => normTxt(o.plataforma || '').includes(normTxt(p))) || o.plataforma || platGen || (i ? (i.clase === 'Cripto' ? 'Bitvavo' : /^Fondo/.test(i.tipo || '') ? 'MyInvestor' : 'Trade Republic') : 'Trade Republic');
  const lista = (ops || []).filter((o) => o && /^\d{4}-\d{2}-\d{2}$/.test(String(o.fecha || '')) && o.tipo)
    .map((o) => ({ ...o, tipo: String(o.tipo).toLowerCase().normalize('NFD').replace(/[^a-z_]/g, '') }))
    .filter((o) => o.tipo in ORDEN_OP)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : ORDEN_OP[a.tipo] - ORDEN_OP[b.tipo]));
  const ordena = (ls) => ls.sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : 0));
  for (const o of lista) {
    const imp = +o.importe > 0 ? +o.importe : null, uds = +o.cantidad > 0 ? +o.cantidad : null, com = +o.comisiones > 0 ? +o.comisiones : 0;
    if (o.tipo === 'dividendo' || o.tipo === 'interes') {
      if (!imp) continue;
      const d = (dividendos[o.fecha.slice(0, 4)] = dividendos[o.fecha.slice(0, 4)] || { bruto: 0, ret: 0, n: 0 });
      // 0.3.9: lo retenido fuera no se resta entero en la renta: como mucho, el 15 % del convenio sobre ese dividendo
      const ret = +o.retencion > 0 ? +o.retencion : 0, deFuera = /^[A-Z]{2}/.test(String(o.isin || '')) && !/^ES/i.test(String(o.isin || ''));
      d.bruto += imp; d.ret += deFuera ? Math.min(ret, imp * 0.15) : ret; d.n++;
      continue;
    }
    const k = clave(o);
    if (!uds || !k) { sueltas++; continue; }
    if (!cache.has(k)) cache.set(k, emparejar({ nombre: o.nombre, isin: o.isin, ticker: o.ticker, tipo: o.tipoActivo }));
    const m = cache.get(k), gk = m ? m.id : 'x:' + k;
    let g = grupos.get(gk);
    if (!g) { g = { id: m ? m.id : null, como: m ? m.como : null, x: { nombre: o.nombre, isin: o.isin, ticker: o.ticker, tipo: o.tipoActivo }, plat: platDe(o, m && S.inst[m.id]), lotes: [], ventas: [], compras: 0, falta: 0 }; grupos.set(gk, g); }
    if (o.moneda && String(o.moneda).toUpperCase() !== 'EUR') g.otraMoneda = String(o.moneda).toUpperCase();
    if (o.tipo === 'compra' || o.tipo === 'traspaso_entrada') {
      const j = o.tipo === 'traspaso_entrada' ? pool.findIndex((t) => diasEntre(t.f, o.fecha) >= 0 && diasEntre(t.f, o.fecha) <= 15) : -1;
      if (j >= 0) {
        // traspaso: las participaciones nuevas se quedan con el coste y las fechas de las que salieron
        const t = pool.splice(j, 1)[0], tot = sum(t.lotes, (l) => l.c) || 1;
        for (const l of t.lotes) g.lotes.push({ f: l.f, u: uds * (l.c / tot), c: l.c });
      } else {
        const c = imp ?? (+o.precio > 0 ? uds * +o.precio + com : null);
        if (c == null) { g.sinCoste = true; continue; }
        g.lotes.push({ f: o.fecha, u: uds, c });
      }
      ordena(g.lotes); g.compras++;
    } else {
      const r = fifo(g.lotes, uds);
      g.lotes = r.quedan;
      if (r.falta > 1e-6) g.falta += r.falta;
      if (o.tipo === 'traspaso_salida') { pool.push({ f: o.fecha, lotes: r.usados }); continue; }
      const neto = imp ?? (+o.precio > 0 ? uds * +o.precio - com : null), completa = !(r.falta > 1e-6) && neto != null;
      g.ventas.push({ fecha: o.fecha, uds, precio: +o.precio > 0 ? +o.precio : neto != null ? neto / uds : null, gastos: com, importe: neto, coste_vendido: completa ? r.coste : null, resultado: completa ? neto - r.coste : null, fifo: r.usados, completa });
    }
  }
  for (const g of grupos.values()) { g.cantidad = sum(g.lotes, (l) => l.u); g.coste = sum(g.lotes, (l) => l.c); g.desde = g.lotes.length ? g.lotes[0].f : null; }
  return { grupos: [...grupos.values()], dividendos, sueltas, total: lista.length, compras: lista.filter((o) => /compra|entrada/.test(o.tipo)).length, ventas: lista.filter((o) => o.tipo === 'venta').length, divs: lista.filter((o) => /dividendo|interes/.test(o.tipo)).length };
}
const ventaYaApuntada = (id, v) => (S.cartera.movimientos || []).some((m) => m.tipo === 'venta' && m.instrumento === id && m.fecha === v.fecha && Math.abs(+m.uds - v.uds) < 1e-6);
async function importarCapturas() {
  await cargarAsesor();
  if (!AS.clave) { toast('Para leer las capturas hace falta activar GrowIA (gratis, con tu clave de Google): te abro dónde ponerla', 5000); abrirAsesor(); return; }
  const instsAntes = new Set(S.instOrden), cambiadosAntes = S.instCambiados;
  let hecho = false, filas = [], efectivo = [], ventasImp = [], divsImp = [], resumenOps = null;
  const h = hoja('Importar de tu bróker o banco', `<div class="imp-cont">
      <p class="nota" style="margin:0">Sirve cualquier bróker, banco o exchange: capturas de la pantalla de posiciones, el PDF de un extracto o del informe fiscal, o la lista de movimientos exportada en CSV o Excel. GrowIA lo lee y aquí revisas lo que ha entendido antes de guardar nada. Con un listado de operaciones sabe además desde cuándo tienes cada cosa, lo que te costó cada compra y el resultado de tus ventas. Los archivos van de tu navegador a Google y no se guardan.</p>
      <label class="imp-sube"><input type="file" id="impArch" accept="image/*,application/pdf,.csv,.tsv,.txt,.xlsx,.xls,.ods,text/csv" multiple hidden><span class="imp-sube-c">${ICONOS.recorte}<b>Elegir capturas, PDF, CSV o Excel</b><small>Puedes elegir varios a la vez</small></span></label>
      <div id="impEstado" class="imp-estado" aria-live="polite"></div>
      <div id="impRev"></div>
    </div>`, () => {
    if (hecho) return;
    const usados = new Set((S.cartera.posiciones || []).map((p) => p.instrumento));
    const sobran = S.instOrden.filter((x) => !instsAntes.has(x) && !usados.has(x));
    for (const x of sobran) delete S.inst[x];
    S.instOrden = S.instOrden.filter((x) => !sobran.includes(x));
    S.instCambiados = cambiadosAntes;
  }, true);
  const estado = (t, mal) => { $('#impEstado', h.el).innerHTML = t ? `<span class="${mal ? 'down' : 'k'}">${esc(t)}</span>` : ''; };
  const pintarRev = () => {
    const rev = $('#impRev', h.el);
    if (!filas.length && !efectivo.length && !ventasImp.length && !divsImp.length) { rev.innerHTML = ''; return; }
    const plats = [...new Set([...PLATAFORMAS, ...filas.map((f) => f.plat), ...efectivo.map((e) => e.plat)].filter(Boolean))];
    const selPlat = (v, k) => `<select data-imp-plat="${k}">${plats.map((p) => `<option${p === v ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select>`;
    // el efectivo también se puede llevar a otra plataforma (un banco que no está en la lista se queda con su nombre)
    const selPlatEf = (v, k) => `<select data-imp-efplat="${k}" aria-label="${L('Plataforma', 'Platform')}">${plats.map((p) => `<option${p === v ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select>`;
    rev.innerHTML = `<h3 class="imp-tit">Esto es lo que he leído</h3><p class="nota" style="margin:0 0 10px">Revisa cada una: si alguna no está bien emparejada, tócala para cambiarla. Lo que no marques no se guarda.</p>
      <div class="imp-lista">${filas.map((f, k) => { const i = f.id && S.inst[f.id]; return `<div class="imp-f${f.ok ? '' : ' off'}">
        <label class="imp-ck"><input type="checkbox" data-imp-ok="${k}"${f.ok ? ' checked' : ''}${f.id ? '' : ' disabled'}></label>
        <div class="imp-c">
          ${i ? `<button type="button" class="imp-inst" data-imp-cambiar="${k}">${logo(i.dominio, i.corto || i.nombre)}<span class="busca-t"><b>${esc(etiquetaInst(i))}</b><small>${chipCotiza(i)}${f.como === 'nuevo' ? L(' · nuevo, por ISIN', ' · new, by ISIN') : ''}</small></span><span class="k">cambiar</span></button>` : `<div class="imp-sin" id="impBus${k}"></div>`}
          <small class="imp-leido" data-no-trad>${L('Leído', 'Read')}: ${esc(f.x.nombre || '?')}${f.x.isin ? ` · ${esc(f.x.isin)}` : ''}${f.x.valor ? ` · ${L('vale', 'worth')} ${eur(f.x.valor, 0)}` : ''}</small>
          ${f.g ? `<small class="imp-ops${f.cuadra ? '' : ' mal'}" data-no-trad>${f.cuadra ? `${ICONOS.ok}${L(`Desde el ${fechaLarga(f.desde)}, con ${f.g.compras} ${f.g.compras === 1 ? 'compra' : 'compras'}: guardo cada lote para calcular bien tus ventas.`, `Since ${fechaCortaL(f.desde)} ${f.desde.slice(0, 4)}, with ${f.g.compras} ${f.g.compras === 1 ? 'purchase' : 'purchases'}: I keep each lot so your sales come out right.`)}` : f.g.otraMoneda ? L(`Va en ${esc(f.g.otraMoneda)}: uso lo que tienes${f.desde ? ` y la fecha de tu primera compra (${fechaLarga(f.desde)})` : ''}.`, `It's in ${esc(f.g.otraMoneda)}: I use what you hold${f.desde ? ` and the date of your first purchase (${fechaCortaL(f.desde)} ${f.desde.slice(0, 4)})` : ''}.`) : L(`Las operaciones no cuadran con lo que tienes (faltará algún movimiento antiguo): uso lo que tienes${f.desde ? ` y la fecha de tu primera compra (${fechaLarga(f.desde)})` : ''}.`, `The transactions don't match what you hold (some older movement must be missing): I use what you hold${f.desde ? ` and the date of your first purchase (${fechaCortaL(f.desde)} ${f.desde.slice(0, 4)})` : ''}.`)}</small>` : ''}
          <div class="imp-num">${selPlat(f.plat, k)}<label>Cuántas<input inputmode="decimal" data-imp-uds="${k}" value="${f.uds != null ? String(f.uds).replace('.', ',') : ''}"></label><label>Invertido (€)<input inputmode="decimal" data-imp-inv="${k}" value="${f.inv != null ? String(+f.inv.toFixed(2)).replace('.', ',') : ''}"></label></div>
        </div></div>`; }).join('')}
      ${efectivo.map((e, k) => `<div class="imp-f${e.ok ? '' : ' off'}"><label class="imp-ck"><input type="checkbox" data-imp-ef="${k}"${e.ok ? ' checked' : ''}></label><div class="imp-c"><div class="imp-inst">${logo(null, '€')}<span class="busca-t"><b>${L('Efectivo', 'Cash')}</b><small>${e.fecha ? L(`saldo del ${fechaLarga(e.fecha)}`, `balance on ${fechaLarga(e.fecha)}`) : L('pasa a ser tu efectivo de', 'becomes your cash at')}</small></span><span>${eur(e.importe)}</span></div><div class="imp-num">${selPlatEf(e.plat, k)}</div></div></div>`).join('')}</div>
      ${ventasImp.length ? `<h3 class="imp-tit">Tus ventas</h3><p class="nota" style="margin:0 0 10px">Con su resultado por FIFO, como en la renta. Las marcadas van a tu historial y a Fiscalidad.</p>
        <div class="imp-lista">${ventasImp.map((v, k) => `<div class="imp-f${v.ok ? '' : ' off'}"><label class="imp-ck"><input type="checkbox" data-imp-v="${k}"${v.ok ? ' checked' : ''}${v.ya || !v.g.id ? ' disabled' : ''}></label><div class="imp-c"><div class="imp-vta"><span><b>${esc(v.g.id && S.inst[v.g.id] ? etiquetaInst(S.inst[v.g.id]) : v.g.x.nombre || '?')}</b><small data-no-trad>${L(`${fechaLarga(v.fecha)} · ${fmtNum(v.uds, 4)} por ${eur(v.importe, 2)}${v.ya ? ' · ya está en tu historial' : !v.g.id ? ' · empareja antes esta posición' : ''}`, `${fechaCortaL(v.fecha)} ${v.fecha.slice(0, 4)} · ${fmtNum(v.uds, 4)} for ${eur(v.importe, 2)}${v.ya ? ' · already in your history' : !v.g.id ? ' · match this position first' : ''}`)}</small></span><b class="${cls(v.resultado)}">${eurS(v.resultado, 0)}</b></div></div></div>`).join('')}</div>` : ''}
      ${divsImp.length ? `<h3 class="imp-tit">Dividendos e intereses</h3><div class="imp-lista">${divsImp.map((d, k) => `<div class="imp-f${d.ok ? '' : ' off'}"><label class="imp-ck"><input type="checkbox" data-imp-d="${k}"${d.ok ? ' checked' : ''}></label><div class="imp-c"><div class="imp-vta"><span data-no-trad><b>${d.anio}: ${eur(d.bruto, 2)} ${L('en bruto', 'gross')}</b><small>${L(`${d.n} ${d.n === 1 ? 'cobro' : 'cobros'}${d.ret ? ` · ${eur(d.ret, 2)} retenidos` : ''} · ${d.antes ? `en Fiscalidad tienes ${eur(d.antes, 2)}: lo cambio por esto` : 'lo apunto en los datos fiscales de ese año'}`, `${d.n} ${d.n === 1 ? 'payment' : 'payments'}${d.ret ? ` · ${eur(d.ret, 2)} withheld` : ''} · ${d.antes ? `Taxes has ${eur(d.antes, 2)}: I'll replace it with this` : "I'll add it to that year's tax data"}`)}</small></span></div></div></div>`).join('')}</div>` : ''}
      <div class="fila-btns"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="button" class="btn pri" id="impGuardar" data-no-trad>${L('Añadir', 'Add')} ${filas.filter((f) => f.ok).length + efectivo.filter((e) => e.ok).length + ventasImp.filter((v) => v.ok).length + divsImp.filter((d) => d.ok).length} ${L('a mi cartera', 'to my portfolio')}</button></div>`;
    filas.forEach((f, k) => { if (!f.id) buscador($(`#impBus${k}`, h.el), (nid) => { f.id = nid; f.ok = true; if (f.g) { f.g.id = nid; for (const v of ventasImp) if (v.g === f.g) { v.ya = ventaYaApuntada(nid, v); v.ok = !v.ya; } } pintarRev(); }, { placeholder: `¿Cuál es "${f.x.nombre || ''}"? Busca por nombre o ISIN` }); });
    for (const el of $$('[data-imp-v]', rev)) el.onchange = () => { ventasImp[+el.dataset.impV].ok = el.checked; pintarRev(); };
    for (const el of $$('[data-imp-d]', rev)) el.onchange = () => { divsImp[+el.dataset.impD].ok = el.checked; pintarRev(); };
    for (const el of $$('[data-imp-ok]', rev)) el.onchange = () => { filas[+el.dataset.impOk].ok = el.checked; pintarRev(); };
    for (const el of $$('[data-imp-ef]', rev)) el.onchange = () => { efectivo[+el.dataset.impEf].ok = el.checked; pintarRev(); };
    for (const el of $$('[data-imp-plat]', rev)) el.onchange = () => { filas[+el.dataset.impPlat].plat = el.value; };
    for (const el of $$('[data-imp-efplat]', rev)) el.onchange = () => { efectivo[+el.dataset.impEfplat].plat = el.value; };
    for (const el of $$('[data-imp-uds]', rev)) el.onchange = () => { filas[+el.dataset.impUds].uds = numero(el.value, true); };
    for (const el of $$('[data-imp-inv]', rev)) el.onchange = () => { filas[+el.dataset.impInv].inv = numero(el.value); };
    for (const el of $$('[data-imp-cambiar]', rev)) el.onclick = () => { const f = filas[+el.dataset.impCambiar]; f.id = null; f.ok = false; pintarRev(); };
    $('#impGuardar', h.el).onclick = guardar;
  };
  const guardar = async () => {
    let n = 0;
    for (const f of filas.filter((x) => x.ok && x.id)) {
      if (!(f.uds > 0) && !(f.x.valor > 0)) continue;
      const coste = f.inv > 0 ? f.inv : f.uds > 0 && f.x.precio_medio > 0 ? f.uds * f.x.precio_medio : f.x.valor || 0;
      const ya = S.cartera.posiciones.find((p) => p.instrumento === f.id && p.plataforma === f.plat);
      const o = { cantidad: f.uds > 0 ? f.uds : null, coste: +(+coste).toFixed(2), fecha: hoyIso() };
      if (o.cantidad == null) o.valor_ref = f.x.valor;
      if (f.desde) o.desde = f.desde;
      // con las operaciones cuadradas (y sin tocar las cifras), cada compra como su lote: así las ventas salen por FIFO
      const lotesOk = f.g && f.cuadra && Math.abs((f.uds || 0) - f.g.cantidad) <= Math.max(1e-6, f.g.cantidad * 0.02) && Math.abs((+f.inv || 0) - f.g.coste) <= Math.max(1, f.g.coste * 0.02);
      if (lotesOk) { o.lotes = f.g.lotes.map((l) => ({ f: l.f, u: +l.u.toFixed(8), c: +l.c.toFixed(2) })); o.cantidad = +sum(o.lotes, (l) => l.u).toFixed(8); o.coste = +sum(o.lotes, (l) => l.c).toFixed(2); }
      if (ya) { delete ya.lotes; delete ya.estimada; delete ya.valor_ref; Object.assign(ya, o); }
      else S.cartera.posiciones.push({ id: nuevoId('p-'), instrumento: f.id, plataforma: f.plat, ...o });
      n++;
    }
    for (const v of ventasImp.filter((x) => x.ok && x.g.id && !x.ya)) {
      const pos = S.cartera.posiciones.find((p) => p.instrumento === v.g.id && p.plataforma === v.g.plat);
      (S.cartera.movimientos = S.cartera.movimientos || []).push({ id: nuevoId('m-'), fecha: v.fecha, tipo: 'venta', instrumento: v.g.id, plataforma: v.g.plat, uds: +v.uds.toFixed(8), precio: v.precio != null ? +(+v.precio).toFixed(6) : null, gastos: +(v.gastos || 0).toFixed(2), importe: +v.importe.toFixed(2), coste_vendido: +v.coste_vendido.toFixed(2), resultado: +v.resultado.toFixed(2), fifo: v.fifo.map((l) => ({ f: l.f, u: +l.u.toFixed(8), c: +l.c.toFixed(2) })), importada: true, ...(pos ? { posicion: pos.id } : {}) });
      n++;
    }
    for (const d of divsImp.filter((x) => x.ok)) {
      S.cartera.fiscal = S.cartera.fiscal || {};
      S.cartera.fiscal[d.anio] = { ...(S.cartera.fiscal[d.anio] || {}), rcm: +d.bruto.toFixed(2), retenido: +d.ret.toFixed(2) };
      n++;
    }
    for (const e of efectivo.filter((x) => x.ok)) {
      S.cartera.efectivo = S.cartera.efectivo || [];
      const ya = S.cartera.efectivo.find((x) => x.plataforma === e.plat);
      if (ya) ya.importe = e.importe; else S.cartera.efectivo.push({ plataforma: e.plat, importe: e.importe });
      n++;
    }
    if (!n) { estado('No hay nada marcado para guardar.', true); return; }
    hecho = true;
    await guardarYPintar('Importar de tu bróker o banco', h);
    toast(`Listo: ${n} ${n === 1 ? 'cosa añadida' : 'cosas añadidas'}.${filas.some((f) => f.ok && !f.desde) ? ' Pon en cada ficha desde cuándo la tienes para ver cuánto te da al año.' : ''}`, 6000);
  };
  $('#impArch', h.el).onchange = async (ev) => {
    const files = [...ev.target.files].slice(0, 8);
    if (!files.length) return;
    try {
      estado(`Preparando ${files.length} ${files.length === 1 ? 'archivo' : 'archivos'}…`);
      const arch = await Promise.all(files.map(leerExtracto));
      if (arch.reduce((a, x) => a + (x.data || '').length + (x.texto || '').length, 0) > 18e6) throw new Error('Pesan demasiado: sube menos capturas o un PDF más pequeño.');
      if (arch.some((a) => a.cortado)) toast('Un archivo es muy largo: leo solo el principio. Si faltan cosas, súbelo por partes (por ejemplo, un año cada vez).', 6000);
      const o = await leerCapturas(arch, estado);
      const platGen = PLATAFORMAS.find((p) => normTxt(o.plataforma || '').includes(normTxt(p))) || (o.plataforma || null);
      filas = (o.posiciones || []).filter((x) => x && (x.nombre || x.isin)).map((x) => {
        const m = emparejar(x);
        const platX = PLATAFORMAS.find((p) => normTxt(x.plataforma || '').includes(normTxt(p))) || x.plataforma || platGen;
        const i = m && S.inst[m.id];
        const plat = platX || (i ? (i.clase === 'Cripto' ? 'Bitvavo' : /^Fondo/.test(i.tipo || '') ? 'MyInvestor' : 'Trade Republic') : 'Trade Republic');
        const uds = +x.cantidad > 0 ? +x.cantidad : null;
        const inv = +x.invertido > 0 ? +x.invertido : uds && +x.precio_medio > 0 ? uds * +x.precio_medio : null;
        return { x, id: m ? m.id : null, como: m ? m.como : null, ok: !!m, plat, uds, inv };
      });
      { const vistas = new Map(); filas = filas.filter((f) => { if (!f.id) return true; const k = `${f.id}|${f.plat}`, y = vistas.get(k); if (!y) { vistas.set(k, f); return true; } if (!(y.uds > 0) && f.uds > 0) y.uds = f.uds; if (!(y.inv > 0) && f.inv > 0) y.inv = f.inv; return false; }); }
      if (o.fallos && o.fallos.length) toast(L(`No he podido leer ${o.fallos.length === 1 ? 'un archivo' : `${o.fallos.length} archivos`} (${o.fallos.join(', ')}): súbelos otra vez luego. Lo demás está abajo.`, `Couldn't read ${o.fallos.length} file(s) (${o.fallos.join(', ')}): upload them again later. The rest is below.`), 7000);
      efectivo = (o.efectivo || []).filter((e) => e && +e.importe >= 0 && isFinite(+e.importe) && e.importe !== null).map((e) => ({ plat: PLATAFORMAS.find((p) => normTxt(e.plataforma || '').includes(normTxt(p))) || e.plataforma || platGen || 'Trade Republic', importe: +e.importe, fecha: /^\d{4}-\d{2}-\d{2}$/.test(String(e.fecha || '')) ? e.fecha : null, ok: true }));
      // las operaciones: lotes y fecha de cada posición, lo que solo sale en operaciones, las ventas y los dividendos
      const R = resumenOps = procesarOperaciones(o.operaciones, platGen);
      for (const f of filas) {
        const g = f.id && R.grupos.find((x) => x.id === f.id && !x.usado);
        if (!g) continue;
        g.usado = true; f.g = g; f.desde = g.desde;
        f.cuadra = !g.falta && !g.sinCoste && !g.otraMoneda && f.uds > 0 && Math.abs(g.cantidad - f.uds) <= Math.max(1e-6, f.uds * 0.02);
        if (f.cuadra) f.inv = g.coste;
      }
      for (const g of R.grupos) {
        if (g.usado || !(g.cantidad > 1e-6)) continue;
        const bien = !g.falta && !g.sinCoste && !g.otraMoneda;
        filas.push({ x: { nombre: g.x.nombre, isin: g.x.isin }, id: g.id, como: g.como, ok: !!g.id && bien, plat: g.plat, uds: +g.cantidad.toFixed(8), inv: +g.coste.toFixed(2), g, cuadra: bien, desde: g.desde });
      }
      ventasImp = R.grupos.flatMap((g) => g.ventas.filter((v) => v.completa && !g.otraMoneda).map((v) => { const ya = !!g.id && ventaYaApuntada(g.id, v); return { ...v, g, ya, ok: !!g.id && !ya }; }));
      divsImp = Object.entries(R.dividendos).filter(([a, d]) => d.bruto > 0 && +a >= new Date().getFullYear() - 1).map(([anio, d]) => ({ anio: +anio, ...d, antes: +(datosFiscales(+anio).rcm || 0), ok: +anio === new Date().getFullYear() })).sort((a, b) => b.anio - a.anio);
      const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`, en = IDIOMA === 'en';
      const ops = R.total ? ` ${en ? 'and' : 'y'} ${pl(R.total, L('operación', 'transaction'), L('operaciones', 'transactions'))} (${[R.compras && pl(R.compras, L('compra', 'purchase'), L('compras', 'purchases')), R.ventas && pl(R.ventas, L('venta', 'sale'), L('ventas', 'sales')), R.divs && pl(R.divs, L('dividendo o interés', 'dividend or interest'), L('dividendos o intereses', 'dividends or interest'))].filter(Boolean).join(', ')})` : '';
      const hay = filas.length || efectivo.length || ventasImp.length || divsImp.length;
      estado(hay ? `${L('He encontrado', 'I found')} ${pl(filas.length, L('posición', 'position'), L('posiciones', 'positions'))}${efectivo.length ? L(', efectivo', ', cash') : ''}${ops}.` : L('No he encontrado posiciones ni operaciones. Prueba con la pantalla donde se ven todas tus inversiones o con el extracto de movimientos.', "I didn't find any positions or transactions. Try the screen that shows all your investments, or the transaction statement."), !hay);
      pintarRev();
    } catch (e) { estado(e.message, true); }
    ev.target.value = '';
  };
}

