/* ---------- estreno de la 0.2: pantalla completa, una vez ----------
   Para quien venía de la 0.1: lo grande de la versión y, si aún no tiene cuenta, el botón para pasar su cartera. */
function estreno02(visto, despues) {
  const quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const d = document.createElement('div');
  d.className = 'estreno' + (quieto ? ' quieta' : ''); d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'GrowFolio 0.2');
  const nom = nombreUsuario();
  // lo que viene de verdad en tu cartera, si ya está abierta; si no, un ejemplo
  let prox = [];
  try { if (S.M) prox = agendaLista(S.M, 60).filter((e) => e.d >= hoyIso()).slice(0, 3); } catch (e) { prox = []; }
  const COL = { res: 'var(--c2)', div: 'var(--up)', eco: 'var(--c3)', apo: 'var(--accent)', otro: 'var(--text-2)' };
  const evs = prox.length ? prox.map((e) => { const [ico, cls] = AG_TIPOS[e.tipo] || AG_TIPOS.otro; return { ico: ICONOS[ico] || ICONOS.agenda, col: COL[cls] || COL.otro, t: e.t, f: faltan(e.d, true) }; })
    : [{ ico: ICONOS.dividendo, col: COL.div, t: L('Dividendo de una de tus acciones', 'A dividend from one of your stocks'), f: L('3 días', '3 days') },
       { ico: ICONOS.resultados, col: COL.res, t: L('Resultados de una empresa de tu fondo', 'Earnings from a company in your fund'), f: L('9 días', '9 days') },
       { ico: ICONOS.banco, col: COL.eco, t: L('La Fed decide los tipos, a las 20:00', 'The Fed sets rates, 8 pm Spain'), f: L('2 sem.', '2 wks') }];
  const pasos = [
    { k: 'hola', html: `
      <p class="es-pre">${L('Ya está aquí', "It's here")}</p>
      <h1 class="es-tit"><span>GrowFolio</span><b>0.2</b></h1>
      <p class="es-sub">${L('La versión más grande hasta ahora. Esto es lo que cambia, en un minuto.', 'The biggest version yet. Here is what changes, in a minute.')}</p>
      <div class="es-capitulos">${[[ICONOS.perfil, L('Tu cuenta', 'Your account')], [ICONOS.agenda, L('Calendario', 'Calendar')], [ICONOS.chispa, L('Más cuidada', 'More polished')]].map(([i, t], n) => `<span style="--i:${n}">${i}${t}</span>`).join('')}</div>` },
    { k: 'cuenta', html: `
      <div class="es-ilu es-sync" aria-hidden="true">
        <div class="es-movil"><i class="es-pant"><b></b><em></em><em></em></i></div>
        <svg class="es-arco" viewBox="0 0 200 80"><path d="M10 70 C 60 -10, 140 -10, 190 70" pathLength="1"/><circle r="4"><animateMotion dur="2.4s" repeatCount="indefinite" path="M10 70 C 60 -10, 140 -10, 190 70"/></circle></svg>
        <div class="es-portatil"><i class="es-pant"><b></b><em></em><em></em></i><span></span></div>
        <span class="es-candado">${ICONOS.candado}</span>
      </div>
      <h2 class="es-h">${L('Tu cartera, en tu cuenta', 'Your portfolio, in your account')}</h2>
      <p class="es-p">${L('Entras con Google o con tu correo y tu cartera es la misma en el móvil, en el ordenador y en la app. Lo que cambias en uno aparece solo en los demás; si tocas los dos a la vez, se juntan.', "Sign in with Google or your email and your portfolio is the same on your phone, computer and app. What you change on one shows up on the others; if you edit both at once, they're combined.")}</p>
      <p class="es-chip">${ICONOS.candado}${L('Cifrada con tu contraseña: ni GrowFolio ni Google ven tus cifras', 'Encrypted with your password: neither GrowFolio nor Google can see your numbers')}</p>` },
    { k: 'agenda', html: `
      <div class="es-ilu es-cal" aria-hidden="true">${evs.map((e, n) => `<div class="es-ev" style="--i:${n};--c:${e.col}"><span class="es-ev-i">${e.ico}</span><b>${esc(e.t)}</b><em>${esc(e.f)}</em></div>`).join('')}</div>
      <h2 class="es-h">${L('Lo que viene, en un calendario', "What's coming, in a calendar")}</h2>
      <p class="es-p">${prox.length ? L('Esto es lo próximo de tu cartera.', 'This is what comes next for your portfolio.') + ' ' : ''}${L('Resultados y dividendos de lo que tienes (también de las empresas de dentro de tus fondos), la Fed y el BCE con la hora de España, los días sin bolsa y tus aportaciones. Cada uno, con los días que faltan.', 'Earnings and dividends of what you own (including the companies inside your funds), the Fed and the ECB in Spanish time, market holidays and your contributions. Each one with a countdown.')}</p>` },
    { k: 'pulida', html: `
      <div class="es-ilu es-tel" aria-hidden="true">
        <div class="es-tel-c">
          <p class="es-tel-hola">${esc(saludoHora())}${nom ? `, <b>${esc(nom)}</b>` : ''}</p>
          <i class="es-tel-num"></i><i class="es-tel-l"></i><i class="es-tel-l corta"></i>
          <div class="es-pastillas"><span class="up">+2,4 %</span><span class="down">−0,8 %</span><span class="up">+1,1 %</span></div>
          <nav class="es-barra"><i></i><i></i><i></i><i></i><i></i><b></b></nav>
        </div>
      </div>
      <h2 class="es-h">${L('Más cuidada', 'More polished')}</h2>
      <ul class="es-puntos">
        <li>${L('Negro puro: en pantallas AMOLED el fondo apaga los píxeles.', 'Pure black: on AMOLED screens the background switches pixels off.')}</li>
        <li>${L('Barra nueva: Cartera, Pasos, Expertos, Análisis y Más.', 'New bar: Portfolio, Steps, Experts, Analysis and More.')}</li>
        <li>${L('Te saluda por tu nombre al entrar; tócalo en Cartera para cambiarlo.', 'It greets you by name; tap it in Portfolio to change it.')}</li>
        <li>${L('El widget enseña lo que más se ha movido hoy, en pastillas de color.', 'The widget shows what moved most today, in coloured pills.')}</li>
      </ul>` },
    { k: 'fin', html: `
      <div class="es-ilu es-ok" aria-hidden="true">${ICONOS.ok}</div>
      <h2 class="es-h">${nom ? L(`Todo listo, ${esc(nom)}`, `All set, ${esc(nom)}`) : L('Todo listo', 'All set')}</h2>
      <p class="es-p">${S.cartera ? L('En «¿Qué se ha mejorado?» están todas las novedades, y cada una te lleva hasta donde está.', 'All the news is in "What’s new", and each item takes you to where it is.') : L('Tu cartera de antes no se pierde: al entrar te ofrece subirla a tu cuenta tal cual, con su misma contraseña.', "Your previous portfolio isn't lost: once you sign in it offers to upload it as is, with the same password.")}</p>
      <p class="es-alfa">${ICONOS.bicho}<span>${L('<b>Es una versión alfa.</b> Si ves algo que falla o que se ve raro, avisa con el bichito de arriba (o en Ajustes): llega directo a quien hace GrowFolio y se arregla en la siguiente.', "<b>This is an alpha.</b> If something breaks or looks odd, report it with the bug button at the top (or in Settings): it goes straight to whoever gave you GrowFolio and gets fixed in the next one.")}</span></p>
      <div class="es-btns">${!PERFIL_CUENTA ? `<button class="btn pri es-cta" data-es="cuenta">${L('Pasar mi cartera a una cuenta', 'Move my portfolio to an account')}</button><button class="btn" data-es="luego">${L('Ahora no', 'Not now')}</button>` : `<button class="btn pri es-cta" data-es="ok">${FB.user ? L('Empezar', 'Start') : L('Crear mi cuenta o entrar', 'Create my account or sign in')}</button>`}
        ${S.cartera ? `<button class="enlace es-mas" data-es="nov">${L('Ver todas las novedades de la 0.2', 'See everything new in 0.2')}</button>` : ''}</div>` },
  ];
  d.innerHTML = `<div class="es-fondo" aria-hidden="true"><i></i><i></i><i></i></div>
    <button type="button" class="es-saltar" data-es="saltar">${L('Saltar', 'Skip')}</button>
    <div class="es-pasos" tabindex="-1">${pasos.map((x, i) => `<section class="es-paso es-${x.k}" aria-label="${i + 1} / ${pasos.length}"><div class="es-c">${x.html}</div></section>`).join('')}</div>
    <div class="es-pie"><div class="es-puntos-nav">${pasos.map((_, i) => `<button type="button" data-ir-es="${i}" aria-label="${i + 1}"><i></i></button>`).join('')}</div><button type="button" class="btn pri es-sig" data-es="sig">${L('Siguiente', 'Next')}</button></div>`;
  document.body.appendChild(d);
  LS.set('inv-estreno-02', true); LS.set('inv-estreno-02b', true); LS.set('inv-vino-01', true); LS.set('inv-version', VERSION); LS.set('inv-vnum', 2);
  const cont = d.querySelector('.es-pasos'), secs = [...d.querySelectorAll('.es-paso')], dots = [...d.querySelectorAll('[data-ir-es]')], sig = d.querySelector('.es-sig');
  let actual = -1;
  const marcar = (i) => {
    if (i === actual) return; actual = i;
    secs.forEach((x, n) => x.classList.toggle('on', n === i));
    dots.forEach((x, n) => { x.classList.toggle('on', n === i); x.classList.toggle('visto', n < i); });
    const ult = i === pasos.length - 1;
    sig.hidden = ult; d.querySelector('.es-saltar').hidden = ult;
    vibra && vibra(8);
  };
  const ir = (i) => { i = Math.max(0, Math.min(pasos.length - 1, i)); cont.scrollTo({ left: i * cont.clientWidth, behavior: quieto ? 'auto' : 'smooth' }); marcar(i); };
  let tt; cont.addEventListener('scroll', () => { clearTimeout(tt); tt = setTimeout(() => marcar(Math.round(cont.scrollLeft / Math.max(1, cont.clientWidth))), 60); }, { passive: true });
  const tecla = (e) => { if (e.key === 'ArrowRight') ir(actual + 1); else if (e.key === 'ArrowLeft') ir(actual - 1); else if (e.key === 'Escape') fuera(despues); };
  document.addEventListener('keydown', tecla);
  const fuera = (luego) => { document.removeEventListener('keydown', tecla); d.classList.add('fuera'); setTimeout(() => { d.remove(); if (luego) luego(); }, 450); };
  d.addEventListener('click', (e) => {
    const p = e.target.closest('[data-ir-es]'); if (p) return ir(+p.dataset.irEs);
    const b = e.target.closest('[data-es]'); if (!b) return;
    const a = b.dataset.es;
    if (a === 'sig') ir(actual + 1);
    else if (a === 'saltar') ir(pasos.length - 1);
    else if (a === 'cuenta') cambiarPerfil('cuenta');
    else if (a === 'nov') fuera(() => mostrarNovedades(visto, despues));
    else fuera(despues);
  });
  marcar(0);
  setTimeout(() => sig.focus({ preventScroll: true }), 900);
}
// de una versión a un arreglo suyo (0.4 → 0.4b): sin presentación ni guía, un aviso de lo arreglado
function arreglosVistos(visto, despues) {
  const ns = NOVEDADES.filter((n) => cmpVer(n.v, visto) > 0 && cmpVer(n.v, VERSION) <= 0);
  const a = ns.reduce((t, n) => t + (n.arreglos || []).length, 0), m = ns.reduce((t, n) => t + (n.cosas || []).length, 0);
  marcarNovVista(); LS.set('inv-version', VERSION); LS.set('inv-vnum', 2);
  const que = [a ? L(`${a} ${a === 1 ? 'arreglo' : 'arreglos'}`, `${a} ${a === 1 ? 'fix' : 'fixes'}`) : '', m ? L(`${m} ${m === 1 ? 'mejora' : 'mejoras'}`, `${m} ${m === 1 ? 'improvement' : 'improvements'}`) : ''].filter(Boolean).join(L(' y ', ' and '));
  if (que) setTimeout(() => avisoArreglos(ns, que, visto), 900);
  if (S.cartera) setTimeout(() => { if (S.vista === 'cartera' && !S.ficha) pintar(); }, 60);
  despues();
}
/* 0.4f: el aviso de una versión de arreglos, en una tarjeta que se lee (antes era un mensaje pequeño que se iba solo):
   la versión, su título, los primeros arreglos y «Ver todo», que abre las novedades desde la que tenías */
function avisoArreglos(ns, que, visto, intento = 0) {
  if (document.querySelector('.hoja-fondo, #asesorFondo, .tour, .intro, .estreno, .bloqueo')) { if (intento < 20) setTimeout(() => avisoArreglos(ns, que, visto, intento + 1), 3000); return; }
  $$('.aviso-arr').forEach((x) => x.remove());
  const ult = ns.find((n) => n.v === VERSION) || ns[0] || {}, lista = ns.flatMap((n) => [...(n.cosas || []).map((c) => c.t), ...(n.arreglos || [])]).filter(Boolean);
  const d = document.createElement('div');
  d.className = 'aviso-arr'; d.setAttribute('role', 'status');
  d.innerHTML = `<div class="aa-cab">${ICONOS.chispa}<div><b>GrowFolio ${esc(VERSION)}</b><small>${esc(que)}</small></div><button type="button" class="ib" data-aa="x" aria-label="${L('Cerrar', 'Close')}">${ICONOS.cerrar}</button></div>
    ${ult.t ? `<p class="aa-t">${esc(trad(ult.t))}</p>` : ''}
    <ul class="aa-l">${lista.slice(0, 3).map((x) => `<li>${ICONOS.ok}<span>${esc(trad(x))}</span></li>`).join('')}</ul>
    <div class="aa-pie">${lista.length > 3 ? `<span class="k">${L(`y ${lista.length - 3} más`, `and ${lista.length - 3} more`)}</span>` : '<span></span>'}<button type="button" class="btn peq" data-aa="ver">${L('Ver todo', 'See all')}</button></div>`;
  document.body.appendChild(d);
  const fuera = () => { d.classList.add('fuera'); setTimeout(() => d.remove(), 300); };
  d.querySelector('[data-aa="x"]').onclick = fuera;
  d.querySelector('[data-aa="ver"]').onclick = () => { fuera(); mostrarNovedades(visto, () => {}); };
  // se va sola al rato, salvo que la estés tocando o leyendo con el ratón encima
  let t = setTimeout(fuera, 20000);
  d.addEventListener('pointerenter', () => clearTimeout(t)); d.addEventListener('pointerleave', () => { clearTimeout(t); t = setTimeout(fuera, 8000); });
}
/* qué se ha mejorado: lo nuevo arriba, cada cosa con un «Enséñamelo» que te lleva hasta ella resaltada (como el
   tutorial) y un «Enséñamelo todo» que las recorre en orden. Las versiones anteriores, plegadas una a una con sus
   dibujos y sus textos. */
function mostrarNovedades(desde, alCerrar, lista = false) {
  if ((LS.get('inv-nov-vista') || {}).v !== VERSION) { marcarNovVista(); if (S.cartera) setTimeout(() => { if (S.vista === 'cartera' && !S.ficha) pintar(); }, 60); }
  LS.set('inv-version', VERSION); LS.set('inv-vnum', 2); LS.set('inv-023b-arr', true); LS.set('inv-nov-030', true); LS.set('inv-nov-04', true);
  let nuevas = NOVEDADES.filter((n) => (n.cosas || n.arreglos) && desde && cmpVer(n.v, desde) > 0);
  if (!nuevas.length) nuevas = [NOVEDADES[0]];
  // al estrenar versión, lo nuevo se cuenta bajando (como la presentación); desde Ajustes, la lista
  if (desde && !lista) return novedadesScroll(nuevas, desde, alCerrar);
  const resto = NOVEDADES.filter((n) => !nuevas.includes(n));
  const pasos = [], idx = new Map();
  for (const n of nuevas) for (const c of n.cosas || []) if (c.ir && !esParche(n.v)) { idx.set(c, pasos.length); pasos.push({ ...c.ir, t: c.t, x: c.g || c.x, dib: c.d, nuevo: n.v }); }
  const item = (c, i, ir) => `<li style="--i:${i}">${dibujo(c.d)}<div><b>${esc(c.t)}</b><p>${esc(c.x)}</p>${ir && idx.has(c) ? `<button type="button" class="enlace nov-ir" data-nov-ir="${idx.get(c)}">Enséñamelo</button>` : ''}</div></li>`;
  // los bugs corregidos de cada versión (desde la 0.2.3b), debajo de sus novedades
  const arr = (n) => (n.arreglos && n.arreglos.length ? `<div class="nov-arr"><h4>Arreglos</h4><ul>${n.arreglos.map((a) => `<li>${ICONOS.ok}<span>${esc(a)}</span></li>`).join('')}</ul></div>` : '');
  const bloque = (n) => `<section class="nov-v">
    <div class="nov-cab"><span class="nov-num">${esc(n.v)}</span><span class="nov-alfa">alfa</span><small>${fechaNov(n.f, n.h)}</small></div>
    <h3>${esc(n.t)}</h3>
    <ul class="nov-lista">${(n.cosas || []).map((c, i) => item(c, i, true)).join('')}</ul>${arr(n)}
  </section>`;
  const antes = (n) => `<details class="nov-ant"><summary><span class="nov-num peq">${esc(n.v)}</span><span class="nov-ant-t"><b>${esc(n.t)}</b><small>${fechaNov(n.f, n.h)}</small></span></summary>${n.cosas ? `<ul class="nov-lista">${n.cosas.map((c, i) => item(c, i, false)).join('')}</ul>` : ''}${arr(n)}</details>`;
  // si llevabas tiempo sin entrar, salen todas las que te has perdido, enteras, de la más nueva a la más antigua
  const nBases = new Set(nuevas.map((n) => baseVer(n.v))).size;
  const perdidas = nBases > 1 ? `<p class="nov-perdidas">${dibujo('tour')}<span><b>Te has perdido ${nuevas.length} actualizaciones</b>Desde la ${esc(desde)}, que fue la última que viste. Aquí van todas, de la más nueva a la más antigua.</span></p>` : '';
  const h = hoja(nBases > 1 ? 'Lo que te has perdido' : '¿Qué se ha mejorado?', `<div class="novedades">${perdidas}<div class="nov-guia-fila">${pasos.length ? `<button type="button" class="btn pri nov-todo" data-nov-todo>${ICONOS.chispa}${L('Guíame por lo nuevo', 'Walk me through it')}</button>` : ''}<button type="button" class="btn nov-scroll" data-nov-scroll>${L('Verlas con dibujos', 'See them with drawings')}</button></div>${nuevas.map(bloque).join('')}
    ${resto.length ? `<section class="nov-antes" aria-labelledby="hNovAnt"><h3 id="hNovAnt">Versiones anteriores</h3>${resto.map(antes).join('')}</section>` : ''}
    <button type="button" class="enlace nov-reg" data-nov-reg>Ver el registro completo de versiones</button>
    <div class="fila-btns"><button class="btn" data-tour-ya>Ver el tutorial</button><button class="btn" data-cerrar>Cerrar</button></div>
  </div>`, alCerrar);
  h.el.classList.add('hoja-nov');
  $('[data-nov-reg]', h.el).onclick = () => { h.cerrar(true); abrirRegistro(alCerrar); };
  $('[data-nov-scroll]', h.el).onclick = () => { h.cerrar(true); novedadesScroll(nuevas, desde, alCerrar); };
  const ir = (k) => { h.cerrar(true); if (k === 0) guiaNuevo(alCerrar, pasos); else iniciarTour(k, alCerrar, pasos); };
  $('[data-tour-ya]', h.el).onclick = () => { h.cerrar(true); iniciarTour(0, alCerrar); };
  if (pasos.length) $('[data-nov-todo]', h.el).onclick = () => ir(0);
  for (const b of $$('[data-nov-ir]', h.el)) b.onclick = () => { h.cerrar(true); iniciarTour(0, () => mostrarNovedades(desde, alCerrar, true), [pasos[+b.dataset.novIr]], 'Volver a las novedades'); };
}

/* Las novedades contadas bajando, como la presentación: el número de versión se monta letra a letra y cada cosa
   nueva entra con el scroll (el dibujo desde un lado, el título palabra a palabra, el texto detrás), con su botón
   «Enséñamelo» que te lleva a ella. Al final, verlo todo paso a paso, la lista o seguir. */
const COLORES_NOV = ['#EDBB45', '#F9DE9C', '#D7A033', '#F4CB66', '#FDF0D2'];
function novedadesScroll(nuevas, desde, alCerrar = () => {}, volverA = null) {
  const quieta = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pasos = [], cosas = [];
  // con varias versiones perdidas, cada una con su capítulo (de la más antigua a la de ahora) y condensada: lo que
  // más importa de cada una en grande, el resto en una lista corta; los bugs, todos juntos al final
  const grupos = [];
  for (const n of [...nuevas].reverse()) {   // la 0.2.3b va con la 0.2.3: un capítulo por número
    const base = baseVer(n.v), g = grupos[grupos.length - 1];
    if (g && g.base === base) g.vs.push(n); else grupos.push({ base, vs: [n] });
  }
  // la que se presenta es la versión de número (la 0.4, aunque ya vayas por la 0.4b); varias, si te has perdido más de una
  const varias = grupos.length > 1;
  const ultima = nuevas.find((n) => !esParche(n.v)) || nuevas[0];
  // si son muchas, las cuatro últimas con su capítulo y las de antes, juntas en uno, solo en lista corta
  const muchas = grupos.length > 4, viejas = grupos.length > 5 ? grupos.length - 4 : 0;
  const enGrande = (g, k) => (!varias ? 99 : k < viejas ? 0 : /\.0$/.test(g.base) ? (muchas ? 3 : 4) : muchas ? 1 : 2);
  const escena = (c, k) => `<section class="ix-cap" data-ancla data-lado="${k % 2 ? 'd' : 'i'}" data-color="${COLORES_NOV[k % COLORES_NOV.length]}">
        <div class="ix-cap-in">
          <div class="ix-ilus"><svg class="dib ilus" viewBox="0 0 240 170" aria-hidden="true"><g transform="translate(0 5) scale(2)">${DIBUJOS[c.d] || DIBUJOS.pulido || ''}</g></svg></div>
          <div class="ix-txt"><h2 data-no-trad data-t="${esc(c.t)}" aria-label="${esc(c.t)}"></h2><p>${esc(c.x)}</p>${c.paso != null ? `<button type="button" class="btn ixn-ir" data-nv-ir="${c.paso}">Enséñamelo</button>` : ''}</div>
        </div>
      </section>`;
  let cuerpo = '', ne = 0;
  grupos.forEach((g, k) => {
    const conBase = g.vs.some((n) => n.v === g.base);
    // con su versión de número en la presentación, lo de letra que ya está contado en ella (junta) no se repite
    const todas = g.vs.flatMap((n) => (n.cosas || []).filter((c) => !(c.junta && conBase)).map((c) => ({ ...c, v: n.v }))), suyas = [...todas.filter((c) => !esParche(c.v)), ...todas.filter((c) => esParche(c.v))];
    for (const c of suyas) { const g2 = c.ir && !esParche(c.v); c.paso = g2 ? pasos.length : null; if (g2) pasos.push({ ...c.ir, t: c.t, x: c.g || c.x, dib: c.d, nuevo: c.v }); cosas.push(c); }
    const deBase = suyas.filter((c) => !esParche(c.v)), cuantas = enGrande(g, k), grandes = deBase.length <= cuantas + 1 ? deBase : deBase.slice(0, cuantas), resto = suyas.slice(grandes.length);
    const prin = g.vs.find((n) => n.v === g.base) || g.vs[0], bugs = g.vs.reduce((t, n) => t + ((n.arreglos || []).length), 0);
    if (k === 0 && viejas) {
      const nv = grupos.slice(0, viejas).reduce((t, x) => t + x.vs.reduce((u, n) => u + (n.cosas || []).length, 0), 0);
      cuerpo += `<section class="ixn-capv" data-ancla><div class="ixn-capv-in">
        <h2 class="ixn-capv-v ixn-capv-rango" data-no-trad>${esc(g.vs[0].v)}<span>–</span>${esc(grupos[viejas - 1].vs[grupos[viejas - 1].vs.length - 1].v)}</h2>
        <h3>${L('Lo de antes, en corto', 'The earlier ones, in short')}</h3>
        <p><span data-no-trad>${L(`${viejas} versiones · ${nv} novedades`, `${viejas} versions · ${nv} new things`)}</span></p>
      </div></section>`;
    }
    if (varias && k >= viejas) cuerpo += `<section class="ixn-capv" data-ancla><div class="ixn-capv-in">
        <h2 class="ixn-capv-v" data-no-trad>${esc(g.base)}</h2>
        <h3>${esc(prin.t)}</h3>
        <p><span>${fechaNov(g.vs[g.vs.length - 1].f, g.vs[g.vs.length - 1].h)}</span> · <span data-no-trad>${[suyas.length ? L(`${suyas.length} ${suyas.length === 1 ? 'novedad' : 'novedades'}`, `${suyas.length} new ${suyas.length === 1 ? 'thing' : 'things'}`) : '', bugs ? L(`${bugs} ${bugs === 1 ? 'bug corregido' : 'bugs corregidos'}`, `${bugs} ${bugs === 1 ? 'bug fixed' : 'bugs fixed'}`) : ''].filter(Boolean).join(' · ')}</span></p>
      </div></section>`;
    for (const c of grandes) cuerpo += escena(c, ne++);
    if (resto.length) cuerpo += `<section class="ixn-mas${k < viejas ? ' vieja' : ''}" data-ancla><div class="ixn-mas-in">
        <h3>${grandes.length ? L(`Y además, en la ${esc(g.base)}`, `And also, in ${esc(g.base)}`) : k < viejas ? `<b data-no-trad>${esc(g.vs.map((n) => n.v).join(' y '))}</b> ${esc(prin.t)}` : L(`En la ${esc(g.base)}`, `In ${esc(g.base)}`)}</h3>
        <ul>${resto.map((c, i) => `<li style="--i:${i}" data-nv-abre>${dibujo(c.d)}<div><b>${esc(c.t)}</b><p>${esc(c.x)}</p>${c.paso != null ? `<button type="button" class="enlace" data-nv-ir="${c.paso}">Enséñamelo</button>` : ''}</div></li>`).join('')}</ul>
      </div></section>`;
  });
  const arreglos = nuevas.flatMap((n) => (n.arreglos || []).map((t) => ({ t, v: n.v })));
  const cuenta = [cosas.length ? L(`${cosas.length} ${cosas.length === 1 ? 'novedad' : 'novedades'}`, `${cosas.length} new ${cosas.length === 1 ? 'thing' : 'things'}`) : '', arreglos.length ? L(`${arreglos.length} ${arreglos.length === 1 ? 'bug corregido' : 'bugs corregidos'}`, `${arreglos.length} ${arreglos.length === 1 ? 'bug fixed' : 'bugs fixed'}`) : ''].filter(Boolean).join(' · ');
  const ver = ultima.v, VISIBLES = 10;
  const raiz = document.createElement('div');
  raiz.className = `intro ix ixn${varias ? ' ixn-varias' : ''}${quieta ? ' quieta' : ''}`;
  raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-label', `Novedades de la ${ver}`);
  raiz.innerHTML = `<div class="ix-luz" aria-hidden="true"></div><div class="ix-barra" aria-hidden="true"></div>
    <div class="ix-cab"><span class="intro-marca" style="opacity:1"><img src="growfolio-nombre.svg" alt="GrowFolio"></span><button class="ixn-det" type="button" data-nv="lista">${ICONOS.plan}${L('En detalle', 'In detail')}</button><button class="intro-saltar" type="button" data-nv="fin">Saltar</button></div>
    <div class="ix-scroll" tabindex="-1">
      <section class="ixn-heroe"><div class="ix-escena">
        <p class="ixn-eti" data-no-trad>${varias ? L(`Te has perdido ${grupos.length} versiones`, `You've missed ${grupos.length} versions`) : L('Lo nuevo', "What's new")}</p>
        <h1 class="ix-marca ixn-ver" data-no-trad aria-label="${esc(ver)}">${[...ver].map((l, k, a) => `<span aria-hidden="true" style="--k:${k};--d:${(k - (a.length - 1) / 2).toFixed(1)}">${esc(l)}</span>`).join('')}</h1>
        ${varias ? `<ol class="ixn-ruta" data-no-trad aria-label="${L('Las versiones que te has perdido', 'The versions you missed')}">${(() => { const vs = grupos.map((g) => g.base); const r = vs.length > 6 ? [vs[0], `+${vs.length - 5}`, ...vs.slice(-4)] : vs; return r.map((v, k) => `<li style="--k:${k}"${v === baseVer(ultima.v) ? ' class="hoy"' : v[0] === '+' ? ' class="mas"' : ''}>${esc(v)}</li>`).join(''); })()}</ol>` : ''}
        <div class="ix-lema"><h2>${varias ? L(`Todo lo nuevo desde la ${esc(desde)}, resumido`, `Everything since ${esc(desde)}, in short`) : esc(ultima.t)}</h2><p><span>${fechaNov(ultima.f, ultima.h)}</span> · <span data-no-trad>${cuenta}</span></p></div>
        ${pasos.length ? `<button type="button" class="btn pri ixn-guia" data-nv="todo">${ICONOS.chispa}${L('Guíame por lo nuevo', 'Walk me through it')}</button>` : ''}
        <div class="ix-baja" aria-hidden="true"><span>${L('o ve bajando', 'or scroll down')}</span><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div>
      </div></section>
      ${cuerpo}
      ${arreglos.length ? `<section class="ixn-arr${arreglos.length > VISIBLES ? ' corta' : ''}" data-ancla aria-labelledby="ixnArrT"><div class="ixn-arr-in">
        <h2 id="ixnArrT">Arreglos</h2>
        <ul>${arreglos.map((a, k) => `<li style="--i:${Math.min(k, VISIBLES)}">${ICONOS.ok}<span>${varias ? `<span class="ixn-v">${esc(a.v)}</span>` : ''}${esc(a.t)}</span></li>`).join('')}</ul>
        ${arreglos.length > VISIBLES ? `<button type="button" class="enlace ixn-arr-mas" data-nv="bugs">${L(`Ver los ${arreglos.length}`, `See all ${arreglos.length}`)}</button>` : ''}
      </div></section>` : ''}
      <section class="ix-fin">
        <div class="ix-fin-logo">${logoEntero()}</div>
        <h2>Eso es todo</h2>
        <p>Si algo no va como esperas, dínoslo con el bichito de arriba.</p>
        ${pasos.length ? `<button type="button" class="btn pri" data-nv="todo">${L('Guíame por lo nuevo, paso a paso', 'Walk me through it, step by step')}</button>` : ''}
        <button type="button" class="btn" data-nv="lista">${ICONOS.plan}${L('Ver las notas en detalle', 'See the full notes')}</button>
        <button type="button" class="btn" data-nv="fin">Seguir a mi cartera</button>
      </section>
    </div>`;
  document.body.appendChild(raiz);
  document.body.classList.add('con-ixn');
  const sc = $('.ix-scroll', raiz), heroe = $('.ixn-heroe', raiz), barra = $('.ix-barra', raiz), luz = $('.ix-luz', raiz);
  // los capítulos de cada versión, sus listas cortas y los bugs entran al llegar a ellos
  const entran = $$('.ixn-arr, .ixn-capv, .ixn-mas', raiz);
  if (quieta || !('IntersectionObserver' in window)) entran.forEach((x) => x.classList.add('dentro'));
  else { const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { e.target.classList.add('dentro'); io.unobserve(e.target); } }, { root: sc, threshold: 0.18 }); entran.forEach((x) => io.observe(x)); }
  const anclas = $$('[data-ancla]', raiz), ruta = $('.ixn-ruta', raiz);
  const bloque = $('.ixn-heroe .ix-escena', raiz), baja = $('.ix-baja', raiz), capEls = $$('.ix-cap', raiz);
  const partir = () => capEls.forEach((c) => { const h = $('h2', c), t = trad(h.dataset.t); if (h.dataset.hecho === t) return; h.dataset.hecho = t; h.setAttribute('aria-label', t); h.innerHTML = t.split(' ').map((w) => `<span aria-hidden="true">${esc(w)}</span>`).join(' '); });
  partir();
  const tramo = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a))), ease = (t) => 1 - Math.pow(1 - t, 3);
  let medidas = null, raf = 0, color = '';
  const medir = () => { const vh = sc.clientHeight; medidas = { vh, alto: heroe.offsetHeight, caps: capEls.map((c) => ({ c, top: c.offsetTop, h: c.offsetHeight, palabras: $$('h2 span', c), ilus: $('.ix-ilus', c), p: $('.ix-txt p', c), b: $('.ixn-ir', c), lado: c.dataset.lado === 'd' ? 1 : -1 })) }; };
  const pinta = () => {
    raf = 0; if (!medidas) medir();
    const { vh } = medidas, y = sc.scrollTop, H = sc.scrollHeight - vh;
    barra.style.transform = `scaleX(${H > 0 ? Math.min(1, y / H) : 0})`;
    const p = quieta ? 0.6 : Math.min(1, Math.max(0, y / Math.max(1, medidas.alto - vh)));
    // el número de versión, cifra a cifra; luego el título; al final se va hacia arriba
    // al irse, todo el bloque sube y se apaga junto (antes el título subía y las versiones no, y se pisaban)
    const sale = ease(tramo(p, 0.7, 1));
    bloque.style.transform = sale > 0.001 ? `translateY(${(-sale * 40).toFixed(1)}px)` : '';
    bloque.style.opacity = (1 - sale).toFixed(3);
    const le = 1;
    baja.style.opacity = (1 - tramo(p, 0, 0.1)).toFixed(3);
    luz.style.setProperty('--luz', (0.5 + 0.4 * le).toFixed(3));
    let mejor = null;
    for (const m of medidas.caps) {
      const q = quieta ? 0.5 : (y + vh - m.top) / (vh + m.h);
      if (q < -0.1 || q > 1.1) continue;
      const ei = ease(tramo(q, 0.08, 0.38)), ex = tramo(q, 0.66, 0.94), fi = 1 - ei;
      m.ilus.style.transform = `translate(${(m.lado * fi * 16).toFixed(2)}vw, ${(fi * 40 - ex * 60).toFixed(1)}px) rotate(${(m.lado * fi * 9).toFixed(2)}deg) scale(${(0.78 + 0.22 * ei).toFixed(3)})`;
      m.ilus.style.opacity = (ei * (1 - ex)).toFixed(3);
      m.palabras.forEach((w, k) => { const e = ease(tramo(q, 0.16 + k * 0.025, 0.34 + k * 0.025)); w.style.transform = `translateY(${((1 - e) * 0.6 - ex * 0.4).toFixed(3)}em)`; w.style.opacity = (e * (1 - ex)).toFixed(3); });
      const pe = ease(tramo(q, 0.28, 0.46));
      for (const el of [m.p, m.b]) if (el) { el.style.transform = `translateY(${((1 - pe) * 26 - ex * 30).toFixed(1)}px)`; el.style.opacity = (pe * (1 - ex)).toFixed(3); }
      if (q > 0.25 && q < 0.75 && (!mejor || Math.abs(q - 0.5) < Math.abs(mejor.q - 0.5))) mejor = { q, c: m.c.dataset.color };
    }
    const nuevoColor = mejor ? mejor.c : '#EDBB45';
    if (nuevoColor !== color) { color = nuevoColor; raiz.style.setProperty('--ixg', color); }
  };
  const pedir = () => { if (!raf) raf = requestAnimationFrame(pinta); };
  const redim = () => { medidas = null; pedir(); };
  sc.addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', redim);
  const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(); } };
  document.addEventListener('keydown', tecla, true);
  let quitarAtras = () => {};
  const quitar = (desdeAtras) => { if (!raiz.isConnected) return; raiz.remove(); document.body.classList.remove('con-ixn'); removeEventListener('resize', redim); document.removeEventListener('keydown', tecla, true); if (raf) cancelAnimationFrame(raf); if (desdeAtras !== true) quitarAtras(); };
  const cerrar = () => { quitar(); alCerrar(); };
  quitarAtras = conAtras(() => { quitar(true); alCerrar(); }, raiz);   // «Atrás» la cierra en vez de salir de la app
  raiz.addEventListener('click', (e) => {
    const ir = e.target.closest('[data-nv-ir]');
    if (ir) {
      const k = +ir.dataset.nvIr, cap = anclas.indexOf(ir.closest('[data-ancla]'));
      quitar(); iniciarTour(0, () => novedadesScroll(nuevas, desde, alCerrar, cap), [pasos[k]], 'Volver a las novedades'); return;
    }
    const ab = e.target.closest('[data-nv-abre]'); if (ab) { ab.classList.toggle('abierta'); return; }   // la lista corta, entera al tocarla
    const b = e.target.closest('[data-nv]'); if (!b) return;
    if (b.dataset.nv === 'fin') cerrar();
    else if (b.dataset.nv === 'todo') { quitar(); guiaNuevo(alCerrar, pasos); }
    else if (b.dataset.nv === 'lista') { quitar(); mostrarNovedades(desde, alCerrar, true); }
    else if (b.dataset.nv === 'bugs') { b.closest('.ixn-arr').classList.remove('corta'); b.remove(); medidas = null; }
  });
  if (volverA != null && anclas[volverA]) { const a = anclas[volverA]; a.classList.add('dentro'); sc.scrollTop = Math.max(0, a.offsetTop + Math.min(a.offsetHeight, sc.clientHeight) / 2 - sc.clientHeight / 2); medidas = null; }
  pinta();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redim);
  setTimeout(() => sc.focus({ preventScroll: true }), 50);
}
/* registro de cambios: lo mismo que las novedades pero en texto y entero, versión a versión, con la lista
   detallada de cambios de cada una (cambios.json, que sale del historial del proyecto con scripts/cambios.py) */
async function abrirRegistro(alCerrar) {
  let d = null;
  try { const r = await fetch('cambios.json?v=' + VERSION, { cache: 'no-cache' }); if (r.ok) d = await r.json(); } catch (e) { console.warn(e); }
  const det = new Map(((d && d.versiones) || []).map((x) => [x.v, x.commits || []]));
  const limpia = (t) => esc(String(t).replace(/^(GrowFolio|Bellota|Versión)\s+/i, ''));
  const art = (n) => {
    const cs = det.get(n.v) || [];
    return `<article class="reg-v" id="reg-${esc(n.v)}"><header><h3>Versión ${esc(n.v)}</h3><time datetime="${esc(n.f)}${n.h ? 'T' + esc(n.h) : ''}">${fechaNov(n.f, n.h)}</time></header>
      <p class="reg-t">${esc(trad(n.t))}.</p>
      ${n.cosas ? `<h4>Qué cambia</h4><ul>${n.cosas.map((c) => `<li><b>${esc(trad(c.t))}.</b> ${esc(trad(c.x))}</li>`).join('')}</ul>` : ''}
      ${cs.length ? `<h4>Cambios detallados</h4>${IDIOMA === 'en' ? `<p class="nota">${L('', 'The detailed changelog is in Spanish.')}</p>` : ''}<ul class="reg-det" data-no-trad>${cs.map((c) => `<li>${limpia(c.asunto)}${c.detalle && c.detalle.length ? `<ul>${c.detalle.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>` : ''}
    </article>`;
  };
  const h = hoja('Registro de cambios', `<div class="registro">
      <p class="nota">Todas las versiones de GrowFolio con el día y la hora en que salieron: primero lo que cambia contado en corto y después la lista detallada de lo que se hizo, tal como quedó en el historial del proyecto.</p>
      <nav class="reg-indice" aria-label="Versiones">${NOVEDADES.map((n) => `<a href="#reg-${esc(n.v)}">${esc(n.v)}</a>`).join('')}</nav>
      ${NOVEDADES.map(art).join('')}
      <div class="fila-btns"><button class="btn" data-cerrar>Cerrar</button></div>
    </div>`, alCerrar, true);
  for (const a of $$('.reg-indice a', h.el)) a.onclick = (e) => { e.preventDefault(); const el = $(a.getAttribute('href'), h.el); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
}

