/* Maqueta de la barra lateral del ordenador (sesión del 10 nov). Se inyecta encima de la app de verdad, ya abierta en
   una página, y rehace solo el <aside class="riel k2">: no toca nada más. montarBarra('A' | 'B' | 'B-abierta' | 'B-fijada' | 'C' | 'actual')
   A · «Índice»: una sola columna con icono y nombre siempre, por grupos; las páginas de la sección abierta, debajo.
   B · «Riel que se abre»: la de iconos de ahora; al pasar el ratón se despliega con los nombres por encima de la página,
       y con la chincheta se queda fijada (empuja la página).
   C · «Riel con rótulos»: la de iconos, con el nombre corto debajo de cada uno y grupos separados; la segunda columna, igual. */
(() => {
  const GRUPOS = [
    { t: 'Tu cartera', s: ['cartera', 'rendimiento', 'riesgo', 'reparto', 'hacienda'] },
    { t: 'Mercados e ideas', s: ['mercados', 'ideas'] },
    { t: 'Lo tuyo', s: ['tuplan', 'herramientas'] },
  ];
  const CORTO = { hoy: 'Hoy', cartera: 'Cartera', rendimiento: 'Rendim.', riesgo: 'Riesgo', reparto: 'Reparto', hacienda: 'Hacienda', mercados: 'Mercados', ideas: 'Ideas', tuplan: 'Tu plan', herramientas: 'Herram.' };
  const ICO_PANEL = SVG('<rect x="3.6" y="4.6" width="16.8" height="14.8" rx="2.6"/><path d="M9.4 4.6v14.8"/>', 1.7);
  const ICO_CHINCHETA = SVG('<path d="M9 3.8h6M10.2 3.8v5.4L7 13.2h10l-3.2-4V3.8M12 13.2v6.8"/>', 1.7);
  const ICO_FLECHA = SVG('<path d="M9 6l6 6-6 6"/>', 1.8);
  const ico = (k) => (k === 'hoy' ? ICO_K2_HOY() : ICO_SEC[k]());
  const sec = (k) => SECCIONES.find((x) => x.k === k);
  const visible = (k) => paginasDe(k).length || PAGINAS.some((p) => p.s === k && verPag(p));
  const marca = `<span class="k2-marca marca-ts" role="img" aria-label="Toisón"><i><svg viewBox="-82 -78 164 147"><path class="s-o" d="${TS_O_D}"/><path class="s-t" d="${TS_T_D}"/></svg></i>${selloDorado()}</span>`;
  const ia = (corta) => `<div class="k2-ia mb-ia${corta ? ' corta' : ''}" id="k2Ia">
      ${corta ? '' : `<div class="k2-ia-cab">${AVATAR_IA}<b>La IA</b></div>`}
      <button type="button" class="riel-ia" data-accion="asesor" aria-expanded="false">${ICONOS_PL.asistente}<span>Pregúntale lo que quieras</span></button>
      ${corta ? '' : '<small>Explica y hace las cuentas con tus números.</small>'}
    </div>`;

  // A · una columna: Hoy arriba, tres grupos con rótulo, y la sección abierta despliega sus páginas
  function htmlA() {
    const act = seccionActual(), pa = paginaActual();
    const fila = (k) => {
      const s = sec(k), ps = paginasDe(k), abierta = k === act;
      const sub = abierta && ps.length > 1 ? `<div class="mb-sub" role="group" aria-label="Páginas de ${s.t}">${ps.map((p) => aPag(p, p.id === pa)).join('')}</div>` : '';
      return `<a class="mb-sec${abierta ? ' abierta' : ''}" href="${hrefSeccion(k)}" data-sec="${k}" aria-current="${abierta ? 'page' : 'false'}">${ico(k)}<span>${s.t}</span>${ps.length > 1 ? `<i class="mb-chev">${ICO_FLECHA}</i>` : ''}</a>${sub}`;
    };
    return `<div class="mb-col riel-nav">
      <div class="mb-cab">${marca}<b>TOISÓN</b>${marcaDorado()}</div>
      <nav class="mb-nav" aria-label="Secciones">
        ${fila('hoy')}
        ${GRUPOS.map((g) => { const ks = g.s.filter(visible); return ks.length ? `<p class="mb-g">${g.t}</p>${ks.map(fila).join('')}` : ''; }).join('')}
      </nav>
      <div class="mb-pie">
        ${htmlSelectorModo(true)}
        ${ia(true)}
        <button type="button" class="mb-aj" data-accion="ajustes">${ICONOS_PL.ajustes}<span>Ajustes</span></button>
      </div>
    </div>`;
  }

  // B · el riel de iconos con un panel de nombres que se abre encima (o se fija) y la segunda columna de siempre
  function htmlB(estado) {
    const act = seccionActual(), pa = paginaActual(), ps = paginasDe(act), s = sec(act);
    const item = (k) => `<a class="mb-sec" href="${hrefSeccion(k)}" data-sec="${k}" aria-current="${k === act ? 'page' : 'false'}" title="${sec(k).t}">${ico(k)}<span>${sec(k).t}</span></a>`;
    const fija = estado === 'fijada', estrecha = fija && innerWidth < 1400;
    return `<div class="mb-riel riel-nav${estado === 'abierta' ? ' desplegada' : ''}${fija ? ' fijada' : ''}">
        <div class="mb-cab">${marca}<b>TOISÓN</b></div>
        <nav class="mb-nav" aria-label="Secciones">
          ${item('hoy')}
          ${GRUPOS.map((g) => { const ks = g.s.filter(visible); return ks.length ? `<p class="mb-g"><span>${g.t}</span></p>${ks.map(item).join('')}` : ''; }).join('')}
        </nav>
        <div class="mb-abajo">
          <button type="button" class="mb-aj" data-accion="ajustes" title="Ajustes">${ICONOS_PL.ajustes}<span>Ajustes</span></button>
          <button type="button" class="mb-aj mb-fijar" aria-pressed="${fija}" title="${fija ? 'Soltar la barra' : 'Fijar la barra abierta'}">${fija ? ICO_PANEL : ICO_CHINCHETA}<span>${fija ? 'Plegar la barra' : 'Fijar abierta'}</span></button>
        </div>
      </div>
      ${estrecha ? '' : `<div class="k2-col">
        <div class="k2-marca-tx" aria-hidden="true"><b>TOISÓN</b>${marcaDorado()}</div>
        <div class="k2-pags"><h2 class="k2-tit">${s.t}</h2>${ps.length ? `<nav class="k2-lista">${ps.map((p) => aPag(p, p.id === pa)).join('')}</nav>` : ''}</div>
        ${htmlSelectorModo(true)}
        ${ia(false)}
      </div>`}`;
  }

  // C · el riel con el nombre corto debajo de cada icono y los grupos separados por un filo
  function htmlC() {
    const act = seccionActual(), pa = paginaActual(), ps = paginasDe(act), s = sec(act);
    const item = (k) => `<a class="mb-sec" href="${hrefSeccion(k)}" data-sec="${k}" aria-current="${k === act ? 'page' : 'false'}" title="${sec(k).t}">${ico(k)}<span>${CORTO[k]}</span></a>`;
    return `<div class="mb-riel riel-nav rotulos">
        <div class="mb-cab">${marca}</div>
        <nav class="mb-nav" aria-label="Secciones">
          ${item('hoy')}
          ${GRUPOS.map((g) => { const ks = g.s.filter(visible); return ks.length ? `<hr class="mb-filo">${ks.map(item).join('')}` : ''; }).join('')}
        </nav>
        <button type="button" class="mb-aj" data-accion="ajustes">${ICONOS_PL.ajustes}<span>Ajustes</span></button>
      </div>
      <div class="k2-col">
        <div class="k2-marca-tx" aria-hidden="true"><b>TOISÓN</b>${marcaDorado()}</div>
        <div class="k2-pags"><h2 class="k2-tit">${s.t}</h2>${ps.length ? `<nav class="k2-lista">${ps.map((p) => aPag(p, p.id === pa)).join('')}</nav>` : ''}</div>
        ${htmlSelectorModo(true)}
        ${ia(false)}
      </div>`;
  }

  // vuelve a dejar la K2 de verdad (antes de cambiar de página, para que pintarK2 la encuentre)
  window.quitarBarra = () => {
    const r = document.querySelector('aside.riel.k2');
    if (r && window.__k2orig) r.innerHTML = window.__k2orig;
    document.body.classList.remove('mb-a', 'mb-b', 'mb-c', 'mb-b-fija', 'mb-b-fija-estrecha');
    document.querySelectorAll('.mb-pest').forEach((x) => x.remove());
  };
  window.montarBarra = (v) => {
    const r = document.querySelector('aside.riel.k2'); if (!r) return 'sin K2';
    if (!window.__k2orig) window.__k2orig = r.innerHTML;
    document.body.classList.remove('mb-a', 'mb-b', 'mb-c', 'mb-b-fija', 'mb-b-fija-estrecha');
    const t = document.getElementById('k2Tirador'); if (t) t.style.display = 'none';
    if (v === 'actual') return 'ok';
    const [l, estado] = v.split('-');
    if (l === 'A') { r.innerHTML = htmlA(); document.body.classList.add('mb-a'); }
    if (l === 'B') {
      r.innerHTML = htmlB(estado === 'abierta' ? 'abierta' : estado === 'fijada' ? 'fijada' : '');
      document.body.classList.add('mb-b');
      if (estado === 'fijada') document.body.classList.add(innerWidth < 1400 ? 'mb-b-fija-estrecha' : 'mb-b-fija');
    }
    if (l === 'C') { r.innerHTML = htmlC(); document.body.classList.add('mb-c'); }
    dispatchEvent(new Event('resize'));
    // B fijada y estrecha: las páginas suben a pestañas encima del título, como con la IA agrandada
    if (v === 'B-fijada' && innerWidth < 1400) setTimeout(() => {
      const v2 = document.getElementById('vista'), h = v2 && v2.querySelector('h1, h2');
      if (h && !v2.querySelector('.mb-pest')) h.insertAdjacentHTML('beforebegin', htmlK2Pest().replace('class="k2-pest"', 'class="k2-pest mb-pest"'));
    }, 400);
    return 'ok';
  };
})();
