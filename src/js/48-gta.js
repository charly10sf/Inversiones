/* =====================================================================
   GTA VI: cuenta atrás hasta su salida y unas cuentas con tu cartera, con más dibujo que texto.
   Un botón pequeño al lado de Patrimonio; al entrar se avisa una vez. Desde 2027 ya no sale.
   Datos: fecha, plataformas y precio, de Rockstar (junio de 2026); fechas de GTA V y de los tráileres,
   de Rockstar; el Adder cuesta 1.000.000 $ dentro del juego. Lo que costó hacerlo es una estimación de
   GrowFolio: semanas de trabajo por tarea (un coche de Gran Turismo lleva de 3 a 6 meses, según GTPlanet,
   y los de GTA V tienen bastante menos detalle) a lo que le cuesta cada empleado a Rockstar North
   (31,6 M£ de gastos de personal entre 515 personas en el año fiscal 2017, según PCGamesInsider), más
   un 30 % de oficina, equipos y licencias: unos 1.800 € por semana de trabajo.
   Las frases llevan cifras y nombres dentro: van escritas en los dos idiomas con L(es, en).
   ===================================================================== */
const GTA = {
  salida: new Date(2026, 10, 19), precarga: new Date(2026, 10, 12), hasta: new Date(2027, 0, 1),
  precio: 79.99, ultimate: 99.99, gta5: '2013-09-17', trailer1: '2023-12-05',
};
const ADDER = {
  enJuegoUSD: 1e6, semanaEUR: 1795, min: 18000, max: 40000,
  // tarea (es, en), semanas de una persona, qué es (es, en) y su color
  tareas: [
    [['Modelado 3D', '3D modelling'], 6, ['carrocería, interior y versiones simplificadas para cuando se ve de lejos', 'body, interior and simplified versions for when it’s far away'], '#FF3EA5'],
    [['Texturas y pintura', 'Textures and paint'], 2, ['materiales, luces y los colores que eliges en el taller', 'materials, lights and the colours you pick in the garage'], '#B14AED'],
    [['Golpes y piezas', 'Damage and parts'], 2, ['abolladuras, cristales rotos, puertas y ruedas que se sueltan', 'dents, broken glass, doors and wheels coming off'], '#2DE2E6'],
    [['Conducción', 'Handling'], 1, ['velocidad, agarre, frenada y cómo derrapa', 'speed, grip, braking and how it drifts'], '#FFD23F'],
    [['Sonido del motor', 'Engine sound'], 1.5, ['grabar, mezclar y ajustar el motor y las marchas', 'recording, mixing and tuning the engine and gears'], '#FF9F43'],
    [['Pruebas', 'Testing'], 1.5, ['que no se atasque, no atraviese paredes y vaya bien en todas las consolas', 'no getting stuck, no driving through walls, smooth on every console'], '#7CF29C'],
  ],
};
const adderEUR = () => sum(ADDER.tareas, (t) => t[1]) * ADDER.semanaEUR;
const gtaActivo = () => Date.now() < GTA.hasta.getTime();
function gtaFalta() {
  const ms = GTA.salida - Date.now();
  return ms > 0 ? { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 } : null;
}
const MANDO = SVG('<path d="M7 8.5h10a4.3 4.3 0 0 1 4.3 4.6l-.4 3.4a2.5 2.5 0 0 1-4.4 1.3L15 16H9l-1.5 1.8a2.5 2.5 0 0 1-4.4-1.3l-.4-3.4A4.3 4.3 0 0 1 7 8.5z"/><path d="M8 11.3v3.4M6.3 13h3.4"/><path d="M15.5 12.2h.01M17.5 14h.01" stroke-width="2.4"/>', 1.7);
/* GTA VI en la cabecera, junto a «En directo»: el mando y los días que faltan, con las letras de neón de la
   sección de GTA (no las del logo del juego) */
// que la cabecera quepa sin cortar nada: se prueba de más a menos, y para en cuanto cabe y la luz de En directo se lee entera
var PASOS_CAB = ['cab-1', 'cab-2', 'cab-3', 'cab-4', 'cab-5', 'cab-6', 'cab-7'];
function encajarCabecera() {
  const top = $('.top'), f = $('.fila-top'); if (!top || !f) return;
  top.classList.remove(...PASOS_CAB);
  const aprieta = () => { const e = $('#estado'); return f.scrollWidth > f.clientWidth + 1 || (e && e.scrollWidth > e.clientWidth); };  // la luz, sin margen: un píxel ya corta la última letra
  for (const c of PASOS_CAB) { if (!aprieta()) break; top.classList.add(c); }
}
var encajarT = 0;
addEventListener('resize', () => { cancelAnimationFrame(encajarT); encajarT = requestAnimationFrame(encajarCabecera); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => encajarCabecera());

/* Lo que más ha movido hoy, en el móvil: si un nombre no cabe, como en el widget se prueba de menos a más hasta que
   cabe: primero fuera las flechitas (el signo y el color ya lo dicen), luego la letra un poco más pequeña en todas, y
   solo entonces se resume el nombre que no cabe («MSCI Europe» → «MSCI Eur.»); los puntos, solo si ni así */
const ABREV_MV = [
  [/\s*\b(Index|Indexado|Fund|Fondo|ETF|UCITS|Acc|Dist|EUR|USD|Class|Clase|Inc)\b\.?/gi, ''],
  [/^(Vanguard|iShares|Amundi|Fidelity|Xtrackers|SPDR|Invesco|Lyxor|WisdomTree|Vaneck|VanEck|BlackRock|Pictet|Robeco|DWS|UBS|HSBC|JPMorgan|Baillie Gifford|Bestinver|Cobas|Magallanes|Azvalor)\s+/i, ''],
  [/\b(Core|Prime|Select|Screened|ESG|Sustainable|Enhanced)\b/g, ''],
  [/\bEurope\b|\bEuropa\b|\bEuropean\b|\bEuropeo\b/g, 'Eur.'], [/\bEmergentes\b|\bEmerging( Markets)?\b/g, 'Emerg.'],
  [/\bInternational\b|\bInternacional\b/g, 'Intl.'], [/\bTechnology\b|\bTecnología\b/g, 'Tec.'], [/\bDividends?\b|\bDividendos?\b/g, 'Div.'],
  [/\bPacific\b|\bPacífico\b/g, 'Pac.'], [/\bJapan\b|\bJapón\b/g, 'Jap.'], [/\bGlobal\b/g, 'Glob.'], [/\bSmall ?[Cc]aps?\b/g, 'Small C.'],
  [/\bPhysical\b/g, 'Phys.'], [/\bHoldings?\b|\bGroup\b|\bGrupo\b|\bplc\b|\bAG\b|\bSE\b/gi, ''],
];
// la cifra grande, si no cabe (un patrimonio de siete cifras en un móvil estrecho), se encoge lo justo
function encajarCifra() {
  const n = $('#heroNum'); if (!n) return;
  n.style.fontSize = '';
  if (n.scrollWidth > n.clientWidth + 1) n.style.fontSize = `${(parseFloat(getComputedStyle(n).fontSize) * (n.clientWidth / n.scrollWidth) * 0.98).toFixed(1)}px`;
}
function encajarMovers() {
  encajarCifra();
  const l = $('.hero-movers .mv-l'); if (!l) return;
  const ns = $$('.mv-nn', l);
  l.classList.remove('mv-sinfl', 'mv-peq');
  for (const n of ns) { if (n.dataset.nom == null) n.dataset.nom = n.textContent; else n.textContent = n.dataset.nom; n.removeAttribute('title'); }
  if (innerWidth >= 760) return;
  const corta = (n) => n.scrollWidth > n.clientWidth + 0.5;
  for (const c of ['mv-sinfl', 'mv-peq']) { if (!ns.some(corta)) return; l.classList.add(c); }
  for (const n of ns.filter(corta)) {
    const orig = n.dataset.nom; let t = orig;
    n.title = orig;
    for (const [re, r] of ABREV_MV) {
      const u = t.replace(re, r).replace(/\s{2,}/g, ' ').trim();
      if (u && u !== t) { t = u; n.textContent = t; if (!corta(n)) break; }
    }
    // si sigue sin caber, la palabra más larga se queda en su principio y un punto («Vanguard» → «Vang.»)
    for (let i = 0; i < 4 && corta(n); i++) {
      const ws = t.split(' '), k = ws.reduce((m, w, j) => (w.replace(/\.$/, '').length > ws[m].replace(/\.$/, '').length ? j : m), 0);
      const w = ws[k].replace(/\.$/, '');
      if (w.length <= 4) break;
      ws[k] = w.slice(0, Math.max(4, Math.ceil(w.length * 0.55))) + '.'; t = ws.join(' '); n.textContent = t;
    }
  }
}
let encajarMvT = 0;
const pedirEncajarMovers = () => { cancelAnimationFrame(encajarMvT); encajarMvT = requestAnimationFrame(encajarMovers); };
addEventListener('resize', pedirEncajarMovers);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(pedirEncajarMovers);

function pintarGtaTop() {
  const w = $('#gtaTop'); if (!w) return;
  if (!gtaActivo()) { w.remove(); return; }
  fuenteGTA();
  const f = gtaFalta(), cuenta = !f ? L('¡Ya!', 'Out!') : f.d ? `${f.d}${L('d', 'd')}` : `${f.h}h`;
  const txt = !f ? L('ya está aquí', 'out now') : f.d ? L(`faltan ${f.d} ${f.d === 1 ? 'día' : 'días'}`, `${f.d} ${f.d === 1 ? 'day' : 'days'} to go`) : L(`faltan ${f.h} horas`, `${f.h} hours to go`);
  const html = `<button type="button" class="gta-top" data-gta title="GTA VI: ${esc(txt)}" aria-label="GTA VI: ${esc(txt)}"><span class="gta-top-t" data-no-trad><span class="gta-top-g">GTA </span>VI</span><span class="gta-top-d" data-no-trad>${esc(cuenta)}</span></button>`;
  if (w.innerHTML !== html) w.innerHTML = html;
}
function chipGTA() {
  if (!gtaActivo()) return '';
  const f = gtaFalta();
  const txt = !f ? L('ya está aquí', 'out now') : f.d ? L(`${f.d} ${f.d === 1 ? 'día' : 'días'}`, `${f.d} ${f.d === 1 ? 'day' : 'days'}`) : `${f.h} h`;
  return `<button class="gta-chip" type="button" data-gta aria-label="GTA VI: ${esc(txt)}. ${L('Cuenta atrás y cuentas con tu cartera', 'Countdown and your portfolio in numbers')}">${MANDO}<b>GTA VI</b><span>${esc(txt)}</span></button>`;
}
// letras de neón de los ochenta (no las del logo del juego): Tilt Neon para títulos y cifras, Yellowtail para los rótulos
function fuenteGTA() {
  if ($('#fuenteGTA')) return;
  const l = document.createElement('link');
  l.id = 'fuenteGTA'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Tilt+Neon&family=Yellowtail&display=swap';
  document.head.appendChild(l);
}
const dosC = (n) => String(n).padStart(2, '0');
function relojGTA() {
  const f = gtaFalta();
  if (!f) {
    const d = Math.floor((Date.now() - GTA.salida) / 864e5);
    return `<div class="gta-reloj fuera"><span><b>${d ? d : L('¡Hoy!', 'Today!')}</b><i>${d ? L(d === 1 ? 'día a la venta' : 'días a la venta', d === 1 ? 'day on sale' : 'days on sale') : L('sale hoy', 'out today')}</i></span></div>`;
  }
  return `<div class="gta-reloj">${[[f.d, L(f.d === 1 ? 'día' : 'días', f.d === 1 ? 'day' : 'days')], [dosC(f.h), L('horas', 'hours')], [dosC(f.m), 'min'], [dosC(f.s), L('seg', 'sec')]].map(([n, t]) => `<span><b>${n}</b><i>${t}</i></span>`).join('')}</div>`;
}
// números grandes en corto: 1,3 M, 12.400, 7,5
function nGTA(n, d) {
  if (!isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return fmtNum(n / 1e9, a >= 1e10 ? 0 : 1) + L(' mil M', ' bn');
  if (a >= 1e6) return fmtNum(n / 1e6, a >= 1e7 ? 0 : 1) + ' M';
  return fmtNum(n, d != null ? d : a < 10 ? 1 : 0);
}
const numGTA = (d) => `<span class="gta-num"${d.v != null && isFinite(d.v) && !S.oculto ? ` data-to="${d.v}" data-f="${d.f || 'n'}" data-fin="${esc(d.n)}"` : ''}>${esc(d.n)}</span>`;
const rotulo = (id, es, en) => `<h3 class="gta-rotulo gta-rev" id="${id}" data-no-trad>${L(es, en)}</h3>`;

/* la escena: cielo de noche, estrellas, un sol a rayas que se pone y el suelo de rejilla en movimiento */
const escenaGTA = () => '<div class="gta-cielo" aria-hidden="true"><i class="gta-estrellas"></i></div>';
const paisajeGTA = () => '<div class="gta-paisaje" aria-hidden="true"><i class="gta-sol"></i><i class="gta-horizonte"></i><i class="gta-suelo"></i></div>';

/* de GTA V a GTA VI: cuánto camino llevamos */
function caminoGTA5() {
  const total = diasEntre(GTA.gta5, iso(GTA.salida)), van = Math.max(0, Math.min(total, diasEntre(GTA.gta5, hoyIso())));
  return { total, van, p: (van / total) * 100 };
}
// años, meses y días entre dos fechas: «13 años, 1 mes y 3 días»
function aniosMesesDias(a, b) {
  const x = deIso(a), y = deIso(b);
  let an = y.getFullYear() - x.getFullYear(), me = y.getMonth() - x.getMonth(), di = y.getDate() - x.getDate();
  if (di < 0) { me -= 1; di += new Date(y.getFullYear(), y.getMonth(), 0).getDate(); }
  if (me < 0) { an -= 1; me += 12; }
  return yLista([an && L(`${an} ${an === 1 ? 'año' : 'años'}`, `${an} ${an === 1 ? 'year' : 'years'}`), me && L(`${me} ${me === 1 ? 'mes' : 'meses'}`, `${me} ${me === 1 ? 'month' : 'months'}`), di && L(`${di} ${di === 1 ? 'día' : 'días'}`, `${di} ${di === 1 ? 'day' : 'days'}`)].filter(Boolean));
}
function esperaGTA() {
  const c = caminoGTA5();
  return `<div class="gta-espera"><div class="gta-barra" role="img" aria-label="${L(`${fmtNum(c.p, 1)} % del camino desde GTA V`, `${fmtNum(c.p, 1)} % of the way since GTA V`)}"><i style="--p:${c.p.toFixed(2)}%"></i></div><small>${L(`El ${fmtNum(c.p, 1)} % del camino desde que salió GTA V, en 2013.`, `${fmtNum(c.p, 1)} % of the way since GTA V came out in 2013.`)}</small></div>`;
}
// fecha, título, detalle y, si va marcado en la barra: su nombre corto, la fila (1 arriba del todo, 2 más cerca) y hacia dónde se alinea
const GTA_HITOS = [
  ['2013-09-17', ['Sale GTA V', 'GTA V comes out'], ['En PS3 y Xbox 360. Lleva 230 millones de copias.', 'On PS3 and Xbox 360. It has sold 230 million copies.'], ['GTA V', 2, 'start']],
  ['2014-11-18', ['GTA V en PS4 y Xbox One', 'GTA V on PS4 and Xbox One'], ['Con vista en primera persona.', 'With first-person view.']],
  ['2015-04-14', ['GTA V en PC', 'GTA V on PC'], ['', '']],
  ['2022-02-04', ['Rockstar confirma GTA VI', 'Rockstar confirms GTA VI'], ['Dice que está «bien avanzado».', 'It says it’s “well underway”.']],
  ['2023-12-05', ['Primer tráiler', 'First trailer'], ['Más de 90 millones de visitas en 24 horas.', 'Over 90 million views in 24 hours.'], [['Primer tráiler', 'First trailer'], 1, 'end']],
  ['2025-05-06', ['Segundo tráiler', 'Second trailer'], ['475 millones de visitas en 24 horas, según Rockstar.', '475 million views in 24 hours, according to Rockstar.'], [['Segundo tráiler', 'Second trailer'], 2, 'end']],
  ['2025-11-06', ['Último retraso', 'Last delay'], ['Al 19 de noviembre de 2026.', 'To 19 November 2026.']],
  ['2026-11-12', ['Precarga', 'Pre-load'], ['Se puede descargar antes de que salga.', 'You can download it before release.']],
  ['2026-11-19', ['Sale GTA VI', 'GTA VI comes out'], ['En PS5 y Xbox Series X y S.', 'On PS5 and Xbox Series X|S.'], ['GTA VI', 1, 'end']],
];
const LL = (x) => (Array.isArray(x) ? L(x[0], x[1]) : x);
function htmlCaminoGTA() {
  const hoy = hoyIso(), c = caminoGTA5(), sig = GTA_HITOS.findIndex(([d]) => d > hoy);
  const pos = (d) => Math.max(0, Math.min(100, (diasEntre(GTA.gta5, d) / c.total) * 100));
  const anios = []; for (let y = 2014; y <= 2026; y += 2) anios.push(y);
  const quedan = c.total - c.van;
  return `<section class="gta-sec" aria-labelledby="gtaCamino">${rotulo('gtaCamino', 'de GTA V a GTA VI', 'from GTA V to GTA VI')}
    <div class="gta-v6 gta-rev">
      <div class="gta-v6-n"><b>${numGTA({ n: fmtNum(c.p, 1) + ' %', v: c.p, f: 'pct1' })}</b><span>${L(`Han pasado ${aniosMesesDias(GTA.gta5, hoy)} desde GTA V: ${fmtNum(c.van, 0)} de los ${fmtNum(c.total, 0)} días que habrá entre los dos. ${quedan > 0 ? `Quedan ${fmtNum(quedan, 0)}.` : 'Ya está aquí.'}`, `${aniosMesesDias(GTA.gta5, hoy)} since GTA V: ${fmtNum(c.van, 0)} of the ${fmtNum(c.total, 0)} days between the two. ${quedan > 0 ? `${fmtNum(quedan, 0)} to go.` : 'It’s here.'}`)}</span></div>
      <div class="gta-pista" style="--p:${c.p.toFixed(2)}%" role="img" aria-label="${L(`${fmtNum(c.p, 1)} % del camino entre GTA V y GTA VI`, `${fmtNum(c.p, 1)} % of the way from GTA V to GTA VI`)}">
        <i class="gta-pista-f"></i>
        ${GTA_HITOS.filter((h) => h[3]).map(([d, , , [e, fila, al]]) => `<span class="gta-hito f${fila} a-${al}${d <= hoy ? ' hecho' : ''}" style="left:${pos(d).toFixed(2)}%"><i></i><em data-no-trad>${esc(LL(e))}</em></span>`).join('')}
      </div>
      <div class="gta-anios" aria-hidden="true">${anios.map((y) => `<span style="left:${pos(`${y}-01-01`).toFixed(2)}%">${y}</span>`).join('')}</div>
    </div>
    <ol class="gta-camino" data-no-trad>${GTA_HITOS.map(([d, t, x], i) => `<li class="gta-rev${d <= hoy ? ' hecho' : ''}${i === sig ? ' siguiente' : ''}" style="--i:${i % 3}"><span class="gc-d">${fechaCortaL(d)} ${d.slice(0, 4)}</span><b>${esc(LL(t))}${i === sig ? `<em>${L('lo siguiente', 'up next')}</em>` : ''}</b>${LL(x) ? `<p>${esc(LL(x))}</p>` : ''}</li>`).join('')}</ol>
  </section>`;
}

/* un dibujo de iconos: hasta 50, cada uno vale «unidad»; el último, a medias si toca */
function pictoGTA(n, icono, clase) {
  const pasos = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 1e5, 1e6];
  const unidad = pasos.find((u) => n / u <= 50) || 1e6;
  const llenos = Math.floor(n / unidad), resto = n / unidad - llenos;
  const iconos = [];
  for (let k = 0; k < llenos; k++) iconos.push(`<i style="--k:${k}">${icono}</i>`);
  if (resto >= 0.05) iconos.push(`<i class="medio" style="--k:${llenos};--r:${(resto * 100).toFixed(0)}%">${icono}</i>`);
  return { html: `<div class="gta-picto ${clase}" aria-hidden="true">${iconos.join('')}</div>`, unidad };
}
const CAJA = '<svg viewBox="0 0 20 26"><rect x="1.5" y="1.5" width="17" height="23" rx="2.5"/><path d="M1.5 6.5h17"/><path d="M6 13.5l4-3 4 3-4 3z"/></svg>';
const COCHE = '<svg viewBox="0 0 40 18"><path d="M2 13.5l.4-3.4 4.6-.9 6-4.1c3.5-1.6 8-1.8 11.6-.2l6 3.5 5.6 1 1.6 2.4-.4 1.7H2z"/><circle cx="10" cy="14" r="2.8"/><circle cx="30" cy="14" r="2.8"/></svg>';
const copiasTxt = (c) => L(c >= 0.95 && c < 1.05 ? 'copia' : 'copias', c >= 0.95 && c < 1.05 ? 'copy' : 'copies');

/* lo que tienes, agrupado por instrumento (varias plataformas, una fila) */
function gruposGTA(M) {
  const g = new Map();
  for (const f of M.filas) {
    if (!(f.valor > 0)) continue;
    let x = g.get(f.inst.id);
    if (!x) { x = { inst: f.inst, valor: 0, uds: 0, f }; g.set(f.inst.id, x); }
    x.valor += f.valor; x.uds += f.uds || 0;
  }
  return [...g.values()].sort((a, b) => b.valor - a.valor);
}
/* tu cartera en copias del juego: el total, cada cosa que tienes y unas cifras cortas */
function htmlCopiasGTA(M) {
  const P = Math.max(0, M.total || 0), O = S.oculto, c = P / GTA.precio;
  if (!P) return `<section class="gta-sec" aria-labelledby="gtaTu">${rotulo('gtaTu', 'tu cartera en GTA VI', 'your portfolio in GTA VI')}<p class="gta-txt gta-rev">${L('Mete lo que tienes en Inicio y aquí verás cuántas copias del juego vale.', 'Add what you own in Portfolio and you’ll see how many copies of the game it’s worth.')}</p></section>`;
  const pic = pictoGTA(c, CAJA, 'cajas');
  const grupos = gruposGTA(M), top = grupos.slice(0, 7), mx = top.length ? top[0].valor : 1;
  const resto = sum(grupos.slice(7), (x) => x.valor) + (M.liquidez || 0);
  const barras = top.map((x) => [x.inst.corto || x.inst.nombre, x.valor]).concat(resto >= GTA.precio ? [[L('El resto', 'The rest'), resto]] : []);
  const mini = [];
  if (Math.abs(M.pl) >= GTA.precio / 2) mini.push(M.pl > 0 ? [O ? '••••' : '+' + nGTA(M.pl / GTA.precio), L('copias que te ha regalado la bolsa desde que compraste', 'copies the market has given you since you bought'), 'c2'] : [O ? '••••' : '−' + nGTA(-M.pl / GTA.precio), L('copias en rojo desde que compraste', 'copies in the red since you bought'), 'c0']);
  const hoy = M.dia / GTA.precio;
  if (Math.abs(hoy) >= 0.1) mini.push([O ? '••••' : (hoy > 0 ? '+' : '−') + nGTA(Math.abs(hoy)), hoy > 0 ? L('copias ganadas hoy', 'copies made today') : L('copias perdidas hoy', 'copies lost today'), hoy > 0 ? 'c2' : 'c0']);
  let ap = 0; try { ap = aportacionActual(); } catch (e) {}
  const f = gtaFalta();
  if (ap >= GTA.precio / 2) mini.push([O ? '••••' : nGTA(ap / GTA.precio), f && f.d > 3 ? L(`copias al mes con tu aportación: hasta que salga, unas ${nGTA((ap / GTA.precio) * (f.d / 30.4))} más`, `copies a month with your contribution: about ${nGTA((ap / GTA.precio) * (f.d / 30.4))} more before it’s out`) : L('copias al mes con tu aportación', 'copies a month with your contribution'), 'c1']);
  if (M.dividendos >= GTA.precio / 4) mini.push([O ? '••••' : nGTA(M.dividendos / GTA.precio), L('copias al año con tus dividendos, sin mover un dedo', 'copies a year from your dividends, without lifting a finger'), 'c1']);
  const tt = S.precios && S.precios.extra && S.precios.extra.TTWO, fx = (S.precios && S.precios.fx) || {};
  if (tt && tt.precio) { const pe = tt.precio * (fx[tt.moneda || 'USD'] || fx.USD || 0.86); mini.push([O ? '••••' : nGTA(P / pe), L(`acciones de Take-Two, la dueña de Rockstar (${fmtNum(tt.precio, 2)} $, ${pctS(tt.variacion_dia, 1)} hoy)`, `Take-Two shares, Rockstar’s owner ($${fmtNum(tt.precio, 2)}, ${pctS(tt.variacion_dia, 1)} today)`), 'c1']); }
  return `<section class="gta-sec" aria-labelledby="gtaTu">${rotulo('gtaTu', 'tu cartera en GTA VI', 'your portfolio in GTA VI')}
    ${O ? `<p class="gta-nota">${L('Tienes los importes ocultos: pulsa el ojo de arriba para ver tus cifras.', 'Your amounts are hidden: tap the eye at the top to see your figures.')}</p>` : ''}
    <div class="gta-copias2 gta-rev">
      <div class="gta-big">${numGTA({ n: O ? '••••' : nGTA(c), v: c, f: 'n' })}<span>${copiasTxt(c)} ${L(`de GTA VI, a ${fmtNum(GTA.precio, 2)} €`, `of GTA VI, at €${fmtNum(GTA.precio, 2)}`)}</span></div>
      ${O ? '' : `${pic.html}<small class="gta-unidad">${pic.unidad === 1 ? L('Cada caja es una copia', 'Each box is one copy') : L(`Cada caja son ${fmtNum(pic.unidad, 0)} copias`, `Each box is ${fmtNum(pic.unidad, 0)} copies`)}</small>`}
    </div>
    ${barras.length > 1 ? `<div class="gta-pos gta-rev"><p class="gta-sub">${L('Lo que tienes, en copias', 'What you own, in copies')}</p><ul>${barras.map(([n, v], i) => `<li style="--w:${Math.max(2, (v / mx) * 100).toFixed(1)}%;--i:${i}"><span class="n">${esc(n)}</span><span class="b"><i></i></span><b>${O ? '' : nGTA(v / GTA.precio)}</b></li>`).join('')}</ul></div>` : ''}
    ${mini.length ? `<ul class="gta-mini">${mini.map(([n, t, k], i) => `<li class="${k} gta-rev" style="--i:${i % 2}"><b>${esc(n)}</b><span>${esc(t)}</span></li>`).join('')}</ul>` : ''}
  </section>`;
}

/* el Adder: lo que pudo costar hacerlo y cuántos pagas con tu cartera. El dibujo es un superdeportivo de
   GrowFolio, no el del juego */
const DIBUJO_COCHE = `<svg class="gta-coche-svg" viewBox="0 0 320 120" aria-hidden="true">
  <defs><linearGradient id="gtaCo" x1="0" x2="1"><stop offset="0" stop-color="#FF3EA5"/><stop offset=".55" stop-color="#B14AED"/><stop offset="1" stop-color="#2DE2E6"/></linearGradient>
  <linearGradient id="gtaBrillo" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <radialGradient id="gtaSombra" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF3EA5" stop-opacity=".45"/><stop offset="1" stop-color="#FF3EA5" stop-opacity="0"/></radialGradient>
  <radialGradient id="gtaFaro" cx="0" cy=".5" r="1"><stop offset="0" stop-color="#FFF1F8" stop-opacity=".8"/><stop offset="1" stop-color="#FFF1F8" stop-opacity="0"/></radialGradient></defs>
  <g class="gta-estela" stroke="#2DE2E6" stroke-linecap="round"><path d="M0 58h34M6 70h22M0 82h30"/></g>
  <ellipse cx="160" cy="104" rx="150" ry="9" fill="url(#gtaSombra)"/>
  <path class="gta-haz" d="M306 74 L320 64 L320 92 Z" fill="url(#gtaFaro)"/>
  <g class="gta-cuerpo-coche">
    <path d="M40 92 L42 74 Q44 66 56 64 L96 60 L130 46 Q158 35 186 37 L232 58 L284 66 Q306 69 312 80 L310 92 L276 92 A24 24 0 0 0 228 92 L122 92 A24 24 0 0 0 74 92 Z" fill="#1A0A2B" stroke="url(#gtaCo)" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M134 50 Q158 41 184 42 L222 59 L138 59 Z" fill="rgba(45,226,230,.16)" stroke="#2DE2E6" stroke-width="1.6" stroke-linejoin="round"/>
    <path class="gta-reflejo" d="M60 70 L292 72" stroke="url(#gtaBrillo)" stroke-width="2" stroke-linecap="round"/>
    <path d="M168 60 L172 90 M140 74 L208 72" stroke="url(#gtaCo)" stroke-width="1.4" opacity=".7"/>
    <path class="gta-faro" d="M286 70 L304 76" stroke="#FFF1F8" stroke-width="3" stroke-linecap="round"/>
    <path class="gta-piloto" d="M44 72 L58 70" stroke="#FF3EA5" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M38 62 L72 59 M50 61 L54 66" stroke="url(#gtaCo)" stroke-width="2.4" stroke-linecap="round"/>
  </g>
  <g class="gta-rueda" style="transform-origin:98px 94px"><circle cx="98" cy="94" r="19" fill="#0C0414" stroke="#FF3EA5" stroke-width="2.6"/><circle cx="98" cy="94" r="8" fill="none" stroke="#FFD23F" stroke-width="1.6"/><path d="M98 76v36M80 94h36M85 81l26 26M111 81l-26 26" stroke="#FFD23F" stroke-width="1" opacity=".55"/></g>
  <g class="gta-rueda" style="transform-origin:252px 94px"><circle cx="252" cy="94" r="19" fill="#0C0414" stroke="#2DE2E6" stroke-width="2.6"/><circle cx="252" cy="94" r="8" fill="none" stroke="#FFD23F" stroke-width="1.6"/><path d="M252 76v36M234 94h36M239 81l26 26M265 81l-26 26" stroke="#FFD23F" stroke-width="1" opacity=".55"/></g>
</svg>`;
function htmlAdderGTA(M) {
  const P = Math.max(0, M.total || 0), O = S.oculto, coste = adderEUR(), usd = ((S.precios && S.precios.fx) || {}).USD || 0.86;
  const n = P / coste;
  const total = sum(ADDER.tareas, (t) => t[1]);
  // lo que te llega, tarea a tarea en orden
  let queda = P; const cubre = [];
  for (const [t, sem] of ADDER.tareas) { const e = sem * ADDER.semanaEUR; if (queda >= e) { cubre.push(LL(t).toLowerCase()); queda -= e; } else break; }
  // tu posición más grande, en Adders
  const g0 = gruposGTA(M)[0];
  const tu = O || !P ? '' : n >= 1
    ? `${pictoGTA(n, COCHE, 'coches gta-rev').html}<p class="gta-tu gta-rev"><b>${numGTA({ n: nGTA(n, n < 10 ? 1 : 0), v: n, f: n < 10 ? 'n1' : 'n' })}</b><span>${L('Adders podría hacer Rockstar con tu cartera', 'Adders Rockstar could build with your portfolio')}${g0 && g0.valor >= coste ? L(`; solo con ${g0.inst.corto || g0.inst.nombre}, ${nGTA(g0.valor / coste, g0.valor / coste < 10 ? 1 : 0)}`, `; ${g0.inst.corto || g0.inst.nombre} alone, ${nGTA(g0.valor / coste, g0.valor / coste < 10 ? 1 : 0)}`) : ''}</span></p>`
    : `<p class="gta-tu gta-rev"><b>${numGTA({ n: fmtNum(n * 100, 0) + ' %', v: n * 100, f: 'pct0' })}</b><span>${L('de un Adder', 'of an Adder')}: ${cubre.length ? L(`te llega para ${esc(yLista(cubre))}`, `enough for ${esc(yLista(cubre))}`) : L('aún no llega ni para el sonido del motor', 'not even enough for the engine sound yet')}</span></p>`;
  const veces = fmtNum((ADDER.enJuegoUSD * usd) / coste, 0);
  return `<section class="gta-sec gta-adder" aria-labelledby="gtaAdder">${rotulo('gtaAdder', 'lo que costó el Adder', 'what the Adder cost')}
    <div class="gta-coche gta-rev">${DIBUJO_COCHE}</div>
    <div class="gta-adder-n gta-rev"><b>${numGTA({ n: fmtNum(Math.round(coste / 1000) * 1000, 0) + ' €', v: coste, f: 'eur' })}</b><span>${L(`es lo que calculamos que le costó a Rockstar hacer el superdeportivo más famoso de GTA V. Dentro del juego cuesta 1.000.000 $: unas ${veces} veces más.`, `is our estimate of what it cost Rockstar to make GTA V’s most famous supercar. In the game it costs $1,000,000: about ${veces} times more.`)}</span></div>
    <div class="gta-pila gta-rev" role="img" aria-label="${esc(ADDER.tareas.map(([t, s]) => `${LL(t)}: ${fmtNum(s, 1)} ${L('semanas', 'weeks')}`).join(', '))}">${ADDER.tareas.map(([, s, , col], i) => `<i style="flex:${s};--c:${col};--i:${i}"></i>`).join('')}${!O && P && n < 1 ? `<span class="gta-pila-tu" style="left:${(n * 100).toFixed(1)}%"><em>${L('tu cartera', 'your portfolio')}</em></span>` : ''}</div>
    <ul class="gta-pila-ley gta-rev" data-no-trad>${ADDER.tareas.map(([t, s, x, col]) => `<li style="--c:${col}"><i></i><b>${esc(LL(t))}</b><span>${fmtNum(s, s % 1 ? 1 : 0)} ${L(s === 1 ? 'semana' : 'semanas', s === 1 ? 'week' : 'weeks')}, ${fmtNum(Math.round((s * ADDER.semanaEUR) / 100) * 100, 0)} €</span><small>${esc(LL(x))}</small></li>`).join('')}</ul>
    ${tu}
    <p class="gta-est">${L(`Estimación de GrowFolio, entre ${fmtNum(ADDER.min, 0)} y ${fmtNum(ADDER.max, 0)} €: Rockstar no dice cuánto cuesta cada coche. Son ${fmtNum(total, 0)} semanas de trabajo de una persona a lo que le cuesta cada empleado a Rockstar North, con oficina y equipos. La marca y el modelo del juego son inventados, así que no hay licencia que pagar.`, `GrowFolio’s estimate, between €${fmtNum(ADDER.min, 0)} and €${fmtNum(ADDER.max, 0)}: Rockstar doesn’t say what each car costs. It’s ${fmtNum(total, 0)} weeks of one person’s work at what each employee costs Rockstar North, including office and equipment. The in-game brand and model are made up, so there’s no licence to pay.`)}</p>
  </section>`;
}

/* tu cartera de hoy, con los precios desde el primer tráiler: lo que habría hecho mientras esperabas,
   y qué posición ha pagado más copias (o las ha costado) */
function htmlDesdeTrailerGTA(M) {
  if (!M.total) return '';
  const T1 = GTA.trailer1;
  const dias = diasEntre(T1, hoyIso()) + 4;
  let serie = [];
  try { serie = serieCartera(M, dias).filter((x) => x.d.slice(0, 10) >= T1); } catch (e) { return ''; }
  if (serie.length < 30 || diasEntre(T1, serie[0].d.slice(0, 10)) > 10) return '';
  const v0 = serie[0].v, v1 = serie[serie.length - 1].v, pct = (v1 / v0 - 1) * 100;
  const W = 320, H = 110, vs = serie.map((x) => x.v), mn = Math.min(...vs), mx = Math.max(...vs), k = Math.max(1, Math.ceil(serie.length / 160));
  const pts = serie.filter((_, i) => i % k === 0 || i === serie.length - 1);
  const X = (i) => (i / (pts.length - 1)) * W, Y = (v) => H - 8 - ((v - mn) / (mx - mn || 1)) * (H - 26);
  const linea = pts.map((x, i) => `${X(i).toFixed(1)},${Y(x.v).toFixed(1)}`).join(' ');
  const marcas = [[T1, L('Tráiler 1', 'Trailer 1')], ['2025-05-06', L('Tráiler 2', 'Trailer 2')]].map(([d, t]) => { const i = pts.findIndex((x) => x.d.slice(0, 10) >= d); return i < 0 ? null : [X(i), Y(pts[i].v), t]; }).filter(Boolean).concat([[W, Y(v1), L('Hoy', 'Today')]]);
  // cada posición: lo que habría ganado o perdido lo que tienes hoy desde el primer tráiler, en copias
  const quien = [];
  for (const g of gruposGTA(M)) {
    const f = g.f; if (!f.hist || !(g.uds > 0) || !f.precio) continue;
    const p0 = precioEn(f.hist, T1, 'antes'); if (!p0) continue;
    const gan = g.uds * (f.precio - p0); if (Math.abs(gan) >= GTA.precio / 2) quien.push([g.inst.corto || g.inst.nombre, gan]);
  }
  quien.sort((a, b) => b[1] - a[1]);
  const lista = quien.length > 5 ? quien.slice(0, 3).concat(quien.slice(-2).filter((x) => x[1] < 0 && !quien.slice(0, 3).includes(x))) : quien;
  const qmx = Math.max(1, ...lista.map((x) => Math.abs(x[1])));
  return `<section class="gta-sec" aria-labelledby="gtaDesde">${rotulo('gtaDesde', 'mientras esperabas', 'while you waited')}
    <div class="gta-desde gta-rev"><b class="${cls(pct)}">${numGTA({ n: pctS(pct, 1), v: pct, f: 'pct' })}</b><p>${L(`Lo que ha hecho tu cartera de hoy desde el primer tráiler${S.oculto ? '' : `: de ${eur(v0, 0)} a ${eur(v1, 0)}`}.`, `What what you own today has done since the first trailer${S.oculto ? '' : `: from ${eur(v0, 0)} to ${eur(v1, 0)}`}.`)}</p>
      <svg class="gta-linea" viewBox="-8 -4 ${W + 16} ${H + 22}" aria-hidden="true"><defs><linearGradient id="gtaLG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2DE2E6" stop-opacity=".4"/><stop offset="1" stop-color="#2DE2E6" stop-opacity="0"/></linearGradient></defs><polygon points="0,${H} ${linea} ${W},${H}" fill="url(#gtaLG)"/><polyline points="${linea}" fill="none" stroke="#2DE2E6" stroke-width="2.2" vector-effect="non-scaling-stroke" pathLength="100"/>
        ${marcas.map(([x, y, t], i) => `<g class="gta-marca" style="--i:${i}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.2"/><text x="${Math.min(W - 2, Math.max(2, x)).toFixed(1)}" y="${(H + 14).toFixed(1)}" text-anchor="${x > W - 30 ? 'end' : x < 30 ? 'start' : 'middle'}">${esc(t)}</text></g>`).join('')}</svg>
    </div>
    ${lista.length && !S.oculto ? `<div class="gta-quien gta-rev"><p class="gta-sub">${L('Lo que más copias te ha pagado mientras esperabas', 'Who paid for the most copies while you waited')}</p><ul>${lista.map(([n, v], i) => `<li class="${v >= 0 ? 'mas' : 'menos'}" style="--w:${((Math.abs(v) / qmx) * 50).toFixed(1)}%;--i:${i}"><span class="n">${esc(n)}</span><span class="b"><i></i></span><b>${v >= 0 ? '+' : '−'}${nGTA(Math.abs(v) / GTA.precio)}</b></li>`).join('')}</ul></div>` : ''}
  </section>`;
}

/* música original de fondo: synthwave de los ochenta con producción de ahora, hecha en el navegador
   (Web Audio), sin archivos. 112 pulsaciones en Fa menor (Fam9, Re♭maj7, La♭add9, Mi♭), dos compases por
   acorde: pads anchos de varias sierras desafinadas que respiran con el bombo, bajo en corcheas con subgrave,
   caja con la reverb cerrada de los ochenta, charles, un arpegio con eco de lado a lado y una melodía propia
   en el estribillo. Intro filtrada que se abre; luego verso y estribillo en bucle, con subidas de ruido entre
   partes. Suena al abrir GTA VI y se calla al cerrarlo; el botón del altavoz la silencia y se recuerda. */
const MUSICA = { ctx: null, sal: null, t: null, paso: 0, prox: 0 };
const BPM_GTA = 112, PASO_GTA = 60 / BPM_GTA / 4;
const NOTA = (m) => 440 * Math.pow(2, (m - 69) / 12);
const ACORDES = [[53, 56, 60, 67], [49, 56, 60, 65], [56, 60, 63, 70], [51, 55, 58, 67]];
const BAJOS = [41, 37, 44, 39];
const BAJO_8 = [0, 0, 12, 0, 0, 0, 12, 7];       // una nota por corchea: raíz, octavas y la quinta al final
const BAJO_16 = [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 7, 0, 12, 0];   // en el estribillo, a semicorcheas
const ARPEGIO = [0, 1, 2, 3, 4, 3, 2, 1];        // notas del acorde una octava arriba (4 = la raíz otra octava más)
// la melodía del estribillo, ocho compases: [semicorchea, nota MIDI, duración en semicorcheas]
const MELODIA = [[0, 72, 6], [6, 68, 2], [8, 72, 4], [12, 75, 4], [16, 77, 10], [26, 75, 2], [28, 72, 4],
  [32, 73, 6], [38, 72, 2], [40, 68, 4], [44, 65, 4], [48, 68, 12], [60, 70, 4],
  [64, 72, 6], [70, 75, 2], [72, 77, 4], [76, 75, 4], [80, 72, 8], [88, 70, 4], [92, 68, 4],
  [96, 70, 6], [102, 67, 2], [104, 70, 4], [108, 72, 4], [112, 67, 16]];
function musicaNota(fn, t) { try { fn(t); } catch (e) {} }
// respuesta de una sala sintética: ruido estéreo que se apaga (y se oscurece) en «dur» segundos;
// «cerrada» es la de la caja de los ochenta: densa y cortada en seco
function impulsoGTA(ctx, dur, cerrada) {
  const n = Math.round(ctx.sampleRate * dur), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0;
    for (let i = 0; i < n; i++) {
      const x = i / n, env = cerrada ? (x < 0.82 ? 1 - x * 0.35 : (1 - x) / 0.18 * 0.7) : Math.pow(1 - x, 2.2) * Math.exp(-x * 3);
      const k = cerrada ? 0.6 : 0.5 - x * 0.38;       // la cola grande se oscurece al apagarse
      lp += k * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * env * (i < ctx.sampleRate * 0.012 && !cerrada ? i / (ctx.sampleRate * 0.012) : 1);
    }
  }
  return b;
}
function sonidoGTA() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (MUSICA.ctx) return MUSICA.ctx;
  const ctx = new AC();
  const gan = (v = 1) => { const x = ctx.createGain(); x.gain.value = v; return x; };
  const lado = (v) => { if (!ctx.createStereoPanner) return gan(); const p = ctx.createStereoPanner(); p.pan.value = v; return p; };
  // mezcla → filtro general (se abre en la intro) → compresor que lo pega todo → volumen con fundido
  const mezcla = gan(), filtroM = ctx.createBiquadFilter(), comp = ctx.createDynamicsCompressor(), sal = gan(0);
  filtroM.type = 'lowpass'; filtroM.frequency.value = 18000; filtroM.Q.value = 0.8;
  comp.threshold.value = -20; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.008; comp.release.value = 0.2;
  const corte = ctx.createBiquadFilter(), brillo = ctx.createBiquadFilter();
  corte.type = 'highpass'; corte.frequency.value = 32; brillo.type = 'highshelf'; brillo.frequency.value = 5000; brillo.gain.value = 3;
  mezcla.connect(corte); corte.connect(filtroM); filtroM.connect(brillo); brillo.connect(comp); comp.connect(sal); sal.connect(ctx.destination);
  // reverb grande y reverb cerrada de la caja
  const rev = ctx.createConvolver(); rev.buffer = impulsoGTA(ctx, 3.2); const aRev = gan(); aRev.connect(rev); const revS = gan(0.8); rev.connect(revS); revS.connect(mezcla);
  const puerta = ctx.createConvolver(); puerta.buffer = impulsoGTA(ctx, 0.34, true); const aPuerta = gan(); aPuerta.connect(puerta); const puertaS = gan(0.5); puerta.connect(puertaS); puertaS.connect(mezcla);
  // eco de lado a lado a corchea con puntillo, cada vuelta más apagado
  const aEco = gan(), dI = ctx.createDelay(2), dD = ctx.createDelay(2), vuelta = gan(0.42), apaga = ctx.createBiquadFilter(), pI = lado(-0.85), pD = lado(0.85), ecoS = gan(0.5);
  dI.delayTime.value = dD.delayTime.value = PASO_GTA * 3; apaga.type = 'lowpass'; apaga.frequency.value = 2800;
  aEco.connect(dI); dI.connect(pI); dI.connect(dD); dD.connect(pD); dD.connect(apaga); apaga.connect(vuelta); vuelta.connect(dI);
  pI.connect(ecoS); pD.connect(ecoS); ecoS.connect(mezcla); ecoS.connect(aRev);
  // grupos: los pads y el bajo se agachan con cada bombo (el «bombeo» del synthwave)
  const padF = ctx.createBiquadFilter(); padF.type = 'lowpass'; padF.frequency.value = 2100; padF.Q.value = 0.9;
  const pads = gan(), bajo = gan(), bat = gan(), arp = gan(), lead = gan();
  padF.connect(pads); pads.connect(mezcla); pads.connect(aRev);
  bajo.connect(mezcla); bat.connect(mezcla);
  arp.connect(mezcla); const arpEco = gan(0.55), arpRev = gan(0.25); arp.connect(arpEco); arpEco.connect(aEco); arp.connect(arpRev); arpRev.connect(aRev);
  lead.connect(mezcla); const leadEco = gan(0.35), leadRev = gan(0.45); lead.connect(leadEco); leadEco.connect(aEco); lead.connect(leadRev); leadRev.connect(aRev);
  const ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = ruido.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  Object.assign(MUSICA, { ctx, sal, filtroM, padF, pads, bajo, bat, arp, lead, aRev, aPuerta, ruido, lado });
  return ctx;
}
// ataque y caída exponenciales sin clics
function envGTA(g, t, vol, ata, dur, cae) {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + ata);
  if (dur > ata) g.gain.setValueAtTime(vol, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, ata) + cae);
}
function ruidoGTA(t, dur, tipo, frec, q, vol, destinos, ata = 0.001) {
  const { ctx, ruido } = MUSICA, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = ruido; f.type = tipo; f.frequency.value = frec; f.Q.value = q;
  envGTA(g, t, vol, ata, 0, dur);
  s.connect(f); f.connect(g); for (const x of destinos) g.connect(x);
  s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.05);
  return f;
}
function golpeGTA(t, tipo, vol = 1) {
  const M = MUSICA, ctx = M.ctx;
  if (tipo === 'palmas') {
    const p = M.lado(-0.15); p.connect(M.bat); p.connect(M.aRev);
    for (const [dt, v] of [[0, 0.7], [0.011, 0.55], [0.023, 1]]) ruidoGTA(t + dt, dt === 0.023 ? 0.16 : 0.012, 'bandpass', 1250, 1.1, 0.3 * v * vol, [p]);
    return;
  }
  if (tipo === 'bombo') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.07); o.frequency.exponentialRampToValueAtTime(40, t + 0.38);
    envGTA(g, t, 0.8 * vol, 0.003, 0.02, 0.36);
    o.connect(g); g.connect(M.bat); o.start(t); o.stop(t + 0.5);
    ruidoGTA(t, 0.012, 'highpass', 2500, 0.7, 0.22 * vol, [M.bat]);
    // los pads y el bajo se agachan y vuelven en curva (sin saltos, que suenan como un clic)
    M.pads.gain.setTargetAtTime(0.28, t, 0.004); M.pads.gain.setTargetAtTime(1, t + 0.03, 0.11);
    M.bajo.gain.setTargetAtTime(0.4, t, 0.004); M.bajo.gain.setTargetAtTime(1, t + 0.03, 0.08);
    return;
  }
  if (tipo === 'caja') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(165, t + 0.1);
    envGTA(g, t, 0.32 * vol, 0.002, 0, 0.13);
    o.connect(g); g.connect(M.bat); g.connect(M.aPuerta); o.start(t); o.stop(t + 0.2);
    ruidoGTA(t, 0.22, 'bandpass', 1900, 0.6, 0.5 * vol, [M.bat, M.aPuerta, M.aRev]);
    ruidoGTA(t, 0.09, 'highpass', 5500, 0.7, 0.22 * vol, [M.bat]);
    return;
  }
  const ab = tipo === 'abierto';
  const p = M.lado(0.25); p.connect(M.bat);
  ruidoGTA(t, ab ? 0.24 : 0.035, 'highpass', ab ? 7000 : 8000, 0.8, (ab ? 0.17 : 0.13) * vol, [p]);
}
function bajoGTA(t, m, dur) {
  const M = MUSICA, ctx = M.ctx;
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = NOTA(m);
  f.type = 'lowpass'; f.Q.value = 3; f.frequency.setValueAtTime(1900, t); f.frequency.exponentialRampToValueAtTime(380, t + dur);
  envGTA(g, t, 0.12, 0.005, dur * 0.6, dur * 0.5);
  o.connect(f); f.connect(g); g.connect(M.bajo); o.start(t); o.stop(t + dur * 1.2);
  // el subgrave, limpio: lo que hace que suene de ahora en unos cascos o en un móvil con buen altavoz
  const s = ctx.createOscillator(), gs = ctx.createGain();
  s.frequency.value = NOTA(m - 12 * (m >= 41 ? 1 : 0));
  envGTA(gs, t, 0.13, 0.006, dur * 0.7, dur * 0.4);
  s.connect(gs); gs.connect(M.bajo); s.start(t); s.stop(t + dur * 1.2);
}
function padGTA(t, notas, dur, brillo) {
  const M = MUSICA, ctx = M.ctx;
  for (const m of notas) {
    // cada nota, tres sierras un poco desafinadas y abiertas a los lados
    for (const [det, lado] of [[-12, -0.9], [0, 0], [12, 0.9]]) {
      const o = ctx.createOscillator(), g = ctx.createGain(), p = M.lado(lado);
      o.type = 'sawtooth'; o.frequency.value = NOTA(m); o.detune.value = det + (Math.random() - 0.5) * 4;
      envGTA(g, t, 0.034, 0.5, dur - 0.5, 0.9);
      o.connect(g); g.connect(p); p.connect(M.padF); o.start(t); o.stop(t + dur + 1);
    }
    if (brillo) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = NOTA(m + 12); envGTA(g, t, 0.022, 0.8, dur - 0.8, 1); o.connect(g); g.connect(M.pads); o.start(t); o.stop(t + dur + 1.1); }
  }
}
function arpGTA(t, m, vol) {
  const M = MUSICA, ctx = M.ctx, f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'lowpass'; f.Q.value = 4; f.frequency.setValueAtTime(4800, t); f.frequency.exponentialRampToValueAtTime(650, t + 0.16);
  for (const [forma, det] of [['sawtooth', -5], ['square', 5]]) { const o = ctx.createOscillator(); o.type = forma; o.frequency.value = NOTA(m); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + 0.32); }
  envGTA(g, t, vol, 0.003, 0, 0.26);
  f.connect(g); g.connect(M.arp);
}
function leadGTA(t, m, dur, capa) {
  const M = MUSICA, ctx = M.ctx, fr = NOTA(m), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'lowpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(1800, t); f.frequency.linearRampToValueAtTime(3400, t + 0.08);
  // vibrato que entra poco a poco y un pequeño portamento desde la nota anterior si van ligadas
  const lfo = ctx.createOscillator(), prof = ctx.createGain(); lfo.frequency.value = 5.4; prof.gain.setValueAtTime(0, t); prof.gain.linearRampToValueAtTime(dur > 0.4 ? 9 : 3, t + Math.min(0.5, dur));
  lfo.connect(prof); lfo.start(t); lfo.stop(t + dur + 0.3);
  const desde = M.leadFin && Math.abs(M.leadFin - t) < 0.05 ? M.leadFr : null;
  for (const det of [-7, 7]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.detune.value = det;
    if (desde) { o.frequency.setValueAtTime(desde, t); o.frequency.exponentialRampToValueAtTime(fr, t + 0.045); } else o.frequency.value = fr;
    prof.connect(o.detune); o.connect(f); o.start(t); o.stop(t + dur + 0.3);
  }
  if (capa) { const o = ctx.createOscillator(), gc = ctx.createGain(); o.type = 'sine'; o.frequency.value = fr * 2; gc.gain.value = 0.5; prof.connect(o.detune); o.connect(gc); gc.connect(f); o.start(t); o.stop(t + dur + 0.3); }
  envGTA(g, t, 0.11, 0.018, dur * 0.85, 0.18);
  f.connect(g); g.connect(M.lead);
  M.leadFin = t + dur; M.leadFr = fr;
}
// subida de ruido antes de cada parte, y un golpe grave que se apaga al llegar
function subidaGTA(t, dur) {
  const f = ruidoGTA(t, dur, 'bandpass', 300, 2.5, 0.07, [MUSICA.bat, MUSICA.aRev], dur * 0.95);
  f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
}
function impactoGTA(t) {
  const M = MUSICA, ctx = M.ctx, o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.4);
  envGTA(g, t, 0.45, 0.004, 0, 1.5); o.connect(g); g.connect(M.bat); o.start(t); o.stop(t + 1.6);
  const f = ruidoGTA(t, 1.6, 'lowpass', 4000, 0.7, 0.06, [M.aRev]); f.frequency.setValueAtTime(4000, t); f.frequency.exponentialRampToValueAtTime(200, t + 1.6);
}
/* un paso de semicorchea. Compases 0-3: intro; luego, en bucle de 24, verso (8) y estribillo (16) */
function pasoGTA(paso, t) {
  const M = MUSICA, d = PASO_GTA, s = paso % 16, bar = Math.floor(paso / 16);
  const intro = bar < 4, cb = intro ? -1 : (bar - 4) % 24, verso = !intro && cb < 8, estr = cb >= 8;
  const ac = Math.floor(bar / 2) % 4, notas = ACORDES[ac];
  if (s === 0) {
    if (bar === 0) musicaNota(() => { M.filtroM.frequency.setValueAtTime(420, t); M.filtroM.frequency.exponentialRampToValueAtTime(18000, t + d * 16 * 4); });
    if (cb === 0) musicaNota(() => M.padF.frequency.setTargetAtTime(2700, t, 0.6));
    if (cb === 8) musicaNota(() => { M.padF.frequency.setTargetAtTime(3800, t, 0.5); impactoGTA(t); });
    if (bar % 2 === 0) musicaNota(() => padGTA(t, notas, d * 32 + 0.2, estr));
    if (bar === 2 || cb === 6 || cb === 22) musicaNota(() => subidaGTA(t, d * 32));
  }
  // bajo: una nota larga al empezar, corcheas en el verso y semicorcheas que empujan en el estribillo
  if (intro && bar < 2) { if (s === 0 && bar === 0) musicaNota(() => bajoGTA(t, BAJOS[ac], d * 31)); }
  else if (estr) musicaNota(() => bajoGTA(t, BAJOS[ac] + BAJO_16[s], d * 0.95));
  else if (s % 2 === 0) musicaNota(() => bajoGTA(t, BAJOS[ac] + BAJO_8[s / 2], d * 1.8));
  // batería; en el último compás del estribillo, un respiro antes de volver al verso
  const respiro = cb === 23 && s >= 8;
  if ((s % 4 === 0 || (s === 14 && bar % 4 === 3 && !intro)) && bar >= 2 && !respiro) musicaNota(() => golpeGTA(t, 'bombo', s === 14 ? 0.7 : 1));
  if (!intro && (s === 4 || s === 12) && !respiro) { musicaNota(() => golpeGTA(t, 'caja')); if (estr) musicaNota(() => golpeGTA(t, 'palmas')); }
  if ((bar === 3 || cb === 7 || cb === 23) && s >= 8) musicaNota(() => golpeGTA(t, 'caja', 0.25 + (s - 8) * 0.07));
  if (bar >= 3 && !respiro) {
    if (!intro && s % 4 === 2) musicaNota(() => golpeGTA(t, 'abierto', estr ? 1 : 0.7));
    else musicaNota(() => golpeGTA(t, 'cerrado', s % 2 === 0 ? 0.85 : 0.45));
  }
  // arpegio: en todo el verso (más bajo) y en el estribillo
  if (!intro) musicaNota(() => arpGTA(t, notas[ARPEGIO[s % 8] % 4] + 12 + (ARPEGIO[s % 8] === 4 ? 12 : 0), estr ? 0.07 : 0.04));
  // melodía en el estribillo; la segunda vuelta, con una capa una octava arriba
  if (estr) { const pos = ((cb - 8) % 8) * 16 + s; for (const [p, m, l] of MELODIA) if (p === pos) musicaNota(() => leadGTA(t, m, l * d, cb >= 16)); }
}
function musicaGTA(encender) {
  if (!encender) {
    if (!MUSICA.ctx) return;
    clearInterval(MUSICA.t); MUSICA.t = null;
    const { ctx, sal } = MUSICA, t = ctx.currentTime;
    sal.gain.cancelScheduledValues(t); sal.gain.setValueAtTime(sal.gain.value, t); sal.gain.linearRampToValueAtTime(0, t + 0.6);
    setTimeout(() => { if (!MUSICA.t && ctx.state === 'running') ctx.suspend(); }, 700);
    return;
  }
  const ctx = sonidoGTA(); if (!ctx) return;
  ctx.resume();
  if (MUSICA.t) return;
  const t0 = ctx.currentTime + 0.08;
  MUSICA.paso = 0; MUSICA.prox = t0; MUSICA.leadFin = 0;
  MUSICA.sal.gain.cancelScheduledValues(t0); MUSICA.sal.gain.setValueAtTime(0, t0); MUSICA.sal.gain.linearRampToValueAtTime(VOL_GTA, t0 + 2);
  MUSICA.t = setInterval(() => {
    while (MUSICA.prox < ctx.currentTime + 0.15) { pasoGTA(MUSICA.paso, MUSICA.prox); MUSICA.prox += PASO_GTA; MUSICA.paso++; }
  }, 25);
}
const VOL_GTA = 0.6;
const SON = { on: SVG('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>', 1.8), off: SVG('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>', 1.8) };
const botonSonGTA = () => { const on = LS.get('inv-gta-son', true); return `<button class="gta-son" type="button" data-son aria-pressed="${on}" aria-label="${on ? L('Silenciar la música', 'Mute the music') : L('Poner la música', 'Play the music')}">${on ? SON.on : SON.off}</button>`; };

function htmlGTA(M) {
  const f = gtaFalta();
  return `<header class="gta-hero">
      ${escenaGTA()}
      <div class="gta-hero-c">
        <p class="gta-rotulo gta-pre" data-no-trad>${f ? L('cuenta atrás', 'countdown') : L('ya a la venta', 'out now')}</p>
        <h2 class="gta-tit">GTA VI</h2>
        <div id="gtaReloj">${relojGTA()}</div>
        <p class="gta-fecha">${L(`19 de noviembre de 2026, en PS5 y Xbox Series X y S, a ${fmtNum(GTA.precio, 2)} €.${f && f.d > 7 ? ' Precarga desde el 12 de noviembre.' : ''}`, `19 November 2026, on PS5 and Xbox Series X|S, at €${fmtNum(GTA.precio, 2)}.${f && f.d > 7 ? ' Pre-load from 12 November.' : ''}`)}</p>
        ${f ? esperaGTA() : ''}
      </div>
      ${paisajeGTA()}
      <span class="gta-baja" aria-hidden="true">${SVG('<path d="M6 9l6 6 6-6"/>', 2)}</span>
    </header>
    <div class="gta-cuerpo">
      ${htmlCaminoGTA()}
      ${htmlCopiasGTA(M)}
      ${htmlAdderGTA(M)}
      ${htmlDesdeTrailerGTA(M)}
      <p class="gta-pie">${L('Fechas, precio, plataformas y tráileres: Rockstar Games y Take-Two. Ventas de GTA V: Take-Two. Precio del Adder en el juego: GTA V. Lo que costó hacerlo: estimación de GrowFolio con los gastos de personal de Rockstar North (PCGamesInsider) y lo que se tarda en hacer un coche para un videojuego (GTPlanet). La música es original, hecha por GrowFolio. GrowFolio no tiene relación con Rockstar Games ni con Take-Two.', 'Dates, price, platforms and trailers: Rockstar Games and Take-Two. GTA V sales: Take-Two. Adder in-game price: GTA V. What it cost to make: GrowFolio’s estimate from Rockstar North’s staff costs (PCGamesInsider) and how long a video game car takes to make (GTPlanet). The music is original, made by GrowFolio. GrowFolio has no connection with Rockstar Games or Take-Two.')}</p>
    </div>`;
}
/* las cifras cuentan desde cero cuando aparecen en pantalla */
function contarGTA(el) {
  const to = +el.dataset.to, fm = el.dataset.f, fin = el.dataset.fin || el.textContent;
  if (!isFinite(to)) return;
  const desde = fm === 'anio' ? new Date().getFullYear() : 0;
  const fmt = (x) => (fm === 'anio' ? 'Año ' + Math.round(x) : fm === 'signo' ? (x >= 0 ? '+' : '−') + nGTA(Math.abs(x)) : fm === 'anos' ? nGTA(x, x < 10 ? 1 : 0) + (x < 2 ? ' año' : ' años') : fm === 'eur' ? fmtNum(x, 0) + ' €' : fm === 'pct' ? pctS(x, 1) : fm === 'pct1' ? fmtNum(x, 1) + ' %' : fm === 'pct0' ? fmtNum(x, 0) + ' %' : fm === 'n1' ? nGTA(x, 1) : nGTA(x));
  const t0 = performance.now(), dur = 1200;
  const paso = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = k < 1 ? fmt(desde + (to - desde) * e) : fin; if (k < 1 && el.isConnected) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
}
/* lo que aparece al bajar: cada bloque entra cuando se ve */
function animarGTA(raiz) {
  const els = $$('.gta-rev', raiz);
  if ((window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('vis')); return null; }
  // la línea del camino se va rellenando según bajas
  const camino = $('.gta-camino', raiz);
  if (camino) {
    const prog = () => { const r = camino.getBoundingClientRect(), c = raiz.getBoundingClientRect(); const k = Math.max(0, Math.min(1, (c.top + c.height * 0.62 - r.top) / (r.height || 1))); camino.style.setProperty('--prog', k.toFixed(3)); };
    raiz.addEventListener('scroll', prog, { passive: true }); prog();
  }
  const io = new IntersectionObserver((ents) => {
    for (const en of ents) {
      if (!en.isIntersecting) continue;
      en.target.classList.add('vis'); io.unobserve(en.target);
      en.target.querySelectorAll('[data-to]').forEach(contarGTA);
    }
  }, { root: raiz, threshold: 0.15 });
  els.forEach((e) => io.observe(e));
  return io;
}
function abrirGTA() {
  fuenteGTA();
  const M = S.M || calcular();
  const fondo = document.createElement('div');
  fondo.className = 'hoja-fondo gta-fondo';
  fondo.innerHTML = `<div class="gta-marco" role="dialog" aria-modal="true" aria-label="${L('GTA VI y tu cartera', 'GTA VI and your portfolio')}">${botonSonGTA()}<button class="gta-x" type="button" data-cerrar aria-label="${L('Cerrar', 'Close')}">${ICONOS.cerrar}</button><div class="gta">${htmlGTA(M)}</div></div>`;
  const tic = setInterval(() => { const r = $('#gtaReloj', fondo); if (r) r.innerHTML = relojGTA(); }, 1000);
  let io = null;
  // la música: se abre desde un toque, así que el navegador deja que suene
  if (LS.get('inv-gta-son', true)) musicaGTA(true);
  let quitarAtras = () => {};
  const cerrar = (desdeAtras) => { if (!fondo.isConnected) return; clearInterval(tic); musicaGTA(false); if (io) io.disconnect(); fondo.remove(); document.removeEventListener('keydown', tecla, true); document.removeEventListener('visibilitychange', oculta); if (desdeAtras !== true) quitarAtras(); };
  const oculta = () => { if (document.hidden) musicaGTA(false); else if (LS.get('inv-gta-son', true) && fondo.isConnected) musicaGTA(true); };
  document.addEventListener('visibilitychange', oculta);
  const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(); } };
  fondo.addEventListener('click', (e) => {
    const son = e.target.closest('[data-son]');
    if (son) { const on = !LS.get('inv-gta-son', true); LS.set('inv-gta-son', on); musicaGTA(on); son.outerHTML = botonSonGTA(); vibra(); return; }
    if (e.target === fondo || e.target.closest('[data-cerrar]')) cerrar(); else if (e.target.closest('.gta-baja')) $('.gta-cuerpo', fondo).scrollIntoView({ behavior: 'smooth' });
  });
  document.addEventListener('keydown', tecla, true);
  document.body.appendChild(fondo);
  quitarAtras = conAtras(() => cerrar(true), fondo);
  io = animarGTA($('.gta', fondo));
  $('.gta-x', fondo).focus({ preventScroll: true });
}
// la primera vez que se entra con esto: un aviso a pantalla completa, como la presentación
function avisoGTA(seguir) {
  if (!gtaActivo() || LS.get('inv-gta', null) || !S.cartera) return seguir && seguir();
  LS.set('inv-gta', true);
  fuenteGTA();
  const f = gtaFalta();
  const fondo = document.createElement('div');
  fondo.className = 'hoja-fondo gta-fondo';
  fondo.innerHTML = `<div class="gta-marco gta-aviso" role="dialog" aria-modal="true" aria-label="Nuevo: GTA VI"><div class="gta"><header class="gta-hero">
    ${escenaGTA()}
    <div class="gta-hero-c">
      <p class="gta-rotulo gta-pre" data-no-trad>${L('nuevo en GrowFolio', 'new in GrowFolio')}</p>
      <h2 class="gta-tit">GTA VI</h2>
      <div id="gtaReloj">${relojGTA()}</div>
      <p class="gta-lead">${L(`${f ? 'Sale el 19 de noviembre. Para la espera' : 'Ya ha salido. Para celebrarlo'}, unas cuentas con tu cartera: cuántos GTA VI vale, cuántos Adders podría hacer Rockstar con ella y cuánto llevamos de camino desde GTA V.`, `${f ? 'It’s out on 19 November. While you wait' : 'It’s out. To celebrate'}, your portfolio in numbers: how many copies of GTA VI it’s worth, how many Adders Rockstar could build with it and how far we’ve come since GTA V.`)}</p>
      <p class="gta-donde">${L('Lo tienes siempre arriba, junto a «En directo», con los días que faltan.', 'It’s always at the top, next to «Live», with the days to go.')}</p>
      <div class="gta-btns"><button type="button" class="gta-b pri" data-ver>${L('Verlo', 'Show me')}</button><button type="button" class="gta-b" data-luego>${L('Luego', 'Later')}</button></div>
    </div>
    ${paisajeGTA()}
  </header></div></div>`;
  const tic = setInterval(() => { const r = $('#gtaReloj', fondo); if (r) r.innerHTML = relojGTA(); }, 1000);
  const cerrar = (ver) => {
    clearInterval(tic); fondo.remove(); document.removeEventListener('keydown', tecla, true);
    if (ver) abrirGTA();
    else {
      if (S.vista !== 'cartera') location.hash = '#cartera';
      setTimeout(() => { const c = $('.gta-top') || $('.gta-chip'); if (c) { c.scrollIntoView({ block: 'center', behavior: 'smooth' }); c.classList.add('pulsa'); setTimeout(() => c.classList.remove('pulsa'), 5000); } }, 350);
    }
    if (seguir) setTimeout(seguir, 600);
  };
  const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(false); } };
  fondo.addEventListener('click', (e) => { if (e.target.closest('[data-ver]')) cerrar(true); else if (e.target === fondo || e.target.closest('[data-luego]')) cerrar(false); });
  document.addEventListener('keydown', tecla, true);
  document.body.appendChild(fondo);
  setTimeout(() => $('[data-ver]', fondo).focus({ preventScroll: true }), 50);
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-gta]')) abrirGTA(); });

/* al entrar: tour la primera vez, novedades si hay versión nueva y, después, el aviso de la app */
