async function iniciar() {
  cargarIdioma();
  if (bancoALaApp()) return;
  try { if (window.InversionesApp && typeof InversionesApp.versionVista === 'function') InversionesApp.versionVista(VERSION); } catch (e) {}
  try { if (window.InversionesApp && typeof InversionesApp.idioma === 'function') InversionesApp.idioma(IDIOMA); } catch (e) {}
  // quien llega nuevo ve la presentación general, no la de la 0.2; quien venía de la 0.1, se apunta
  if (!LS.get('inv-version', null)) LS.set('inv-estreno-02b', true);
  else if (cmpVer(LS.get('inv-version'), '0.2.0') < 0 || localStorage.getItem('inv-local-enc') || localStorage.getItem('inv-cache-enc')) LS.set('inv-vino-01', true);
  // en la app de Android, lo primero de todo: ¿hay versión nueva de la app?
  if (window.InversionesApp) setTimeout(() => revisarApp(), 900);
  $('#app').innerHTML = '';
  const t0 = mostrarEntrada();
  try {
    const [, , enc, iaRem] = await Promise.all([cargarInstrumentos(), cargarPrecios().then(() => Promise.all([cargarHistorico(), cargarIntradia(), cargarRadar(), cargarInforme(), escaneoDeCache(), cargarCatalogo()]).then(() => escaneoLuego())), cargarCifrada(), leerAnalisisRemoto()]);
    S.enc = enc; S.iaRemoto = iaRem || S.iaCuenta || null;
    // 0.6: cuándo está todo lo de arrancar (lo mide la prueba de rendimiento)
    try { performance.mark('gf-listo'); } catch (e) {}
  } catch (e) {
    console.error(e);
    quitarEntrada();
    $('#app').innerHTML = `<div class="pantalla"><div class="caja"><h1>No se pudo cargar</h1><p>${esc(e.message)}</p><button class="btn pri" onclick="location.reload()">Reintentar</button></div></div>`;
    return;
  }
  await esperarEntrada(t0);
  await entrar();
  quitarEntrada();
}
/* ---------- la entrada: los trozos de la wF llegan de todas partes y se juntan, sale el nombre letra a letra,
   «Folio» se recoge dentro de la F y sale «IA» (GrowFolio pasa a GrowIA, con su degradado), y vuelve a GrowFolio.
   Sale mientras carga todo; dura lo que la animación (unos 4 s) o hasta que la tocas, y se funde con lo que venga. */
// la entrada: cada pieza del nombre en el mismo lienzo, el trazo de la wF (sus cuatro tramos, de dónde a dónde va el lápiz en
// cada uno, y las dos barras de la F)
// y los degradados de GrowFolio y de GrowIA (x1, y1, x2, y2) para pasar de uno a otro
const ENTRADA = { w: 645.5, h: 128.85, off: 1.8, piezas: { G: 'M54.01 125.85L50.97 125.77L47.99 125.53L43.64 124.87L39.42 123.86L36.68 122.99L34.01 121.95L30.14 120.14L27.68 118.78L25.32 117.29L23.04 115.67L20.86 113.93L17.77 111.08L14.92 107.98L13.17 105.79L11.56 103.5L10.07 101.11L8.7 98.62L6.89 94.71L5.4 90.6L4.27 86.33L3.5 81.9L3.18 78.86L3.02 75.75L3.02 72.59L3.17 69.47L3.69 64.93L4.23 61.99L4.92 59.11L6.24 54.93L7.9 50.91L9.16 48.37L10.55 45.92L12.06 43.58L13.7 41.35L16.4 38.19L19.37 35.28L21.47 33.49L23.66 31.83L25.95 30.3L28.34 28.89L32.1 27.01L34.72 25.92L37.42 24.99L41.59 23.88L44.46 23.33L47.39 22.94L51.93 22.65L55.01 22.64L59.5 22.92L63.79 23.53L66.53 24.12L70.48 25.29L73 26.25L76.59 27.91L79.94 29.8L83.05 31.91L84.99 33.44L87.7 35.91L90.13 38.57L92.23 41.34L93.46 43.26L95.04 46.24L96.29 49.34L77.9 58.2L76.63 55.2L75.01 52.44L73.74 50.72L71.53 48.34L68.97 46.18L66.11 44.36L64.07 43.39L60.79 42.29L58.46 41.81L54.76 41.44L50.98 41.5L47.42 41.95L44.05 42.78L40.87 43.99L37.9 45.58L35.16 47.51L32.7 49.73L30.52 52.23L28.61 55.03L26.99 58.11L25.69 61.44L24.73 64.99L24.11 68.77L23.82 72.78L23.88 76.92L24.3 80.86L25.08 84.58L26.21 88.08L27.7 91.35L29.5 94.37L31.56 97.09L33.9 99.51L36.49 101.64L39.35 103.47L41.37 104.49L44.56 105.7L47.94 106.52L50.31 106.86L54.01 107.06L56.9 106.94L59.71 106.57L63.34 105.72L66.83 104.44L69.28 103.21L72.23 101.23L74.19 99.5L75.95 97.55L77.47 95.39L78.66 93.05L79.5 90.52L80.01 87.81L80.18 84.64L53.47 84.64L53.47 67.19L100.99 67.19L100.99 77.79L100.8 82.88L100.25 87.68L99.32 92.2L98.03 96.42L96.96 99.07L95.75 101.59L94.43 103.99L93 106.27L90.65 109.44L88.93 111.4L87.11 113.23L85.18 114.94L83.18 116.52L81.11 117.98L78.97 119.3L76.77 120.51L74.51 121.58L72.18 122.53L69.79 123.36L64.97 124.65L60.12 125.48L56.46 125.79Z', r: 'M112.4 124.24L112.4 50.95L131.19 50.95L131.19 61.89L131.97 60.13L133.05 58.21L134.91 55.8L137.05 53.93L139.47 52.56L141.19 51.82L142.99 51.22L145.85 50.56L147.87 50.29L149.97 50.16L155.35 50.14L155.35 67.59L148 67.62L146.01 67.8L143.23 68.42L140.71 69.45L139.18 70.37L137.76 71.47L135.88 73.45L134.42 75.77L133.37 78.43L132.74 81.43L132.53 84.77L132.53 124.24Z', o1: 'M199.04 125.82L194.53 125.44L190.2 124.61L187.41 123.8L183.38 122.2L180.79 120.88L177.13 118.58L173.8 115.95L170.81 112.97L168.15 109.66L165.83 106.01L163.96 102.12L162.99 99.4L161.93 95.15L161.5 92.2L161.28 89.15L161.36 84.46L161.69 81.43L162.58 77.09L163.45 74.32L165.15 70.37L166.56 67.86L169 64.35L171.77 61.16L174.87 58.31L178.31 55.8L182.07 53.62L186.04 51.87L188.79 50.96L191.62 50.25L196.01 49.57L199.04 49.36L203.65 49.44L206.63 49.74L210.95 50.58L215.09 51.87L217.74 52.99L220.32 54.3L223.95 56.6L227.26 59.23L230.24 62.19L232.89 65.48L235.21 69.1L237.07 72.98L238.05 75.69L239.1 79.96L239.54 82.93L239.75 86.01L239.67 90.69L239.1 95.15L238.45 98.01L237.07 102.12L235.88 104.74L234.48 107.26L232.04 110.8L230.24 112.97L227.26 115.95L223.95 118.58L220.32 120.88L216.43 122.78L213.73 123.8L209.53 124.94L206.63 125.44L203.65 125.75ZM201.36 107.71L202.88 107.61L205.04 107.26L206.41 106.89L208.36 106.15L209.59 105.53L211.32 104.41L212.88 103.1L214.29 101.6L215.54 99.93L216.62 98.06L217.25 96.73L218 94.63L218.39 93.16L218.78 90.86L218.93 89.25L218.96 86.76L218.87 85.13L218.54 82.79L218 80.58L217.52 79.18L216.95 77.84L215.92 75.94L214.72 74.22L213.37 72.66L211.86 71.28L210.18 70.08L208.98 69.38L207.08 68.54L205.04 67.94L203.61 67.67L202.13 67.51L199.8 67.47L197.55 67.67L196.11 67.94L194.73 68.31L192.76 69.07L191.52 69.72L189.77 70.86L188.18 72.19L186.76 73.68L185.5 75.35L184.41 77.19L183.51 79.18L183.03 80.58L182.65 82.04L182.25 84.33L182.11 85.93L182.07 88.43L182.17 90.06L182.49 92.41L183.03 94.63L183.51 96.04L184.09 97.4L185.12 99.33L186.32 101.07L187.69 102.62L189.22 103.99L190.92 105.18L192.76 106.15L194.06 106.67L195.42 107.09L197.55 107.52L199.04 107.67Z', wp: 'M265.15 50.95L279.42 93.54L295.35 50.95L312.8 50.95L328.61 93.5L351.81 24.24L380.4 3L338.44 124.24L320.99 124.24L304.06 77.25L287.03 124.24L269.58 124.24L244.34 50.95Z', barras: 'M351.8 85.85L358.07 67.73L392.46 67.73L392.46 85.85ZM366.85 42.36L373.12 24.24L414.23 24.24L414.23 42.36Z', o2: 'M444.58 125.82L440.07 125.44L435.74 124.61L431.58 123.31L428.91 122.2L426.32 120.88L422.66 118.58L419.34 115.95L416.34 112.97L413.68 109.66L411.36 106.01L409.50 102.12L408.52 99.4L407.47 95.15L407.04 92.2L406.82 89.15L406.90 84.46L407.47 79.96L408.12 77.09L409.50 72.98L410.69 70.37L412.09 67.86L414.53 64.35L417.30 61.16L420.41 58.31L423.85 55.8L427.61 53.62L431.58 51.87L434.33 50.96L437.16 50.25L441.55 49.57L444.58 49.36L449.19 49.44L452.17 49.74L456.49 50.58L460.63 51.87L463.28 52.99L465.85 54.3L469.49 56.6L472.79 59.23L475.77 62.19L478.43 65.48L480.74 69.1L482.61 72.98L483.58 75.69L484.34 78.51L485.07 82.93L485.29 86.01L485.21 90.69L484.64 95.15L483.99 98.01L482.61 102.12L481.42 104.74L480.01 107.26L477.58 110.8L474.82 114L472.79 115.95L469.49 118.58L465.85 120.88L463.28 122.2L459.27 123.8L456.49 124.61L452.17 125.44L449.19 125.75ZM446.90 107.71L448.42 107.61L450.58 107.26L451.95 106.89L453.90 106.15L455.13 105.53L456.85 104.41L458.42 103.1L459.83 101.6L461.07 99.93L462.16 98.06L462.78 96.73L463.54 94.63L464.08 92.41L464.32 90.86L464.46 89.25L464.50 86.76L464.40 85.13L464.08 82.79L463.54 80.58L463.06 79.18L462.49 77.84L461.45 75.94L460.26 74.22L458.91 72.66L457.39 71.28L455.72 70.08L454.52 69.38L452.61 68.54L450.58 67.94L449.15 67.67L447.66 67.51L445.34 67.47L443.09 67.67L441.65 67.94L440.27 68.31L438.30 69.07L437.06 69.72L435.30 70.86L433.72 72.19L432.29 73.68L431.04 75.35L429.95 77.19L429.32 78.5L428.57 80.58L428.03 82.79L427.79 84.33L427.65 85.93L427.61 88.43L427.71 90.06L428.03 92.41L428.57 94.63L429.05 96.04L429.62 97.4L430.65 99.33L431.86 101.07L433.22 102.62L434.76 103.99L436.46 105.18L438.30 106.15L439.60 106.67L441.65 107.26L443.09 107.52L444.58 107.67Z', l: 'M497.13 124.24L497.13 22.63L517.26 22.63L517.26 124.24Z', i: 'M532.03 50.95L552.16 50.95L552.16 124.24L532.03 124.24ZM532.03 24.24L552.16 24.24L552.16 44.37L532.03 44.37Z', o3: 'M601.76 125.82L597.25 125.44L592.92 124.61L588.76 123.31L586.09 122.2L583.50 120.88L579.84 118.58L576.52 115.95L573.53 112.97L570.86 109.66L568.55 106.01L567.25 103.44L565.70 99.4L564.65 95.15L564.22 92.2L564.00 89.15L564.08 84.46L564.65 79.96L565.30 77.09L566.16 74.32L567.87 70.37L569.28 67.86L571.71 64.35L574.49 61.16L577.59 58.31L581.03 55.8L584.79 53.62L588.76 51.87L591.51 50.96L594.34 50.25L598.73 49.57L601.76 49.36L606.37 49.44L609.35 49.74L613.67 50.58L617.81 51.87L620.46 52.99L623.03 54.3L626.67 56.6L629.97 59.23L632.95 62.19L635.61 65.48L637.93 69.1L639.79 72.98L640.77 75.69L641.52 78.51L642.25 82.93L642.47 86.01L642.39 90.69L642.06 93.69L641.17 98.01L640.31 100.77L638.60 104.74L637.20 107.26L634.76 110.8L632.95 112.97L629.97 115.95L626.67 118.58L623.03 120.88L619.14 122.78L616.45 123.8L613.67 124.61L609.35 125.44L606.37 125.75ZM604.08 107.71L606.33 107.52L607.76 107.26L609.13 106.89L611.08 106.15L612.31 105.53L614.03 104.41L615.60 103.1L617.01 101.6L618.26 99.93L619.34 98.06L620.24 96.04L620.72 94.63L621.26 92.41L621.50 90.86L621.64 89.25L621.68 86.76L621.58 85.13L621.26 82.79L620.92 81.3L620.24 79.18L619.67 77.84L618.64 75.94L617.44 74.22L616.09 72.66L614.57 71.28L612.90 70.08L611.70 69.38L609.80 68.54L607.76 67.94L606.33 67.67L604.85 67.51L602.52 67.47L600.27 67.67L598.83 67.94L597.45 68.31L595.48 69.07L594.24 69.72L592.49 70.86L590.90 72.19L589.47 73.68L588.22 75.35L587.13 77.19L586.23 79.18L585.75 80.58L585.37 82.04L584.97 84.33L584.83 85.93L584.79 88.43L584.89 90.06L585.21 92.41L585.75 94.63L586.23 96.04L586.80 97.4L587.84 99.33L589.04 101.07L590.40 102.62L591.94 103.99L593.64 105.18L595.48 106.15L596.78 106.67L598.13 107.09L600.27 107.52L601.76 107.67Z', I: 'M341.12 124.24L361.93 124.24L396.54 24.24L375.74 24.24Z', A: 'M402.7 24.24L430.35 24.24L464.18 124.24L441.5 124.24L434.78 103.83L398.14 103.83L391.43 124.24L368.88 124.24Z', wf: 'M351.8 85.85L358.07 67.73L392.46 67.73L392.46 85.85ZM295.35 50.95L312.8 50.95L328.61 93.5L351.81 24.24L380.4 3L338.44 124.24L320.99 124.24L304.06 77.25L287.03 124.24L269.58 124.24L244.34 50.95L265.15 50.95L279.42 93.54ZM414.23 24.24L414.23 42.36L366.85 42.36L373.12 24.24Z' }, cajas: { G: [3, 22.6, 101, 125.8], r: [112.4, 50.1, 155.3, 124.2], o1: [161.3, 49.3, 239.8, 125.8], wp: [244.3, 3, 380.4, 124.2], barras: [351.8, 24.2, 414.2, 85.8], o2: [406.8, 49.3, 485.3, 125.8], l: [497.1, 22.6, 517.3, 124.2], i: [532.0, 24.2, 552.2, 124.2], o3: [564.0, 49.3, 642.5, 125.8], I: [341.1, 24.2, 396.5, 124.2], A: [368.9, 24.2, 464.2, 124.2], wf: [244.3, 3, 414.2, 124.2] }, trazo: { piezas: ['M278.3 90.21L278.3 124.24L269.58 124.24L244.34 50.95L265.15 50.95Z', 'M279.42 93.54L295.35 50.95L304.07 50.95L304.07 77.28L287.03 124.24L278.3 124.24L278.3 90.21Z', 'M312.8 50.95L328.61 93.5L329.71 90.21L329.71 124.24L320.99 124.24L304.07 77.28L304.07 50.95Z', 'M342.87 50.95L333.04 80.26L351.81 24.24L380.4 3L338.44 124.24L329.71 124.24L329.71 90.21Z'], tramos: [[254.74, 50.95, 278.3, 124.24], [278.3, 124.24, 304.07, 50.95], [304.07, 50.95, 329.71, 124.24], [329.71, 124.24, 371.68, 3]], margen: 14.56, barras: ['M414.23 42.36L366.85 42.36L366.78 42.36L373.05 24.24L414.23 24.24Z', 'M392.46 85.85L347.62 85.85L347.62 80.26L353.66 80.26L358 67.73L392.46 67.73Z'], punta: [380.4, 3] }, wf: [327, 72.8], gf: [283.83, 124.24, 368.94, 153.7], ia: [236.89, 124.24, 439.86, 194.49], prof: [3, 125.85], mueve: 89.16 };
const PALETA_MARCA = [[0, '#D7A033'], [0.22, '#EDBB45'], [0.42, '#F4CB66'], [0.6, '#F9DE9C'], [0.78, '#FDF0D2'], [1, '#FFFDF6']];
const FIN_ENTRADA = 4250;
const saludoHora = () => { const h = new Date().getHours(); return h >= 6 && h < 14 ? L('Buenos días', 'Good morning') : h >= 14 && h < 21 ? L('Buenas tardes', 'Good afternoon') : L('Buenas noches', 'Good evening'); };
function svgEntrada() {
  const E = ENTRADA, Z = E.trazo, [a, b, c, d] = E.gf;
  // cada pieza con su relieve: el filo claro arriba y, encima, el degradado algo bajado y recortado a la pieza
  const pz = (k) => `<g class="enz" data-k="${k}"><use href="#ens-${k}" fill="#FFF6DA"/><g clip-path="url(#enc-${k})"><g transform="translate(0 ${E.off})"><use href="#ens-${k}" fill="url(#eng)"/><use href="#ens-${k}" fill="url(#enp)"/></g></g></g>`;
  const formas = Object.entries(E.piezas).map(([k, t]) => `<path id="ens-${k}" d="${t}"/><clipPath id="enc-${k}"><use href="#ens-${k}"/></clipPath>`).join('');
  const recorte = (id, ks) => `<clipPath id="${id}">${ks.map((k) => `<use href="#ens-${k}"/>`).join('')}</clipPath>`;
  const luz = (id) => `<g clip-path="url(#${id})"><polygon class="en-luz" points="-64,${E.h} -26,${E.h} ${(-26 + 0.346 * E.h).toFixed(1)},0 ${(-64 + 0.346 * E.h).toFixed(1)},0" fill="url(#enb)" opacity="0"/></g>`;
  return `<svg class="en-nombre" viewBox="0 0 ${E.w} ${E.h}" aria-hidden="true"><defs>`
    + `<linearGradient id="eng" gradientUnits="userSpaceOnUse" x1="${a}" y1="${b}" x2="${c}" y2="${d}">${PALETA_MARCA.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join('')}</linearGradient>`
    + `<linearGradient id="enp" gradientUnits="userSpaceOnUse" x1="0" y1="${E.prof[0]}" x2="0" y2="${E.prof[1]}"><stop offset="0.55" stop-color="#8A5200" stop-opacity="0"/><stop offset="1" stop-color="#8A5200" stop-opacity="0.16"/></linearGradient>`
    + `<linearGradient id="enb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.75"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`
    + '<radialGradient id="enl"><stop offset="0" stop-color="#FFFBEF"/><stop offset="0.3" stop-color="#F9DE9C" stop-opacity="0.75"/><stop offset="1" stop-color="#EDBB45" stop-opacity="0"/></radialGradient>'
    + `<clipPath id="ent-c">${Z.tramos.map(() => '<polygon points="0,0 0,0 0,0"/>').join('')}</clipPath>`
    + formas + recorte('encgf', ['G', 'r', 'o1', 'wp', 'barras', 'o2', 'l', 'i', 'o3']) + recorte('encia', ['G', 'r', 'o1', 'wp', 'I', 'A']) + '</defs>'
    + '<g class="en-todo">' + ['G', 'r', 'o1', 'o2', 'l', 'i', 'o3', 'I', 'A'].map(pz).join('')
    + `<g class="en-wf"><g class="en-trazo"><path d="${E.piezas.wp}" fill="url(#eng)" clip-path="url(#ent-c)"/>${Z.barras.map((t) => `<path class="en-bf" d="${t}" fill="url(#eng)"/>`).join('')}</g>`
    + `<g class="en-solida">${pz('wf')}${pz('wp')}${pz('barras')}</g><circle class="en-lapiz" r="13" fill="url(#enl)" opacity="0"/></g>`
    + luz('encgf') + luz('encia') + '</g></svg>';
}
// pinta la entrada en el instante t (ms desde que empieza); con t = Infinity queda GrowFolio quieto
function pintaEntrada(svg, t) {
  const E = ENTRADA, Z = E.trazo, D = 300;   // D: lo que va después del dibujo de la wF
  const cl = (x) => Math.min(1, Math.max(0, x)), tr = (a, b) => cl((t - a) / (b - a));
  const eo = (x) => 1 - Math.pow(1 - x, 3), eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const rebote = (x) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
  const q = (k) => svg.querySelector(`.enz[data-k="${k}"]`);
  const cx = (k) => (E.cajas[k][0] + E.cajas[k][2]) / 2, cy = (k) => (E.cajas[k][1] + E.cajas[k][3]) / 2;
  const pon = (n, x, y, s = 1, op = 1, ox = 0, oy = 0, rot = 0, sy = s) => {
    n.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(1)} ${ox} ${oy}) translate(${ox} ${oy}) scale(${s.toFixed(3)} ${sy.toFixed(3)}) translate(${-ox} ${-oy})`);
    n.style.opacity = cl(op).toFixed(3);
  };
  // 1. la wF se dibuja de un trazo, como una gráfica: baja, sube, baja y sube del todo hasta la punta. Cada tramo se
  //    descubre detrás del lápiz (un corte perpendicular que avanza) y el lápiz lleva una luz. La w con el palo es un solo
  //    trazado y cada tramo es una franja vertical de su recorte (que se pisan un poco): así no se ven costuras
  const lon = Z.tramos.map(([ax, ay, bx, by]) => Math.hypot(bx - ax, by - ay) + 2 * Z.margen);
  const cortes = [-1e4, Z.tramos[0][2], Z.tramos[1][2], Z.tramos[2][2], 1e4];
  const corta = (pts, x0, lado) => {
    const out = [];
    pts.forEach((A, i) => {
      const B = pts[(i + 1) % pts.length], da = (A[0] - x0) * lado, db = (B[0] - x0) * lado;
      if (da >= 0) out.push(A);
      if ((da >= 0) !== (db >= 0)) { const f = da / (da - db); out.push([A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f]); }
    });
    return out;
  };
  const recortes = svg.querySelectorAll('#ent-c polygon');
  let dist = eio(tr(120, 1000)) * lon.reduce((s2, x) => s2 + x, 0), lapiz = null;
  Z.tramos.forEach(([ax, ay, bx, by], k) => {
    const largo = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / largo, uy = (by - ay) / largo, m = Z.margen;
    const av = Math.min(Math.max(dist, 0), lon[k]) - m;
    if (!lapiz && dist > 0 && dist < lon[k]) lapiz = [ax + ux * Math.min(Math.max(av, 0), largo), ay + uy * Math.min(Math.max(av, 0), largo)];
    dist -= lon[k];
    const px = ax + ux * av, py = ay + uy * av, W = 400, atras = ax - ux * 400, atrasy = ay - uy * 400;
    const pts = corta(corta([[px - uy * W, py + ux * W], [px + uy * W, py - ux * W], [atras + uy * W, atrasy - ux * W], [atras - uy * W, atrasy + ux * W]], cortes[k] - 0.6, 1), cortes[k + 1] + 0.6, -1);
    recortes[k].setAttribute('points', pts.length > 2 ? pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ') : '0,0 0,0 0,0');
  });
  // la luz del lápiz y, al llegar a la punta, un destello
  const lz = svg.querySelector('.en-lapiz');
  if (t < 1000 && lapiz) { lz.setAttribute('cx', lapiz[0].toFixed(1)); lz.setAttribute('cy', lapiz[1].toFixed(1)); lz.setAttribute('r', '13'); lz.setAttribute('opacity', tr(100, 240).toFixed(3)); }
  else { const f = tr(1000, 1340); lz.setAttribute('cx', Z.punta[0]); lz.setAttribute('cy', Z.punta[1]); lz.setAttribute('r', (13 + 34 * eo(f)).toFixed(1)); lz.setAttribute('opacity', (t < 1000 ? 0 : 1 - f).toFixed(3)); }
  // 2. llegan las barras de la F desde la derecha, una detrás de otra, y encajan
  svg.querySelectorAll('.en-bf').forEach((n, k) => { const e = tr(880 + k * 100, 880 + k * 100 + 420); pon(n, 46 * (1 - rebote(e)), 0, 1, e * 2.5); });
  // 3. queda con su relieve y da un pequeño latido; luego baja a su sitio en el nombre y salen «Gro» y «olio»
  const junta = tr(1250, 1420), late = Math.sin(Math.PI * tr(1180, 1480));
  svg.querySelector('.en-trazo').style.opacity = (1 - junta).toFixed(3);
  svg.querySelector('.en-solida').style.opacity = junta.toFixed(3);
  const [wx, wy] = E.wf, S0 = 1.85, p = 1 - eio(tr(1080 + D, 1640 + D));
  pon(svg.querySelector('.en-wf'), (E.w / 2 - wx) * p, (E.h / 2 - wy) * p, (1 + (S0 - 1) * p) * (1 + 0.035 * late), 1, wx, wy);
  ['o1', 'r', 'G'].forEach((k, j) => { const e = eo(tr(1500 + D + j * 80, 1500 + D + j * 80 + 520)); pon(q(k), 70 * (1 - e), 0, 0.85 + 0.15 * e, e, cx(k), cy(k)); });
  // 4. «olio» y las barras de la F se recogen, sale «IA» del palo y todo se recoloca; 5. y vuelta a GrowFolio
  ['o2', 'l', 'i', 'o3'].forEach((k, j) => {
    const sale = eo(tr(1520 + D + j * 80, 1520 + D + j * 80 + 520)), va = eio(tr(2330 + D + (3 - j) * 55, 2330 + D + (3 - j) * 55 + 400)), vuelve = eo(tr(3380 + D + j * 70, 3380 + D + j * 70 + 480));
    const antes = t < 2330 + D, fuera = antes ? 0 : t < 3380 + D ? va : 1 - vuelve;
    pon(q(k), antes ? -70 * (1 - sale) : -80 * fuera, 0, antes ? 0.85 + 0.15 * sale : 1 - 0.3 * fuera, antes ? sale : 1 - fuera, cx(k), cy(k));
  });
  const br = E.cajas.barras, recoge = eio(tr(2480 + D, 2780 + D)) * (1 - eo(tr(3300 + D, 3620 + D)));
  q('barras').setAttribute('transform', `translate(${br[0]} 0) scale(${(1 - recoge).toFixed(3)} 1) translate(${-br[0]} 0)`);
  q('barras').style.opacity = (1 - recoge).toFixed(3);
  // quieta, la wF va de una pieza (sin la costura del palo con las barras); separada solo mientras las barras se recogen
  const separada = recoge > 0;
  q('wf').style.display = separada ? 'none' : ''; q('wp').style.display = q('barras').style.display = separada ? '' : 'none';
  ['I', 'A'].forEach((k, j) => {
    const entra = tr(2560 + D + j * 110, 2560 + D + j * 110 + 480), sale = eio(tr(3180 + D + (1 - j) * 70, 3180 + D + (1 - j) * 70 + 360));
    const v = t < 3180 + D ? rebote(entra) : 1 - sale;
    pon(q(k), -60 * (1 - v), 0, 0.9 + 0.1 * v, t < 3180 + D ? cl(entra * 1.6) : 1 - sale, cx(k), cy(k));
  });
  const ia = eio(tr(2380 + D, 2900 + D)) * (1 - eio(tr(3260 + D, 3780 + D)));
  const g = svg.querySelector('#eng');
  ['x1', 'y1', 'x2', 'y2'].forEach((a, k) => g.setAttribute(a, (E.gf[k] + (E.ia[k] - E.gf[k]) * ia).toFixed(2)));
  svg.querySelector('.en-todo').setAttribute('transform', `translate(${(E.mueve * ia).toFixed(2)} 0)`);
  // un brillo que cruza GrowFolio recién montado y otro por GrowIA; la luz de detrás late al encajar y sube con GrowIA
  const luces = svg.querySelectorAll('.en-luz');
  [[luces[0], 1900 + D, 2380 + D], [luces[1], 2880 + D, 3320 + D]].forEach(([n, a, b]) => { const e = tr(a, b); n.setAttribute('transform', `translate(${(e * (E.w + 120)).toFixed(1)} 0)`); n.setAttribute('opacity', e > 0 && e < 1 ? '1' : '0'); });
  svg.closest('.entrada').style.setProperty('--en-luz', Math.max(ia, 0.7 * late).toFixed(3));
}
function mostrarEntrada() {
  const quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const n = nombreUsuario();
  const d = document.createElement('div');
  d.className = 'entrada' + (quieto ? ' quieta' : ''); d.id = 'entrada'; d.setAttribute('role', 'status'); d.setAttribute('aria-label', 'GrowFolio');
  d.innerHTML = `<div class="en-c">${svgEntrada()}<p class="en-saludo">${esc(saludoHora())}${n ? `, <b>${esc(n)}</b>` : ''}</p><div class="en-barra" aria-hidden="true"><i></i></div></div>`;
  document.body.appendChild(d);
  const svg = $('.en-nombre', d), t0 = { t: performance.now(), min: quieto ? 0 : FIN_ENTRADA, saltar: null };
  let fin = quieto;
  const paso = () => {
    if (fin || !d.isConnected) return;
    const t = performance.now() - t0.t;
    pintaEntrada(svg, t);
    if (t < FIN_ENTRADA) requestAnimationFrame(paso); else fin = true;
  };
  pintaEntrada(svg, quieto ? Infinity : 0);
  if (!quieto) requestAnimationFrame(paso);
  // tocarla la salta: queda GrowFolio quieto y entra en cuanto haya cargado
  d.addEventListener('click', () => { if (fin) return; fin = true; pintaEntrada(svg, Infinity); t0.min = 0; if (t0.saltar) t0.saltar(); });
  return t0;
}
const esperarEntrada = (t0) => new Promise((r) => { t0.saltar = r; setTimeout(r, Math.max(0, t0.min - (performance.now() - t0.t))); });
function quitarEntrada() {
  const d = $('#entrada'); if (!d || d.classList.contains('fuera')) return;
  d.classList.add('fuera'); setTimeout(() => d.remove(), 650);
}
/* después de cargar: la cuenta (si toca), crear la cartera o abrirla con la clave guardada */
async function entrar() {
  if (PERFIL_CUENTA && !FB.user && !S.cuentaSinRed) {
    const visto = LS.get('inv-version', null);
    if (visto && !LS.get('inv-estreno-02b')) return estreno02(visto, () => pantallaCuenta());
    // la primera vez en este dispositivo, la presentación antes de entrar
    if (!LS.get('inv-intro2', false)) return pantallaIntro(() => pantallaCuenta());
    return pantallaCuenta();
  }
  // la primera vez en este dispositivo, antes de crear la cartera o entrar, la presentación
  // la presentación nueva (0.2.1, la que se cuenta bajando): una vez a todos, también a quien ya vio la de antes
  const intro = !LS.get('inv-intro2', false);
  // no se pudo leer la cuenta y aquí no hay copia: nunca se da por vacía
  if (!S.enc && PERFIL_CUENTA && (S.cuentaSinRed || !S.cuentaLeida)) return pantallaSinCuenta();
  if (!S.enc && PERFIL_CUENTA) { S.cuentaNueva = true; return intro ? pantallaIntro(bienvenidaCuenta) : bienvenidaCuenta(); }
  if (!S.enc) return intro ? pantallaIntro(pantallaCrear) : pantallaCrear();
  try {
    const r = await claveRecordada(S.enc.texto, await IDB.get(IDB_CLAVE));
    if (r) {
      r.cartera = await descifrar(S.enc.texto, r.key);
      if (r.adoptada) { await recifrarLocales(r.kek, r.key); fijarSesion(r); await recordarClave(); } else fijarSesion(r);
      // con PIN o huella puestos, una vez cada 72 h los pide antes de enseñar nada
      const seguir = () => (necesitaBloqueo() ? pantallaBloqueo(arrancar, () => { S.cartera = null; S.key = null; pantallaDesbloqueo(); }) : arrancar());
      // también a quien ya entra solo: la presentación, una vez en cada dispositivo
      return intro ? pantallaIntro(seguir) : seguir();
    }
  } catch (e) { console.warn('La clave guardada no sirve', e); }
  if (intro) pantallaIntro(() => pantallaDesbloqueo()); else pantallaDesbloqueo();
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'inv-actualizada') avisoWebNueva();
    // al tocar un aviso con GrowFolio ya abierto: a lo que dice, sin recargar
    if (e.data && e.data.type === 'inv-ir' && /^#[a-z]+$/.test(e.data.hash || '')) location.hash = e.data.hash;
  });
}
/* 0.3.11d: el proyecto pasa de llamarse Inversiones a GrowFolio (también la dirección: charly10sf.github.io/GrowFolio/).
   Desde la dirección vieja, en cuanto la nueva existe, se salta a ella con lo mismo detrás (#cartera…). Tus datos del
   navegador siguen ahí: es el mismo sitio. La copia guardada de la vieja se borra para que no se quede anclada. Dentro
   de la app de Android no: la app nueva cambia sola y la de antes no sabe abrir la dirección nueva (hay que actualizarla) */
(async () => {
  try {
    if (!/\.github\.io$/.test(location.hostname) || !/^\/inversiones(\/|$)/i.test(location.pathname)) return;
    const r = await fetch('/GrowFolio/version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    if (window.InversionesApp) {
      if (typeof window.InversionesApp.repo !== 'function') setTimeout(() => toast(L('GrowFolio ha cambiado de dirección: actualiza la app de Android (Ajustes > App de Android) para seguir al día.', 'GrowFolio has moved: update the Android app (Settings > Android app) to stay up to date.'), 9000), 2500);
      return;
    }
    if (navigator.serviceWorker) for (const rg of await navigator.serviceWorker.getRegistrations()) if (/\/inversiones\//i.test(rg.scope)) await rg.unregister();
    location.replace('/GrowFolio/' + location.search + location.hash);
  } catch (e) { /* sin red: a la próxima */ }
})();
iniciar();
/* cuántas visitas tiene GrowFolio (el número, el país y si es móvil u ordenador): Cloudflare Web Analytics, sin cookies y sin
   nada tuyo ni de tu cartera. Solo en la web publicada (las pruebas no cuentan) y cuando el enlace ya no lleva el token */
if (location.hostname === 'charly10sf.github.io' && !/[#&]t=/.test(location.hash)) {
  setTimeout(() => {
    try {
      const sc = document.createElement('script');
      sc.defer = true; sc.src = 'https://static.cloudflareinsights.com/beacon.min.js';
      sc.setAttribute('data-cf-beacon', '{"token": "5bd37d4ab757416a8dfbf5a56f505c23"}');
      document.body.appendChild(sc);
    } catch (e) { /* sin estadística: no pasa nada */ }
  }, 1500);
}
