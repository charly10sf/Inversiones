/* =========================== 0.4: tu cartera de un vistazo =========================== */
/* Cada posición, un rectángulo del tamaño de lo que vale (las de varias plataformas, juntas) y del color de cómo va:
   hoy o desde que la compraste. El efectivo, en gris. Se reparte con el algoritmo «squarified» (rectángulos lo más
   cuadrados posible) y se dibuja ya en la página, cuando se sabe lo ancho que es */
const MC_MODOS = [['hoy', 'Hoy', 'Today'], ['total', 'Desde que compraste', 'Since you bought']];
const MC_CORTES = { hoy: [0.25, 0.75, 1.5, 2.5], total: [2, 10, 25, 50] };
function piezasCartera(M) {
  const por = new Map();
  for (const f of M.filas) {
    if (!(f.valor > 0)) continue;
    const k = f.inst.id, x = por.get(k) || { id: k, pos: f.pos.id, n: f.inst.corto || f.inst.nombre, dom: f.inst.dominio || null, valor: 0, dia: 0, coste: 0, conDia: false, sinPrecio: false };
    x.valor += f.valor; x.coste += f.coste || 0;
    if (f.varDia != null && !f.diaViejo) { x.dia += f.dia || 0; x.conDia = true; }
    if (f.sinPrecio) x.sinPrecio = true;
    por.set(k, x);
  }
  const out = [...por.values()].map((x) => ({ ...x, hoy: x.conDia && x.valor - x.dia > 0 ? (x.dia / (x.valor - x.dia)) * 100 : null, total: !x.sinPrecio && x.coste > 0 ? (x.valor / x.coste - 1) * 100 : null, pl: x.valor - x.coste }));
  const ef = sum(M.efectivo.filter((e) => e.importe > 0), (e) => e.importe);
  if (ef > 0) out.push({ id: '_ef', n: L('Efectivo', 'Cash'), valor: ef, efectivo: true, hoy: null, total: null });
  return out.sort((a, b) => b.valor - a.valor);
}
function squarify(items, W, H) {
  const tot = sum(items, (x) => x.valor), k = (W * H) / tot, out = [];
  let x = 0, y = 0, w = W, h = H, fila = [];
  const peor = (r, lado) => { const s = sum(r, (z) => z.a), mx = Math.max(...r.map((z) => z.a)), mn = Math.min(...r.map((z) => z.a)); return Math.max((lado * lado * mx) / (s * s), (s * s) / (lado * lado * mn)); };
  const colocar = (r) => {
    const s = sum(r, (z) => z.a);
    if (w >= h) { const cw = s / h; let yy = y; for (const z of r) { const zh = z.a / cw; out.push({ ...z, x, y: yy, w: cw, h: zh }); yy += zh; } x += cw; w -= cw; }
    else { const rh = s / w; let xx = x; for (const z of r) { const zw = z.a / rh; out.push({ ...z, x: xx, y, w: zw, h: rh }); xx += zw; } y += rh; h -= rh; }
  };
  const resto = items.map((z) => ({ ...z, a: z.valor * k }));
  while (resto.length) {
    const lado = Math.min(w, h), c = resto[0];
    if (!fila.length || peor([...fila, c], lado) <= peor(fila, lado)) { fila.push(c); resto.shift(); } else { colocar(fila); fila = []; }
  }
  if (fila.length) colocar(fila);
  return out;
}
/* los rectángulos, ya colocados. Los que saldrían tan pequeños que no se vería nada (menos de 34 px de lado) van juntos
   en uno, «y 3 más», con su suma y cómo van entre todos; al tocarlo, salen uno a uno debajo */
function trozosMc(M, W, H) {
  const todas = piezasCartera(M);
  let piezas = todas, t = squarify(todas, W, H);
  const chica = (x) => Math.min(x.w, x.h) < 34;
  // se van juntando desde la más pequeña hasta que el grupo y todas las demás se ven bien
  for (let k = Math.max(2, t.filter(chica).length); t.some(chica) && k < todas.length; k++) {
    const otras = todas.slice(-k), ids = new Set(otras.map((p) => p.id)), conHoy = otras.filter((p) => p.hoy != null), conTot = otras.filter((p) => p.total != null);
    const base = sum(conHoy, (p) => p.valor - p.dia), dia = sum(conHoy, (p) => p.dia), coste = sum(conTot, (p) => p.coste), vt = sum(conTot, (p) => p.valor);
    piezas = [...todas.filter((p) => !ids.has(p.id)), { id: '_otras', n: L(`${otras.length} más`, `${otras.length} more`), otras, valor: sum(otras, (p) => p.valor), dia, hoy: base > 0 ? (dia / base) * 100 : null, total: coste > 0 ? (vt / coste - 1) * 100 : null, pl: vt - coste }].sort((a, b) => b.valor - a.valor);
    t = squarify(piezas, W, H);
  }
  S.mcPiezas = piezas;
  return t;
}
// cómo va, con los decimales justos: hoy, dos si es poco; desde que la compraste, ninguno a partir de +100 %
const pctMc = (v, modo) => pctS(v, modo === 'hoy' ? (Math.abs(v) < 10 ? 2 : 1) : Math.abs(v) >= 100 ? 0 : 1);
// lo que ocupa un texto con la letra de la app (para que nada se salga de su rectángulo)
const medirMc = document.createElement('canvas').getContext('2d');
let letraMc = '';
function anchoMc(t, peso, px) {
  if (!letraMc) letraMc = getComputedStyle(document.body).fontFamily || 'sans-serif';
  medirMc.font = `${peso} ${px}px ${letraMc}`;
  return medirMc.measureText(String(t)).width * 1.02;
}
const piezaMc = (id) => ((S.mcPiezas || []).find((x) => x.id === id) || (S.M ? piezasCartera(S.M).find((x) => x.id === id) : null));
// el logo de cada cosa (el de su web o su gestora; si no carga, sus iniciales), el € del efectivo o el «+3» de las pequeñas
function logoMc(p, t) {
  const st = `style="--lg:${t}px"`;
  if (p.efectivo) return `<span class="logo-a mc-logo mc-logo-ef" ${st} aria-hidden="true"><span>€</span></span>`;
  if (p.otras) return `<span class="logo-a mc-logo mc-logo-mas" ${st} aria-hidden="true"><span>+${p.otras.length}</span></span>`;
  return logo(p.dom, p.n, 'mc-logo').replace('class="logo-a mc-logo"', `class="logo-a mc-logo" ${st}`);
}
function tonoMc(v, modo) {
  if (v == null || !isFinite(v)) return 'mp-n';
  const c = MC_CORTES[modo], a = Math.abs(v), k = a >= c[3] ? 4 : a >= c[2] ? 3 : a >= c[1] ? 2 : a >= c[0] ? 1 : 0;
  return k ? `mp-${v > 0 ? 'u' : 'd'}${k}` : 'mp-n';
}
function htmlLeyendaMc(modo) {
  const c = MC_CORTES[modo];
  const pasos = ['mp-d4', 'mp-d3', 'mp-d2', 'mp-d1', 'mp-n', 'mp-u1', 'mp-u2', 'mp-u3', 'mp-u4'];
  return `<span class="ml-t">${modo === 'hoy' ? L('Cómo va hoy', 'How it does today') : L('Desde que la compraste', 'Since you bought it')}</span><div class="ml-barra"><div class="ml-escala">${pasos.map((k) => `<i class="${k}"></i>`).join('')}</div><div class="ml-et"><span>${pctS(-c[3], c[3] < 10 ? 1 : 0)}</span><span>0</span><span>${pctS(c[3], c[3] < 10 ? 1 : 0)}</span></div></div><div class="ml-pasos"><span><i class="mc-ef-i"></i>${L('Efectivo', 'Cash')}</span></div>`;
}
function htmlMapaCartera(M, inicio) {
  if (!M || !M.filas.some((f) => f.valor > 0)) return '';
  if (S.mcModo == null) S.mcModo = LS.get('inv-mc', 'hoy') === 'total' ? 'total' : 'hoy';
  return `<section class="mc-w${inicio ? ' car-mc' : ''}" aria-labelledby="hMc${inicio ? 'i' : ''}">
    <div class="sec-cab"><h2 id="hMc${inicio ? 'i' : ''}">${L('Tu cartera de un vistazo', 'Your portfolio at a glance')}</h2><span class="k">${L('Cada rectángulo, una posición: su tamaño es lo que vale, y su color, cómo va.', 'Each box is a holding: its size is what it is worth, its color how it is doing.')}</span>
      <div class="der"><div class="mapa-modos" role="group" aria-label="${L('Qué colorea', 'What the color shows')}">${MC_MODOS.map(([k, es, en]) => `<button type="button" data-mc-modo="${k}" aria-pressed="${k === S.mcModo}">${L(es, en)}</button>`).join('')}</div></div></div>
    <div class="mc-caja"></div>
    <div class="mc-pie"><div class="mapa-ley">${htmlLeyendaMc(S.mcModo)}</div></div>
    <div class="mc-det" aria-live="polite">${htmlDetalleMc(M)}</div>
  </section>`;
}
function textoPiezaMc(p) {
  const pesa = S.M && S.M.total ? (p.valor / S.M.total) * 100 : 0;
  if (p.otras) return `${L(`${p.otras.length} posiciones pequeñas`, `${p.otras.length} small holdings`)}: ${eur(p.valor, 0)}, ${L(`el ${fmtNumR(pesa, 1)} % de tu cartera`, `${fmtNumR(pesa, 1)}% of your portfolio`)}${p.hoy != null ? `; ${L('hoy', 'today')} ${pctS(p.hoy, 2)} (${eurS(p.dia, 0)})` : ''}.`;
  if (p.efectivo) return L(`${eur(p.valor, 0)} en efectivo, el ${fmtNumR(pesa, 1)} % de lo que tienes.`, `${eur(p.valor, 0)} in cash, ${fmtNumR(pesa, 1)}% of what you have.`);
  const hoy = p.hoy != null ? L(`hoy ${pctS(p.hoy, 2)} (${eurS(p.dia, 0)})`, `today ${pctS(p.hoy, 2)} (${eurS(p.dia, 0)})`) : L('sin precio de hoy', 'no price today');
  const tot = p.total != null ? L(`desde que la compraste ${pctS(p.total, 1)} (${eurS(p.pl, 0)})`, `since you bought it ${pctS(p.total, 1)} (${eurS(p.pl, 0)})`) : '';
  return `${eur(p.valor, 0)}, ${L(`el ${fmtNumR(pesa, 1)} % de tu cartera`, `${fmtNumR(pesa, 1)}% of your portfolio`)}; ${hoy}${tot ? `; ${tot}` : ''}.`;
}
function htmlDetalleMc(M) {
  const p = S.mcSel && piezaMc(S.mcSel);
  if (!p) return `<p class="k">${L('Toca un rectángulo para ver sus cifras.', 'Tap a box to see its numbers.')}</p>`;
  if (p.otras) {
    const modo = S.mcModo;
    return `<div class="mc-otras"><p><b>${esc(p.n)}</b> ${textoPiezaMc(p)}</p><ul>${p.otras.map((x) => { const v = modo === 'hoy' ? x.hoy : x.total; return `<li><button type="button" class="mc-otra" ${x.pos ? `data-mc-ficha="${esc(x.pos)}"` : 'disabled'}>${logoMc(x, 22)}<span>${esc(x.n)}</span><small>${eur(x.valor, 0)}</small>${v == null ? '' : `<span class="mi-v ${cls(v)}">${pctS(v, modo === 'hoy' ? 2 : 1)}</span>`}</button></li>`; }).join('')}</ul></div>`;
  }
  return `<p><b>${esc(p.n)}</b> ${textoPiezaMc(p)}</p>${p.pos ? `<button type="button" class="enlace acento" data-mc-ficha="${esc(p.pos)}">${L('Ver su ficha', 'Open its page')}</button>` : ''}`;
}
function pintarMapaCartera(caja, M) {
  if (!caja || !M) return;
  const W = caja.clientWidth;
  if (!W) return;
  const H = Math.round(Math.max(240, W < 560 ? W * 1.05 : W < 900 ? W * 0.6 : W * 0.4));
  caja.style.height = `${H}px`;
  const modo = S.mcModo, G = 3;
  const t = trozosMc(M, W, H), piezas = S.mcPiezas;
  // un grupo (no una imagen): dentro hay un botón por posición y el lector de pantalla tiene que poder llegar a ellos
  caja.setAttribute('role', 'group');
  caja.setAttribute('aria-label', L('Mapa de tu cartera: ', 'Map of your portfolio: ') + piezas.slice(0, 5).map((p) => `${p.n} ${eur(p.valor, 0)}`).join(', '));
  /* cada rectángulo lleva lo que le cabe, medido de verdad (con la letra de la app), por este orden: cómo va (que
     encoge hasta caber a lo ancho), el nombre (en dos líneas si hace falta y hay sitio, si no en una con «…»), lo que
     vale (solo los grandes) y el logo. Nada se corta: lo que no cabe entero no se pone */
  caja.innerHTML = t.filter((p) => p.w - G >= 1 && p.h - G >= 1).map((p) => {
    const w = p.w - G, h = p.h - G, v = modo === 'hoy' ? p.hoy : p.total, lado = Math.min(w, h);
    const grande = lado >= 86 && w >= 110, pad = grande ? 13 : lado >= 46 ? 8 : 4, aw = w - 2 * pad, ah = h - 2 * pad;
    const fsN = grande ? Math.max(14, Math.min(22, lado / 7.5)) : Math.max(11, Math.min(14, lado / 5));
    const sinDato = !p.efectivo && v == null;
    const tP = p.efectivo ? '' : sinDato ? (modo === 'hoy' ? L('sin precio de hoy', 'no price today') : L('sin datos', 'no data')) : pctMc(v, modo);
    let fsP = sinDato ? fsN * 0.82 : grande ? fsN * 1.5 : fsN * 1.08;
    if (tP) { const a = anchoMc(tP, sinDato ? 600 : 750, fsP); if (a > aw) fsP *= aw / a; }
    const pon = { pct: false, nom: 0, eur: false, logo: false };
    let usado = 0;
    if (tP && fsP >= 9 && fsP * 1.2 <= ah) { pon.pct = true; usado += fsP * 1.2; }
    const lN = fsN * 1.18, dosLineas = anchoMc(p.n, 650, fsN) > aw;
    if (aw >= 24 && usado + lN + 2 <= ah) { pon.nom = dosLineas && usado + 2 * lN + 2 <= ah ? 2 : 1; usado += pon.nom * lN + 2; }
    const fsE = fsN * 0.8;
    if (grande && usado + fsE * 1.3 + 2 <= ah) { pon.eur = true; usado += fsE * 1.3 + 2; }
    let lg = grande ? Math.round(Math.max(26, Math.min(40, lado / 5))) : Math.round(Math.max(18, Math.min(24, lado * 0.42)));
    if (usado + lg + 6 > ah) lg = Math.floor(Math.min(lg, ah - usado - 6));
    if (lg >= 16 && lg <= aw) pon.logo = true;
    const conTexto = pon.pct || pon.nom;
    const tam = grande ? 'g' : conTexto ? 'm' : pon.logo ? 'c' : 'x';
    const ton = p.efectivo ? 'mc-ef' : tonoMc(v, modo);
    const nom = pon.nom ? `<span class="mc-n${pon.nom === 2 ? ' dos' : ''}" style="font-size:${fsN.toFixed(1)}px">${esc(p.n)}</span>` : '';
    const pct = pon.pct ? `<span class="${sinDato ? 'mc-e' : 'mc-v'}" style="font-size:${fsP.toFixed(1)}px">${tP}</span>` : '';
    const eu = pon.eur ? `<span class="mc-e" style="font-size:${fsE.toFixed(1)}px">${eur(p.valor, 0)}</span>` : '';
    // arriba el logo; abajo el nombre y las cifras (así el rectángulo se lee entero, como una tarjeta)
    const dentro = conTexto ? `${pon.logo ? logoMc(p, lg) : '<span></span>'}<span class="mc-abj">${nom}${pct}${eu}</span>` : pon.logo ? logoMc(p, lg) : '';
    return `<button type="button" class="mc-t mc-${tam} ${ton}${p.id === S.mcSel ? ' sel' : ''}" data-mc="${esc(p.id)}" style="left:${(p.x + G / 2).toFixed(1)}px;top:${(p.y + G / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;padding:${pad}px;border-radius:${lado > 90 ? 12 : lado > 40 ? 8 : 5}px" aria-label="${esc(`${p.n}: ${textoPiezaMc(p)}`)}">${dentro}</button>`;
  }).join('');
}
function repintarMc() {
  for (const c of $$('.mc-caja')) pintarMapaCartera(c, S.M);
  for (const d of $$('.mc-det')) d.innerHTML = htmlDetalleMc(S.M);
  for (const l of $$('.mc-pie .mapa-ley')) l.innerHTML = htmlLeyendaMc(S.mcModo);
  for (const b of $$('[data-mc-modo]')) b.setAttribute('aria-pressed', String(b.dataset.mcModo === S.mcModo));
}
document.addEventListener('click', (e) => {
  const m = e.target.closest('[data-mc-modo]');
  if (m) { S.mcModo = m.dataset.mcModo; LS.set('inv-mc', S.mcModo); repintarMc(); return; }
  const f = e.target.closest('[data-mc-ficha]');
  if (f) { abrirFicha(f.dataset.mcFicha); return; }
  const t = e.target.closest('[data-mc]');
  if (t) { S.mcSel = S.mcSel === t.dataset.mc ? null : t.dataset.mc; repintarMc(); }
});
// con ratón (no con el dedo): sus cifras junto al puntero; al desplazar la página, se quita
document.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const caja = e.target.closest ? e.target.closest('.mc-caja') : null;
  let tip = $('#mcTip');
  if (!caja) { if (tip) tip.hidden = true; return; }
  const t = e.target.closest('[data-mc]');
  if (!t) { if (tip) tip.hidden = true; return; }
  if (!tip) { tip = document.createElement('div'); tip.id = 'mcTip'; tip.className = 'mapa-tip mc-tip'; document.body.appendChild(tip); }
  const k = `${t.dataset.mc}|${S.mcModo || ''}`;
  if (tip.dataset.k !== k || tip.hidden) {
    const p = piezaMc(t.dataset.mc);
    if (!p) return;
    tip.dataset.k = k;
    tip.innerHTML = `<b>${esc(p.n)}</b><span>${textoPiezaMc(p)}</span>`;
  }
  tip.hidden = false;
  const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8), y = e.clientY + tip.offsetHeight + 24 > innerHeight ? e.clientY - tip.offsetHeight - 12 : e.clientY + 16;
  tip.style.left = `${x}px`; tip.style.top = `${y}px`;
});

