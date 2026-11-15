/* =====================================================================
   Que la cabecera y las cifras de Hoy quepan sin cortar nada (hasta el 15 nov vivía con la cuenta atrás de GTA VI, en
   48-gta.js; la cuenta atrás se quitó entera y esto se quedó tal cual).
   ===================================================================== */
// que la cabecera quepa sin cortar nada: se prueba de más a menos, y para en cuanto cabe y la luz de En directo se lee entera
var PASOS_CAB = ['cab-1', 'cab-2', 'cab-3', 'cab-4', 'cab-5', 'cab-6', 'cab-7', 'cab-8'];  // cab-8: solo con un diseño de Toisón, fuera la palabra TOISÓN (queda el símbolo)
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
   cabe: primero fuera los logos (0.7; antes, las flechitas), luego la letra un poco más pequeña en todas, y
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
