/* =====================================================================
   Recorte de pantalla: marcas un trozo de la web y se lo preguntas a la IA.
   Se manda la imagen del trozo (html2canvas, en lib/, se carga solo al usarlo) y el texto que se lee
   en esa zona, para que Gemini lo entienda aunque la imagen no se pueda sacar.
   ===================================================================== */
function cargarScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src)); document.head.appendChild(s); });
}
function dondeEstas() {
  const v = (VISTAS.find(([k]) => k === S.vista) || [])[1] || 'GrowFolio';
  if (S.ficha) { const f = (S.M || calcular()).filas.find((x) => x.pos.id === S.ficha.id); return `la ficha de ${f ? f.inst.corto : 'una posición'}`; }
  if (S.vista === 'expertos') return `${v}, pestaña ${((EXPERTOS.find(([k]) => k === S.expTab) || [])[1] || '')}`;
  if (S.vista === 'analisis') return `${v}, pestaña ${((ANALISIS.find(([k]) => k === S.califTab) || [])[1] || '')}`;
  return v;
}
function textoEnZona(z) {
  const r = { left: z.left, top: z.top, right: z.left + z.width, bottom: z.top + z.height };
  const out = [];
  let ultTop = null;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent.trim() && n.parentElement && !n.parentElement.closest('#recorte, script, style, .navbar, .sr') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  const rango = document.createRange();
  let n;
  while ((n = w.nextNode())) {
    rango.selectNodeContents(n);
    let ok = false;
    for (const b of rango.getClientRects()) {
      if (!b.width || b.right <= r.left || b.left >= r.right || b.bottom <= r.top || b.top >= r.bottom) continue;
      const cx = Math.max(b.left, r.left, 0) / 2 + Math.min(b.right, r.right, innerWidth - 1) / 2;
      const cy = Math.max(b.top, r.top, 0) / 2 + Math.min(b.bottom, r.bottom, innerHeight - 1) / 2;
      const el = document.elementFromPoint(cx, cy);
      if (el && (el === n.parentElement || n.parentElement.contains(el) || el.contains(n.parentElement))) { ok = true; if (ultTop != null && Math.abs(b.top - ultTop) > 6) out.push('\n'); ultTop = b.top; break; }
    }
    if (ok) out.push(n.textContent.replace(/\s+/g, ' ').trim());
  }
  return out.join(' ').replace(/ ?\n ?/g, '\n').replace(/\n{2,}/g, '\n').trim().slice(0, 4000);
}
function iniciarRecorte() {
  if (!S.cartera || $('#recorte')) return;
  const volverAlAsesor = !!$('#asesorFondo');
  cerrarAsesor();
  const capa = document.createElement('div');
  capa.id = 'recorte'; capa.className = 'recorte';
  capa.innerHTML = `<div class="rc-aviso"><span>Arrastra para marcar lo que quieres preguntar</span><button class="btn peq" type="button" data-rc="todo">Toda la pantalla</button><button class="btn peq" type="button" data-rc="cancelar">Cancelar</button></div><div class="rc-caja" hidden></div>`;
  document.body.appendChild(capa);
  const caja = $('.rc-caja', capa);
  let x0 = 0, y0 = 0, arrastrando = false;
  const fin = () => { capa.remove(); document.removeEventListener('keydown', tecla); };
  const tecla = (e) => { if (e.key === 'Escape') { fin(); if (volverAlAsesor) abrirAsesor(); } };
  document.addEventListener('keydown', tecla);
  const rect = (e) => ({ left: Math.min(x0, e.clientX), top: Math.min(y0, e.clientY), width: Math.abs(e.clientX - x0), height: Math.abs(e.clientY - y0) });
  capa.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rc]'); if (!b) return;
    fin();
    if (b.dataset.rc === 'todo') capturarRecorte({ left: 0, top: 0, width: innerWidth, height: innerHeight });
    else if (volverAlAsesor) abrirAsesor();
  });
  capa.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.rc-aviso')) return;
    arrastrando = true; x0 = e.clientX; y0 = e.clientY; capa.setPointerCapture(e.pointerId);
    Object.assign(caja.style, { left: x0 + 'px', top: y0 + 'px', width: '0px', height: '0px' }); caja.hidden = false;
  });
  capa.addEventListener('pointermove', (e) => {
    if (!arrastrando) return;
    const r = rect(e); Object.assign(caja.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  });
  capa.addEventListener('pointerup', (e) => {
    if (!arrastrando) return;
    arrastrando = false;
    const r = rect(e);
    if (r.width < 24 || r.height < 24) { caja.hidden = true; toast('Arrastra el dedo o el ratón para marcar una zona'); return; }
    fin(); capturarRecorte(r);
  });
}
async function capturarRecorte(r) {
  const donde = dondeEstas();
  const texto = textoEnZona(r);
  let img = null, mini = null;
  toast('Recortando…', 1500);
  try {
    if (!window.html2canvas) await cargarScript('lib/html2canvas.min.js');
    const escala = Math.min(2, window.devicePixelRatio || 1, 1600 / Math.max(r.width, 1));
    const lienzo = await html2canvas(document.documentElement, {
      x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height,
      scale: escala, backgroundColor: '#000000', useCORS: true, logging: false,
      ignoreElements: (el) => el.id === 'recorte' || el.id === 'toast',
    });
    img = lienzo.toDataURL('image/jpeg', 0.86);
    const k = Math.min(1, 360 / lienzo.width);
    const c2 = document.createElement('canvas'); c2.width = Math.round(lienzo.width * k); c2.height = Math.round(lienzo.height * k);
    c2.getContext('2d').drawImage(lienzo, 0, 0, c2.width, c2.height);
    mini = c2.toDataURL('image/jpeg', 0.7);
  } catch (e) { console.warn('recorte sin imagen', e); }
  if (!img && !texto) { toast('No he podido sacar nada de esa zona. Prueba con otra.'); return; }
  AS.adjunto = { img, mini, texto, donde };
  await abrirAsesor();
  const ta = $('#asTexto');
  if (ta) { ta.placeholder = '¿Qué quieres saber de esto?'; ta.focus({ preventScroll: true }); }
}
function pintarAdjunto() {
  const el = $('#asAdjunto'); if (!el) return;
  const a = AS.adjunto;
  const ta = $('#asTexto');
  if (ta && !a) ta.placeholder = 'Pregunta lo que quieras de tu cartera';
  el.innerHTML = a ? `<div class="as-adjunto">${a.mini ? `<img src="${esc(a.mini)}" alt="">` : `<span class="as-adj-txt">${ICONOS.recorte}</span>`}<div><b>Recorte de ${esc(a.donde)}</b><small>${a.img ? 'Imagen y texto de la zona' : 'Solo el texto de la zona (la imagen no se pudo sacar)'}</small>
    <div class="as-adj-sug">${['Explícamelo fácil', '¿Qué significa cada dato?', '¿Me conviene? Con números'].map((q) => `<button type="button" data-as-q="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>
    <button type="button" class="ib" data-as="quitar-adjunto" aria-label="Quitar el recorte" title="Quitar el recorte">${ICONOS.cerrar}</button></div>` : '';
}

