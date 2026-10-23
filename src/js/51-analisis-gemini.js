/* =====================================================================
   Análisis de Gemini al día: con tu clave de Google, la web le pide a Gemini una revisión completa
   cada día (o cuando cambia una señal), con tus cifras reales, las herramientas de la web y
   búsquedas en internet para contrastar. Se guarda cifrado en analisis.enc.json (aparte de la
   cartera, para no pisar cambios hechos desde otro dispositivo) y en este navegador.
   Si no hay clave, no hay análisis: sale una caja que explica cómo activarlo.
   ===================================================================== */
const IA = { generando: false, turno: null, error: null, ultimoIntento: 0, reintento: 0, reintentos: 0, reintentoT: 0 };
function iaActual() {
  if (esPublico()) {
    // 0.5: una revisión hecha con el acceso completo (o la de muestra) no se enseña en público; de la pública, por si
    // acaso, fuera lo que sea comprar o vender
    const p = S.iaPropio; if (!p || !p.json || !p.json.publico) return null;
    const pos = {}; for (const [k, x] of Object.entries(p.json.posiciones || {})) if (x) { const { nivel, veredicto, ...r } = x; pos[k] = r; }
    return { ...p.json, posiciones: pos, ideas: [], hoja_de_ruta: null, fecha: p.fecha, autor: nombreIA(p.modelo), propio: true, modelo: p.modelo, busquedas: p.busquedas, motivo: p.motivo };
  }
  const p = S.iaPropio, pub = S.ia;
  if (p && p.json && (!pub || String(p.fecha) >= String(pub.fecha))) return { ...p.json, fecha: p.fecha, autor: nombreIA(p.modelo), propio: true, modelo: p.modelo, busquedas: p.busquedas, motivo: p.motivo };
  return pub ? { ...pub, autor: 'GrowIA', publicado: true } : null;
}
const firmaSenales = (M) => [...new Set(M.filas.map((f) => `${f.inst.id}:${f.senal.nivel}`))].sort().join('|');

async function cargarAnalisisPropio(textoRemoto) {
  if (!S.key) return;
  const cands = [];
  if (textoRemoto) { try { cands.push(await descifrar(textoRemoto, S.key)); } catch (e) {} }
  const loc = LS.get('inv-ia-propio');
  if (loc) { try { cands.push(await descifrarLocal(loc)); } catch (e) { LS.del('inv-ia-propio'); } }
  const mejor = cands.filter((x) => x && x.json && x.fecha).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
  if (mejor && (!S.iaPropio || mejor.fecha > S.iaPropio.fecha)) S.iaPropio = mejor;
}
async function leerAnalisisRemoto() {
  if (PERFIL_LOCAL) return null;
  try {
    if (CFG.dev) return LS.get('inv-dev-ia-enc');
    const f = await GH.leer('analisis.enc.json');
    return f ? f.texto : null;
  } catch (e) { return null; }
}
async function guardarAnalisisPropio() {
  const o = S.iaPropio; if (!o || !S.key) return;
  try { LS.set('inv-ia-propio', await cifrarLocal(o)); } catch (e) {}
  try {
    const texto = await cifrarSinSobre(o);
    if (CFG.dev) { LS.set('inv-dev-ia-enc', texto); return; }
    if (PERFIL_CUENTA) { await fbCargar(); if (FB.user) await FB.fs.setDoc(docCuenta(), { ia: texto }, { merge: true }); return; }
    if (GH.token() && !PERFIL_LOCAL) await GH.escribir('analisis.enc.json', texto, 'Análisis de la IA');
  } catch (e) { console.warn('No se pudo subir el análisis', e); }
}

function pedidoAnalisis(ids, motivo, conWeb = true) {
  if (esPublico()) return pedidoAnalisisPublico(ids, motivo, conWeb);
  return `Haz la revisión de hoy de mi cartera (${motivo}). Antes de escribir:
0. Lee el informe de prensa de GrowIA que viene en los datos (noticias de cada posición, del mercado y de las ideas, ya contrastadas) y úsalo como base.
1. ${conWeb ? 'Busca en internet lo de los últimos días que afecte a mis posiciones y a las mejores ideas del radar: resultados, cambios de recomendación, previsiones, regulación y lo que mueva los tipos o el petróleo. Usa varias fuentes y contrasta: no te fíes de un solo titular.' : 'No puedes buscar en internet: usa los titulares de los datos (los de mis posiciones, los del mercado y los de las mejores ideas del radar) y contrástalos con las cifras. Si algo importante no se puede confirmar, dilo.'}
2. Si recomiendas vender algo, calcúlalo con simular_venta. Si recomiendas comprar una acción, con simular_compra.
3. Para las ideas de compra, parte de las que ha elegido GrowIA en su escaneo de prensa de toda la bolsa, del radar y de las que mejor encajan conmigo, y quédate solo con las bien contrastadas: al menos 4 señales a favor en el contraste de GrowFolio y noticias recientes que no lo contradigan. Si ninguna lo está, no recomiendes ninguna y dilo en el resumen.
4. Ten en cuenta el plazo y los impuestos en todo: no es lo mismo ganar un 50 % en 3 meses que en 3 años. Para cada idea, estima en cuántos meses se puede materializar la subida y cuánto, y compárala en "al año" y neta de impuestos con mi fondo indexado. Para cada venta o compra, di lo que pago (ganancia, tasa, retención de dividendos que no recupero).
5. Sintetiza: no repitas en una sección lo que ya está en otra. Frases cortas.
6. Ajústalo todo a su perfil y sus objetivos (edad, cuándo necesita el dinero, cuánto riesgo aguanta, sus límites y sus metas con fecha y cifra, vienen en los datos): si algo de su cartera choca con ellos, dilo y propón cómo encajarlo; en la hoja de ruta, lo que necesite cada meta.
7. En cada compra o venta explica lo de Hacienda y por qué: lo que pagará, y lo que debe hacer o evitar por fiscalidad (por ejemplo, si vende con pérdidas, no recomprar la misma acción o ETF en dos meses si cotiza en la UE (un año si cotiza fuera: EEUU, Reino Unido, Suiza…), ni el mismo fondo en un año, porque si no la pérdida no resta ese año; en cripto la de dos meses no se aplica, aunque hay quien defiende la de un año). Si un consejo tiene un motivo fiscal, que se diga.
8. Sé constante. En los datos viene tu revisión anterior: su fecha, el nivel que diste a cada posición y su hoja de ruta. No cambies el nivel de una posición ni la hoja de ruta salvo que haya algo nuevo e importante: resultados, un cambio de recomendación de los analistas, una subida o caída de más de un 8 %, una noticia que cambie la tesis, o un cambio en su perfil, sus metas o su dinero. Los movimientos de pocos días no son motivo. Si cambias algo, di en su texto qué ha cambiado y por qué. Una revisión seria cambia poco de una semana a otra. Lo mismo con las ideas de compra: mantén las que propusiste salvo una noticia que cambie la tesis o que sus números se rompan, y nunca propongas comprar una empresa que GrowIA tiene «a evitar» en sus datos de ideas (ni al revés).
9. No hacer nada también es un consejo. Esperar, seguir con las aportaciones y no tocar la cartera es muchas veces lo mejor: si este mes no hay nada que hacer, pon en la hoja de ruta un solo paso que lo diga («Este mes, nada: deja que trabajen tus aportaciones»), con "esperar": true, y explica por qué en "por_que" (sin "como": no hay nada que hacer). No inventes cambios por tener algo que proponer.
10. Las cifras, sin adornos. Si nombras una meta, di a qué distancia está («79.658 € de 500.000 €, un 16 %») y, si viene en los datos, cuándo llegaría al ritmo de ahora. Nunca digas que va «rumbo a», «camino de» o «hacia» una meta sin esas cifras, ni des a entender que está cerca si no lo está. El titular habla de hoy (cómo está la cartera, qué ha pasado y lo urgente), no de metas lejanas.

Responde solo con un bloque \`\`\`json, sin texto fuera, con este formato:
{
  "titular": "una frase con el diagnóstico de hoy y lo más urgente; sin metas lejanas",
  "resumen": ["dos o tres párrafos cortos con cifras"],
  "puntuaciones": [{"k": "Diversificación", "nota": 4, "txt": "una o dos frases"}, {"k": "Costes", ...}, {"k": "Riesgo", ...}, {"k": "Disciplina", ...}, {"k": "Impuestos", ...}],
  "mejorar": [{"titulo": "...", "texto": "qué hacer, cuánto y por qué; si hay venta, el impuesto", "impacto": "qué gano", "cuando": "fecha o condición"}],
  "mantener": [{"titulo": "...", "texto": "..."}],
  "riesgos": [{"titulo": "...", "texto": "..."}],
  "calendario": [{"d": "AAAA-MM-DD", "t": "qué pasa ese día y por qué me importa"}],
  "posiciones": {"<id>": {"veredicto": "de 2 a 4 palabras", "nivel": "comprar|aportar|mantener|vigilar|recoger|reducir|vender", "texto": "dos o tres frases con cifras", "vigilar": "qué vigilar, con precio o fecha", "confianza": "alta|media|baja"}},
  "ideas": [{"ticker": "...", "nombre": "...", "tesis": "una o dos frases", "catalizador": "qué la puede mover y cuándo", "riesgo": "...", "contraste": "qué fuentes coinciden y cuáles no", "importe": 0, "plazo_meses": 6, "subida_pct": 20, "fuentes": [{"t": "título", "u": "https://..."}]}],
  "hoja_de_ruta": {"mes": [{"t": "paso concreto, empezando por un verbo", "por_que": "una frase: qué gano o qué evito, con cifras", "como": "los pasos exactos: en qué app, qué botón, qué orden y a qué precio", "impuestos": "si el paso compra o vende: lo que paga o ahorra en la renta y lo que debe hacer o evitar por Hacienda, diciendo que es por eso; vacío si no aplica", "esperar": false, "d": "AAAA-MM-DD o vacío"}], "seis_meses": [...], "anio": [...], "largo": [...]},
  "preguntas": [{"q": "una pregunta corta para él", "por_que": "qué cambiaría en tus consejos según lo que conteste", "opciones": ["respuesta corta", "otra", "otra"]}],
  "fuentes": [{"t": "título", "u": "https://..."}]
}
"preguntas": de 0 a 2, solo si te falta algo de él (su vida, sus planes, su perfil) que cambiaría de verdad tus consejos; nunca vuelvas a preguntar lo que ya ha contestado, tampoco con otras palabras (sus respuestas vienen en los datos, en «Le preguntaste»): úsalas como están, aunque no sean del todo claras. Una entrada en "posiciones" por cada uno de estos ids: ${ids.join(', ')}. "mejorar" por orden de importancia, de 0 a 8 (si no hay nada que mejorar de verdad, déjalo corto o vacío). "ideas" de 0 a 3. "hoja_de_ruta": de 1 a 4 pasos por plazo (si en un plazo no hay nada que hacer, un solo paso con "esperar": true) (este mes, próximos 6 meses, próximo año, de 1 a 5 años) que completen la hoja de ruta que ya calcula GrowFolio (está en los datos): no repitas sus pasos; añade lo que solo se sabe leyendo las noticias, las fechas que vienen y sus reglas.
Escribe en español de España, tuteando, con frases cortas y concretas. Pon las cantidades en euros y los precios entre dobles asteriscos (por ejemplo **2.920 €**) para que GrowFolio pueda ocultarlas; ningún otro formato.`;
}
// 0.5, modo público: la revisión explica cómo está la cartera y qué ha pasado, sin comprar, vender ni hoja de ruta
function pedidoAnalisisPublico(ids, motivo, conWeb) {
  return `Haz la revisión de hoy de mi cartera (${motivo}). No me digas que compre, venda, mantenga ni traspase nada concreto, ni cuánto: explícame cómo está y qué ha pasado, con cifras. Antes de escribir:
0. Lee el informe de prensa de GrowIA que viene en los datos (noticias de cada posición y del mercado, ya contrastadas) y úsalo como base.
1. ${conWeb ? 'Busca en internet lo de los últimos días que afecte a mis posiciones: resultados, cambios de recomendación de los analistas, previsiones, regulación y lo que mueva los tipos o el petróleo. Usa varias fuentes y contrasta.' : 'No puedes buscar en internet: usa los titulares de los datos.'}
2. Mira mis límites, mi perfil y mis metas (vienen en los datos) y di qué se sale de ellos y por cuánto, sin decirme qué valor comprar o vender para arreglarlo.
3. Sé constante: en los datos viene tu revisión anterior. No cambies lo que dijiste salvo que haya algo nuevo e importante.
4. Las cifras, sin adornos. Si nombras una meta, di a qué distancia está («79.658 € de 500.000 €, un 16 %»).
5. Frases cortas; no repitas en una sección lo que ya está en otra.

Responde solo con un bloque \`\`\`json, sin texto fuera, con este formato:
{
  "titular": "una frase con cómo está hoy la cartera y lo más importante que ha pasado",
  "resumen": ["dos o tres párrafos cortos con cifras"],
  "puntuaciones": [{"k": "Diversificación", "nota": 4, "txt": "una o dos frases"}, {"k": "Costes", ...}, {"k": "Riesgo", ...}, {"k": "Disciplina", ...}, {"k": "Impuestos", ...}],
  "mejorar": [{"titulo": "...", "texto": "qué se sale de mis límites o metas, o de lo habitual (costes, reparto, colchón, impuestos), y por qué importa; sin decir qué valor comprar o vender", "impacto": "qué supone, con cifras", "cuando": "fecha o condición, si la hay"}],
  "mantener": [{"titulo": "...", "texto": "lo que está en orden"}],
  "riesgos": [{"titulo": "...", "texto": "..."}],
  "calendario": [{"d": "AAAA-MM-DD", "t": "qué pasa ese día y por qué me importa"}],
  "posiciones": {"<id>": {"texto": "dos o tres frases: qué ha pasado y qué la mueve, con cifras; sin decir si comprar, mantener o vender", "vigilar": "qué fechas o cifras mirar", "confianza": "alta|media|baja"}},
  "preguntas": [{"q": "una pregunta corta para mí", "por_que": "qué cambiaría en tu revisión", "opciones": ["respuesta corta", "otra"]}],
  "fuentes": [{"t": "título", "u": "https://..."}]
}
Una entrada en "posiciones" por cada uno de estos ids: ${ids.join(', ')}. "mejorar" de 0 a 6, por orden de importancia. "preguntas" de 0 a 2, sin volver a preguntar lo que ya he contestado, tampoco con otras palabras (mis respuestas vienen en los datos). Escribe en español de España, tuteando, con frases cortas y concretas. Pon las cantidades en euros y los precios entre dobles asteriscos (por ejemplo **2.920 €**); ningún otro formato.`;
}
function extraerJSON(texto) {
  const bloques = [...String(texto).matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]);
  const cands = bloques.length ? bloques.reverse() : [];
  const i = texto.indexOf('{'), j = texto.lastIndexOf('}');
  if (i >= 0 && j > i) cands.push(texto.slice(i, j + 1));
  for (const c of cands) { try { const o = JSON.parse(c); if (o && typeof o === 'object') return o; } catch (e) {} }
  return null;
}
async function generarAnalisisIA(motivo = 'la pides tú', solo = false) {
  if (IA.generando) return;
  clearTimeout(IA.reintentoT); IA.reintento = 0;
  if (!solo) IA.reintentos = 0;
  await cargarAsesor();
  if (!AS.clave) { abrirAsesor(); return; }
  IA.generando = true; IA.error = null; IA.ultimoIntento = Date.now();
  const turno = { rol: 'ia', partes: [], citas: [], resultados: [] };
  IA.turno = turno; refrescarProgresoIA();
  let marco = 0;
  const alCambiar = () => { if (!marco) marco = setTimeout(() => { marco = 0; refrescarProgresoIA(); }, 400); };
  try {
    refrescarFoto(true);
    const M = S.M || calcular();
    const ids = [...new Set(M.filas.map((f) => f.inst.id))];
    const cfgA = cfgAsesor();
    // las revisiones automáticas van con el 3.6, que tiene su propio cupo: así no gastan el del 3.8, que queda para tus preguntas
    await conversar({ mensajes: [{ role: 'user', content: pedidoAnalisis(ids, motivo, cfgA.web && !AS.sinWeb) }], turno, sistema: [{ type: 'text', text: instruccionesAsesor() }, { type: 'text', text: contextoAsesor(M, 'completo') }], maxTokens: 12000, alCambiar, modelo: motivo === 'la pides tú' ? undefined : 'gemini-3.6-flash' });
    const texto = turno.partes.filter((p) => p.tipo === 'texto').map((p) => p.texto).join('\n');
    const json = extraerJSON(texto);
    if (!json || !json.titular || !json.posiciones) throw new Error('La respuesta no ha llegado completa. Vuelve a intentarlo.');
    const vistas = new Set();
    json.fuentes = [...turno.citas, ...(Array.isArray(json.fuentes) ? json.fuentes : [])].filter((x) => x && /^https?:\/\//.test(x.u || '') && !vistas.has(x.u) && vistas.add(x.u)).slice(0, 20);
    json.publico = esPublico();
    S.iaPropio = { fecha: new Date().toISOString(), modelo: AS.modeloVivo || cfgAsesor().modelo, json, firma: firmaSenales(S.M || calcular()), busquedas: turno.partes.filter((p) => p.web).length, coste: turno.coste, motivo };
    AS.gasto += turno.coste || 0; guardarConv();
    await guardarAnalisisPropio();
    toast(`${nombreIA()} ha actualizado el análisis de tu cartera`);
    IA.reintentos = 0;
    // si trae una pregunta nueva: a la vista (y aviso al móvil si lo tienes activado y no estás mirando)
    if (preguntaNueva()) { if (document.hidden) avisoSistema('pregunta', 'GrowIA te pregunta', preguntaNueva().x.q, '#objetivos', 'preg:' + clavePreg(preguntaNueva().x)); else setTimeout(() => mostrarPreguntaIA(), 1200); }
  } catch (e) {
    IA.error = /Failed to fetch|NetworkError|Load failed/i.test(e.message) ? `No hay conexión con ${PROV[cfgAsesor().prov].n}.` : e.message;
    // saturado o «espera un momento»: lo vuelve a intentar sola a los 5, 15 y 30 minutos
    if ((e.estado >= 500 || (e.estado === 429 && !e.diario) || /conexión/.test(IA.error)) && IA.reintentos < 3) {
      const min = [5, 15, 30][IA.reintentos++];
      IA.reintento = Date.now() + min * 60000;
      IA.reintentoT = setTimeout(() => { if (S.cartera && !IA.generando) generarAnalisisIA(motivo, true); }, min * 60000);
      if (e.estado >= 500) IA.error = 'Google está saturado ahora mismo, también con los otros modelos gratuitos de Gemini.';
      else if (e.estado === 429) IA.error = 'Google pide esperar un poco (el límite gratuito por minuto).';
    }
  }
  IA.generando = false; IA.turno = null;
  if (['analisis', 'expertos', 'cartera'].includes(S.vista) && !$('.hoja-fondo')) pintar(); else refrescarProgresoIA();
}
/* ¿toca revisar? cada día (o semana) y, si es diario, también cuando cambia alguna señal */
async function revisarAnalisisIA() {
  if (IA.generando || !S.cartera || document.hidden || !S.key) return;
  await cargarAsesor();
  if (!AS.clave) return;
  const cfg = cfgAsesor();
  if (cfg.auto === 'manual' || Date.now() - IA.ultimoIntento < 3600000) return;
  const p = S.iaPropio, M = S.M || calcular();
  const edad = p ? Date.now() - new Date(p.fecha).getTime() : Infinity;
  const limite = cfg.auto === 'semanal' ? 7 * 864e5 : 20 * 36e5;
  const cambio = cfg.auto === 'diario' && p && p.firma !== firmaSenales(M) && edad > 3 * 36e5;
  // trabaja sola: si hay un informe de prensa más nuevo que su última revisión, la rehace (cada 3 horas como mucho)
  const prensa = cfg.auto === 'diario' && p && S.informe && S.informe.generado > p.fecha && edad > 3 * 36e5;
  // si has cambiado tus reglas después de su última revisión, la rehace con las nuevas
  const reglas = p && S.ia && S.ia.reglas_fecha && String(S.ia.reglas_fecha) > String(p.fecha);
  const perfilNuevo = p && S.cartera.perfil && S.cartera.perfil.actualizado && String(S.cartera.perfil.actualizado) > String(p.fecha);
  // los de antes de que GrowIA dijera a qué distancia está cada meta (0.3.0b) se rehacen una vez
  const metasViejo = p && String(p.fecha) < '2026-10-20T23:15';
  // 0.5: hecha en el otro modo (con o sin acceso completo): se rehace en el de ahora
  const otroModo = p && p.json && !!p.json.publico !== esPublico();
  if (otroModo && edad <= limite) return generarAnalisisIA(esPublico() ? 'ahora sin recomendaciones de compra o venta' : 'ahora con el acceso completo');
  if (edad > limite) generarAnalisisIA(p ? 'revisión diaria' : 'primera revisión');
  else if (reglas) generarAnalisisIA('han cambiado tus reglas');
  else if (perfilNuevo) generarAnalisisIA('has cambiado tu perfil o le has contestado');
  else if (metasViejo) generarAnalisisIA('ahora dice a qué distancia está cada meta');
  else if (cambio) generarAnalisisIA('ha cambiado la señal de alguna posición');
  else if (prensa) generarAnalisisIA('hay noticias nuevas en el informe de prensa');
}
function htmlProgresoIA() {
  if (IA.generando) {
    const pasos = (IA.turno ? IA.turno.partes.filter((p) => p.tipo === 'paso') : []).slice(-4);
    return `<div class="ia-progreso" role="status"><div class="as-pensando"><i></i><i></i><i></i></div><div><b>${nombreIA()} está revisando tu cartera y las noticias de hoy</b><span>Tarda uno o dos minutos. Puedes seguir usando GrowFolio.</span>${pasos.length ? `<ul>${pasos.map((p) => `<li>${esc(p.txt)}</li>`).join('')}</ul>` : ''}</div></div>`;
  }
  if (IA.error) {
    const luego = IA.reintento > Date.now() ? ` ${nombreIA()} lo vuelve a intentar a las ${new Date(IA.reintento).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}${S.iaPropio ? '; mientras, tienes el último análisis' : ''}.` : '';
    return `<div class="ia-progreso error${luego ? ' espera' : ''}" role="alert">${ICONOS.alerta}<div><b>No se pudo actualizar el análisis</b><span>${esc(IA.error)}</span>${luego ? ` <span>${esc(luego.trim())}</span>` : ''}</div><button class="btn peq" data-accion="ia-actualizar">Reintentar</button></div>`;
  }
  return '';
}
function refrescarProgresoIA() { const el = $('#iaProgreso'); if (el) el.innerHTML = htmlProgresoIA(); }

