// Firebase Authentication de imitación (ver firebase-app.js).
// Ajustes desde la prueba, en localStorage antes de cargar la página:
//   stub-google  -> {uid, email, displayName, alta}  la cuenta de Google que sale al entrar con Google
//   stub-alta    -> fecha ISO de alta para las cuentas nuevas (por defecto, ahora)
//   stub-verificar -> '1' para que las cuentas de correo nazcan con el correo confirmado
const K = 'stub-auth-user', A = 'stub-auth-cuentas';
const leer = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const guardar = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const err = (code) => { const e = new Error('Firebase: Error (' + code + ').'); e.code = code; return e; };

const claimDe = (d) => (d.claim === undefined ? !!d.emailVerified : !!d.claim);
function usuario(d) {
  if (!d) return null;
  return {
    uid: d.uid, email: d.email, displayName: d.displayName || null, emailVerified: !!d.emailVerified,
    providerData: [{ providerId: d.proveedor || 'password', email: d.email }],
    metadata: { creationTime: new Date(d.alta || Date.now()).toUTCString(), lastSignInTime: new Date().toUTCString() },
    async reload() { const c = leer(A, {})[d.email]; if (c) { this.emailVerified = !!c.u.emailVerified; this.displayName = c.u.displayName || null; } },
    // 0.8.3: el token va aparte del usuario, como en Firebase: email_verified se queda como estaba al entrar hasta pedir
    // uno nuevo (getIdToken(true)). Al abrir la página, el usuario sale ya recargado (emailVerified al día) y el token no
    async getIdToken(nuevo) {
      if (nuevo) { d.claim = this.emailVerified; const k = leer(K, null); if (k && k.uid === d.uid) { k.claim = d.claim; guardar(K, k); } }
      return 'stub-token-' + d.uid + (claimDe(d) ? '' : '-sin-confirmar');
    },
    async getIdTokenResult() { return { token: await this.getIdToken(), claims: { email_verified: claimDe(d) } }; },
  };
}
const auth = { languageCode: 'es', currentUser: usuario(leer(K, null)) };
const subs = new Set();
const avisar = () => { for (const f of subs) setTimeout(() => f(auth.currentUser), 0); };
function entrar(d) {
  d = { ...d, claim: !!d.emailVerified };
  guardar(K, d); auth.currentUser = usuario(d); avisar();
  return { user: auth.currentUser };
}
function alta() { const a = localStorage.getItem('stub-alta'); return a ? Date.parse(a) : Date.now(); }

export function getAuth() { return auth; }
export function initializeAuth() { return auth; }
export const inMemoryPersistence = { type: 'NONE' };
export function onAuthStateChanged(a, cb) { subs.add(cb); setTimeout(() => cb(auth.currentUser), 20); return () => subs.delete(cb); }
export class GoogleAuthProvider {
  setCustomParameters() { return this; }
  addScope() { return this; }
  static credential(idToken) { return { providerId: 'google.com', idToken }; }
}
export class OAuthProvider {
  constructor(id) { this.providerId = id; }
  setCustomParameters() { return this; }
  addScope() { return this; }
  credential(o) { return { providerId: this.providerId, ...o }; }
}
function cuentaGoogle() {
  const g = leer('stub-google', null) || { uid: 'g-prueba', email: 'prueba@gmail.com', displayName: 'Prueba Google' };
  const c = leer(A, {});
  if (!c[g.email]) { c[g.email] = { pass: null, u: { ...g, proveedor: 'google.com', emailVerified: true, alta: g.alta || alta() } }; guardar(A, c); }
  return c[g.email].u;
}
export async function signInWithPopup() { return entrar(cuentaGoogle()); }
export async function signInWithRedirect() { entrar(cuentaGoogle()); }
export async function getRedirectResult() { return null; }
export async function signInWithCredential() { return entrar(cuentaGoogle()); }
export async function createUserWithEmailAndPassword(a, email, pass) {
  email = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw err('auth/invalid-email');
  if (String(pass || '').length < 6) throw err('auth/weak-password');
  const c = leer(A, {});
  if (c[email]) throw err('auth/email-already-in-use');
  const u = { uid: 'e-' + email.replace(/[^a-z0-9]/g, '-'), email, displayName: null, proveedor: 'password', emailVerified: localStorage.getItem('stub-verificar') === '1', alta: alta() };
  c[email] = { pass, u }; guardar(A, c);
  return entrar(u);
}
export async function signInWithEmailAndPassword(a, email, pass) {
  email = String(email || '').trim().toLowerCase();
  const c = leer(A, {});
  if (!c[email] || c[email].pass !== pass) throw err('auth/invalid-credential');
  return entrar(c[email].u);
}
export async function sendEmailVerification(u) { window.__correosConfirmacion = (window.__correosConfirmacion || 0) + 1; }
export async function sendPasswordResetEmail(a, email) { window.__correosClave = (window.__correosClave || []).concat(email); }
export async function updateProfile(u, p) {
  const c = leer(A, {}), d = leer(K, null);
  if (d) { Object.assign(d, p); guardar(K, d); if (c[d.email]) { Object.assign(c[d.email].u, p); guardar(A, c); } }
  if (u) Object.assign(u, p);
}
export class EmailAuthProvider { static credential(email, pass) { return { providerId: 'password', email, pass }; } }
// volver a entrar antes de borrar la cuenta: con correo, la contraseña tiene que ser la buena
export async function reauthenticateWithCredential(u, cred) {
  if (cred.providerId === 'password') { const c = leer(A, {})[String(u.email || '').toLowerCase()]; if (!c || c.pass !== cred.pass) throw err('auth/invalid-credential'); }
  window.__reautenticado = (window.__reautenticado || 0) + 1; return { user: u };
}
export async function reauthenticateWithPopup(u) { window.__reautenticado = (window.__reautenticado || 0) + 1; return { user: u }; }
export async function deleteUser(u) {
  const c = leer(A, {}); delete c[String(u.email || '').toLowerCase()]; guardar(A, c);
  localStorage.removeItem(K); auth.currentUser = null; window.__cuentasBorradas = (window.__cuentasBorradas || 0) + 1; avisar();
}
export async function signOut() { localStorage.removeItem(K); auth.currentUser = null; avisar(); }
// 0.8.3 · los enlaces de los correos (cuenta.html): la prueba pone los códigos en «stub-oob» antes de abrir la página,
// {código: {mode, email, previo?, caducado?}}. Al usarlo, desaparece (como en Firebase, sirven una vez)
const oob = (code) => { const o = leer('stub-oob', {}); const x = o[code]; if (!x) throw err('auth/invalid-action-code'); if (x.caducado) throw err('auth/expired-action-code'); return x; };
const gastar = (code) => { const o = leer('stub-oob', {}); delete o[code]; guardar('stub-oob', o); };
const operacion = { verifyEmail: 'VERIFY_EMAIL', resetPassword: 'PASSWORD_RESET', recoverEmail: 'RECOVER_EMAIL', verifyAndChangeEmail: 'VERIFY_AND_CHANGE_EMAIL' };
export async function checkActionCode(a, code) { const x = oob(code); return { operation: operacion[x.mode], data: { email: x.email, previousEmail: x.previo || null } }; }
export async function applyActionCode(a, code) {
  const x = oob(code); gastar(code);
  const c = leer(A, {});
  if (x.mode === 'verifyEmail' && c[x.email]) { c[x.email].u.emailVerified = true; guardar(A, c); }
  window.__codigosUsados = (window.__codigosUsados || []).concat(code);
}
export async function verifyPasswordResetCode(a, code) { const x = oob(code); if (x.mode !== 'resetPassword') throw err('auth/invalid-action-code'); return x.email; }
export async function confirmPasswordReset(a, code, pass) {
  const x = oob(code);
  if (String(pass || '').length < 6) throw err('auth/weak-password');
  gastar(code);
  const c = leer(A, {}); if (c[x.email]) { c[x.email].pass = pass; guardar(A, c); }
  window.__clavesNuevas = (window.__clavesNuevas || []).concat(x.email);
}
// para la prueba: confirmar el correo de una cuenta como si hubiera tocado el enlace
window.__stubConfirmar = (email) => { const c = leer(A, {}); if (c[email]) { c[email].u.emailVerified = true; guardar(A, c); const d = leer(K, null); if (d && d.email === email) { d.emailVerified = true; guardar(K, d); } } };
