/* ---------- cifrado local con la clave de la cartera (para la clave de la API y la conversación) ---------- */
async function cifrarLocal(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, S.key, TE.encode(JSON.stringify(obj))));
  return { iv: b64.enc(iv), ct: b64.enc(ct) };
}
async function descifrarLocal(o) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.dec(o.iv) }, S.key, b64.dec(o.ct));
  return JSON.parse(TD.decode(pt));
}
async function cargarAsesor() {
  if (AS.cargada || !S.key) return;
  AS.cargada = true;
  for (const prov of ['google']) {
    const c = LS.get(LS_CLAVE[prov]);
    if (c) { try { AS.claves[prov] = await descifrarLocal(c); } catch (e) { LS.del(LS_CLAVE[prov]); } }
    const enCartera = S.cartera && S.cartera.asesor && S.cartera.asesor[CAMPO_CLAVE[prov]];
    if (!AS.claves[prov] && enCartera) AS.claves[prov] = enCartera;
  }
  const h = LS.get('inv-asesor-conv');
  if (h) { try { const o = await descifrarLocal(h); AS.conv = o.conv || []; AS.api = o.api || []; AS.gasto = o.gasto || 0; } catch (e) { LS.del('inv-asesor-conv'); } }
}
async function guardarConv() {
  if (!S.key || S.demo) return;
  try { LS.set('inv-asesor-conv', await cifrarLocal({ conv: AS.conv.slice(-60).map(({ adj, ...t }, k, v) => (t.mini && v.slice(k + 1).filter((y) => y.mini).length >= 4 ? { ...t, mini: undefined } : t)), api: AS.api.slice(-24), gasto: AS.gasto })); } catch (e) {}
}
function olvidarAsesor() { Object.assign(AS, { conv: [], api: [], foto: null, claves: { google: null }, cargada: false, gasto: 0 }); }

/* guarda la cartera sin avisos ni descargas (para lo que hace la web sola, como el análisis diario) */
async function guardarCarteraCallada(mensaje) {
  if (!S.key || !S.cartera || S.demo) return false;
  if (PERFIL_LOCAL) return guardarLocal();
  S.cartera.actualizado = new Date().toISOString();
  const texto = await cifrar(S.cartera);
  if (CFG.dev) { LS.set('inv-dev-enc', texto); S.enc = { texto, sha: null }; return true; }
  LS.set('inv-cache-enc', texto);
  if (!GH.token()) { LS.set('inv-pend-enc', texto); return false; }
  try { const sha = await GH.escribir('cartera.enc.json', texto, mensaje); S.enc = { texto, sha }; LS.del('inv-pend-enc'); return true; } catch (e) { console.warn(e); LS.set('inv-pend-enc', texto); return false; }
}
/* cambios que no se pudieron subir (sin token o sin conexión): si son más nuevos que lo de GitHub, mandan,
   y en cuanto hay token se suben solos */
async function aplicarPendiente() {
  const t = LS.get('inv-pend-enc');
  if (!t || !S.key || PERFIL_LOCAL || CFG.dev) return;
  try {
    const c = await descifrar(t, S.key);
    if (S.cartera && (c.actualizado || '') <= (S.cartera.actualizado || '')) { LS.del('inv-pend-enc'); return; }
    S.cartera = c;
    if (GH.token() && await guardarCarteraCallada('Cambios hechos sin conexión')) toast('Subidos a GitHub los cambios que hiciste sin conexión', 5000);
  } catch (e) { console.warn('Cambios pendientes que no se pueden leer', e); }
}

