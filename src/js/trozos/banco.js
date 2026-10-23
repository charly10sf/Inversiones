const BANCO = { estado: null, sincT: 0, enCurso: false, avisado: new Set() };
const BANCO_CADA_H = 4;
async function workerPide(ruta, cuerpo) {
  if (!urlWorker() || !FB.user) throw new Error('sin-worker');
  const t = await FB.user.getIdToken();
  const r = await fetch(urlWorker() + ruta, { method: cuerpo ? 'POST' : 'GET', headers: { Authorization: `Bearer ${t}`, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || `http ${r.status}`); e.j = j; e.status = r.status; throw e; }
  return j;
}
async function bancoDisponible() {
  if (!urlWorker() || !FB.user) return false;
  if (!BANCO.estado) { try { BANCO.estado = await workerPide('/banco/estado'); } catch (e) { BANCO.estado = { permitido: false }; } }
  return !!(BANCO.estado.permitido && BANCO.estado.listo);
}

/* elegir el banco y salir a darle permiso; a la vuelta sigue vueltaDelBanco() */
async function conectarBanco(plataforma) {
  const h = hoja(L('Conectar con tu banco', 'Connect your bank'), `<div class="bk">
    <p class="nota" style="margin:0">${L(`Elige el banco de <b>${esc(plataforma)}</b>. Te llevará a su web o a su app para dar permiso de <b>solo lectura</b>: GrowFolio verá el saldo de la cuenta, nunca podrá mover dinero. El permiso dura unos 180 días.`, `Pick the bank for <b>${esc(plataforma)}</b>. It takes you to its website or app to grant <b>read-only</b> access: GrowFolio sees the balance and can never move money. Access lasts about 180 days.`)}</p>
    <div class="tabs bk-paises" role="group" aria-label="${L('País del banco', 'Bank country')}"><button type="button" data-bk-pais="ES" aria-pressed="true">${L('España', 'Spain')}</button><button type="button" data-bk-pais="DE" aria-pressed="false">${L('Alemania', 'Germany')}</button></div>
    <input class="bk-busca" type="search" placeholder="${L('Busca tu banco', 'Search your bank')}" aria-label="${L('Busca tu banco', 'Search your bank')}">
    <ul class="bk-lista" aria-live="polite"><li class="vacio">${L('Cargando bancos…', 'Loading banks…')}</li></ul>
    <div class="error" id="errBk"></div></div>`);
  let bancos = [], pais = 'ES';
  const lista = $('.bk-lista', h.el), busca = $('.bk-busca', h.el), err = $('#errBk', h.el);
  const pinta = () => {
    const q = normTxt(busca.value), pl = normTxt(plataforma);
    const v = bancos.filter((b) => !q || normTxt(b.n).includes(q)).sort((a, b) => (normTxt(b.n).includes(pl) - normTxt(a.n).includes(pl)) || a.n.localeCompare(b.n));
    lista.innerHTML = v.length ? v.slice(0, 80).map((b) => `<li><button type="button" class="bk-b" data-bk="${esc(b.n)}" data-max="${b.max || ''}">${b.logo ? `<img src="${esc(b.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<i></i>'}<span>${esc(b.n)}</span></button></li>`).join('') : `<li class="vacio">${L('No sale ningún banco con ese nombre.', 'No bank matches that name.')}</li>`;
  };
  const carga = async () => {
    lista.innerHTML = `<li class="vacio">${L('Cargando bancos…', 'Loading banks…')}</li>`; err.textContent = '';
    try { bancos = (await workerPide(`/banco/bancos?pais=${pais}`)).bancos || []; pinta(); }
    catch (e) { lista.innerHTML = ''; err.textContent = L('No se ha podido traer la lista de bancos. Prueba en un rato.', 'Couldn’t load the list of banks. Try again in a while.'); }
  };
  busca.oninput = pinta;
  h.el.addEventListener('click', async (e) => {
    const pb = e.target.closest('[data-bk-pais]');
    if (pb) { pais = pb.dataset.bkPais; for (const x of $$('[data-bk-pais]', h.el)) x.setAttribute('aria-pressed', String(x === pb)); carga(); return; }
    const b = e.target.closest('[data-bk]'); if (!b) return;
    // la app de Android de antes abría el banco en el navegador y la vuelta no llegaba a la app
    const app = window.InversionesApp, dentro = (() => { try { return !!app.bancoDentro(); } catch (e2) { return false; } })();
    if (app && !dentro) { err.textContent = L('Para conectar el banco desde el móvil, actualiza antes la app de GrowFolio (en Ajustes) o hazlo desde el ordenador.', 'To connect your bank from your phone, update the GrowFolio app first (in Settings) or do it from a computer.'); return; }
    // la app del banco (Trade Republic…) devuelve con un enlace de Enable Banking: si GrowFolio no puede abrirlo, se
    // abre en el navegador y allí sale «ha caducado». Se pide permitirlo una vez, con el ajuste a un toque
    const listos = (() => { try { return app ? !!app.enlacesBancoListos() : true; } catch (e2) { return true; } })();
    if (app && !listos && !b.dataset.sinEnlaces) {
      err.innerHTML = `<div class="bk-enlaces"><b>${L('Un paso, solo una vez', 'One step, just once')}</b><span>${L('Para que tu banco te devuelva a GrowFolio al dar el permiso, deja que GrowFolio abra los enlaces de Enable Banking: en la pantalla que se abre, «Añadir enlace» y marca <b>auth.enablebanking.com</b> (y tilisy, si sale).', 'So your bank can bring you back to GrowFolio after granting access, let GrowFolio open Enable Banking links: on the screen that opens, «Add link» and tick <b>auth.enablebanking.com</b> (and tilisy, if listed).')}</span>
        <div class="fila-btns"><button type="button" class="btn peq pri" data-bk-ajuste>${L('Abrir el ajuste', 'Open the setting')}</button><button type="button" class="btn peq" data-bk-seguir>${L('Ya está, seguir', 'Done, continue')}</button></div></div>`;
      $('[data-bk-ajuste]', err).onclick = () => { try { app.abrirAjustesEnlaces(); } catch (e2) {} };
      $('[data-bk-seguir]', err).onclick = () => { b.dataset.sinEnlaces = '1'; b.click(); };
      return;
    }
    // Trade Republic, en el navegador de un móvil, solo dice «descarga la app» y desde ahí no se puede dar el permiso
    if (!app && /android|iphone|ipad/i.test(navigator.userAgent) && /trade\s*republic/i.test(b.dataset.bk) && !b.dataset.igual) {
      err.innerHTML = L('Trade Republic, en el navegador del móvil, solo te manda a descargar su app y el permiso no llega. Hazlo desde la app de GrowFolio o desde el ordenador.', 'On a phone browser Trade Republic only asks you to download its app, and the permission never arrives. Do it from the GrowFolio app or from a computer.') + ` <button type="button" class="enlace" data-bk-igual>${L('Probar aquí igualmente', 'Try here anyway')}</button>`;
      $('[data-bk-igual]', err).onclick = () => { b.dataset.igual = '1'; b.click(); };
      return;
    }
    b.disabled = true; b.classList.add('cargando'); err.textContent = '';
    try {
      const r = await workerPide('/banco/conectar', { banco: b.dataset.bk, pais, plataforma, max: +b.dataset.max || 0, vuelta: location.origin + location.pathname });
      LS.set('inv-banco-pend', { plataforma, banco: b.dataset.bk, pais, t: Date.now() });
      location.href = r.url;
    } catch (e2) {
      b.disabled = false; b.classList.remove('cargando');
      err.textContent = L(`${b.dataset.bk} no ha dejado empezar la conexión${e2.j && e2.j.motivo ? ` (${e2.j.motivo})` : ''}. Prueba otra vez o con otro país.`, `${b.dataset.bk} didn’t let the connection start${e2.j && e2.j.motivo ? ` (${e2.j.motivo})` : ''}. Try again or another country.`);
    }
  });
  carga();
}

/* a la vuelta del banco (?code=…&state=…): se cambia el código por la sesión, eliges qué cuentas van a esa
   plataforma y se trae el saldo. La plataforma viaja firmada dentro del «state», así que vale aunque el banco te
   devuelva a otro navegador */
async function vueltaDelBanco() {
  const q = new URLSearchParams(location.search);
  if (!q.has('state') || !(q.has('code') || q.has('error'))) return;
  // la sesión de Google puede tardar un poco en estar lista al volver: se espera hasta 20 s
  for (let k = 0; k < 40 && !FB.user; k++) await new Promise((r) => setTimeout(r, 500));
  history.replaceState(null, '', location.pathname + location.hash);
  const pend = LS.get('inv-banco-pend', null); LS.del('inv-banco-pend');
  if (q.has('error')) { toast(L('El banco no ha dado permiso. Puedes probar otra vez desde Efectivo.', 'The bank didn’t grant access. You can try again from Cash.'), 6000); return; }
  if (!(await bancoDisponible())) { toast(L('No se ha podido terminar la conexión con el banco: entra con tu cuenta y prueba otra vez desde Efectivo.', 'Couldn’t finish connecting to the bank: sign in and try again from Cash.'), 6000); return; }
  let r;
  try { r = await workerPide('/banco/sesion', { code: q.get('code'), estado: q.get('state') }); }
  catch (e) { toast(L('No se ha podido terminar la conexión con el banco. Prueba otra vez desde Efectivo.', 'Couldn’t finish connecting to the bank. Try again from Cash.'), 6000); return; }
  const plataforma = r.plataforma || (pend && pend.plataforma);
  if (!plataforma || !(r.cuentas || []).length) { toast(L('El banco no ha dado ninguna cuenta.', 'The bank didn’t share any account.'), 6000); return; }
  const guardar = async (cuentas) => {
    // la conexión de antes de esa plataforma se cambia por la nueva (y se borra su sesión)
    const viejas = [...new Set(bancosDe(plataforma).map((b) => b.sesion))].filter((x) => x && x !== r.sesion);
    for (const v of viejas) workerPide('/banco/borrar', { sesion: v }).catch(() => {});
    S.cartera.bancos = ((S.cartera && S.cartera.bancos) || []).filter((b) => b.plataforma !== plataforma);
    for (const c of cuentas) S.cartera.bancos.push({ id: `bk-${c.uid}`, plataforma, banco: r.banco || (pend && pend.banco) || '', pais: r.pais || '', sesion: r.sesion, cuenta: c.uid, nombre: c.nombre, fin: c.fin, hasta: r.hasta || null });
    BANCO.sincT = 0;
    await sincronizarBancos(true, true);
  };
  if (r.cuentas.length === 1) { await guardar(r.cuentas); return; }
  const h = hoja(L(`¿Qué cuentas son de ${plataforma}?`, `Which accounts belong to ${plataforma}?`), `<form id="fBkC" novalidate>
    <p class="nota" style="margin:0">${L('Su saldo se suma y pasa a ser el efectivo de esa plataforma.', 'Their balances are added up and become that platform’s cash.')}</p>
    <div class="bk-cuentas">${r.cuentas.map((c, k) => `<label class="check-mini"><input type="checkbox" data-bkc="${k}" checked> ${esc(c.nombre || L('Cuenta', 'Account'))} ${esc(c.fin ? `···${c.fin}` : '')}</label>`).join('')}</div>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>${L('Cancelar', 'Cancel')}</button><button type="submit" class="btn pri">${L('Usar estas', 'Use these')}</button></div></form>`);
  $('#fBkC', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    const elegidas = r.cuentas.filter((c, k) => $(`[data-bkc="${k}"]`, h.el).checked);
    if (!elegidas.length) return;
    h.cerrar(); await guardar(elegidas);
  };
}

/* el saldo de cada cuenta conectada pasa al efectivo de su plataforma (al abrir y cada BANCO_CADA_H horas) */
async function sincronizarBancos(forzar, avisar) {
  const bs = bancosDe().filter((b) => !b.caducada);
  if (!S.cartera || !bs.length || BANCO.enCurso) return false;
  if (!forzar && Date.now() - BANCO.sincT < BANCO_CADA_H * 3600e3 && bs.every((b) => b.ultimo && Date.now() - b.ultimo.t < BANCO_CADA_H * 3600e3)) return false;
  if (!(await bancoDisponible())) return false;
  BANCO.enCurso = true;
  try {
    const r = await workerPide('/banco/saldos', { cuentas: bs.map((b) => b.cuenta) });
    BANCO.sincT = Date.now();
    const porPlat = new Map(), caducadas = [];
    for (const b of bs) {
      const x = (r.saldos || {})[b.cuenta]; if (!x) continue;
      if (x.error === 'caducada') { b.caducada = true; caducadas.push(b.plataforma); continue; }
      if (x.error || !isFinite(x.importe) || (x.moneda && x.moneda !== 'EUR')) continue;
      b.ultimo = { importe: x.importe, t: Date.now(), fecha: x.fecha || null };
      porPlat.set(b.plataforma, (porPlat.get(b.plataforma) || 0) + x.importe);
    }
    const cambios = [];
    S.cartera.efectivo = S.cartera.efectivo || [];
    for (const [pl, imp] of porPlat) {
      let e = S.cartera.efectivo.find((x) => x.plataforma === pl);
      if (!e) { e = { plataforma: pl, importe: 0 }; S.cartera.efectivo.push(e); }
      const nuevo = Math.round(imp * 100) / 100;
      if (Math.abs((+e.importe || 0) - nuevo) >= 0.005) { cambios.push([pl, nuevo]); e.importe = nuevo; }
    }
    await guardarCartera(L('Efectivo del banco', 'Cash from the bank'));
    if (cambios.length) pintar();
    if (cambios.length && avisar) toast(L(`Efectivo al día con el banco: ${cambios.map(([pl, v]) => `${pl}, ${eur(v)}`).join('; ')}`, `Cash synced with the bank: ${cambios.map(([pl, v]) => `${pl}, ${eur(v)}`).join('; ')}`), 5000);
    else if (avisar) toast(L('Efectivo al día con el banco', 'Cash synced with the bank'));
    for (const pl of new Set(caducadas)) if (!BANCO.avisado.has('cad:' + pl)) { BANCO.avisado.add('cad:' + pl); toast(L(`El permiso del banco de ${pl} ha caducado: vuelve a conectarlo en Efectivo.`, `The bank access for ${pl} has expired: reconnect it in Cash.`), 7000); }
    return true;
  } catch (e) { console.warn('banco', e); return false; } finally { BANCO.enCurso = false; }
}
/* una semana antes de que caduque el permiso, un aviso al abrir (una vez por plataforma y sesión) */
function avisoCaducaBanco() {
  for (const b of bancosDe()) {
    if (b.caducada || !b.hasta || BANCO.avisado.has('pronto:' + b.plataforma)) continue;
    const dias = Math.ceil((new Date(b.hasta) - Date.now()) / 864e5);
    if (dias <= 7) { BANCO.avisado.add('pronto:' + b.plataforma); toast(L(`El permiso del banco de ${b.plataforma} caduca ${dias <= 1 ? 'mañana' : `en ${dias} días`}: renuévalo en Efectivo.`, `The bank access for ${b.plataforma} expires ${dias <= 1 ? 'tomorrow' : `in ${dias} days`}: renew it in Cash.`), 7000); }
  }
}
async function desconectarBanco(plataforma) {
  const ses = [...new Set(bancosDe(plataforma).map((b) => b.sesion))];
  for (const v of ses) workerPide('/banco/borrar', { sesion: v }).catch(() => {});
  S.cartera.bancos = bancosDe().filter((b) => b.plataforma !== plataforma);
  await guardarCartera(L('Desconectar banco', 'Disconnect bank'));
  pintar();
}
/* debajo de cada plataforma, en la hoja de Efectivo: conectar, o de qué cuenta sale y cuándo se miró */
async function pintarBancosEf(h) {
  if (!(await bancoDisponible()) || !h.el.isConnected) return;
  for (const w of $$('[data-ef-banco]', h.el)) {
    const pl = w.dataset.efBanco, bs = bancosDe(pl), inp = w.closest('.campo-ef').querySelector('input');
    if (!bs.length) { w.innerHTML = `<button type="button" class="enlace acento" data-bk-con="${esc(pl)}">${ICONOS.banco}${L('Conectar con el banco', 'Connect the bank')}</button>`; continue; }
    const cad = bs.some((b) => b.caducada), ult = Math.max(0, ...bs.map((b) => (b.ultimo && b.ultimo.t) || 0));
    inp.readOnly = !cad; inp.classList.toggle('del-banco', !cad);
    w.innerHTML = cad
      ? `<span class="bk-mal">${L('El permiso del banco ha caducado.', 'The bank access has expired.')}</span> <button type="button" class="enlace acento" data-bk-con="${esc(pl)}">${L('Volver a conectar', 'Reconnect')}</button>`
      : `<span>${ICONOS.banco}${esc(bs.map((b) => `${b.nombre || b.banco} ${finCuenta(b)}`.trim()).join(', '))}${ult ? ` · ${esc(haceCuanto(new Date(ult).toISOString()))}` : ''}</span> <button type="button" class="enlace" data-bk-ya="${esc(pl)}">${L('Actualizar', 'Refresh')}</button> <button type="button" class="enlace" data-bk-fuera="${esc(pl)}">${L('Desconectar', 'Disconnect')}</button>`;
  }
  h.el.onclick = async (e) => {
    const c = e.target.closest('[data-bk-con]'); if (c) { h.cerrar(); conectarBanco(c.dataset.bkCon); return; }
    const y = e.target.closest('[data-bk-ya]'); if (y) { y.disabled = true; y.textContent = L('Mirando…', 'Checking…'); BANCO.sincT = 0; await sincronizarBancos(true, true); h.cerrar(); editarEfectivo(); return; }
    const f = e.target.closest('[data-bk-fuera]'); if (f) { if (!f.dataset.listo) { f.dataset.listo = '1'; f.textContent = L('¿Seguro?', 'Sure?'); return; } await desconectarBanco(f.dataset.bkFuera); h.cerrar(); editarEfectivo(); }
  };
}

function editarEfectivo(plat) {
  const ef = JSON.parse(JSON.stringify(S.cartera.efectivo || []));
  // 0.3.9: las plataformas que usas (las de tus posiciones); las de siempre solo si aún no tienes ninguna
  const usadas = [...new Set((S.cartera.posiciones || []).map((p) => p.plataforma).filter(Boolean))];
  for (const p of usadas.length ? usadas : PLATAFORMAS) if (!ef.find((e) => e.plataforma === p)) ef.push({ plataforma: p, importe: 0 });
  const h = hoja('Efectivo', `<form id="fEf" novalidate><div class="form-grid">${ef.map((e, k) => `<div class="campo-ef"><label class="campo">${esc(e.plataforma)}<input data-ef="${k}" inputmode="decimal" value="${val(+e.importe || 0)}"></label><div class="ef-banco" data-ef-banco="${esc(e.plataforma)}"></div></div>`).join('')}</div>
    <div class="form-grid ef-otra"><label class="campo">${L('Otra plataforma', 'Another platform')}<input name="otraP" maxlength="40" placeholder="${esc(L('por ejemplo, Revolut', 'e.g. Revolut'))}" autocomplete="off"></label><label class="campo">${L('Efectivo en ella (€)', 'Cash there (€)')}<input name="otraE" inputmode="decimal" placeholder="0"></label></div>
    <p class="nota" style="margin:0">El dinero sin invertir de cada plataforma. Cuenta en el patrimonio y en el reparto.</p>
    <button type="button" class="enlace acento ef-extracto" data-ef-extracto>${ICONOS.recorte}${L('Ponerlo con un extracto del banco (captura, PDF, CSV o Excel)', 'Set it from a bank statement (screenshot, PDF, CSV or Excel)')}</button>
    <div class="error" id="errEf"></div><div class="fila-btns"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri">Guardar</button></div></form>`);
  $('#fEf', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    const nuevos = ef.map((e, k) => { const v = numero($(`[data-ef="${k}"]`, h.el).value); return { plataforma: e.plataforma, importe: v == null ? 0 : v }; });
    if (nuevos.some((e) => Number.isNaN(e.importe))) { $('#errEf', h.el).textContent = 'Algún importe no es un número.'; return; }
    if (nuevos.some((e) => e.importe < 0)) { $('#errEf', h.el).textContent = 'El efectivo no puede ser negativo: si debes algo, déjalo en 0.'; return; }
    const oP = String(ev.target.otraP.value || '').trim(), oE = numero(ev.target.otraE.value);
    if (oP) {
      if (oE != null && (Number.isNaN(oE) || oE < 0)) { $('#errEf', h.el).textContent = L('El efectivo de la otra plataforma tiene que ser un número de 0 en adelante.', 'The other platform’s cash must be a number from 0 up.'); return; }
      const ya = nuevos.find((e) => e.plataforma.toLowerCase() === oP.toLowerCase());
      if (ya) ya.importe = oE || 0; else nuevos.push({ plataforma: oP, importe: oE || 0 });
    }
    S.cartera.efectivo = nuevos;
    await guardarYPintar('Cambiar efectivo', h);
  };
  $('[data-ef-extracto]', h.el).onclick = () => { h.cerrar(); importarCapturas(); };
  pintarBancosEf(h);
  // desde la fila de efectivo de Posiciones: el importe de esa plataforma, listo para cambiarlo
  const k = plat ? ef.findIndex((e) => e.plataforma === plat) : -1;
  if (k >= 0) setTimeout(() => { const i = $(`[data-ef="${k}"]`, h.el); if (i) { i.focus(); i.select(); } }, 250);
}

function editarLimites() {
  const h = hoja('Tus límites', `<form id="fLim" novalidate><label class="campo">Máximo en acciones sueltas (% de la cartera)<input name="lim" inputmode="decimal" value="${val(+(S.cartera.limite_acciones ?? 20))}"></label>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri">Guardar</button></div></form>`);
  $('#fLim', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    const n = numero(ev.target.lim.value);
    if (!(n > 0 && n <= 100)) return;
    S.cartera.limite_acciones = n;
    await guardarYPintar('Cambiar límite', h);
  };
}

async function borrarMovimiento(id, boton) {
  if (!boton.dataset.listo) { boton.dataset.listo = '1'; boton.textContent = '¿Borrar?'; setTimeout(() => { if (boton.isConnected) { delete boton.dataset.listo; boton.innerHTML = ICONOS.papelera; } }, 3500); return; }
  S.cartera.movimientos = (S.cartera.movimientos || []).filter((m) => m.id !== id);
  await guardarYPintar('Borrar operación del historial');
}
