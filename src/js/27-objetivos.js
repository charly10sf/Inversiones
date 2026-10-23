/* =====================================================================
   Objetivos: quién eres como inversor (edad, situación, cuándo necesitas el dinero, cuánto riesgo
   aguantas, tus límites) y tus metas con cifra y fecha. Va dentro de la cartera cifrada. Con esto se
   ajustan la IA, el Paso a paso y la lectura de tu cartera: no se invierte igual a los 24 que a los 60.
   La IA, además, pregunta lo que le falte para afinar sus consejos.
   ===================================================================== */
const PERFIL_DEF = { nombre: null, edad: null, situacion: null, ingresos_mes: null, gastos_mes: null, colchon_meses: 6, horizonte: null, riesgo: null, experiencia: null, estilo: null, deudas: null, limite_cripto: 5, limite_empresa: 10, limite_oro: 10 };
const perfil = () => ({ ...PERFIL_DEF, ...((S.cartera && S.cartera.perfil) || {}) });
const perfilVacio = () => { const p = (S.cartera && S.cartera.perfil) || {}; return !p.edad && !p.horizonte && !p.riesgo; };
// en el perfil se marca en primera persona; SITUACION es como se le cuenta a GrowIA
const SITUACION_YO = { estudiante: 'Estudio', trabajando: 'Trabajo por cuenta ajena', autonomo: 'Soy autónomo o tengo empresa', paro: 'Busco trabajo', jubilado: 'Estoy jubilado' };
const SITUACION = { estudiante: 'Estudiando', trabajando: 'Trabajando por cuenta ajena', autonomo: 'Autónomo o empresa propia', paro: 'Buscando trabajo', jubilado: 'Jubilado' };
// se pueden marcar varias (estudias y trabajas): se guardan juntas, "estudiante,trabajando"
const SITUACION_EN = { estudiante: 'Studying', trabajando: 'Employed', autonomo: 'Self-employed or own business', paro: 'Looking for work', jubilado: 'Retired' };
// en la ficha del perfil va en el idioma de la app; a GrowIA se le cuenta siempre en español (es)
const situacionTxt = (s, es) => { const SIT = IDIOMA === 'en' && !es ? SITUACION_EN : SITUACION; const t = String(s || '').split(',').map((k) => SIT[k]).filter(Boolean).map((x, i) => (i ? x.toLowerCase() : x)); return t.length ? yLista(t) : ''; };
const RIESGO = {
  bajo: ['Vendería', 'para no perder más', 'Prudente'],
  medio: ['Esperaría', 'a que se recupere', 'Equilibrado'],
  alto: ['Compraría más', 'aprovechando que está barato', 'Decidido'],
};
const EXPERIENCIA = { poca: 'Estoy empezando', algo: 'Llevo un par de años', mucha: 'Llevo muchos años' };
const ESTILO = { crecimiento: 'Que crezca, aunque no dé dividendos', equilibrio: 'Un poco de todo', dividendos: 'Cobrar dividendos cada año' };
const DEUDAS = { no: 'Ninguna', hipoteca: 'Hipoteca', consumo: 'Préstamos o tarjetas' };
const HORIZONTES_P = [[2, 'en menos de 3 años'], [5, 'en 3 a 5 años'], [10, 'en 5 a 10 años'], [20, 'en 10 a 20 años'], [30, 'en más de 20 años']];
const textoHorizonte = (h) => (HORIZONTES_P.find(([x]) => x === +h) || [, h ? `en ${h} años` : '—'])[1];

/* cuánto en bolsa le toca a tu perfil: por el riesgo que aguantas, recortado por el plazo y la edad */
function bolsaRecomendada(p) {
  if (!p.riesgo && !p.horizonte && !p.edad) return null;
  let b = { bajo: 50, medio: 75, alto: 95 }[p.riesgo] ?? 75;
  const h = +p.horizonte;
  if (h && h <= 2) b = Math.min(b, 20); else if (h && h <= 5) b = Math.min(b, 45); else if (h && h <= 10) b = Math.min(b, 75);
  if (+p.edad >= 50) b -= Math.min(30, +p.edad - 50);
  b = Math.max(10, Math.min(100, Math.round(b / 5) * 5));
  return { pct: b, min: Math.max(0, b - 10), max: Math.min(100, b + 10) };
}

/* la foto de tu cartera frente a tu perfil */
function estadoPerfil(M) {
  const p = perfil(), total = M.total || 0;
  const v = (fn) => sum(M.filas.filter(fn), (f) => f.valor);
  const pc = (x) => (total ? (x / total) * 100 : 0);
  const sueltas = v((f) => f.inst.tipo === 'Acción'), cripto = v((f) => f.inst.clase === 'Cripto'), oro = v((f) => ['Oro', 'Materias primas'].includes(f.inst.clase));
  const bolsa = v((f) => f.inst.clase === 'Renta variable');
  const seguro = v((f) => ['Renta fija', 'Monetario'].includes(f.inst.clase)) + (M.liquidez || 0);
  const porEmp = new Map();
  for (const f of M.filas.filter((x) => x.inst.tipo === 'Acción')) { const y = porEmp.get(f.inst.id); if (y) y.valor += f.valor; else porEmp.set(f.inst.id, { f, valor: f.valor }); }
  const acciones = [...porEmp.values()].map(({ f, valor }) => ({ f, pct: pc(valor) })).sort((a, b) => b.pct - a.pct);
  const colchon = p.gastos_mes ? +p.gastos_mes * (+p.colchon_meses || 6) : null;
  return { p, total, pctSueltas: pc(sueltas), pctCripto: pc(cripto), pctOro: pc(oro), pctBolsa: pc(bolsa), cripto, seguro, colchon, mayor: acciones[0] || null, reco: bolsaRecomendada(p), metas: evaluarMetas(M) };
}

/* cada meta frente a la proyección: lo probable en su fecha, descontando las metas anteriores que se gastan */
const claveMeta = (m) => `${String(m.n || '').trim().toLowerCase()}|${m.tipo || ''}|${+m.importe || 0}|${+m.anio || ''}`;
function evaluarMetas(M) {
  // la misma meta guardada varias veces (pasaba al repetir el perfil guiado): se queda una y se guarda limpio
  if (S.cartera && Array.isArray(S.cartera.metas)) {
    const vistas = new Set(), unicas = S.cartera.metas.filter((m) => m && !vistas.has(claveMeta(m)) && vistas.add(claveMeta(m)));
    if (unicas.length < S.cartera.metas.length) { S.cartera.metas = unicas; S.senalesSucias = true; }
  }
  const metas = ((S.cartera && S.cartera.metas) || []).filter((m) => m && +m.importe > 0);
  if (!metas.length) return [];
  let pr = null; try { pr = proyeccion(M); } catch (e) {}
  const hoy = new Date();
  // 0.3.9: lo que sacas para una meta anterior (el piso en 2030) se resta de las siguientes con lo que ese dinero
  // habría crecido desde entonces, y solo a partir de su fecha (antes se restaba la cantidad tal cual y en todo momento)
  const gm = pr ? Math.exp((Math.log(1 + (pr.mu10 || pr.mu || 0) / 100) - ((pr.sd10 || pr.sd || 0) / 100) ** 2 / 2) / 12) - 1 : 0;
  const sacas = [];
  const gastadoEn = (i) => sum(sacas.filter((x) => x.meses <= i), (x) => x.importe * Math.pow(1 + Math.max(0, gm), i - x.meses));
  return [...metas].sort((a, b) => (+a.anio || 9999) - (+b.anio || 9999)).map((m0) => {
    const m = { ...m0, importe: +m0.importe, anio: +m0.anio || null };
    m.pct = Math.max(0, Math.min(100, (M.total / m.importe) * 100));
    m.antes = sacas.map((x) => x.m);
    if (m.anio && pr) {
      m.meses = Math.max(1, Math.min(360, (m.anio - hoy.getFullYear()) * 12 + (11 - hoy.getMonth())));
      const g = gastadoEn(m.meses);
      m.prob = pr.p50[m.meses] - g; m.mal = pr.p10[m.meses] - g;
      m.ok = m.prob >= m.importe; m.seguro = m.mal >= m.importe;
      // lo que haría falta aportar de más al mes: lo que falta, repartido en los meses que quedan y con lo que esas
      // aportaciones crecerían por el camino (a la rentabilidad mediana de tu mezcla), no solo dividido entre los meses
      const fac = gm > 0 ? (Math.pow(1 + gm, m.meses) - 1) / gm : m.meses;
      m.falta = Math.max(0, m.importe - m.prob); m.extraMes = m.falta ? m.falta / Math.max(1, fac) : 0;
    } else if (pr) {
      const i = pr.p50.findIndex((x, k) => x - gastadoEn(k) >= m.importe);
      m.cuando = i >= 0 ? pr.fechas[i] : null; m.ok = i >= 0;
    }
    if (m.tipo !== 'llegar' && m.meses) sacas.push({ importe: m.importe, meses: m.meses, m: { n: m.n, importe: m.importe, anio: m.anio } });
    return m;
  });
}
/* 0.3: tus objetivos frente a lo que tienes de verdad. Cada fila dice si encaja (bien), si roza tu límite (ojo) o si
   se sale (fuera), con la cifra de cada lado y qué hacer. La usan Análisis y el Paso a paso */
function comparaObjetivos(M) {
  const e = estadoPerfil(M), p = e.p, filas = [];
  if (!M.total) return { filas, e };
  const fila = (o) => filas.push(o);
  if (e.reco) {
    const b = e.pctBolsa, r = e.reco;
    const estado = b > r.max + 10 ? 'fuera' : b > r.max || b < r.min - 15 ? 'ojo' : 'bien';
    fila({ k: 'bolsa', t: L('Bolsa, frente a tu perfil', 'Stocks vs your profile'), estado, v: `${fmtNum(b, 0)} %`, m: L(`encaja ${r.min}–${r.max} %`, `fits ${r.min}–${r.max} %`), barra: { v: b, a: r.min, b: r.max },
      // 0.3.9: el texto sale de la banda (como en Tu perfil): dentro, encaja; por encima o por debajo, se dice
      txt: b >= r.min && b <= r.max ? L('Arriesgas lo que encaja con tu edad, tu plazo y lo que dices aguantar.', 'You take the risk that fits your age, horizon and tolerance.')
        : b > r.max ? L(`${fmtNum(b - r.max, 0)} puntos por encima de lo que encaja contigo: si la bolsa cae un 30 %, perderías unos ${eur(M.total * (b / 100) * 0.3, 0)}. Sin vender: lo nuevo, a lo seguro.`, `${fmtNum(b - r.max, 0)} % above what fits you: a 30 % fall would cost about ${eur(M.total * (b / 100) * 0.3, 0)}.`)
        : L('Por debajo de lo que encaja contigo: con tu plazo, más en bolsa te haría crecer más.', 'Below what fits you: with your horizon, more in stocks would grow more.') });
  }
  // por encima del límite, aunque sea poco, ya no es «rozando»: es «te pasas un poco» (5,3 % con un máximo del 5 %)
  const lim = (k, t, actual, limite, txts) => { const estado = actual > limite + MARGEN_LIM ? 'fuera' : actual > limite * 0.85 ? 'ojo' : 'bien'; const poco = estado === 'ojo' && actual > limite + 0.05; fila({ k, t, estado, v: `${fmtNum(actual, 1)} %`, m: L(`tu máximo ${fmtNum(limite, 0)} %`, `your max ${fmtNum(limite, 0)} %`), barra: { v: actual, b: limite, max: Math.max(limite * 1.6, actual * 1.1) }, txt: poco ? L('Te pasas un poco: no añadas y deja que tus aportaciones lo diluyan.', 'Slightly over: don’t add and let your contributions dilute it.') : txts[estado] }); };
  lim('sueltas', L('Acciones sueltas', 'Single stocks'), e.pctSueltas, +(S.cartera.limite_acciones ?? 20), { bien: L('Dentro de tu límite.', 'Within your limit.'), ojo: L('Cerca de tu límite: lo nuevo, mejor a tus fondos.', 'Close to your limit: new money, better to your funds.'), fuera: L('Te pasas de tu límite: no añadas y, si quieres volver a él, vende una parte.', 'Over your limit: don’t add, and sell a part to get back.') });
  if (e.pctCripto > 0) lim('cripto', 'Cripto', e.pctCripto, limiteDe('cripto'), { bien: L('Dentro de tu límite.', 'Within your limit.'), ojo: L('Rozando tu límite: con lo que se mueve, no añadas más.', 'Close to your limit: given how it swings, don’t add.'), fuera: L('Por encima de tu límite: un mal mes en cripto se notaría en todo.', 'Over your limit: a bad crypto month would show everywhere.') });
  if (e.pctOro > 0) lim('oro', L('Oro y materias primas', 'Gold and commodities'), e.pctOro, limiteDe('oro'), { bien: L('Dentro de tu límite.', 'Within your limit.'), ojo: L('Cerca de tu límite: no añadas más.', 'Close to your limit: don’t add.'), fuera: L('Por encima de tu límite: es un seguro, no el motor de la cartera.', 'Over your limit: it’s insurance, not the engine of the portfolio.') });
  if (e.mayor) lim('empresa', L(`Una sola empresa: ${e.mayor.f.inst.corto}`, `One company: ${e.mayor.f.inst.corto}`), e.mayor.pct, limiteDe('empresa'), { bien: L('Ninguna empresa pesa demasiado.', 'No company weighs too much.'), ojo: L('Cerca de tu máximo por empresa: no le metas más.', 'Close to your per-company max: don’t add.'), fuera: L('Pesa más de lo que te pusiste por empresa: un tropiezo suyo te dolería mucho.', 'Above your per-company max: a stumble would hurt a lot.') });
  if (e.colchon) { const c = e.seguro / e.colchon; fila({ k: 'colchon', t: L('Colchón para imprevistos', 'Emergency cushion'), estado: c >= 0.9 ? 'bien' : c >= 0.5 ? 'ojo' : 'fuera', v: eur(e.seguro, 0), m: L(`quieres ${eur(e.colchon, 0)}`, `you want ${eur(e.colchon, 0)}`), barra: { v: Math.min(100, c * 100), b: 100, max: 100, din: true }, txt: c >= 0.9 ? L('Lo tienes: un susto no te obliga a vender en mal momento.', 'You have it: a surprise won’t force you to sell at a bad time.') : L(`Te faltan ${eur(e.colchon - e.seguro, 0)}: complétalo antes de meter más en bolsa.`, `${eur(e.colchon - e.seguro, 0)} to go: before adding more to stocks.`) }); }
  for (const m of e.metas) {
    const estado = !m.anio ? (m.ok ? 'bien' : 'fuera') : m.seguro ? 'bien' : m.ok ? (m.tipo !== 'llegar' && m.meses <= 36 ? 'ojo' : 'bien') : m.falta > m.importe * 0.2 ? 'fuera' : 'ojo';
    fila({ k: 'meta:' + m.id, t: L(`Meta: ${m.n}`, `Goal: ${m.n}`), estado, v: m.prob != null ? euCorto(Math.max(0, m.prob)) : m.cuando ? anioDe(m.cuando) : '—', m: `${eur(m.importe, 0)}${m.anio ? ` ${L('en', 'in')} ${m.anio}` : ''}`, barra: m.prob != null ? { v: Math.min(100, (Math.max(0, m.prob) / m.importe) * 100), b: 100, max: 100, din: true } : null, txt: textoMeta(m).replace(/<[^>]+>/g, '') });
  }
  return { filas, e, bien: filas.filter((x) => x.estado === 'bien').length, fuera: filas.filter((x) => x.estado === 'fuera').length };
}
function htmlObjetivosVs(M) {
  const C = comparaObjetivos(M);
  if (!C.filas.length || perfilVacio()) return `<section class="ov-vacio"><div><h2>${L('¿Va tu cartera hacia lo que quieres?', 'Is your portfolio heading where you want?')}</h2><p>${L('Cuéntale a GrowFolio tu edad, tus metas y cuánto riesgo aguantas, y aquí verás, punto por punto, si lo que tienes encaja.', 'Tell GrowFolio your age, goals and risk tolerance, and here you’ll see, point by point, whether what you own fits.')}</p></div><button class="btn pri" data-accion="perfil-guiado">${ICONOS.perfil}${L('Rellenar tu perfil', 'Fill in your profile')}</button></section>`;
  const ic = { bien: ICONOS.ok, ojo: ICONOS.alerta, fuera: ICONOS.alerta };
  const barra = (b) => { if (!b) return ''; const max = b.max || 100, x = (v) => Math.max(0, Math.min(100, (v / max) * 100)); return `<span class="ov-barra${b.din ? ' din' : ''}" aria-hidden="true">${b.a != null ? `<i class="banda" style="left:${x(b.a).toFixed(1)}%;width:${(x(b.b) - x(b.a)).toFixed(1)}%"></i>` : b.din ? '' : `<i class="tope" style="left:${x(b.b).toFixed(1)}%"></i>`}<i class="val" style="width:${x(b.v).toFixed(1)}%"></i></span>`; };
  const resumen = C.fuera ? L(`${C.fuera} ${C.fuera === 1 ? 'se sale' : 'se salen'} de lo que querías`, `${C.fuera} off what you wanted`) : C.bien === C.filas.length ? L('Todo en orden', 'All in order') : L(`${C.bien} de ${C.filas.length} en orden`, `${C.bien} of ${C.filas.length} in order`);
  return `<section class="ov" aria-labelledby="hOv"><div class="sec-cab"><h2 id="hOv">${L('Tus objetivos frente a tu cartera', 'Your goals vs your portfolio')}</h2><span class="k ov-res ${C.fuera ? 'fuera' : C.bien === C.filas.length ? 'bien' : 'ojo'}">${resumen}</span><a class="enlace acento der" href="#futuro">${L('Cambiar tus objetivos', 'Change your goals')}</a></div>
    <ul class="ov-lista">${C.filas.map((f) => `<li class="ov-f ${f.estado}"><span class="ov-ic" aria-label="${f.estado === 'bien' ? L('En orden', 'OK') : f.estado === 'ojo' ? L('Ojo', 'Watch') : L('Se sale', 'Off')}">${ic[f.estado]}</span>
      <div class="ov-t"><b>${esc(f.t)}</b><small>${esc(f.txt)}</small></div>
      <div class="ov-c"><b>${S.oculto && /€/.test(f.v) ? '••••' : esc(f.v)}</b><small>${S.oculto && /€/.test(f.m) ? '' : esc(f.m)}</small>${barra(f.barra)}</div></li>`).join('')}</ul></section>`;
}
function textoMeta(m) {
  const conAntes = (m.antes || []).length ? ` Cuenta con que antes sacas ${yLista(m.antes.map((a) => `${eur(a.importe, 0)} para «${a.n}» en ${a.anio}`))}.` : '';
  if (!m.anio) return m.cuando ? (m.pct >= 100 && !conAntes ? 'Ya lo tienes.' : `Lo probable es llegar en ${MESES_LARGOS[deIso(m.cuando).getMonth()]} de ${m.cuando.slice(0, 4)}, con lo que aportas ahora.${conAntes}`) : 'Con lo que aportas ahora no llegas en 30 años: súbele la aportación en Proyección para ver cuánto haría falta.';
  if (m.prob == null) return '';
  if (m.seguro) return `Llegas de sobra: en ${m.anio} lo probable es tener ${euCorto(m.prob)}, e incluso si va mal, ${euCorto(m.mal)}.${conAntes}`;
  if (m.ok) return `Llegas en lo probable (${euCorto(m.prob)} en ${m.anio}), pero si la bolsa va mal te quedarías en ${euCorto(Math.max(0, m.mal))}.${m.tipo !== 'llegar' && m.meses <= 36 ? ' Como es en menos de 3 años, ve pasando ese dinero a algo que no baje.' : ''}${conAntes}`;
  return `Te faltarían unos ${eur(m.falta, 0)}: súbele unos ${eur(Math.ceil(m.extraMes / 10) * 10, 0)} al mes a la aportación o retrásala.${conAntes}`;
}

/* lo que la IA preguntó en su última revisión y aún no has contestado */
function preguntasIA() {
  const ia = iaActual(); if (!ia || !Array.isArray(ia.preguntas)) return [];
  const hechas = new Set((perfil().respuestas || []).map((r) => normTxt(r.q)));
  return ia.preguntas.filter((x) => x && x.q && !hechas.has(normTxt(x.q))).slice(0, 3);
}
function htmlPreguntasIA(compacto) {
  const qs = preguntasIA(); if (!qs.length) return '';
  if (compacto) return `<a class="ia-pregunta-aviso" href="#objetivos">${ICONOS.growia}<span><b>GrowIA quiere saber ${qs.length === 1 ? 'una cosa' : `${qs.length} cosas`} de ti</b> para afinar sus consejos</span><span class="k">Contestar</span></a>`;
  return `<section class="pf-preguntas" aria-labelledby="hPreg"><div class="sec-cab"><h2 id="hPreg" data-no-trad>${conIA('GrowIA quiere saber', 'GrowIA wants to know')}</h2><span class="k">con tu respuesta rehace sus consejos</span></div>
    ${qs.map((x, i) => `<div class="pf-preg" data-preg="${i}"><b>${esc(x.q)}</b>${x.por_que ? `<p class="k">${esc(x.por_que)}</p>` : ''}
      <div class="pf-opc">${(x.opciones || []).slice(0, 5).map((o) => `<button type="button" class="chip-btn" data-resp="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <form class="pf-otra"><input placeholder="${(x.opciones || []).length ? 'O escríbelo tú' : 'Tu respuesta'}" aria-label="Tu respuesta"><button class="btn peq">Responder</button></form></div>`).join('')}
  </section>`;
}
/* Cuando GrowIA pregunta algo, sale en una hoja propia al abrir (y al acabar su revisión), con las respuestas
   para tocar: una vez cada pregunta. Si la dejas para luego, sigue en Cartera y en Objetivos. */
const clavePreg = (x) => normTxt(x.q).slice(0, 80);
function preguntaNueva() {
  const vistas = LS.get('inv-preg-vistas', []);
  return preguntasIA().map((x, i) => ({ x, i })).find(({ x }) => !vistas.includes(clavePreg(x))) || null;
}
function mostrarPreguntaIA(seguir = () => {}) {
  const p = preguntaNueva();
  if (!p || copiaViejaPendiente() || document.querySelector('.hoja-fondo, #asesorFondo, .tour, .estreno, .intro')) return seguir();
  const { x, i } = p, total = preguntasIA().length;
  LS.set('inv-preg-vistas', [...LS.get('inv-preg-vistas', []), clavePreg(x)].slice(-40));
  const h = hoja('GrowIA te pregunta', `<div class="pregia">
      <div class="pregia-cab"><span class="pregia-ico ia-av">${AVATAR_IA}</span><p>Para afinar sus consejos${total > 1 ? ` (${total} preguntas)` : ''}</p></div>
      <h3>${esc(x.q)}</h3>${x.por_que ? `<p class="pregia-pq">${esc(x.por_que)}</p>` : ''}
      ${(x.opciones || []).length ? `<div class="pregia-opc">${x.opciones.slice(0, 5).map((o) => `<button type="button" class="btn" data-pregia="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : ''}
      <form class="pregia-otra"><input placeholder="${(x.opciones || []).length ? 'O escríbelo con tus palabras' : 'Tu respuesta'}" aria-label="Tu respuesta" maxlength="300"><button class="btn pri">Responder</button></form>
      <button type="button" class="enlace pregia-luego" data-cerrar>Luego (la tienes en Tus objetivos)</button>
    </div>`, () => seguir());
  const responde = async (a) => { if (!String(a || '').trim()) return; h.cerrar(true); await responderIA(i, a); setTimeout(() => mostrarPreguntaIA(seguir), 400); };
  h.el.addEventListener('click', (e) => { const b = e.target.closest('[data-pregia]'); if (b) responde(b.dataset.pregia); });
  $('.pregia-otra', h.el).onsubmit = (e) => { e.preventDefault(); responde(e.target.querySelector('input').value); };
}
async function responderIA(i, a) {
  const x = preguntasIA()[i]; if (!x || !String(a || '').trim()) return;
  const p = S.cartera.perfil = S.cartera.perfil || {};
  p.respuestas = [...(p.respuestas || []), { q: x.q, a: String(a).trim().slice(0, 300), f: hoyIso() }].slice(-25);
  p.actualizado = new Date().toISOString();
  AS.foto = null;
  await guardarYPintar('Respuesta a la IA');
  toast('Apuntado. GrowIA lo tendrá en cuenta en su próxima revisión.', 4000);
}

/* ---------- tus límites como un reparto: acciones sueltas, cripto y oro no pueden sumar más del 100 % ----------
   Al subir una, las otras bajan (la más grande primero). Lo que queda es para fondos y lo demás. El máximo en una
   sola empresa va dentro de las acciones sueltas: nunca puede ser mayor. */
const REPARTO = [['lim', 'Acciones sueltas', 'empresas compradas una a una, fuera de fondos', 100], ['cripto', 'Cripto', '', 50], ['oro', 'Oro y materias primas', '', 50]];
function htmlLimites(acc, cri, oro, emp) {
  const v = { lim: acc, cripto: cri, oro };
  const desl = (n, t, sub, max, val, cl) => `<label class="rp-desl ${cl}"><span class="rp-t"><span>${t}</span><b><output data-o="${n}">${fmtNum(val, 0)}</output> %</b></span><input type="range" name="${n}" min="0" max="${max}" step="1" value="${val}">${sub ? `<small class="k">${sub}</small>` : ''}</label>`;
  return `<div class="reparto" id="reparto">
      <p class="nota">Lo máximo que quieres tener en cada cosa. Si al subir uno el total pasa del 100 %, los demás bajan solos.</p>
      <div class="rp-barra" aria-hidden="true"><i class="rb-lim"><i class="rb-emp"></i></i><i class="rb-cripto"></i><i class="rb-oro"></i><i class="rb-resto"></i></div>
      ${REPARTO.map(([n, t, sub, max]) => desl(n, t, sub, max, Math.min(max, v[n]), 'rp-' + n)).join('')}
      <p class="rp-queda"><span>Fondos y lo demás</span><b><output data-o="resto"></output> %</b></p>
      ${desl('empresa', 'Una sola empresa', 'dentro de las acciones sueltas: nunca más que ellas', Math.max(acc, 1), Math.min(emp, acc), 'rp-empresa')}
    </div>`;
}
function enlazarReparto(rp) {
  if (!rp) return;
  const R = (n) => rp.querySelector(`[name="${n}"]`), grupo = REPARTO.map(([n]) => n);
  const pintarRp = () => {
    const val = (n) => +R(n).value, a = val('lim'), resto = Math.max(0, 100 - grupo.reduce((t, n) => t + val(n), 0));
    for (const o of rp.querySelectorAll('output[data-o]')) o.textContent = fmtNum(o.dataset.o === 'resto' ? resto : val(o.dataset.o), 0);
    for (const n of grupo) rp.querySelector('.rp-barra > .rb-' + n).style.width = val(n) + '%';
    rp.querySelector('.rp-barra .rb-resto').style.width = resto + '%';
    rp.querySelector('.rb-emp').style.width = (a ? Math.min(100, (val('empresa') / a) * 100) : 0) + '%';
    for (const n of [...grupo, 'empresa']) { const el = R(n); el.style.setProperty('--v', ((el.value - el.min) / ((el.max - el.min) || 1)) * 100 + '%'); }
  };
  const ajusta = (movido) => {
    let sobra = grupo.reduce((t, n) => t + +R(n).value, 0) - 100;
    if (sobra > 0) for (const n of grupo.filter((x) => x !== movido).sort((x, y) => R(y).value - R(x).value)) {
      const q = Math.min(+R(n).value, sobra); R(n).value = +R(n).value - q; sobra -= q; if (sobra <= 0) break;
    }
    const a = +R('lim').value, e = R('empresa');
    e.max = Math.max(a, 1); if (+e.value > a) e.value = a;
    pintarRp();
  };
  for (const n of [...grupo, 'empresa']) R(n).addEventListener('input', () => ajusta(n));
  pintarRp();
}
function barraLimite(t, actual, limite, sub) {
  const pasa = actual > limite + MARGEN_LIM;
  return `<div class="pf-lim${pasa ? ' pasa' : ''}"><div class="pf-lim-t"><span>${t}</span><b>${fmtNum(actual, 1)} %<small> de ${fmtNum(limite, 0)} %</small></b></div>
    <div class="pf-barra"><i style="width:${Math.min(100, (actual / Math.max(limite, 0.1)) * 100).toFixed(0)}%"></i></div>${sub ? `<small class="k">${sub}</small>` : ''}</div>`;
}
function htmlPerfil(M) {
  const e = estadoPerfil(M), p = e.p, vacio = perfilVacio();
  const fila = (t, v) => `<div><dt>${t}</dt><dd>${v || '<span class="k">sin decir</span>'}</dd></div>`;
  const metas = e.metas;
  const lectura = (() => {
    if (!e.reco) return '';
    // por la misma banda que «Tus objetivos frente a tu cartera» (antes, ±15 puntos sobre el centro: se contradecían)
    const dif = e.pctBolsa > e.reco.max ? e.pctBolsa - e.reco.max : e.pctBolsa < e.reco.min ? e.pctBolsa - e.reco.min : 0;
    const quien = (IDIOMA === 'en' ? [p.edad ? `${p.edad} years old` : '', p.horizonte ? `money needed ${trad(textoHorizonte(p.horizonte))}` : '', p.riesgo ? trad(RIESGO[p.riesgo][2]).toLowerCase() : ''] : [p.edad ? `${p.edad} años` : '', p.horizonte ? `el dinero ${textoHorizonte(p.horizonte)}` : '', p.riesgo ? RIESGO[p.riesgo][2].toLowerCase() : '']).filter(Boolean).join(', ');
    return `<div class="pf-lectura${dif > 10 || dif < -15 ? ' aviso' : ''}">
      <div class="pf-medidor" role="img" aria-label="${L(`En bolsa: ${fmtNum(e.pctBolsa, 0)} %. Para tu perfil: entre ${e.reco.min} y ${e.reco.max} %`, `In stocks: ${fmtNum(e.pctBolsa, 0)} %. For your profile: between ${e.reco.min} and ${e.reco.max} %`)}"><span class="pf-rango" style="left:${e.reco.min}%;width:${e.reco.max - e.reco.min}%"></span><span class="pf-tu" style="left:${Math.min(100, e.pctBolsa).toFixed(1)}%"></span></div>
      <div class="pf-medidor-ej"><span>0 %</span><span>${L('100 % en bolsa', '100 % in stocks')}</span></div>
      <p>${L(`<b>Para tu perfil${quien ? ` (${esc(quien)})` : ''}, lo normal es tener entre un ${e.reco.min} y un ${e.reco.max} % en bolsa.</b> Tú tienes un ${fmtNum(e.pctBolsa, 0)} %.`, `<b>For your profile${quien ? ` (${esc(quien)})` : ''}, the usual is between ${e.reco.min} and ${e.reco.max} % in stocks.</b> You have ${fmtNum(e.pctBolsa, 0)} %.`)} <span>${dif > 0 ? 'Arriesgas más de lo que encaja contigo: en una caída fuerte lo notarías mucho. Lo que aportes, mejor a renta fija o monetario hasta acercarte.' : dif < 0 ? 'Vas más conservador de lo que te permite tu perfil: a largo plazo, más bolsa suele dar bastante más.' : 'Encaja.'}</span></p>
    </div>`;
  })();
  return `
    ${htmlPreguntasIA()}
    ${vacio ? `<section class="pf-empieza">${dibujo('perfil')}<div><h2>Cuéntale a GrowFolio quién eres</h2><p>Tu edad, a qué te dedicas, cuándo vas a necesitar el dinero y cuánto riesgo aguantas. Es un minuto y con eso GrowIA, las ideas y el Paso a paso te aconsejan a tu medida: no se invierte igual a los 24 que a los 60.</p><button class="btn pri" data-accion="perfil-guiado">Empezar</button></div></section>` : perfilIncompleto() ? `<section class="pf-empieza pf-medias"><div><h2>Tu perfil está a medias</h2><p>${L(`Te faltan ${[!perfil().edad && 'tu edad', !perfil().horizonte && 'cuándo necesitarás el dinero', !perfil().riesgo && 'cuánto riesgo aguantas'].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' y $1')}. Sin eso, GrowIA te aconseja casi a ciegas.`, `Still missing: ${[!perfil().edad && 'your age', !perfil().horizonte && 'when you will need the money', !perfil().riesgo && 'how much risk you can take'].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' and $1')}. Without it, GrowIA is advising you almost blind.`)}</p><button class="btn pri" data-accion="perfil-guiado">Terminarlo</button></div></section>` : ''}
    <div class="pf-grid">
      ${vacio ? '' : `<section class="pf-card" aria-labelledby="hTu"><header><h2 id="hTu">Tú</h2><button class="enlace" data-accion="perfil">Editar</button></header>
        <dl class="pf-dl">${fila('Edad', p.edad ? `${p.edad} años` : '')}${fila('Vives en', nombreComunidad(p.comunidad))}${fila('Ahora mismo', situacionTxt(p.situacion))}${fila('Necesitarás la mayor parte', p.horizonte ? textoHorizonte(p.horizonte) : '')}${fila('Si cayera un 30 %', p.riesgo ? `${RIESGO[p.riesgo][0]} ${RIESGO[p.riesgo][1]}` : '')}${fila('Experiencia', EXPERIENCIA[p.experiencia])}${fila('Buscas', ESTILO[p.estilo])}${fila('Deudas', DEUDAS[p.deudas])}</dl>
        ${lectura}
      </section>`}
      <section class="pf-card" aria-labelledby="hLim"><header><h2 id="hLim">Tus límites</h2><button class="enlace" data-accion="perfil">Editar</button></header>
        ${barraLimite('Acciones sueltas', e.pctSueltas, +(S.cartera.limite_acciones ?? 20), 'empresas compradas una a una, fuera de fondos')}
        ${barraLimite('Cripto', e.pctCripto, limiteDe('cripto'))}
        ${e.pctOro > 0 ? barraLimite('Oro y materias primas', e.pctOro, limiteDe('oro')) : ''}
        ${e.mayor ? barraLimite(`Una sola empresa: ${esc(e.mayor.f.inst.corto)}`, e.mayor.pct, limiteDe('empresa'), 'la que más pesa de las que tienes sueltas') : ''}
        ${e.colchon ? `<div class="pf-lim${e.seguro < e.colchon * 0.9 ? ' pasa' : ''}"><div class="pf-lim-t"><span>Colchón para imprevistos</span><b>${eur(e.seguro, 0)}<small> de ${eur(e.colchon, 0)}</small></b></div><div class="pf-barra ok"><i style="width:${Math.min(100, (e.seguro / e.colchon) * 100).toFixed(0)}%"></i></div><small class="k">${p.colchon_meses || 6} meses de tus gastos, en efectivo, monetarios y renta fija</small></div>` : '<p class="k">Pon tus gastos al mes en Editar y GrowFolio te calcula el colchón que deberías tener aparte.</p>'}
      </section>
      <section class="pf-card pf-metas" aria-labelledby="hMet"><header><h2 id="hMet">Tus metas</h2>${metas.length ? `<button class="btn peq" data-accion="meta">${ICONOS.mas}Añadir</button>` : ''}</header>
        ${metas.length ? `<ul class="metas">${metas.map((m) => `<li class="${m.ok === false ? 'falta' : 'ok'}"><div class="meta-cab"><b>${esc(m.n)}</b><span class="k">${eur(m.importe, 0)}${m.anio ? ` en ${m.anio}` : ''}</span><button class="ib" data-accion="meta" data-id="${esc(m.id)}" aria-label="Editar la meta">${ICONOS.lapiz}</button></div><div class="pf-barra ok"><i style="width:${m.pct.toFixed(0)}%"></i></div><p>${textoMeta(m)}</p></li>`).join('')}</ul>` : '<p class="k">Algo con cifra y fecha: la entrada de un piso, un coche, la boda, llegar a 100.000 €, dejar de trabajar a los 55… GrowFolio calcula si llegas con lo que aportas y cuánto te falta.</p><button class="btn peq" data-accion="meta">' + ICONOS.mas + 'Añadir tu primera meta</button>'}
      </section>
      <section class="pf-card" aria-labelledby="hPIA"><header><h2 id="hPIA">Lo que GrowIA debe saber</h2><button class="enlace" data-accion="perfil-ia">Editar</button></header>
        <p class="pf-yo">${S.cartera.asesor && S.cartera.asesor.sobre_mi ? esc(S.cartera.asesor.sobre_mi) : '<span class="k">Tus planes, tus reglas, lo que no quieres comprar nunca, si vas a cambiar de trabajo… Lo que quieras que tenga en cuenta.</span>'}</p>
        ${(p.respuestas || []).length ? `<details class="mas"><summary>Lo que le has contestado (${p.respuestas.length})</summary><ul class="pf-resp">${p.respuestas.slice().reverse().map((r) => `<li><span class="k">${esc(r.q)}</span><b>${esc(r.a)}</b></li>`).join('')}</ul></details>` : ''}
      </section>
    </div>`;
}

function preguntarInicio(luego = () => {}) {
  const hoy = hoyIso().slice(0, 7), prim = (() => { const v = inicioCartera(); return v ? v.slice(0, 7) : ''; })();
  const h = hoja(L('¿Desde cuándo inviertes?', 'Since when have you been investing?'), `<form id="fIni" class="pf-form" novalidate>
    <p class="nota" style="margin:0 0 12px">${L('«Inicio» en la gráfica cuenta desde que empezaste a invertir, no desde que usas GrowFolio. Más o menos vale: el mes y el año.', '«Start» on the chart counts from when you started investing, not from when you started using GrowFolio. Roughly is fine: month and year.')}</p>
    <label class="campo">${L('Empecé a invertir en', 'I started investing in')}<input type="month" name="ini" max="${hoy}" value="${esc(prim && prim < hoy ? prim : '')}" required></label>
    <div class="error" id="errIni"></div>
    <div class="fila-btns"><button type="button" class="btn" id="bIniNo">${L('No me acuerdo', 'I don\'t remember')}</button><button type="submit" class="btn pri">${L('Guardar', 'Save')}</button></div>
    <p class="nota" style="margin:10px 0 0">${L('Lo puedes cambiar en tu perfil.', 'You can change it in your profile.')}</p>
  </form>`);
  const guardar = async (v) => {
    S.cartera.perfil = { ...(S.cartera.perfil || {}), inicio_inversion: v };
    h.cerrar(); luego();
    try { await guardarCarteraCallada(L('Desde cuándo inviertes', 'Since when you invest')); } catch (e) {}
  };
  $('#bIniNo', h.el).onclick = () => guardar('auto');
  $('#fIni', h.el).onsubmit = (ev) => {
    ev.preventDefault();
    const v = $('#fIni', h.el).ini.value;
    if (!/^\d{4}-\d{2}$/.test(v) || v > hoy) { $('#errIni', h.el).textContent = L('Pon el mes y el año en que empezaste.', 'Enter the month and year you started.'); return; }
    guardar(v);
  };
}
function editarPerfil() {
  const p = perfil();
  const radios = (nombre, obj, actual, fmt = (k, v) => esc(v)) => Object.entries(obj).map(([k, v]) => `<label class="opc"><input type="radio" name="${nombre}" value="${k}"${actual === k ? ' checked' : ''}><span>${fmt(k, v)}</span></label>`).join('');
  const h = hoja('Tu perfil de inversor', `<form id="fPerfil" class="pf-form" novalidate>
    <p class="nota" style="margin:0">Va dentro de tu cartera cifrada. Con esto GrowIA, el Paso a paso y las ideas se ajustan a ti.</p>
    <div class="form-grid">
      <label class="campo">Tu nombre<input name="nombre" maxlength="40" autocomplete="given-name" value="${val(p.nombre || LS.get('inv-nombre', '') || '')}" placeholder="Para saludarte al entrar"></label>
      <label class="campo">Edad<input name="edad" inputmode="numeric" value="${val(p.edad)}" placeholder="24"></label>
      <label class="campo">Dónde vives<select name="comunidad">${opcionesComunidad(p.comunidad)}</select><small>Para tus impuestos (País Vasco y Navarra tienen su propia escala) y las noticias de tu comunidad.</small></label>
      <label class="campo">¿Cuándo necesitarás la mayor parte del dinero?<select name="horizonte"><option value="">Elige</option>${HORIZONTES_P.map(([k, t]) => `<option value="${k}"${+p.horizonte === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
    </div>
    <fieldset class="opciones"><legend>A qué te dedicas <span class="k">(puedes marcar varias)</span></legend><div class="opc-fila">${(() => { const sel = new Set(String(p.situacion || '').split(',')); return Object.entries(SITUACION_YO).map(([k, v]) => `<label class="opc"><input type="checkbox" name="situacion" value="${k}"${sel.has(k) ? ' checked' : ''}><span>${esc(v)}</span></label>`).join(''); })()}</div></fieldset>
    <fieldset class="opciones"><legend>Si tu cartera cayera un 30 % en unos meses, ¿qué harías?</legend><div class="opc-fila">${radios('riesgo', RIESGO, p.riesgo, (k, v) => `<b>${v[0]}</b><small>${v[1]}</small>`)}</div></fieldset>
    <fieldset class="opciones"><legend>¿Cuánto llevas invirtiendo?</legend><div class="opc-fila">${radios('experiencia', EXPERIENCIA, p.experiencia)}</div></fieldset>
    <label class="campo">Empecé a invertir en<input type="month" name="ini" max="${hoyIso().slice(0, 7)}" value="${/^\d{4}-\d{2}/.test(p.inicio_inversion || '') ? esc(String(p.inicio_inversion).slice(0, 7)) : ''}"><small>Más o menos. «Inicio» en la gráfica cuenta desde aquí.</small></label>
    <fieldset class="opciones"><legend>Qué buscas</legend><div class="opc-fila">${radios('estilo', ESTILO, p.estilo)}</div></fieldset>
    <fieldset class="opciones"><legend>Deudas que estés pagando</legend><div class="opc-fila">${radios('deudas', DEUDAS, p.deudas)}</div></fieldset>
    <div class="form-grid">
      <label class="campo">Gastos al mes (€)<input name="gastos" inputmode="decimal" value="${val(p.gastos_mes)}" placeholder="1.200"><small>De media. Sirve para calcular tu colchón.</small></label>
      <label class="campo">Colchón<select name="colchon">${[3, 6, 9, 12].map((n) => `<option value="${n}"${+p.colchon_meses === n ? ' selected' : ''}>${n} meses de gastos</option>`).join('')}</select><small>Con trabajo fijo bastan 3-6; si no, mejor 9-12.</small></label>
      <label class="campo">Ingresos netos al mes (€)<input name="ingresos" inputmode="decimal" value="${val(p.ingresos_mes)}" placeholder="Opcional"><small>Para saber cuánto podrías aportar.</small></label>
    </div>
    <h3 class="pf-sub">Tus límites</h3>
    ${htmlLimites(+(S.cartera.limite_acciones ?? 20), limiteDe('cripto'), limiteDe('oro'), limiteDe('empresa'))}
    <div class="error" id="errPerfil"></div>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri">Guardar</button></div>
  </form>`, null, true);
  enlazarReparto($('#reparto', h.el));
  $('#fPerfil', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.target, n = (x) => { const v = numero(x); return v == null || isNaN(v) ? null : v; }, r = (k) => (f.querySelector(`[name=${k}]:checked`) || {}).value || null;
    const edad = n(f.edad.value), lim = n(f.lim.value), cri = n(f.cripto.value), emp = n(f.empresa.value);
    if (edad != null && (edad < 14 || edad > 100)) { $('#errPerfil', h.el).textContent = 'Revisa la edad.'; return; }
    if ([lim, cri, emp].some((x) => x != null && (x < 0 || x > 100))) { $('#errPerfil', h.el).textContent = 'Los límites van de 0 a 100 %.'; return; }
    const antes = S.cartera.perfil || {};
    const nombre = (f.nombre.value || '').trim().slice(0, 40) || null;
    if (nombre) LS.set('inv-nombre', nombre); else LS.del('inv-nombre');
    S.cartera.perfil = { ...antes, inicio_inversion: f.ini.value || (antes.inicio_inversion === 'auto' ? 'auto' : null), nombre, edad, comunidad: f.comunidad.value || null, horizonte: n(f.horizonte.value), situacion: [...f.querySelectorAll('[name=situacion]:checked')].map((x) => x.value).join(',') || null, riesgo: r('riesgo'), experiencia: r('experiencia'), estilo: r('estilo'), deudas: r('deudas'), gastos_mes: n(f.gastos.value), colchon_meses: n(f.colchon.value) || 6, ingresos_mes: n(f.ingresos.value), limite_cripto: cri ?? 5, limite_empresa: emp ?? 10, limite_oro: n(f.oro.value) ?? 10, actualizado: new Date().toISOString() };
    if (lim != null) S.cartera.limite_acciones = lim;
    AS.foto = null;
    await guardarYPintar('Perfil de inversor', h);
    toast('Guardado. GrowIA rehará sus consejos con tu perfil.', 4000);
  };
}
/* El perfil guiado: una pregunta por pantalla, con botones grandes, en vez del formulario largo. Sale solo al entrar
   si tu perfil está sin hacer (a los nuevos, justo después del tutorial). Si le das a «Luego», se vuelve a ofrecer a
   los 2 días, después a los 4 y luego cada semana. Mientras falte: un aviso arriba en Cartera y un punto en
   Objetivos (en el móvil, en «Más», que es donde está Objetivos y por eso pasaba desapercibido). */
const perfilIncompleto = () => { const p = (S.cartera && S.cartera.perfil) || {}; return !p.edad || !p.horizonte || !p.riesgo; };
function tocaPerfilGuiado() {
  if (!S.cartera || !perfilIncompleto()) return false;
  const l = LS.get('inv-perfil-luego', null);
  if (!l || !l.t) return true;
  return Date.now() - l.t > (l.n <= 1 ? 2 : l.n === 2 ? 4 : 7) * 864e5;
}
// si este dispositivo tiene una cartera de antes sin revisar, primero eso (puede traer ya tu perfil)
const copiaViejaPendiente = () => false;   // 0.5: ya no se busca la cartera de antes
function pedirPerfil(siSale, siNo) {
  if (!tocaPerfilGuiado() || copiaViejaPendiente() || document.querySelector('.hoja-fondo, #asesorFondo, .tour, .estreno, .intro')) return siNo();
  perfilGuiado(siSale);
}
const METAS_RAPIDAS = [['Entrada de un piso', 'gastar', 40000, 5], ['Un coche', 'gastar', 20000, 3], ['Llegar a 100.000 €', 'llegar', 100000, null], ['Dejar de trabajar antes', 'llegar', 500000, null]];
const PASOS_PERFIL = [
  { k: 'hola', q: '¿Quién eres?', sub: 'Tu nombre para saludarte, tu edad para saber cuánto tiempo tiene tu dinero por delante y tu comunidad para tus impuestos.', falta: (d) => !d.edad || !d.comunidad },
  { k: 'situacion', q: '¿En qué andas ahora?', sub: 'Puedes marcar varias.', falta: (d) => !d.situacion },
  { k: 'horizonte', q: '¿Cuándo vas a necesitar la mayor parte de este dinero?', sub: 'Lo que vayas a gastar en un par de años no debería estar en bolsa; lo que no vayas a tocar en 20, sí.', falta: (d) => !d.horizonte },
  { k: 'riesgo', q: 'Si tu cartera cayera un 30 % en unos meses, ¿qué harías?', sub: 'Di lo que harías de verdad: es lo que más cambia los consejos. En 2020 la bolsa cayó eso en un mes.', falta: (d) => !d.riesgo },
  { k: 'experiencia', q: '¿Cuánto llevas invirtiendo?', falta: (d) => !d.experiencia },
  { k: 'estilo', q: '¿Qué buscas con tu dinero?', falta: (d) => !d.estilo },
  { k: 'numeros', q: 'Tus números', sub: 'Opcional. Con tus gastos GrowFolio te calcula el colchón que deberías tener aparte; con tus ingresos, cuánto podrías aportar.', falta: (d) => !d.gastos_mes && !d.deudas },
  { k: 'meta', q: '¿Para qué inviertes?', sub: 'Algo con cifra y fecha. GrowFolio calcula si llegas con lo que aportas. Luego puedes añadir más en Análisis > Tus objetivos.', falta: () => !((S.cartera && S.cartera.metas) || []).length },
];
function perfilGuiado(seguir = () => {}) {
  const d = { ...perfil() };
  if (!d.nombre) d.nombre = LS.get('inv-nombre', '') || (FB.user && FB.user.displayName ? String(FB.user.displayName).split(/\s+/)[0] : '') || null;
  const meta = { n: '', tipo: 'gastar', importe: null, anio: null };
  const P = PASOS_PERFIL, ultimo = P.length;   // ultimo = la pantalla de «Listo»
  let i = Math.max(0, P.findIndex((x) => x.falta(d))), tocado = false, acabado = false;
  const h = hoja('Tu perfil de inversor', `<div class="pg">
      <div class="pg-barra" aria-hidden="true"><i></i></div>
      <div class="pg-paso"></div>
      <div class="error pg-err"></div>
      <div class="pg-pie"><button type="button" class="btn pg-atras">Atrás</button><span class="pg-cuenta"></span><button type="button" class="btn pri pg-sig">Siguiente</button></div>
      <button type="button" class="enlace pg-luego">Luego, ahora no puedo</button>
    </div>`, () => salir());
  h.el.classList.add('hoja-pg');
  const caja = $('.pg-paso', h.el), err = $('.pg-err', h.el);
  const op = (name, k, html, on, tipo = 'radio') => `<label class="opc"><input type="${tipo}" name="${name}" value="${k}"${on ? ' checked' : ''}><span>${html}</span></label>`;
  const radios = (name, obj, fmt = (v) => esc(v)) => `<div class="opc-fila">${Object.entries(obj).map(([k, v]) => op(name, k, fmt(v), String(d[name] ?? '') === String(k))).join('')}</div>`;
  const cuerpo = (x) => {
    if (x.k === 'hola') return `<div class="form-grid"><label class="campo">Tu nombre<input name="nombre" maxlength="40" autocomplete="given-name" value="${val(d.nombre || '')}" placeholder="Para saludarte al entrar"></label><label class="campo">Edad<input name="edad" inputmode="numeric" maxlength="3" value="${val(d.edad)}" placeholder="24"></label><label class="campo">Dónde vives<select name="comunidad">${opcionesComunidad(d.comunidad)}</select><small>Para tus impuestos. No usa tu ubicación.</small></label></div>`;
    if (x.k === 'situacion') { const sel = new Set(String(d.situacion || '').split(',')); return `<div class="opc-fila">${Object.entries(SITUACION).map(([k, v]) => op('situacion', k, esc(v), sel.has(k), 'checkbox')).join('')}</div>`; }
    if (x.k === 'horizonte') return `<div class="opc-fila">${HORIZONTES_P.map(([k, t]) => op('horizonte', k, esc(t[0].toUpperCase() + t.slice(1)), +d.horizonte === k)).join('')}</div>`;
    if (x.k === 'riesgo') return radios('riesgo', RIESGO, (v) => `<b>${v[0]}</b><small>${v[1]}</small>`);
    if (x.k === 'experiencia') return radios('experiencia', EXPERIENCIA);
    if (x.k === 'estilo') return radios('estilo', ESTILO);
    if (x.k === 'numeros') return `<div class="form-grid"><label class="campo">Gastos al mes (€)<input name="gastos" inputmode="decimal" value="${val(d.gastos_mes)}" placeholder="1.200"></label><label class="campo">Ingresos netos al mes (€)<input name="ingresos" inputmode="decimal" value="${val(d.ingresos_mes)}" placeholder="1.800"></label></div>
      <p class="pg-mini">Deudas que estés pagando</p>${radios('deudas', DEUDAS)}`;
    if (x.k === 'meta') return `<div class="opc-fila">${METAS_RAPIDAS.map(([n], j) => op('rapida', j, esc(n), meta.n === n)).join('')}</div>
      <div class="form-grid pg-meta"><label class="campo">Qué es<input name="mn" maxlength="60" value="${val(meta.n)}" placeholder="O escribe la tuya"></label><label class="campo">Cuánto (€)<input name="mi" inputmode="decimal" value="${val(meta.importe)}" placeholder="40.000"></label><label class="campo">Para qué año<input name="ma" inputmode="numeric" maxlength="4" value="${val(meta.anio)}" placeholder="${new Date().getFullYear() + 5}"></label></div>`;
    return '';
  };
  const listo = () => {
    const r = bolsaRecomendada(d), e = S.M && S.M.total ? estadoPerfil(S.M) : null;
    return `<div class="pg-listo">${ICONOS.ok}<h3>${L('Listo', 'Done')}${d.nombre ? `, ${esc(d.nombre)}` : ''}</h3>
      ${r ? `<p>${L(`Para ti, lo normal es tener entre un <b>${r.min}</b> y un <b>${r.max} %</b> de tu dinero en bolsa${e ? `. Ahora tienes un ${fmtNum(e.pctBolsa, 0)} %` : ''}.`, `For you, the usual is to have between <b>${r.min}</b> and <b>${r.max} %</b> of your money in stocks${e ? `. You now have ${fmtNum(e.pctBolsa, 0)} %` : ''}.`)}</p>` : ''}
      <p>GrowIA, el Paso a paso y las ideas ya te aconsejan con esto. Lo puedes cambiar cuando quieras en Análisis > Tus objetivos, donde están también tus límites y tus metas.</p></div>`;
  };
  const pintarPaso = () => {
    err.textContent = '';
    $('.pg-barra i', h.el).style.width = `${(Math.min(i, ultimo) / ultimo) * 100}%`;
    const fin = i >= ultimo, x = P[i];
    caja.innerHTML = fin ? listo() : `<h3 class="pg-q">${x.q}</h3>${x.sub ? `<p class="pg-sub">${x.sub}</p>` : ''}${cuerpo(x)}`;
    $('.pg-cuenta', h.el).textContent = fin ? '' : L(`${i + 1} de ${ultimo}`, `${i + 1} of ${ultimo}`);
    $('.pg-atras', h.el).style.visibility = i > 0 && !fin ? 'visible' : 'hidden';
    const sig = $('.pg-sig', h.el), opcional = x && ['numeros', 'meta'].includes(x.k);
    sig.textContent = fin ? 'Ver mis objetivos' : x.k === 'meta' ? (meta.n || meta.importe ? 'Terminar' : 'Sin meta por ahora') : opcional && !(d.gastos_mes || d.ingresos_mes || d.deudas) ? 'Saltar' : 'Siguiente';
    $('.pg-luego', h.el).textContent = fin ? 'Seguir a mi cartera' : 'Luego, ahora no puedo';
    const primero = caja.querySelector('input:not([type=radio]):not([type=checkbox])');
    if (primero && window.innerWidth > 720) primero.focus({ preventScroll: true });
  };
  // lo que hay escrito en la pantalla, al borrador (devuelve un error si algo no cuadra)
  const leer = () => {
    const x = P[i]; if (!x) return '';
    const v = (n) => { const el = caja.querySelector(`[name=${n}]`); return el ? el.value : ''; }, num = (n) => { const t = numero(v(n)); return t == null || isNaN(t) ? null : t; };
    if (x.k === 'hola') {
      const edad = num('edad');
      if (v('edad').trim() && (edad == null || edad < 14 || edad > 100)) return 'Revisa la edad.';
      d.nombre = v('nombre').trim().slice(0, 40) || null; d.edad = edad; d.comunidad = v('comunidad') || null;
    } else if (x.k === 'situacion') d.situacion = [...caja.querySelectorAll('[name=situacion]:checked')].map((c) => c.value).join(',') || null;
    else if (x.k === 'numeros') {
      const g = num('gastos'), n = num('ingresos');
      if ((v('gastos').trim() && g == null) || (v('ingresos').trim() && n == null)) return 'Pon solo números, por ejemplo 1.200.';
      d.gastos_mes = g; d.ingresos_mes = n;
    } else if (x.k === 'meta') {
      meta.n = v('mn').trim().slice(0, 60); meta.importe = num('mi'); meta.anio = num('ma');
      const a = new Date().getFullYear();
      if (meta.n || meta.importe) {
        if (!meta.n) return 'Ponle un nombre a la meta.';
        if (!(meta.importe > 0)) return 'Pon cuánto dinero es.';
        if (meta.anio != null && (meta.anio < a || meta.anio > a + 60)) return 'Revisa el año.';
        if (meta.tipo === 'gastar' && !meta.anio) return 'Para gastarlo hace falta el año.';
      }
    }
    tocado = true; return '';
  };
  const guardar = async () => {
    const campos = ['nombre', 'edad', 'comunidad', 'situacion', 'horizonte', 'riesgo', 'experiencia', 'estilo', 'deudas', 'gastos_mes', 'ingresos_mes'];
    const nuevo = { ...(S.cartera.perfil || {}) };
    for (const k of campos) nuevo[k] = d[k] ?? null;
    for (const k of ['colchon_meses', 'limite_cripto', 'limite_empresa', 'limite_oro']) if (nuevo[k] == null) nuevo[k] = PERFIL_DEF[k];
    nuevo.actualizado = new Date().toISOString();
    S.cartera.perfil = nuevo;
    if (d.nombre) LS.set('inv-nombre', d.nombre);
    if (meta.n && meta.importe > 0 && !(S.cartera.metas || []).some((x) => claveMeta(x) === claveMeta(meta))) S.cartera.metas = [...(S.cartera.metas || []), { id: nuevoId('m-'), n: meta.n, tipo: meta.tipo, importe: meta.importe, anio: meta.anio || null }];
    AS.foto = null;
    await guardarCartera('Perfil de inversor');
    pintar();
  };
  const salir = async () => {
    if (acabado) return seguir();
    if (tocado) { try { await guardar(); } catch (e) { console.warn(e); } }
    if (perfilIncompleto()) {
      const l = LS.get('inv-perfil-luego', null) || { n: 0 };
      LS.set('inv-perfil-luego', { n: (l.n || 0) + 1, t: Date.now() });
      toast(tocado ? 'Guardado lo que has contestado. Lo terminas en Análisis > Tus objetivos cuando quieras.' : 'Lo tienes en Análisis > Tus objetivos cuando quieras. Te lo recordaré en unos días.', 4500);
    }
    seguir();
  };
  const avanzar = async () => {
    if (i >= ultimo) { acabado = true; h.cerrar(true); location.hash = '#objetivos'; return seguir(); }
    const e = leer(); if (e) { err.textContent = e; return; }
    i++;
    if (i === ultimo) {
      const b = $('.pg-sig', h.el); b.disabled = true; b.textContent = 'Guardando…';
      try { await guardar(); acabado = true; LS.del('inv-perfil-luego'); } catch (er) { err.textContent = 'No se ha podido guardar. Prueba otra vez.'; i--; b.disabled = false; return; }
      b.disabled = false;
    }
    pintarPaso();
  };
  h.el.addEventListener('change', (ev) => {
    const t = ev.target; if (!t.name || !P[i]) return;
    if (t.type === 'radio' && t.name === 'rapida') {
      const [n, tipo, imp, anios] = METAS_RAPIDAS[+t.value];
      Object.assign(meta, { n, tipo, importe: imp, anio: anios ? new Date().getFullYear() + anios : null });
      caja.querySelector('[name=mn]').value = n; caja.querySelector('[name=mi]').value = val(imp); caja.querySelector('[name=ma]').value = meta.anio || '';
      $('.pg-sig', h.el).textContent = 'Terminar';
      return;
    }
    if (t.type === 'radio') {
      d[t.name] = t.name === 'horizonte' ? +t.value : t.value; tocado = true;
      // una sola respuesta: pasa sola a la siguiente (menos las deudas, que van con los números)
      if (t.name !== 'deudas') setTimeout(() => { if (P[i] && P[i].k === t.name) avanzar(); }, 260);
      else $('.pg-sig', h.el).textContent = 'Siguiente';
    }
  });
  h.el.addEventListener('input', (ev) => { if (P[i] && P[i].k === 'meta' && ev.target.name === 'mn') meta.tipo = /llegar|dejar de trabajar|vivir de|patrimonio|jubil/i.test(ev.target.value) ? 'llegar' : meta.tipo; if (P[i] && P[i].k === 'meta') $('.pg-sig', h.el).textContent = ev.target.value ? 'Terminar' : $('.pg-sig', h.el).textContent; });
  h.el.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target.matches('.pg input:not([type=radio]):not([type=checkbox])')) { ev.preventDefault(); avanzar(); } });
  $('.pg-sig', h.el).onclick = () => avanzar();
  $('.pg-atras', h.el).onclick = () => { if (leer()) return; i = Math.max(0, i - 1); pintarPaso(); };
  $('.pg-luego', h.el).onclick = () => h.cerrar();
  pintarPaso();
}
function editarMeta(id) {
  const metas = S.cartera.metas = S.cartera.metas || [];
  const m = metas.find((x) => x.id === id) || { tipo: 'gastar' };
  const h = hoja(id ? 'Tu meta' : 'Nueva meta', `<form id="fMeta" class="pf-form" novalidate>
    <label class="campo">Qué es<input name="n" value="${val(m.n)}" placeholder="Entrada del piso" maxlength="60"></label>
    <fieldset class="opciones"><legend>Tipo</legend><div class="opc-fila">
      <label class="opc"><input type="radio" name="tipo" value="gastar"${m.tipo !== 'llegar' ? ' checked' : ''}><span><b>Gastar ese dinero</b><small>piso, coche, boda, estudios…</small></span></label>
      <label class="opc"><input type="radio" name="tipo" value="llegar"${m.tipo === 'llegar' ? ' checked' : ''}><span><b>Llegar a tenerlo</b><small>un patrimonio, vivir de rentas…</small></span></label></div></fieldset>
    <div class="form-grid">
      <label class="campo">Cuánto (€)<input name="importe" inputmode="decimal" value="${val(m.importe)}" placeholder="40.000"></label>
      <label class="campo">Para qué año<input name="anio" inputmode="numeric" value="${val(m.anio)}" placeholder="${new Date().getFullYear() + 5}"><small>Si es «Llegar a tenerlo», déjalo vacío y GrowFolio te dice cuándo llegas.</small></label>
    </div>
    <div class="error" id="errMeta"></div>
    <div class="fila-btns">${id ? '<button type="button" class="btn peligro izq" id="bBorrarMeta">Borrar</button>' : ''}<button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri">Guardar</button></div>
  </form>`);
  if (id) dosPasos($('#bBorrarMeta', h.el), '¿Seguro?', async () => { S.cartera.metas = metas.filter((x) => x.id !== id); AS.foto = null; await guardarYPintar('Borrar meta', h); });
  $('#fMeta', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.target, importe = numero(f.importe.value), anio = numero(f.anio.value), tipo = (f.querySelector('[name=tipo]:checked') || {}).value || 'gastar';
    const err = (t) => { $('#errMeta', h.el).textContent = t; };
    if (!f.n.value.trim()) return err('Ponle un nombre.');
    if (!(importe > 0)) return err('Pon cuánto dinero es.');
    if (anio != null && !isNaN(anio) && (anio < new Date().getFullYear() || anio > new Date().getFullYear() + 60)) return err('Revisa el año.');
    if (tipo === 'gastar' && !anio) return err('Para gastarlo hace falta el año.');
    const nueva = { id: m.id || nuevoId('m-'), n: f.n.value.trim(), tipo, importe, anio: anio || null };
    S.cartera.metas = id ? metas.map((x) => (x.id === id ? nueva : x)) : [...metas, nueva];
    S.cartera.perfil = { ...(S.cartera.perfil || {}), actualizado: new Date().toISOString() };
    AS.foto = null;
    await guardarYPintar(id ? 'Cambiar meta' : 'Nueva meta', h);
  };
}
function editarSobreMi() {
  const yo = (S.cartera.asesor && S.cartera.asesor.sobre_mi) || '';
  const h = hoja('Lo que GrowIA debe saber', `<form id="fYo"><label class="campo">Cuéntaselo con tus palabras<textarea name="yo" rows="7" placeholder="Por ejemplo: quiero comprar piso en 2030, no quiero empresas de armas, cobro un extra en junio, prefiero no tocar los fondos…">${esc(yo)}</textarea><small>Va dentro de tu cartera cifrada. Lo lee GrowIA cuando le preguntas y en su repaso de cada día.</small></label>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri">Guardar</button></div></form>`);
  $('#fYo', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    S.cartera.asesor = { ...(S.cartera.asesor || {}), sobre_mi: ev.target.yo.value.trim() };
    S.cartera.perfil = { ...(S.cartera.perfil || {}), actualizado: new Date().toISOString() };
    AS.foto = null;
    await guardarYPintar('Asesor: sobre ti', h);
  };
}

/* lo que lee la IA de tu perfil */
function textoPerfil(M) {
  const e = estadoPerfil(M), p = e.p, L = [];
  if (perfilVacio()) L.push('No ha rellenado su perfil todavía: si te falta algo que cambie tus consejos (edad, en qué anda, cuándo necesita el dinero, cuánto riesgo aguanta), pregúntaselo.');
  const d = [p.edad && `${p.edad} años`, p.comunidad && `vive en ${nombreComunidad(p.comunidad)}${TRAMOS_FORAL[p.comunidad] ? ' (régimen foral: su escala del ahorro es ' + textoTramos(p.comunidad) + ')' : ''}`, situacionTxt(p.situacion, true), p.horizonte && `necesitará la mayor parte del dinero ${textoHorizonte(p.horizonte)}`, p.riesgo && `si la cartera cae un 30 %: ${RIESGO[p.riesgo][0].toLowerCase()} (${RIESGO[p.riesgo][2].toLowerCase()})`, EXPERIENCIA[p.experiencia] && `experiencia: ${EXPERIENCIA[p.experiencia].toLowerCase()}`, ESTILO[p.estilo] && `busca: ${ESTILO[p.estilo].toLowerCase()}`, DEUDAS[p.deudas] && `deudas: ${DEUDAS[p.deudas].toLowerCase()}`, p.ingresos_mes && `ingresos netos ${E0(+p.ingresos_mes)} al mes`, p.gastos_mes && `gastos ${E0(+p.gastos_mes)} al mes`].filter(Boolean);
  if (d.length) L.push(d.join('; ') + '.');
  if (e.reco) L.push(`Bolsa que encaja con su perfil según GrowFolio: entre ${e.reco.min} y ${e.reco.max} %. Tiene un ${fmtNum(e.pctBolsa, 0)} %.`);
  L.push(`Sus límites: acciones sueltas ${fmtNum(+(S.cartera.limite_acciones ?? 20), 0)} % (lleva ${fmtNum(e.pctSueltas, 1)} %), cripto ${fmtNum(+p.limite_cripto, 0)} % (lleva ${fmtNum(e.pctCripto, 1)} %), una sola empresa ${fmtNum(+p.limite_empresa, 0)} %${e.mayor ? ` (la mayor, ${e.mayor.f.inst.corto}, ${fmtNum(e.mayor.pct, 1)} %)` : ''}.`);
  if (e.colchon) L.push(`Colchón que quiere: ${p.colchon_meses} meses de gastos, ${E0(e.colchon)}. Tiene ${E0(e.seguro)} entre efectivo, monetarios y renta fija.`);
  for (const m of e.metas) L.push(`- Meta "${m.n}": ${m.tipo === 'llegar' ? 'llegar a tener' : 'gastar'} ${E0(m.importe)}${m.anio ? ` en ${m.anio}` : ''}. Hoy tiene ${E0(M.total)}, un ${fmtNum(m.pct, 0)} % de la meta. ${textoMeta(m).replace(/<[^>]+>/g, '')}`);
  for (const r of (p.respuestas || []).slice(-12)) L.push(`- Le preguntaste "${r.q}" y contestó: "${r.a}" (${r.f}).`);
  return L;
}

/* los pasos que salen de tu perfil: colchón, límites, metas y bolsa frente a lo que aguantas */
function pasosPerfil(M, add) {
  const e = estadoPerfil(M), p = e.p, hoy = hoyIso(), mes = hoy.slice(0, 7);
  if (perfilVacio()) add('mes', { id: 'perfil:0', cuando: 'un minuto', t: 'Cuéntale a GrowFolio tu edad, tus metas y cuánto riesgo aguantas', pq: 'Con eso estos pasos, las ideas y GrowIA se ajustan a ti: no se invierte igual a los 24 que a los 60.', acc: '<button class="enlace" data-accion="perfil-guiado">Rellenar tu perfil</button>' });
  if (p.deudas === 'consumo') add('mes', { id: `deuda:${mes}`, cuando: 'antes que nada', t: 'Liquida los préstamos o tarjetas antes de invertir más', pq: 'Suelen costar un 7-25 % al año: devolverlos es una rentabilidad segura que la bolsa no te garantiza.', como: 'Lo que ibas a aportar este mes, a amortizar el préstamo más caro. Las aportaciones automáticas, en pausa hasta acabar.' });
  const cubreVentas = sum(M.filas.map((f) => planVenta(f, M)).filter(Boolean), (pl) => pl.aColchon || 0);
  if (e.colchon && e.seguro < e.colchon * 0.9 && e.colchon - e.seguro - cubreVentas > 50) add('mes', { id: `colchonf:${mes}`, cuando: 'antes de meter más en bolsa', t: `Completa tu colchón: te faltan ${eur(e.colchon - e.seguro - cubreVentas, 0)}${cubreVentas > 0.5 ? ` más, aparte de lo de las ventas` : ''}`, pq: `Son ${p.colchon_meses} meses de tus gastos (${eur(e.colchon, 0)}). Ahora tienes ${eur(e.seguro, 0)} entre efectivo, monetarios y renta fija.`, como: 'Ve apartando cada mes en el efectivo remunerado de tu bróker o en un fondo monetario hasta llegar. Es el dinero de los imprevistos: así nunca tienes que vender en una caída.', imp: 'Los intereses del efectivo remunerado tributan como los dividendos, en la base del ahorro (desde el 19 %). Un fondo monetario no reparte: solo pagas por lo ganado cuando lo vendes.', acc: '<a class="enlace" href="#objetivos">Ver tu perfil</a>' });
  const limC = limiteDe('cripto');
  if (e.pctCripto > limC + 1 && e.total && !M.filas.some((f) => f.inst.clase === 'Cripto' && planVenta(f, M))) { const exceso = e.cripto - (limC / 100) * e.total; add('mes', { id: `limcripto:${mes}`, cuando: 'sin prisa', t: `La cripto pasa de tu límite: ${fmtNum(e.pctCripto, 1)} % de un ${fmtNum(limC, 0)} %`, pq: `Para volver a tu ${fmtNum(limC, 0)} % tendrías que pasar unos ${eur(exceso, 0)} a otra cosa, o dejar de comprar cripto hasta que tus aportaciones la diluyan.`, como: 'Vende esa parte en Bitvavo, pásala a tu banco y de ahí a tu fondo indexado.', imp: 'Si vendes con ganancia, tributa como cualquier venta (19-23 %). Cambiarla por otra cripto también cuenta como venta.' }); }
  if (e.reco && e.pctBolsa - e.reco.pct > 15) add('anio', { id: `perfilbolsa:${mes}`, cuando: 'poco a poco', t: `Tu cartera arriesga más de lo que encaja contigo: ${fmtNum(e.pctBolsa, 0)} % en bolsa`, pq: `Para tu edad, tu plazo y lo que dices aguantar, lo normal es un ${e.reco.min}-${e.reco.max} %.`, como: 'Sin vender nada: manda las próximas aportaciones a un fondo de renta fija o monetario hasta acercarte.', imp: 'Así no pagas nada: no vendes, solo cambias adónde va lo nuevo. Entre fondos, cambia con traspasos.', acc: '<a class="enlace" href="#objetivos">Ver tu perfil</a>' });
  for (const m of e.metas) {
    if (m.tipo !== 'llegar' && m.meses && m.meses <= 36) add(m.meses <= 6 ? 'mes' : 'seis', { id: `metaseg:${m.id}`, cuando: `para ${m.anio}`, t: `Pon a salvo el dinero de «${esc(m.n)}»`, pq: `La necesitas en ${cuando(m.meses)}: si la bolsa cae justo antes, no da tiempo a que se recupere.`, como: `Ve pasando ${eur(m.importe, 0)} a un monetario o a renta fija corta, poco a poco, antes de ${m.anio}.`, imp: 'De un fondo a otro, con traspaso: no pagas nada hasta que saques el dinero. Si vendes acciones o ETF, la ganancia tributa al vender.' });
    else if (m.falta > 0) add('anio', { id: `metafalta:${m.id}:${mes}`, cuando: m.anio ? `para ${m.anio}` : '', t: `Para «${esc(m.n)}» te faltarían unos ${eur(m.falta, 0)}`, pq: `Lo probable es tener ${euCorto(m.prob)} en ${m.anio} y necesitas ${eur(m.importe, 0)}.`, como: `Súbele unos ${eur(Math.ceil(m.extraMes / 10) * 10, 0)} al mes a la aportación, o retrasa la meta un par de años.`, acc: '<a class="enlace" href="#objetivos">Ver tus metas</a>' });
  }
}

function vistaFuturo(M) {
  const t = S.futTab === 'proy' ? 'proy' : 'perfil';
  return `<div class="vista-cab"><h1>Objetivos</h1><p>Quién eres como inversor, para qué inviertes y cuánto podrías tener. GrowIA, las ideas y el Paso a paso se ajustan a esto.</p></div>
  <div class="subvistas dos-op" id="futTabs" role="group" aria-label="Qué ver"><button data-fut="perfil" aria-pressed="${t === 'perfil'}">${ICONOS.perfil}Tú y tus metas${preguntasIA().length ? `<span class="cuenta">${preguntasIA().length}</span>` : ''}</button><button data-fut="proy" aria-pressed="${t === 'proy'}">${ICONOS.proy}Proyección</button></div>
  ${t === 'perfil' ? htmlPerfil(M) : htmlProyeccion(M)}`;
}
function htmlProyeccion(M) {
  const pr = proyeccion(M, cfgProy());
  const c = pr.cfg;
  const H = S.horizonte || 20;
  const i = H * 12;
  const fin = pr.fechas[i];
  const puesto = pr.aportado[i], probable = pr.p50[i];
  const sel = (nombre, valores, actual, fmt) => `<select data-proy="${nombre}">${valores.map((x) => `<option value="${x}"${+actual === x ? ' selected' : ''}>${fmt(x)}</option>`).join('')}</select>`;
  const pesos = Object.entries(pr.ahora).filter(([, x]) => x > 0);
  const totAhora = sum(pesos.map(([, x]) => x)) || 1;
  return `
  <p class="nota" style="margin:0 0 18px">Lo que podrías tener si sigues invirtiendo como ahora, con 2.000 escenarios de mercado simulados.</p>
  <div class="proy-controles">
    <label class="campo">Aportas al mes<span class="con-ud"><input data-proy="aport" inputmode="numeric" value="${val(c.aport)}"><span>€</span></span><small>${c.aport === Math.round(aportacionActual()) ? `Es lo de tu plan de ahora` : `Tu plan: ${eur(aportacionActual(), 0)}. <button type="button" class="enlace acento" data-proy-reset>Volver a tu plan</button>`}</small></label>
    <label class="campo">Subes la aportación cada año${sel('subida', [0, 2, 3, 5, 10], c.subida, (x) => (x ? `un ${x} %` : 'No'))}<small>Por ejemplo, con las subidas de sueldo</small></label>
    <label class="campo">La bolsa da a largo plazo${sel('bolsa', [4, 5, 6, 7, 8, 9], c.bolsa, (x) => `${x} % al año`)}<small>La media histórica mundial ronda el 7 %</small></label>
    <label class="check proy-real"><input type="checkbox" data-proy="real" ${c.real ? 'checked' : ''}> En euros de hoy<small class="k">descontando un ${INFLACION} % de inflación al año</small></label>
  </div>
  <section class="proy-cab">
    <div class="tabs" role="group" aria-label="Horizonte">${HORIZONTES.map((h) => `<button data-horizonte="${h}" aria-pressed="${H === h}">${h} años</button>`).join('')}</div>
    <div class="proy-titular">
      <div class="hero-lbl">En ${H} años, en ${anioDe(fin)}, tendrías${c.real ? ' (en euros de hoy)' : ''}</div>
      <div class="proy-num">${euCorto(probable)}</div>
      <div class="proy-esc">
        <div><span class="k">Si va mal</span><b class="down">${euCorto(pr.p10[i])}</b><small>1 de cada 10 escenarios sale peor</small></div>
        <div><span class="k">Lo probable</span><b class="acento">${euCorto(probable)}</b><small>la mitad sale mejor y la mitad peor</small></div>
        <div><span class="k">Si va bien</span><b class="up">${euCorto(pr.p90[i])}</b><small>1 de cada 10 sale mejor</small></div>
        <div><span class="k">Habrás puesto tú</span><b>${euCorto(puesto)}</b><small>lo demás lo ponen los mercados</small></div>
      </div>
    </div>
  </section>
  <div class="chart" id="grafProy"></div>
  <div class="leyenda-graf"><span><i style="border-color:var(--accent);border-top-width:3px"></i>Lo probable</span><span><i class="banda"></i>La mitad de los escenarios</span><span><i class="banda clara"></i>8 de cada 10</span><span><i class="disc" style="border-color:var(--text-2)"></i>Lo que habrás puesto</span></div>
  <div class="dos" style="margin-top:48px">
    <section aria-labelledby="hHor">
      <div class="sec-cab"><h2 id="hHor">Por horizonte</h2><span class="k">${c.real ? 'en euros de hoy' : 'en euros de cada año'}</span></div>
      <div class="tabla-w"><table class="resp"><thead><tr><th>Dentro de</th><th class="r">Habrás puesto</th><th class="r">Si va mal</th><th class="r">Lo probable</th><th class="r">Si va bien</th></tr></thead><tbody>
        ${HORIZONTES.map((h) => { const k = h * 12; return `<tr class="${h === H ? 'activa' : ''}"><td><b style="font-weight:600">${h} años</b><small>${anioDe(pr.fechas[k])}</small></td><td class="r">${euCorto(pr.aportado[k])}</td><td class="r down">${euCorto(pr.p10[k])}</td><td class="r acento">${euCorto(pr.p50[k])}</td><td class="r up">${euCorto(pr.p90[k])}</td></tr>`; }).join('')}
      </tbody></table></div>
    </section>
    <aside class="lateral" aria-labelledby="hHit">
      <div class="sec-cab"><h2 id="hHit">Cuándo llegarías a</h2></div>
      <ul class="lista hitos">${META_HITOS.map((m) => { const a = hito(pr, pr.p50, m), r = hito(pr, pr.p90, m), l = hito(pr, pr.p10, m); return `<li><span class="meta">${euCorto(m)}</span><div>${a == null ? '<b>Más de 30 años</b><span>con esta aportación</span>' : `<b>${a === 0 ? 'Ya lo tienes' : `En ${cuando(a)}, en ${anioDe(pr.fechas[a])}`}</b><span>${a === 0 ? '' : `Si va bien, en ${anioDe(pr.fechas[r])}. Si va mal, ${l == null ? 'después de 30 años' : `en ${anioDe(pr.fechas[l])}`}.`}</span>`}</div></li>`; }).join('')}</ul>
    </aside>
  </div>
  <section style="margin-top:48px" aria-labelledby="hSup"><details class="sec-det"${innerWidth > 680 ? ' open' : ''}>
    <summary class="sec-cab"><h2 id="hSup">Con qué se calcula</h2><span class="k">tu cartera hoy: ${fmtNum(pr.mu, 1)} % al año esperado; se movería un ${fmtNum(pr.sd, 0)} % a largo plazo</span></summary>
    <div class="tabla-w"><table class="resp"><thead><tr><th>Tipo de activo</th><th class="r">Tienes</th><th class="r">Va de tus aportaciones</th><th class="r">Rentabilidad esperada</th><th class="r">Volatilidad</th></tr></thead><tbody>
      ${Object.entries(pr.sup).filter(([k]) => pr.ahora[k] > 0 || pr.destino[k] > 0).map(([k, s]) => `<tr><td><b style="font-weight:600">${esc(s.n)}</b></td><td class="r">${pct((pr.ahora[k] / totAhora) * 100, 1)}</td><td class="r">${pct(pr.destino[k] * 100, 0)}</td><td class="r">${pct(s.mu, 1)}</td><td class="r">${pct(s.sd, 0)}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="nota">Rentabilidades y volatilidades a largo plazo en euros, antes de impuestos y después de los gastos de los fondos. Son supuestos razonables, no promesas: la bolsa mundial ha dado de media en torno a un 7 % al año durante décadas, pero con años de −30 %. Como lo que aportas va casi todo a fondos de bolsa, dentro de 10 años la cartera rendiría de media un ${fmtNum(pr.mu10, 1)} % al año con una volatilidad del ${fmtNum(pr.sd10, 0)} %. Las acciones sueltas y Bitcoin tienen la misma rentabilidad esperada que la bolsa o poco más, pero mucho más riesgo: por eso ensanchan el abanico. Cada escenario sigue un camino mes a mes con caídas y subidas al azar, siempre con el mismo sorteo para que los números no cambien al recargar.</p>
  </details></section>`;
}

/* abanico: banda del 10-90 %, banda del 25-75 %, mediana y lo aportado */
function grafAbanico(cont, pr, meses, opt = {}) {
  cont.innerHTML = '';
  const n = meses + 1;
  const W = Math.max(260, cont.clientWidth || 600), H = opt.alto || 320;
  const ml = 4, mr = 62, mt = 12, mb = 26;
  const hi = Math.max(...pr.p90.slice(0, n)) * 1.04, lo = 0;
  // sin dinero ni aportaciones no hay nada que proyectar (y la escala saldría de 0 a 0)
  if (!(hi > 0)) { cont.innerHTML = `<div class="vacio">${L('Pon cuánto aportas al mes, o mete lo que ya tienes, y aquí verás cuánto podrías tener.', 'Enter how much you contribute each month, or add what you already own, and you will see here how much you could have.')}</div>`; return; }
  const x = (i) => ml + (i / (n - 1)) * (W - ml - mr);
  const y = (v) => mt + (1 - (v - lo) / (hi - lo)) * (H - mt - mb);
  const lin = (arr) => arr.slice(0, n).map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const banda = (a, b) => `${lin(a)} ${b.slice(0, n).map((v, i) => [i, v]).reverse().map(([i, v]) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}`;
  let g = '';
  for (const t of niceTicks(lo, hi, 4)) {
    g += `<line x1="${ml}" x2="${W - mr}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-width="1"/>`;
    g += `<text x="${W - mr + 8}" y="${y(t) + 4}" font-size="11" fill="var(--muted)" style="font-variant-numeric:tabular-nums">${S.oculto ? '' : compacto(t)}</text>`;
  }
  const anios = meses / 12, caben = Math.max(2, Math.floor((W - ml - mr) / 46));
  const paso = [1, 2, 5, 10].find((p) => anios / p + 1 <= caben) || 10;
  for (let a = 0; a <= anios; a += paso) g += `<text x="${x(a * 12)}" y="${H - 6}" text-anchor="${a === 0 ? 'start' : a >= anios ? 'end' : 'middle'}" font-size="11" fill="var(--muted)">${anioDe(pr.fechas[a * 12])}</text>`;
  g += `<polygon points="${banda(pr.p90, pr.p10)}" fill="var(--accent)" fill-opacity="0.10"/>`;
  g += `<polygon points="${banda(pr.p75, pr.p25)}" fill="var(--accent)" fill-opacity="0.20"/>`;
  g += `<polyline points="${lin(pr.aportado)}" fill="none" stroke="var(--text-2)" stroke-width="1.4" stroke-dasharray="5 4"/>`;
  g += `<polyline points="${lin(pr.p50)}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linejoin="round"/>`;
  g += `<circle cx="${x(n - 1)}" cy="${y(pr.p50[n - 1])}" r="4" fill="var(--accent)" stroke="var(--bg)" stroke-width="2"/>`;
  g += `<g class="cruz" visibility="hidden"><line y1="${mt}" y2="${H - mb}" stroke="var(--line-2)" stroke-width="1"/><circle r="4.5" fill="var(--accent)" stroke="var(--bg)" stroke-width="2"/></g>`;
  g += `<rect x="${ml}" y="0" width="${W - ml - mr}" height="${H}" fill="transparent" class="zona"/>`;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `Proyección a ${anios} años: lo probable ${euCorto(pr.p50[n - 1])}, entre ${euCorto(pr.p10[n - 1])} y ${euCorto(pr.p90[n - 1])}`);
  svg.innerHTML = g; cont.appendChild(svg);
  const tt = document.createElement('div'); tt.className = 'tt'; tt.hidden = true; cont.appendChild(tt);
  const cruz = svg.querySelector('.cruz');
  let actual = n - 1;
  const mostrar = (i) => {
    actual = Math.max(0, Math.min(n - 1, i));
    cruz.setAttribute('visibility', 'visible');
    cruz.querySelector('line').setAttribute('x1', x(actual)); cruz.querySelector('line').setAttribute('x2', x(actual));
    cruz.querySelector('circle').setAttribute('cx', x(actual)); cruz.querySelector('circle').setAttribute('cy', y(pr.p50[actual]));
    const d = deIso(pr.fechas[actual]);
    tt.innerHTML = `<b>${euCorto(pr.p50[actual])}</b><span>entre ${euCorto(pr.p10[actual])} y ${euCorto(pr.p90[actual])}</span><span>habrás puesto ${euCorto(pr.aportado[actual])}</span><span>${MESES[d.getMonth()]} ${d.getFullYear()}</span>`;
    tt.hidden = false;
    const px = (x(actual) / W) * cont.clientWidth;
    tt.style.left = Math.min(Math.max(px, 90), cont.clientWidth - 90) + 'px';
    tt.style.top = ((y(pr.p50[actual]) / H) * svg.getBoundingClientRect().height - 12) + 'px';
  };
  const zona = svg.querySelector('.zona');
  zona.addEventListener('pointermove', (ev) => { const r = svg.getBoundingClientRect(); const sx = ((ev.clientX - r.left) / r.width) * W; mostrar(Math.round(((sx - ml) / (W - ml - mr)) * (n - 1))); });
  zona.addEventListener('pointerleave', () => { cruz.setAttribute('visibility', 'hidden'); tt.hidden = true; });
  svg.setAttribute('tabindex', '0');
  svg.addEventListener('keydown', (ev) => { if (ev.key === 'ArrowLeft') { mostrar(actual - 12); ev.preventDefault(); } else if (ev.key === 'ArrowRight') { mostrar(actual + 12); ev.preventDefault(); } });
  svg.addEventListener('focus', () => mostrar(actual));
  svg.addEventListener('blur', () => { cruz.setAttribute('visibility', 'hidden'); tt.hidden = true; });
}

