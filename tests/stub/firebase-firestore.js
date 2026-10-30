// Firestore de imitación (ver firebase-app.js): cada documento es una clave «stub-fs:<ruta>» de localStorage.
// Imita las reglas de firestore.rules en lo que la app nota: el dueño (stub-dueno, su correo) es el único que puede
// listar opiniones, cuentas, modos y fallos_ia; cada cuenta lee solo su usuarios/{uid} y su modos/{correo} (con el correo
// confirmado si entró con correo y contraseña).
const P = 'stub-fs:';
const yo = () => { try { return JSON.parse(localStorage.getItem('stub-auth-user') || 'null'); } catch (e) { return null; } };
const dueno = () => String(localStorage.getItem('stub-dueno') || '').toLowerCase();
const esDueno = () => { const u = yo(); return !!u && !!dueno() && String(u.email || '').toLowerCase() === dueno(); };
const sinPermiso = () => { const e = new Error('Missing or insufficient permissions.'); e.code = 'permission-denied'; return e; };
const escribe = () => { window.__escrituras = (window.__escrituras || 0) + 1; };

function revivir(v) {
  if (v && typeof v === 'object') {
    if (v.__ts != null) { const ms = v.__ts; return { seconds: Math.floor(ms / 1000), nanoseconds: 0, toMillis: () => ms, toDate: () => new Date(ms) }; }
    if (Array.isArray(v)) return v.map(revivir);
    const o = {}; for (const k of Object.keys(v)) o[k] = revivir(v[k]); return o;
  }
  return v;
}
function plano(v) {
  if (v instanceof Date) return { __ts: v.getTime() };
  if (v && typeof v === 'object') {
    if (v.__ts === 'server') return { __ts: Date.now() };
    if (typeof v.toMillis === 'function') return { __ts: v.toMillis() };
    if (Array.isArray(v)) return v.map(plano);
    const o = {}; for (const k of Object.keys(v)) if (v[k] !== undefined) o[k] = plano(v[k]); return o;
  }
  return v;
}
const crudo = (ruta) => { try { return JSON.parse(localStorage.getItem(P + ruta) || 'null'); } catch (e) { return null; } };
function puedeLeer(ruta) {
  const u = yo(), [col, id] = ruta.split('/');
  if (!u) return false;
  if (col === 'usuarios') return id === u.uid;
  if (col === 'modos') return esDueno() || (id === String(u.email || '').toLowerCase() && (u.emailVerified || u.proveedor !== 'password'));
  if (col === 'cuentas' || col === 'opiniones') return esDueno() || (crudo(ruta) || {}).uid === u.uid;
  if (col === 'fallos_ia') return esDueno();
  return true;
}
function snap(ruta) {
  const d = crudo(ruta);
  return { id: ruta.split('/').pop(), ref: { path: ruta }, exists: () => !!d, data: () => (d ? revivir(d) : undefined), get: (k) => (d ? revivir(d)[k] : undefined), metadata: { hasPendingWrites: false, fromCache: false } };
}
function poner(ruta, data, merge) {
  const viejo = merge ? crudo(ruta) || {} : {};
  localStorage.setItem(P + ruta, JSON.stringify({ ...viejo, ...plano(data) }));
  escribe(); avisarCambio(ruta);
}

export function getFirestore() { return { tipo: 'stub' }; }
export function doc(db, ...ruta) { const p = ruta.join('/'); return { tipo: 'doc', path: p, id: ruta[ruta.length - 1] }; }
export function collection(db, ...ruta) { return { tipo: 'col', path: ruta.join('/') }; }
export function serverTimestamp() { return { __ts: 'server' }; }
export function where(campo, op, valor) { return { t: 'where', campo, op, valor }; }
export function orderBy(campo, dir = 'asc') { return { t: 'orderBy', campo, dir }; }
export function limit(n) { return { t: 'limit', n }; }
export function query(col, ...cond) { return { tipo: 'query', path: col.path, cond }; }

export async function getDoc(ref) { if (!puedeLeer(ref.path)) throw sinPermiso(); return snap(ref.path); }
// fallos_ia: se crean y no se reescriben (las reglas no dejan update)
export async function setDoc(ref, data, o) { if (ref.path.startsWith('fallos_ia/') && crudo(ref.path)) throw sinPermiso(); poner(ref.path, data, o && o.merge); }
// fallos_ia: las reglas dejan borrar solo al dueño
export async function deleteDoc(ref) {
  if (ref.path.startsWith('fallos_ia/') && !esDueno()) throw sinPermiso();
  localStorage.removeItem(P + ref.path); escribe(); avisarCambio(ref.path);
}
export async function updateDoc(ref, data) { if (!crudo(ref.path)) { const e = new Error('No document to update'); e.code = 'not-found'; throw e; } poner(ref.path, data, true); }
export async function addDoc(col, data) {
  const id = Math.random().toString(36).slice(2, 12), ruta = col.path + '/' + id;
  poner(ruta, data, false); return { id, path: ruta };
}
export async function getDocs(q) {
  const base = q.path + '/', cond = q.cond || [];
  const filtro = cond.filter((c) => c.t === 'where');
  const soloLoSuyo = filtro.some((c) => c.campo === 'uid' && yo() && c.valor === yo().uid);
  if ((q.path === 'opiniones' || q.path === 'cuentas' || q.path === 'modos') && !esDueno() && !soloLoSuyo) throw sinPermiso();
  if (q.path === 'fallos_ia' && !esDueno()) throw sinPermiso();
  let docs = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(P + base) && !k.slice((P + base).length).includes('/')) docs.push(snap(k.slice(P.length)));
  }
  const num = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : v instanceof Date ? v.getTime() : v);
  for (const c of filtro) docs = docs.filter((d) => {
    const v = d.data()[c.campo];
    if (c.op === '<' || c.op === '<=' || c.op === '>' || c.op === '>=') {
      if (v == null) return false;
      const a = num(v), b = num(c.valor);
      return c.op === '<' ? a < b : c.op === '<=' ? a <= b : c.op === '>' ? a > b : a >= b;
    }
    return c.op === '==' ? v === c.valor : c.op === '!=' ? v !== c.valor : true;
  });
  const ord = cond.find((c) => c.t === 'orderBy');
  if (ord) {
    const val = (d) => { const v = d.data()[ord.campo]; return v && v.toMillis ? v.toMillis() : v; };
    docs.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * (ord.dir === 'desc' ? -1 : 1));
  }
  const lim = cond.find((c) => c.t === 'limit');
  if (lim) docs = docs.slice(0, lim.n);
  return { docs, size: docs.length, empty: !docs.length, forEach: (f) => docs.forEach(f) };
}
export async function runTransaction(db, fn) {
  const cambios = [];
  const tx = {
    async get(ref) { if (!puedeLeer(ref.path)) throw sinPermiso(); return snap(ref.path); },
    set(ref, data, o) { cambios.push([ref.path, data, o && o.merge]); return tx; },
    update(ref, data) { cambios.push([ref.path, data, true]); return tx; },
  };
  const r = await fn(tx);
  for (const [ruta, data, merge] of cambios) poner(ruta, data, merge);
  return r;
}
const oyentes = new Map();
function avisarCambio(ruta) { const l = oyentes.get(ruta); if (l) for (const f of l) setTimeout(() => f(snap(ruta)), 10); }
export function onSnapshot(ref, cb, alFallar) {
  if (ref.tipo === 'query' || ref.tipo === 'col') {
    // una consulta: se contesta una vez con lo que haya (las pruebas no necesitan más)
    setTimeout(() => getDocs(ref.tipo === 'col' ? { path: ref.path, cond: [] } : ref).then(cb, (e) => alFallar && alFallar(e)), 30);
    return () => {};
  }
  if (!puedeLeer(ref.path)) { setTimeout(() => alFallar && alFallar(sinPermiso()), 10); return () => {}; }
  const l = oyentes.get(ref.path) || new Set(); l.add(cb); oyentes.set(ref.path, l);
  setTimeout(() => cb(snap(ref.path)), 30);
  return () => l.delete(cb);
}
// para la prueba: lo que haría otro dispositivo (escribir en la cuenta sin pasar por esta página)
window.__stubOtroDispositivo = (ruta, data) => { localStorage.setItem(P + ruta, JSON.stringify(plano(data))); avisarCambio(ruta); };
