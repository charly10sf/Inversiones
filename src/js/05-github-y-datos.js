/* ---------- GitHub ---------- */
const GH = {
  token() { return LS.get('inv-token'); },
  cab(raw) {
    const h = { Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    const t = this.token(); if (t) h.Authorization = 'Bearer ' + t;
    return h;
  },
  url(ruta, ref) { return `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/contents/${ruta}${ref ? '?ref=' + ref : ''}`; },
  raw(ruta, ref) { return `https://raw.githubusercontent.com/${CFG.owner}/${CFG.repo}/${ref}/${ruta}`; },
  async leer(ruta, ref = 'main', cache = 'no-store') {
    // devuelve {texto, sha} o null si no existe; lanza error si no hay forma de saberlo.
    // Sin token (los amigos con su cartera en el móvil) va directo a raw: la API sin token solo deja
    // 60 lecturas por hora y no hace falta para leer un repositorio público.
    if (this.token()) try {
      const r = await fetch(this.url(ruta, ref), { headers: this.cab(false), cache });
      if (r.status === 404) return null;
      if (r.ok) { const j = await r.json(); return { texto: j.content ? b64.decTxt(j.content) : await this.leerRaw(ruta, ref), sha: j.sha }; }
    } catch (e) { console.warn(e); }
    const r2 = await fetch(this.raw(ruta, ref) + '?v=' + Date.now(), { cache: 'no-store' });
    if (r2.status === 404) return null;
    if (!r2.ok) throw new Error('No se pudo leer ' + ruta);
    return { texto: await r2.text(), sha: null };
  },
  async leerRaw(ruta, ref) {
    const r = await fetch(this.url(ruta, ref), { headers: this.cab(true), cache: 'no-store' });
    if (!r.ok) throw new Error('GitHub ' + r.status);
    return r.text();
  },
  async escribir(ruta, texto, mensaje) {
    if (!this.token()) throw new Error('sin-token');
    let sha;
    const r0 = await fetch(this.url(ruta, 'main'), { headers: this.cab(false), cache: 'no-store' });
    if (r0.ok) sha = (await r0.json()).sha;
    else if (r0.status !== 404) throw new Error('GitHub ' + r0.status + ' al leer ' + ruta);
    const r = await fetch(this.url(ruta), {
      method: 'PUT', headers: { ...this.cab(false), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: mensaje, content: b64.encTxt(texto), branch: 'main', ...(sha ? { sha } : {}) }),
    });
    if (!r.ok) { let d = ''; try { d = (await r.json()).message; } catch (e) {} throw new Error(`GitHub ${r.status}${d ? ': ' + d : ''}`); }
    return (await r.json()).content.sha;
  },
  async probar() {
    const r = await fetch(`https://api.github.com/repos/${CFG.owner}/${CFG.repo}`, { headers: this.cab(false), cache: 'no-store' });
    if (!r.ok) throw new Error('GitHub ' + r.status);
    const j = await r.json();
    if (!j.permissions || !j.permissions.push) throw new Error('El token no tiene permiso de escritura en ' + j.full_name);
    return j.full_name;
  },
};

/* ---------- carga de datos ---------- */
async function cargarInstrumentos() {
  let txt = null;
  try {
    if (CFG.dev) { const r = await fetch('instrumentos.json', { cache: 'no-store' }); txt = await r.text(); }
    else if (GH.token()) { const f = await GH.leer('instrumentos.json'); if (f) { txt = f.texto; S.instSha = f.sha; } }
    if (!txt) { const r = await fetch('instrumentos.json?v=' + Date.now(), { cache: 'no-store' }); if (r.ok) txt = await r.text(); }
  } catch (e) { console.warn(e); }
  if (txt) LS.set('inv-cache-inst', txt); else txt = LS.get('inv-cache-inst');
  if (!txt) throw new Error('No encuentro instrumentos.json');
  const j = JSON.parse(txt);
  S.inst = {}; S.instOrden = [];
  for (const i of j.instrumentos) { S.inst[i.id] = i; S.instOrden.push(i.id); }
  S.ref = j.referencia || S.instOrden[0];
  S.instJson = j;
}

async function cargarPrecios() {
  let txt = null;
  try {
    if (CFG.dev) { const r = await fetch('dev/precios.json', { cache: 'no-store' }); if (r.ok) txt = await r.text(); }
    else { const f = await GH.leer('precios.json', 'datos', 'no-cache'); if (f) txt = f.texto; }
  } catch (e) { console.warn(e); }
  if (txt) { try { localStorage.setItem('inv-cache-precios', txt); } catch (e) {} }
  else { try { txt = localStorage.getItem('inv-cache-precios'); } catch (e) {} }
  S.precios = txt ? JSON.parse(txt) : { instrumentos: {}, sectores_etf: {}, generado: null };
  S.ultimaCarga = Date.now();
  if (IDIOMA === 'en' && S.trEn) trDatos(S.precios.noticias);
}

async function cargarCifrada() {
  if (PERFIL_CUENTA) return cargarDeCuenta();
  if (PERFIL_LOCAL) { const t = LS.get('inv-local-enc'); return t ? { texto: t, sha: null } : null; }
  if (CFG.dev) {
    const local = LS.get('inv-dev-enc');
    if (local) return { texto: local, sha: null };
    const r = await fetch('dev/cartera.enc.json', { cache: 'no-store' });
    return r.ok ? { texto: await r.text(), sha: null } : null;
  }
  try {
    const f = await GH.leer('cartera.enc.json');
    if (f) LS.set('inv-cache-enc', f.texto); else LS.del('inv-cache-enc');
    return f;
  } catch (e) {
    console.warn(e);
    const c = LS.get('inv-cache-enc');
    return c ? { texto: c, sha: null } : null;
  }
}

/* la cartera de tu cuenta: la de Firestore; sin conexión, la copia del dispositivo. Si en este dispositivo hay
   cambios que no llegaron a subirse y son más nuevos que los de la cuenta, mandan y se suben ahora. */
function olvidarClavesViejas() { try { IDB.del('clave-local'); IDB.del('clave'); } catch (e) {} LS.set('inv-local-ofrecida', true); }
async function cargarDeCuenta() {
  const c = cacheCuenta.get();
  S.cuentaLeida = false; S.cuentaSinRed = false;
  const deCopia = () => { S.cuentaSinRed = true; if (c && (!FB.user || c.uid === FB.user.uid)) { fijarBase(c.baseRev, c.base || c.texto); return { texto: c.texto, sha: null }; } return null; };
  try { await fbCargar(); } catch (e) { console.warn('Sin Firebase', e); return deCopia(); }
  if (!FB.user) return null;
  let d;
  try { d = await conTiempo(leerCuenta(), 12000); } catch (e) { console.warn('No se pudo leer la cuenta', e); return deCopia(); }
  S.cuentaLeida = true;
  if (d && d.ia) S.iaCuenta = d.ia;
  const pend = LS.get('inv-pend-cuenta') && c && c.uid === FB.user.uid;
  if (pend) {
    // ya había llegado (se subió pero no se enteró este dispositivo)
    if (d && d.enc === c.texto) { LS.del('inv-pend-cuenta'); fijarBase(revDe(d), d.enc); cacheCuenta.set(c.texto); return { texto: c.texto, sha: null }; }
    // se abre lo de aquí y se sube enseguida; si otro dispositivo cambió la cuenta entretanto, la subida lo
    // detecta y se juntan los dos al abrir la cartera
    fijarBase(c.baseRev, c.base || null); S.toastPend = true; if (d && d.enc) olvidarClavesViejas();
    if (!d || !d.enc || revDe(d) === (c.baseRev || 0)) setTimeout(() => subirPendiente(), 0);
    return { texto: c.texto, sha: null };
  }
  LS.del('inv-pend-cuenta');
  fijarBase(revDe(d), d && d.enc);
  if (d && d.enc) { cacheCuenta.set(d.enc); olvidarClavesViejas(); return { texto: d.enc, sha: null }; }
  return null;
}
/* sin conexión al abrir: ni se crea una cartera nueva ni se toca la cuenta; se reintenta */
function pantallaSinCuenta() {
  $('#app').innerHTML = `<div class="pantalla"><div class="caja caja-cuenta">
    <img class="logo" src="icon-192.png" alt="">
    <h1>No he podido leer tu cuenta</h1>
    <p>Comprueba que tienes conexión y vuelve a probar. Tu cartera sigue a salvo en tu cuenta: no se ha tocado nada.</p>
    <button class="btn pri" type="button" id="bReintentar">Reintentar</button>
    <button type="button" class="enlace" id="bSalir">Entrar con otra cuenta</button>
  </div></div>`;
  $('#bReintentar').onclick = () => location.reload();
  $('#bSalir').onclick = () => cerrarSesion();
}
/* con conexión otra vez, al volver a la app o cuando toca reintentar: lo de aquí sube o llega lo de la cuenta */
async function sincronizarCuenta() {
  if (!PERFIL_CUENTA || S.sincronizando) return;
  S.sincronizando = true;
  try {
    await fbCargar(); if (!FB.user) return;
    const d = await conTiempo(leerCuenta(), 12000);
    S.cuentaLeida = true;
    const c = cacheCuenta.get();
    if (LS.get('inv-pend-cuenta') && c) {
      if (d && d.enc === c.texto) { LS.del('inv-pend-cuenta'); fijarBase(revDe(d), d.enc); cacheCuenta.set(c.texto); return; }
      if (S.subidaParada) return;
      S.preguntarConflicto = false;
      await subirPendiente();   // la transacción decide: sube si la cuenta no ha cambiado; si sí, manda la cuenta
    } else if (d && d.enc && S.key && S.cartera && (!S.enc || d.enc !== S.enc.texto) && revDe(d) > (S.baseRev || 0)) await aplicarRemoto(d.enc, revDe(d));
  } catch (e) { console.warn('Sin sincronizar todavía', e); S.fallosSubir = (S.fallosSubir || 0) + 1; reintentarSubida(); }
  finally { S.sincronizando = false; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && PERFIL_CUENTA && LS.get('inv-pend-cuenta') && !S.subidaParada) sincronizarCuenta(); });

/* El histórico (10 años de cierres) pesa unos 300 KB: se baja al abrir y cuando cambia de día */
async function cargarHistorico() {
  const id = S.precios && S.precios.historico_id;
  if (S.hist && id && S.histId === id) return;
  let txt = null;
  try {
    if (CFG.dev) { const r = await fetch('dev/historico.json', { cache: 'no-store' }); if (r.ok) txt = await r.text(); }
    else {
      const r = await fetch(GH.raw('historico.json', 'datos') + '?v=' + encodeURIComponent(id || Date.now()), { cache: 'no-cache' }).catch(() => null);
      if (r && r.ok) txt = await r.text();
      else { const f = await GH.leer('historico.json', 'datos'); if (f) txt = f.texto; }
    }
  } catch (e) { console.warn(e); }
  if (txt) { try { localStorage.setItem('inv-cache-hist', txt); } catch (e) { try { localStorage.removeItem('inv-cache-hist'); } catch (e2) {} } }
  else { try { txt = localStorage.getItem('inv-cache-hist'); } catch (e) {} }
  try { S.hist = txt ? JSON.parse(txt) : null; } catch (e) { S.hist = null; }
  S.histId = id;
}

