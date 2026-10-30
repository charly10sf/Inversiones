/* =====================================================================
   Análisis IA: el que escribe GrowIA (Gemini) con tu clave, cifrado. Ya no hay uno público de partida.
   Los datos personales van como {marcas} y se rellenan aquí con tu cartera descifrada.
   ===================================================================== */
async function cargarIA() {
  // 0.3.9: ya no hay análisis público (analisis-ia.json llevaba datos de su dueño): cada uno ve el que le escribe
  // GrowIA con su clave, cifrado. Solo en el modo de pruebas se carga uno de muestra, si lo hay
  if (PERFIL_LOCAL || !CFG.dev) { S.ia = null; S.iaCargado = true; LS.del('inv-cache-ia'); return; }
  try {
    const r = await fetch('dev/analisis-ia.json?v=' + Date.now(), { cache: 'no-store' });
    if (r.ok) { const t = await r.text(); S.ia = JSON.parse(t); LS.set('inv-cache-ia', t); S.iaCargado = true; return; }
    if (r.status === 404) { S.ia = null; LS.del('inv-cache-ia'); S.iaCargado = true; return; }
  } catch (e) { console.warn(e); }
  try { const c = LS.get('inv-cache-ia'); if (c) S.ia = JSON.parse(c); } catch (e) {}
  S.iaCargado = true;
}
function valoresIA(M) {
  const v = {};
  const conTer = M.filas.filter((f) => f.inst.ter != null);
  const costeAnual = sum(conTer, (f) => (f.valor * f.inst.ter) / 100), base = sum(conTer, (f) => f.valor);
  const clase = (c) => (M.total ? (sum(M.filas.filter((f) => f.inst.clase === c), (f) => f.valor) / M.total) * 100 : 0);
  let pr = null; try { pr = proyeccion(M); } catch (e) {}
  v.total = eur(M.total, 0);
  v.rv_pct = pct(clase('Renta variable'), 0);
  v.aport_mes = eur(aportacionActual(), 0);
  v.ter_medio = pct(base ? (costeAnual / base) * 100 : 0, 2);
  v.coste_anual = eur(costeAnual, 0);
  v.p50_10 = pr ? euCorto(pr.p50[120]) : '—';
  v.p50_20 = pr ? euCorto(pr.p50[240]) : '—';
  v.sueltas_pct = pct(M.total ? (sum(M.filas.filter((f) => f.inst.tipo === 'Acción'), (f) => f.valor) / M.total) * 100 : 0, 1);
  for (const k of ['valor', 'peso', 'pl', 'plpct', 'coste', 'rent1a', 'rentytd', 'obj']) v[k] = {};
  const agrupado = new Map();
  for (const f of M.filas) { const g = agrupado.get(f.inst.id) || { valor: 0, coste: 0, peso: 0, f }; g.valor += f.valor; g.coste += f.coste; g.peso += f.peso; agrupado.set(f.inst.id, g); }
  for (const [id, g] of agrupado) {
    const p = g.f.p || {}, r = p.rent || {};
    v.valor[id] = eur(g.valor, 0); v.peso[id] = pct(g.peso, 1); v.coste[id] = eur(g.coste, 0);
    v.pl[id] = eurS(g.valor - g.coste, 0); v.plpct[id] = g.coste ? pctS((g.valor / g.coste - 1) * 100, Math.abs(g.valor / g.coste - 1) < 0.1 ? 1 : 0) : '—';
    v.rent1a[id] = pctS(r['1a'], 1); v.rentytd[id] = pctS(r.ytd, 1);
    v.obj[id] = p.analistas && p.analistas.objetivo ? precioCorto(p.analistas.objetivo) : '—';
  }
  for (const k of ['plan_ganancia', 'plan_impuesto', 'plan_importe']) v[k] = {};
  for (const f of M.filas) {
    const pl = planVenta(f, M); if (!pl) continue;
    v.plan_ganancia[f.inst.id] = eurS(pl.ganancia, 0); v.plan_impuesto[f.inst.id] = eur(pl.impuesto, 0); v.plan_importe[f.inst.id] = eur(pl.importe, 0);
  }
  // el colchón: el fondo de renta fija en el que más tiene cada uno
  const nb = [...agrupado.values()].filter((g) => g.f.inst.clase === 'Renta fija').sort((x, y) => y.valor - x.valor)[0];
  v.mejora_colchon = nb && nb.f.p && nb.f.p.rent ? eur((nb.valor * Math.max(0, 2.5 - (nb.f.p.rent['1a'] || 0))) / 100, 0) : '—';
  // 0.7h: el total que había cuando GrowIA escribió la revisión (con mayúscula para que ninguna {marca} lo alcance)
  v._totalIA = totalDeIA(iaActual(), M);
  return v;
}
/* 0.7h: GrowIA escribe el patrimonio de cuando revisó («Tu patrimonio alcanza 80.853,80 €») y al lado sale el de ahora
   (81.215 €). Lo vio Carlos el 30 oct en el resumen del día. Ese importe se cambia por el de ahora, como si hubiera escrito
   {total}: el que coincide al euro con el de la revisión o, redondeado a la centena, no se aleja más de un 0,5 %.
   Sin tocar los importes con signo (lo que sube o baja) ni los de dentro de otra cifra */
const RE_EUR_IA = /(^|[^\d.,+\-−])(\*\*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?[  ]?€/g;
const numEurIA = (ent, dec) => Number(ent.replace(/\./g, '') + '.' + (dec || '0'));
function totalDeIA(ia, M) {
  if (!ia || !ia.propio || !M || !(M.total > 0)) return null;
  if (ia.total > 0) return ia.total;
  // las de antes de la 0.7h no lo guardaban: el importe del titular (o del primer párrafo) más cercano al total de
  // ahora, si no se aleja más de un 5 %
  let mejor = null;
  for (const t of [ia.titular, (ia.resumen || [])[0]]) {
    for (const m of String(t || '').matchAll(RE_EUR_IA)) {
      const n = numEurIA(m[3], m[4]), dif = Math.abs(n - M.total);
      if (dif <= M.total * 0.05 && (mejor == null || dif < Math.abs(mejor - M.total))) mejor = n;
    }
    if (mejor != null) break;
  }
  return mejor;
}
function totalAlDiaIA(txt, antes) {
  if (!(antes > 0)) return txt;
  return String(txt).replace(RE_EUR_IA, (m, pre, ast, ent, dec) => {
    const n = numEurIA(ent, dec);
    const igual = Math.abs(n - antes) <= 1 || (!dec && n % 100 === 0 && Math.abs(n - antes) <= antes * 0.005);
    return igual ? `${pre}${ast || ''}{total}` : m;
  });
}
function rellenarIA(txt, v) {
  return esc(totalAlDiaIA(limpiaIA(txt), v && v.total && v._totalIA))
    .replace(/\{([a-z0-9_]+)(?::([a-z0-9-]+))?\}/g, (m, k, id) => {
      const val = id ? v[k] && v[k][id] : v[k];
      return val != null && typeof val !== 'object' ? `<b class="dato">${esc(val)}</b>` : '—';
    })
    .replace(/\*\*([^*]+)\*\*/g, (m, x) => `<b class="dato">${S.oculto && /€/.test(x) ? '••••' : x}</b>`);
}
function htmlAnalisisIA(M) {
  const ia = iaActual();
  const prog = `<div id="iaProgreso">${htmlProgresoIA()}</div>${htmlPreguntasIA(true)}`;
  // 0.3.9: sin análisis, una caja que dice qué hará GrowIA y el paso que falta (antes, una línea suelta y un botón que se salía en el móvil)
  if (!ia) return prog + (!S.iaCargado ? '<div class="vacio">Cargando el análisis…</div>'
    : `<section class="ov-vacio ia-vacio"><div><h2 data-no-trad>${conIA(M.filas.length ? 'GrowIA aún no ha revisado tu cartera' : 'GrowIA revisará tu cartera', M.filas.length ? "GrowIA hasn't reviewed your portfolio yet" : 'GrowIA will review your portfolio')}</h2><p>${!M.filas.length ? L('Cuando metas lo que tienes, le pondrá nota punto por punto y te dirá qué mejoraría, qué mantendría y qué riesgos vigilar.', 'Once you add what you own, it scores it point by point and tells you what it would improve, keep and watch.') : AS.clave ? L('Le pone nota punto por punto y te dice qué mejoraría, qué mantendría y qué riesgos vigilar. Tarda uno o dos minutos.', 'It scores it point by point and tells you what it would improve, keep and watch. It takes a minute or two.') : L('Actívala gratis con tu clave de Google y le pondrá nota punto por punto, con qué mejoraría, qué mantendría y qué riesgos vigilar.', 'Turn it on for free with your Google key and it will score it point by point, with what it would improve, keep and watch.')}</p></div>${!M.filas.length ? `<button class="btn pri" data-accion="nueva-pos">${ICONOS.mas}${L('Meter lo que tengo', 'Add what I own')}</button>` : AS.clave ? `<button class="btn pri" data-accion="ia-actualizar"${IA.generando ? ' disabled' : ''}>${ICONOS.nueva}${IA.generando ? L('Escribiéndolo…', 'Writing it…') : L('Que lo escriba ahora', 'Write it now')}</button>` : `<button class="btn pri" data-accion="asesor">${ICONOS.growia}${L('Activar GrowIA, gratis', 'Turn on GrowIA, free')}</button>`}</section>`);
  const v = valoresIA(M);
  const R = (t) => rellenarIA(t || '', v);
  const f = String(ia.fecha || '');
  const d = new Date(f.length > 10 ? f : f + 'T12:00:00');
  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const dias = diasEntre(iso(d), hoyIso());
  const cuando = f.length > 10 ? (dias === 0 ? `hoy a las ${hora}` : dias === 1 ? `ayer a las ${hora}` : `el ${fechaLarga(iso(d))}`) : `el ${fechaLarga(f)}${dias > 0 ? `, hace ${dias} ${dias === 1 ? 'día' : 'días'}` : ''}`;
  const firma = ia.propio
    ? `Escrito por ${esc(ia.autor)} ${cuando}${ia.busquedas ? `, con ${ia.busquedas} ${ia.busquedas === 1 ? 'búsqueda' : 'búsquedas'} en internet` : ''} y tus cifras de ese momento${esRapida(ia.modelo) ? ' (con la respuesta rápida)' : ''}.`
    : `Análisis de partida ${cuando}, sin tus cifras al céntimo. ${AS.clave ? 'GrowIA escribe el suyo con tus datos: si no aparece en un par de minutos, pulsa Actualizar ahora.' : 'Activa GrowIA (gratis) para que lo rehaga con tus datos cada día.'}`;
  const boton = AS.clave
    ? `<button class="btn peq" data-accion="ia-actualizar"${IA.generando ? ' disabled' : ''}>${ICONOS.nueva}${IA.generando ? 'Actualizando…' : 'Actualizar ahora'}</button>`
    : `<button class="btn peq" data-accion="asesor">${ICONOS.growia}Activar GrowIA, gratis</button>`;
  const ids = [...new Set(M.filas.map((x) => x.inst.id))];
  const puntos = (n) => `<span class="ia-puntos" role="img" aria-label="${n} de 5">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  const reglas = (S.ia && S.ia.reglas) || [];
  const dom = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  const fuentes = (ia.fuentes || []).filter((x) => x && /^https?:\/\//.test(x.u || ''));
  const nM = (ia.mantener || []).length;
  return `<div class="ia">${prog}
    <div class="ia-firma">${ICONOS.growia}<span>${esc(firma)}</span>${boton}</div>
    <div class="ia-cab">
      ${!ia.propio && dias > 14 ? `<div class="chip warn" style="justify-self:start">Tiene más de dos semanas: activa GrowIA para que se renueve solo</div>` : ''}
      <p class="ia-titular">${R(ia.titular)}</p>
      ${(ia.resumen || []).slice(0, 1).map((p) => `<p class="ia-p">${R(p)}</p>`).join('')}
      ${(ia.resumen || []).length > 1 ? `<details class="mas ia-mas"><summary>Seguir leyendo</summary>${ia.resumen.slice(1).map((p) => `<p class="ia-p">${R(p)}</p>`).join('')}</details>` : ''}
    </div>
    ${ia.puntuaciones ? `<section class="ia-bloque" aria-labelledby="hNotas"><div class="sec-cab"><h2 id="hNotas">La nota de tu cartera, punto por punto</h2><span class="k">de 1 a 5: cuanto más alta, mejor lo haces</span></div><div class="ia-notas compactas">${ia.puntuaciones.map((x) => `<div class="ia-nota"><div class="ia-nota-t"><b>${esc(/^riesgo$/i.test(x.k) ? 'Control del riesgo' : x.k)}</b><small>${+x.nota || 0} de 5</small></div>${puntos(+x.nota || 0)}<span>${R(x.txt)}</span></div>`).join('')}</div></section>` : ''}
    ${(ia.mejorar || []).length ? `<section class="ia-bloque ia-mej" aria-labelledby="hMej"><div class="sec-cab"><h2 id="hMej">${ia.publico ? L('Para mirar', 'Worth a look') : 'Qué mejoraría'}</h2><span class="k">por orden de importancia</span></div>
        ${(() => { const li = (x) => `<li><h3>${R(x.titulo)}</h3><div class="ia-meta">${x.impacto ? `<span><b>${ia.publico ? L('Qué supone.', 'What it means.') : 'Qué ganas.'}</b> ${R(x.impacto)}</span>` : ''}${x.cuando ? `<span><b>Cuándo.</b> ${R(x.cuando)}</span>` : ''}</div>${x.texto ? `<details class="paso-mas"><summary>${ia.publico ? L('Por qué', 'Why') : 'Por qué y cómo'}</summary><p>${R(x.texto)}</p></details>` : ''}</li>`; const m = ia.mejorar || []; return `<ol class="ia-mejorar">${m.slice(0, 3).map(li).join('')}</ol>${m.length > 3 ? `<details class="mas"><summary>${m.length - 3 === 1 ? 'Una cosa más' : `${m.length - 3} cosas más`}, menos urgentes</summary><ol class="ia-mejorar" style="counter-reset: m 3">${m.slice(3).map(li).join('')}</ol></details>` : ''}`; })()}
      </section>` : ''}
    ${(ia.riesgos || []).length || nM ? `<div class="ia-bloque ia-pares">
      ${(ia.riesgos || []).length ? `<section aria-labelledby="hRie"><div class="sec-cab"><h2 id="hRie">Riesgos a vigilar</h2></div>
        <ul class="lista">${ia.riesgos.map((x) => `<li class="warn">${ICONOS.alerta}<div><b>${R(x.titulo)}</b><span>${R(x.texto)}</span></div></li>`).join('')}</ul></section>` : ''}
      ${nM ? `<section aria-labelledby="hMan"><div class="sec-cab"><h2 id="hMan">Qué mantendría</h2><span class="k">${nM === 1 ? 'lo que va bien' : `${nM} cosas que van bien`}</span></div>
        <ul class="lista">${ia.mantener.map((x) => `<li class="good">${ICONOS.ok}<div><b>${R(x.titulo)}</b><span>${R(x.texto)}</span></div></li>`).join('')}</ul></section>` : ''}
    </div>` : ''}
    ${reglas.length ? `<details class="plegable ia-reglas"><summary><h2>Tus reglas</h2><span class="k">${reglas.length === 1 ? 'una que acordaste' : `${reglas.length} que acordaste`}</span></summary>
      <ul class="lista">${reglas.map((r) => `<li class="info">${ICONOS.info}<div><span>${esc(r)}</span></div></li>`).join('')}</ul></details>` : ''}
    <p class="nota ia-donde">Lo que opina de cada posición está en Expertos, Tus posiciones; sus fechas, en el Calendario (el icono de arriba en Inicio); y sus pasos, en el Paso a paso.</p>
    ${fuentes.length ? `<details class="plegable"><summary><h2>Fuentes</h2><span class="k">${fuentes.length} noticias que ha leído para contrastar</span></summary><div class="as-fuentes">${fuentes.map((x) => `<a href="${esc(x.u)}" target="_blank" rel="noopener noreferrer" title="${esc(x.t || '')}">${esc(x.t ? x.t.slice(0, 60) : dom(x.u))}</a>`).join('')}</div></details>` : ''}
    <p class="nota ia-pie">${ia.propio ? `Lo escribe ${esc(ia.autor)} desde tu navegador con tu clave: lee tu cartera cifrada, usa las cuentas de GrowFolio y contrasta con las noticias. Se guarda cifrado con tu contraseña.` : 'Es el análisis de partida, sin cantidades: las cifras resaltadas salen de tu cartera y se recalculan solas con cada precio. GrowIA lo sustituye por el suyo en cuanto hace su primera revisión.'}</p>
  </div>`;
}

