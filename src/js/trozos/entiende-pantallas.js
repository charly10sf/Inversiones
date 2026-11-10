/* =========================== 0.8.6 · Entiende tu cartera: las pantallas y la progresión (pestaña 11, sesión 6) ===========================
   Según la maqueta 11X aprobada el 8 nov. El contenido (las 20 lecciones, «Para ti ahora» y las leídas) está en
   entiende.js; aquí solo se pinta. Solo en básico, en Cartera junto a Posiciones.
   - Ordenador: arriba una tira baja de una línea con «Para ti ahora» y el avance; debajo, el índice estrecho (c3) y la
     lección grande (c9, letra de 17 px, «Con tus números» en una fila, un ejemplo).
   - Móvil: la tira y el índice por capítulos; al tocar una lección se abre en su pantalla, con volver y la letra grande.
   - Progresión sobria: leídas por capítulo (3/5) con una barra fina, el avance general (4 de 20), «sigue donde lo
     dejaste» y «Leída» en cada lección. Sin confeti, rachas ni medallas. Las leídas se guardan con la cartera cifrada
     (entiendeMarcar, en entiende.js).
   Una lección se da por leída cuando la marcas («Ya la he leído») o cuando pasas a la siguiente desde ella. */
const entMovil = () => innerWidth < 600;
// la lección abierta: la que elegiste; si no, la de «Para ti ahora»; si no, la primera
const entAbierta = (M) => S.entLeccion || (entiendeParaTi(M) || {}).id || ENT_ORDEN[0];
const entOk = () => ICONOS_PL.ok || '✓';
const entMin = (n) => L(`${n} min`, `${n} min`);

function entTira(M, movil) {
  const A = entiendeAvance(), P = entiendeParaTi(M);
  const pct0 = A.total ? Math.round((A.leidas / A.total) * 100) : 0;
  const sigue = A.leidas > 0 && A.sigue && P && P.regla && A.sigue !== P.id ? `<a href="#av-entiende" data-ent-abrir="${A.sigue}">${L(`Sigue donde lo dejaste: ${esc(ENT_LECCIONES[A.sigue].t.toLowerCase())} ›`, `Pick up where you left off ›`)}</a>` : '';
  const izq = P ? `<div class="ent-tira-d"><small>${P.regla ? L('Para ti ahora', 'For you now') : esc(P.porque.replace(/\.$/, ''))}</small><b>${esc(P.t)}</b>${!movil && P.regla ? `<span title="${esc(P.porque.replace(/<[^>]+>/g, ''))}">${P.porque}</span>` : ''}</div><button type="button" class="btn pri" data-ent-abrir="${P.id}">${L(`Leer · ${P.min} min`, `Read · ${P.min} min`)}</button>`
    : `<div class="ent-tira-d"><small>${L('Todo leído', 'All read')}</small><b>${L('Has leído las veinte', "You've read all twenty")}</b><span>${L('Puedes volver a cualquiera desde el índice.', 'You can go back to any of them from the index.')}</span></div>`;
  return `<section class="pav-t pab pav-c12 ent-tira-s"><div class="ent-tira">${izq}<div class="ent-tira-a"><span><b>${L(`${A.leidas} de ${A.total}`, `${A.leidas} of ${A.total}`)}</b> ${L('lecciones leídas', 'lessons read')}</span><div class="ent-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${A.total}" aria-valuenow="${A.leidas}" aria-label="${L('Lecciones leídas', 'Lessons read')}"><i style="width:${pct0}%"></i></div>${sigue}</div></div></section>`;
}

function entIndice(M, movil, abierta) {
  const A = entiendeAvance(), capAb = S.entCap || (entCapDe(abierta) || ENT_CAPS[0]).id;
  return `<div class="ent-ix">${ENT_CAPS.map((c, i) => {
    const a = A.caps[i], on = c.id === capAb, lleno = a.leidas === a.total;
    const fila = `<button type="button" class="ent-ixf${on ? ' on' : ''}${lleno ? ' lleno' : ''}" data-ent-cap="${c.id}" aria-expanded="${on}"><span class="ent-rom">${c.rom}</span><span class="ent-ixt"><b>${esc(c.t)}</b>${movil ? `<small>${esc(c.d)}</small>` : ''}<span class="ent-capb"><i style="width:${Math.round((a.leidas / a.total) * 100)}%"></i></span></span><em>${lleno ? entOk() : ''}${a.leidas} / ${a.total}</em></button>`;
    const subs = on ? `<ul class="ent-subs">${c.ls.map((id) => { const si = entLeida(id), aqui = !movil && id === abierta; return `<li><button type="button" class="ent-sub${aqui ? ' on' : ''}" data-ent-abrir="${id}"${aqui ? ' aria-current="true"' : ''}><span class="ent-ck${si ? ' si' : ''}" aria-hidden="true">${si ? entOk() : ''}</span><span class="ent-subt">${esc(ENT_LECCIONES[id].t)}</span>${movil ? `<em>${si ? L('leída', 'read') : entMin(ENT_LECCIONES[id].min)}</em>` : si ? `<span class="ent-sr">${L('leída', 'read')}</span>` : ''}</button></li>`; }).join('')}</ul>` : '';
    return fila + subs;
  }).join('')}</div>`;
}

function entLeccionPag(M, id, movil) {
  const x = entiendeLeccion(id, M), cap = entCapDe(id), i = ENT_ORDEN.indexOf(id);
  const ant = ENT_ORDEN[i - 1], sig = x.siguiente;
  const enCap = cap.ls.filter(entLeida).length, A = entiendeAvance();
  const puntos = cap.ls.map((y) => `<i class="${entLeida(y) ? 'si' : ''}${y === id ? ' aqui' : ''}"></i>`).join('');
  const volver = movil ? `<button type="button" class="btn" data-ent-volver>${L('‹ Volver al índice', '‹ Back to the index')}</button>` : ant ? `<button type="button" class="btn" data-ent-abrir="${ant}">${L(`‹ ${esc(ENT_LECCIONES[ant].t)}`, '‹ Previous')}</button>` : '<span></span>';
  const marca = x.leida ? `<button type="button" class="btn ent-desmarcar" data-ent-leida="0">${L('Marcar como no leída', 'Mark as unread')}</button>` : `<button type="button" class="btn" data-ent-leida="1">${entOk()}${L('Ya la he leído', "I've read it")}</button>`;
  const seguir = sig ? `<button type="button" class="btn pri" data-ent-sig="${sig}">${L(`Siguiente: ${esc(ENT_LECCIONES[sig].t.toLowerCase())} ›`, 'Next ›')}</button>` : '';
  return `<div class="ent-pag-g">${entiendeLeccionHtml(id, M)}
    <div class="ent-pag-av"><span class="ent-puntos" aria-hidden="true">${puntos}</span><span>${L(`${enCap} de ${cap.ls.length} leídas en este capítulo · ${A.leidas} de ${A.total} en total`, `${enCap} of ${cap.ls.length} read in this chapter · ${A.leidas} of ${A.total} in all`)}</span></div>
    <div class="ent-pag-pie">${volver}<span class="ent-pie-d">${marca}${seguir}</span></div></div>`;
}

function pavEntiende(M) {
  const movil = entMovil(), abierta = entAbierta(M);
  if (movil && S.entLeccion) {
    const x = entiendeLeccion(abierta, M);
    return [`<section class="pav-t pab pav-c12 ent-leccion"><button type="button" class="ent-volver" data-ent-volver>${L('‹ Entiende tu cartera', '‹ Understand your portfolio')}</button>${entLeccionPag(M, abierta, true)}</section>`,
      pabPreguntas([L(`Explícame «${x.t}» con mi cartera`, `Explain «${x.t}» with my portfolio`), L('¿Qué otra lección me toca ahora?', 'Which lesson fits me now?')], 'c12')].join('');
  }
  if (movil) return [pabLead(L('Un pequeño libro de tu cartera, por capítulos. Cada lección usa tus números.', 'A little book about your portfolio, by chapters. Each lesson uses your numbers.')),
    entTira(M, true),
    pabT('c12', L('Capítulos', 'Chapters'), entIndice(M, true, abierta) + `<p class="ent-nota">${L('Toca un capítulo para ver sus lecciones y una lección para leerla.', 'Tap a chapter to see its lessons and a lesson to read it.')} ${ENT_PIE}</p>`)].join('');
  return [entTira(M, false),
    pabT('c3', L('Índice', 'Contents'), entIndice(M, false, abierta) + `<p class="ent-nota">${ENT_PIE}</p>`),
    `<section class="pav-t pab pav-c9 ent-leccion" id="entLeccion">${entLeccionPag(M, abierta, false)}</section>`].join('');
}

// abrir, pasar, marcar y volver: se repinta la pestaña y, en el móvil, se sube arriba
async function entIr(id, { marcarAntes = null } = {}) {
  if (marcarAntes && !entLeida(marcarAntes)) await entiendeMarcar(marcarAntes, true);
  S.entLeccion = id; if (id) S.entCap = entCapDe(id).id;
  repintarAv();
  setTimeout(() => { const el = entMovil() ? $('#panelAv') : $('#entLeccion'); if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' }); const h = $('#panelAv .ent-pag h3'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }, 30);
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest && e.target.closest('#panelAv [data-ent-abrir], #panelAv [data-ent-cap], #panelAv [data-ent-leida], #panelAv [data-ent-sig], #panelAv [data-ent-volver]');
  if (!b) return;
  e.preventDefault();
  const d = b.dataset;
  if (d.entAbrir) entIr(d.entAbrir);
  else if (d.entCap) { S.entCap = S.entCap === d.entCap && entMovil() ? '_' : d.entCap; repintarAv(); }
  else if (d.entSig) entIr(d.entSig, { marcarAntes: entAbierta(S.M || calcular()) });
  else if ('entVolver' in d) { S.entLeccion = null; repintarAv(); setTimeout(() => scrollTo(0, 0), 30); }
  else if (d.entLeida) { b.disabled = true; await entiendeMarcar(entAbierta(S.M || calcular()), d.entLeida === '1'); S.entLeccion = entAbierta(S.M || calcular()); repintarAv(); }
});
