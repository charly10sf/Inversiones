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
// la primera vez, el aviso a pantalla completa (su dibujo y su música van en el trozo de GTA, que se baja solo si sale)
function avisoGTA(seguir) {
  if (!gtaActivo() || LS.get('inv-gta', null) || !S.cartera) return seguir && seguir();
  avisoGTAPantalla(seguir);
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-gta]')) abrirGTA(); });

/* al entrar: tour la primera vez, novedades si hay versión nueva y, después, el aviso de la app */
