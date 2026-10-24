/* =====================================================================
   Pintado
   Todo número que cambia en directo va en un <span data-b="clave">: al llegar un precio
   se recalcula la cartera y solo se tocan esos textos (y destellan si suben o bajan).
   ===================================================================== */
/* La marca, sacada de las letras de Plus Jakarta Sans (el trazo final de la w sube y es el palo de la F): la wF en un
   lienzo de 48 (con __K__ donde van los ids), sus piezas, el nombre letra a letra y la wIA de GrowIA en 24 */
const MARCA_WF = '<defs><linearGradient id="__K__d" gradientUnits="userSpaceOnUse" x1="14.9" y1="36.43" x2="31.94" y2="42.33"><stop offset="0" stop-color="#D7A033"/><stop offset="0.22" stop-color="#EDBB45"/><stop offset="0.42" stop-color="#F4CB66"/><stop offset="0.6" stop-color="#F9DE9C"/><stop offset="0.78" stop-color="#FDF0D2"/><stop offset="1" stop-color="#FFFDF6"/></linearGradient><linearGradient id="__K__p" gradientUnits="userSpaceOnUse" x1="0" y1="12.17" x2="0" y2="36.75"><stop offset="0.55" stop-color="#8A5200" stop-opacity="0"/><stop offset="1" stop-color="#8A5200" stop-opacity="0.16"/></linearGradient><path id="__K__s" d="M14.02 30.29L17.21 21.76L20.7 21.76L23.86 30.28L28.51 16.42L34.23 12.17L31.77 19.27L32.76 16.42L41 16.42L41 20.05L31.5 20.05L28.88 27.63L29.75 25.12L36.64 25.12L36.64 28.75L28.49 28.75L25.83 36.43L22.34 36.43L18.95 27.03L15.54 36.43L12.05 36.43L7 21.76L11.16 21.76Z"/><clipPath id="__K__c"><use href="#__K__s"/></clipPath></defs><use href="#__K__s" fill="#FFF6DA"/><g clip-path="url(#__K__c)"><g transform="translate(0 0.36)"><use href="#__K__s" fill="url(#__K__d)"/><use href="#__K__s" fill="url(#__K__p)"/></g></g>';
const MARCA_PIEZAS = { w: 'M7 21.76L11.16 21.76L14.02 30.29L17.21 21.76L20.7 21.76L23.86 30.28L26.72 21.76L24.75 27.63L28.88 27.63L25.83 36.43L22.34 36.43L18.95 27.03L15.54 36.43L12.05 36.43Z', palo: 'M24.75 27.63L28.88 27.63L34.23 12.17L28.51 16.42Z', barras: 'M36.64 28.75L27.67 28.75L27.67 27.63L28.88 27.63L29.75 25.12L36.64 25.12ZM41 20.05L31.52 20.05L31.5 20.05L32.76 16.42L41 16.42Z' };
const MARCA_GRAD = '<linearGradient id="__K__g" gradientUnits="userSpaceOnUse" x1="14.9" y1="36.43" x2="31.94" y2="42.33"><stop offset="0" stop-color="#D7A033"/><stop offset="0.22" stop-color="#EDBB45"/><stop offset="0.42" stop-color="#F4CB66"/><stop offset="0.6" stop-color="#F9DE9C"/><stop offset="0.78" stop-color="#FDF0D2"/><stop offset="1" stop-color="#FFFDF6"/></linearGradient>';
const NOMBRE_GF = { w: 645.5, h: 128.85, defs: '<linearGradient id="__K__d" gradientUnits="userSpaceOnUse" x1="283.83" y1="124.24" x2="368.94" y2="153.7"><stop offset="0" stop-color="#D7A033"/><stop offset="0.22" stop-color="#EDBB45"/><stop offset="0.42" stop-color="#F4CB66"/><stop offset="0.6" stop-color="#F9DE9C"/><stop offset="0.78" stop-color="#FDF0D2"/><stop offset="1" stop-color="#FFFDF6"/></linearGradient><linearGradient id="__K__p" gradientUnits="userSpaceOnUse" x1="0" y1="3" x2="0" y2="125.85"><stop offset="0.55" stop-color="#8A5200" stop-opacity="0"/><stop offset="1" stop-color="#8A5200" stop-opacity="0.16"/></linearGradient>', off: 1.8, letras: [['M54.01 125.85L50.97 125.77L47.99 125.53L43.64 124.87L39.42 123.86L36.68 122.99L34.01 121.95L30.14 120.14L27.68 118.78L25.32 117.29L23.04 115.67L20.86 113.93L17.77 111.08L14.92 107.98L13.17 105.79L11.56 103.5L10.07 101.11L8.7 98.62L6.89 94.71L5.4 90.6L4.27 86.33L3.5 81.9L3.18 78.86L3.02 75.75L3.02 72.59L3.17 69.47L3.69 64.93L4.23 61.99L4.92 59.11L6.24 54.93L7.9 50.91L9.16 48.37L10.55 45.92L12.06 43.58L13.7 41.35L16.4 38.19L19.37 35.28L21.47 33.49L23.66 31.83L25.95 30.3L28.34 28.89L32.1 27.01L34.72 25.92L37.42 24.99L41.59 23.88L44.46 23.33L47.39 22.94L51.93 22.65L55.01 22.64L59.5 22.92L63.79 23.53L66.53 24.12L70.48 25.29L73 26.25L76.59 27.91L79.94 29.8L83.05 31.91L84.99 33.44L87.7 35.91L90.13 38.57L92.23 41.34L93.46 43.26L95.04 46.24L96.29 49.34L77.9 58.2L76.63 55.2L75.01 52.44L73.74 50.72L71.53 48.34L68.97 46.18L66.11 44.36L64.07 43.39L60.79 42.29L58.46 41.81L54.76 41.44L50.98 41.5L47.42 41.95L44.05 42.78L40.87 43.99L37.9 45.58L35.16 47.51L32.7 49.73L30.52 52.23L28.61 55.03L26.99 58.11L25.69 61.44L24.73 64.99L24.11 68.77L23.82 72.78L23.88 76.92L24.3 80.86L25.08 84.58L26.21 88.08L27.7 91.35L29.5 94.37L31.56 97.09L33.9 99.51L36.49 101.64L39.35 103.47L41.37 104.49L44.56 105.7L47.94 106.52L50.31 106.86L54.01 107.06L56.9 106.94L59.71 106.57L63.34 105.72L66.83 104.44L69.28 103.21L72.23 101.23L74.19 99.5L75.95 97.55L77.47 95.39L78.66 93.05L79.5 90.52L80.01 87.81L80.18 84.64L53.47 84.64L53.47 67.19L100.99 67.19L100.99 77.79L100.8 82.88L100.25 87.68L99.32 92.2L98.03 96.42L96.96 99.07L95.75 101.59L94.43 103.99L93 106.27L90.65 109.44L88.93 111.4L87.11 113.23L85.18 114.94L83.18 116.52L81.11 117.98L78.97 119.3L76.77 120.51L74.51 121.58L72.18 122.53L69.79 123.36L64.97 124.65L60.12 125.48L56.46 125.79Z', 2.4, 22.03, 99.19, 104.42], ['M112.4 124.24L112.4 50.95L131.19 50.95L131.19 61.89L131.97 60.13L133.05 58.21L134.91 55.8L137.05 53.93L139.47 52.56L141.19 51.82L142.99 51.22L145.85 50.56L147.87 50.29L149.97 50.16L155.35 50.14L155.35 67.59L148 67.62L146.01 67.8L143.23 68.42L140.71 69.45L139.18 70.37L137.76 71.47L135.88 73.45L134.42 75.77L133.37 78.43L132.74 81.43L132.53 84.77L132.53 124.24Z', 111.8, 49.54, 44.15, 75.29], ['M199.04 125.82L194.53 125.44L190.2 124.61L187.41 123.8L183.38 122.2L180.79 120.88L177.13 118.58L173.8 115.95L170.81 112.97L168.15 109.66L165.83 106.01L163.96 102.12L162.99 99.4L161.93 95.15L161.5 92.2L161.28 89.15L161.36 84.46L161.69 81.43L162.58 77.09L163.45 74.32L165.15 70.37L166.56 67.86L169 64.35L171.77 61.16L174.87 58.31L178.31 55.8L182.07 53.62L186.04 51.87L188.79 50.96L191.62 50.25L196.01 49.57L199.04 49.36L203.65 49.44L206.63 49.74L210.95 50.58L215.09 51.87L217.74 52.99L220.32 54.3L223.95 56.6L227.26 59.23L230.24 62.19L232.89 65.48L235.21 69.1L237.07 72.98L238.05 75.69L239.1 79.96L239.54 82.93L239.75 86.01L239.67 90.69L239.1 95.15L238.45 98.01L237.07 102.12L235.88 104.74L234.48 107.26L232.04 110.8L230.24 112.97L227.26 115.95L223.95 118.58L220.32 120.88L216.43 122.78L213.73 123.8L209.53 124.94L206.63 125.44L203.65 125.75ZM201.36 107.71L202.88 107.61L205.04 107.26L206.41 106.89L208.36 106.15L209.59 105.53L211.32 104.41L212.88 103.1L214.29 101.6L215.54 99.93L216.62 98.06L217.25 96.73L218 94.63L218.39 93.16L218.78 90.86L218.93 89.25L218.96 86.76L218.87 85.13L218.54 82.79L218 80.58L217.52 79.18L216.95 77.84L215.92 75.94L214.72 74.22L213.37 72.66L211.86 71.28L210.18 70.08L208.98 69.38L207.08 68.54L205.04 67.94L203.61 67.67L202.13 67.51L199.8 67.47L197.55 67.67L196.11 67.94L194.73 68.31L192.76 69.07L191.52 69.72L189.77 70.86L188.18 72.19L186.76 73.68L185.5 75.35L184.41 77.19L183.51 79.18L183.03 80.58L182.65 82.04L182.25 84.33L182.11 85.93L182.07 88.43L182.17 90.06L182.49 92.41L183.03 94.63L183.51 96.04L184.09 97.4L185.12 99.33L186.32 101.07L187.69 102.62L189.22 103.99L190.92 105.18L192.76 106.15L194.06 106.67L195.42 107.09L197.55 107.52L199.04 107.67Z', 160.66, 48.74, 79.72, 77.71], ['M279.42 93.54L295.35 50.95L312.8 50.95L328.61 93.5L351.81 24.24L380.4 3L368.11 38.5L373.05 24.24L414.23 24.24L414.23 42.36L366.78 42.36L353.66 80.26L358 67.73L392.46 67.73L392.46 85.85L351.72 85.85L338.44 124.24L320.99 124.24L304.06 77.25L287.03 124.24L269.58 124.24L244.34 50.95L265.15 50.95Z', 243.74, 2.4, 171.09, 122.44], ['M444.58 125.82L440.07 125.44L435.74 124.61L431.58 123.31L428.91 122.2L426.32 120.88L422.66 118.58L419.34 115.95L416.34 112.97L413.68 109.66L411.36 106.01L409.50 102.12L408.52 99.4L407.47 95.15L407.04 92.2L406.82 89.15L406.90 84.46L407.47 79.96L408.12 77.09L409.50 72.98L410.69 70.37L412.09 67.86L414.53 64.35L417.30 61.16L420.41 58.31L423.85 55.8L427.61 53.62L431.58 51.87L434.33 50.96L437.16 50.25L441.55 49.57L444.58 49.36L449.19 49.44L452.17 49.74L456.49 50.58L460.63 51.87L463.28 52.99L465.85 54.3L469.49 56.6L472.79 59.23L475.77 62.19L478.43 65.48L480.74 69.1L482.61 72.98L483.58 75.69L484.34 78.51L485.07 82.93L485.29 86.01L485.21 90.69L484.64 95.15L483.99 98.01L482.61 102.12L481.42 104.74L480.01 107.26L477.58 110.8L474.82 114L472.79 115.95L469.49 118.58L465.85 120.88L463.28 122.2L459.27 123.8L456.49 124.61L452.17 125.44L449.19 125.75ZM446.90 107.71L448.42 107.61L450.58 107.26L451.95 106.89L453.90 106.15L455.13 105.53L456.85 104.41L458.42 103.1L459.83 101.6L461.07 99.93L462.16 98.06L462.78 96.73L463.54 94.63L464.08 92.41L464.32 90.86L464.46 89.25L464.50 86.76L464.40 85.13L464.08 82.79L463.54 80.58L463.06 79.18L462.49 77.84L461.45 75.94L460.26 74.22L458.91 72.66L457.39 71.28L455.72 70.08L454.52 69.38L452.61 68.54L450.58 67.94L449.15 67.67L447.66 67.51L445.34 67.47L443.09 67.67L441.65 67.94L440.27 68.31L438.30 69.07L437.06 69.72L435.30 70.86L433.72 72.19L432.29 73.68L431.04 75.35L429.95 77.19L429.32 78.5L428.57 80.58L428.03 82.79L427.79 84.33L427.65 85.93L427.61 88.43L427.71 90.06L428.03 92.41L428.57 94.63L429.05 96.04L429.62 97.4L430.65 99.33L431.86 101.07L433.22 102.62L434.76 103.99L436.46 105.18L438.30 106.15L439.60 106.67L441.65 107.26L443.09 107.52L444.58 107.67Z', 406.19, 48.74, 79.72, 77.71], ['M497.13 124.24L497.13 22.63L517.26 22.63L517.26 124.24Z', 496.53, 22.03, 21.33, 102.81], ['M532.03 50.95L552.16 50.95L552.16 124.24L532.03 124.24ZM532.03 24.24L552.16 24.24L552.16 44.37L532.03 44.37Z', 531.43, 23.64, 21.33, 101.2], ['M601.76 125.82L597.25 125.44L592.92 124.61L588.76 123.31L586.09 122.2L583.50 120.88L579.84 118.58L576.52 115.95L573.53 112.97L570.86 109.66L568.55 106.01L567.25 103.44L565.70 99.4L564.65 95.15L564.22 92.2L564.00 89.15L564.08 84.46L564.65 79.96L565.30 77.09L566.16 74.32L567.87 70.37L569.28 67.86L571.71 64.35L574.49 61.16L577.59 58.31L581.03 55.8L584.79 53.62L588.76 51.87L591.51 50.96L594.34 50.25L598.73 49.57L601.76 49.36L606.37 49.44L609.35 49.74L613.67 50.58L617.81 51.87L620.46 52.99L623.03 54.3L626.67 56.6L629.97 59.23L632.95 62.19L635.61 65.48L637.93 69.1L639.79 72.98L640.77 75.69L641.52 78.51L642.25 82.93L642.47 86.01L642.39 90.69L642.06 93.69L641.17 98.01L640.31 100.77L638.60 104.74L637.20 107.26L634.76 110.8L632.95 112.97L629.97 115.95L626.67 118.58L623.03 120.88L619.14 122.78L616.45 123.8L613.67 124.61L609.35 125.44L606.37 125.75ZM604.08 107.71L606.33 107.52L607.76 107.26L609.13 106.89L611.08 106.15L612.31 105.53L614.03 104.41L615.60 103.1L617.01 101.6L618.26 99.93L619.34 98.06L620.24 96.04L620.72 94.63L621.26 92.41L621.50 90.86L621.64 89.25L621.68 86.76L621.58 85.13L621.26 82.79L620.92 81.3L620.24 79.18L619.67 77.84L618.64 75.94L617.44 74.22L616.09 72.66L614.57 71.28L612.90 70.08L611.70 69.38L609.80 68.54L607.76 67.94L606.33 67.67L604.85 67.51L602.52 67.47L600.27 67.67L598.83 67.94L597.45 68.31L595.48 69.07L594.24 69.72L592.49 70.86L590.90 72.19L589.47 73.68L588.22 75.35L587.13 77.19L586.23 79.18L585.75 80.58L585.37 82.04L584.97 84.33L584.83 85.93L584.79 88.43L584.89 90.06L585.21 92.41L585.75 94.63L586.23 96.04L586.80 97.4L587.84 99.33L589.04 101.07L590.40 102.62L591.94 103.99L593.64 105.18L595.48 106.15L596.78 106.67L598.13 107.09L600.27 107.52L601.76 107.67Z', 563.37, 48.74, 79.72, 77.71]] };
const MARCA_IA = { d: 'M2.47 15.81L4.5 10.39L6.72 10.39L8.73 15.81L11.69 6.98L15.33 4.28L9.98 19.72L7.76 19.72L5.61 13.74L3.44 19.72L1.21 19.72L-2 10.39L0.65 10.39ZM17.39 6.98L12.98 19.72L10.33 19.72L14.74 6.98ZM26 19.72L23.11 19.72L22.26 17.12L17.59 17.12L16.73 19.72L13.86 19.72L18.17 6.98L21.69 6.98Z', grad: '<linearGradient id="__K__" gradientUnits="userSpaceOnUse" x1="-2.95" y1="19.72" x2="22.9" y2="28.67"><stop offset="0" stop-color="#D7A033"/><stop offset="0.22" stop-color="#EDBB45"/><stop offset="0.42" stop-color="#F4CB66"/><stop offset="0.6" stop-color="#F9DE9C"/><stop offset="0.78" stop-color="#FDF0D2"/><stop offset="1" stop-color="#FFFDF6"/></linearGradient>' };
// cada vez que se pinta, ids nuevos: un degradado con el id repetido deja de verse si el primero se oculta
let ID_MARCA = 0;
const idMarca = (p) => `${p}${++ID_MARCA}`;
const marcaWF = (k = idMarca('mw')) => MARCA_WF.replace(/__K__/g, k);
const svgMarca = (cls = '') => `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 48 48" aria-hidden="true">${marcaWF()}</svg>`;
// el nombre, con cada letra en su propio svg (así se pueden animar sueltas) y el degradado de todas en el mismo sitio
function nombreGF(cls = '') {
  const { w, h, defs, off, letras } = NOMBRE_GF;
  const pc = (v, t) => `${((v / t) * 100).toFixed(3)}%`;
  return `<span class="nombre-gf${cls ? ` ${cls}` : ''}" role="img" aria-label="GrowFolio" style="aspect-ratio:${w}/${h}">${letras.map(([d, x, y, lw, lh]) => {
    const k = idMarca('ng');
    return `<span aria-hidden="true" style="left:${pc(x, w)};top:${pc(y, h)};width:${pc(lw, w)};height:${pc(lh, h)}"><svg viewBox="${x} ${y} ${lw} ${lh}"><defs>${defs.replace(/__K__/g, k)}<path id="${k}s" d="${d}"/><clipPath id="${k}c"><use href="#${k}s"/></clipPath></defs><use href="#${k}s" fill="#FFF6DA"/><g clip-path="url(#${k}c)"><g transform="translate(0 ${off})"><use href="#${k}s" fill="url(#${k}d)"/><use href="#${k}s" fill="url(#${k}p)"/></g></g></svg></span>`;
  }).join('')}</span>`;
}
// GrowIA: la wIA de su nombre (en pequeño, sin cuadro) y su icono con cuadro para cuando habla
const iconoIA = () => { const k = idMarca('gi'); return `<svg class="ic-ia" viewBox="0 0 24 24" aria-hidden="true"><defs>${MARCA_IA.grad.replace(/__K__/g, k)}</defs><path d="${MARCA_IA.d}" style="fill:url(#${k})"/></svg>`; };
const AVATAR_IA = '<img class="ia-av-img" src="growia.svg" alt="">';
// «GrowIA» escrito con la letra de su logo, en los títulos. El título lleva data-no-trad: el resto ya va traducido aquí
const NOM_IA = '<img class="gia-nom" src="growia-nombre.svg" alt="GrowIA">';
const conIA = (es, en = es) => L(es, en).split('GrowIA').map((t) => esc(t)).join(NOM_IA);
const SVG = (d, w = 1.7) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONOS = {
  get growia() { return iconoIA(); },
  ordenar: SVG('<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="4.5" rx="1.6"/><rect x="13.5" y="11" width="7" height="9.5" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/>'),
  campana: SVG('<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 004 0"/>', 1.8),
  estrella: SVG('<path class="est" d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" stroke-linejoin="round"/>', 1.8),
  ojo: SVG('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  ojoNo: SVG('<path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7c1.9 0 3.6-.6 5-1.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  lapiz: SVG('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'),
  masV: SVG('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>', 2.4),
  ajustes: SVG('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
  cerrar: SVG('<path d="M6 6l12 12M18 6L6 18"/>', 2),
  alerta: SVG('<path d="M12 3l9.5 17h-19L12 3z"/><path d="M12 10v4M12 17.5v.01"/>', 2),
  ok: SVG('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>', 2),
  info: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>', 2),
  stop: SVG('<path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7z"/><path d="M12 8v5M12 16.5v.01"/>', 2),
  candado: SVG('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>', 1.8),
  mas: SVG('<path d="M12 5v14M5 12h14"/>', 2),
  orden: SVG('<path d="M4 6.5h11M4 12h7.5M4 17.5h4"/><path d="M18 5v14M15 16l3 3 3-3"/>', 1.9),
  compraVenta: SVG('<path d="M8.5 19V5M4.5 9l4-4 4 4" stroke="var(--up)"/><path d="M15.5 5v14M11.5 15l4 4 4-4" stroke="var(--down)"/>', 2),
  compra: SVG('<path d="M12 19V5M6 11l6-6 6 6"/>', 2),
  venta: SVG('<path d="M12 5v14M6 13l6 6 6-6"/>', 2),
  chispa: SVG('<path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/><path d="M19 3v4M17 5h4"/>'),
  papelera: SVG('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  cartera: SVG('<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M16 13h2M3 10h18M8 6V4h8v2"/>'),
  expertos: SVG('<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.7 10.7c.8.7 1.2 1.4 1.2 2.3v.5h5V16c0-.9.4-1.6 1.2-2.3A6 6 0 0 0 12 3z"/><path d="M12 7.5a2.5 2.5 0 0 0-2.5 2.5"/>'),
  mercados: SVG('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>'),
  analisis: SVG('<path d="M11 4.1A8 8 0 1 0 19.9 13H11z"/><path d="M14.5 2.6A8 8 0 0 1 21.4 9.5h-6.9z"/>'),
  futuro: SVG('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
  agenda: SVG('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.2h.01M12 17.2h.01" stroke-width="2.4"/>'),
  resultados: SVG('<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5"/><path d="M9.5 17v-2.5M12.5 17v-5M15.5 17v-3.5" stroke-width="2"/>'),
  dividendo: SVG('<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.3c-.5-.9-1.5-1.4-2.6-1.4-1.5 0-2.6.8-2.6 2 0 2.8 5.4 1.4 5.4 4.2 0 1.2-1.2 2-2.8 2-1.2 0-2.3-.5-2.8-1.4M12 6.4v1.5M12 16.2v1.4"/>'),
  banco: SVG('<path d="M3.5 9.3L12 4.2l8.5 5.1z"/><path d="M6 10.5v6.3M10 10.5v6.3M14 10.5v6.3M18 10.5v6.3M3.5 19.8h17"/>'),
  festivo: SVG('<circle cx="12" cy="12" r="8.5"/><path d="M8.2 12h7.6"/>'),
  media: SVG('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>'),
  fiesta: SVG('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M12 12.6l1.2 2.3 2.5.4-1.8 1.8.4 2.5-2.3-1.2-2.3 1.2.4-2.5-1.8-1.8 2.5-.4z"/>'),
  aporte: SVG('<path d="M12 3.8v10.4M7.8 10l4.2 4.2 4.2-4.2"/><path d="M4.5 15.5v2.8A1.7 1.7 0 0 0 6.2 20h11.6a1.7 1.7 0 0 0 1.7-1.7v-2.8"/>'),
  proy: SVG('<path d="M3 19c3-1 5-4 7-7"/><path d="M10 12c2.5-2 5-4 11-7" stroke-dasharray="2.2 2.6"/><path d="M15 5h6v6"/>'),
  perfil: SVG('<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-4 3.8-6.2 7.5-6.2s6.7 2.2 7.5 6.2"/>'),
  plan: SVG('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3M8 17h6"/>'),
  ruta: SVG('<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.5 6.2l1.6 1.6 2.6-3M3.5 12.2l1.6 1.6 2.6-3"/><circle cx="5.5" cy="18" r="1.6"/>'),
  fiscal: SVG('<path d="M6 3h12v18l-3-1.8-3 1.8-3-1.8L6 21z"/><path d="M9 8h6M9 12h6M9 16h3.5"/>'),
  calc: SVG('<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01"/>', 1.8),
  nueva: SVG('<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>', 1.8),
  recorte: SVG('<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>', 1.8),
  enviar: SVG('<path d="M12 19V5M6 11l6-6 6 6"/>', 2.2),
  micro: SVG('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>', 1.9),
  parar: SVG('<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor"/>', 1.5),
  bicho: SVG('<path d="M9 7.5a3 3 0 0 1 6 0"/><rect x="7" y="8" width="10" height="11" rx="5"/><path d="M12 11.5v7M3.5 13.5H7M17 13.5h3.5M5 8l2.5 2M19 8l-2.5 2M5 19.5l2.5-2M19 19.5l-2.5-2"/>', 1.8),
  globo: SVG('<path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5z"/><path d="M7.5 10.5h9M7.5 13.5h5.5"/>', 1.8),
  huella: SVG('<path d="M12 11.5v3a7 7 0 0 1-1.6 4.4"/><path d="M8.7 9.7a3.4 3.4 0 0 1 6.6 1.3v2.4a11 11 0 0 1-.7 3.9"/><path d="M6.3 7.6a6.4 6.4 0 0 1 12.1 3.4v1.4"/><path d="M5.2 13.3V11a7 7 0 0 1 .3-1.9"/><path d="M8.6 13.6v1a8.5 8.5 0 0 1-1.7 5"/><path d="M18.3 15.6a14 14 0 0 1-.8 2.9"/><path d="M8.4 4.2A9.4 9.4 0 0 1 21.3 11"/><path d="M2.7 11.2a9.3 9.3 0 0 1 2.4-6.1"/>', 1.6),
  borrarTecla: SVG('<path d="M9 5h10.5A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>', 1.8),
  copiar: SVG('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>', 1.8),
};

/* las pestañas, con el nombre corto de la barra del móvil; Plan va dentro de Cartera. Mercados era un icono suelto
   arriba y no se veía: desde la 0.1.17 es una pestaña más */
const VISTAS = [
  ['cartera', 'Cartera', 'Cartera'], ['ruta', 'Paso a paso', 'Pasos'], ['expertos', 'Expertos', 'Expertos'], ['analisis', 'Análisis', 'Análisis'], ['fiscal', 'Fiscalidad', 'Fiscal'], ['futuro', 'Objetivos', 'Objetivos'], ['agenda', 'Calendario', 'Calendario'], ['mercados', 'Mercados', 'Mercados'],
];
const VISTAS_APARTE = [];
/* 0.3: cinco sitios. Análisis lleva dentro tus objetivos (y Hacienda, que solo se enseña de marzo a junio, cuando
   toca la renta; el resto del año, con un enlace al final). El calendario se abre desde Inicio, con su icono junto al
   patrimonio (0.3.9: dentro de Mercados no lo encontraba nadie). En el móvil, Inicio en el
   centro y más grande: a la izquierda lo que haces (Pasos, Análisis) y a la derecha lo de fuera (Expertos, Mercados) */
const GRUPOS = [
  { k: 'cartera', t: 'Inicio', en: 'Home', vistas: ['cartera', 'agenda'] },
  // en el modo público (0.5) su sitio es «Tu plan», que llega completo en la 0.9
  { k: 'ruta', get t() { return esPublico() ? 'Tu plan' : 'Paso a paso'; }, get c() { return esPublico() ? 'Plan' : 'Pasos'; }, get en() { return esPublico() ? 'Plan' : 'Steps'; }, vistas: ['ruta'] },
  { k: 'analisis', t: 'Análisis', en: 'Analysis', vistas: ['analisis', 'futuro', 'fiscal'] },
  { k: 'expertos', t: 'Expertos', en: 'Experts', vistas: ['expertos'] },
  { k: 'mercados', t: 'Mercados', en: 'Markets', vistas: ['mercados'] },
];
const ORDEN_BARRA = ['ruta', 'analisis', 'cartera', 'expertos', 'mercados'];
const grupoDe = (v) => GRUPOS.find((g) => g.vistas.includes(v)) || GRUPOS[0];
const SUBVISTAS = { analisis: [['analisis', 'Tu cartera', 'Your portfolio'], ['futuro', 'Tus objetivos', 'Your goals'], ['fiscal', 'Hacienda', 'Taxes']] };
const epocaRenta = () => { const m = new Date().getMonth(); return m >= 2 && m <= 5; };
function htmlSubvistas() {
  const g = grupoDe(S.vista), sv = SUBVISTAS[g.k]; if (!sv) return '';
  // 0.3.11a: Hacienda, siempre (antes solo de marzo a junio y aparecía y desaparecía según desde dónde entraras)
  const lista = sv;
  const falta = perfilIncompleto();
  return `<nav class="grupo-tabs" aria-label="${esc(g.t)}">${lista.map(([k, t, en]) => `<a href="#${k}" aria-current="${S.vista === k ? 'page' : 'false'}"${k === 'futuro' && falta ? ' class="falta"' : ''}>${L(t, en)}</a>`).join('')}</nav>`;
}
// en el móvil caben cinco: estas cuatro y «Más», que abre el calendario, Mercados, Fiscalidad y Objetivos
const EN_BARRA = new Set(['cartera', 'ruta', 'expertos', 'analisis']);
const EN_MAS = [['agenda', 'Resultados, dividendos, bancos centrales y tus aportaciones, con cuántos días faltan'], ['mercados', 'Busca cualquier valor; bolsas, divisas y materias primas del mundo'], ['fiscal', 'Lo que pagarías a Hacienda, los tramos y la guía de la renta'], ['futuro', 'Tu perfil, tus límites, tus metas y la proyección']];
const esVista = (k) => VISTAS.some(([x]) => x === k) || VISTAS_APARTE.some(([x]) => x === k);

let toastT;
function toast(msg, ms = 3200) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms);
}

/* ---------- formatos de mercados (índices en puntos, divisas con 4 decimales...) ---------- */
function fmtMerc(sym, v) {
  if (v == null || !isFinite(v)) return '—';
  if (sym === '^TNX' || sym === '^IRX') return fmtNum(v, 2) + ' %';
  if (sym === 'EURUSD=X') return fmtNum(v, 4) + ' $';
  if (sym === 'EURGBP=X') return fmtNum(v, 4) + ' £';
  if (sym === 'JPY=X') return fmtNum(v, 2) + ' ¥';
  if (sym === '^VIX' || sym === 'DX-Y.NYB') return fmtNum(v, 2);
  const m = S.precios && S.precios.mercados && S.precios.mercados[sym] && S.precios.mercados[sym].moneda;
  if (sym.startsWith('^')) return fmtNum(v, v >= 1000 ? 0 : 2);
  const simb = m === 'USD' ? ' $' : m === 'EUR' ? ' €' : m === 'JPY' ? ' ¥' : '';
  return fmtNum(v, v >= 1000 ? 0 : 2) + simb;
}
function datoMerc(sym) {
  const m = (S.precios && S.precios.mercados && S.precios.mercados[sym]) || {};
  const v = S.liveM[sym];
  return { precio: v ? v.precio : m.precio, var: v && v.var != null ? v.var : m.variacion_dia };
}

function porPlataforma(M) {
  const m = new Map();
  const add = (k, v, dia) => { const o = m.get(k) || { v: 0, dia: 0 }; o.v += v; o.dia += dia; m.set(k, o); };
  for (const f of M.filas) add(f.pos.plataforma || 'Otra', f.valor, f.dia);
  for (const e of M.efectivo) add(e.plataforma, e.importe, 0);
  return [...m.entries()].sort((a, b) => b[1].v - a[1].v);
}

function binds(M) {
  const b = {};
  b.total = { txt: eur(M.total), n: M.total };
  // la cifra grande, partida en euros y céntimos a partir del mismo número ya redondeado (79.999,999 → 80.000,00)
  const tR = Math.round(M.total * 100) / 100, tE = Math.trunc(Math.abs(tR)), tC = Math.round((Math.abs(tR) - tE) * 100);
  b.totalE = { txt: S.oculto ? '••••' : (tR < 0 ? '−' : '') + fmtNum(tE, 0), n: M.total };
  b.totalD = { txt: S.oculto ? '\u00a0€' : ',' + String(tC).padStart(2, '0') + '\u00a0€', n: tC };
  b.dia = { txt: `${eurS(M.dia)} (${pctS(M.diaPct)})`, n: M.dia, cls: cls(M.dia) };
  b.pl = { txt: `${eurS(M.pl)} (${pctS(M.plPct)})`, n: M.pl, cls: cls(M.pl) };
  b.estado = estadoDirecto();
  for (const [k, o] of porPlataforma(M)) b['plat:' + k] = { txt: eur(o.v, 0), n: o.v };
  const vistos = new Set();
  for (const f of M.filas) {
    const id = f.pos.id;
    b['pv:' + id] = { txt: eur(f.valor), n: f.valor };
    b['pp:' + id] = { txt: precioFmt(f.precio), n: f.precio };
    // un fondo cuyo último valor es de hace más de dos sesiones no se ha movido «hoy»: raya, no su cambio viejo
    // sin dato de hoy, una sola raya (salía «hoy — —»)
    b['pd:' + id] = f.diaViejo || f.varDia == null ? { txt: '', n: null, cls: '' } : { txt: pctS(f.varDia), n: f.varDia, cls: cls(f.varDia) };
    // lo de hoy también en euros (en la tabla sale con el % debajo)
    b['pdF:' + id] = { txt: pctS(f.varDia), n: f.varDia, cls: cls(f.varDia) };
    b['pdE:' + id] = { txt: f.dia == null || f.varDia == null || f.diaViejo ? '—' : eurS(f.dia, Math.abs(f.dia) < 10 ? 2 : 0), n: f.diaViejo ? null : f.dia, cls: f.diaViejo ? '' : cls(f.dia) };
    b['pw:' + id] = { txt: pct(f.peso, 1), n: f.peso };
    b['pt:' + id] = { txt: pctS(f.plPct, 1), n: f.plPct, cls: cls(f.pl) };
    b['pg:' + id] = { txt: eurS(f.pl, 0), n: f.pl, cls: cls(f.pl) };
    b['pgd:' + id] = { txt: f.coste > 0 ? `${eurS(f.pl, 0)} (${pctS(f.plPct, 1)})` : '—', n: f.pl, cls: cls(f.pl) };
    if (!vistos.has(f.inst.id)) {
      vistos.add(f.inst.id);
      b['tp:' + f.inst.id] = { txt: precioFmt(f.precio), n: f.precio };
      b['tv:' + f.inst.id] = { txt: pctS(f.varDia), n: f.varDia, cls: cls(f.varDia) };
    }
  }
  b.recalc = { txt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
  const mueven = [...M.filas].filter((f) => Math.abs(f.dia) >= 1).sort((a, z) => Math.abs(z.dia) - Math.abs(a.dia)).slice(0, 4);
  // las que más han movido hoy tu cartera (hasta cuatro), como en el widget: nombre arriba y, debajo, euros y % con su
  // color. 0.7: con su logo (el mismo que en el mapa) en vez de la flechita: el signo y el color ya dicen si sube o baja
  const tm = mueven.map((f) => `${f.inst.corto} ${eurS(f.dia, 0)} ${pctS(f.varDia, 1)}`).join(', ');
  b.movers = { txt: tm, html: mueven.length ? `<p class="mv-t">${L('Lo que más ha movido hoy tu cartera', 'What moved your portfolio most today')}</p><div class="mv-l" style="--n:${mueven.length}">${mueven.map((f) => `<button type="button" class="mv-c ${cls(f.dia)}" data-pos="${esc(f.pos.id)}" title="${esc(L('Abrir su ficha', 'Open its details'))}"><span class="mv-n">${logo(f.inst.dominio || null, f.inst.corto || f.inst.nombre, 'mv-logo')}<span class="mv-nn">${esc(f.inst.corto)}</span></span><span class="mv-v">${esc(eurS(f.dia, 0))}<small>${esc(pctS(f.varDia, 1))}</small></span></button>`).join('')}</div>` : '' };
  const vis = new Set([...(S.radarVisibles || []), ...(S.ideasTop || [])]);
  if (vis.size) for (const x of radarVals()) {
    if (!vis.has(x.s)) continue;
    b['rp:' + x.s] = { txt: precioR(x.p, x.m), n: x.p };
    b['rv:' + x.s] = { txt: pctS(x.v), n: x.v, cls: cls(x.v) };
    b['ro:' + x.s] = { txt: pctS(x.pot, 1), n: x.pot, cls: cls(x.pot) };
  }
  for (const sym of Object.keys((S.precios && S.precios.mercados) || {})) {
    const d = datoMerc(sym);
    b['mp:' + sym] = { txt: fmtMerc(sym, d.precio), n: d.precio };
    // 0.3.9: en tipos y en el VIX, que suban es malo para la bolsa: el color va al revés (como ya decía su explicación);
    // y los tipos cambian en puntos porcentuales (pp), no en un % del %
    const inv = (MERC_INFO[sym] || {}).g === 'Tipos y riesgo', ci = (x) => (inv ? cls(-x) : cls(x));
    if ((sym === '^TNX' || sym === '^IRX') && d.precio != null && d.var != null) { const pp = d.precio - d.precio / (1 + d.var / 100); b['mv:' + sym] = { txt: `${pp >= 0.005 ? '+' : pp <= -0.005 ? '−' : ''}${fmtNum(Math.abs(pp), 2)} pp`, n: d.var, cls: ci(Math.abs(pp) < 0.005 ? 0 : pp) }; }
    else b['mv:' + sym] = { txt: pctS(d.var), n: d.var, cls: ci(d.var) };
  }
  return b;
}
function B(k, extra = '') {
  const b = (S.binds && S.binds[k]) || { txt: '—' };
  return `<span data-b="${esc(k)}" data-n="${b.n == null ? '' : b.n}"${b.html != null ? ` data-h="${esc(b.txt)}"` : ''} class="${[b.cls, extra].filter(Boolean).join(' ')}">${b.html != null ? b.html : esc(b.txt)}</span>`;
}

/* pone el texto de los datos en directo que aún no se habían calculado al pintar (los del radar) */
function rellenarBinds(raiz) {
  for (const el of $$('[data-b]', raiz)) {
    const b = S.binds[el.dataset.b]; if (!b) continue;
    // las que llevan html (lo que más mueve hoy) solo se rehacen si cambia su texto
    if (b.html != null) { if (el.dataset.h !== b.txt) { el.innerHTML = b.html; el.dataset.h = b.txt; if (el.dataset.b === 'movers') pedirEncajarMovers(); } continue; }
    el.textContent = b.txt; el.dataset.n = b.n == null ? '' : b.n;
    for (const c of ['up', 'down', 'flat']) el.classList.toggle(c, b.cls === c);
  }
}
let parcheT = null;
function programarParche() { if (parcheT) return; parcheT = setTimeout(() => { parcheT = null; parchear(); }, 250); }
const DESTELLA = /^(totalE|pv:|pp:|tp:|mp:|plat:|rp:)/;
/* el patrimonio no salta: cuenta hasta el valor nuevo en medio segundo */
function contarHasta(el, de, a, fin) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  cancelAnimationFrame(el._cuenta);
  const t0 = performance.now(), dur = 650;
  const paso = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = k < 1 ? fmtNum(Math.trunc(de + (a - de) * e), 0) : fin; if (k < 1) el._cuenta = requestAnimationFrame(paso); };
  el._cuenta = requestAnimationFrame(paso);
}
function parchear() {
  if (!S.cartera || !document.querySelector('[data-b]')) return;
  const M = calcular(); S.M = M;
  const nb = binds(M); S.binds = nb;
  for (const el of $$('[data-b]')) {
    const b = nb[el.dataset.b]; if (!b) continue;
    if (b.html != null) {
      if (el.dataset.h !== b.txt) { el.innerHTML = b.html; el.dataset.h = b.txt; if (el.dataset.b === 'movers') pedirEncajarMovers(); }
      if (el.dataset.b === 'estado') for (const c of ['on', 'off', 'cerr']) el.classList.toggle(c, b.cls === c);
      continue;
    }
    if (el.textContent !== b.txt) {
      const viejo = parseFloat(el.dataset.n);
      el.textContent = b.txt;
      if (el.dataset.b === 'totalE' && !S.oculto && isFinite(viejo) && isFinite(b.n) && Math.abs(b.n - viejo) >= 1) contarHasta(el, viejo, b.n, b.txt);
      if (el.dataset.b === 'totalE') setTimeout(encajarCifra, 1300);
      if (!S.oculto && DESTELLA.test(el.dataset.b) && isFinite(viejo) && isFinite(b.n) && Math.abs(b.n - viejo) > 1e-9) {
        // la cifra grande de Inicio cambia de color entera (euros y céntimos); el resto, con su fondo de siempre
        const hn = el.dataset.b === 'totalE' && el.closest('#heroNum');
        const c = hn || el, [cs, cb] = hn ? ['hn-sube', 'hn-baja'] : ['sube', 'baja'];
        c.classList.remove(cs, cb); void c.offsetWidth; c.classList.add(b.n > viejo ? cs : cb);
      }
    }
    el.dataset.n = b.n == null ? '' : b.n;
    for (const c of ['up', 'down', 'flat', 'on', 'off']) el.classList.toggle(c, b.cls === c);
  }
  if (S.heroVar) S.heroVar(M);
  // «En directo» / «Cerrada» cambia de largo: la cabecera se vuelve a encajar (si no, se cortaba por el final)
  if (nb.estado && nb.estado.txt !== S.estadoTxt) { S.estadoTxt = nb.estado.txt; requestAnimationFrame(encajarCabecera); }
  vigilarRecomendaciones(M);
  enviarWidget();
}

/* ---------- estructura fija: cabecera, cinta, contenido y barra inferior ---------- */
function montar() {
  $('#app').innerHTML = `
  <header class="top"><div class="wrap fila-top">
    <div class="marca"><img src="favicon.svg" alt="GrowFolio"><span class="marca-nom"><img src="growfolio-nombre.svg" alt="GrowFolio"></span><button class="ver-chip" data-accion="novedades" title="Qué se ha mejorado en esta versión">${VERSION} alfa</button></div>
    <nav class="nav" aria-label="Secciones">${GRUPOS.map((g) => `<a href="#${g.k}" data-ir="${g.k}">${L(g.t, g.en)}</a>`).join('')}</nav>
    ${gtaActivo() ? '<div class="gta-top-w" id="gtaTop"></div>' : ''}
    <div class="estado-w" id="estadoW"><button type="button" class="estado-b" id="estadoB" aria-expanded="false" aria-controls="estadoPanel" title="Cómo están las bolsas"><span id="estado"></span></button><div class="estado-panel" id="estadoPanel" role="region" aria-label="Las bolsas ahora"></div></div>
    <div class="acciones">
      <button class="as-boton" id="bAsesor" data-accion="asesor" title="Pregúntale a GrowIA por tu cartera" aria-label="Pregúntale a GrowIA">${ICONOS.growia}<span>${L('Pregúntale', 'Ask GrowIA')}</span></button>
      <button class="ib ib-fallo" id="bFallo" data-accion="opinion" title="Es una alfa: avisa de cualquier fallo o idea" aria-label="Avisar de un fallo">${ICONOS.bicho}<span class="fallo-t">Avisar de un fallo</span></button>
      <button class="ib" id="bAjustes" data-accion="ajustes" aria-label="Ajustes" title="Ajustes">${ICONOS.ajustes}</button>
    </div>
  </div></header>
  <main class="wrap" id="vista"></main>
  <nav class="navbar" aria-label="Secciones">${ORDEN_BARRA.map((k) => { const g = GRUPOS.find((x) => x.k === k); return `<a href="#${k}" data-ir="${k}"${k === 'cartera' ? ' class="nav-centro"' : ''}>${ICONOS[k]}<span>${L(g.c || g.t, g.en)}</span></a>`; }).join('')}</nav>`;
  S.tickerFirma = null;
  // la luz de arriba: al pasar el ratón (o tocarla) se despliegan las bolsas
  const ew = $('#estadoW'), eb = $('#estadoB'), ep = $('#estadoPanel');
  const rellena = () => { ep.innerHTML = htmlBolsasPanel(); };
  const abre = (si) => { ew.classList.toggle('abierto', si); eb.setAttribute('aria-expanded', String(si)); if (si) rellena(); };
  ew.addEventListener('mouseenter', rellena);
  eb.addEventListener('click', () => abre(!ew.classList.contains('abierto')));
  document.addEventListener('click', (e) => { if (ew.classList.contains('abierto') && !ew.contains(e.target)) abre(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ew.classList.contains('abierto')) { abre(false); eb.focus(); } });
}

/* Avisos (0.2.2), solo si los activas (Ajustes > Avisos y resumen), en cada dispositivo por separado:
   - en la app de Android, notificaciones del móvil aunque no la tengas abierta: la web le pasa a la app las reglas
     (precio de salida de cada posición, fechas de lo tuyo y las preguntas de GrowIA) y la app las mira cada media
     hora con los precios de la Action, sin abrir la web y sin la contraseña;
   - en el navegador (y en el iPhone con GrowFolio en la pantalla de inicio), mientras GrowFolio esté abierto en
     segundo plano: la misma revisión, cada vez que llegan precios.
   Nunca de noche (de 22:00 a 8:00) y cada cosa una vez. */
const AVISOS_DEF = { on: false, stop: true, mov: true, fechas: true, preg: true, seg: true };
const avisosCfg = () => ({ ...AVISOS_DEF, ...LS.get('inv-avisos', {}) });
const appAvisos = () => { const a = window.InversionesApp; return a && typeof a.avisos === 'function' ? a : null; };
function htmlAjAvisos() {
  const c = avisosCfg(), app = window.InversionesApp, nativo = appAvisos();
  const permiso = nativo ? (typeof nativo.avisosPermitidos === 'function' ? nativo.avisosPermitidos() : true) : 'Notification' in window ? Notification.permission === 'granted' : false;
  const donde = nativo ? 'En el móvil, aunque no tengas la app abierta: la app mira cada media hora tus precios de salida, tus fechas y si GrowIA te pregunta algo.'
    : app ? 'Actualiza la app de Android (Ajustes > App de Android) para tener avisos en el móvil.'
    : 'Te avisa el navegador mientras GrowFolio esté abierto, aunque sea en otra pestaña. Para tenerlos con todo cerrado, la app de Android.';
  const fila = (k, t) => `<label class="av-op"><input type="checkbox" data-av="${k}"${c[k] ? ' checked' : ''}${c.on ? '' : ' disabled'}><span>${t}</span></label>`;
  return `<h3>${ICONOS.campana}Avisos</h3>
    <label class="av-op av-on"><input type="checkbox" data-av="on"${c.on ? ' checked' : ''}${app && !nativo ? ' disabled' : ''}><span><b>Avisarme de lo importante</b><small>${donde}</small></span></label>
    ${c.on && !permiso ? `<p class="nota av-falta">${ICONOS.alerta}Falta el permiso de notificaciones: ${nativo ? 'acéptalo en el aviso del móvil o en Ajustes de Android > Aplicaciones > GrowFolio > Notificaciones.' : 'acéptalo en el navegador (el candado de la barra de direcciones).'}</p>` : ''}
    <div class="av-ops">${fila('stop', 'Cuando algo baja de tu precio de salida o se acerca a menos de un 3 %')}${fila('mov', 'Cuando una de tus posiciones sube o baja más de un 5 % en el día')}${fila('fechas', 'El día antes de los resultados y los dividendos de lo tuyo')}${fila('preg', 'Cuando GrowIA te pregunta algo')}${fila('seg', 'Cuando una empresa que sigues llega al precio que le pusiste')}</div>
    ${c.on ? '<button type="button" class="btn peq" data-av-prueba>Mandar un aviso de prueba</button>' : ''}${htmlAvisoVersiones(permiso)}`;
}
// el aviso de las versiones nuevas: en la app de Android, aunque no la tengas abierta (mira cada 3 horas si hay versión)
const appVersiones = () => { const a = window.InversionesApp; return a && typeof a.avisosVersiones === 'function' ? a : null; };
function htmlAvisoVersiones(permiso) {
  const a = appVersiones(); if (!a) return '';
  let on = true; try { on = a.avisosVersionesActivados(); } catch (e) {}
  return `<label class="av-op av-on av-ver"><input type="checkbox" data-av-ver${on ? ' checked' : ''}><span><b>Avisarme de las versiones nuevas</b><small>Cuando salga una versión de GrowFolio, un aviso en el móvil con lo que trae.</small></span></label>
    ${on && !permiso ? `<p class="nota av-falta">${ICONOS.alerta}Falta el permiso de notificaciones: acéptalo en el aviso del móvil o en Ajustes de Android > Aplicaciones > GrowFolio > Notificaciones.</p>` : ''}`;
}
// una vez, en la app de Android y si falta el permiso: si quiere que le avisemos de las versiones nuevas
function pedirAvisoVersiones(intento = 0) {
  const a = appVersiones(); if (!a || LS.get('inv-ver-pedido', false)) return;
  let on = true, permiso = true; try { on = a.avisosVersionesActivados(); permiso = a.avisosPermitidos(); } catch (e) { return; }
  if (!on || permiso) return;
  if (document.hidden || document.querySelector('.hoja-fondo, #asesorFondo, .tour, .estreno, .intro, .ficha-fondo') || S.ficha) { if (intento < 10) setTimeout(() => pedirAvisoVersiones(intento + 1), 30000); return; }
  LS.set('inv-ver-pedido', true);
  const h = hoja('¿Te aviso cuando haya versión nueva?', `<div class="act-app">
    ${dibujo('avisover')}
    <p>Cuando salga una versión de GrowFolio te llega un aviso al móvil con lo que trae, aunque no tengas la app abierta. Para eso, Android te pedirá permiso para las notificaciones.</p>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>Ahora no</button><button type="button" class="btn pri" data-ver-si>Sí, avísame</button></div>
    <p class="nota">Se cambia cuando quieras en Ajustes > Avisos y resumen.</p>
  </div>`);
  $('[data-ver-si]', h.el).onclick = () => { try { a.avisosVersiones(true); } catch (e) {} h.cerrar(); };
}
function enlazarAjAvisos(caja) {
  if (!caja) return;
  caja.addEventListener('change', async (e) => {
    const v = e.target.closest('[data-av-ver]');
    if (v) { const a = appVersiones(); if (a) { try { a.avisosVersiones(v.checked); } catch (er) {} } caja.innerHTML = htmlAjAvisos(); toast(v.checked ? 'Te avisaremos de las versiones nuevas' : 'Sin avisos de versiones nuevas', 3000); return; }
    const i = e.target.closest('[data-av]'); if (!i) return;
    const c = avisosCfg(); c[i.dataset.av] = i.checked;
    if (i.dataset.av === 'on' && i.checked && !appAvisos() && 'Notification' in window && Notification.permission !== 'granted') {
      try { await Notification.requestPermission(); } catch (er) {}
    }
    LS.set('inv-avisos', c);
    const app = appAvisos(); if (app) { try { app.avisos(!!c.on); } catch (er) {} }
    enviarWidget(true);
    caja.innerHTML = htmlAjAvisos();
    if (i.dataset.av === 'on') toast(c.on ? 'Avisos activados en este dispositivo' : 'Avisos quitados', 3000);
  });
  caja.addEventListener('click', (e) => { if (e.target.closest('[data-av-prueba]')) avisoSistema('prueba', 'Así te llegarán los avisos', 'Por ejemplo: «Repsol se acerca a tu precio de salida: está a un 2,1 % de 26,92 €».', '#cartera', 'prueba:' + Date.now(), true); });
}
// la app de Android contesta aquí cuando aceptas (o no) el permiso de notificaciones al activar los avisos
window.permisoAvisos = (ok) => {
  const caja = document.getElementById('aAvisos'); if (caja) caja.innerHTML = htmlAjAvisos();
  if (!ok) toast('Sin el permiso de notificaciones no te llegará ningún aviso. Puedes darlo en Ajustes de Android > Aplicaciones > GrowFolio.', 6000);
};
async function avisoSistema(tipo, titulo, cuerpo, hash = '#cartera', clave = '', forzar = false) {
  if (S.demo) return;  // 0.6d: la cartera de prueba no manda avisos
  const c = avisosCfg();
  if (!forzar && (!c.on || (tipo !== 'prueba' && c[{ pregunta: 'preg' }[tipo] || tipo] === false))) return;
  const h = new Date().getHours();
  if (!forzar && (h >= 22 || h < 8)) return;
  const hechos = LS.get('inv-avisos-hechos', {});
  if (clave && hechos[clave]) return;
  if (clave) { hechos[clave] = Date.now(); for (const [k, t] of Object.entries(hechos)) if (Date.now() - t > 10 * 864e5) delete hechos[k]; LS.set('inv-avisos-hechos', hechos); }
  const app = appAvisos();
  if (app && typeof app.notificar === 'function') { try { app.notificar(trad(titulo), trad(cuerpo), String(hash).replace('#', '')); } catch (e) {} return; }
  if (!('Notification' in window) || Notification.permission !== 'granted') { if (forzar) toast('El navegador no deja mandar avisos: acepta el permiso de notificaciones', 4500); return; }
  const opc = { body: trad(cuerpo), icon: 'growfolio-192.png', badge: 'growfolio-aviso.png', tag: clave || tipo, data: { hash } };
  try { const r = await navigator.serviceWorker.getRegistration(); if (r) { await r.showNotification(trad(titulo), opc); return; } } catch (e) {}
  try { const n = new Notification(trad(titulo), opc); n.onclick = () => { window.focus(); location.hash = hash; n.close(); }; } catch (e) {}
}
// las reglas de hoy: lo que la app de Android revisa sola y lo que el navegador mira al llegar precios
function reglasAvisos(M) {
  const reglas = M.filas.filter((f) => f.inst && f.valor > 0).map((f) => ({ id: f.inst.id, n: f.inst.corto || f.inst.nombre, sym: f.inst.yahoo ? String(f.inst.yahoo).toUpperCase() : '', cid: f.inst.cat || (catDe(f.inst) ? 'c-' + String(f.inst.isin || '').toLowerCase() : ''), stop: +f.pos.stop || 0, p: f.precio || 0 }));
  const vistos = new Set(), unicas = reglas.filter((r) => !vistos.has(r.id) && vistos.add(r.id));
  let eventos = [];
  try { eventos = agendaLista(M, 3).filter((e) => ['resultados', 'dividendo', 'cobro'].includes(e.tipo)).map((e) => { const d = document.createElement('div'); d.innerHTML = e.t; return { k: e.id, d: e.d, t: trad(d.textContent), s: trad(String(e.s || '')) }; }); } catch (e) {}
  const vistas = LS.get('inv-preg-vistas', []);
  const preg = preguntasIA().filter((x) => !preguntaVista(x, vistas)).map((x) => ({ k: clavePreg(x), q: x.q }));
  // 0.3.11: las empresas que sigues, con sus precios de aviso (en euros, los del radar)
  const seguir = siguiendo().filter((x) => x.baja || x.sube).map((x) => ({ sym: x.s, n: x.n, baja: +x.baja || 0, sube: +x.sube || 0 }));
  return { reglas: unicas, eventos, preg, seguir };
}
// en el navegador: al llegar precios y con GrowFolio en segundo plano (si lo estás mirando, ya lo ves en Cartera)
function revisarAvisos(M) {
  const c = avisosCfg();
  if (!c.on || appAvisos() || !document.hidden || !M) return;
  const hoy = hoyIso(), manana = iso(new Date(Date.now() + 864e5)), h = new Date().getHours();
  for (const f of M.filas) {
    const stop = +f.pos.stop, pr = f.precio, n = f.inst.corto || f.inst.nombre;
    if (c.stop && stop > 0 && pr > 0) {
      if (pr <= stop) avisoSistema('stop', L(`${n}: precio de salida roto`, `${n}: exit price broken`), L(`Está a ${precioFmt(pr)}, por debajo de tu salida (${precioFmt(stop)}). Es lo que te dijiste que harías.`, `It's at ${precioFmt(pr)}, below your exit (${precioFmt(stop)}). It's what you told yourself you'd do.`), '#cartera', `stop:${f.inst.id}:${hoy}`);
      else if (pr <= stop * 1.03) avisoSistema('stop', L(`${n} se acerca a tu precio de salida`, `${n} is nearing your exit price`), L(`Está a un ${fmtNum((pr / stop - 1) * 100, 1)} % de ${precioFmt(stop)}.`, `It's ${fmtNum((pr / stop - 1) * 100, 1)} % above ${precioFmt(stop)}.`), '#cartera', `stopc:${f.inst.id}:${hoy}`);
    }
    if (c.mov && f.varDia != null && Math.abs(f.varDia) >= 5) avisoSistema('mov', L(`${n} ${f.varDia > 0 ? 'sube' : 'baja'} un ${fmtNum(Math.abs(f.varDia), 1)} % hoy`, `${n} is ${f.varDia > 0 ? 'up' : 'down'} ${fmtNum(Math.abs(f.varDia), 1)} % today`), L('Abre GrowFolio para ver qué ha pasado y qué dice GrowIA.', 'Open GrowFolio to see what happened and what GrowIA says.'), '#cartera', `mov:${f.inst.id}:${hoy}`);
  }
  if (c.fechas && h >= 18) for (const e of reglasAvisos(M).eventos) if (e.d === manana) avisoSistema('fechas', L(`Mañana: ${e.t}`, `Tomorrow: ${e.t}`), e.s, '#agenda', 'ev:' + e.k);
  if (c.seg) for (const it of siguiendo()) {
    const pr = precioSeguido(it), p = pr && pr.eur;
    if (!(p > 0)) continue;
    if (it.baja && p <= it.baja) avisoSistema('seg', L(`${it.n} ha bajado a tu precio`, `${it.n} has dropped to your price`), L(`Está a ${precioFmt(p)}: la seguías para cuando bajara de ${precioFmt(it.baja)}.`, `It's at ${precioFmt(p)}: you were watching for it to drop below ${precioFmt(it.baja)}.`), '#expertos', `segb:${it.s}:${it.baja}`);
    if (it.sube && p >= it.sube) avisoSistema('seg', L(`${it.n} ha subido a tu precio`, `${it.n} has risen to your price`), L(`Está a ${precioFmt(p)}: querías saber cuándo pasara de ${precioFmt(it.sube)}.`, `It's at ${precioFmt(p)}: you wanted to know when it passed ${precioFmt(it.sube)}.`), '#expertos', `segs:${it.s}:${it.sube}`);
  }
}

/* El resumen de hoy: la primera vez que abres GrowFolio cada día (si no lo quitas en Ajustes), lo más importante
   en una hoja: cómo va tu cartera, lo que mueve hoy los mercados según GrowIA, las noticias de lo tuyo y de la bolsa,
   y lo que viene hoy y mañana. También a mano desde Ajustes y como bloque de Cartera. */
function noticiasDeLoTuyo(M, max = 5) {
  const N = (S.precios && S.precios.noticias) || {}, out = [], vistos = new Set(), limite = Date.now() - 3 * 864e5;
  const filas = [...M.filas].sort((a, b) => (b.valor || 0) - (a.valor || 0));
  for (const f of filas) {
    const i = f.inst, lista = N[i.id] || (i.yahoo ? noticiasIdea(i.yahoo) : []);
    for (const n of (lista || []).slice(0, 4)) {
      const k = String(n.t || '').slice(0, 48);
      if (!n.t || !n.u || vistos.has(k) || (n.d && new Date(n.d).getTime() < limite)) continue;
      vistos.add(k); out.push({ ...n, inst: i });
    }
  }
  return out.sort((a, b) => (String(b.d || '') > String(a.d || '') ? 1 : -1)).slice(0, max);
}
function htmlResumenDia(M) {
  const N = (S.precios && S.precios.noticias) || {}, MK = (S.precios && S.precios.mercados) || {}, inf = informeVisible(), ia = iaActual();
  const hoyD = new Date(), fecha = hoyD.toLocaleDateString(IDIOMA === 'en' ? 'en-GB' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const mueven = [...M.filas].filter((f) => f.dia && Math.abs(f.dia) >= 1).sort((a, b) => Math.abs(b.dia) - Math.abs(a.dia)).slice(0, 3);
  const fichas = [['^IBEX', 'Ibex 35'], ['^STOXX50E', 'Euro Stoxx 50'], ['^GSPC', 'S&P 500'], ['BTC-EUR', 'Bitcoin']].filter(([k]) => MK[k] && MK[k].variacion_dia != null);
  const mercado = ((inf && inf.mercado) || []).slice(0, 3);
  const tuyas = noticiasDeLoTuyo(M, 4), generales = (N.mercado || []).filter((n) => n.t && n.u).slice(0, 3);
  // de tu comunidad, solo lo que toca tu dinero (impuestos, ayudas, vivienda), de los últimos 3 días y como mucho dos
  const regionales = comunidadUsuario() ? noticiasComunidad(comunidadUsuario(), 2, 3) : [];
  const prox = (() => { try { return agendaLista(M, 2).filter((e) => !['festivo', 'media'].includes(e.tipo) || e.mio).slice(0, 4); } catch (e) { return []; } })();
  const toca = (() => { try { const P = pasosRuta(M); return [...P.mes, ...P.seis].filter((x) => !x.hecho && !x.auto && x.urgente)[0] || null; } catch (e) { return null; } })();
  const noticia = (n) => `<li><a href="${esc(n.u)}" target="_blank" rel="noopener noreferrer" data-no-trad><b>${esc(n.t)}</b></a><small>${n.inst ? `<span class="chip">${esc(n.inst.corto || n.inst.nombre)}</span>` : ''}<span data-no-trad>${esc(n.f || '')}</span>${n.d ? ` · ${esc(haceCuanto(n.d))}` : ''}</small></li>`;
  return `<div class="rdia">
    <p class="rdia-fecha" data-no-trad>${esc(fecha[0].toUpperCase() + fecha.slice(1))}</p>
    <section class="rdia-car"><span class="k">Tu cartera hoy</span><b class="rdia-tot">${eur(M.total, 0)}</b><span class="${cls(M.dia)} rdia-dia">${eurS(M.dia, 0)} (${pctS(M.diaPct, 2)})</span>
      ${mueven.length ? `<div class="mv-l">${mueven.map((f) => `<button type="button" class="mv-c ${cls(f.dia)}" data-pos="${esc(f.pos.id)}" title="${esc(L('Abrir su ficha', 'Open its details'))}"><span class="mv-f" aria-hidden="true">${f.dia > 0 ? '▲' : '▼'}</span><b>${esc(f.inst.corto)}</b>${esc(eurS(f.dia, 0))}<small>${esc(pctS(f.varDia, 1))}</small></button>`).join('')}</div>` : ''}</section>
    ${ia && ia.titular ? `<section class="rdia-ia"><h3 data-no-trad>${conIA('Lo que dice GrowIA', 'What GrowIA says')}</h3><p>${rellenarIA(ia.titular, valoresIA(M))}</p>${toca ? `<p class="rdia-toca"><span class="k">Lo urgente:</span> ${toca.t}</p>` : ''}<a class="enlace acento" href="#analisis" data-cerrar>Ver su análisis</a></section>` : toca ? `<section class="rdia-ia"><h3>Lo que toca</h3><p>${toca.t}</p></section>` : ''}
    ${fichas.length || mercado.length ? `<section><h3>Los mercados</h3>${fichas.length ? `<div class="agp-fichas">${fichas.map(([k, n]) => { const v = MK[k].variacion_dia; return `<span class="${v >= 0 ? 'up' : 'down'}"><i>${v >= 0 ? '↑' : '↓'}</i>${esc(n)} <b>${pctS(v, 2)}</b></span>`; }).join('')}</div>` : ''}
      ${mercado.length ? `<ul class="rdia-merc">${mercado.map((m) => `<li>${chipImpacto(m.impacto)}<span>${escIA(m.t)}</span></li>`).join('')}</ul>` : ''}</section>` : ''}
    ${tuyas.length ? `<section><h3>Noticias de lo tuyo</h3><ul class="rdia-not">${tuyas.map(noticia).join('')}</ul></section>` : ''}
    ${generales.length ? `<section><h3>De la bolsa</h3><ul class="rdia-not">${generales.map(noticia).join('')}</ul></section>` : ''}
    ${regionales.length ? `<section><h3>${L('En', 'In')} ${esc(conArticulo(comunidadUsuario()))}</h3><ul class="rdia-not">${regionales.map(noticia).join('')}</ul></section>` : ''}
    ${prox.length ? `<section><h3>Hoy y mañana</h3><ul class="rdia-prox">${prox.map((e) => `<li><span class="ag-cd">${faltan(e.d, true)}</span><span class="ag-ic">${iconoAg(e)}</span><span><b>${tituloAg(e)}</b><small>${esc(e.s || '')}</small></span></li>`).join('')}</ul></section>` : ''}
  </div>`;
}
// 0.4f: no sale de madrugada (si abres GrowFolio pasada la medianoche antes de dormir, no era «el resumen de hoy»): solo
// desde esta hora, la primera vez de cada día
const HORA_RESUMEN = 6;
function resumenDelDia(seguir = () => {}, forzar = false) {
  if (!S.cartera || !S.M) return seguir();
  if (!forzar && new Date().getHours() < HORA_RESUMEN) return seguir();
  if (!forzar && (LS.get('inv-resumen-off', false) || LS.get('inv-resumen-dia', '') === hoyIso() || !S.M.filas.length || document.querySelector('.hoja-fondo, #asesorFondo, .tour, .estreno, .intro'))) return seguir();
  LS.set('inv-resumen-dia', hoyIso());
  const h = hoja(`${saludoHora()}${nombreUsuario() ? `, ${nombreUsuario()}` : ''}`, `${htmlResumenDia(S.M)}
    <div class="fila-btns rdia-pie"><label class="check-mini"><input type="checkbox" id="rdiaOff" ${LS.get('inv-resumen-off', false) ? 'checked' : ''}> No enseñarlo cada día</label><button type="button" class="btn pri" data-cerrar>Ver mi cartera</button></div>`, () => seguir());
  h.el.classList.add('hoja-rdia');
  $('#rdiaOff', h.el).onchange = (e) => { LS.set('inv-resumen-off', e.target.checked); toast(e.target.checked ? 'Ya no saldrá solo: lo tienes en Ajustes' : 'Saldrá la primera vez que abras cada día, desde las 6 de la mañana', 3500); };
  h.el.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"], [data-pos]')) h.cerrar(true); });
}

/* =====================================================================
   App de Android: la web corre dentro de la app y le manda al widget una foto de la cartera
   (total, hoy, cantidad y valor de cada posición, lo que toca). El widget la recalcula sola con los
   precios de widget.json, que publica la Action. Nunca sale de aquí la contraseña.
   ===================================================================== */
let widgetT = 0, widgetFirma = '';
function enviarWidget(forzar) {
  const app = window.InversionesApp;
  if (!app || !S.cartera || !S.M || S.demo) return;
  if (!forzar && Date.now() - widgetT < 60000) return;
  const M = S.M;
  let toca = '', cuando = '';
  try {
    const P = pasosRuta(M), pend = [...P.mes, ...P.seis].filter((x) => !x.hecho && !x.auto);
    const x = pend.find((y) => y.urgente) || pend[0];
    if (x) { const d = document.createElement('div'); d.innerHTML = x.t; toca = trad(d.textContent.replace(/\s+/g, ' ').trim()); cuando = trad(x.cuando || ''); }
  } catch (e) {}
  const pos = M.filas.filter((f) => f.valor).map((f) => ({ id: f.inst.id, n: f.inst.corto || f.inst.nombre, uds: f.uds || undefined, valor: Math.round(f.valor * 100) / 100, dia: Math.round((f.dia || 0) * 100) / 100 }));
  // la gráfica del widget: el último mes, día a día, con el efectivo sumado para que acabe en el total de hoy
  let serie = [];
  try {
    const se = serieCartera(M, 31);
    if (se.length > 1) {
      const extra = M.total - se[se.length - 1].v;
      const paso = Math.max(1, Math.ceil(se.length / 60));
      serie = se.filter((x, k) => k % paso === 0 || k === se.length - 1).map((x) => Math.round(x.v + extra));
    }
  } catch (e) {}
  const foto = { v: 2, total: M.total, dia: M.dia, invertido: M.invertido, fijo: M.total - sum(pos, (x) => x.valor), oculto: !!S.oculto, toca, cuando, pos, serie, rango: '1 mes' };
  // los avisos (si están activados): las reglas que la app revisa sola cada media hora
  try { const c = avisosCfg(); if (c.on && appAvisos()) foto.avisos = { ...c, ...reglasAvisos(M) }; } catch (e) {}
  const firma = JSON.stringify({ ...foto, total: Math.round(foto.total), dia: Math.round(foto.dia) });
  if (!forzar && firma === widgetFirma) return;
  widgetT = Date.now(); widgetFirma = firma;
  try { app.guardarWidget(JSON.stringify(foto)); } catch (e) { console.warn('widget', e); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) enviarWidget(true); });

function pintar() {
  if (!S.cartera) return;
  if (!$('#vista')) montar();
  const M = calcular(); S.M = M; S.binds = binds(M);
  const gAct = grupoDe(S.vista).k;
  for (const a of $$('[data-ir]')) a.setAttribute('aria-current', a.dataset.ir === gAct ? 'page' : 'false');
  // un punto en Análisis (donde están tus objetivos) mientras te falte el perfil
  const faltaP = perfilIncompleto();
  for (const a of $$('.nav [data-ir="analisis"], .navbar [data-ir="analisis"]')) a.classList.toggle('falta', faltaP);
  // lo nuevo de la versión: el botón de su sección lleva «Nuevo» y late hasta que lo ves de verdad
  pintarNavNuevo();
  $('#estado').outerHTML = B('estado', 'estado').replace('<span ', '<span id="estado" ');
  pintarGtaTop();
  cancelAnimationFrame(encajarT); encajarT = requestAnimationFrame(encajarCabecera);
  for (const bo of $$('[data-accion="ocultar"]')) { bo.innerHTML = S.oculto ? ICONOS.ojoNo : ICONOS.ojo; bo.title = S.oculto ? L('Mostrar importes', 'Show amounts') : L('Ocultar importes', 'Hide amounts'); bo.setAttribute('aria-label', bo.title); bo.setAttribute('aria-pressed', String(!!S.oculto)); }
  pintarTicker(M);
  const scroll = window.scrollY;
  const html = { cartera: vistaCartera, ruta: vistaRuta, expertos: vistaExpertos, mercados: vistaMercados, analisis: vistaAnalisis, fiscal: vistaFiscal, futuro: vistaFuturo, agenda: vistaAgenda }[S.vista] || vistaCartera;
  setTimeout(() => { plegarNotas($('#vista')); marcarDeslizables($('#vista')); }, 0);
  $('#vista').innerHTML = sinCortes(htmlSubvistas() + html(M) + `<div class="pie-btns"><button class="opinion-pie" data-accion="opinion">${ICONOS.globo}<span><b>¿Algo se ve mal o tienes una idea?</b> Cuéntanoslo: lo leemos todo.</span></button><button class="opinion-pie tut" data-accion="tour">${ICONOS.ruta}<span><b>Ver el tutorial</b> Qué hay en cada pestaña.</span></button></div><p class="pie" title="La bolsa de Londres llega con 20 minutos de retraso; divisas y futuros, al instante. Analistas, histórico e ideas: Yahoo Finance.">Precios de Yahoo Finance (Madrid, con 15 minutos de retraso) y de Bitvavo; los fondos se actualizan una vez al día. Noticias de Google Noticias. Tus cantidades van cifradas: solo las ves tú. Las visitas se cuentan con Cloudflare, sin cookies ni datos tuyos.</p>`);
  if (S.scrollA != null) {
    // volviendo atrás: al punto exacto en el que la dejaste (y otra vez en cuanto se haya pintado todo)
    const y = S.scrollA; S.scrollA = null; S.scrollTop = false;
    window.scrollTo(0, y); requestAnimationFrame(() => window.scrollTo(0, y));
    setTimeout(() => { if (Math.abs(window.scrollY - y) > 40 && window.scrollY < y) window.scrollTo(0, y); }, 300);
  } else if (S.scrollTop) { window.scrollTo(0, 0); S.scrollTop = false; } else window.scrollTo(0, scroll);
  if (S.vista === 'cartera') pedirEncajarMovers();
  // desde «Lo que viene» de Cartera: al llegar al calendario, la fecha que tocaste, abierta y resaltada
  if (S.vista === 'agenda' && S.agIr) {
    const id = S.agIr; S.agIr = null;
    setTimeout(() => { const li = document.querySelector(`.ag-e[data-ag-id="${CSS.escape(id)}"]`); if (li) { li.scrollIntoView({ block: 'center' }); li.classList.add('destello'); } }, 60);
  }
  const mb = $('#mercBusca');
  if (mb) {
    const inp = buscador(mb, null, { alCandidato: abrirConsulta, lista: candidatosConsulta(), placeholder: 'Apple, SP500, oro, bitcoin o un ISIN' });
    if (S.mercQ) { inp.value = S.mercQ.v; if (S.mercQ.foco) { inp.focus(); inp.dispatchEvent(new Event('input')); } }
    inp.addEventListener('input', () => { S.mercQ = { v: inp.value, foco: true }; });
    inp.addEventListener('blur', () => { if (S.mercQ) S.mercQ.foco = false; });
  }
  if ((S.radarVisibles || []).length) { S.binds = binds(M); rellenarBinds($('#vista')); }
  dibujar(M);
  if (S.ficha) refrescarFicha();
  S.firmaPintada = firmaRecom(M);
  if (S.senalesSucias && !S.guardandoSenales) { S.senalesSucias = false; S.guardandoSenales = true; setTimeout(() => guardarCarteraCallada('Señales').catch(() => {}).finally(() => { S.guardandoSenales = false; }), 4000); }
  enviarWidget();
  const sv = simsRadarVivos().join();
  if (sv !== S.radarSubs) { S.radarSubs = sv; LIVE.resuscribir(); }
}

// 0.3: sin la cinta de cotizaciones de arriba (lo de los mercados está en Mercados y en la luz de En directo)
function pintarTicker(M) {
  if (!$('#ticker')) return;
  const merc = Object.keys((S.precios && S.precios.mercados) || {});
  const vistos = new Set();
  const pos = M.filas.filter((f) => !vistos.has(f.inst.id) && vistos.add(f.inst.id));
  const firma = merc.join() + '|' + pos.map((f) => f.inst.id).join() + '|' + S.oculto;
  if (firma === S.tickerFirma) return;
  S.tickerFirma = firma;
  const items = merc.map((sym) => `<div class="tk"><span class="tk-n">${esc(S.precios.mercados[sym].nombre)}</span>${B('mp:' + sym, 'tk-p')}${B('mv:' + sym, 'tk-v')}</div>`).join('')
    + `<div class="tk sep">Tu cartera</div>`
    + pos.map((f) => `<div class="tk"><span class="tk-n">${esc(f.inst.corto || f.inst.nombre)}</span>${B('tp:' + f.inst.id, 'tk-p')}${B('tv:' + f.inst.id, 'tk-v')}</div>`).join('');
  const t = $('#ticker');
  t.innerHTML = `<div class="ticker-pista"><div class="ticker-grupo">${items}</div><div class="ticker-grupo" aria-hidden="true">${items}</div></div>`;
  requestAnimationFrame(() => { const g = t.querySelector('.ticker-grupo'); if (g) t.style.setProperty('--dur', Math.max(30, g.scrollWidth / 42) + 's'); });
}

