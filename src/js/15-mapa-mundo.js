/* =========================== Mercados: el mapa del mundo (0.4) ===========================
   0.6: aquí, lo que usa el resto (el hueco del mapa y cuánto tienes en cada país); el dibujo, los nombres, los gestos y la
   ficha de cada país van en el trozo «mapa» (src/js/trozos/mapa.js), que se baja al abrir Mercados. Su ficha la pinta
   repintarMapa en cuanto llega. */
const MAPA_MODOS = [['hoy', 'Hoy', 'Today'], ['mes', '1 mes', '1 month'], ['anio', 'En el año', 'This year'], ['tuyo', 'Tu dinero', 'Your money']];
const MAPA_VISTAS = [['mundo', 'Mundo', 'World'], ['am', 'América', 'Americas'], ['eu', 'Europa', 'Europe'], ['om', 'Oriente Medio', 'Middle East', 'O. Medio', 'Mid. East'], ['as', 'Asia', 'Asia']];
// cómo se reparte por países cada zona dentro de un fondo (como sus índices MSCI, más o menos)
const ZONA_PAISES = {
  Europa: { GB: 22, FR: 16, CH: 15, DE: 15, NL: 7, SE: 5, IT: 5, ES: 5, DK: 4, FI: 1.5, BE: 1.5, NO: 1, IE: 0.5, PT: 0.3, AT: 0.3, PL: 0.3 },
  Eurozona: { FR: 33, DE: 28, NL: 15, ES: 10, IT: 8, BE: 3, FI: 2, IE: 1 },
  Pacifico: { JP: 67, AU: 22, HK: 6, SG: 4, NZ: 1 },
  Emergentes: { CN: 27, TW: 19, IN: 17, KR: 11, BR: 4, SA: 3, ZA: 3, MX: 2, AE: 1.5, MY: 1.2, ID: 1.2, TH: 1.1, PL: 1, QA: 0.8, KW: 0.7, TR: 0.6, GR: 0.5, PH: 0.5, CL: 0.4, PE: 0.3, HU: 0.3, CZ: 0.1, CO: 0.1, EG: 0.1 },
  Mundo: { US: 72, JP: 5, GB: 3.5, CA: 3, FR: 2.6, DE: 2.3, CH: 2.2, AU: 1.6, NL: 1.2, SE: 0.9, ES: 0.8, IT: 0.8, DK: 0.6, HK: 0.5, SG: 0.4, FI: 0.3, BE: 0.3, IL: 0.2, NO: 0.2, IE: 0.1, NZ: 0.1, AT: 0.1 },
};
/* en qué países cae cada posición: una acción, en el de su sede; un fondo, según sus zonas (y si el nombre dice un
   país, ese). Lo que no es bolsa (oro, cripto, renta fija, efectivo) no está en ningún país del mapa */
function paisesDeFila(f) {
  const i = f.inst;
  if (i.clase !== 'Renta variable') return null;
  if (i.tipo === 'Acción' && /^[A-Z]{2}$/.test(i.pais || '')) return { [i.pais]: 1 };
  const n = normTxt(i.nombre), out = {};
  const add = (w, peso) => { const t = sum(Object.values(w)); for (const [k, x] of Object.entries(w)) out[k] = (out[k] || 0) + (peso * x) / t; };
  const reg = i.region || { Global: 100 }, tot = sum(Object.values(reg)) || 100;
  for (const [r, x] of Object.entries(reg)) {
    const peso = x / tot;
    if (!(peso > 0)) continue;
    if (r === 'EEUU') add({ US: 1 }, peso);
    else if (r === 'Canadá') add({ CA: 1 }, peso);
    else if (r === 'Europa') add(/\bibex\b|espana|spain/.test(n) ? { ES: 1 } : /\bdax\b|german|alemania/.test(n) ? { DE: 1 } : /\bcac\b|france|francia/.test(n) ? { FR: 1 } : /ftse 100|united kingdom|reino unido/.test(n) ? { GB: 1 } : /switzerland|swiss|suiza/.test(n) ? { CH: 1 } : /stoxx 50|euro stoxx|eurozone|\bemu\b|zona euro|euro area/.test(n) ? ZONA_PAISES.Eurozona : ZONA_PAISES.Europa, peso);
    else if (r === 'Japón y Pacífico') add(/japan|japon|nikkei|topix/.test(n) ? { JP: 1 } : /australia/.test(n) ? { AU: 1 } : ZONA_PAISES.Pacifico, peso);
    else if (r === 'Emergentes') add(/china|csi 300/.test(n) ? { CN: 1 } : /\bindia\b|nifty/.test(n) ? { IN: 1 } : /brazil|brasil/.test(n) ? { BR: 1 } : /korea|corea/.test(n) ? { KR: 1 } : /taiwan/.test(n) ? { TW: 1 } : ZONA_PAISES.Emergentes, peso);
    else if (r === 'Global') add(ZONA_PAISES.Mundo, peso);
    // «Otros»: no se sabe dónde, no se pinta
  }
  return Object.keys(out).length ? out : null;
}
// cuánto tienes en cada país (con posId, solo esa posición, y el % sobre ella)
function exposicionPaises(M, posId) {
  const out = new Map();
  if (!M || !(M.total > 0)) return out;
  const filas = M.filas.filter((f) => f.valor > 0 && (!posId || f.pos.id === posId));
  const base = posId ? sum(filas, (f) => f.valor) : M.total;
  if (!(base > 0)) return out;
  for (const f of filas) {
    const w = paisesDeFila(f);
    if (!w) continue;
    for (const [c, x] of Object.entries(w)) {
      const v = f.valor * x;
      if (v < 0.5) continue;
      const e = out.get(c) || { v: 0, de: [] };
      // lo mismo en dos brókers cuenta una vez, sumado
      const ya = e.de.find((d) => d.id === f.inst.id);
      if (ya) ya.v += v; else e.de.push({ id: f.inst.id, n: f.inst.corto || f.inst.nombre, v, fondo: f.inst.tipo !== 'Acción' });
      e.v += v;
      out.set(c, e);
    }
  }
  for (const e of out.values()) { e.pct = (e.v / base) * 100; e.de.sort((a, b) => b.v - a.v); }
  return out;
}
function htmlMapaMundo() {
  if (S.mapaModo == null) S.mapaModo = LS.get('inv-mapa', 'hoy');
  if (!MAPA_MODOS.some(([k]) => k === S.mapaModo)) S.mapaModo = 'hoy';
  const modo = S.mapaModo, tactil = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  // el mapa y los nombres se dibujan después, ya en la página (dependen de lo ancho que salga)
  return `<section class="mapa-w" aria-labelledby="hMapa">
    <div class="mapa-cab"><div class="mapa-tit"><h2 id="hMapa">${L('El mundo', 'The world')}</h2><p>${L('Cada país, del color de su bolsa. Toca uno para verlo.', 'Each country in the color of its stock market. Tap one to see it.')}</p></div>
      <div class="mapa-modos" role="group" aria-label="${L('Qué colorea el mapa', 'What the map shows')}">${MAPA_MODOS.map(([k, es, en]) => `<button type="button" data-mapa-modo="${k}" aria-pressed="${k === modo}">${L(es, en)}</button>`).join('')}</div></div>
    <div class="mapa-cuerpo">
      <div class="mapa-izq">
        <div class="mapa-caja"><div class="mapa-svg" id="mapaMundo"></div><div class="mapa-etqs" id="mapaEtq"></div><div class="mapa-tip" hidden></div>
          <div class="mapa-zoom" role="group" aria-label="${L('Acercar o alejar', 'Zoom')}"><button type="button" data-mapa-zoom="-1" aria-label="${L('Alejar', 'Zoom out')}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10"/></svg></button><button type="button" data-mapa-zoom="1" aria-label="${L('Acercar', 'Zoom in')}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg></button></div>
        </div>
        ${tactil && !LS.get('inv-mapa-gesto', 0) ? `<p class="mapa-pista"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 13l-4 4M3 13.5V17h3.5M13 7l4-4M13.5 3H17v3.5"/></svg>${L('Pellizca o toca dos veces para acercar; de cerca, arrastra para moverte', 'Pinch or double-tap to zoom in; up close, drag to move around')}</p>` : ''}
        <button type="button" class="mapa-elegido" id="mapaElegido" hidden></button>
        <div class="mapa-pie"><div class="mapa-vistas" role="group" aria-label="${L('Ir a', 'Go to')}">${MAPA_VISTAS.map(([k, es, en, esC, enC]) => `<button type="button" data-mapa-vista="${k}" aria-pressed="${k === (S.mapaVista || 'mundo')}"${esC ? ` aria-label="${L(es, en)}"` : ''}>${esC ? `<span class="mv-largo">${L(es, en)}</span><span class="mv-corto" aria-hidden="true">${L(esC, enC)}</span>` : L(es, en)}</button>`).join('')}</div><div class="mapa-ley" id="mapaLey"></div></div>
      </div>
      <div class="mapa-info" id="mapaInfo"></div>
      <p class="sr" id="mapaAnuncio" aria-live="polite"></p>
    </div>
  </section>`;
}
