/* =====================================================================
   Cartera desde un archivo: vale la copia de la web tal cual o un JSON sencillo, con el ISIN, el ticker o
   el nombre de cada cosa en vez del id interno. La web busca cada valor (lo tuyo, el catálogo, el radar,
   cripto) y lo que no reconoce lo deja fuera y lo dice.
   ===================================================================== */
const EJEMPLO_CARTERA = {
  posiciones: [
    { isin: 'IE00BYX5MX67', nombre: 'Fidelity S&P 500 Index Fund EUR P Acc', plataforma: 'MyInvestor', cantidad: 63.77551, coste: 1000, fecha: '2026-05-15' },
    { ticker: 'AAPL', plataforma: 'Trade Republic', cantidad: 2, precio_medio: 210.5, fecha: '2026-03-02' },
    { nombre: 'Bitcoin', plataforma: 'Bitvavo', cantidad: 0.01, coste: 600 },
  ],
  efectivo: [{ plataforma: 'Trade Republic', importe: 250 }],
};
function normalizarCartera(j) {
  if (Array.isArray(j)) j = { posiciones: j };
  if (!j || !Array.isArray(j.posiciones)) throw new Error('Falta la lista "posiciones".');
  for (const i of j.inst_propios || []) if (i && i.id && !S.inst[i.id]) { S.inst[i.id] = i; S.instOrden.push(i.id); }
  const n = (v) => { if (v == null || v === '') return null; const x = typeof v === 'number' ? v : numero(v); return isFinite(x) ? x : null; };
  const fechaOk = (f) => (/^\d{4}-\d{2}-\d{2}$/.test(String(f || '')) ? String(f) : /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(f || '')) ? String(f).split('/').reverse().map((x) => x.padStart(2, '0')).join('-') : null);
  const posiciones = [], fuera = [];
  for (const x of j.posiciones) {
    if (!x || typeof x !== 'object') continue;
    let id = x.instrumento && S.inst[x.instrumento] ? x.instrumento : null;
    if (!id) {
      const m = emparejar({ isin: x.isin, ticker: x.ticker || x.simbolo, nombre: x.nombre || x.instrumento || '', tipo: x.tipo });
      id = m && m.id;
    }
    if (!id) { fuera.push(x.nombre || x.isin || x.ticker || x.instrumento || '¿?'); continue; }
    const uds = n(x.cantidad ?? x.participaciones ?? x.acciones ?? x.unidades ?? x.uds);
    const pm = n(x.precio_medio ?? x.precio);
    let coste = n(x.coste ?? x.invertido ?? x.importe ?? x.total);
    if (coste == null && uds != null && pm != null) coste = +(uds * pm).toFixed(2);
    if (uds == null && coste == null) { fuera.push((x.nombre || x.isin || x.ticker || id) + ' (sin cantidad ni importe)'); continue; }
    const f = fechaOk(x.fecha ?? x.fecha_compra ?? x.desde);
    const pos = { ...x, id: x.id || nuevoId('p-'), instrumento: id, plataforma: x.plataforma || x.broker || 'Otra', cantidad: uds, coste: coste ?? 0, fecha: fechaOk(x.fecha) || hoyIso() };
    for (const k of ['isin', 'ticker', 'simbolo', 'nombre', 'participaciones', 'acciones', 'unidades', 'uds', 'precio_medio', 'precio', 'invertido', 'importe', 'total', 'broker', 'fecha_compra', 'tipo']) delete pos[k];
    if (f && !x.lotes) { pos.desde = f; pos.fecha = f; if (uds) pos.lotes = [{ f, u: uds, c: coste ?? 0 }]; }
    posiciones.push(pos);
  }
  let efectivo = j.efectivo || [];
  if (!Array.isArray(efectivo)) efectivo = Object.entries(efectivo).map(([plataforma, importe]) => ({ plataforma, importe }));
  efectivo = efectivo.map((e) => ({ plataforma: e.plataforma || e.broker || 'Otra', importe: n(e.importe) || 0 })).filter((e) => e.importe);
  const cartera = { version: 1, aportaciones: [], limite_acciones: 20, ...j, posiciones, efectivo };
  return { cartera, fuera };
}
const resumenImport = (r) => `${r.cartera.posiciones.length} posiciones${r.cartera.efectivo.length ? ` y efectivo en ${r.cartera.efectivo.length} sitio${r.cartera.efectivo.length > 1 ? 's' : ''}` : ''}.${r.fuera.length ? ` No reconozco ${r.fuera.length}: ${r.fuera.slice(0, 4).join(', ')}${r.fuera.length > 4 ? '…' : ''}. Añádelas luego a mano o pon su ISIN en el archivo.` : ' Todo reconocido.'}`;

/* las empresas que da de alta alguien sin GitHub van dentro de su cartera cifrada (no en instrumentos.json) */
function instPropios() {
  const comunes = new Set(((S.instJson && S.instJson.instrumentos) || []).map((i) => i.id));
  return S.instOrden.filter((id) => !comunes.has(id)).map((id) => S.inst[id]);
}
function sumarInstPropios() {
  for (const i of (S.cartera && S.cartera.inst_propios) || []) {
    if (!i || !i.id) continue;
    // si el dueño de la web la ha añadido a la lista común (con precio diario de la Action), se usa esa
    const comun = S.instOrden.find((id) => { const c = S.inst[id]; return id !== i.id && c && ((i.isin && c.isin === i.isin) || (i.yahoo && c.yahoo && c.yahoo.toUpperCase() === i.yahoo.toUpperCase())); });
    if (comun) {
      for (const lista of [S.cartera.posiciones, S.cartera.aportaciones, S.cartera.movimientos]) for (const x of lista || []) if (x.instrumento === i.id) x.instrumento = comun;
      continue;
    }
    if (!S.inst[i.id]) { S.inst[i.id] = i; S.instOrden.push(i.id); }
  }
}
async function guardarLocal(interactivo) {
  S.cartera.inst_propios = instPropios();
  S.cartera.actualizado = new Date().toISOString();
  const texto = await cifrar(S.cartera);
  if (PERFIL_CUENTA) {
    // primero en el dispositivo y luego a la cuenta; si no hay conexión, se sube al volver a entrar
    cacheCuenta.set(texto); S.enc = { texto, sha: null }; S.instCambiados = false;
    LS.set('inv-pend-cuenta', true); S.cuentaOk = false;
    try {
      await fbCargar(); if (!FB.user) throw new Error('sin sesión');
      if (!S.cuentaLeida) throw new Error('la cuenta aún no se ha podido leer');
      // la primera cartera de una cuenta: antes de escribir, comprobar que de verdad está vacía
      if (S.cuentaNueva) { const d = await conTiempo(leerCuenta(), 12000); if (d && d.enc) { LS.del('inv-cuenta-enc'); LS.del('inv-pend-cuenta'); toast('Tu cuenta ya tenía una cartera: la abro', 5000); setTimeout(() => location.reload(), 1200); return false; } }
      // lo que guardas tú (un formulario) pregunta si choca con otro dispositivo; lo automático, no
      S.preguntarConflicto = !!interactivo;
      await conTiempo(subirPendiente(), navigator.onLine === false ? 0 : 8000);
      if (!LS.get('inv-pend-cuenta')) S.cuentaNueva = false;
    } catch (e) { console.warn('Aún no se ha subido a la cuenta', e); if (!S.subidaParada) { S.toastPend = true; reintentarSubida(); } }
    return true;
  }
  LS.set('inv-local-enc', texto); S.enc = { texto, sha: null }; S.instCambiados = false;
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  return true;
}
async function guardarCartera(mensaje) {
  if (PERFIL_LOCAL) {
    await guardarLocal(true); const ok = !PERFIL_CUENTA || !LS.get('inv-pend-cuenta');
    // con la subida parada ya hay un aviso que explica por qué: no se tapa
    if (!ok && S.subidaParada) return true;
    toast(!PERFIL_CUENTA ? 'Guardado en este dispositivo' : ok ? 'Guardado en tu cuenta' : 'Guardado en este dispositivo: se subirá a tu cuenta en cuanto haya conexión', ok ? undefined : 6000); return true;
  }
  S.cartera.actualizado = new Date().toISOString();
  const texto = await cifrar(S.cartera);
  if (CFG.dev) { LS.set('inv-dev-enc', texto); S.enc = { texto, sha: null }; toast('Guardado (modo pruebas)'); return true; }
  try {
    if (S.instCambiados) {
      const j = { ...S.instJson, instrumentos: S.instOrden.map((id) => S.inst[id]) };
      await GH.escribir('instrumentos.json', JSON.stringify(j, null, 2) + '\n', 'Instrumentos: ' + mensaje);
      S.instJson = j; S.instCambiados = false;
    }
    const sha = await GH.escribir('cartera.enc.json', texto, mensaje);
    S.enc = { texto, sha }; LS.set('inv-cache-enc', texto); LS.del('inv-pend-enc');
    toast('Guardado en GitHub');
    return true;
  } catch (e) {
    console.warn(e);
    // se queda guardado en este dispositivo y, al volver a entrar, manda sobre lo de GitHub si es más nuevo
    S.enc = { texto, sha: S.enc && S.enc.sha }; LS.set('inv-cache-enc', texto); LS.set('inv-pend-enc', texto);
    // en la app de Android no se pueden descargar archivos (salía el aviso de Android): solo se explica
    if (window.InversionesApp) { toast(e.message === 'sin-token' ? 'Guardado en este móvil. Para que llegue a GitHub y al ordenador, pon el token en Ajustes, Avanzado: se sube solo al volver a entrar.' : `Guardado en este móvil, pero no en GitHub (${e.message}). Se subirá la próxima vez que entres.`, 8000); return true; }
    descargar('cartera.enc.json', texto);
    if (S.instCambiados) descargar('instrumentos.json', JSON.stringify({ ...S.instJson, instrumentos: S.instOrden.map((id) => S.inst[id]) }, null, 2) + '\n');
    toast(e.message === 'sin-token' ? 'Sin token: te he descargado el archivo cifrado. Súbelo al repositorio.' : `No se pudo guardar en GitHub (${e.message}). Te he descargado el archivo.`, 7000);
    return true;
  }
}

function descargar(nombre, texto) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  a.download = nombre; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function nuevoInstrumento(fin, ini = {}) {
  const h = hoja('Nuevo instrumento', `<form id="fInst" style="display:grid;gap:12px">
    <p class="nota" style="margin:0">${PERFIL_CUENTA ? 'Se guarda en tu cartera. Si GrowFolio aún no la sigue, pide su precio: en la próxima actualización (unos 20 minutos con la bolsa abierta) tendrá precio diario, gráfica y cambio a euros.' : PERFIL_LOCAL ? 'Se guarda en tu cartera. Si no está en la lista común no tendrá precio diario: pon su valor en la posición, o pide a quien te pasó GrowFolio que lo añada.' : 'Se añade a <code>instrumentos.json</code> (público, sin cantidades). La Action buscará su precio en Yahoo Finance en un par de minutos.'}</p>
    <div class="form-grid">
      <label class="campo">Nombre<input name="nombre" required></label>
      <label class="campo">Nombre corto<input name="corto" required maxlength="24"></label>
      <label class="campo">ISIN<input name="isin" maxlength="12" placeholder="ES0177542018" value="${esc(ini.isin || '')}"></label>
      <label class="campo">Ticker de Yahoo<input name="yahoo" placeholder="IAG.MC" value="${esc(ini.yahoo || '')}"><small>Como sale en finance.yahoo.com: AGIO, IAG.MC, BATS.L… Opcional si pones el ISIN.</small></label>
      <label class="campo">Tipo<select name="tipo"><option>Acción</option><option>Fondo indexado</option><option>Fondo de renta fija</option><option>ETF</option><option>ETC</option><option>Cripto</option></select></label>
      <label class="campo">Clase<select name="clase"><option>Renta variable</option><option>Renta fija</option><option>Oro</option><option>Cripto</option><option>Monetario</option></select></label>
      <label class="campo">Región<select name="region"><option>Europa</option><option>EEUU</option><option>Emergentes</option><option>Japón y Pacífico</option><option>Global</option></select></label>
      <label class="campo">Gastos TER (%)<input name="ter" inputmode="decimal" placeholder="solo fondos y ETF"></label>
      <label class="campo">Web de la empresa<input name="dominio" placeholder="repsol.com"><small>Para poner su logo.</small></label>
      <label class="campo">País<select name="pais"><option value="">Sin país</option>${Object.entries(PAISES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
    </div>
    <div class="error" id="errI" style="text-align:left"></div>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>Cancelar</button><button class="btn pri" type="submit">Añadir</button></div></form>`, () => fin(null));
  if (ini.isin && /^(IE|LU|ES|FR|DE)/i.test(ini.isin)) { const sel = $('#fInst [name=tipo]', h.el); if (sel) sel.value = 'Fondo indexado'; }
  // con el ticker, la región y el país salen de dónde cotiza (AGIO: EE. UU.; IAG.MC: España; BATS.L: Reino Unido)
  if (ini.yahoo) {
    const m = monedaPorSufijo(ini.yahoo), t = String(ini.yahoo).toUpperCase();
    const reg = m === 'USD' ? 'EEUU' : m === 'JPY' || m === 'AUD' || m === 'HKD' ? 'Japón y Pacífico' : 'Europa';
    const pais = m === 'USD' ? 'US' : /\.MC$/.test(t) ? 'ES' : /\.L$/.test(t) ? 'GB' : /\.(DE|F)$/.test(t) ? 'DE' : /\.PA$/.test(t) ? 'FR' : /\.AS$/.test(t) ? 'NL' : /\.MI$/.test(t) ? 'IT' : '';
    const r = $('#fInst [name=region]', h.el), ps = $('#fInst [name=pais]', h.el);
    if (r) r.value = reg; if (ps && pais && [...ps.options].some((o) => o.value === pais)) ps.value = pais;
  }
  $('#fInst', h.el).onsubmit = (ev) => {
    ev.preventDefault();
    const g = (n) => ev.target.querySelector(`[name="${n}"]`).value.trim();
    if (!g('isin') && !g('yahoo')) { $('#errI', h.el).textContent = 'Pon el ISIN o el ticker de Yahoo.'; return; }
    let id = (g('corto') || g('nombre')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'inst';
    while (S.inst[id]) id += '-2';
    const inst = { id, nombre: g('nombre'), corto: g('corto'), tipo: g('tipo'), clase: g('clase'), region: { [g('region')]: 100 } };
    if (g('isin')) inst.isin = g('isin').toUpperCase();
    if (g('yahoo')) inst.yahoo = g('yahoo');
    const ter = numero(g('ter')); if (ter != null && !Number.isNaN(ter)) inst.ter = ter;
    const dom = dominioWeb(g('dominio')); if (dom) inst.dominio = dom;
    if (g('pais')) inst.pais = g('pais');
    if (inst.yahoo && /\.MC$/i.test(inst.yahoo)) inst.mercado = 'Madrid'; else if (inst.yahoo && /\.L$/i.test(inst.yahoo)) inst.mercado = 'Londres';
    if (['Oro', 'Materias primas', 'Cripto', 'Renta fija', 'Monetario'].includes(inst.clase)) inst.sector_fijo = inst.clase;
    if (inst.clase === 'Cripto' && inst.yahoo && /-EUR$/i.test(inst.yahoo)) inst.bitvavo = inst.yahoo.toUpperCase();
    // la moneda, por la terminación del ticker: sin ella, el precio en directo de Agios (en dólares) salía en euros
    if (inst.yahoo && inst.clase !== 'Cripto') { const m = monedaPorSufijo(inst.yahoo); if (m) inst.moneda = m; }
    S.inst[id] = inst; S.instOrden.push(id); S.instCambiados = true;
    pedirPrecio(inst);
    const finalizar = fin; fin = () => {}; h.cerrar(); finalizar(id);
  };
}

/* Lo que alguien mete a mano y GrowFolio no sigue (no está en la lista del dueño, ni en el catálogo, ni entre las
   empresas del radar): se apunta su ticker o su ISIN en la lista común «simbolos» de Firestore, sin decir quién lo
   pide. La Action la lee en cada pasada y le saca precio, moneda, gráfica y cambio a euros para todos. */
function sinPrecioComun(i) {
  if (!i) return false;
  const P = S.precios && S.precios.instrumentos && S.precios.instrumentos[i.id], ce = catDe(i);
  // lo añadido con su ISIN en este dispositivo (catálogo «local») aún no lo tienen los demás: se sigue pidiendo
  return !(P && P.precio) && !(ce && !ce.local) && !radarPorSim(i.yahoo) && !!(i.yahoo || i.isin);
}
async function pedirComun(clave, s, isin) {
  if (!PERFIL_CUENTA) return;
  clave = String(clave || '').toUpperCase().trim();
  if (!/^[A-Z0-9][A-Z0-9.\-]{0,19}$/.test(clave)) return;
  const hechos = LS.get('inv-pedidos', {});
  if (hechos[clave] && Date.now() - hechos[clave] < 3 * 864e5) return;
  try {
    await fbCargar(); if (!FB.user) return;
    await FB.fs.setDoc(FB.fs.doc(FB.db, 'simbolos', clave), { s: s ? String(s).toUpperCase() : '', isin: isin ? String(isin).toUpperCase() : '', cuando: FB.fs.serverTimestamp() });
  } catch (e) { /* ya estaba pedida (no se puede reescribir) o sin red: no pasa nada */ }
  hechos[clave] = Date.now(); LS.set('inv-pedidos', hechos);
}
// fondos, ETF y ETC con ISIN van al catálogo (por su ISIN); las acciones y lo que no tiene ISIN, al radar (por su ticker)
async function pedirPrecio(i) {
  if (!PERFIL_CUENTA || !i || !sinPrecioComun(i)) return;
  const alRadar = (i.tipo === 'Acción' && i.yahoo) || !i.isin;
  return alRadar ? pedirComun(i.yahoo || i.isin, i.yahoo || '', i.isin || '') : pedirComun(i.isin, '', i.isin);
}

