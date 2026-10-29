// 0.7d: el Worker lee el saldo del banco con las cabeceras PSU del navegador cuando la app dice que estás delante, y sin
// ellas cuando no (o cuando el banco pide alguna que no hay). Sin navegador: el Worker de verdad, con fetch de imitación.
import { test, expect } from '@playwright/test';
import { generateKeyPairSync, createSign } from 'node:crypto';
import worker from '../worker/src/index.js';

test.beforeEach(({}, info) => test.skip(info.project.name !== 'movil', 'una vez basta'));

const b64u = (b) => Buffer.from(b).toString('base64url');
const PROYECTO = 'growfolio-a79a9';

function preparar() {
  // la clave de la aplicación de Enable Banking y la de Firebase que firma el token de tu cuenta
  const eb = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const fb = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...fb.publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
  const ahora = Math.floor(Date.now() / 1000);
  const cab = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' }));
  const cue = b64u(JSON.stringify({ aud: PROYECTO, iss: `https://securetoken.google.com/${PROYECTO}`, sub: 'uid-1', iat: ahora - 10, exp: ahora + 3600, email: 'yo@prueba.com', email_verified: true }));
  const firma = createSign('RSA-SHA256').update(`${cab}.${cue}`).sign(fb.privateKey);
  const env = { EB_CLAVE: eb.privateKey.export({ type: 'pkcs8', format: 'pem' }), EB_APP: 'app-1', BANCO_EMAILS: 'yo@prueba.com', EB_API: 'https://eb.prueba', FB_JWKS: 'https://jwks.prueba' };
  return { env, token: `${cab}.${cue}.${b64u(firma)}`, jwk };
}

test('el saldo va con las cabeceras PSU solo si estás delante', async () => {
  const { env, token, jwk } = preparar();
  const vistas = [];
  const fetchAntes = globalThis.fetch;
  globalThis.fetch = async (url, op = {}) => {
    url = String(url);
    if (url === env.FB_JWKS) return new Response(JSON.stringify({ keys: [jwk] }));
    if (url.startsWith(env.EB_API)) {
      const h = Object.fromEntries(Object.entries(op.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
      vistas.push({ url, h });
      // un banco que pide la ubicación: con las otras cabeceras dice que falta una; sin ninguna, contesta
      if (url.includes('acc-exige') && h['psu-ip-address']) return new Response(JSON.stringify({ code: 422, error: 'PSU_HEADER_NOT_PROVIDED', message: 'Psu-Geo-Location' }), { status: 422 });
      // otro al que no le gusta una de las cabeceras (422 sin decir PSU_HEADER): también se repite sin ellas
      if (url.includes('acc-ipv6') && h['psu-ip-address']) return new Response(JSON.stringify({ code: 422, error: 'WRONG_REQUEST_PARAMETERS', message: 'psu-ip-address' }), { status: 422 });
      // cuentas cuya lectura falla: el permiso solo está caducado si su sesión ha terminado
      if (url.includes('acc-falla')) return new Response(JSON.stringify({ code: 403, error: 'ASPSP_ERROR' }), { status: 403 });
      if (url.includes('/sessions/ses-viva')) return new Response(JSON.stringify({ status: 'AUTHORIZED' }));
      if (url.includes('/sessions/ses-muerta')) return new Response(JSON.stringify({ status: 'EXPIRED' }));
      return new Response(JSON.stringify({ balances: [{ balance_type: 'CLBD', balance_amount: { amount: '10.00', currency: 'EUR' } }, { balance_type: 'ITAV', balance_amount: { amount: '1234.56', currency: 'EUR' } }] }));
    }
    throw new Error('fuera de la prueba: ' + url);
  };
  try {
    const pedir = (cuerpo) => worker.fetch(new Request('https://w.prueba/banco/saldos', {
      method: 'POST', body: JSON.stringify(cuerpo),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Origin: 'https://charly10sf.github.io', 'CF-Connecting-IP': '203.0.113.7', 'User-Agent': 'Navegador/1.0', 'Accept-Language': 'es-ES' },
    }), env, { waitUntil() {} }).then((r) => r.json());

    // con la app abierta delante
    let r = await pedir({ cuentas: ['acc-0001'], presente: true });
    expect(r.saldos['acc-0001']).toMatchObject({ importe: 1234.56, tipo: 'ITAV' });
    expect(r.presente).toBe(true);
    expect(vistas[0].h).toMatchObject({ 'psu-ip-address': '203.0.113.7', 'psu-user-agent': 'Navegador/1.0', 'psu-accept-language': 'es-ES' });
    expect(vistas[0].h['psu-geo-location']).toBeUndefined();

    // solo, sin ti: ninguna cabecera PSU
    vistas.length = 0;
    r = await pedir({ cuentas: ['acc-0001'] });
    expect(r.presente).toBe(false);
    expect(Object.keys(vistas[0].h).filter((k) => k.startsWith('psu-'))).toEqual([]);

    // el banco pide una que no hay: se vuelve a pedir sin ninguna y el saldo llega igual
    vistas.length = 0;
    r = await pedir({ cuentas: ['acc-exige'], presente: true });
    expect(r.saldos['acc-exige']).toMatchObject({ importe: 1234.56 });
    expect(r.presente, 'leída sin las cabeceras: la app tiene que saber que gasta del tope').toBe(false);
    expect(vistas.length).toBe(2);
    expect(Object.keys(vistas[1].h).filter((k) => k.startsWith('psu-'))).toEqual([]);
    vistas.length = 0;
    r = await pedir({ cuentas: ['acc-ipv6'], presente: true });
    expect(r.saldos['acc-ipv6']).toMatchObject({ importe: 1234.56 });
    expect(vistas.length).toBe(2);

    // revisión aparte de la 0.7d: un fallo de lectura no es «caducada» si la sesión sigue viva
    r = await pedir({ cuentas: ['acc-falla-1', 'acc-falla-2'], sesiones: { 'acc-falla-1': 'ses-viva', 'acc-falla-2': 'ses-muerta' } });
    expect(r.saldos['acc-falla-1'].error).toBe('fallo');
    expect(r.saldos['acc-falla-2'].error).toBe('caducada');
    // una app de antes (sin las sesiones): como hasta ahora
    r = await pedir({ cuentas: ['acc-falla-3'] });
    expect(r.saldos['acc-falla-3'].error).toBe('caducada');
  } finally {
    globalThis.fetch = fetchAntes;
  }
});
