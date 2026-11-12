/* =====================================================================
   Pintado
   Todo número que cambia en directo va en un <span data-b="clave">: al llegar un precio
   se recalcula la cartera y solo se tocan esos textos (y destellan si suben o bajan).
   ===================================================================== */
/* La marca de GrowFolio (la wF en un lienzo de 48, con __K__ donde van los ids) y la wIA de GrowIA en 24: solo para los
   dibujos de las novedades de antes de la 0.8 y la firma de las respuestas a las opiniones (trozos/respuestas.js) */
const MARCA_WF = '<defs><linearGradient id="__K__d" gradientUnits="userSpaceOnUse" x1="14.9" y1="36.43" x2="31.94" y2="42.33"><stop offset="0" stop-color="#D7A033"/><stop offset="0.22" stop-color="#EDBB45"/><stop offset="0.42" stop-color="#F4CB66"/><stop offset="0.6" stop-color="#F9DE9C"/><stop offset="0.78" stop-color="#FDF0D2"/><stop offset="1" stop-color="#FFFDF6"/></linearGradient><linearGradient id="__K__p" gradientUnits="userSpaceOnUse" x1="0" y1="12.17" x2="0" y2="36.75"><stop offset="0.55" stop-color="#8A5200" stop-opacity="0"/><stop offset="1" stop-color="#8A5200" stop-opacity="0.16"/></linearGradient><path id="__K__s" d="M14.02 30.29L17.21 21.76L20.7 21.76L23.86 30.28L28.51 16.42L34.23 12.17L31.77 19.27L32.76 16.42L41 16.42L41 20.05L31.5 20.05L28.88 27.63L29.75 25.12L36.64 25.12L36.64 28.75L28.49 28.75L25.83 36.43L22.34 36.43L18.95 27.03L15.54 36.43L12.05 36.43L7 21.76L11.16 21.76Z"/><clipPath id="__K__c"><use href="#__K__s"/></clipPath></defs><use href="#__K__s" fill="#FFF6DA"/><g clip-path="url(#__K__c)"><g transform="translate(0 0.36)"><use href="#__K__s" fill="url(#__K__d)"/><use href="#__K__s" fill="url(#__K__p)"/></g></g>';
const MARCA_IA = { d: 'M2.47 15.81L4.5 10.39L6.72 10.39L8.73 15.81L11.69 6.98L15.33 4.28L9.98 19.72L7.76 19.72L5.61 13.74L3.44 19.72L1.21 19.72L-2 10.39L0.65 10.39ZM17.39 6.98L12.98 19.72L10.33 19.72L14.74 6.98ZM26 19.72L23.11 19.72L22.26 17.12L17.59 17.12L16.73 19.72L13.86 19.72L18.17 6.98L21.69 6.98Z', grad: '<linearGradient id="__K__" gradientUnits="userSpaceOnUse" x1="-2.95" y1="19.72" x2="22.9" y2="28.67"><stop offset="0" stop-color="#D7A033"/><stop offset="0.22" stop-color="#EDBB45"/><stop offset="0.42" stop-color="#F4CB66"/><stop offset="0.6" stop-color="#F9DE9C"/><stop offset="0.78" stop-color="#FDF0D2"/><stop offset="1" stop-color="#FFFDF6"/></linearGradient>' };
// cada vez que se pinta, ids nuevos: un degradado con el id repetido deja de verse si el primero se oculta
let ID_MARCA = 0;
const idMarca = (p) => `${p}${++ID_MARCA}`;
const marcaWF = (k = idMarca('mw')) => MARCA_WF.replace(/__K__/g, k);
const svgMarca = (cls = '') => `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 48 48" aria-hidden="true">${marcaWF()}</svg>`;
// 0.8 (paso 3, Carlos, 3 nov): la IA se llama «la IA», sin nombre ni logo (su icono es el bocadillo de la plumilla),
// hasta que se decida otro; se cambia aquí (NOM_TS) y en textoIA. Los títulos llevan data-no-trad: van traducidos aquí
const NOM_TS = ['La IA', 'The AI'];
// (al cargar, IDIOMA y los iconos aún no existen: montar() las pone antes de pintar nada)
let AVATAR_IA = '', NOM_IA = `<span class="ia-nom">${NOM_TS[0]}</span>`;
function marcaIA() {
  AVATAR_IA = `<span class="ia-av-ts">${ICONOS_PL.asistente}</span>`;
  NOM_IA = `<span class="ia-nom">${NOM_TS[IDIOMA === 'en' ? 1 : 0]}</span>`;
  vigilarIA();
}
// «GrowIA» en un texto: «la IA» (o «La IA» al empezar la frase); en inglés, de momento, se queda
function textoIA(s, antes = '') {
  if (!s || IDIOMA === 'en' || !s.includes('GrowIA')) return s;
  return s.replace(/GrowIA/g, (m, i) => { const a = (antes + s.slice(0, i)).trimEnd(); return !a || /[.!?¿¡:«(]$/.test(a) ? NOM_TS[0] : 'la IA'; });
}
const conIA = (es, en = es) => esc(textoIA(L(es, en)));
/* 0.8: los textos de la app ya dicen «la IA». Esto queda de red para lo que no escribe la app: lo que escribieron la IA y
   las Actions antes de la 0.8 (análisis guardados, informes, respuestas) y aún dice «GrowIA». Solo en español; para la
   mayúscula mira lo que va justo antes */
const ATR_IA = ['title', 'aria-label', 'placeholder'];
// (la novedad de la 0.8 «GrowIA ahora es «la IA»» se deja tal cual: es la que cuenta el cambio de nombre)
function nodoIA(raiz) {
  if (!raiz) return;
  const tn = (n) => { const v = n.nodeValue; if (!v.includes('GrowIA') || v.includes('GrowIA ahora es')) return; const p = n.previousSibling || (n.parentElement && n.parentElement.previousSibling); n.nodeValue = textoIA(v, v.trim() === v.trimEnd() && p ? p.textContent || '' : ''); };
  const at = (el) => { for (const a of ATR_IA) { const v = el.getAttribute(a); if (v && v.includes('GrowIA')) el.setAttribute(a, textoIA(v)); } };
  if (raiz.nodeType === 3) return tn(raiz);
  if (raiz.nodeType !== 1 || !raiz.textContent.includes('GrowIA') && !raiz.querySelector('[title*="GrowIA"],[aria-label*="GrowIA"],[placeholder*="GrowIA"]')) return;
  at(raiz);
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeType === 3) tn(n); else if (!/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.nodeName)) at(n);
}
const obsIA = new MutationObserver((ms) => { for (const m of ms) if (m.type === 'childList') m.addedNodes.forEach(nodoIA); else nodoIA(m.target); });
function vigilarIA() {
  obsIA.disconnect();
  if (IDIOMA === 'en' || !document.body) return;
  nodoIA(document.body);
  obsIA.observe(document.body, { childList: true, subtree: true, characterData: true });
}
// los iconos de plumilla de Toisón (Design System, icons.py 1.2): la línea central de cada uno escrita con una
// plumilla elíptica de 2,2 × 1,1 (los verticales, el doble de gruesos que los horizontales, como Ibarra) y puntas
// rectas; el de la IA, en el corte grueso (2,6 × 1,45) porque va a 19 px. Tú, Lo que podrías tener y Novedades
// se han dibujado igual (no estaban en el Design System). Son contornos rellenos: van con fill, nunca con stroke.
// Los trazos van en coordenadas relativas, con un decimal y simplificados a 0,12 (rejilla de 24; a la vista, iguales) para no pasar del presupuesto.
// Desde el paso 3, también los de dentro de las pantallas (de «aviso» a «puntos», en el corte grueso: van a 16-20 px;
// los nuevos que no están en el Design System, con la línea central de los de GrowFolio). ICONOS da el de plumilla de
// cada uno que tiene pareja (PAREJA_PL); el resto, el de trazo.
const PL = (d) => `<svg class="ic-pl" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${d}"/></svg>`;
const ICONOS_PL = {
  cartera: PL('M7.7 3.5l9.9 0 1 .2.9.7.5.8.1 1 1.3 1 .5.7.2.8 0 8.6-.3 1-.7.9-1 .6-1.2.2-13.4 0-1.6-.3-1.3-.9-.5-.8-.2-.9 0-8.2.2-.8.4-.9.7-.6 1.7-.6.2-1 .5-.8.9-.5zM7.1 6l10.8 0 0-.2-.2-.8-.5-.4-9.4 0-.5.4zM18.5 18.9l.7-.3.5-.8.2-2.2-2.7-.1-1.2-.2-1.1-.9-.5-1.3.3-1.3 1.2-1 1.1-.3 2.9-.1 0-1.9-.8-1.2-.6-.2-13-.1-.9.6-.5 1.3 0 8.2.2.8.5.7.6.3zM19.9 11.6l-2.4 0-.3.1-.6 1 0 .7.3.6.6.4 2.4 0z'),
  mercados: PL('M3 8.7l.9-1.6 1.1-1.4 1.4-1.1 1.6-.9 1.8-.5 1.9-.2 1.8.1 1.9.4 1.7.8 1.4 1 1.2 1.2 1 1.6.6 1.5.3 1.8-.1 1.7-.4 1.7-.7 1.7-1.2 1.5-1.5 1.3-1.6.9-1.8.6-2 .2-1.8-.1-1.9-.4-1.7-.8-1.5-1.1-1.2-1.3-1-1.6-.6-1.7-.2-1.8.1-1.7zM8.8 19.1l-.8-1.5-.4-1.5-.5-3.5-2.5 0 .4 1.9.9 1.9 1.3 1.6zM4.6 11.4l2.5 0 .5-3.7.5-1.5.7-1.3-1.6 1.1-1.3 1.6-.9 1.8zM15.2 4.9l.8 1.5.4 1.5.5 3.5 2.5 0-.4-1.9-.9-1.9-1.3-1.6zM19.4 12.6l-2.5 0-.5 3.7-.5 1.5-.7 1.3 1.6-1.1 1.3-1.6.9-1.8zM11.8 19.8l.4 0 .6-.6 1-1.8.6-2.1.3-2.7-5.4 0 .2 2.4.6 2.1.8 1.7zM9.3 11.4l5.4 0-.3-2.5-.5-2.1-.9-1.8-1-.9-1 .9-.8 1.7-.6 2z'),
  expertos: PL('M13.7 12.6l.3.7-.1.8-.3.7-.6.5-.7.3-.8-.1-.7-.3-.5-.6-.3-1.1.3-1 .8-.7.9-.2 1.8-3.1.8-.3 1.2.7zM2.6 11.2l.7-1.7 1-1.5 1.2-1.3 1.6-1 1.7-.7 1.9-.5 2.1 0 1.8.3 1.6.5 1.7 1 1.3 1.2 1.2 1.4.7 1.6.5 1.7.1 1.8-.3 1.8-.5 1.5-.6.9-.6.2-1.3-.7.8-1.8.3-1.7-.1-2-.5-1.7-.9-1.6-1.3-1.5-1.5-1-1.6-.7-2-.1-2.1.5-1.9 1.1-1.6 1.6-1 2.1-.5 2.3.2 2.2.9 2.3-1.3.7-.8-.4-.9-2.3-.3-2.3z'),
  tu: PL('M7.6 6l.7-.8.9-.7 1.1-.5 1.2-.2 1.3 0 1.3.3 1 .6.8.7.7 1 .3 1 .1 1.1-.3 1.2-.6 1-.7.8-1.1.7-1.1.3 1.5.3 1.6.7 1.2.7 1.1 1.1 1 1.3.6 1.3.4 1.8-.1 1-1.8.2-.2-.2-.3-1.9-.5-1.4-.8-1.3-1.1-1.1-1.9-1.1-2-.3-2 .4-1.8 1-1.1 1.2-.7 1.3-.5 1.3-.3 1.9-.2.2-1.8-.2-.1-1 .4-1.8.6-1.3 1-1.3 1.1-1.1 1.2-.7 1.6-.7 1.5-.3-1.9-.8-.9-.7-.6-.9-.4-2 .2-1.1zM11.5 11.5l1.1 0 1.1-.7.7-1 .4-1.3-.1-1.2-.5-1.2-.7-.7-1.2-.5-.9 0-1 .6-.7.9-.5 1.2 0 1.2.4 1.1.9 1.1z'),
  asistente: PL('M7.3 10.9l.2-.7.7-.4.6.2.5.6-.1.7-.7.5-.8-.2zM11 11l.1-.7.6-.5.8.2.5.6-.1.7-.7.5-.8-.2zM14.7 11l.1-.7.6-.5.7.1.6.6-.1.8-.7.5-.8-.2zM2.2 6.4l.2-.8.5-.8.9-.6 1.1-.4 13.7 0 1.6.3 1.1.9.5 1.3 0 8.7-.2 1-1 1.1-1.5.6-6.4 0-4.3 3.3-.9.2-.8-.2-.5-.5 0-2.8-1.3 0-1.2-.4-.9-.7-.5-.9zM11 16.5l1-.2 6.5 0 .5-.5.2-.8 0-8.6-.2-.6-.3-.5-13.2-.1-.5.5-.2.8 0 8.5.2.8.5.5 2.3 0 .7.2.3.5 0 1.2z'),
  paso: PL('M3.1 7l1-.9.8.2.7.7 2.2-2.2.5-.3.4 0 1 .9-3.1 3-.5.3-.7 0-.7-.2zM11.6 7.5l0-1 8.8 0-.2 1zM3.1 13l1-.9.8.2.7.7 2.2-2.2.5-.3.4 0 1 .9-3.1 3-.5.3-.7 0-.7-.2zM11.6 13.5l0-1 8.8 0-.2 1zM3.6 17.5l.5-.7.9-.6 1.3-.2 1.1.1 1 .5.7.7.3.9-.1 1-.5.9-1 .6-1.3.3-1.1-.1-1-.5-.8-.9-.2-1zM6.4 19.9l.4-.3.4-.9-.2-1-.6-.6-.6.5-.2.8.1.8zM11.6 19.5l0-1 8.8 0-.2 1z'),
  objetivos: PL('M7.1 13.4l0 7.7-.3.3-1.6 0-.3-.4.1-17.4 1.8-.1.3.5 10.1 0 1 .3 0 .4-2.5 4 2.5 4 0 .4-1 .3zM7.1 5l0 7.3 8.6 0-2.2-3.7 2.2-3.6z'),
  futuro: PL('M14.6 8.5l0-1 5.4-.1.9.3.2.3-.1 5.2-2 0-.1-2.8-5.9 6-.7.1-.9-.2-2.6-2.3-4.4 4.3-.8.2-1-.9 5.1-5 .5-.3.7 0 .7.2 2.6 2.3 6-6.2z'),
  calendario: PL('M9.1 4.4l5.8 0 .1-1.6 1.8-.2.3.4 0 1.4 2.4.2.9.4.7.6.5 1.3 0 11.6-.3 1.1-.8.9-.9.4-1 .1-13.2 0-1.3-.2-1.2-.9-.5-1.3 0-11.6.2-.9.5-.8 1-.6 1-.2 1.8-.1 0-1.4.3-.4 1.8.2zM6.9 5.6l-1.4 0-.6.4-.3.9 0 2.1 14.8 0 0-2.4-.3-.6-.6-.4-1.4 0 0 1.4-.3.4-1.8-.2-.1-1.6-5.8 0-.1 1.6-1.8.2-.3-.4zM4.6 10l0 8.6.2.8.5.4 13.2.2.6-.6.3-.9 0-8.5z'),
  ajustes: PL('M3.6 7.5l0-1 8.2-.1.4-.9.7-.7 1.6-.5 1.6.1 1 .4.7.7.4.9 2.2.1 0 1-2.2.1-.3.8-.7.7-.8.4-1 .2-1.4-.1-1-.4-.7-.6-.5-1zM14.8 8.6l.4 0 .5-.4.4-1.1-.3-1.1-.8-.6-.8.5-.3 1 .2 1zM3.6 17.5l0-1 2.2-.1.3-.8.7-.7.8-.4 1-.2 1.4.1 1 .4.7.6.5 1 8.2.1-.2 1-8 .1-.3.8-.7.7-.8.4-1 .2-1.4-.1-1.1-.4-.6-.6-.5-1zM8.8 18.6l.4 0 .5-.4.4-1.1-.3-1.1-.8-.6-.8.5-.3 1 .2 1z'),
  novedades: PL('M6 10.6l1.8-1.1 1.5-1.7 1-2 .7-2.5.5-.3.7 0 .9.4.3 1.6.6 1.6.8 1.3 1 1.2 2.2 1.5 1.3.6 1.9.4.4.4-.4.4-1.9.5-1.3.5-2 1.3-1.1 1.2-.8 1.4-.6 1.5-.4 1.8-.6.3-.8.1-.8-.4-.3-1.6-.6-1.6-.9-1.4-1-1.2-2.1-1.5-3.2-.9-.3-.3 0-.2.3-.3 1.9-.4zM12 16.9l1.2-1.8 1.3-1.2 1.6-1.1 1.8-.8-2-.9-1.6-1.1-1.2-1.3-1.1-1.6-1.1 1.6-1.2 1.3-1.6 1.1-2 .9 1.9.8 1.6 1.1 1.3 1.4z'),
  enviar: PL('M19.9 4l.9.2.2.5-6.4 15.4-.4.3-1 .1-.8-.4-2.2-6.3-6.7-1.3-.6-.4 0-.2.4-.3 16-7.5zM16.3 7l-10.3 4.8 4.7.9zM12.3 13.5l1.3 3.6 3.5-8.5-.3.4z'),
  ver: PL('M2.5 10.9l2.1-2.4 2.4-1.8 2.7-1 2.8-.2 2.8.5 2.6 1.3 2.4 2.1 1.8 2.6-2 2.7-2.6 2.3-2.9 1.2-3.1.3-1.8-.2-1.6-.5-1.6-.8-1.5-1.1-1.6-1.7-1.5-2.1zM10.1 17.2l1.2.2 1.3 0 1.2-.2 1.3-.5 1.4-.9 1.2-1.1 2.2-2.7-1.1-1.5-1.4-1.5-1.3-1.1-1.5-.8-1.5-.5-1.5 0-1.4.2-1.3.5-1.4.9-1.2 1.1-2.2 2.7 1.3 1.7 1.5 1.6 1.6 1.1zM8.6 10l1-.9 1.3-.5 1.6-.1 1.5.4 1.2.8.7 1.1.2 1.3-.3 1.3-.9 1.1-1.5.9-1.8.1-1.6-.4-1.3-.9-.7-1.3 0-1.5zM11.8 14.4l.8-.1.7-.6.4-.8.2-.8-.1-.8-.4-.8-.6-.7-.8-.2-.7.2-.6.6-.4.7-.2.8.1.8.4.8.5.6z'),
  aviso: PL('M10.8 3.3l1.2-.4 1.2.4 9.1 16.1 0 .4-.3.3-1 .2-18 0-1.2-.4-.1-.5zM19.2 18.9l-7.2-12.9-7.2 12.9zM10.7 9.6l.2-.4 2.2 0 .2.2 0 5-.2.3-2.2 0-.2-.1zM11 17.3l.1-.8.7-.4.8.1.4.7-.2.8-.5.4-.8-.1z'),
  campana: PL('M4.7 10.6l.3-1.6.8-1.6 1.3-1.4 1.5-1 1.7-.5 1.9-.2 1.6.2 1.7.6 1.9 1.4.8.9.6 1.2.5 2 0 5.7 1.3 1.6.1.5-.5.5-.8.1-14.8 0-.9-.1-.4-.4 0-.4 1.4-1.8zM17.5 17.6l-.8-1.1 0-6.2-.4-1.4-.5-1-1.4-1.4-1.6-.7-1.7 0-1.7.9-1.3 1.4-.7 1.7-.1 6.7-.8 1.1zM9.2 21.4l-.5-.8 1.9-.7.6.3.3.6.5.4.5-.4.3-.6.6-.3 1.9.7-.5.8-.5.6-1.7.6-1.2 0-1-.2z'),
  cerrar: PL('M10.5 12l-5-5 1.2-1.2 1 .4 4.3 4.3 4.3-4.3 1-.4 1.2 1.2-5 5 5 5-1.2 1.2-.6-.1-4.7-4.6-4.3 4.3-1 .4-1.2-1.2z'),
  ok: PL('M2.8 8.7l.9-1.7 1.1-1.3 1.3-1.1 1.7-.9 1.8-.7 2-.2 1.8.1 1.8.4 1.7.7 1.6 1 1.3 1.4 1 1.5.7 1.7.3 1.8-.1 1.7-.4 1.8-.7 1.6-1.1 1.5-1.4 1.3-1.6.9-1.7.7-2 .3-2.1-.1-1.9-.4-1.7-.7-1.6-1-1.3-1.4-1.1-1.6-.6-1.7-.3-1.9.1-1.8zM10.4 19.6l1.3.2 1.5-.1 1.3-.4 1.3-.7 1.1-1 1-1.3.7-1.3.5-1.5.1-1.5-.1-1.5-.5-1.5-.6-1.3-1-1.2-1.1-1-1.3-.7-1.4-.5-1.4-.1-1.3.2-1.3.5-1.3.7-1 .9-.9 1.2-.6 1.3-.5 1.5-.1 1.4.1 1.5.4 1.5.7 1.3.9 1.2.9.9 1.3.8zM7 12.9l1.2-1.2.4 0 .4.2 1.8 1.8 4.4-4.6.8-.2 1.2 1.2-5.2 5.3-.6.4-.9.1-.7-.3z'),
  info: PL('M11 7.9l.2-.8.7-.3.6.2.5.6-.1.7-.7.5-.8-.2zM2.8 8.8l.8-1.7 1.2-1.4 1.3-1.1 1.7-.9 1.8-.7 2-.2 1.8.1 1.8.4 1.6.6 1.6 1.1 1.3 1.3 1.1 1.5.6 1.7.4 1.8-.1 1.7-.3 1.8-.8 1.6-1.1 1.6-1.4 1.3-1.6.9-1.7.7-2 .3-2.1-.1-1.9-.4-1.7-.7-1.6-1-1.3-1.4-1.1-1.6-.6-1.7-.3-1.9.1-1.8zM10.3 19.5l1.3.3 1.6-.1 1.3-.4 1.3-.7 1.1-1 1-1.3.7-1.3.4-1.4.2-1.6-.1-1.5-.5-1.5-.6-1.3-1-1.2-1.1-1-1.3-.7-1.4-.5-1.4-.1-1.2.2-1.3.4-1.3.8-1.1.9-.9 1.2-.6 1.3-.4 1.4-.2 1.5.1 1.5 1 2.7.8 1.1 1 1 1.1.7zM10.7 11l.2-.3 2.2 0 .2.1 0 5.7-.2.4-2.2 0-.2-.2z'),
  suma: PL('M10.7 12.7l-6 0 0-1.4 6 0 0-6.3.2-.3 2.2 0 .2.1 0 6.5 6.1 0 0 1.4-6.1 0 0 6.3-.2.4-2.2 0-.2-.2z'),
  candado: PL('M6.9 6.7l.7-1.4.9-.9 1.1-.6 1.3-.4 1.4-.1 1.5.2 1.3.6 1 .9.7.9.4 1 .1 2.9.9.2 1 .4.6.7.4.8.1 6.7-.2.9-.6.8-.9.6-1.2.3-10.5 0-1.5-.3-1-.7-.5-.8-.2-.7 0-6.6.3-.8.8-.8.9-.5 1-.2 0-2zM9.3 9.8l5.4 0-.1-2.5-.8-1.6-.8-.7-.9-.3-.7.1-1 .6-.6.7-.4 1zM17 19.8l.5-.5.2-.7 0-6.2-.5-1-.2-.2-10 0-.4.4-.3.9 0 6.1.4 1 .3.2zM10.7 14.5l.2-.3 2.3 0 .1 2.3-.2.4-2.2 0-.2-.4z'),
  ocultar: PL('M3.7 9.2l1.4-1.4 2.8-1.7 1.9-.6 2.3-.2 2.3.2 1.9.7 2.7-2.7.8-.2 1.2 1.2-12 12 1.3.5 1.3.3 2.3-.3 1.6-.8 1.6-1.1 1.4-1.6 1.5-2 .5-.2 1.7 1-1.2 1.7-1.3 1.5-1.5 1.2-1.7 1-2.1.8-2.3.2-2.4-.2-2-.7-2.7 2.7-.8.2-1.2-1.2 5.2-5.1-.6-1.1-.2-1.3.3-1.2.6-1.1 1-.9 1.2-.5 1.7-.3 1.9.4.9-.9-1.4-.6-1.4-.2-1.4.1-1.5.6-2.5 1.6-1.5 1.6-1.1 1.7-.6.4-1.8-1zM10.1 12.5l2.7-2.8-.9-.2-.9.5-.8 1.1z'),
  lapiz: PL('M13.6 5.1l1.2-.7 1.2-.3 1.8.1 1.1.5 1 1 .5 1.1.1.9-.4 1.3-10.8 10.9-1.1.3-3.7 0-1-.2-.3-.5 0-3.7.2-.4zM13.4 8.3l-7.6 7.6 0 2.9 1.7 0 8.2-8.2zM17.2 9.1l.6-1 .1-1.1-.6-1.1-.9-.4-.5.3-1 1z'),
  recorte: PL('M4.7 2.5l.2-.4 2.3.1.1 3.1 9.2 0 1.2.4 1 .8.6 1.4 0 9.4 2.6 0 0 1.4-2.6 0 0 2.8-.2.4-2.3-.1-.1-3.1-9.2 0-1.2-.4-1-.8-.6-1.4 0-9.4-2.6 0 0-1.4 2.6 0zM16.7 17.3l0-9.3-.4-1-.3-.3-8.7 0 0 9.3.4 1 .3.3z'),
  subir: PL('M11 4.5l1-.2 1 .2 6 6-1.2 1.2-.6-.1-3.9-3.8 0 11.7-.2.4-2.2 0-.2-.4 0-11.7-3.9 3.8-.6.1-1.2-1.2z'),
  bajar: PL('M10.7 4.5l.2-.3 2.2 0 .2.1 0 11.9 3.9-3.8.6-.1 1.2 1.2-5.8 5.8-.9.4-1.3-.2-6-6 1.2-1.2.6.1 3.9 3.8z'),
  papelera: PL('M8 4l1-.2 6.3 0 .5.1.5.4 0 2 4.1 0 0 1.4-1.4 0-.9 12.2-.3.6-1 .2-9.6 0-.8-.1-.5-.4-.9-12.5-1.4 0 0-1.4 4.1 0 0-1.8zM7.6 7.7l.8 11.6 7.2 0 .8-11.6zM10.3 6.3l3.4 0 0-1.1-3.4 0zM8.7 11l.2-.3 2.2 0 .2.1 0 5.7-.2.4-2.2 0-.2-.2zM12.7 11l.2-.3 2.2 0 .2.1 0 5.7-.2.4-2.2 0-.2-.2z'),
  reintentar: PL('M15.2 9.2l0-1.4 3 0 0-1.5-1.2 1.1-.7-.2-1.7-1.3-1.5-.6-1.8 0-1.5.4-1.7 1.1-1.5 2-.7 2-.1 1.3.1 1.4.8 2 1.4 1.7 1.1.8 1.2.5 1.9.3 1.4-.3 1-.5 1.6-1.2.8-1 .6-1.2.7-3 2.3.1.1.5-.2 1.6-.7 1.8-1.1 1.7-1.4 1.2-1.6 1-1.6.5-2 .2-1.8-.1-1.8-.5-1.6-.8-1.3-1-1-1.1-.8-1.5-.5-1.5-.2-1.6.1-1.6.5-1.5.8-1.4.9-1.1 1.2-1.1 1.5-.8 1.2-.5 1.4-.2 2.1-.1 1.8.4 1.4.5 2.1 1.4 0-1.6.2-.3 2.2 0 .2.3-.1 4.3-1 .4z'),
  ordenar: PL('M2.2 4.7l.6-1.1 1.4-.7 4.7-.1 1.5.3.9.7.5 1 0 4.2-.2.8-.8.9-1.4.5-4.4 0-1.5-.3-.8-.7-.4-.9zM8.8 9.8l.4-.8 0-4-.2-.5-.2-.3-3.6 0-.4.9 0 3.9.2.5.2.3zM12.2 4.7l.6-1.1 1.4-.7 4.7-.1 1.5.3.9.7.5 1 0 4.2-.2.8-.8.9-1.4.5-4.4 0-1.5-.3-.8-.7-.4-.9zM18.8 9.8l.4-.8 0-4-.2-.5-.2-.3-3.6 0-.4.9 0 3.9.2.5.2.3zM2.2 14.7l.6-1.1 1.4-.7 4.7-.1 1.5.3.9.7.5 1 0 4.2-.2.8-.8.9-1.4.5-4.4 0-1.5-.3-.8-.7-.4-.9zM8.8 19.8l.4-.8 0-4-.2-.5-.2-.3-3.6 0-.4.9 0 3.9.2.5.2.3zM12.2 14.7l.6-1.1 1.4-.7 4.7-.1 1.5.3.9.7.5 1 0 4.2-.2.8-.8.9-1.4.5-4.4 0-1.5-.3-.8-.7-.4-.9zM18.8 19.8l.4-.8 0-4-.2-.5-.2-.3-3.6 0-.4.9 0 3.9.2.5.2.3z'),
  orden: PL('M3.6 7.2l0-1.4 10.7 0 0 1.4zM3.6 12.7l0-1.4 7.7 0 0 1.4zM16.7 5l.2-.3 2.2 0 .2.1 0 11.4.7-.7.8-.2 1.2 1.2-2.8 2.8-.9.4-1.4-.3-2.9-2.9 1.2-1.2.8.2.7.7zM3.6 18.2l0-1.4 4.7 0 0 1.4z'),
  copiar: PL('M2.7 5.9l.2-.9.6-.8 1-.6 1-.3 8.6 0 1.1.1.9.5.6.5.5.8.1 2.1 1.2 0 1.2.4.9.7.6 1 .1 8.4-.2.9-.3.7-1.3 1-1.6.3-8.1 0-.9-.2-1-.4-.6-.6-.4-.7-.2-2.1-1.3 0-1.1-.3-.9-.7-.5-.8-.2-.9zM6.7 15.3l0-5.3.5-1.3.9-.9 1.5-.5 5.1 0 0-1.6-.6-.9-8.1-.1-.5.5-.2.8 0 8.2.5.9zM17.8 19.3l.7-.6.2-.9 0-7.7-.2-.8-.7-.6-7.6 0-.4.2-.3.4-.2.8 0 7.7.3 1 .6.5z'),
  descargar: PL('M10.7 4l.2-.4 2.2 0 .2.2 0 8.4 2-2 .6-.4.4 0 1.2 1.2-4.3 4.3-.9.4-1.4-.3-4.4-4.4 1.2-1.2.4 0 .6.4 2 2zM3.7 16.5l.2-.4 2.2 0 .2.4 0 1.9.3.5.4.4 10 0 .4-.4.3-.5 0-1.9.2-.4 2.2 0 .2.4 0 1.8-.3.8-.7.9-1.7.7-11.1 0-1.1-.3-1.2-.9-.5-1.3z'),
  analisis: PL('M2.8 8.8l.8-1.7 1.2-1.4 1.3-1.1 1.7-.9 1.8-.7 2-.2 1.8.1 1.8.4 1.6.6 1.6 1.1 1.3 1.3 1.1 1.5.6 1.7.4 1.8-.1 1.7-.3 1.8-.8 1.6-1.1 1.6-1.4 1.3-1.6.9-1.7.7-2 .3-2.1-.1-1.9-.4-1.7-.7-1.6-1-1.3-1.4-1.1-1.6-.6-1.7-.3-1.9.1-1.8zM10.7 4.4l-2 .7-2 1.7-1.3 2.1-.6 2.4 5.9 0zM11.3 12.7l-6.5 0 .3 1.5.6 1.6 1.7 2.1 2.1 1.4 2.3.5 2.3-.4 1.5-.7 1.1-.9-1.8-1.6zM18 16.2l.8-1.5.4-2-.1-1.9-.5-1.8-.8-1.5-1.3-1.5-1.4-1-1.8-.6 0 7.4z'),
  fiscalidad: PL('M7.6 10.5l.7-.4.8-.3 1.7.2.7.4.4.6 0 1.1-.6.8-.8.4-1 .1-1.1-.2-.8-.5-.3-.6 0-.9zM3.7 4.7l.2-.7.6-.6 1.2-.6 8.7 0 .7.1.6.3 4.6 4.6 0 11.2-.2.8-.3.5-1 .7-1.4.2-11.3 0-1.1-.3-.7-.5-.4-.7-.2-.7zM12.7 4.2l-6.1 0-.2.4-.1 14.4.4.8 10.6 0 .3-.4.1-10.7-4 0-.9-.4-.1-.4zM16.8 7.3l-1.5-1.5 0 1.5zM14 10.5l.8-.2 1.2 1.2-5.8 5.8-1 .4-1.2-1.2zM12.4 15.4l1.1-.7 1-.1.9.1.7.4.5.6.2.6-.1.6-.3.6-.8.5-1.1.2-1.1-.1-.7-.4-.6-.7-.1-.7z'),
  puntos: PL('M4.3 12.1l.2-.9.8-.4.9.2.5.9-.2.9-.8.4-1-.3zM10.8 12.2l.1-.9.8-.5 1 .2.5.8-.1.9-.9.5-.9-.2zM17.3 12.2l.1-.9.8-.5 1 .2.5.8-.1.9-.9.5-.9-.2z'),
};
const SVG = (d, w = 1.7) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const PAREJA_PL = { alerta: 'aviso', campana: 'campana', cerrar: 'cerrar', ok: 'ok', info: 'info', mas: 'suma', masV: 'puntos', candado: 'candado',
  ojo: 'ver', ojoNo: 'ocultar', lapiz: 'lapiz', recorte: 'recorte', compra: 'subir', venta: 'bajar', papelera: 'papelera', nueva: 'reintentar',
  ordenar: 'ordenar', orden: 'orden', copiar: 'copiar', descargar: 'descargar', analisis: 'analisis', fiscal: 'fiscalidad', perfil: 'tu',
  cartera: 'cartera', mercados: 'mercados', expertos: 'expertos', ajustes: 'ajustes', agenda: 'calendario', plan: 'calendario', ruta: 'paso',
  futuro: 'objetivos', proy: 'futuro', enviar: 'enviar', chispa: 'asistente', growia: 'asistente', globo: 'asistente', bicho: 'aviso' };
const ICONOS = {
  estrella: SVG('<path class="est" d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" stroke-linejoin="round"/>', 1.8),
  stop: SVG('<path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7z"/><path d="M12 8v5M12 16.5v.01"/>', 2),
  compraVenta: SVG('<path d="M8.5 19V5M4.5 9l4-4 4 4" stroke="var(--sube)"/><path d="M15.5 5v14M11.5 15l4 4 4-4" stroke="var(--baja)"/>', 2),
  resultados: SVG('<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5"/><path d="M9.5 17v-2.5M12.5 17v-5M15.5 17v-3.5" stroke-width="2"/>'),
  dividendo: SVG('<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.3c-.5-.9-1.5-1.4-2.6-1.4-1.5 0-2.6.8-2.6 2 0 2.8 5.4 1.4 5.4 4.2 0 1.2-1.2 2-2.8 2-1.2 0-2.3-.5-2.8-1.4M12 6.4v1.5M12 16.2v1.4"/>'),
  banco: SVG('<path d="M3.5 9.3L12 4.2l8.5 5.1z"/><path d="M6 10.5v6.3M10 10.5v6.3M14 10.5v6.3M18 10.5v6.3M3.5 19.8h17"/>'),
  festivo: SVG('<circle cx="12" cy="12" r="8.5"/><path d="M8.2 12h7.6"/>'),
  media: SVG('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>'),
  fiesta: SVG('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M12 12.6l1.2 2.3 2.5.4-1.8 1.8.4 2.5-2.3-1.2-2.3 1.2.4-2.5-1.8-1.8 2.5-.4z"/>'),
  aporte: SVG('<path d="M12 3.8v10.4M7.8 10l4.2 4.2 4.2-4.2"/><path d="M4.5 15.5v2.8A1.7 1.7 0 0 0 6.2 20h11.6a1.7 1.7 0 0 0 1.7-1.7v-2.8"/>'),
  calc: SVG('<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01"/>', 1.8),
  micro: SVG('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>', 1.9),
  parar: SVG('<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor"/>', 1.5),
  huella: SVG('<path d="M12 11.5v3a7 7 0 0 1-1.6 4.4"/><path d="M8.7 9.7a3.4 3.4 0 0 1 6.6 1.3v2.4a11 11 0 0 1-.7 3.9"/><path d="M6.3 7.6a6.4 6.4 0 0 1 12.1 3.4v1.4"/><path d="M5.2 13.3V11a7 7 0 0 1 .3-1.9"/><path d="M8.6 13.6v1a8.5 8.5 0 0 1-1.7 5"/><path d="M18.3 15.6a14 14 0 0 1-.8 2.9"/><path d="M8.4 4.2A9.4 9.4 0 0 1 21.3 11"/><path d="M2.7 11.2a9.3 9.3 0 0 1 2.4-6.1"/>', 1.6),
  borrarTecla: SVG('<path d="M9 5h10.5A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>', 1.8),
};
for (const [k, p] of Object.entries(PAREJA_PL)) ICONOS[k] = ICONOS_PL[p];

/* las pestañas, con el nombre corto de la barra del móvil; Plan va dentro de Cartera. Mercados era un icono suelto
   arriba y no se veía: desde la 0.1.17 es una pestaña más */
const VISTAS = [
  ['cartera', 'Cartera', 'Cartera'], ['ruta', 'Paso a paso', 'Pasos'], ['expertos', 'Expertos', 'Expertos'], ['analisis', 'Análisis', 'Análisis'], ['fiscal', 'Fiscalidad', 'Fiscal'], ['futuro', 'Objetivos', 'Objetivos'], ['agenda', 'Calendario', 'Calendario'], ['mercados', 'Mercados', 'Mercados'], ['noticias', 'Noticias', 'Noticias'],
];
// 0.8: las dos que solo tiene Toisón (Cartera con tus posiciones, y Tú)
const VISTAS_APARTE = [['posiciones', 'Análisis', 'Análisis'], ['tu', 'Tú', 'Tú'], ['av', 'Análisis', 'Análisis']];
// el nombre de la pestaña del Paso a paso: en el modo público (0.5) su sitio es «Tu plan», que llega completo en la 0.9
const RUTA_NOM = { get t() { return esPublico() ? 'Tu plan' : 'Paso a paso'; }, get c() { return esPublico() ? 'Plan' : 'Pasos'; }, get en() { return esPublico() ? 'Plan' : 'Steps'; } };
/* 0.8 (rediseño, decidido con Carlos el 2 nov a las 21:44): con un diseño de Toisón la app se ordena de otra forma.
   Abajo, cinco: Cartera · Mercados · Hoy (el medallón, se abre ahí) · Ideas · Tú. Hoy es lo de Inicio sin tus
   posiciones ni el reparto; Cartera lleva tu total en pequeño y Posiciones, Análisis y Hacienda; Ideas es lo de
   Expertos; Tú, tu cuenta, tus objetivos y el Paso a paso (solo fundador y amigos; en estándar, «Tu plan»). La IA va
   arriba, solo con su logo. Las claves de siempre no cambian (Hoy sigue siendo «cartera») */
const GRUPOS = [
  // 0.9 (propuesta A del 3 nov): Cartera pasa a llamarse Análisis y lleva las pestañas del detalle; Hoy, tu plan
  { k: 'posiciones', t: 'Análisis', en: 'Analysis', vistas: ['posiciones', 'av', 'analisis', 'fiscal'] },
  { k: 'mercados', t: 'Mercados', en: 'Markets', vistas: ['mercados'] },
  { k: 'cartera', t: 'Hoy', en: 'Today', vistas: ['cartera', 'noticias', 'agenda'] },
  { k: 'expertos', t: 'Ideas', en: 'Ideas', vistas: ['expertos'] },
  { k: 'tu', t: 'Tú', en: 'You', vistas: ['tu', 'futuro', 'ruta'] },
];
// los bloques de Inicio que van a Cartera y no a Hoy
const EN_CARTERA_TS = new Set(['posiciones', 'reparto']);
function subvistas(k) {
  if (k === 'posiciones') return [['posiciones', 'Posiciones', 'Holdings'], ['analisis', 'Análisis', 'Analysis'], ['fiscal', 'Hacienda', 'Taxes']];
  if (k === 'tu') return [['tu', 'Tu cuenta', 'Your account'], ['futuro', 'Objetivos', 'Goals'], ['ruta', RUTA_NOM.t, RUTA_NOM.en]];
  // 9 nov: en Noticias y Calendario (en Hoy salen tus fijados), las tres de Hoy a mano; en el ordenador ya están en la K2
  if (k === 'cartera') return [['cartera', 'Hoy', 'Today'], ['noticias', 'Noticias', 'News'], ['agenda', 'Calendario', 'Calendar']];
  return null;
}
// las direcciones nuevas (#hoy, #ideas) caen en las claves de siempre
function vistaSegunNav(v) {
  if (v === 'hoy') return 'cartera';
  if (v === 'ideas') return 'expertos';
  return v;
}
// 0.8.3a: Gráfico técnico y Laboratorio están en Más (el sitio de Tú en la barra), aunque se pinten en el trozo de Análisis
// 0.8.6: y Tu año en Toisón, en Hoy
const grupoDe = (v) => (v === 'av' && typeof enHerramientas === 'function' && enHerramientas() ? GRUPOS.find((g) => g.k === 'tu') : v === 'av' && typeof enTuAno === 'function' && enTuAno() ? GRUPOS.find((g) => g.k === 'cartera') : GRUPOS.find((g) => g.vistas.includes(v)) || GRUPOS.find((g) => g.k === 'cartera'));
const epocaRenta = () => { const m = new Date().getMonth(); return m >= 2 && m <= 5; };
function htmlSubvistas() {
  // 0.8.3a: en Hoy, la fila de tus fijados; Herramientas, con la vuelta a Más
  if (S.vista === 'cartera') return htmlFijadosHoy();
  if (enHerramientas()) return htmlHerramientas();
  if (enTuAno()) return htmlTuAnoCab();
  const g = grupoDe(S.vista), sv = subvistas(g.k); if (!sv) return '';
  // 0.3.11a: Hacienda, siempre (antes solo de marzo a junio y aparecía y desaparecía según desde dónde entraras)
  const lista = sv;
  const falta = perfilIncompleto();
  const nav = `<nav class="grupo-tabs" aria-label="${esc(L(g.t, g.en))}">${lista.map(([k, t, en]) => `<a href="#${k}" aria-current="${S.vista === k ? 'page' : 'false'}"${k === 'futuro' && falta ? ' class="falta"' : ''}>${L(t, en)}</a>`).join('')}</nav>`;
  // en Cartera, tu total en pequeño encima (la gráfica está en Hoy) y el título de la pestaña
  // 0.9: sin el patrimonio arriba (ya está en Hoy) y con las pestañas del detalle
  // 0.8.3a: en el ordenador, el título es el de la sección de la K2 y las pestañas están en la segunda barra
  if (g.k === 'posiciones') return `<div class="ts-grupo"><h1 class="ts-tit">${titSeccion('Análisis', 'Analysis')}</h1><p class="ts-sub t-movil">${L('Todo el detalle de tu cartera, por dentro.', 'All the detail of your portfolio, inside out.')}</p>${htmlPestAna()}</div>`;
  if (g.k === 'cartera') return nav.replace('class="grupo-tabs"', 'class="grupo-tabs hoy-sub"');
  if (g.k === 'tu') return `<div class="ts-grupo${S.vista === 'futuro' && S.tuAp ? ' tu-sub' : ''}">${htmlVolverMas()}<h1 class="ts-tit">${titSeccion('Tú', 'You')}</h1>${nav}</div>`;
  return nav;
}
const esVista = (k) => VISTAS.some(([x]) => x === k) || VISTAS_APARTE.some(([x]) => x === k);

/* 0.8.3 (revisión del diseño, 5 nov): en las filas que se deslizan de lado (pestañas de Análisis, Tú, modos del mapa…)
   la palabra cortada en el borde parecía un fallo («stes», «D»). Ahora ese borde se difumina, y solo por el lado por el que
   queda algo: data-desb lleva «i» (queda a la izquierda) y/o «d» (a la derecha); lo pinta 00-temas.css. */
// 0.8.3b: y las tablas anchas de Análisis (Posición a posición, X-Ray…), que en el móvil se deslizan sin que se note
const SEL_DESBORDE = '.pest-av, .grupo-tabs, .mg-tabs, .mapa-modos, .mapa-vistas, .subvistas, .pav-tabla';
function marcarDesborde(el) {
  const izq = el.scrollLeft > 2, der = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
  const v = [izq && 'i', der && 'd'].filter(Boolean).join(' ');
  if ((el.getAttribute('data-desb') || '') !== v) { if (v) el.setAttribute('data-desb', v); else el.removeAttribute('data-desb'); }
}
function marcarDesbordes() { for (const el of document.querySelectorAll(SEL_DESBORDE)) marcarDesborde(el); }
document.addEventListener('scroll', (e) => { const el = e.target; if (el && el.matches && el.matches(SEL_DESBORDE)) marcarDesborde(el); }, true);
addEventListener('resize', () => requestAnimationFrame(marcarDesbordes));

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
  b.totalD = { txt: S.oculto ? '\u202f€' : ',' + String(tC).padStart(2, '0') + '\u202f€', n: tC };
  b.dia = { txt: `${eurS(M.dia)} (${pctS(M.diaPct)})`, n: M.dia, cls: cls(M.dia) };
  // los mismos, redondeados, para Buenos días (que también se pone al día con los precios en directo)
  b.dia0 = { txt: `${eurS(M.dia, 0)} (${pctS(M.diaPct, 2)})`, n: M.dia, cls: cls(M.dia) };
  b.total0 = { txt: eur(M.total, 0), n: M.total };
  b.pl = { txt: `${eurS(M.pl)} (${pctS(M.plPct)})`, n: M.pl, cls: cls(M.pl) };
  b.estado = estadoDirecto();
  for (const [k, o] of porPlataforma(M)) b['plat:' + k] = { txt: eur(o.v, 0), n: o.v };
  const vistos = new Set();
  for (const f of M.filas) {
    const id = f.pos.id;
    b['pv:' + id] = { txt: eur(f.valor), n: f.valor };
    b['pp:' + id] = { txt: precioFmt(f.precio), n: f.precio };
    // lo que hoy no ha cotizado (la bolsa sin abrir, un fondo, el fin de semana): una sola raya (salía «hoy — —»)
    b['pd:' + id] = f.varDia == null ? { txt: '', n: null, cls: '' } : { txt: pctS(f.varDia), n: f.varDia, cls: cls(f.varDia) };
    // lo de hoy también en euros (en la tabla sale con el % debajo)
    b['pdF:' + id] = { txt: pctS(f.varDia), n: f.varDia, cls: cls(f.varDia) };
    b['pdE:' + id] = { txt: f.varDia == null ? '—' : eurS(f.dia, Math.abs(f.dia) < 10 ? 2 : 0), n: f.varDia == null ? null : f.dia, cls: f.varDia == null ? '' : cls(f.dia) };
    b['pw:' + id] = { txt: pct(f.peso, 1), n: f.peso };
    b['pt:' + id] = { txt: pctS(f.plPct, 1), n: f.plPct, cls: cls(f.pl) };
    b['pg:' + id] = { txt: eurS(f.pl, 0), n: f.pl, cls: cls(f.pl) };
    b['pgd:' + id] = { txt: f.coste > 0 ? `${eurS(f.pl, 0)} (${pctS(f.plPct, 1)})` : '—', n: f.pl, cls: cls(f.pl) };
    if (!vistos.has(f.inst.id)) {
      vistos.add(f.inst.id);
      b['tp:' + f.inst.id] = { txt: precioFmt(f.precio), n: f.precio };
      b['tv:' + f.inst.id] = { txt: pctS(f.varUlt), n: f.varUlt, cls: cls(f.varUlt) };
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
    if (vis.has(x.s)) bindsRadar(b, x);
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
/* el precio, lo que ha subido hoy y «puede subir» de una empresa del radar (la tabla de Ideas los enseña con B()) */
function bindsRadar(b, x) {
  b['rp:' + x.s] = { txt: precioR(x.p, x.m), n: x.p };
  b['rv:' + x.s] = { txt: pctS(x.v), n: x.v, cls: cls(x.v) };
  b['ro:' + x.s] = { txt: pctS(x.pot, 1), n: x.pot, cls: cls(x.pot) };
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
// los iconos de la barra con Toisón: Hoy es el medallón con el símbolo
/* 0.8 (paso 4): el símbolo de Toisón (O áurea y T) para el tutorial, la entrada, Primeros pasos y Ajustes */
const simboloTs = (c = '') => `<svg class="simb-ts ${c}" viewBox="-82 -78 164 147" aria-hidden="true"><path class="s-o" d="${TS_O_D}"/><path class="s-t" d="${TS_T_D}"/></svg>`;
// el logo de las pantallas de entrar, crear la cartera y desbloquear: el símbolo en un disco
const logoEntrada = () => `<span class="logo logo-ts">${simboloTs()}</span>`;
const ICONOS_TS = {
  posiciones: () => ICONOS_PL.analisis, mercados: () => ICONOS_PL.mercados, expertos: () => ICONOS_PL.expertos, tu: () => ICONOS_PL.tu,
  cartera: () => `<svg class="nav-med" viewBox="-82 -78 164 147" aria-hidden="true"><path class="s-o" d="${TS_O_D}"/><path class="s-t" d="${TS_T_D}"/></svg>`,
};
function montar() {
  $('#app').innerHTML = `${htmlRiel()}
  <header class="top"><div class="wrap fila-top">
    <div class="marca"><span class="marca-ts" role="img" aria-label="Toisón"><i><svg viewBox="-82 -78 164 147"><path class="s-o" d="${TS_O_D}"/><path class="s-t" d="${TS_T_D}"/></svg></i>${selloDorado()}<b>TOISÓN</b>${marcaDorado()}</span><button class="ver-chip" data-accion="novedades" title="Qué se ha mejorado en esta versión">${VERSION} alfa</button></div>
    <nav class="nav" aria-label="Secciones">${GRUPOS.map((g) => (g.k === 'tu' ? `<a href="#tu" data-ir="tu" data-mas>${L('Más', 'More')}</a>` : `<a href="#${g.k}" data-ir="${g.k}">${L(g.t, g.en)}</a>`)).join('')}</nav>
    ${gtaActivo() ? '<div class="gta-top-w" id="gtaTop"></div>' : ''}
    <div class="estado-w" id="estadoW"><button type="button" class="estado-b" id="estadoB" aria-expanded="false" aria-controls="estadoPanel" title="Cómo están las bolsas"><span id="estado"></span></button><div class="estado-panel" id="estadoPanel" role="region" aria-label="Las bolsas ahora"></div></div>
    <span class="top-mini" id="topMini" aria-hidden="true"></span>
    <div class="acciones">
      <button class="as-boton as-ts" id="bAsesor" data-accion="asesor" title="${L('Pregúntale a la IA por tu cartera', 'Ask the AI about your portfolio')}" aria-label="${L('Pregúntale a la IA', 'Ask the AI')}">${ICONOS_PL.asistente}</button>
      <button class="ib ib-fallo" id="bFallo" data-accion="opinion" title="Es una alfa: avisa de cualquier fallo o idea" aria-label="Avisar de un fallo">${ICONOS.bicho}<span class="fallo-t">Avisar de un fallo</span></button>
      <button class="ib" id="bAjustes" data-accion="ajustes" aria-label="${L('Ajustes', 'Settings')}" title="${L('Ajustes', 'Settings')}">${ICONOS_PL.ajustes || ICONOS.ajustes}</button>
    </div>
  </div></header>
  <main class="wrap" id="vista"></main>
  <nav class="navbar" aria-label="Secciones">${GRUPOS.map((g) => { const k = g.k; if (k === 'tu') return `<a href="#tu" data-ir="tu" data-mas class="nav-mas" aria-haspopup="dialog">${ICONOS_PL.puntos}<span>${L('Más', 'More')}</span></a>`; return `<a href="#${k}" data-ir="${k}"${k === 'cartera' ? ' class="nav-centro"' : ''}>${ICONOS_TS[k]()}<span>${L(g.c || g.t, g.en)}</span></a>`; }).join('')}</nav>`;
  S.tickerFirma = null; marcaIA();
  document.body.classList.add('nav-ts'); marcarModo();
  // la luz de arriba: al pasar el ratón (o tocarla) se despliegan las bolsas
  const ew = $('#estadoW'), eb = $('#estadoB'), ep = $('#estadoPanel');
  const rellena = () => { ep.innerHTML = htmlBolsasPanel(); };
  const abre = (si) => { ew.classList.toggle('abierto', si); eb.setAttribute('aria-expanded', String(si)); if (si) rellena(); };
  ew.addEventListener('mouseenter', rellena);
  eb.addEventListener('click', () => abre(!ew.classList.contains('abierto')));
  // se vuelve a montar al cambiar de diseño: los del documento, una sola vez y con la cabecera de ahora
  S.cierraEstado = (e) => { if (ew.classList.contains('abierto') && (e.type === 'click' ? !ew.contains(e.target) : e.key === 'Escape')) { abre(false); if (e.type === 'keydown') eb.focus(); } };
  if (!S.cierraEstadoPuesto) { S.cierraEstadoPuesto = true; document.addEventListener('click', (e) => S.cierraEstado(e)); document.addEventListener('keydown', (e) => S.cierraEstado(e)); }
  ponerDorado();   // 0.8.3a: Toisón Dorado (42-modos.js)
}

/* Avisos (0.2.2), solo si los activas (Ajustes > Avisos y resumen), en cada dispositivo por separado:
   - en la app de Android, notificaciones del móvil aunque no la tengas abierta: la web le pasa a la app las reglas
     (precio de salida de cada posición, fechas de lo tuyo y las preguntas de GrowIA) y la app las mira cada media
     hora con los precios de la Action, sin abrir la web y sin la contraseña;
   - en el navegador (y en el iPhone con GrowFolio en la pantalla de inicio), mientras GrowFolio esté abierto en
     segundo plano: la misma revisión, cada vez que llegan precios.
   Nunca de noche (de 22:00 a 8:00) y cada cosa una vez. */
const AVISOS_DEF = { on: false, stop: true, mov: true, fechas: true, preg: true, seg: true, lim: true };
const avisosCfg = () => ({ ...AVISOS_DEF, ...LS.get('inv-avisos', {}) });
const appAvisos = () => { const a = window.InversionesApp; return a && typeof a.avisos === 'function' ? a : null; };
function htmlAjAvisos() {
  const c = avisosCfg(), app = window.InversionesApp, nativo = appAvisos();
  const permiso = nativo ? (typeof nativo.avisosPermitidos === 'function' ? nativo.avisosPermitidos() : true) : 'Notification' in window ? Notification.permission === 'granted' : false;
  const donde = nativo ? 'En el móvil, aunque no tengas la app abierta: la app mira cada media hora tus precios de salida, tus fechas, tus límites y si la IA te pregunta algo.'
    : app ? 'Actualiza la app de Android (Ajustes > App de Android) para tener avisos en el móvil.'
    : 'Te avisa el navegador mientras Toisón esté abierto, aunque sea en otra pestaña. Para tenerlos con todo cerrado, la app de Android.';
  const fila = (k, t) => `<label class="av-op"><input type="checkbox" data-av="${k}"${c[k] ? ' checked' : ''}${c.on ? '' : ' disabled'}><span>${t}</span></label>`;
  return `<h3>${ICONOS.campana}Avisos</h3>
    <label class="av-op av-on"><input type="checkbox" data-av="on"${c.on ? ' checked' : ''}${app && !nativo ? ' disabled' : ''}><span><b>Avisarme de lo importante</b><small>${donde}</small></span></label>
    ${c.on && !permiso ? `<p class="nota av-falta">${ICONOS.alerta}Falta el permiso de notificaciones: ${nativo ? 'acéptalo en el aviso del móvil o en Ajustes de Android > Aplicaciones > Toisón > Notificaciones.' : 'acéptalo en el navegador (el candado de la barra de direcciones).'}</p>` : ''}
    <div class="av-ops">${fila('stop', 'Cuando algo baja de tu precio de salida o se acerca a menos de un 3 %')}${fila('mov', 'Cuando una de tus posiciones sube o baja más de un 5 % en el día')}${fila('fechas', 'El día antes de los resultados y los dividendos de lo tuyo')}${fila('preg', 'Cuando la IA te pregunta algo')}${fila('seg', 'Cuando una empresa que sigues llega al precio que le pusiste')}${fila('lim', 'Cuando tu cartera pasa uno de los límites que pusiste en Tú')}</div>
    ${c.on ? '<button type="button" class="btn peq" data-av-prueba>Mandar un aviso de prueba</button>' : ''}${htmlAvisoVersiones(permiso)}`;
}
// el aviso de las versiones nuevas: en la app de Android, aunque no la tengas abierta (mira cada 3 horas si hay versión)
const appVersiones = () => { const a = window.InversionesApp; return a && typeof a.avisosVersiones === 'function' ? a : null; };
function htmlAvisoVersiones(permiso) {
  const a = appVersiones(); if (!a) return '';
  let on = true; try { on = a.avisosVersionesActivados(); } catch (e) {}
  return `<label class="av-op av-on av-ver"><input type="checkbox" data-av-ver${on ? ' checked' : ''}><span><b>Avisarme de las versiones nuevas</b><small>Cuando salga una versión de Toisón, un aviso en el móvil con lo que trae.</small></span></label>
    ${on && !permiso ? `<p class="nota av-falta">${ICONOS.alerta}Falta el permiso de notificaciones: acéptalo en el aviso del móvil o en Ajustes de Android > Aplicaciones > Toisón > Notificaciones.</p>` : ''}`;
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
    <p>Cuando salga una versión de Toisón te llega un aviso al móvil con lo que trae, aunque no tengas la app abierta. Para eso, Android te pedirá permiso para las notificaciones.</p>
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
  if (!ok) toast('Sin el permiso de notificaciones no te llegará ningún aviso. Puedes darlo en Ajustes de Android > Aplicaciones > Toisón.', 6000);
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
  const opc = { body: trad(cuerpo), icon: 'toison-192.png', badge: 'toison-aviso.png', tag: clave || tipo, data: { hash } };
  try { const r = await navigator.serviceWorker.getRegistration(); if (r) { await r.showNotification(trad(titulo), opc); return; } } catch (e) {}
  try { const n = new Notification(trad(titulo), opc); n.onclick = () => { window.focus(); location.hash = hash; n.close(); }; } catch (e) {}
}
// las reglas de hoy: lo que la app de Android revisa sola y lo que el navegador mira al llegar precios
function reglasAvisos(M) {
  // 0.8.2f: w = lo que pesa la posición (en tanto por uno, sumando las de un mismo valor), a = acción suelta, g = c (cripto) u o (oro):
  // con eso la app repasa tus límites con los precios de ahora, sin importes
  const peso = {};
  for (const f of M.filas) if (f.inst && f.valor > 0 && M.total > 0) peso[f.inst.id] = (peso[f.inst.id] || 0) + f.valor / M.total;
  const reglas = M.filas.filter((f) => f.inst && f.valor > 0).map((f) => ({ id: f.inst.id, n: f.inst.corto || f.inst.nombre, sym: f.inst.yahoo ? String(f.inst.yahoo).toUpperCase() : '', cid: f.inst.cat || (catDe(f.inst) ? 'c-' + String(f.inst.isin || '').toLowerCase() : ''), stop: +f.pos.stop || 0, p: f.precio || 0, w: +(peso[f.inst.id] || 0).toFixed(5), a: f.inst.tipo === 'Acción' ? 1 : 0, g: f.inst.clase === 'Cripto' ? 'c' : ['Oro', 'Materias primas'].includes(f.inst.clase) ? 'o' : '' }));
  const vistos = new Set(), unicas = reglas.filter((r) => !vistos.has(r.id) && vistos.add(r.id));
  let eventos = [];
  try { eventos = agendaLista(M, 3).filter((e) => ['resultados', 'dividendo', 'cobro'].includes(e.tipo)).map((e) => { const d = document.createElement('div'); d.innerHTML = e.t; return { k: e.id, d: e.d, t: trad(d.textContent), s: trad(String(e.s || '')) }; }); } catch (e) {}
  const vistas = LS.get('inv-preg-vistas', []);
  const preg = preguntasIA().filter((x) => !preguntaVista(x, vistas)).map((x) => ({ k: clavePreg(x), q: x.q }));
  // 0.3.11: las empresas que sigues, con sus precios de aviso (en euros, los del radar)
  const seguir = siguiendo().filter((x) => x.baja || x.sube).map((x) => ({ sym: x.s, n: x.n, baja: +x.baja || 0, sube: +x.sube || 0 }));
  const limites = { sue: +(S.cartera.limite_acciones ?? 20), cri: limiteDe('cripto'), oro: limiteDe('oro'), emp: limiteDe('empresa') };
  // la caída desde máximos: la app no tiene la historia, así que lleva el límite y cuánto más valía el máximo que hoy (pk, en tanto por uno)
  const lc = limiteCaida(), ca = lc != null ? caidaActual(M) : null;
  if (ca) limites.cai = { l: lc, pk: +ca.pico.toFixed(5) };
  return { reglas: unicas, eventos, preg, seguir, limites };
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
    if (c.mov && f.varDia != null && Math.abs(f.varDia) >= 5) avisoSistema('mov', L(`${n} ${f.varDia > 0 ? 'sube' : 'baja'} un ${fmtNum(Math.abs(f.varDia), 1)} % hoy`, `${n} is ${f.varDia > 0 ? 'up' : 'down'} ${fmtNum(Math.abs(f.varDia), 1)} % today`), L('Abre Toisón para ver qué ha pasado y qué dice la IA.', 'Open Toisón to see what happened and what GrowIA says.'), '#cartera', `mov:${f.inst.id}:${hoy}`);
  }
  // 0.8.2f: tus límites (acciones sueltas, cripto, oro, una empresa). Lo calcula el código con lo que escribiste en Tú:
  // el aviso dice el hecho, sin decirte qué hacer. Una vez por límite cada pocos días mientras siga pasado
  if (c.lim) for (const x of limitesPasados(M)) avisoSistema('lim', x.titulo || L(`${x.t} pasa de tu límite`, `${x.t} is over your limit`), x.cuerpo || L(`Pesa un ${fmtNum(x.actual, 1)} % de tu cartera y tu límite es ${fmtNum(x.limite, 0)} %.`, `It's ${fmtNum(x.actual, 1)} % of your portfolio and your limit is ${fmtNum(x.limite, 0)} %.`), '#tu-limites', `lim:${x.k}:${x.id || ''}`);
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
  const N = (S.precios && S.precios.noticias) || {}, inf = informeVisible(), ia = iaActual();
  const hoyD = new Date(), fecha = hoyD.toLocaleDateString(IDIOMA === 'en' ? 'en-GB' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  // 9 nov: cada cifra dice de qué día es. Un lunes a las 6, lo de «hoy» era lo del viernes (y lo de los fondos, del jueves)
  // 12 nov: «hoy» es hoy, la misma cifra que la casilla de hoy del calendario, la de Inicio y la del widget; y debajo,
  // el último día de bolsa anterior, la misma de su casilla. B() la pone al día con los precios en directo
  if (!S.binds || !S.binds.dia0) S.binds = binds(M);
  const dc = diaDeLaCartera(M), hp = horaPrecios();
  const mueven = [...M.filas].filter((f) => f.dia && Math.abs(f.dia) >= 1).sort((a, b) => Math.abs(b.dia) - Math.abs(a.dia)).slice(0, 3);
  const fichas = [['^IBEX', 'Ibex 35'], ['^STOXX50E', 'Euro Stoxx 50'], ['^GSPC', 'S&P 500'], ['^NDX', 'Nasdaq 100'], ['GC=F', L('Oro', 'Gold')], ['BTC-EUR', 'Bitcoin']].map(([k, n]) => fichaIndice(k, n)).filter(Boolean);
  const mercado = ((inf && inf.mercado) || []).slice(0, 3);
  // titulares: solo de las últimas horas (el fin de semana entero si es lunes), sin páginas de cotización ni noticias
  // viejas que Google vuelve a fechar; los de la bolsa, uno por tema para que no salgan tres del bitcoin
  const h = horasRecientes(30);
  const tuyas = noticiasDeLoTuyo(M, 8).filter((n) => notValida(n, h + 18)).slice(0, 4);
  const generales = (() => {
    const vistos = new Set(), out = [];
    for (const n of (N.mercado || []).filter((x) => notValida(x, h))) { const t = temaNoticia(n); if (vistos.has(t)) continue; vistos.add(t); out.push(n); if (out.length >= 3) break; }
    return out;
  })();
  // de tu comunidad, solo lo que toca tu dinero (impuestos, ayudas, vivienda), de los últimos 3 días y como mucho dos
  const regionales = comunidadUsuario() ? noticiasComunidad(comunidadUsuario(), 2, 3).filter((n) => notValida(n)) : [];
  const prox = (() => { try { return agendaLista(M, 2).filter((e) => !['festivo', 'media'].includes(e.tipo) || e.mio).slice(0, 4); } catch (e) { return []; } })();
  const toca = (() => { try { const P = pasosRuta(M); return [...P.mes, ...P.seis].filter((x) => !x.hecho && !x.auto && x.urgente)[0] || null; } catch (e) { return null; } })();
  // el análisis de la IA puede ser de otro día: se dice
  const iaVieja = ia && ia.fecha && edadHoras(ia.fecha) > 20 ? haceCuanto(ia.fecha) : '';
  const noticia = (n) => `<li><a class="noti" href="${esc(n.u)}" target="_blank" rel="noopener noreferrer" data-no-trad data-nf="${esc(n.f || '')}" data-nd="${esc(n.d || '')}" data-nw="${esc(n.w || '')}"><b>${esc(n.t)}</b></a><small>${n.inst ? `<span class="chip">${esc(n.inst.corto || n.inst.nombre)}</span>` : ''}<span data-no-trad>${esc(n.f || '')}</span>${n.d ? ` · ${esc(haceCuanto(n.d))}` : ''}</small></li>`;
  const movChip = (f) => `<button type="button" class="mv-c ${cls(f.dia)}" data-pos="${esc(f.pos.id)}" title="${esc(L('Abrir su ficha', 'Open its details'))}"><span class="mv-f" aria-hidden="true">${f.dia > 0 ? '▲' : '▼'}</span><b>${esc(f.inst.corto)}</b>${esc(eurS(f.dia, 0))}<small>${esc(pctS(f.varDia, 1))}</small></button>`;
  return `<div class="rdia">
    <p class="rdia-fecha" data-no-trad>${esc(fecha[0].toUpperCase() + fecha.slice(1))}${hp ? ` <span class="rdia-hora">· ${esc(L(`precios de las ${hp}`, `prices at ${hp}`))}</span>` : ''}</p>
    <section class="rdia-car"><span class="k">${L('Tu cartera hoy', 'Your portfolio today')}</span><b class="rdia-tot">${B('total0')}</b>${B('dia0', 'rdia-dia')}
      ${dc.nota ? `<p class="rdia-nota">${esc(dc.nota)}</p>` : ''}
      ${mueven.length ? `<div class="mv-l">${mueven.map(movChip).join('')}</div>` : ''}
      ${dc.antes ? `<dl class="rdia-desg"><div><dt>${esc(dc.antes.t)}</dt><dd class="${cls(dc.antes.e)}">${esc(`${eurS(dc.antes.e, 0)} (${pctS(dc.antes.p, 2)})`)}</dd></div></dl>` : ''}
      ${dc.notaFondos ? `<p class="rdia-nota">${esc(dc.notaFondos)}</p>` : ''}</section>
    ${ia && ia.titular ? `<section class="rdia-ia"><h3 data-no-trad>${conIA('Lo que dice la IA', 'What GrowIA says')}</h3><p>${rellenarIA(ia.titular, valoresIA(M))}</p>${iaVieja ? `<p class="rdia-nota">${esc(L(`Su último análisis es de ${iaVieja}.`, `Its latest review is from ${iaVieja}.`))}</p>` : ''}${toca ? `<p class="rdia-toca"><span class="k">Lo urgente:</span> ${toca.t}</p>` : ''}<a class="enlace acento" href="#analisis" data-cerrar>Ver su análisis</a></section>` : toca ? `<section class="rdia-ia"><h3>Lo que toca</h3><p>${toca.t}</p></section>` : ''}
    ${fichas.length || mercado.length ? `<section><h3>Los mercados</h3>${fichas.length ? `<div class="agp-fichas">${fichas.join('')}</div>` : ''}
      ${fichas.some((x) => x.includes('fi-dia')) ? `<p class="rdia-nota">${esc(L('Lo que lleva un día al lado es su último cierre: esa bolsa aún no ha abierto hoy.', 'A day next to a figure means its last close: that market hasn’t opened yet today.'))}</p>` : ''}
      ${mercado.length ? `<ul class="rdia-merc">${mercado.map((m) => `<li>${chipImpacto(m.impacto)}<span>${escIA(m.t)}</span></li>`).join('')}</ul>` : ''}</section>` : ''}
    ${tuyas.length ? `<section><h3>Noticias de lo tuyo</h3><ul class="rdia-not">${tuyas.map(noticia).join('')}</ul></section>` : ''}
    ${generales.length ? `<section><h3>De la bolsa</h3><ul class="rdia-not">${generales.map(noticia).join('')}</ul></section>` : ''}
    ${regionales.length ? `<section><h3>${L('En', 'In')} ${esc(conArticulo(comunidadUsuario()))}</h3><ul class="rdia-not">${regionales.map(noticia).join('')}</ul></section>` : ''}
    <a class="enlace acento rdia-ver" href="#noticias">${L('Todas las noticias', 'All the news')}</a>
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
/* 0.8.6 · modo discreto: la foto del widget en base 100. Todo lo que es dinero (total, hoy, invertido, lo fijo, el valor y
   las unidades de cada posición y la gráfica) se multiplica por 100 / total: el widget recalcula con los precios igual
   que siempre y le salen los mismos porcentajes, pero en el teléfono no queda guardado cuánto tienes */
function fotoDiscreta(foto) {
  const k = foto.total > 0 ? 100 / foto.total : 0, r = (v) => Math.round(v * k * 1e6) / 1e6;
  return { ...foto, oculto: true, base100: true, total: r(foto.total), dia: r(foto.dia), invertido: r(foto.invertido), fijo: r(foto.fijo),
    toca: String(foto.toca || '').replace(/[−-]?\d[\d.,]*\s?(mil\s)?€|€\s?\d[\d.,]*/g, '••••'),
    pos: foto.pos.map((x) => ({ ...x, valor: r(x.valor), dia: r(x.dia), aj: x.aj ? r(x.aj) : undefined, uds: x.uds ? r(x.uds) : undefined })), serie: foto.serie.map(r) };
}
// encender o apagar el modo discreto: en toda la app, recordado en este dispositivo y, en el móvil, también en el widget
function ponerDiscreto(on) {
  S.oculto = !!on; LS.set('inv-oculto', S.oculto);
  pintar();
  try { enviarWidget(true); } catch (e) {}
}
function enviarWidget(forzar) {
  const app = window.InversionesApp;
  if (!app || !S.cartera || !S.M || S.demo || S.borrandoCuenta) return;
  if (!forzar && Date.now() - widgetT < 60000) return;
  const M = S.M;
  let toca = '', cuando = '';
  try {
    const P = pasosRuta(M), pend = [...P.mes, ...P.seis].filter((x) => !x.hecho && !x.auto);
    const x = pend.find((y) => y.urgente) || pend[0];
    if (x) { const d = document.createElement('div'); d.innerHTML = x.t; toca = trad(d.textContent.replace(/\s+/g, ' ').trim()); cuando = trad(x.cuando || ''); }
  } catch (e) {}
  const pos = M.filas.filter((f) => f.valor).map((f) => ({ id: f.inst.id, n: f.inst.corto || f.inst.nombre, uds: f.uds || undefined, valor: Math.round(f.valor * 100) / 100, dia: Math.round((f.dia || 0) * 100) / 100, aj: f.ajHoy ? Math.round(f.ajHoy * 100) / 100 : undefined }));
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
  // 12 nov: «hoy» es hoy también en el widget: con la fecha de la foto, mañana no repite lo de hoy; y con «aj» (lo
  // comprado hoy, desde su precio de compra) el widget hace la misma cuenta que la app al ponerse al día con los precios
  let foto = { v: 2, hoy: hoyIso(), total: M.total, dia: M.dia, invertido: M.invertido, fijo: M.total - sum(pos, (x) => x.valor), oculto: !!S.oculto, toca, cuando, pos, serie, rango: '1 mes' };
  // 0.8.6 · modo discreto: al teléfono no llega ningún euro, solo la cartera en base 100 (mismos porcentajes y la misma gráfica)
  if (S.oculto) foto = fotoDiscreta(foto);
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
  const vn = vistaSegunNav(S.vista); if (vn !== S.vista) { S.vista = vn; LS.set('inv-vista', vn); }
  const M = calcular(); S.M = M; S.binds = binds(M);
  const gAct = grupoDe(S.vista).k;
  for (const a of $$('[data-ir]')) a.setAttribute('aria-current', a.dataset.ir === gAct ? 'page' : 'false');
  // un punto en Tú (donde están tus objetivos) mientras te falte el perfil
  const faltaP = perfilIncompleto(), kFalta = 'tu';
  for (const a of $$('.nav [data-ir], .navbar [data-ir], .riel [data-ir]')) a.classList.toggle('falta', faltaP && a.dataset.ir === kFalta);
  // lo nuevo de la versión: el botón de su sección lleva «Nuevo» y late hasta que lo ves de verdad
  pintarNavNuevo();
  pintarK2(); apuntarReciente(paginaActual());
  $('#estado').outerHTML = B('estado', 'estado').replace('<span ', '<span id="estado" ');
  pintarGtaTop();
  cancelAnimationFrame(encajarT); encajarT = requestAnimationFrame(encajarCabecera);
  for (const bo of $$('[data-accion="ocultar"]')) { bo.innerHTML = (S.oculto ? ICONOS.ojoNo : ICONOS.ojo) + (bo.dataset.txt != null ? (S.oculto ? L('Mostrar cantidades', 'Show amounts') : L('Ocultar cantidades', 'Hide amounts')) : ''); bo.title = S.oculto ? L('Mostrar importes', 'Show amounts') : L('Ocultar importes', 'Hide amounts'); bo.setAttribute('aria-label', bo.title); bo.setAttribute('aria-pressed', String(!!S.oculto)); }
  pintarTicker(M);
  const scroll = window.scrollY;
  const html = { av: () => htmlPanelAv(), noticias: vistaNoticias, cartera: vistaCartera, posiciones: vistaPosiciones, tu: vistaTu, ruta: vistaRuta, expertos: vistaExpertos, mercados: vistaMercados, analisis: vistaAnalisis, fiscal: vistaFiscal, futuro: vistaFuturo, agenda: vistaAgenda }[S.vista] || vistaCartera;
  setTimeout(() => { plegarNotas($('#vista')); marcarDeslizables($('#vista')); }, 0);
  $('#vista').innerHTML = sinCortes(htmlK2Pest() + htmlSubvistas() + html(M) + `<div class="pie-btns"><button class="opinion-pie" data-accion="opinion">${ICONOS.globo}<span><b>¿Algo se ve mal o tienes una idea?</b> Cuéntanoslo: lo leemos todo.</span></button><button class="opinion-pie tut" data-accion="tour">${ICONOS.ruta}<span><b>Ver el tutorial</b> Qué hay en cada pestaña.</span></button></div><p class="pie" title="La bolsa de Londres llega con 20 minutos de retraso; divisas, cripto y futuros, al instante.">Las bolsas, con 15 minutos de retraso; los fondos, con su precio de cada día. Tus cantidades van cifradas: solo las ves tú. Las visitas se cuentan sin cookies ni datos tuyos.</p>`);
  if (S.scrollA != null) {
    // volviendo atrás: al punto exacto en el que la dejaste (y otra vez en cuanto se haya pintado todo)
    const y = S.scrollA; S.scrollA = null; S.scrollTop = false;
    window.scrollTo(0, y); requestAnimationFrame(() => window.scrollTo(0, y));
    setTimeout(() => { if (Math.abs(window.scrollY - y) > 40 && window.scrollY < y) window.scrollTo(0, y); }, 300);
  } else if (S.scrollTop) { window.scrollTo(0, 0); S.scrollTop = false; } else window.scrollTo(0, scroll);
  if (S.vista === 'cartera') { if ($('[data-que-es]')) ponerQueEs($('#vista')); pedirEncajarMovers(); }
  // 0.9: una pestaña del modo avanzado se llena después (su código va en un trozo aparte)
  if (S.vista === 'av' && $('#panelAv')) pintarPanelAv();
  // Noticias: igual, su contenido está en el trozo «noticias»
  if (S.vista === 'noticias' && $('#panelNot')) pintarNoticias();
  ponerPreguntale($('#vista')); marcarCifras($('#vista')); pulirHoy(M); if (grupoDe(S.vista).k === 'posiciones') centrarPest();
  if (S.irPlan && S.vista === 'cartera') { S.irPlan = false; setTimeout(() => { const p = $('.car-plan'); if (p) p.scrollIntoView({ block: 'start' }); }, 60); }
  if (S.vista === 'tu') activarSelectorTema($('#vista'));
  if (S.vista === 'futuro' && S.tuForm) restaurarFormTu();
  // desde «Lo que viene» de Cartera: al llegar al calendario, la fecha que tocaste, abierta y resaltada
  if (S.vista === 'agenda' && S.agIr) {
    const id = S.agIr; S.agIr = null;
    setTimeout(() => { const li = document.querySelector(`.ag-e[data-ag-id="${CSS.escape(id)}"]`); if (li) { li.scrollIntoView({ block: 'center' }); li.classList.add('destello'); } }, 60);
  }
  const mb = $('#mercBusca');
  if (mb) {
    const inp = buscador(mb, null, { alCandidato: abrirConsulta, lista: candidatosConsulta, placeholder: 'Apple, SP500, oro, bitcoin o un ISIN' });
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
  requestAnimationFrame(marcarDesbordes);
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

