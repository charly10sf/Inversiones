/* ---------- estado ---------- */
const S = {
  inst: {}, instOrden: [], ref: null, instCambiados: false, instSha: null,
  precios: null, cartera: null, enc: null, key: null, salt: null, iter: 600000,
  oculto: LS.get('inv-oculto', false), dim: LS.get('inv-dim', 'clase'), base: LS.get('inv-base', 'todo'),
  rango: LS.get('inv-rango', '1A'), califTab: LS.get('inv-calif3', 'ia'), expTab: LS.get('inv-exp', 'posiciones'), carTab: LS.get('inv-car', 'pos'), futTab: LS.get('inv-futtab', 'perfil'), fisTab: LS.get('inv-fistab', 'tu'), numAbierto: null, rutaPlazo: LS.get('inv-ruta-plazo', 'mes'), fichaRango: LS.get('inv-frango', '1A'),
  comparar: LS.get('inv-comparar', false), radarZona: LS.get('inv-zona', 'Todas'), radarOrden: LS.get('inv-orden2', 'ctr'),
  radarMin: LS.get('inv-radar-min', true), radarTodo: false, vista: 'cartera', ficha: null,
  ordenPos: LS.get('inv-orden-pos', { k: 'valor', dir: 'desc' }), bench: LS.get('inv-bench', 'fidelity-world'), proy: LS.get('inv-proy', {}), horizonte: LS.get('inv-horizonte', 20), proyCache: null,
  hist: null, histId: null, live: {}, liveM: {}, fxVivo: {}, binds: {}, M: null, ultimaCarga: 0,
  radar: null, radarId: null, radarVer: 0, liveR: {}, liveRVer: 0, radarVisibles: [], ideasTop: [], radarSolidas: LS.get('inv-radar-solidas', false),
  ia: null, iaPropio: null, iaRemoto: null, firmaPintada: null, radarSubs: '',
};

/* ---------- formato de números (siempre con punto de miles, como en tus apps) ---------- */
function fmtNum(n, d = 2) {
  if (n == null || !isFinite(n)) return '—';
  const neg = n < 0 && Math.abs(n).toFixed(d) !== (0).toFixed(d);
  let [i, f] = Math.abs(n).toFixed(d).split('.');
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '−' : '') + i + (d ? ',' + f : '');
}
// con un decimal, pero sin «,0» cuando es entero (25 %, no 25,0 %)
// sin «,0» cuando, ya redondeado, es entero (25,04 → «25»)
const fmtNumR = (n, d = 1) => fmtNum(n, isFinite(n) && Number(Math.abs(n).toFixed(d)) % 1 === 0 ? 0 : d);
const oc = (s) => (S.oculto ? '••••' : s);
const eur = (n, d = 2) => oc(fmtNum(n, d)) + '\u00a0€';
// el «+» solo si lo que se ve no es cero (+0,00 € o +0 % no tenían sentido)
const masSi = (n, d) => (n > 0 && Math.abs(n).toFixed(d) !== (0).toFixed(d) ? '+' : '');
const eurS = (n, d = 2) => (S.oculto ? '••••' : masSi(n, d) + fmtNum(n, d)) + '\u00a0€';
const pct = (n, d = 2) => (n == null || !isFinite(n) ? '—' : fmtNum(n, d) + '\u00a0%');
const pctS = (n, d = 2) => (n == null || !isFinite(n) ? '—' : masSi(n, d) + fmtNum(n, d) + '\u00a0%');
const cls = (n) => (n > 0.00001 ? 'up' : n < -0.00001 ? 'down' : 'flat');
const flecha = (n) => (n > 0.00001 ? '▲ ' : n < -0.00001 ? '▼ ' : '');
const decPrecio = (p) => { const a = Math.abs(p); const d = a >= 999.5 ? 0 : a >= 9.995 ? 2 : a >= 0.9995 ? 3 : a > 0 ? Math.min(10, 3 - Math.floor(Math.log10(a))) : 2; return d; };
const precioFmt = (p) => (p == null ? '—' : fmtNum(p, decPrecio(p)) + '\u00a0€');
function compacto(n) {
  // se redondea antes de elegir la unidad (999.999 salía «1.000 mil»)
  const a = Math.abs(n);
  if (Math.round(a / 1e5) * 1e5 >= 1e6 || a >= 1e6) return fmtNumR(n / 1e6, a >= 9.95e6 ? 0 : 1) + ' M';
  if (Math.round(a) >= 1000) return fmtNumR(n / 1e3, a >= 9950 ? 0 : 1) + L('\u00a0mil', 'k');
  return fmtNum(n, 0);
}

/* ---------- fechas ---------- */
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoyIso = () => iso(new Date());
const deIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
// sumar días de calendario (sin el desfase de una hora al cruzar el cambio de hora)
const sumarDias = (s, n) => { const d = deIso(s); d.setDate(d.getDate() + n); return iso(d); };
// meses de fecha a fecha (31 dic + 2 meses = 28 feb), como cuenta Hacienda los plazos de la regla de recompra
const sumarMeses = (s, n) => { const d = deIso(s), ult = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate(); return iso(new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), ult))); };
const fechaCorta = (s) => { if (!s) return '—'; const d = deIso(s); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
const fechaLarga = (s) => { if (!s) return '—'; const d = deIso(s); return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`; };
const mesAnio = (s) => { if (!s) return '—'; const d = deIso(s); return IDIOMA === 'en' ? `${MESES_EN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}` : `${MESES[d.getMonth()]} ${d.getFullYear()}`; };
function haceCuanto(t) {
  const min = Math.round((Date.now() - new Date(t).getTime()) / 60000);
  if (!isFinite(min)) return '—';
  if (min < 1) return L('ahora mismo', 'just now');
  if (min < 60) return L(`hace ${min} min`, `${min} min ago`);
  const h = Math.round(min / 60);
  if (h < 48) return L(`hace ${h} h`, `${h} h ago`);
  return L(`hace ${Math.round(h / 24)} días`, `${Math.round(h / 24)} days ago`);
}
const diasEntre = (a, b) => Math.round((deIso(b) - deIso(a)) / 86400000);

/* ---------- base64 y cifrado ---------- */
const TE = new TextEncoder(), TD = new TextDecoder();
const b64 = {
  enc(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); },
  dec(s) { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; },
  encTxt(t) { return this.enc(TE.encode(t)); },
  decTxt(s) { return TD.decode(this.dec(s.replace(/\s/g, ''))); },
};
async function derivarClave(pass, salt, iter) {
  const base = await crypto.subtle.importKey('raw', TE.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function cifrar(obj) { return cifrarCon(obj, S.key, S.kv, S.salt, S.iter); }
// lo que no es la cartera (el análisis propio que va a la cuenta) va con la clave de datos pero sin el sobre: un sobre
// guardado aparte seguiría abriéndose con la contraseña o el código de antes aunque los cambies
async function cifrarSinSobre(obj) { return S.kv ? cifrarCon(obj, S.key, { kid: S.kv.kid }) : cifrar(obj); }
async function cifrarCon(obj, key, kv, salt, iter) {
  // 0.6d: la cartera de prueba no se cifra nunca (así no puede acabar guardada encima de la tuya)
  if (S.demo || (obj && obj.demo === true)) throw new Error('La cartera de prueba no se guarda');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, TE.encode(JSON.stringify(obj))));
  if (kv) return JSON.stringify({ v: 2, kid: kv.kid, ...(kv.k ? { k: kv.k } : {}), iv: b64.enc(iv), ct: b64.enc(ct) }, null, 1) + '\n';
  return JSON.stringify({ v: 1, kdf: 'PBKDF2-SHA256', iter, salt: b64.enc(salt), iv: b64.enc(iv), ct: b64.enc(ct) }, null, 1) + '\n';
}
async function descifrar(texto, key) {
  const f = JSON.parse(texto);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.dec(f.iv) }, key, b64.dec(f.ct));
  return JSON.parse(TD.decode(pt));
}

