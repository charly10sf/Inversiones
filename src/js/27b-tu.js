/* ---------- 0.8.3 · la pestaña Tú (propuesta 4 del lienzo, elegida por Carlos el 7 nov) ----------
   Arriba, quién eres (una frase hecha con tu perfil) y tus límites en un gráfico compacto: una fila por límite, con lo
   que llevas en su color y una raya en tu límite, que queda siempre al 70 % del ancho. Debajo, los apartados: Límites,
   Colchón y bolsa, Metas, Perfil, Para la IA y Lo que podrías tener. En el móvil, filas que abren su pantalla
   («‹ Tú» arriba); en el ordenador, un menú a la izquierda y el apartado abierto a la derecha (Límites si no hay otro).
   Rutas: #objetivos (la portada), #tu-limites, #tu-colchon, #tu-metas, #tu-perfil, #tu-ia y #proyeccion.
   Los límites se cambian en su pantalla con − y +, de 1 en 1, y solo se guardan con «Guardar los cambios».
   Modo estándar: solo el hecho frente al límite que puso el usuario, nunca qué hacer (CNMV). */

const TU_APS = ['limites', 'colchon', 'metas', 'perfil', 'ia', 'proy'];
const MARGEN_CERCA = 1;   // «cerca»: a menos de un punto por debajo de tu límite
const MAX_LIM = { lim: 100, cripto: 50, oro: 50 };
const EST_LIM = { pasa: ['Pasado', 'Over'], cerca: ['Cerca', 'Close'], dentro: ['Dentro', 'Within'], sin: ['Sin límite', 'No limit'] };
const estLim = (k) => L(EST_LIM[k][0], EST_LIM[k][1]);
const mayus = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
const pct1 = (x) => `${fmtNum(x, 1)} %`;

const ICO_TU = {
  limites: '<path d="M4 7h10M4 12h16M4 17h7"/><path d="M17 4v6M14 14v6"/>',
  colchon: '<path d="M12 3.5l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-5z"/>',
  metas: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  ia: '<path d="M4 5h16v11H9l-5 4z"/><path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" stroke-width="2.6" stroke-linecap="round"/>',
  proy: '<path d="M4 18l5-5 4 3 7-8"/><path d="M15 8h5v5"/>',
  campana: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
};
const icoTu = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${ICO_TU[k]}</svg>`;

/* ---------- los límites: lo guardado, el borrador de la pantalla Límites y cada fila con su estado ---------- */
function limitesGuardados() {
  return { lim: +(S.cartera.limite_acciones ?? 20), cripto: limiteDe('cripto'), oro: limiteDe('oro'), empresa: limiteDe('empresa'), caida: limiteCaida() };
}
const limitesBorrador = () => S.tuLim || limitesGuardados();
// pasado: más de MARGEN_LIM por encima (lo mismo que los avisos); cerca: a menos de un punto por debajo o dentro del margen
const estadoLim = (a, l) => (l == null ? 'sin' : a > l + MARGEN_LIM ? 'pasa' : a > 0 && a >= l - MARGEN_CERCA ? 'cerca' : 'dentro');
function filasLimites(M, lims = limitesGuardados()) {
  const e = estadoPerfil(M);
  const emp = e.mayor ? esc(e.mayor.f.inst.corto || e.mayor.f.inst.nombre) : '';
  const fila = (k, t, corto, sub, actual, limite) => ({ k, t, corto, sub, actual, limite, estado: estadoLim(actual, limite) });
  const out = [
    fila('lim', L('Acciones sueltas', 'Single stocks'), L('Acciones sueltas', 'Single stocks'), L('empresas compradas una a una', 'companies bought one by one'), e.pctSueltas, lims.lim),
    fila('empresa', L('Una sola empresa', 'One company'), emp || L('Una empresa', 'One company'), emp ? L(`${emp}, la que más pesa`, `${emp}, the biggest one`) : L('aún no tienes acciones sueltas', 'you hold no single stocks yet'), e.mayor ? e.mayor.pct : 0, lims.empresa),
    fila('cripto', 'Cripto', 'Cripto', '', e.pctCripto, lims.cripto),
    fila('oro', L('Oro y materias primas', 'Gold and commodities'), L('Oro', 'Gold'), '', e.pctOro, lims.oro),
  ];
  const c = M && M.filas ? caidaActual(M) : null;
  out.push({ k: 'caida', caida: true, t: L('Caída desde máximos', 'Drop from the high'), corto: L('Caída', 'Drop'),
    sub: c ? L(`Hoy, un ${pct1(c.ahora)} por debajo del máximo de 12 meses`, `Today, ${pct1(c.ahora)} below the 12-month high`) : L('frente al máximo de los últimos 12 meses', 'against the 12-month high'),
    actual: c ? c.ahora : null, limite: lims.caida, estado: lims.caida == null ? 'sin' : c ? estadoLim(c.ahora, lims.caida) : 'dentro' });
  return out;
}
function resumenLimites(filas) {
  const pasan = filas.filter((x) => x.estado === 'pasa'), cerca = filas.filter((x) => x.estado === 'cerca'), n = filas.filter((x) => x.limite != null).length;
  const titulo = pasan.length ? L(`Pasas ${pasan.length} de tus ${n} límites`, `You're over ${pasan.length} of your ${n} limits`) : L('Ningún límite pasado', 'No limit passed');
  const linea = [pasan.length ? `${yLista(pasan.map((x) => x.corto))}.` : '', cerca.length ? L(`${yLista(cerca.map((x) => x.corto))}, cerca.`, `${yLista(cerca.map((x) => x.corto))}, close.`) : ''].filter(Boolean).join(' ')
    || L('Todo dentro de lo que te pusiste.', 'All within what you set.');
  return { pasan, cerca, n, titulo, linea };
}
// la pista: lo que llevas, en el color de su estado, y la raya de tu límite al 70 % del ancho
function pistaLim(x) {
  if (x.limite == null) return '<span class="tl-pista sin" aria-hidden="true"></span>';
  const a = x.actual || 0, w = x.limite > 0 ? Math.min(100, (a / x.limite) * 70) : a > 0 ? 100 : 0;
  return `<span class="tl-pista" aria-hidden="true"><b class="e-${x.estado}" style="width:${w.toFixed(1)}%"></b><s></s></span>`;
}
const avisoLimOn = () => { const c = avisosCfg(); return !!(c.on && c.lim); };

/* ---------- la cabecera: quién eres y el gráfico compacto de tus límites ---------- */
const SIT_CORTA = { estudiante: ['estudiando', 'studying'], trabajando: ['por cuenta ajena', 'employed'], autonomo: ['autónomo', 'self-employed'], paro: ['buscando trabajo', 'looking for work'], jubilado: ['jubilado', 'retired'] };
function fraseQuien(p) {
  const sit = String(p.situacion || '').split(',').map((k) => SIT_CORTA[k]).filter(Boolean).map((x) => L(x[0], x[1]));
  const a = [p.edad ? L(`${p.edad} años`, `${p.edad} years old`) : '', sit.length ? yLista(sit) : ''].filter(Boolean).join(', ');
  const b = [];
  if (p.horizonte) b.push(L(`el dinero, ${textoHorizonte(p.horizonte)}`, `money needed ${trad(textoHorizonte(p.horizonte))}`));
  if (p.riesgo && RIESGO[p.riesgo]) b.push(L(`si cayera un 30 %, ${RIESGO[p.riesgo][0].toLowerCase()}: <b>perfil ${RIESGO[p.riesgo][2].toLowerCase()}</b>`, `if it fell 30 %, ${trad(RIESGO[p.riesgo][0]).toLowerCase()}: <b>${trad(RIESGO[p.riesgo][2]).toLowerCase()} profile</b>`));
  return [a ? `${mayus(a)}.` : '', b.length ? `${mayus(b.join('; '))}.` : ''].filter(Boolean).join(' ');
}
function htmlQuien() {
  const p = perfil(), nom = nombreUsuario(), ini = esc((nom || '·').slice(0, 1).toUpperCase());
  if (perfilVacio()) return `<div class="tuv-quien">
      <span class="tuv-ini" aria-hidden="true">${ini}</span>
      <div><p class="tuv-nom">${L('Cuéntale a Toisón quién eres', 'Tell Toisón who you are')}</p>
      <p class="tuv-frase">${L('Tu edad, cuándo necesitarás el dinero y cuánto riesgo aguantas. Es un minuto.', 'Your age, when you will need the money and how much risk you can take. It takes a minute.')}</p>
      <button type="button" class="btn pri peq" data-accion="perfil-guiado">${L('Empezar', 'Start')}</button></div></div>`;
  const nombre = nom ? esc(nom) : L('Tu perfil', 'Your profile'), frase = fraseQuien(p);
  if (perfilIncompleto()) return `<div class="tuv-quien">
      <span class="tuv-ini" aria-hidden="true">${ini}</span>
      <div><a class="tuv-nom" href="#tu-perfil">${nombre}</a>${frase ? `<p class="tuv-frase">${frase}</p>` : ''}
      <p class="tuv-frase k">${L('Tu perfil está a medias.', 'Your profile is unfinished.')}</p>
      <button type="button" class="btn pri peq" data-accion="perfil-guiado">${L('Terminarlo', 'Finish it')}</button></div></div>`;
  return `<a class="tuv-quien enl" href="#tu-perfil" aria-label="${L(`${nombre}: tu perfil`, `${nombre}: your profile`)}">
      <span class="tuv-ini" aria-hidden="true">${ini}</span>
      <span><span class="tuv-nom">${nombre}</span><span class="tuv-frase">${frase}</span></span><i class="aj-flecha" aria-hidden="true"></i></a>`;
}
function htmlGraficoLim(filas) {
  const r = resumenLimites(filas), vacio = perfilVacio();
  const li = (x) => {
    if (x.caida && x.limite == null) return `<li class="tl-fila"><span class="tl-n">${x.corto}</span>${pistaLim(x)}<a class="tl-c tl-poner" href="#tu-limites" data-tulim="caida:poner">${L('Poner límite', 'Set a limit')}</a></li>`;
    const hoy = x.actual == null ? '—' : pct1(x.actual);
    const aria = L(`${x.corto}: ${hoy} de un límite de ${fmtNum(x.limite, 0)} %, ${estLim(x.estado).toLowerCase()}`, `${x.corto}: ${hoy} of a ${fmtNum(x.limite, 0)} % limit, ${estLim(x.estado).toLowerCase()}`);
    return `<li class="tl-fila"><span class="sr">${aria}</span><span class="tl-n" aria-hidden="true">${x.corto}</span>${pistaLim(x)}<span class="tl-c" aria-hidden="true"><b class="tx-${x.estado}">${hoy}</b><span class="k"> ${L('de', 'of')} ${fmtNum(x.limite, 0)}</span></span></li>`;
  };
  return `<div class="tuv-lims">
      <div class="tuv-lims-cab"><div><p class="tuv-lims-t">${r.titulo}</p><p class="tuv-lims-l">${r.linea}</p></div><a class="enlace" href="#tu-limites">${L('Cambiar', 'Change')}</a></div>
      <ul class="tl-graf">${filas.map(li).join('')}</ul>
      <p class="tuv-lims-pie">${vacio ? L('Son los de partida de Toisón: cámbialos a tu gusto. ', 'These are Toisón’s starting limits: change them as you like. ') : ''}${L('La raya es tu límite.', 'The line is your limit.')} ${avisoLimOn() ? L('Tu aviso está activado.', 'Your alert is on.') : L('Tu aviso está desactivado.', 'Your alert is off.')}</p>
    </div>`;
}

/* ---------- los apartados ---------- */
function apartadosTu(M, filas) {
  const r = resumenLimites(filas), e = estadoPerfil(M), p = e.p, metas = e.metas;
  const pill = (est, t) => `<span class="tl-pill e-${est}" aria-hidden="true"><i></i>${t}</span>`;
  const col = e.colchon ? Math.round((e.seguro / e.colchon) * 100) : null;
  const bolsa = e.reco && M.total ? (e.pctBolsa > e.reco.max ? L('bolsa por encima', 'stocks above') : e.pctBolsa < e.reco.min ? L('bolsa por debajo', 'stocks below') : L('bolsa dentro', 'stocks within')) : '';
  const enCamino = metas.filter((m) => m.ok !== false).length;
  const resp = (p.respuestas || []).length, notas = !!(S.cartera.asesor && S.cartera.asesor.sobre_mi), preg = preguntasIA().length;
  return [
    { k: 'limites', h: '#tu-limites', t: L('Límites', 'Limits'), s: r.pasan.length ? L(`Pasas ${r.pasan.length} de ${r.n}`, `Over ${r.pasan.length} of ${r.n}`) : r.cerca.length ? L(`Ninguno pasado, ${r.cerca.length} cerca`, `None over, ${r.cerca.length} close`) : L('Todo dentro', 'All within'),
      p: r.pasan.length ? pill('pasa', r.pasan.length) : r.cerca.length ? pill('cerca', r.cerca.length) : '' },
    { k: 'colchon', h: '#tu-colchon', t: L('Colchón y bolsa', 'Cushion and stocks'), s: [col != null ? L(`Colchón al ${fmtNum(Math.min(col, 999), 0)} %`, `Cushion at ${fmtNum(Math.min(col, 999), 0)} %`) : L('Pon tus gastos al mes', 'Add your monthly spending'), bolsa].filter(Boolean).join(' · '),
      p: col != null && col < 90 ? pill('cerca', `${fmtNum(col, 0)} %`) : '' },
    { k: 'metas', h: '#tu-metas', t: L('Metas', 'Goals'), s: metas.length ? L(`${enCamino} de ${metas.length} en camino`, `${enCamino} of ${metas.length} on track`) : L('Ninguna todavía', 'None yet'),
      p: metas.length ? pill(enCamino === metas.length ? 'dentro' : 'cerca', enCamino === metas.length ? metas.length : metas.length - enCamino) : '' },
    { k: 'perfil', h: '#tu-perfil', t: L('Perfil', 'Profile'), s: perfilVacio() ? L('Sin hacer', 'Not done') : [p.riesgo && RIESGO[p.riesgo] ? L(RIESGO[p.riesgo][2], trad(RIESGO[p.riesgo][2])) : '', p.edad ? L(`${p.edad} años`, `${p.edad} years old`) : '', perfilIncompleto() ? L('a medias', 'unfinished') : ''].filter(Boolean).join(' · '),
      p: perfilIncompleto() ? pill('cerca', '!') : '' },
    { k: 'ia', h: '#tu-ia', t: L('Para la IA', 'For the AI'), s: preg ? L(`Te pregunta ${preg === 1 ? 'una cosa' : `${preg} cosas`}`, `It asks you ${preg} thing${preg === 1 ? '' : 's'}`) : [resp ? L(`${resp} ${resp === 1 ? 'respuesta' : 'respuestas'}`, `${resp} answer${resp === 1 ? '' : 's'}`) : '', notas ? L('tus notas', 'your notes') : ''].filter(Boolean).join(L(' y ', ' and ')).replace(/^t/, 'T') || L('Lo que quieras que tenga en cuenta', 'Anything you want it to know'),
      p: preg ? pill('cerca', preg) : '' },
    { k: 'proy', h: '#proyeccion', t: L('Lo que podrías tener', 'What you could have'), s: L('En 5, 10 y 20 años', 'In 5, 10 and 20 years'), p: '' },
  ];
}

/* ---------- los paneles de cada apartado ---------- */
function cabPanel(t, intro, extra = '') {
  return `<div class="tuv-ph"><a class="tuv-atras" href="#objetivos"><i class="aj-flecha atras" aria-hidden="true"></i>${L('Tú', 'You')}</a>
    <div class="tuv-ph-fila"><div><h2 class="tuv-t" id="tuvT">${t}</h2>${intro ? `<p class="tuv-intro">${intro}</p>` : ''}</div>${extra}</div></div>`;
}
function htmlAvisoLim() {
  const c = avisosCfg(), app = window.InversionesApp, nativo = appAvisos(), on = !!(c.on && c.lim), bloq = !!(app && !nativo);
  const sub = bloq ? L('Actualiza la app de Android (Ajustes > App de Android) para tener avisos.', 'Update the Android app (Settings > Android app) to get alerts.')
    : on ? (nativo ? L('En el móvil, aunque no tengas la app abierta', 'On your phone, even with the app closed') : L('En este navegador, mientras Toisón esté abierto', 'In this browser, while Toisón is open'))
    : !c.on ? L('Al activarlo se encienden los avisos de Toisón en este dispositivo', 'Turning it on switches on Toisón alerts on this device')
    : L('Los demás avisos, en Ajustes > Avisos', 'Other alerts are in Settings > Alerts');
  return `<div class="pf-card tuv-aviso"><span class="tuv-aviso-ico">${icoTu('campana')}</span><div><p class="tuv-aviso-t" id="tuAvisoT">${L('Avisarme si paso uno', 'Alert me if I pass one')}</p><p class="tuv-aviso-s">${sub}</p></div>
    <button type="button" class="tu-sw" role="switch" aria-checked="${on}" aria-labelledby="tuAvisoT" data-tu-aviso${bloq ? ' disabled' : ''}></button></div>`;
}
function panelLimites(M) {
  const b = limitesBorrador(), g = limitesGuardados(), filas = filasLimites(M, b), dirty = !!S.tuLim;
  const paso = (x, min, max) => `<div class="tl-paso" role="group" aria-label="${L(`Tu límite de ${x.t}`, `Your ${x.t} limit`)}">
      <button type="button" data-tulim="${x.k}:-1" aria-label="${L(`Bajar ${x.t}`, `Lower ${x.t}`)}"${x.limite <= min ? ' disabled' : ''}>−</button>
      <output aria-live="polite">${fmtNum(x.limite, 0)} %</output>
      <button type="button" data-tulim="${x.k}:1" aria-label="${L(`Subir ${x.t}`, `Raise ${x.t}`)}"${x.limite >= max ? ' disabled' : ''}>+</button></div>`;
  const fila = (x) => {
    const cambiado = x.limite !== g[x.k];
    const hoy = x.actual == null ? '—' : pct1(x.actual);
    let mando;
    if (x.caida && x.limite == null) mando = `<button type="button" class="btn vac peq" data-tulim="caida:poner">${ICONOS.mas}${L('Poner límite', 'Set a limit')}</button>`;
    else if (x.caida) mando = `${paso(x, 1, 90)}<button type="button" class="enlace tl-quitar" data-tulim="caida:quitar">${L('Quitar', 'Remove')}</button>`;
    else mando = paso(x, 0, x.k === 'empresa' ? b.lim : MAX_LIM[x.k]);
    return `<li class="tlm-fila${cambiado ? ' cambiado' : ''}" data-lim="${x.k}">
      <div class="tlm-t"><p>${x.t}</p>${x.sub ? `<small>${x.sub}</small>` : ''}</div>
      <div class="tlm-pista">${pistaLim(x)}</div>
      <p class="tlm-hoy">${hoy}</p>
      <p class="tlm-est"><span class="tl-pill e-${x.estado}"><i></i>${estLim(x.estado)}</span></p>
      <span class="tlm-lbl">${L('Tu límite', 'Your limit')}</span>
      <div class="tlm-paso">${mando}</div>
    </li>`;
  };
  return `${cabPanel(L('Límites', 'Limits'), L('Lo máximo que quieres en cada cosa. Toisón solo te dice cuándo lo pasas; lo que hagas lo decides tú.', 'The most you want in each thing. Toisón only tells you when you pass it; what you do is up to you.'), htmlAvisoLim())}
    <div class="pf-card tlm">
      <div class="tlm-th" aria-hidden="true"><span>${L('Qué', 'What')}</span><span>${L('Hoy frente a tu límite', 'Today against your limit')}</span><span>${L('Hoy', 'Today')}</span><span>${L('Estado', 'Status')}</span><span>${L('Tu límite', 'Your limit')}</span></div>
      <ul>${filas.map(fila).join('')}</ul>
    </div>
    <p class="tuv-nota">${L('Pasado: más de medio punto por encima de tu límite. Cerca: a menos de un punto por debajo. Acciones sueltas, cripto y oro no suman más del 100 % entre los tres; una sola empresa, nunca más que las acciones sueltas.', 'Over: more than half a point above your limit. Close: less than a point below. Single stocks, crypto and gold add up to 100 % at most; one company, never more than single stocks.')}</p>
    <div class="tlm-pie"${dirty ? '' : ' hidden'}><button type="button" class="btn" data-tulim-deshacer>${L('Deshacer', 'Undo')}</button><button type="button" class="btn pri" data-tulim-guardar>${L('Guardar los cambios', 'Save changes')}</button></div>`;
}
// el medidor de bolsa frente a la regla de Toisón. En el estándar, el hecho y cómo se calcula; nunca qué hacer
function htmlMedidorBolsa(e) {
  const p = e.p;
  if (!e.reco) return `<p class="k">${L('Haz tu perfil y aquí verás cuánto tienes en bolsa frente a lo que encaja con tu edad, tu plazo y el riesgo que aguantas.', 'Fill in your profile to see how much you have in stocks against what fits your age, horizon and risk.')}</p>`;
  const dif = e.pctBolsa > e.reco.max ? e.pctBolsa - e.reco.max : e.pctBolsa < e.reco.min ? e.pctBolsa - e.reco.min : 0;
  const quien = (IDIOMA === 'en' ? [p.edad ? `${p.edad} years old` : '', p.horizonte ? `money needed ${trad(textoHorizonte(p.horizonte))}` : '', p.riesgo ? trad(RIESGO[p.riesgo][2]).toLowerCase() : ''] : [p.edad ? `${p.edad} años` : '', p.horizonte ? `el dinero ${textoHorizonte(p.horizonte)}` : '', p.riesgo ? RIESGO[p.riesgo][2].toLowerCase() : '']).filter(Boolean).join(', ');
  const pub = esPublico();
  const frase = pub
    ? L(`<b>La regla fija de Toisón para tus respuestas${quien ? ` (${esc(quien)})` : ''} da entre un ${e.reco.min} y un ${e.reco.max} % en bolsa.</b> Tú tienes un ${fmtNum(e.pctBolsa, 0)} %.`, `<b>Toisón’s fixed rule for your answers${quien ? ` (${esc(quien)})` : ''} gives between ${e.reco.min} and ${e.reco.max} % in stocks.</b> You have ${fmtNum(e.pctBolsa, 0)} %.`)
    : L(`<b>Para tu perfil${quien ? ` (${esc(quien)})` : ''}, lo normal es tener entre un ${e.reco.min} y un ${e.reco.max} % en bolsa.</b> Tú tienes un ${fmtNum(e.pctBolsa, 0)} %.`, `<b>For your profile${quien ? ` (${esc(quien)})` : ''}, the usual is between ${e.reco.min} and ${e.reco.max} % in stocks.</b> You have ${fmtNum(e.pctBolsa, 0)} %.`);
  // 0.8.3 (arreglo): esta segunda frase no pasaba por esPublico() y en el estándar daba una orden
  const lectura = pub
    ? (dif > 0 ? L('Estás por encima de ese rango.', 'You are above that range.') : dif < 0 ? L('Estás por debajo de ese rango.', 'You are below that range.') : L('Estás dentro de ese rango.', 'You are within that range.')) + ' ' + L('Es una cuenta general con tu riesgo, tu plazo y tu edad, no una recomendación.', 'It’s a general calculation from your risk, horizon and age, not a recommendation.')
    : dif > 0 ? L('Arriesgas más de lo que encaja contigo: en una caída fuerte lo notarías mucho. Lo que aportes, mejor a renta fija o monetario hasta acercarte.', 'You take more risk than fits you: you would feel a big drop a lot. Put new money into bonds or money market until you get closer.')
    : dif < 0 ? L('Vas más conservador de lo que te permite tu perfil: a largo plazo, más bolsa suele dar bastante más.', 'You are more conservative than your profile allows: in the long run, more stocks usually return quite a bit more.')
    : L('Encaja.', 'It fits.');
  return `<div class="pf-lectura${dif > 10 || dif < -15 ? ' aviso' : ''}">
      <div class="pf-medidor" role="img" aria-label="${L(`En bolsa: ${fmtNum(e.pctBolsa, 0)} %. Regla de Toisón: entre ${e.reco.min} y ${e.reco.max} %`, `In stocks: ${fmtNum(e.pctBolsa, 0)} %. Toisón’s rule: between ${e.reco.min} and ${e.reco.max} %`)}"><span class="pf-rango" style="left:${e.reco.min}%;width:${e.reco.max - e.reco.min}%"></span><span class="pf-tu" style="left:${Math.min(100, e.pctBolsa).toFixed(1)}%"></span></div>
      <div class="pf-medidor-ej"><span>0 %</span><span>${L('100 % en bolsa', '100 % in stocks')}</span></div>
      <p>${frase} <span>${lectura}</span></p>
    </div>`;
}
function panelColchon(M) {
  const e = estadoPerfil(M), p = e.p;
  const col = e.colchon ? `<div class="pf-lim${e.seguro < e.colchon * 0.9 ? ' pasa' : ''}"><div class="pf-lim-t"><span>${L('Colchón para imprevistos', 'Emergency cushion')}</span><b>${eur(e.seguro, 0)}<small> ${L('de', 'of')} ${eur(e.colchon, 0)}</small></b></div><div class="pf-barra ok"><i style="width:${Math.min(100, (e.seguro / e.colchon) * 100).toFixed(0)}%"></i></div><small class="k">${L(`${p.colchon_meses || 6} meses de tus gastos, en efectivo, monetarios y renta fija`, `${p.colchon_meses || 6} months of your spending, in cash, money market and bonds`)}</small></div>`
    : `<p class="k">${L('Pon tus gastos al mes y Toisón te calcula el colchón que querrías tener aparte.', 'Add your monthly spending and Toisón works out the cushion you’d want set aside.')}</p>`;
  return `${cabPanel(L('Colchón y bolsa', 'Cushion and stocks'), L('El dinero que tienes a mano para imprevistos y cuánto tienes en bolsa.', 'The money you have at hand for emergencies and how much you have in stocks.'))}
    <section class="pf-card" aria-labelledby="hCol"><header><h2 id="hCol">${L('Colchón', 'Cushion')}</h2></header>${col}
      <form id="fColchon" class="pf-form tuv-form" novalidate>
        <div class="form-grid">
          <label class="campo">Gastos al mes (€)<input name="gastos" inputmode="decimal" value="${val(p.gastos_mes)}" placeholder="1.200"><small>De media. Sirve para calcular tu colchón.</small></label>
          <label class="campo">Colchón<select name="colchon">${[3, 6, 9, 12].map((n) => `<option value="${n}"${+p.colchon_meses === n ? ' selected' : ''}>${n} meses de gastos</option>`).join('')}</select><small>${esPublico() ? L('Cuántos meses de gastos quieres tener a mano.', 'How many months of spending you want at hand.') : 'Con trabajo fijo bastan 3-6; si no, mejor 9-12.'}</small></label>
          <label class="campo">Ingresos netos al mes (€)<input name="ingresos" inputmode="decimal" value="${val(p.ingresos_mes)}" placeholder="Opcional"><small>Para saber cuánto podrías aportar.</small></label>
        </div>
        <div class="error" id="errColchon"></div>
        <div class="fila-btns"><button type="submit" class="btn pri">${L('Guardar', 'Save')}</button></div>
      </form></section>
    <section class="pf-card" aria-labelledby="hBolsa"><header><h2 id="hBolsa">${L('Bolsa frente a tu perfil', 'Stocks against your profile')}</h2></header>${htmlMedidorBolsa(e)}</section>`;
}
function panelMetas(M) {
  const metas = estadoPerfil(M).metas;
  return `${cabPanel(L('Metas', 'Goals'), L('Algo con cifra y fecha. Toisón calcula si llegas con lo que aportas.', 'Something with an amount and a date. Toisón works out whether you get there with what you put in.'), metas.length ? `<button type="button" class="btn peq" data-accion="meta">${ICONOS.mas}${L('Añadir', 'Add')}</button>` : '')}
    <section class="pf-card pf-metas" aria-label="${L('Tus metas', 'Your goals')}">
      ${metas.length ? `<ul class="metas">${metas.map((m) => `<li class="${m.ok === false ? 'falta' : 'ok'}"><div class="meta-cab"><b>${esc(m.n)}</b><span class="k">${eur(m.importe, 0)}${m.anio ? ` en ${m.anio}` : ''}</span><button class="ib" data-accion="meta" data-id="${esc(m.id)}" aria-label="Editar la meta">${ICONOS.lapiz}</button></div><div class="pf-barra ok"><i style="width:${m.pct.toFixed(0)}%"></i></div><p>${textoMeta(m)}</p></li>`).join('')}</ul>`
        : `<p class="k">Algo con cifra y fecha: la entrada de un piso, un coche, la boda, llegar a 100.000 €, dejar de trabajar a los 55… Toisón calcula si llegas con lo que aportas y cuánto te falta.</p><button class="btn peq" data-accion="meta">${ICONOS.mas}Añadir tu primera meta</button>`}
    </section>`;
}
function htmlFormPerfil() {
  const p = perfil();
  const radios = (nombre, obj, actual, fmt = (k, v) => esc(v)) => Object.entries(obj).map(([k, v]) => `<label class="opc"><input type="radio" name="${nombre}" value="${k}"${actual === k ? ' checked' : ''}><span>${fmt(k, v)}</span></label>`).join('');
  return `<form id="fPerfil" class="pf-form tuv-form" novalidate>
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
    <div class="error" id="errPerfil"></div>
    <div class="fila-btns"><button type="submit" class="btn pri">${L('Guardar', 'Save')}</button></div>
  </form>`;
}
function panelPerfil() {
  return `${cabPanel(L('Perfil', 'Profile'), L('Va dentro de tu cartera cifrada. Con esto la IA, el Paso a paso y las ideas se ajustan a ti.', 'It goes inside your encrypted portfolio. With it, the AI, the Step by step and the ideas fit you.'))}
    ${perfilVacio() ? `<section class="pf-empieza">${dibujo('perfil')}<div><h2>${L('Mejor, paso a paso', 'Easier, step by step')}</h2><p>${L('Una pregunta por pantalla, con botones grandes. Es un minuto.', 'One question per screen, with big buttons. It takes a minute.')}</p><button class="btn pri" data-accion="perfil-guiado">${L('Empezar', 'Start')}</button></div></section>` : ''}
    <section class="pf-card" aria-label="${L('Tu perfil de inversor', 'Your investor profile')}">${htmlFormPerfil()}</section>`;
}
function panelIA() {
  const p = perfil(), yo = S.cartera.asesor && S.cartera.asesor.sobre_mi;
  return `${cabPanel(L('Para la IA', 'For the AI'), L('Lo que la IA tiene en cuenta de ti cuando le preguntas y en su repaso de cada día.', 'What the AI keeps in mind about you when you ask and in its daily review.'))}
    ${htmlPreguntasIA()}
    <section class="pf-card" aria-labelledby="hPIA"><header><h2 id="hPIA">${L('Tus notas', 'Your notes')}</h2><button class="enlace" data-accion="perfil-ia">${L('Editar', 'Edit')}</button></header>
      <p class="pf-yo">${yo ? esc(yo) : '<span class="k">Tus planes, tus reglas, lo que no quieres comprar nunca, si vas a cambiar de trabajo… Lo que quieras que tenga en cuenta.</span>'}</p></section>
    ${(p.respuestas || []).length ? `<section class="pf-card" aria-labelledby="hResp"><header><h2 id="hResp">${L(`Lo que le has contestado (${p.respuestas.length})`, `What you have answered (${p.respuestas.length})`)}</h2></header><ul class="pf-resp">${p.respuestas.slice().reverse().map((r) => `<li><span class="k">${esc(r.q)}</span><b>${esc(r.a)}</b></li>`).join('')}</ul></section>` : ''}`;
}
function panelProy(M) {
  return `${cabPanel(L('Lo que podrías tener', 'What you could have'), '')}${htmlProyeccion(M)}`;
}

/* ---------- la vista entera ---------- */
function htmlTuDentro(M, ap) {
  const filas = filasLimites(M), aps = apartadosTu(M, filas), abierto = ap || 'limites';
  const flecha = '<i class="aj-flecha" aria-hidden="true"></i>';
  const menu = `<nav class="tuv-menu pf-card" aria-label="${L('Apartados de Tú', 'Sections of You')}"><ul>${aps.map((a) => `<li><a href="${a.h}" data-ap="${a.k}"${a.k === abierto ? ' data-on' : ''}${a.k === ap ? ' aria-current="page"' : ''}><span class="tuv-ico">${icoTu(a.k)}</span><span class="tuv-mt"><b>${a.t}</b><small>${a.s}</small></span>${a.p}${flecha}</a></li>`).join('')}</ul></nav>`;
  const panel = { limites: panelLimites, colchon: panelColchon, metas: panelMetas, perfil: panelPerfil, ia: panelIA, proy: panelProy }[abierto](M);
  return `<section class="pf-card tuv-cab" aria-label="${L('Resumen', 'Summary')}">${htmlQuien()}${htmlGraficoLim(filas)}</section>
    ${menu}
    <section class="tuv-panel" id="tuPanel" data-panel="${abierto}" aria-labelledby="tuvT">${panel}</section>`;
}
function vistaFuturo(M) {
  const ap = TU_APS.includes(S.tuAp) ? S.tuAp : null;
  return `<div class="tuv" data-ap="${ap || ''}">${htmlTuDentro(M, ap)}</div>`;
}
// repinta solo la pestaña (al tocar − y +, el aviso…), sin perder el sitio ni el foco
function repintarTu() {
  const el = $('#vista .tuv'); if (!el || !S.M) return pintar();
  const foco = document.activeElement, clave = foco && (foco.getAttribute('data-tulim') || (foco.hasAttribute('data-tu-aviso') && 'aviso'));
  el.innerHTML = sinCortes(htmlTuDentro(S.M, TU_APS.includes(S.tuAp) ? S.tuAp : null));
  marcarCifras(el); restaurarFormTu();
  if (clave) {
    const b = clave === 'aviso' ? el.querySelector('[data-tu-aviso]') : el.querySelector(`[data-tulim="${clave}"]`);
    if (b && !b.disabled) b.focus({ preventScroll: true });
    else { const f = el.querySelector(`[data-lim="${String(clave).split(':')[0]}"] button:not([disabled])`); if (f) f.focus({ preventScroll: true }); }
  }
}

/* ---------- cambiar los límites con − y + ---------- */
function moverLimite(k, d) {
  const v = { ...limitesBorrador() };
  if (k === 'caida') {
    if (d === 'poner') v.caida = v.caida ?? 15;
    else if (d === 'quitar') v.caida = null;
    else v.caida = Math.max(1, Math.min(90, Math.round((v.caida ?? 15) + +d)));
  } else if (k === 'empresa') v.empresa = Math.max(0, Math.min(v.lim, Math.round(v.empresa + +d)));
  else if (MAX_LIM[k] != null) {
    v[k] = Math.max(0, Math.min(MAX_LIM[k], Math.round(v[k] + +d)));
    // acciones sueltas, cripto y oro no pasan del 100 % entre los tres: bajan los otros, el más grande primero
    let sobra = v.lim + v.cripto + v.oro - 100;
    for (const n of ['lim', 'cripto', 'oro'].filter((x) => x !== k).sort((a, b) => v[b] - v[a])) { if (sobra <= 0) break; const q = Math.min(v[n], sobra); v[n] -= q; sobra -= q; }
    if (v.empresa > v.lim) v.empresa = v.lim;
  } else return;
  const g = limitesGuardados();
  S.tuLim = ['lim', 'cripto', 'oro', 'empresa', 'caida'].some((x) => v[x] !== g[x]) ? v : null;
}
async function guardarLimites() {
  const v = S.tuLim; if (!v) return;
  S.cartera.limite_acciones = v.lim;
  S.cartera.perfil = { ...(S.cartera.perfil || {}), limite_cripto: v.cripto, limite_oro: v.oro, limite_empresa: v.empresa, limite_caida: v.caida, actualizado: new Date().toISOString() };
  S.tuLim = null; AS.foto = null;
  await guardarYPintar('Tus límites');
  toast(L('Límites guardados', 'Limits saved'), 3000);
}
// el interruptor de la pantalla Límites es la casilla «lim» de los avisos; si los avisos estaban apagados, los enciende
async function cambiarAvisoLim(si) {
  const c = avisosCfg();
  c.lim = si;
  if (si && !c.on) {
    c.on = true;
    if (!appAvisos() && 'Notification' in window && Notification.permission !== 'granted') { try { await Notification.requestPermission(); } catch (e) {} }
  }
  LS.set('inv-avisos', c);
  const app = appAvisos(); if (app) { try { app.avisos(!!c.on); } catch (e) {} }
  try { enviarWidget(true); } catch (e) {}
  repintarTu();
  toast(si ? L('Te avisaremos si pasas uno de tus límites', 'We’ll alert you if you pass one of your limits') : L('Sin avisos de límites', 'No limit alerts'), 3000);
}
document.addEventListener('click', (e) => {
  const t = e.target.closest && e.target.closest('[data-tulim], [data-tulim-guardar], [data-tulim-deshacer], [data-tu-aviso]');
  if (!t || t.disabled) return;
  if (t.hasAttribute('data-tu-aviso')) { cambiarAvisoLim(t.getAttribute('aria-checked') !== 'true'); return; }
  if (t.hasAttribute('data-tulim-guardar')) { guardarLimites(); return; }
  if (t.hasAttribute('data-tulim-deshacer')) { S.tuLim = null; repintarTu(); return; }
  const [k, d] = t.getAttribute('data-tulim').split(':');
  moverLimite(k, d);
  // «Poner límite» de la cabecera lleva a la pantalla Límites con la caída ya puesta en 15 % (la abre su enlace)
  if (t.tagName === 'A' && S.vista === 'futuro' && S.tuAp !== 'limites') return;
  if (t.tagName === 'A') e.preventDefault();
  repintarTu();
});

/* ---------- guardar el perfil y el colchón, en su pantalla ----------
   Lo que escribes se apunta en S.tuForm: si algo repinta la vista mientras (llegan datos, se guarda en la nube), se
   devuelve tal cual, con el error si lo había. Se olvida al guardar o al salir del apartado (58-eventos.js) */
function apuntarFormTu(f, err) {
  S.tuForm = { id: f.id, datos: [...new FormData(f)].map(([k, v]) => [k, String(v)]), err: err ?? (S.tuForm && S.tuForm.id === f.id ? S.tuForm.err : '') };
}
function restaurarFormTu() {
  const b = S.tuForm, f = b && document.getElementById(b.id);
  if (!f || !f.closest('.tuv')) return;
  for (const el of f.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = b.datos.some(([k, v]) => k === el.name && v === el.value);
    else { const x = b.datos.find(([k]) => k === el.name); if (x) el.value = x[1]; }
  }
  const e = f.querySelector('.error'); if (e && b.err) e.textContent = b.err;
}
document.addEventListener('input', (ev) => { const f = ev.target.closest && ev.target.closest('.tuv form'); if (f && f.id) apuntarFormTu(f); });
document.addEventListener('change', (ev) => { const f = ev.target.closest && ev.target.closest('.tuv form'); if (f && f.id) apuntarFormTu(f); });
document.addEventListener('submit', async (ev) => {
  const f = ev.target;
  if (!f || (f.id !== 'fPerfil' && f.id !== 'fColchon') || !f.closest('.tuv')) return;
  ev.preventDefault();
  const n = (x) => { const v = numero(x); return v == null || isNaN(v) ? null : v; };
  const antes = S.cartera.perfil || {};
  const error = (t) => { $(f.id === 'fColchon' ? '#errColchon' : '#errPerfil').textContent = t; apuntarFormTu(f, t); };
  if (f.id === 'fColchon') {
    const gastos = n(f.gastos.value), ingresos = n(f.ingresos.value);
    if ([gastos, ingresos].some((x) => x != null && (x < 0 || x > 1e7))) { error(L('Revisa las cifras.', 'Check the amounts.')); return; }
    S.cartera.perfil = { ...antes, gastos_mes: gastos, colchon_meses: n(f.colchon.value) || 6, ingresos_mes: ingresos, actualizado: new Date().toISOString() };
    AS.foto = null; S.tuForm = null;
    await guardarYPintar('Colchón');
    toast(L('Guardado', 'Saved'), 3000);
    return;
  }
  const r = (k) => (f.querySelector(`[name=${k}]:checked`) || {}).value || null;
  const edad = n(f.edad.value);
  if (edad != null && (edad < 14 || edad > 100)) { error(L('Revisa la edad.', 'Check the age.')); return; }
  const nombre = (f.nombre.value || '').trim().slice(0, 40) || null;
  if (!S.demo) { if (nombre) LS.set('inv-nombre', nombre); else LS.del('inv-nombre'); }
  S.cartera.perfil = { ...antes, inicio_inversion: f.ini.value || (antes.inicio_inversion === 'auto' ? 'auto' : null), nombre, edad, comunidad: f.comunidad.value || null, horizonte: n(f.horizonte.value), situacion: [...f.querySelectorAll('[name=situacion]:checked')].map((x) => x.value).join(',') || null, riesgo: r('riesgo'), experiencia: r('experiencia'), estilo: r('estilo'), deudas: r('deudas'), actualizado: new Date().toISOString() };
  AS.foto = null; S.tuForm = null;
  await guardarYPintar('Perfil de inversor');
  toast(L('Guardado. La IA rehará sus consejos con tu perfil.', 'Saved. The AI will redo its advice with your profile.'), 4000);
});
