/* =====================================================================
   Idiomas. GrowFolio está escrita en español; en inglés, un diccionario (en.json) cambia los textos
   según van apareciendo en pantalla. Primera fase: pestañas, botones, formularios, la presentación, el
   tutorial y los avisos. Noticias, informes de la IA y parte de los textos siguen en español.
   Los números se buscan como "#": "Tienes 3 posiciones" usa la plantilla "Tienes # posiciones".
   Cambiar de idioma recarga la página.
   ===================================================================== */
const IDIOMAS = [['es', 'Español'], ['en', 'English']];
const IDIOMA = LS.get('inv-idioma', 'es') === 'en' ? 'en' : 'es';
// "Repsol, BAT y IAG" / "Repsol, BAT and IAG": las listas se juntan ya en el idioma de la app
// trozos que se montan en el código (títulos, aria-label, listas) y se traducen antes de pintarse
const trad = (s) => (IDIOMA === 'en' && I18N.dic ? traducirTexto(s) ?? s : s);
// «BAT e IAG»: delante de i- o hi- (sin diptongo: «hielo» no) la y pasa a e
const yLista = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')}${IDIOMA === 'en' ? ' and ' : /^h?[iíIÍ](?![aeouáéóúAEOU])/.test(String(a[a.length - 1]).replace(/^<[^>]*>/, '')) ? ' e ' : ' y '}${a[a.length - 1]}` : a.join(''));
const I18N = { dic: null };
const NUM_I18N = /[-+−]?\d+(?:[.,]\d+)*/g;   // el punto o la coma de después de un número no es suyo («en 2026, que…»)
const ATR_I18N = ['placeholder', 'title', 'aria-label', 'alt', 'data-l'];   // data-l: las etiquetas de las tablas en el móvil
let banderaN = 0;
function banderaIdioma(c) {
  if (c === 'es') return '<svg class="bandera" viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/></svg>';
  const id = 'bd' + (++banderaN);
  return `<svg class="bandera" viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><clipPath id="${id}a"><path d="M0 0v30h60V0z"/></clipPath><clipPath id="${id}b"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath><g clip-path="url(#${id}a)"><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" clip-path="url(#${id}b)" stroke="#C8102E" stroke-width="4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></g></svg>`;
}
// el menú de la bandera de la cabecera, entre «Avisar de un fallo» y Ajustes
function menuIdioma(btn) {
  const viejo = $('#menuIdioma'); if (viejo) { viejo.cerrar(); return; }
  const m = document.createElement('div');
  m.id = 'menuIdioma'; m.className = 'menu-idioma'; m.setAttribute('role', 'menu'); m.setAttribute('aria-label', 'Idioma / Language'); m.dataset.noTrad = '';
  m.innerHTML = IDIOMAS.map(([c, n]) => `<button type="button" role="menuitemradio" aria-checked="${c === IDIOMA}" data-idioma="${c}" lang="${c}">${banderaIdioma(c)}<span>${n}</span>${c === IDIOMA ? '<span class="mi-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>' : ''}</button>`).join('');
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect();
  m.style.top = Math.round(r.bottom + 6) + 'px';
  m.style.right = Math.max(8, Math.round(innerWidth - r.right)) + 'px';
  btn.setAttribute('aria-expanded', 'true');
  const fuera = (e) => { if (!m.contains(e.target) && !btn.contains(e.target)) m.cerrar(); };
  const tecla = (e) => {
    const bs = [...m.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
    if (e.key === 'Escape') { m.cerrar(); btn.focus(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); bs[(i + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus(); }
  };
  m.cerrar = () => { m.remove(); btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', fuera, true); document.removeEventListener('keydown', tecla); removeEventListener('resize', m.cerrar); removeEventListener('scroll', m.cerrar, true); };
  setTimeout(() => { document.addEventListener('pointerdown', fuera, true); addEventListener('resize', m.cerrar); addEventListener('scroll', m.cerrar, true); }, 0);
  document.addEventListener('keydown', tecla);
  (m.querySelector('[aria-checked="true"]') || m.querySelector('button')).focus({ preventScroll: true });
}
function selectorIdioma(clase = '') {
  return `<div class="idiomas ${clase}" role="group" aria-label="Idioma / Language" data-no-trad>${IDIOMAS.map(([c, n]) => `<button type="button" data-idioma="${c}" aria-pressed="${c === IDIOMA}" lang="${c}">${banderaIdioma(c)}<span>${n}</span></button>`).join('')}</div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-idioma]'); if (!b) return;
  e.preventDefault();
  if (b.dataset.idioma === IDIOMA) return;
  LS.set('inv-idioma', b.dataset.idioma);
  location.reload();
});
// los importes llevan un espacio duro antes del € (así no se parten): para buscar se usa uno normal y
// en la traducción se vuelve a pegar el número a su € o %
function traducirTexto(s) {
  if (!s || !I18N.dic) return null;
  if (!/[  ]/.test(s)) return traducirTextoN(s);
  const t = traducirTextoN(s.replace(/[  ]/g, ' '));
  return t == null ? null : t.replace(/(\d) (€|%)/g, '$1 $2');
}
function traducirTextoN(s) {
  const d = I18N.dic;
  let t = d[s]; if (t != null) return t;
  const nums = [];
  const k = s.replace(NUM_I18N, (m) => { nums.push(m); return '#'; });
  if (nums.length && (t = d[k]) != null) {
    let i = 0;
    return t.replace(/\{(\d)\}|#/g, (m, n) => (n ? nums[+n - 1] : nums[i++]) ?? m);
  }
  // plantillas con nombres dentro: "Abrir la ficha de Repsol" → "Open Repsol details". Cada trozo
  // variable se traduce a su vez (países, sectores…) y si no está, se deja tal cual.
  for (const [re, en, clave] of I18N.re || []) {
    if (!s.includes(clave)) continue;
    const m = re.exec(s);
    // un hueco de la plantilla es un nombre o una cifra: si se traga media frase (un texto de GrowIA que empieza igual), no vale
    // 0.4: un hueco largo vale si a su vez es una frase que se sabe traducir («…, partiendo de lo que tienes y aportando 16.000 € más»)
    if (m && m.slice(1).every((g) => !g || g.length <= 48 || traducirTexto(g.trim()) != null)) return en.replace(/\$(\d)/g, (_, n) => { const g = m[+n] || ''; return traducirTexto(g.trim()) ?? g; });
  }
  // frases que empiezan igual y siguen con datos: "Lo que más mueve hoy: Repsol +2 %…"
  for (const [es, en] of I18N.pre || []) if (s.startsWith(es)) return en + s.slice(es.length);
  return null;
}
function traducirTN(n) {
  const v = n.nodeValue;
  if (!v || !/[A-Za-zÁÉÍÓÚáéíóúÑñ¿¡]/.test(v)) return;
  const s = v.trim(), t = traducirTexto(s);
  if (t == null || t === s) return;
  const i = v.indexOf(s);
  n.nodeValue = v.slice(0, i) + t + v.slice(i + s.length);
}
function traducirAtr(el) {
  for (const a of ATR_I18N) {
    const v = el.getAttribute(a); if (!v) continue;
    const t = traducirTexto(v.trim());
    if (t != null && t !== v) el.setAttribute(a, t);
  }
}
const SALTA_I18N = (el) => /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(el.nodeName) || el.hasAttribute('data-no-trad');
function traducirNodo(raiz) {
  if (!I18N.dic || !raiz) return;
  if (raiz.nodeType === 3) { const p = raiz.parentElement; if (p && !p.closest('[data-no-trad], script, style, textarea')) traducirTN(raiz); return; }
  if (raiz.nodeType !== 1 || SALTA_I18N(raiz) || (raiz.parentElement && raiz.parentElement.closest('[data-no-trad], textarea'))) return;
  traducirAtr(raiz);
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: (n) => (n.nodeType === 1 && SALTA_I18N(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.nodeType === 3) traducirTN(n); else traducirAtr(n); }
}
const obsI18N = new MutationObserver((ms) => {
  for (const m of ms) {
    if (m.type === 'childList') m.addedNodes.forEach(traducirNodo);
    else if (m.type === 'characterData') traducirNodo(m.target);
    else if (m.type === 'attributes' && m.target.nodeType === 1 && !m.target.closest('[data-no-trad]')) traducirAtr(m.target);
  }
});
// en inglés: se espera al diccionario (como mucho 2,5 s) antes de enseñar nada, para no ver el cambio
async function cargarIdioma() {
  if (IDIOMA !== 'en') return;
  const raiz = document.documentElement;
  raiz.lang = 'en'; raiz.classList.add('i18n-carga');
  const ver = setTimeout(() => raiz.classList.remove('i18n-carga'), 2500);
  try {
    const r = await fetch('en.json?v=' + VERSION);
    if (r.ok) { const j = await r.json(); I18N.dic = j.t || null; I18N.pre = Object.entries(j.p || {}).sort((x, y) => y[0].length - x[0].length); I18N.re = (j.r || []).map(([p, en, c]) => [new RegExp(p), en, c]); }
  } catch (e) { console.warn('Sin diccionario de inglés', e); }
  clearTimeout(ver);
  if (I18N.dic) {
    traducirNodo(document.body);
    document.title = traducirTexto(document.title) || document.title;
    obsI18N.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATR_I18N });
    // 0.4: ya está todo en inglés; el aviso de «versión en curso» deja de salir
  }
  raiz.classList.remove('i18n-carga');
}
// la franja de arriba: el inglés está a medias
function avisoIngles() {
  try { if (sessionStorage.getItem('inv-aviso-en')) return; } catch (e) {}
  const d = document.createElement('div');
  d.className = 'aviso-idioma'; d.setAttribute('data-no-trad', ''); d.setAttribute('role', 'note');
  d.innerHTML = `${banderaIdioma('en')}<p><b>English version in progress.</b> News, AI reports and some texts are still in Spanish.</p><button type="button" class="ai-es" data-idioma="es">${banderaIdioma('es')}Español</button><button type="button" class="ai-x" aria-label="Close">${ICONOS.cerrar}</button>`;
  d.querySelector('.ai-x').onclick = () => { d.remove(); try { sessionStorage.setItem('inv-aviso-en', '1'); } catch (e) {} };
  document.body.prepend(d);
}
// lo que se le pide a GrowIA, en el idioma de la app
const notaIdiomaIA = () => (IDIOMA === 'en' ? '\n\nIDIOMA: el usuario usa GrowFolio en inglés. Escribe en inglés todos los textos que vea él (respuestas, resúmenes, motivos, pasos), aunque estas instrucciones y los datos estén en español. Las claves del JSON no se traducen.' : '');

/* El permiso del banco se pidió desde la app de Android, pero el banco (su app, al acabar) devuelve la vuelta al
   navegador del móvil, donde no está tu sesión: se le pasa a la app con el código y allí se termina. Si el permiso se
   pidió en este mismo navegador (está su «inv-banco-pend»), se sigue aquí como siempre. */
function bancoALaApp() {
  const q = new URLSearchParams(location.search);
  if (!q.has('state') || !(q.has('code') || q.has('error')) || q.has('web') || window.InversionesApp || !/Android/i.test(navigator.userAgent) || LS.get('inv-banco-pend', null)) return false;
  const aqui = location.origin + location.pathname + location.search + '&web=1' + location.hash;
  const url = `intent://banco${location.search}#Intent;scheme=inversiones;package=es.inversiones.app;S.browser_fallback_url=${encodeURIComponent(aqui)};end`;
  document.body.innerHTML = `<main class="banco-vuelta"><img src="favicon.svg" alt="" width="64" height="64"><h1>${L('Vuelve a GrowFolio', 'Back to GrowFolio')}</h1><p>${L('El banco ya ha dado el permiso. Ábrelo en la app para terminar de conectar la cuenta.', 'The bank has granted access. Open it in the app to finish connecting the account.')}</p><a class="btn pri" href="${esc(url)}">${L('Abrir la app', 'Open the app')}</a><a class="enlace" href="${esc(aqui)}">${L('Seguir aquí, en el navegador', 'Continue here, in the browser')}</a></main>`;
  setTimeout(() => { location.href = url; }, 250);
  return true;
}
