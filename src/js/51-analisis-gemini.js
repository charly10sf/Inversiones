/* =====================================================================
   La revisión de la cartera al día: la web le pide a la IA una revisión completa cada día (o cuando cambia una señal),
   con tus cifras reales, las herramientas de la web y búsquedas en internet para contrastar. Se guarda cifrada en
   analisis.enc.json o en tu cuenta (aparte de la cartera, para no pisar cambios hechos desde otro dispositivo) y en este
   navegador. 0.8.2d: solo con Claude, por el Worker (antes, Gemini con tu clave de Google), y como «tarea»: no gasta tus
   preguntas del día. Sin la IA lista, sale una caja que dice por qué (txtSinRevisionIA).
   ===================================================================== */
// por qué no hay revisión (sin cuenta, correo sin confirmar, sin tareas hoy o conectando)
function txtSinRevisionIA() {
  const sin = sinTareaIA();
  if (sin) return txtSinTareaIA(sin, ['le pondrá nota a tu cartera punto por punto, con qué mejoraría, qué mantendría y qué riesgos vigilar', 'scores your portfolio point by point, with what it would improve, keep and watch'], ['revisarla', 'review it']);
  return claudeOk() ? L('Le pondrá nota punto por punto, con qué mejoraría, qué mantendría y qué riesgos vigilar. Abre la IA y en unos segundos estará lista.', 'It will score it point by point, with what it would improve, keep and watch. Open the AI and it will be ready in a few seconds.')
    : L('Le pondrá nota punto por punto, con qué mejoraría, qué mantendría y qué riesgos vigilar. Ábrela y hazle una primera pregunta: la primera vez te dice adónde van tus datos.', 'It will score it point by point, with what it would improve, keep and watch. Open it and ask it something: the first time it tells you where your data goes.');
}
const IA = { generando: false, turno: null, error: null, ultimoIntento: 0, reintento: 0, reintentos: 0, reintentoT: 0 };
function iaActual() {
  if (esPublico()) {
    // 0.5: una revisión hecha con el acceso completo (o la de muestra) no se enseña en público; de la pública, por si
    // acaso, fuera lo que sea comprar o vender
    const p = S.iaPropio; if (!p || !p.json || !p.json.publico) return null;
    const pos = {}; for (const [k, x] of Object.entries(p.json.posiciones || {})) if (x) { const { nivel, veredicto, ...r } = x; pos[k] = r; }
    return { ...p.json, posiciones: pos, ideas: [], hoja_de_ruta: null, fecha: p.fecha, autor: nombreIA(p.modelo), propio: true, modelo: p.modelo, busquedas: p.busquedas, motivo: p.motivo, total: p.total };
  }
  const p = S.iaPropio, pub = S.ia;
  if (p && p.json && (!pub || String(p.fecha) >= String(pub.fecha))) return { ...p.json, fecha: p.fecha, autor: nombreIA(p.modelo), propio: true, modelo: p.modelo, busquedas: p.busquedas, motivo: p.motivo, total: p.total };
  return pub ? { ...pub, autor: 'La IA', publicado: true } : null;
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
  const o = S.iaPropio; if (!o || !S.key || S.demo) return;
  try { LS.set('inv-ia-propio', await cifrarLocal(o)); } catch (e) {}
  try {
    const texto = await cifrarSinSobre(o);
    if (CFG.dev) { LS.set('inv-dev-ia-enc', texto); return; }
    if (PERFIL_CUENTA) { await fbCargar(); if (FB.user) await FB.fs.setDoc(docCuenta(), { ia: texto }, { merge: true }); return; }
    if (GH.token() && !PERFIL_LOCAL) await GH.escribir('analisis.enc.json', texto, 'Análisis de la IA');
  } catch (e) { console.warn('No se pudo subir el análisis', e); }
}

function pedidoAnalisis(ids, motivo, conWeb = true, sinHerramientas = false, est = esPublico()) {
  // 0.8.2 (opción B): con Claude, también el fundador recibe la revisión sin recomendaciones de compra o venta
  if (est) return pedidoAnalisisPublico(ids, motivo, conWeb, sinHerramientas);
  return `Haz la revisión de hoy de mi cartera (${motivo}). Antes de escribir:
0. Lee el informe de prensa de la IA que viene en los datos (noticias de cada posición, del mercado y de las ideas, ya contrastadas) y úsalo como base.
1. ${conWeb ? 'Busca en internet lo de los últimos días que afecte a mis posiciones y a las mejores ideas del radar: resultados, cambios de recomendación, previsiones, regulación y lo que mueva los tipos o el petróleo. Usa varias fuentes y contrasta: no te fíes de un solo titular. Tienes tres búsquedas como mucho: antes, mira las fichas de la IA (lo que pesa en cada empresa, factor por factor) y busca solo lo que no esté ahí.' : 'No puedes buscar en internet: usa las fichas de la IA (lo que pesa en cada empresa, factor por factor), los temas de la semana y los titulares de los datos, y contrástalos con las cifras. Si algo importante no se puede confirmar, dilo.'}
2. ${sinHerramientas ? 'En esta revisión no tienes herramientas: si recomiendas vender algo, usa lo que ya calcula Toisón en los datos (lo que pagaría si vendiera hoy cada posición y sus planes de venta) y di que el detalle se calcula al pulsar Vender; si recomiendas comprar una acción, di su tasa de compra.' : 'Si recomiendas vender algo, calcúlalo con simular_venta. Si recomiendas comprar una acción, con simular_compra.'}
3. Para las ideas de compra, parte de las que ha elegido la IA en su escaneo de prensa de toda la bolsa, del radar y de las que mejor encajan conmigo, y quédate solo con las bien contrastadas: al menos 4 señales a favor en el contraste de Toisón y noticias recientes que no lo contradigan. Si ninguna lo está, no recomiendes ninguna y dilo en el resumen.
4. Ten en cuenta el plazo y los impuestos en todo: no es lo mismo ganar un 50 % en 3 meses que en 3 años. Para cada idea, estima en cuántos meses se puede materializar la subida y cuánto, y compárala en "al año" y neta de impuestos con mi fondo indexado. Para cada venta o compra, di lo que pago (ganancia, tasa, retención de dividendos que no recupero).
5. Sintetiza: no repitas en una sección lo que ya está en otra. Frases cortas.
6. Ajústalo todo a su perfil y sus objetivos (edad, cuándo necesita el dinero, cuánto riesgo aguanta, sus límites y sus metas con fecha y cifra, vienen en los datos): si algo de su cartera choca con ellos, dilo y propón cómo encajarlo; en la hoja de ruta, lo que necesite cada meta.
7. En cada compra o venta explica lo de Hacienda y por qué: lo que pagará, y lo que debe hacer o evitar por fiscalidad (por ejemplo, si vende con pérdidas, no recomprar la misma acción o ETF en dos meses si cotiza en la UE (un año si cotiza fuera: EEUU, Reino Unido, Suiza…), ni el mismo fondo en un año, porque si no la pérdida no resta ese año; en cripto la de dos meses no se aplica, aunque hay quien defiende la de un año). Si un consejo tiene un motivo fiscal, que se diga.
8. Sé constante. En los datos viene tu revisión anterior: su fecha, el nivel que diste a cada posición y su hoja de ruta. No cambies el nivel de una posición ni la hoja de ruta salvo que haya algo nuevo e importante: resultados, un cambio de recomendación de los analistas, una subida o caída de más de un 8 %, una noticia que cambie la tesis, o un cambio en su perfil, sus metas o su dinero. Los movimientos de pocos días no son motivo. Si cambias algo, di en su texto qué ha cambiado y por qué. Una revisión seria cambia poco de una semana a otra. Lo mismo con las ideas de compra: mantén las que propusiste salvo una noticia que cambie la tesis o que sus números se rompan, y nunca propongas comprar una empresa que la IA tiene «a evitar» en sus datos de ideas (ni al revés).
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
"preguntas": de 0 a 4 (Carlos, 3 nov: que pregunte más), solo si te falta algo de él (su vida, sus planes, su perfil) que cambiaría de verdad tus consejos; no vuelvas a preguntar lo que ya ha contestado, tampoco con otras palabras (sus respuestas de los últimos meses vienen en los datos, en «Le preguntaste»): úsalas como están, aunque no sean del todo claras. Una entrada en "posiciones" por cada uno de estos ids: ${ids.join(', ')}. "mejorar" por orden de importancia, de 0 a 8 (si no hay nada que mejorar de verdad, déjalo corto o vacío). "ideas" de 0 a 3. "hoja_de_ruta": de 1 a 4 pasos por plazo (si en un plazo no hay nada que hacer, un solo paso con "esperar": true) (este mes, próximos 6 meses, próximo año, de 1 a 5 años) que completen la hoja de ruta que ya calcula Toisón (está en los datos): no repitas sus pasos; añade lo que solo se sabe leyendo las noticias, las fechas que vienen y sus reglas.
Escribe en español de España, tuteando, con frases cortas y concretas. Pon las cantidades en euros y los precios entre dobles asteriscos (por ejemplo **2.920 €**) para que Toisón pueda ocultarlas; ningún otro formato.`;
}
// 0.5, modo público: la revisión explica cómo está la cartera y qué ha pasado, sin comprar, vender ni hoja de ruta
function pedidoAnalisisPublico(ids, motivo, conWeb, sinHerramientas = false) {
  return `Haz la revisión de hoy de mi cartera (${motivo}). No me digas que compre, venda, mantenga ni traspase nada concreto, ni cuánto: explícame cómo está y qué ha pasado, con cifras. Antes de escribir:
0. Lee el informe de prensa de la IA que viene en los datos (noticias de cada posición y del mercado, ya contrastadas) y úsalo como base.
1. ${conWeb ? 'Busca en internet lo de los últimos días que afecte a mis posiciones: resultados, cambios de recomendación de los analistas, previsiones, regulación y lo que mueva los tipos o el petróleo. Usa varias fuentes y contrasta. Tienes tres búsquedas como mucho: antes, mira las fichas de la IA y busca solo lo que no esté ahí.' : `No puedes buscar en internet${sinHerramientas ? ' ni usar herramientas' : ''}: usa las fichas de la IA (lo que pesa en cada empresa, factor por factor), los temas de la semana y los titulares de los datos.`}
2. Mira mis límites, mi perfil y mis metas (vienen en los datos) y di qué se sale de ellos y por cuánto, sin decirme qué valor comprar o vender para arreglarlo. En impuestos, cuenta lo que calcula Toisón (lo que pagaría, las pérdidas que tengo); no me digas qué declarar ni cuándo vender para pagar menos.
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
Una entrada en "posiciones" por cada uno de estos ids: ${ids.join(', ')}. "mejorar" de 0 a 6, por orden de importancia. "preguntas" de 0 a 4, sin volver a preguntar lo que ya he contestado, tampoco con otras palabras (mis respuestas vienen en los datos). Escribe en español de España, tuteando, con frases cortas y concretas. Pon las cantidades en euros y los precios entre dobles asteriscos (por ejemplo **2.920 €**); ningún otro formato.`;
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
  const pedida = motivo === 'la pides tú';
  // 0.8.2d: solo con Claude. Si el sondeo aún no se ha hecho, se hace ahora (no manda nada de la cartera)
  if (!claudeSinClave() && modeloClaudeParaIA('análisis')) await sondearClaude();
  const sin = sinTareaIA();
  if (sin || !claudeSinClave()) {
    if (pedida) { if (sin === 'tareas') toast(txtSinRevisionIA(), 6000); else abrirAsesor(); }
    return;
  }
  // el sí del aviso de privacidad: la que pides tú lo pide aquí; la automática no puede preguntar y espera a que lo des
  if (pedida) AS.claudeNo = false;   // la pides tú: si antes dijiste que no, se vuelve a preguntar
  if (!claudeOk() && !(pedida && pedirSiClaude())) { if (pedida) toast(errorSinIA(null).message, 6000); return; }
  IA.generando = true; IA.error = null; IA.ultimoIntento = Date.now();
  if (!pedida) apuntarIntentoAutoIA();
  const turno = { rol: 'ia', partes: [], citas: [], resultados: [] };
  IA.turno = turno; refrescarProgresoIA();
  diarioIA(`Revisión de la cartera (${motivo === 'la pides tú' ? 'pedida' : 'automática'})${redIA()}`);
  // 0.7f: en la app de Android, viva en segundo plano mientras revisa; si la has pedido tú y no la miras, te avisa al acabar
  let fin = '';
  appGrowiaEmpieza(true, L('La IA está revisando tu cartera…', 'GrowIA is reviewing your portfolio…'));
  let marco = 0;
  const alCambiar = () => { if (!marco) marco = setTimeout(() => { marco = 0; refrescarProgresoIA(); }, 400); };
  try {
    await fichasParaCartera(3000);   // 0.8.3: con el resto si alguna acción tuya está ahí
    refrescarFoto(true);
    const M = S.M || calcular();
    const ids = [...new Set(M.filas.map((f) => f.inst.id))];
    const cfgA = cfgAsesor();
    // la automática, en una sola llamada y sin herramientas ni búsquedas (con Haiku): con las fichas de la IA y los cálculos
    // de venta que ya vienen en los datos. La que pides tú puede buscar (tres veces como mucho) y calcular
    const auto = motivo !== 'la pides tú';
    // 0.8.2: lo que se pide y con qué reglas, cuando ya se sabe quién contesta (con Claude, las del estándar)
    const preparar = (est) => ({ mensajes: [{ role: 'user', content: pedidoAnalisis(ids, motivo, !auto && cfgA.web && !AS.sinWeb, auto, est) }], sistema: [{ type: 'text', text: instruccionesAsesor(est) }, { type: 'text', text: contextoAsesor(M, 'completo', est) }] });
    await conversar({ tipo: 'análisis', tarea: 'revision', soloHaiku: auto, turno, preparar, maxTokens: 12000, alCambiar, herramientas: !auto, web: !auto, maxBusquedas: auto ? 0 : 3 });
    const texto = turno.partes.filter((p) => p.tipo === 'texto').map((p) => p.texto).join('\n');
    const json = extraerJSON(texto);
    if (!json || !json.titular || !json.posiciones) throw new Error('La respuesta no ha llegado completa. Vuelve a intentarlo.');
    const vistas = new Set();
    json.fuentes = [...turno.citas, ...(Array.isArray(json.fuentes) ? json.fuentes : [])].filter((x) => x && /^https?:\/\//.test(x.u || '') && !vistas.has(x.u) && vistas.add(x.u)).slice(0, 20);
    // publico: hecha con las reglas del estándar; modo: el de la app cuando se hizo (para rehacerla si cambias de modo)
    json.publico = turno.estandar != null ? !!turno.estandar : esPublico();
    json.modo = esPublico() ? 'publico' : 'privado';
    // 0.7h: con el total que ha visto GrowIA, para cambiarlo por el de ahora al enseñarlo (totalAlDiaIA)
    S.iaPropio = { fecha: new Date().toISOString(), modelo: turno.modelo || AS.modeloVivo || cfgAsesor().modelo, json, firma: firmaSenales(S.M || calcular()), busquedas: turno.partes.filter((p) => p.web).length, coste: turno.coste, motivo, total: M.total };
    AS.gasto += turno.coste || 0; guardarConv();
    await guardarAnalisisPropio();
    toast(`${nombreIA()} ha actualizado el análisis de tu cartera`);
    if (pedida) fin = L('La IA ha revisado tu cartera', 'GrowIA has reviewed your portfolio');
    IA.reintentos = 0;
    // si trae una pregunta nueva: a la vista (y aviso al móvil si lo tienes activado y no estás mirando)
    if (preguntaNueva()) { if (fueraDeVista()) avisoSistema('pregunta', 'La IA te pregunta', preguntaNueva().x.q, '#objetivos', 'preg:' + clavePreg(preguntaNueva().x)); else setTimeout(() => mostrarPreguntaIA(), 1200); }
  } catch (e) {
    IA.error = /Failed to fetch|NetworkError|Load failed/i.test(e.message) ? L('No hay conexión con la IA.', 'No connection to the AI.') : e.message;
    // 0.8.2d: lo que se arregla solo en unos minutos (saturada, caída, la red): se reintenta; los topes del día, tu no y el
    // correo sin confirmar, no
    const deCuenta = AS.claudeNo || ['tope-diario', 'techo', 'tope-tareas', 'tope-pregunta', 'tope-fondo', 'no-permitido', 'sin-creditos'].includes(e.codigo);
    const pasajero = !deCuenta && (e.estado >= 500 || e.estado === 429 || e.corte || /conexión/.test(IA.error));
    // 0.7p: la automática que se corta porque has salido de GrowFolio (o se ha ido la red) no cuenta como intento: se
    // vuelve a hacer cuando vuelvas (antes quedaba «hecha» una hora y, si el reintento se congelaba con la página
    // dormida, a veces no se repetía)
    const alSalir = !pedida && e.name !== 'AbortError' && (e.corte || esCorteRed(e) || /conexión/.test(IA.error)) && fueraDesde(IA.ultimoIntento);
    if (alSalir) { IA.ultimoIntento = 0; IA.error = null; diarioIA('Revisión cortada al salir: se repite cuando vuelvas'); }
    // saturada, caída o sin red: lo vuelve a intentar sola a los 5, 15 y 30 minutos
    if (alSalir || e.name === 'AbortError') { /* nada que avisar */ }
    else if (pasajero && IA.reintentos < 3) {
      const min = [5, 15, 30][IA.reintentos++];
      IA.reintento = Date.now() + min * 60000;
      IA.reintentoT = setTimeout(() => { if (S.cartera && !IA.generando) generarAnalisisIA(motivo, true); }, min * 60000);
      IA.error = L('La IA no está disponible ahora mismo: lo vuelve a intentar sola en unos minutos.', 'The AI is not available right now: it will try again by itself in a few minutes.');
    }
    // al dueño, los fallos de verdad que ya no se van a reintentar (no los topes ni tu no: eso lo dice la tarjeta)
    else if ((e.sinIA ? e.avisar : true) && !deCuenta) avisarFalloIA(e, 'revision', turno.modelo);
  }
  if (IA.ultimoIntento) diarioIA(IA.error ? `Revisión sin acabar: ${String(IA.error).slice(0, 80)}` : `Revisión hecha en ${Math.round((Date.now() - IA.ultimoIntento) / 1000)} s`);
  IA.generando = false; IA.turno = null;
  appGrowiaTermina(fin, fin && L('Toca para verla.', 'Tap to see it.'));
  if (['analisis', 'expertos', 'cartera'].includes(S.vista) && !$('.hoja-fondo')) pintar(); else refrescarProgresoIA();
}
/* 0.8.2d (revisión aparte): los intentos de la revisión automática de hoy (día del Worker, UTC), guardados en el dispositivo:
   recargar o volver a la app no los pone a cero. En el nivel reducido, 2 al día como mucho (también los que se cortan), y
   solo si quedan al menos 3 tareas (para dejar sitio a noticias e importar) */
const LS_IA_AUTO = 'inv-ia-auto';
function intentosAutoIA() { const x = LS.get(LS_IA_AUTO, null); return x && x.d === diaClaude() && x.uid === uidActual() ? x.n || 0 : 0; }
function apuntarIntentoAutoIA() { LS.set(LS_IA_AUTO, { d: diaClaude(), uid: uidActual(), n: intentosAutoIA() + 1 }); }
function autoIAPermitida() {
  if (nivelClaudeApp() === 'alto') return true;
  const t = quedanTareasClaude();
  return intentosAutoIA() < 2 && (t == null || t >= 3);
}
/* ¿toca revisar? cada día (o semana) y, si es diario, también cuando cambia alguna señal */
async function revisarAnalisisIA() {
  // 0.7l: con GrowIA contestando una pregunta, después (al acabar la vuelve a mirar): no se pisan en el móvil
  if (IA.generando || AS.cargando || !S.cartera || fueraDeVista() || !S.key || S.demo) return;
  await cargarAsesor();
  const cfg = cfgAsesor();
  if (cfg.auto === 'manual' || Date.now() - IA.ultimoIntento < 3600000) return;
  await sondearClaude();
  if (!(claudeSinClave() && claudeOk()) || sinTareaIA() || !autoIAPermitida()) return;
  const p = S.iaPropio, M = S.M || calcular();
  // 0.8.2d: en el nivel reducido (o sin saberlo aún), la automática una vez al día como mucho: sin rehacerla cada vez que
  // cambia una señal o llegan noticias (cada una es una tarea y gasta de su tope de dinero del día)
  const alto = nivelClaudeApp() === 'alto';
  const edad = p ? Date.now() - new Date(p.fecha).getTime() : Infinity;
  const limite = cfg.auto === 'semanal' ? 7 * 864e5 : 20 * 36e5;
  const cambio = alto && cfg.auto === 'diario' && p && p.firma !== firmaSenales(M) && edad > 3 * 36e5;
  // trabaja sola: si hay un informe de prensa más nuevo que su última revisión, la rehace (cada 3 horas como mucho)
  const prensa = alto && cfg.auto === 'diario' && p && S.informe && S.informe.generado > p.fecha && edad > 3 * 36e5;
  // si has cambiado tus reglas después de su última revisión, la rehace con las nuevas
  const reglas = p && S.ia && S.ia.reglas_fecha && String(S.ia.reglas_fecha) > String(p.fecha);
  const perfilNuevo = p && S.cartera.perfil && S.cartera.perfil.actualizado && String(S.cartera.perfil.actualizado) > String(p.fecha);
  // los de antes de que GrowIA dijera a qué distancia está cada meta (0.3.0b) se rehacen una vez
  const metasViejo = p && String(p.fecha) < '2026-10-20T23:15';
  // 0.5: hecha en el otro modo (con o sin acceso completo): se rehace en el de ahora
  // 0.8.2: el modo de la app, no las reglas (en el fundador, con Claude, sale con las del estándar y no hay que rehacerla)
  const otroModo = p && p.json && (p.json.modo ? p.json.modo !== (esPublico() ? 'publico' : 'privado') : !!p.json.publico !== esPublico());
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
    return `<div class="ia-progreso" role="status"><div class="as-pensando"><i></i><i></i><i></i></div><div><b>${nombreIA()} está revisando tu cartera y las noticias de hoy</b><span>Tarda uno o dos minutos. Puedes seguir usando Toisón.</span>${pasos.length ? `<ul>${pasos.map((p) => `<li>${esc(p.txt)}</li>`).join('')}</ul>` : ''}</div></div>`;
  }
  if (IA.error) {
    const luego = IA.reintento > Date.now() ? ` ${nombreIA()} lo vuelve a intentar a las ${new Date(IA.reintento).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}${S.iaPropio ? '; mientras, tienes el último análisis' : ''}.` : '';
    return `<div class="ia-progreso error${luego ? ' espera' : ''}" role="alert">${ICONOS.alerta}<div><b>No se pudo actualizar el análisis</b><span>${esc(IA.error)}</span>${luego ? ` <span>${esc(luego.trim())}</span>` : ''}</div><button class="btn peq" data-accion="ia-actualizar">Reintentar</button></div>`;
  }
  return '';
}
function refrescarProgresoIA() { const el = $('#iaProgreso'); if (el) el.innerHTML = htmlProgresoIA(); }

