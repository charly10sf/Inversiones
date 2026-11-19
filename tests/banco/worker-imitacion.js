// Mejorar la IA, parte 2 (19 nov 2026) · la imitación del Worker que usan los bancos de la IA con Claude
// (banco-claude.spec.js y banco-fundador.spec.js), con el MISMO código que worker/src/index.js para lo que decide qué se
// manda a Anthropic y lo que cuesta: se leen del Worker sus constantes y sus funciones puras (costeUso, sinTtl,
// adjuntoFuera, contarBloques, tareaMal…) y se ejecutan aquí. Así lo que mide el banco de coste es lo que paga Carlos
// (antes, el banco no aplicaba los topes del Worker ni el precio de Haiku por encima de 100.000 tokens de entrada).
// Las comprobaciones de la petición siguen el orden de manejarClaude para el nivel alto (el de Carlos):
// cuerpo de más de CLAUDE_MAX_CUERPO, JSON, reglas, modelo, max_tokens, messages, campos que pasan, herramientas con su
// tope de búsquedas, adjuntos, system con la nota delante, tareas, noticia, y el conteo de tokens con su tope de entrada
// (el doble en las rondas siguientes). Lo que NO se imita, a propósito: los topes del día (20 preguntas y 60 peticiones,
// las tareas y las 2 revisiones al día, el gasto de tareas de 2 $), la huella de las tareas, las 6 peticiones de una
// noticia y la ráfaga por minuto, que pararían el banco a mitad; tampoco convierte los errores de Anthropic como el
// Worker ({error:'claude'…}, 'sin-creditos'). Sí el de 16 peticiones por pregunta. Usa los valores por defecto del
// Worker, no las variables de entorno de producción.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const FUENTE_WORKER = readFileSync(join(AQUI, '..', '..', 'worker', 'src', 'index.js'), 'utf8');

// lo que se lee del Worker: constantes (la línea entera que empieza por «const NOMBRE») y funciones (hasta su llave final)
const CONSTANTES = ['CLAUDE_MODELOS', 'CLAUDE_CAMPOS', 'CLAUDE_MAX_SALIDA', 'BUSQUEDA', 'TAREAS_CLAUDE', 'CLAUDE_SALIDA_NOTICIA', 'CLAUDE_SALIDA_IMPORTAR', 'MODELO_FONDO', 'PRECIOS_CLAUDE', 'TOKENS_POR_BUSQUEDA', 'CLAUDE_MAX_ENTRADA', 'CLAUDE_NOTA', 'CLAUDE_NOTA_FUNDADOR'];
const FUNCIONES = ['costeUso', 'reservaMax', 'sinTtl', 'adjuntoFuera', 'contarBloques', 'tareaMal'];

function lineaConst(src, nombre) {
  const m = new RegExp(`^const ${nombre}\\b[^\\n]*$`, 'm').exec(src);
  if (!m) throw new Error(`el Worker ya no tiene «const ${nombre}»: la imitación del banco hay que revisarla`);
  return m[0];
}
function cuerpoFuncion(src, nombre) {
  const i = src.search(new RegExp(`^function ${nombre}\\(`, 'm'));
  if (i < 0) throw new Error(`el Worker ya no tiene «function ${nombre}»: la imitación del banco hay que revisarla`);
  let prof = 0, j = src.indexOf('{', i), en = null;
  for (let k = j; k < src.length; k++) {
    const ch = src[k];
    if (en) { if (ch === '\\') { k++; continue; } if (ch === en) en = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { en = ch; continue; }
    if (ch === '{') prof++;
    else if (ch === '}' && --prof === 0) return src.slice(i, k + 1);
  }
  throw new Error(`no se cierra «function ${nombre}»`);
}

/** Las constantes y funciones del Worker, ejecutadas aquí (sin red ni entorno de Cloudflare) */
export function delWorker(src = FUENTE_WORKER) {
  const lineas = [...new Set(CONSTANTES.map((n) => lineaConst(src, n)))];
  // PRECIOS_CLAUDE trae PRECIO_HAIKU_GRANDE en la misma línea; CLAUDE_MAX_SALIDA, CLAUDE_MAX_CUERPO; CLAUDE_MAX_ENTRADA,
  // CLAUDE_CONTAR_DESDE y CLAUDE_RONDAS_POR_PREGUNTA
  const codigo = `${lineas.join('\n')}\n${FUNCIONES.map((n) => cuerpoFuncion(src, n)).join('\n')}\nreturn { ${[...CONSTANTES, 'PRECIO_HAIKU_GRANDE', 'CLAUDE_MAX_CUERPO', 'CLAUDE_MAX_BUSQUEDAS', 'CLAUDE_CONTAR_DESDE', 'CLAUDE_RONDAS_POR_PREGUNTA', 'CLAUDE_MAX_PDF', 'CLAUDE_MAX_IMAGENES', ...FUNCIONES].join(', ')} };`;
  // eslint-disable-next-line no-new-func
  return new Function(codigo)();
}

/**
 * Prepara la petición como el Worker (nivel alto). Devuelve { cuerpo, entrada, busquedas } o { estado, error } si el
 * Worker la rechazaría. contar(cuerpo) → tokens de entrada (count_tokens de Anthropic), solo si hace falta, como allí.
 */
export async function prepararComoWorker(texto, { W = delWorker(), fundadorPermitido = true, contar = null, rondasDe = null } = {}) {
  const no = (estado, error, motivo) => ({ estado, error, ...(motivo ? { motivo } : {}) });
  if (texto.length > W.CLAUDE_MAX_CUERPO) return no(413, 'grande');
  let c;
  try { c = JSON.parse(texto); } catch (e) { return no(400, 'json'); }
  if (!c || typeof c !== 'object' || Array.isArray(c)) return no(400, 'json');
  if (c.reglas !== undefined && c.reglas !== 'fundador') return no(400, 'peticion', 'reglas');
  const conFundador = c.reglas === 'fundador';
  if (conFundador && !fundadorPermitido) return no(403, 'reglas');
  if (!W.CLAUDE_MODELOS.includes(String(c.model || '').toLowerCase())) return no(400, 'peticion', 'modelo');
  c.model = String(c.model).toLowerCase();
  if (!Number.isInteger(c.max_tokens) || c.max_tokens < 1 || c.max_tokens > W.CLAUDE_MAX_SALIDA) return no(400, 'peticion', 'max_tokens');
  if (!Array.isArray(c.messages) || !c.messages.length) return no(400, 'peticion', 'messages');
  const cuerpo = {};
  for (const k of W.CLAUDE_CAMPOS) if (c[k] !== undefined) cuerpo[k] = W.sinTtl(c[k]);
  const maxBusquedas = W.CLAUDE_MAX_BUSQUEDAS;
  let busquedas = 0;
  if (cuerpo.tools !== undefined) {
    if (!Array.isArray(cuerpo.tools) || cuerpo.tools.some((h) => !h || typeof h !== 'object' || (h.type && h.type !== 'custom' && String(h.type) !== W.BUSQUEDA))) return no(400, 'peticion', 'tools');
    if (cuerpo.tools.filter((h) => String(h.type || '') === W.BUSQUEDA).length > 1) return no(400, 'peticion', 'tools');
    cuerpo.tools = cuerpo.tools.map((h) => (String(h.type || '') === W.BUSQUEDA ? { ...h, max_uses: Math.max(1, Math.min(Number(h.max_uses) || maxBusquedas, maxBusquedas)) } : h));
    busquedas = cuerpo.tools.reduce((t, h) => t + (String(h.type || '') === W.BUSQUEDA ? h.max_uses : 0), 0);
  }
  if (W.adjuntoFuera(cuerpo.messages) || W.adjuntoFuera(cuerpo.system)) return no(400, 'peticion', 'adjunto');
  const pdfs = W.contarBloques(cuerpo.messages, 'document'), imgs = W.contarBloques(cuerpo.messages, 'image');
  if (pdfs > W.CLAUDE_MAX_PDF || imgs > W.CLAUDE_MAX_IMAGENES) return no(400, 'peticion', 'adjuntos');
  if (cuerpo.system !== undefined && typeof cuerpo.system !== 'string' && !Array.isArray(cuerpo.system)) return no(400, 'peticion', 'system');
  cuerpo.system = [{ type: 'text', text: conFundador ? W.CLAUDE_NOTA_FUNDADOR : W.CLAUDE_NOTA }, ...(typeof cuerpo.system === 'string' ? (cuerpo.system ? [{ type: 'text', text: cuerpo.system }] : []) : cuerpo.system || [])];
  const idPreg = typeof c.pregunta === 'string' && /^[a-z0-9]{8,64}$/i.test(c.pregunta) ? c.pregunta : null;
  const tarea = W.TAREAS_CLAUDE.includes(c.tarea);
  if (tarea && !idPreg) return no(400, 'peticion', 'pregunta');
  if (tarea) { const mal = W.tareaMal(c.tarea, cuerpo, String(cuerpo.model).toLowerCase()); if (mal) return no(400, 'peticion', mal); }
  if (c.tarea === 'importar') cuerpo.max_tokens = Math.min(cuerpo.max_tokens, W.CLAUDE_SALIDA_IMPORTAR);
  if (c.tarea === 'noticia') {
    cuerpo.max_tokens = Math.min(cuerpo.max_tokens, W.CLAUDE_SALIDA_NOTICIA);
    // (CLAUDE_BUSQUEDAS_NOTICIA = 2: no se lee, la noticia no la pasa el banco)
    if (cuerpo.tools) { cuerpo.tools = cuerpo.tools.map((h) => ({ ...h, max_uses: Math.min(h.max_uses, 2) })); busquedas = cuerpo.tools.reduce((t, h) => t + h.max_uses, 0); }
  }
  // el tope de peticiones de una misma pregunta (16)
  if (idPreg && rondasDe) {
    const n = rondasDe.get(idPreg) || 0;
    if (n >= W.CLAUDE_RONDAS_POR_PREGUNTA) return no(429, 'tope-pregunta');
    rondasDe.set(idPreg, n + 1);
  }
  const bytes = Buffer.byteLength(texto, 'utf8');
  let entrada = bytes, contados = null;
  if ((bytes > W.CLAUDE_CONTAR_DESDE || pdfs || imgs) && contar) {
    try { contados = await contar(cuerpo); } catch (e) { contados = null; }
    const ult = cuerpo.messages[cuerpo.messages.length - 1] || {}, sigue = ult.role === 'assistant' || (Array.isArray(ult.content) && ult.content.some((b) => b && b.type === 'tool_result'));
    const tope = W.CLAUDE_MAX_ENTRADA * (Number.isInteger(c.ronda) && c.ronda > 1 && sigue ? 2 : 1);
    if (contados != null && contados > tope) return no(413, 'grande');
    if (contados == null && pdfs) return no(503, 'cuenta');
    if (contados != null) entrada = contados;
  }
  return { cuerpo, entrada, contados, busquedas, conFundador, reserva: W.reservaMax(cuerpo.model, entrada, cuerpo.max_tokens, busquedas) };
}

/** El «usage» de una respuesta en directo (SSE): el de message_start con lo que añaden los message_delta, como leerUso */
export function usoDeSSE(sse) {
  let uso = {};
  for (const m of String(sse).matchAll(/^data:(.+)$/gm)) {
    let ev; try { ev = JSON.parse(m[1].trim()); } catch (e) { continue; }
    if (ev && ev.type === 'message_start' && ev.message && ev.message.usage) uso = { ...uso, ...ev.message.usage };
    else if (ev && ev.type === 'message_delta' && ev.usage) uso = { ...uso, ...ev.usage };
  }
  return uso;
}

/** count_tokens de Anthropic (gratis), con lo mismo que manda el Worker */
export function contadorAnthropic(clave) {
  return async (cuerpo) => {
    const { model, system, messages, tools, tool_choice, thinking } = cuerpo;
    const r = await fetch('https://api.anthropic.com/v1/messages/count_tokens', { method: 'POST', headers: { 'x-api-key': clave, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model, system, messages, ...(tools ? { tools } : {}), ...(tool_choice ? { tool_choice } : {}), ...(thinking ? { thinking } : {}) }) });
    const j = r.ok ? await r.json() : null;
    return j && Number.isFinite(j.input_tokens) ? j.input_tokens : null;
  };
}

/** Un fallo de Anthropic, como lo devuelve el Worker: [estado, cuerpo] (las mismas tres líneas que el final de su manejador) */
export function falloComoWorker(estado, texto) {
  let fallo = {}; try { fallo = JSON.parse(texto); } catch (e) { fallo = {}; }
  const e = (fallo && fallo.error) || {}, msg = String(e.message || '');
  if ((estado === 400 || estado === 429) && /credit balance|usage limits?|spend(ing)? limit/i.test(msg)) return [402, { error: 'sin-creditos' }];
  if (estado === 401 || estado === 403) return [502, { error: 'clave', estado }];
  return [estado >= 500 ? 502 : estado, { error: 'claude', estado, tipo: String(e.type || ''), motivo: msg.slice(0, 200) }];
}

/**
 * El manejador de la ruta del Worker para Playwright (context.route(WORKER, …)): prepara la petición como el Worker, la
 * manda a Anthropic y suma lo que ha costado con costeUso del Worker. gasto: { peticiones, entrada, cache_lee,
 * cache_escribe, salida, dolares, rechazadas }. alPedir(c): para mirar cada petición (el JSON que manda la app).
 */
export function imitarWorker({ clave, gasto, cors, alPedir = null, W = delWorker() }) {
  const rondasDe = new Map(), contar = contadorAnthropic(clave);
  for (const k of ['peticiones', 'entrada', 'cache_lee', 'cache_escribe', 'salida', 'dolares', 'rechazadas']) if (gasto[k] == null) gasto[k] = 0;
  const json = (estado, x) => ({ status: estado, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(x) });
  return async (r) => {
    const q = r.request();
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    const texto = q.postData() || '';
    if (alPedir) { try { alPedir(JSON.parse(texto)); } catch (e) { /* no es JSON: lo dice prepararComoWorker */ } }
    const p = await prepararComoWorker(texto, { W, contar, rondasDe });
    if (p.estado) { if (texto !== '{}') gasto.rechazadas++; return r.fulfill(json(p.estado, { error: p.error, ...(p.motivo ? { motivo: p.motivo } : {}) })); }
    gasto.peticiones++;
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': clave, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(p.cuerpo) });
    const sse = await res.text();
    if (res.ok) {
      const u = /event-stream/i.test(res.headers.get('content-type') || '') ? usoDeSSE(sse) : (() => { try { return JSON.parse(sse).usage || {}; } catch (e) { return {}; } })();
      const n = (x) => (Number(x) > 0 ? Number(x) : 0);
      gasto.entrada += n(u.input_tokens); gasto.cache_lee += n(u.cache_read_input_tokens); gasto.cache_escribe += n(u.cache_creation_input_tokens); gasto.salida += n(u.output_tokens);
      gasto.dolares += W.costeUso(p.cuerpo.model, u);
    }
    // 19 nov (mejorar-ia-2) · un fallo de Anthropic llega a la app como lo manda el Worker (su mismo final): sin saldo o con el
    // tope de gasto del workspace, 402 «sin-creditos»; la clave mal, 502 «clave»; lo demás, «claude» con su estado y su tipo.
    // Antes pasaba el error de Anthropic tal cual y la app no lo entendía como en producción
    if (!res.ok) return r.fulfill(json(...falloComoWorker(res.status, sse)));
    const extra = { 'X-Nivel': 'alto', 'X-Reglas': p.conFundador ? 'fundador' : 'estandar' };
    return r.fulfill({ status: res.status, headers: { ...cors, 'content-type': res.headers.get('content-type') || 'text/event-stream', ...extra }, body: sse });
  };
}
