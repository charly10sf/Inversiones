/* =====================================================================
   Pantallas de entrada: desbloquear y crear
   ===================================================================== */
/* =====================================================================
   Presentación: unas diapositivas al abrir la web por primera vez en un dispositivo (o desde la pantalla
   de entrar), con lo que se puede hacer, y al final el botón para crear tu cartera o entrar.
   ===================================================================== */
const ILUS = {
  notas: '<rect class="fp" x="16" y="8" width="208" height="156" rx="16"/><circle class="fA" cx="40" cy="32" r="11"/><path d="M40 25.5l1.8 4.7 4.7 1.8-4.7 1.8-1.8 4.7-1.8-4.7-4.7-1.8 4.7-1.8z" fill="#1A1408"/><path class="l" d="M60 28h104M60 39h66"/><g class="an1"><text class="tm" x="34" y="68">Diversificación</text><rect class="fA" x="122" y="61" width="14" height="7" rx="3.5"/><rect class="fA" x="140" y="61" width="14" height="7" rx="3.5"/><rect class="fA" x="158" y="61" width="14" height="7" rx="3.5"/><rect class="fA" x="176" y="61" width="14" height="7" rx="3.5"/><rect class="ix-vacio" x="194" y="61" width="14" height="7" rx="3.5"/></g><g class="an2"><text class="tm" x="34" y="92">Costes</text><rect class="fA" x="122" y="85" width="14" height="7" rx="3.5"/><rect class="fA" x="140" y="85" width="14" height="7" rx="3.5"/><rect class="fA" x="158" y="85" width="14" height="7" rx="3.5"/><rect class="fA" x="176" y="85" width="14" height="7" rx="3.5"/><rect class="fA" x="194" y="85" width="14" height="7" rx="3.5"/></g><g class="an3"><text class="tm" x="34" y="116">Riesgo</text><rect class="fA" x="122" y="109" width="14" height="7" rx="3.5"/><rect class="fA" x="140" y="109" width="14" height="7" rx="3.5"/><rect class="fA" x="158" y="109" width="14" height="7" rx="3.5"/><rect class="ix-vacio" x="176" y="109" width="14" height="7" rx="3.5"/><rect class="ix-vacio" x="194" y="109" width="14" height="7" rx="3.5"/></g><g class="an4"><text class="tm" x="34" y="140">Impuestos</text><rect class="fA" x="122" y="133" width="14" height="7" rx="3.5"/><rect class="fA" x="140" y="133" width="14" height="7" rx="3.5"/><rect class="fA" x="158" y="133" width="14" height="7" rx="3.5"/><rect class="fA" x="176" y="133" width="14" height="7" rx="3.5"/><rect class="ix-vacio" x="194" y="133" width="14" height="7" rx="3.5"/></g>',
  get logo() { return `<g transform="translate(43.2 6) scale(3.2)">${marcaWF()}</g><g class="an3"><rect class="fp" x="14" y="128" width="62" height="26" rx="13"/><text class="t" x="25" y="145.5">Fondos</text><rect class="fp" x="84" y="128" width="72" height="26" rx="13"/><text class="t" x="95" y="145.5">Acciones</text><rect class="fp" x="164" y="128" width="62" height="26" rx="13"/><text class="t" x="176" y="145.5">Cripto</text></g>`; },
  pasos: '<rect class="fp" x="20" y="8" width="200" height="40" rx="12"/><circle class="a an1v" cx="44" cy="28" r="10"/><path class="u an1" d="M39 28.5l3.5 3.5 6.5-7"/><path class="l" d="M64 22h100M64 34h66"/><rect class="fp" x="20" y="58" width="200" height="40" rx="12"/><circle class="a an2v" cx="44" cy="78" r="10"/><path class="u an2" d="M39 78.5l3.5 3.5 6.5-7"/><path class="l" d="M64 72h120M64 84h50"/><rect class="fa" x="20" y="108" width="200" height="40" rx="12"/><circle class="a" cx="44" cy="128" r="10"/><path class="l" d="M64 122h90M64 134h70"/><rect class="fA an3" x="170" y="118" width="40" height="20" rx="10"/><text class="tn an3" x="179" y="132">IRPF</text>',
  ia: '<rect class="fp an1" x="96" y="8" width="128" height="34" rx="14"/><text class="t an1" x="110" y="30">¿Vendo Repsol?</text><path class="a an2" d="M16 52h150a12 12 0 0112 12v26a12 12 0 01-12 12H44l-14 12v-12H16a12 12 0 01-12-12V64a12 12 0 0112-12z"/><path class="l an2" d="M20 70h120M20 84h90"/><rect class="fa an3" x="30" y="122" width="190" height="34" rx="14"/><text class="ta an3" x="44" y="144">¿Cuándo necesitas el dinero?</text>',
  mundo: '<circle class="l" cx="86" cy="82" r="62"/><path class="m" d="M24 82h124M86 20c-26 18-26 106 0 124M86 20c26 18 26 106 0 124M32 52h108M32 112h108"/><circle class="fA late" cx="62" cy="58" r="6"/><circle class="fA late d2" cx="104" cy="54" r="6"/><circle class="fA late d3" cx="124" cy="80" r="6"/><circle class="fA late d4" cx="72" cy="108" r="6"/><g class="an2"><rect class="fa" x="164" y="34" width="66" height="28" rx="9"/><path class="u" d="M174 54l7-8 6 5 9-11"/><path class="a" d="M202 48h20"/></g><g class="an3"><rect class="fa" x="164" y="72" width="66" height="28" rx="9"/><path class="d" d="M174 80l7 8 6-5 9 11"/><path class="a" d="M202 86h20"/></g><g class="an4"><rect class="fa" x="146" y="110" width="84" height="28" rx="9"/><text class="ta" x="154" y="129">840 empresas</text></g>',
  privada: '<rect class="l" x="70" y="10" width="100" height="150" rx="16"/><path class="m" d="M70 136h100"/><g class="cierra"><path class="a" d="M100 70V56a20 20 0 0140 0v14" stroke-width="5"/></g><rect class="fA" x="90" y="68" width="60" height="46" rx="10"/><circle cx="120" cy="88" r="5" fill="#1A1408"/><path d="M120 92v9" stroke="#1A1408" stroke-width="4" stroke-linecap="round"/><g class="an3"><rect class="fp" x="178" y="44" width="54" height="24" rx="12"/><text class="t" x="184" y="60">cifrada</text><rect class="fp" x="8" y="98" width="56" height="24" rx="12"/><text class="t" x="15" y="114">solo tú</text></g>',
};
const INTRO = [
  { il: 'logo', t: 'Tu dinero, con una IA que te dice qué hacer', x: 'Fondos, acciones, ETF, oro y cripto de cualquier bróker, juntos y con precios en directo. GrowIA los estudia y te dice qué hacer con ellos.' },
  { dib: 'grafica', donde: 'cartera', t: 'Todo lo que tienes, de un vistazo', x: 'Tu patrimonio, lo que ganas hoy y desde que compraste, y la gráfica de cualquier periodo. Tus posiciones, justo debajo.' },
  { il: 'pasos', donde: 'ruta', t: 'Qué hacer cada mes', x: 'Comprar, vender, aportar o esperar, en orden y con el porqué. Con lo que pagarás a Hacienda. Lo haces y lo marcas.' },
  { il: 'notas', donde: 'analisis', t: 'GrowIA revisa tu cartera', x: 'Cada día lee las noticias y repasa lo que tienes según tu edad, tus metas y el riesgo que aguantas. Le pone nota y te dice si vas hacia lo que quieres.' },
  { il: 'mundo', donde: 'expertos', t: 'Ideas que encajan contigo', x: 'Más de 800 empresas de España, Europa y EEUU con la opinión de los analistas. Te dice cuáles encajan en tu cartera y por qué.' },
  { dib: 'calendario', donde: 'mercados', t: 'El mundo y lo que viene', x: 'Bolsas, tipos, divisas y materias primas, con lo que significa para ti. Y el calendario: resultados, dividendos y la Fed.' },
  { il: 'ia', t: 'Pregúntale lo que quieras', x: '«Me sobran 500 €, ¿dónde los meto?» o «¿Vendo Repsol?». Te contesta con tus números y te lo explica fácil.' },
  { dib: 'renta', t: 'Hacienda, sin sorpresas', x: 'Antes de vender ves lo que pagarás en la renta. Y en primavera, una guía para hacer la declaración.' },
  { il: 'privada', t: 'Privada de verdad', x: 'Tu cartera se cifra con tu contraseña antes de guardarse, y GrowIA usa tu propia clave de Google. Nadie más puede leer tus cifras, tampoco GrowFolio.' },
  { dib: 'app', t: 'En el móvil, con widget', x: 'En la web o en la app de Android, con un widget para la pantalla de inicio. Está en alfa: si ves algo raro, avisa con el bichito de arriba.' },
];
/* La presentación se cuenta bajando, como una película: primero el logo se monta pieza a pieza según bajas y,
   al acabar, la cámara entra en él; después, cada idea entra con el scroll (el dibujo desde un lado, el título
   palabra a palabra, el texto detrás) y el fondo cambia de color con cada una. Igual en la web y en la app:
   scroll propio y nada de librerías. Con «reducir movimiento», todo quieto y montado. */
// las tres piezas de la wF (la w, el palo con su punta y las barras), con el mismo degradado de oro a blanco
const LOGO_PIEZAS = {
  w: `<path d="${MARCA_PIEZAS.w}" fill="url(#ixpg)"/>`,
  palo: `<path d="${MARCA_PIEZAS.palo}" fill="url(#ixpg)"/>`,
  barras: `<path d="${MARCA_PIEZAS.barras}" fill="url(#ixpg)"/>`,
};
// ocho trozos: [pieza, recorte (polígono en el lienzo de 48; los de la w, inclinados como el palo), de dónde sale (x, y), giro, tamaño]
const ESQUIRLAS = [
  ['w', '0,0 24.6,0 8,48 0,48', -34, 18, -50, 1.3],
  ['w', '24.6,0 29.6,0 13,48 8,48', -24, 40, 36, 1.5],
  ['w', '29.6,0 34.6,0 18,48 13,48', 6, 44, -30, 1.4],
  ['w', '34.6,0 48,0 48,48 18,48', 30, 34, 44, 1.2],
  ['palo', '0,20 48,20 48,48 0,48', -36, -18, 60, 1.3],
  ['palo', '0,0 48,0 48,20 0,20', 8, -42, -70, 0.6],
  ['barras', '0,0 48,0 48,22 0,22', 38, -28, 40, 0.7],
  ['barras', '0,22 48,22 48,48 0,48', 42, 8, -52, 1.4],
];
const COLOR_CAP = { grafica: '#EDBB45', pasos: '#F4CB66', notas: '#F9DE9C', mundo: '#D7A033', calendario: '#F4CB66', ia: '#EDBB45', renta: '#D7A033', privada: '#F9DE9C', app: '#EDBB45' };
const logoEntero = () => svgMarca();
function pantallaIntro(seguir) {
  const nuevo = !S.enc;
  const quieta = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const caps = INTRO.slice(1);
  const centro = (pol) => { if (!pol) return [24, 24]; const v = pol.split(' ').map((x) => x.split(',').map(Number)); return [v.reduce((a, x) => a + x[0], 0) / v.length, v.reduce((a, x) => a + x[1], 0) / v.length]; };
  const esquirlas = ESQUIRLAS.map(([pz, pol], k) => { const [cx, cy] = centro(pol); return `<g class="ix-esq" style="transform-origin:${cx.toFixed(1)}px ${cy.toFixed(1)}px"><g class="ix-flota" style="--i:${k}"${pol ? ` clip-path="url(#ixc${k})"` : ''}>${LOGO_PIEZAS[pz]}</g></g>`; }).join('');
  const recortes = ESQUIRLAS.map(([, pol], k) => (pol ? `<clipPath id="ixc${k}"><polygon points="${pol}"/></clipPath>` : '')).join('');
  $('#app').innerHTML = `<div class="intro ix${quieta ? ' quieta' : ''}" role="region" aria-label="Presentación de GrowFolio">
    <div class="ix-luz" aria-hidden="true"></div>
    <div class="ix-barra" aria-hidden="true"></div>
    <div class="ix-cab"><span class="intro-marca"><img src="growfolio-nombre.svg" alt="GrowFolio"></span>${selectorIdioma('mini')}<button class="intro-saltar" type="button" data-in="fin">Saltar</button></div>
    <div class="ix-scroll" tabindex="-1">
      <section class="ix-heroe" aria-label="GrowFolio">
        <div class="ix-escena">
          <div class="ix-emblema"><svg viewBox="0 0 48 48" aria-hidden="true"><defs>${MARCA_GRAD.replace(/__K__/g, 'ixp')}${recortes}</defs><g class="ix-trozos">${esquirlas}</g><g class="ix-entero">${marcaWF('ixm')}</g></svg></div>
          <h1 class="ix-marca ix-nom" data-no-trad>${nombreGF()}</h1>
          <div class="ix-lema"><h2>${esc(INTRO[0].t)}</h2><p>${esc(INTRO[0].x)}</p></div>
          <div class="ix-hola"><p class="ix-hola-t">${nombreUsuario() ? `${esc(L('Hola', 'Hi'))}, <b>${esc(nombreUsuario())}</b>` : esc(L('Te damos la bienvenida', 'Welcome'))}</p><p class="ix-hola-s">${esc(L('Baja despacio: el logo se monta mientras bajas y luego te cuento lo que hace GrowFolio.', 'Scroll slowly: the logo comes together as you go, then I\'ll show you what GrowFolio does.'))}</p></div>
        <div class="ix-baja" aria-hidden="true"><span>${L('o ve bajando', 'or scroll down')}</span><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div>
        </div>
      </section>
      ${caps.map((d, k) => `<section class="ix-cap" data-lado="${k % 2 ? 'd' : 'i'}" data-color="${COLOR_CAP[d.il || d.dib] || '#EDBB45'}">
        <div class="ix-cap-in">
          <div class="ix-ilus"><svg class="dib ilus" viewBox="0 0 240 170" aria-hidden="true">${d.il ? ILUS[d.il] : `<g transform="translate(0 5) scale(2)">${DIBUJOS[d.dib] || ''}</g>`}</svg></div>
          <div class="ix-txt">${d.donde ? `<span class="ix-donde">${ICONOS[d.donde] || ''}${esc(L('En', 'In'))} ${esc(L((GRUPOS.find((g) => g.k === d.donde) || {}).c || (GRUPOS.find((g) => g.k === d.donde) || {}).t || '', (GRUPOS.find((g) => g.k === d.donde) || {}).en || ''))}</span>` : ''}<h2 data-no-trad data-t="${esc(d.t)}" aria-label="${esc(d.t)}"></h2><p>${esc(d.x)}</p></div>
        </div>
      </section>`).join('')}
      <section class="ix-fin">
        <div class="ix-fin-logo">${logoEntero()}</div>
        <h2>¿Empezamos?</h2>
        <p>Al entrar te enseño la app en un minuto y lo que hay que hacer el primer día para que GrowIA te aconseje con tus números.</p>
        <button type="button" class="btn pri" data-in="fin">${nuevo ? 'Crear mi cartera' : 'Entrar'}</button>
        <button type="button" class="enlace ix-arriba" data-in="arriba">Verlo otra vez desde el principio</button>
      </section>
    </div>
  </div>`;
  const raiz = $('.intro'), sc = $('.ix-scroll', raiz), heroe = $('.ix-heroe', raiz), barra = $('.ix-barra', raiz), emb = $('.ix-emblema', raiz);
  const trozos = $$('.ix-esq', raiz), flotas = $$('.ix-flota', raiz), entero = $('.ix-entero', raiz), letras = $$('.ix-nom .nombre-gf > span', raiz);
  const marca = $('.ix-marca', raiz), lema = $('.ix-lema', raiz), baja = $('.ix-baja', raiz), luz = $('.ix-luz', raiz), cabMarca = $('.ix-cab .intro-marca', raiz), hola = quieta ? null : $('.ix-hola', raiz);
  const capEls = $$('.ix-cap', raiz);
  // el título de cada idea, palabra a palabra (ya traducido: si el inglés llega tarde, se vuelve a partir)
  const partir = () => capEls.forEach((c) => { const h = $('h2', c), t = trad(h.dataset.t); if (h.dataset.hecho === t) return; h.dataset.hecho = t; h.setAttribute('aria-label', t); h.innerHTML = t.split(' ').map((w) => `<span aria-hidden="true">${esc(w)}</span>`).join(' '); });
  partir();
  if (IDIOMA === 'en' && !I18N.dic) { let n = 0; const t = setInterval(() => { if (I18N.dic || ++n > 20) { clearInterval(t); partir(); pinta(); } }, 250); }
  const tramo = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  let medidas = null, raf = 0, color = '';
  const medir = () => {
    const vh = sc.clientHeight;
    medidas = { vh, alto: heroe.offsetHeight, caps: capEls.map((c) => ({ c, top: c.offsetTop, h: c.offsetHeight, palabras: $$('h2 span', c), ilus: $('.ix-ilus', c), p: $('p', c), dn: $('.ix-donde', c), lado: c.dataset.lado === 'd' ? 1 : -1 })) };
    // al empezar, el logo va en el centro de la pantalla; sube a su sitio cuando sale el nombre
    medidas.baja = (marca.offsetHeight + lema.offsetHeight + 2 * parseFloat(getComputedStyle(emb.parentNode).rowGap || 0)) / 2;
  };
  const pinta = () => {
    raf = 0;
    if (!medidas) medir();
    const { vh } = medidas, y = sc.scrollTop, H = sc.scrollHeight - vh;
    barra.style.transform = `scaleX(${H > 0 ? Math.min(1, y / H) : 0})`;
    const p = quieta ? 0.75 : Math.min(1, Math.max(0, y / Math.max(1, medidas.alto - vh)));
    // 1. las piezas se juntan, una detrás de otra
    trozos.forEach((g, k) => {
      const [, , x, yy, r, s0] = ESQUIRLAS[k];
      const e = ease(tramo(p, 0.02 + k * 0.035, 0.3 + k * 0.035)), f = 1 - e;
      g.style.transform = `translate(${(x * f).toFixed(2)}px, ${(yy * f).toFixed(2)}px) rotate(${(r * f).toFixed(1)}deg) scale(${(1 + (s0 - 1) * f).toFixed(3)})`;
      g.style.opacity = (0.55 + 0.45 * e).toFixed(3);
      flotas[k].style.setProperty('--d', f.toFixed(3));
    });
    const montado = tramo(p, 0.62, 0.66);
    entero.style.opacity = montado; $('.ix-trozos', raiz).style.opacity = 1 - montado;
    // 2. el logo sube a su sitio y sale el nombre, letra a letra; 3. la frase
    const sube = ease(tramo(p, 0.46, 0.66));
    const z = ease(tramo(p, 0.86, 1));
    emb.style.transform = `translateY(${(medidas.baja * (1 - sube)).toFixed(1)}px) scale(${(1 + 5 * z).toFixed(3)})`;
    emb.style.opacity = Math.max(0, 1 - z * 1.6).toFixed(3);
    letras.forEach((l, k) => {
      const e = ease(tramo(p, 0.5 + k * 0.022, 0.64 + k * 0.022)), f = 1 - e;
      l.style.transform = `translate(${((k - (letras.length - 1) / 2) * 0.32 * f).toFixed(3)}em, ${(0.45 * f).toFixed(3)}em)`;
      l.style.opacity = e.toFixed(3);
      l.style.filter = f > 0.01 ? `blur(${(8 * f).toFixed(1)}px)` : '';
    });
    const le = ease(tramo(p, 0.66, 0.8));
    marca.style.transform = lema.style.transform = `translateY(${(-z * 60).toFixed(1)}px)`;
    marca.style.opacity = Math.max(0, 1 - z * 1.4).toFixed(3);
    lema.style.opacity = (le * Math.max(0, 1 - z * 1.8)).toFixed(3);
    lema.firstElementChild.style.transform = `translateY(${((1 - le) * 18).toFixed(1)}px)`;
    baja.style.opacity = (1 - tramo(p, 0, 0.06)).toFixed(3);
    // al principio, en medio, un saludo y qué hacer (si no, parecía que se había quedado colgada); se va al bajar
    if (hola) { const h = tramo(p, 0.004, 0.07); hola.style.opacity = (1 - h).toFixed(3); hola.style.transform = `translateY(${(-h * 40).toFixed(1)}px)`; }
    luz.style.setProperty('--luz', (0.35 + 0.5 * tramo(p, 0.1, 0.66) + 0.4 * z).toFixed(3));
    cabMarca.style.opacity = tramo(p, 0.9, 1).toFixed(3);
    // 4. cada idea: el dibujo entra desde un lado, el título palabra a palabra y el texto detrás
    let mejor = null;
    for (const m of medidas.caps) {
      const q = quieta ? 0.5 : (y + vh - m.top) / (vh + m.h);
      if (q < -0.1 || q > 1.1) continue;
      const ei = ease(tramo(q, 0.08, 0.4)), ex = tramo(q, 0.64, 0.92), fi = 1 - ei;
      m.ilus.style.transform = `translate(${(m.lado * fi * 16).toFixed(2)}vw, ${(fi * 40 - ex * 60).toFixed(1)}px) rotate(${(m.lado * fi * 9).toFixed(2)}deg) scale(${(0.78 + 0.22 * ei).toFixed(3)})`;
      m.ilus.style.opacity = (ei * (1 - ex)).toFixed(3);
      m.palabras.forEach((w, k) => {
        const e = ease(tramo(q, 0.18 + k * 0.028, 0.36 + k * 0.028));
        w.style.transform = `translateY(${((1 - e) * 0.6 - ex * 0.4).toFixed(3)}em)`;
        w.style.opacity = (e * (1 - ex)).toFixed(3);
      });
      if (m.dn) { const de = ease(tramo(q, 0.1, 0.3)); m.dn.style.transform = `translateY(${((1 - de) * 14 - ex * 30).toFixed(1)}px)`; m.dn.style.opacity = (de * (1 - ex)).toFixed(3); }
      const pe = ease(tramo(q, 0.3, 0.48));
      m.p.style.transform = `translateY(${((1 - pe) * 26 - ex * 30).toFixed(1)}px)`;
      m.p.style.opacity = (pe * (1 - ex)).toFixed(3);
      m.c.classList.toggle('activa', q > 0.2 && q < 0.9);
      if (q > 0.25 && q < 0.75 && (!mejor || Math.abs(q - 0.5) < Math.abs(mejor.q - 0.5))) mejor = { q, c: m.c.dataset.color };
    }
    const nuevoColor = mejor ? mejor.c : p < 1 ? '#EDBB45' : color;
    if (nuevoColor && nuevoColor !== color) { color = nuevoColor; raiz.style.setProperty('--ixg', color); }
  };
  const pedir = () => { if (!raf) raf = requestAnimationFrame(pinta); };
  const redimensionar = () => { medidas = null; pedir(); };
  sc.addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', redimensionar);
  const fin = () => { LS.set('inv-intro', true); LS.set('inv-intro2', true); document.removeEventListener('keydown', tecla); removeEventListener('resize', redimensionar); if (raf) cancelAnimationFrame(raf); seguir(); };
  const tecla = (e) => { if (e.key === 'Enter' && sc.scrollTop >= sc.scrollHeight - sc.clientHeight - 4) fin(); };
  document.addEventListener('keydown', tecla);
  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-in]'); if (!b) return;
    if (b.dataset.in === 'fin') fin();
    else if (b.dataset.in === 'arriba') sc.scrollTo({ top: 0, behavior: quieta ? 'auto' : 'smooth' });
  });
  pinta();
  // si las letras llegan después, se vuelve a medir
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redimensionar);
  setTimeout(() => sc.focus({ preventScroll: true }), 50);
}

