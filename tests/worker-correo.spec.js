// 0.8.3: la ruta /correo del Worker (los correos propios desde noreply@toison.es). Sin navegador: el Worker de verdad, con
// fetch de imitación (ni Google, ni Firebase, ni Resend reales). Comprueba quién puede pedir cada correo, los topes, que la
// contraseña olvidada no dice si la cuenta existe, el enlace a cuenta.html, el plan B y la firma de la cuenta de servicio.
import { test, expect } from '@playwright/test';
import { generateKeyPairSync, createSign, createVerify } from 'node:crypto';
import worker, { Cuotas } from '../worker/src/index.js';
import { grupoIp } from '../worker/src/correo.js';
import { render } from '../worker/src/correo-plantillas.js';

test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'una vez basta'));

const b64u = (b) => Buffer.from(b).toString('base64url');
const PROYECTO = 'growfolio-a79a9';
const fb = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...fb.publicKey.export({ format: 'jwk' }), kid: 'k-correo', alg: 'RS256', use: 'sig' };
const sa = generateKeyPairSync('rsa', { modulusLength: 2048 });
const SA = JSON.stringify({ type: 'service_account', client_email: 'correos@growfolio-a79a9.iam.gserviceaccount.com', private_key_id: 'sa-1', private_key: sa.privateKey.export({ type: 'pkcs8', format: 'pem' }) });

function token(uid, email, verificado) {
  const ahora = Math.floor(Date.now() / 1000);
  const cab = b64u(JSON.stringify({ alg: 'RS256', kid: 'k-correo', typ: 'JWT' }));
  const cue = b64u(JSON.stringify({ aud: PROYECTO, iss: `https://securetoken.google.com/${PROYECTO}`, sub: uid, iat: ahora - 10, exp: ahora + 3600, email, email_verified: verificado }));
  return `${cab}.${cue}.${b64u(createSign('RSA-SHA256').update(`${cab}.${cue}`).sign(fb.privateKey))}`;
}
function cuotasDeMentira() {
  const objetos = new Map();
  return {
    idFromName: (n) => n,
    get: (id) => ({
      fetch: (url, op) => {
        if (!objetos.has(id)) { const m = new Map(); objetos.set(id, { o: new Cuotas({ storage: { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); }, deleteAll: async () => { m.clear(); }, setAlarm: async () => {} } }), cola: Promise.resolve() }); }
        const x = objetos.get(id), r = x.cola.then(() => x.o.fetch(new Request(url, op)));
        x.cola = r.catch(() => {});
        return r;
      },
    }),
  };
}
const nuevoEnv = (extra = {}) => ({ RESEND_API_KEY: 're_prueba', FIREBASE_CORREO: SA, CUOTAS: cuotasDeMentira(), FB_JWKS: 'https://jwks.prueba', GOOGLE_TOKEN_URL: 'https://token.prueba/token', IDTK_URL: 'https://idtk.prueba', RESEND_URL: 'https://resend.prueba/emails', ...extra });

// cuentas que existen en el Firebase de mentira
const CUENTAS = new Set(['ana@prueba.com', 'toison.web.app+revision@gmail.com', 'beto@prueba.com']);
// fetch de imitación: apunta lo que llega a cada servicio
async function con(prueba, { resendFalla = false, fbFalla = false } = {}) {
  const v = { token: [], fb: [], resend: [] }, antes = globalThis.fetch;
  globalThis.fetch = async (url, op = {}) => {
    url = String(url);
    if (url === 'https://jwks.prueba') return new Response(JSON.stringify({ keys: [jwk] }));
    if (url === 'https://token.prueba/token') { v.token.push(String(op.body)); return new Response(JSON.stringify({ access_token: 'ya29.prueba', expires_in: 3600 })); }
    if (url === `https://idtk.prueba/v1/projects/${PROYECTO}/accounts:sendOobCode`) {
      const c = JSON.parse(op.body); v.fb.push({ c, auth: op.headers.Authorization });
      if (fbFalla && c.returnOobLink) return new Response(JSON.stringify({ error: { code: 500, message: 'INTERNAL' } }), { status: 500 });
      if (!CUENTAS.has(c.email)) return new Response(JSON.stringify({ error: { code: 400, message: 'EMAIL_NOT_FOUND' } }), { status: 400 });
      return new Response(JSON.stringify(c.returnOobLink ? { email: c.email, oobLink: `https://growfolio-a79a9.firebaseapp.com/__/auth/action?mode=x&oobCode=COD-${c.requestType}-1&apiKey=k&lang=es` } : { email: c.email }));
    }
    if (url === 'https://resend.prueba/emails') {
      v.resend.push({ c: JSON.parse(op.body), auth: op.headers.Authorization });
      return resendFalla ? new Response('{"message":"caído"}', { status: 500 }) : new Response(JSON.stringify({ id: 'em_1' }));
    }
    throw new Error('fuera de la prueba: ' + url);
  };
  try { await prueba(v); } finally { globalThis.fetch = antes; }
}
async function pedir(env, cuerpo, { uid, email, verificado, origen = 'https://charly10sf.github.io', ip = '1.2.3.4', ruta = '/correo', cab = {} } = {}) {
  const pendientes = [];
  const r = await worker.fetch(new Request('https://w.prueba' + ruta, {
    method: 'POST', body: JSON.stringify(cuerpo),
    headers: { 'Content-Type': 'application/json', Origin: origen, 'CF-Connecting-IP': ip, ...(uid ? { Authorization: `Bearer ${token(uid, email, verificado)}` } : {}), ...cab },
  }), env, { waitUntil: (p) => pendientes.push(p) });
  await Promise.all(pendientes);
  return { status: r.status, j: await r.json() };
}

test('sin la clave de Resend o la cuenta de servicio, la app sabe que tiene que usar Firebase', async () => {
  await con(async (v) => {
    for (const falta of [{ RESEND_API_KEY: '' }, { FIREBASE_CORREO: '' }, { FIREBASE_CORREO: '{"no":"vale"}' }]) {
      const r = await pedir(nuevoEnv(falta), { tipo: 'clave', correo: 'ana@prueba.com' });
      expect(r).toEqual({ status: 503, j: { ok: false, motivo: 'sin-config' } });
    }
    expect(v.resend.length + v.fb.length).toBe(0);
  });
});

test('confirmar: solo con sesión, para esa cuenta sin confirmar, uno por minuto; enlace a cuenta.html', async () => {
  await con(async (v) => {
    const env = nuevoEnv();
    expect((await pedir(env, { tipo: 'confirmar' })).j).toEqual({ ok: false, motivo: 'sesion' });
    expect((await pedir(env, { tipo: 'confirmar' }, { uid: 'u1', email: 'ana@prueba.com', verificado: true })).j).toEqual({ ok: false, motivo: 'ya' });
    // el correo que se pide en el cuerpo no cuenta: siempre el de la sesión
    const r = await pedir(env, { tipo: 'confirmar', lang: 'es', correo: 'otro@prueba.com' }, { uid: 'u2', email: 'ana@prueba.com', verificado: false, origen: 'https://toison.es' });
    expect(r).toEqual({ status: 200, j: { ok: true } });
    expect(v.fb[0].c).toEqual({ requestType: 'VERIFY_EMAIL', email: 'ana@prueba.com', returnOobLink: true });
    expect(v.fb[0].auth).toBe('Bearer ya29.prueba');
    const m = v.resend[0].c;
    expect(v.resend[0].auth).toBe('Bearer re_prueba');
    expect(m.from).toBe('Toisón <noreply@toison.es>');
    expect(m.reply_to).toBe('hola@toison.es');
    expect(m.to).toEqual(['ana@prueba.com']);
    expect(m.subject).toBe('Confirma tu correo de Toisón');
    const enlace = 'https://toison.es/app/cuenta.html?mode=verifyEmail&amp;oobCode=COD-VERIFY_EMAIL-1&amp;lang=es';
    expect(m.html).toContain(`href="${enlace}"`);
    expect(m.text).toContain('https://toison.es/app/cuenta.html?mode=verifyEmail&oobCode=COD-VERIFY_EMAIL-1&lang=es');
    expect(m.html).toContain('https://w.prueba/correo/img/hero-es.jpg?v=1');
    // el segundo en menos de un minuto, no
    const r2 = await pedir(env, { tipo: 'confirmar' }, { uid: 'u2', email: 'ana@prueba.com', verificado: false });
    expect(r2.status).toBe(429);
    expect(r2.j.motivo).toBe('espera');
    expect(r2.j.espera).toBeGreaterThan(0);
    expect(v.resend.length).toBe(1);
    // el permiso de Google se pide una vez y se guarda
    expect(v.token.length).toBe(1);
  });
});

test('en inglés y con la app de github.io', async () => {
  await con(async (v) => {
    const r = await pedir(nuevoEnv(), { tipo: 'confirmar', lang: 'en', base: 'https://charly10sf.github.io/Inversiones/' }, { uid: 'u3', email: 'beto@prueba.com', verificado: false, origen: 'https://toison.es' });
    expect(r.j.ok).toBe(true);
    expect(v.resend[0].c.subject).toBe('Confirm your Toisón email');
    expect(v.resend[0].c.html).toContain('/correo/img/hero-en.jpg?v=1');
    expect(v.resend[0].c.text).toContain('https://charly10sf.github.io/Inversiones/cuenta.html?mode=verifyEmail&oobCode=COD-VERIFY_EMAIL-1&lang=en');
    // una base que no es nuestra no se usa
    await pedir(nuevoEnv(), { tipo: 'confirmar', base: 'https://malo.example/' }, { uid: 'u4', email: 'beto@prueba.com', verificado: false, origen: 'https://toison.es' });
    expect(v.resend[1].c.text).toContain('https://toison.es/app/cuenta.html?');
    expect(v.resend[1].c.html).not.toContain('malo.example');
  });
});

test('contraseña olvidada: la misma respuesta exista o no la cuenta, desde nuestra web y con topes', async () => {
  await con(async (v) => {
    const env = nuevoEnv();
    expect((await pedir(env, { tipo: 'clave', correo: 'ana@prueba.com' }, { origen: 'https://malo.example' })).status).toBe(403);
    expect((await pedir(env, { tipo: 'clave', correo: 'no es un correo' })).j).toEqual({ ok: false, motivo: 'correo' });
    const existe = await pedir(env, { tipo: 'clave', correo: ' Ana@Prueba.com ' });
    const noExiste = await pedir(env, { tipo: 'clave', correo: 'nadie@prueba.com' });
    expect(existe).toEqual({ status: 200, j: { ok: true } });
    expect(noExiste).toEqual(existe);
    expect(v.resend.length).toBe(1);
    expect(v.resend[0].c.to).toEqual(['ana@prueba.com']);
    expect(v.resend[0].c.subject).toBe('Tu contraseña nueva de Toisón');
    expect(v.resend[0].c.text).toContain('cuenta.html?mode=resetPassword&oobCode=COD-PASSWORD_RESET-1&lang=es');
    expect(v.resend[0].c.text).toContain('La contraseña de tu cartera no cambia');
    // 3 por hora por correo (con la +etiqueta o los puntos de Gmail cuenta igual)
    const env2 = nuevoEnv();
    for (const c of ['beto@prueba.com', 'beto+1@prueba.com', 'beto@prueba.com']) expect((await pedir(env2, { tipo: 'clave', correo: c }, { ip: '9.9.9.' + c.length })).j.ok).toBe(true);
    // pasado el tope, «cupo»: la app manda el de Firebase (nadie puede dejar a otro sin poder cambiar su contraseña)
    const cuarta = await pedir(env2, { tipo: 'clave', correo: 'beto@prueba.com' }, { ip: '8.8.8.8' });
    expect(cuarta).toEqual({ status: 503, j: { ok: false, motivo: 'cupo' } });
    // y 10 por hora por IP
    const env3 = nuevoEnv();
    for (let i = 0; i < 10; i++) expect((await pedir(env3, { tipo: 'clave', correo: `x${i}@prueba.com` }, { ip: '5.5.5.5' })).j.ok).toBe(true);
    expect((await pedir(env3, { tipo: 'clave', correo: 'y@prueba.com' }, { ip: '5.5.5.5' })).j.motivo).toBe('cupo');
    // las IPv6 cuentan por su /64
    const env4 = nuevoEnv();
    for (let i = 0; i < 10; i++) expect((await pedir(env4, { tipo: 'clave', correo: `z${i}@prueba.com` }, { ip: `2001:db8:1:2::${i + 1}` })).j.ok).toBe(true);
    expect((await pedir(env4, { tipo: 'clave', correo: 'w@prueba.com' }, { ip: '2001:db8:1:2:ffff::9' })).j.motivo).toBe('cupo');
    expect(grupoIp('2001:db8:1:2:3:4:5:6')).toBe('2001:db8:1:2::/64');
    expect(grupoIp('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(grupoIp('1.2.3.4')).toBe('1.2.3.4');
  });
});

test('si Resend falla en la contraseña olvidada, la manda Firebase (plan B)', async () => {
  await con(async (v) => {
    const r = await pedir(nuevoEnv(), { tipo: 'clave', correo: 'ana@prueba.com' });
    expect(r.j).toEqual({ ok: true });
    expect(v.resend.length).toBe(1);
    expect(v.fb.map((x) => !!x.c.returnOobLink)).toEqual([true, false]);
  }, { resendFalla: true });
});

test('confirmar con Resend caído: la app recibe «fallo» y manda el de Firebase', async () => {
  await con(async () => {
    const r = await pedir(nuevoEnv(), { tipo: 'confirmar' }, { uid: 'u5', email: 'ana@prueba.com', verificado: false });
    expect(r).toEqual({ status: 502, j: { ok: false, motivo: 'fallo' } });
  }, { resendFalla: true });
});

test('bienvenida: con el correo confirmado y una sola vez (si falla, se puede volver a mandar)', async () => {
  const env = nuevoEnv();
  await con(async () => {
    expect((await pedir(env, { tipo: 'bienvenida' }, { uid: 'u6', email: 'ana@prueba.com', verificado: true })).j.motivo).toBe('fallo');
  }, { resendFalla: true });
  await con(async (v) => {
    expect((await pedir(env, { tipo: 'bienvenida' }, { uid: 'u7', email: 'ana@prueba.com', verificado: false })).j).toEqual({ ok: false, motivo: 'verificar' });
    const r = await pedir(env, { tipo: 'bienvenida', lang: 'es' }, { uid: 'u6', email: 'ana@prueba.com', verificado: true, origen: 'https://toison.es' });
    expect(r.j).toEqual({ ok: true });
    const m = v.resend[0].c;
    expect(m.subject).toBe('Te damos la bienvenida a Toisón');
    expect(m.html).toContain('href="https://toison.es/app/"');
    expect(m.html).toContain('/correo/img/hero-es.jpg?v=1');
    expect(m.html).toContain('/correo/img/i-candado.png?v=1');
    expect(v.fb.length).toBe(0);
    expect((await pedir(env, { tipo: 'bienvenida' }, { uid: 'u6', email: 'ana@prueba.com', verificado: true })).j).toEqual({ ok: false, motivo: 'ya' });
    expect(v.resend.length).toBe(1);
  });
});

test('el tope del día (plan gratis de Resend): pasado, la app usa Firebase', async () => {
  await con(async (v) => {
    const env = nuevoEnv({ CORREO_POR_DIA: '1' });
    expect((await pedir(env, { tipo: 'confirmar' }, { uid: 'u8', email: 'ana@prueba.com', verificado: false })).j.ok).toBe(true);
    expect((await pedir(env, { tipo: 'confirmar' }, { uid: 'u9', email: 'beto@prueba.com', verificado: false })).j).toEqual({ ok: false, motivo: 'cupo' });
    // la contraseña olvidada contesta igual y, con el día lleno, la manda Firebase
    expect((await pedir(env, { tipo: 'clave', correo: 'beto@prueba.com' })).j).toEqual({ ok: true });
    expect(v.resend.length).toBe(1);
    expect(v.fb.filter((x) => x.c.requestType === 'PASSWORD_RESET').map((x) => !!x.c.returnOobLink)).toEqual([true, false]);
  });
});

test('pedidos raros: tipo desconocido, cuerpo enorme, GET', async () => {
  await con(async (v) => {
    const env = nuevoEnv();
    expect((await pedir(env, { tipo: 'constructor' })).status).toBe(400);
    expect((await pedir(env, { tipo: 'clave', correo: 'a'.repeat(3000) + '@prueba.com' })).status).toBe(400);
    const g = await worker.fetch(new Request('https://w.prueba/correo'), env, { waitUntil() {} });
    expect(g.status).toBe(405);
    expect(v.resend.length).toBe(0);
  });
});

test('las imágenes de los correos se sirven con caché larga', async () => {
  const env = nuevoEnv();
  const r = await worker.fetch(new Request('https://w.prueba/correo/img/hero-es.jpg?v=1'), env, {});
  expect(r.status).toBe(200);
  expect(r.headers.get('Content-Type')).toBe('image/jpeg');
  expect(r.headers.get('Cache-Control')).toContain('max-age=31536000');
  const b = new Uint8Array(await r.arrayBuffer());
  expect([b[0], b[1]]).toEqual([0xff, 0xd8]);
  const p = await worker.fetch(new Request('https://w.prueba/correo/img/i-ia.png'), env, {});
  expect(p.headers.get('Content-Type')).toBe('image/png');
  expect((await worker.fetch(new Request('https://w.prueba/correo/img/constructor'), env, {})).status).toBe(404);
});

test('la ruta de pruebas: solo con el token del Worker de pruebas y solo a la cuenta de prueba', async () => {
  await con(async (v) => {
    const T = 'p'.repeat(40);
    expect((await pedir(nuevoEnv(), { tipo: 'clave' }, { ruta: '/correo/prueba', cab: { 'X-Prueba': T } })).status).toBe(404);
    const env = nuevoEnv({ PRUEBA_TOKEN: T });
    expect((await pedir(env, { tipo: 'clave' }, { ruta: '/correo/prueba', cab: { 'X-Prueba': 'otro' } })).status).toBe(404);
    expect((await pedir(env, { tipo: 'clave', correo: 'ana@prueba.com' }, { ruta: '/correo/prueba', cab: { 'X-Prueba': T } })).status).toBe(400);
    for (const tipo of ['confirmar', 'clave', 'bienvenida']) expect((await pedir(env, { tipo, lang: 'es' }, { ruta: '/correo/prueba', cab: { 'X-Prueba': T } })).j).toEqual({ ok: true, tipo, lang: 'es' });
    expect(v.resend.map((x) => x.c.to[0])).toEqual(Array(3).fill('toison.web.app+revision@gmail.com'));
  });
});

test('la firma de la cuenta de servicio es un JWT RS256 válido para Google', async () => {
  // otro proceso de cuenta: el permiso guardado es de otra cuenta de servicio, así que se pide uno nuevo
  const otra = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const SA2 = JSON.stringify({ client_email: 'otra@growfolio-a79a9.iam.gserviceaccount.com', private_key_id: 'sa-2', private_key: otra.privateKey.export({ type: 'pkcs8', format: 'pem' }) });
  await con(async (v) => {
    await pedir(nuevoEnv({ FIREBASE_CORREO: SA2 }), { tipo: 'confirmar' }, { uid: 'u10', email: 'ana@prueba.com', verificado: false });
    const q = new URLSearchParams(v.token[0]);
    expect(q.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    const [h, p, s] = q.get('assertion').split('.');
    const cab = JSON.parse(Buffer.from(h, 'base64url')), cue = JSON.parse(Buffer.from(p, 'base64url'));
    expect(cab).toEqual({ alg: 'RS256', typ: 'JWT', kid: 'sa-2' });
    expect(cue.iss).toBe('otra@growfolio-a79a9.iam.gserviceaccount.com');
    expect(cue.aud).toBe('https://token.prueba/token');
    expect(cue.scope).toContain('identitytoolkit');
    expect(cue.exp - cue.iat).toBe(3600);
    expect(createVerify('RSA-SHA256').update(`${h}.${p}`).verify(otra.publicKey, Buffer.from(s, 'base64url'))).toBe(true);
  });
});

test('las plantillas: texto escapado, versión de solo texto y los tres tipos en los dos idiomas', () => {
  for (const tipo of ['confirmar', 'clave', 'bienvenida']) for (const lang of ['es', 'en']) {
    const m = render(tipo, lang, { correo: 'a"<b>@x.com', enlace: 'https://toison.es/app/cuenta.html?mode=a&oobCode=b"c', img: (n) => `https://w/${n}` });
    expect(m.asunto).toBeTruthy();
    expect(m.html).not.toContain('<b>@x.com');
    expect(m.html).not.toContain('oobCode=b"c');
    expect(m.texto).toContain('toison.es');
    expect(m.html).toContain('hola@toison.es');
    expect(m.html).toContain(`lang="${lang}"`);
  }
  expect(() => render('otro', 'es', { correo: 'a@b.c', enlace: 'x', img: () => '' })).toThrow();
});

test('si Firebase no da el enlace de la contraseña olvidada, la misma respuesta y lo manda Firebase', async () => {
  await con(async (v) => {
    const r = await pedir(nuevoEnv(), { tipo: 'clave', correo: 'ana@prueba.com' });
    expect(r).toEqual({ status: 200, j: { ok: true } });
    expect(v.fb.map((x) => !!x.c.returnOobLink)).toEqual([true, false]);
    expect(v.resend.length).toBe(0);
  }, { fbFalla: true });
});

test('confirmar: desde nuestra web, y con cuentas en serie desde una IP, «cupo» (cae a Firebase)', async () => {
  await con(async (v) => {
    const env = nuevoEnv();
    expect((await pedir(env, { tipo: 'confirmar' }, { uid: 'c0', email: 'ana@prueba.com', verificado: false, origen: 'https://malo.example' })).j.motivo).toBe('origen');
    for (let i = 1; i <= 3; i++) expect((await pedir(env, { tipo: 'confirmar' }, { uid: 'c' + i, email: 'ana@prueba.com', verificado: false, ip: '7.7.7.7' })).j.ok).toBe(true);
    expect((await pedir(env, { tipo: 'confirmar' }, { uid: 'c4', email: 'beto@prueba.com', verificado: false, ip: '7.7.7.7' })).j).toEqual({ ok: false, motivo: 'cupo' });
    // y el mismo correo en muchas cuentas, 5 al día
    const env2 = nuevoEnv();
    for (let i = 1; i <= 5; i++) expect((await pedir(env2, { tipo: 'confirmar' }, { uid: 'd' + i, email: 'beto@prueba.com', verificado: false, ip: '6.6.6.' + i })).j.ok).toBe(true);
    expect((await pedir(env2, { tipo: 'confirmar' }, { uid: 'd6', email: 'beto@prueba.com', verificado: false, ip: '6.6.6.9' })).j.motivo).toBe('cupo');
    expect(v.resend.length).toBe(8);
  });
});

test('el Worker de pruebas (SOLO_PRUEBA) solo deja la ruta de pruebas y las imágenes', async () => {
  await con(async (v) => {
    const env = nuevoEnv({ SOLO_PRUEBA: '1', PRUEBA_TOKEN: 'q'.repeat(40) });
    expect((await pedir(env, { tipo: 'clave', correo: 'ana@prueba.com' })).status).toBe(404);
    expect((await pedir(env, { tipo: 'confirmar' }, { uid: 'e1', email: 'ana@prueba.com', verificado: false })).status).toBe(404);
    for (const ruta of ['/claude', '/isin', '/banco/inicio']) expect((await worker.fetch(new Request('https://w.prueba' + ruta, { method: 'POST' }), env, {})).status).toBe(404);
    expect((await worker.fetch(new Request('https://w.prueba/correo/img/hero-en.jpg'), env, {})).status).toBe(200);
    expect((await pedir(env, { tipo: 'bienvenida' }, { ruta: '/correo/prueba', cab: { 'X-Prueba': 'q'.repeat(40) } })).j.ok).toBe(true);
    expect(v.resend.length).toBe(1);
  });
});

test('los contadores de los correos se borran solos pasado su tiempo', async () => {
  const m = new Map(); let alarma = 0;
  const o = new Cuotas({ storage: { get: async (k) => m.get(k), put: async (k, val) => { m.set(k, val); }, delete: async (k) => { m.delete(k); }, deleteAll: async () => { m.clear(); }, setAlarm: async (t) => { alarma = t; } } });
  const hace3dias = Date.now() - 3 * 864e5;
  const r = await o.fetch(new Request('https://c/', { method: 'POST', body: JSON.stringify({ op: 'limite', ventanas: [[36e5, 3]], ahora: hace3dias }) }));
  expect((await r.json()).ok).toBe(true);
  expect(alarma).toBeGreaterThan(hace3dias);
  expect(m.size).toBe(1);
  await o.alarm();
  expect(m.size).toBe(0);
  // la marca de la bienvenida no se borra
  await o.fetch(new Request('https://c/', { method: 'POST', body: JSON.stringify({ op: 'una' }) }));
  await o.alarm();
  expect(m.get('u')).toBe(1);
});
