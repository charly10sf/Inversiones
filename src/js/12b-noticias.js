/* Noticias (9 nov 2026, rama «noticias»): lo que comparten la página de Noticias (trozo «noticias») y la hoja de
   Buenos días. Carlos, 9 nov: «los datos de buenos días son erróneos o algo así». Lo que salía mal:
   - «Tu cartera hoy» con lo que se movió el viernes (o el jueves, en los fondos) aunque fuera lunes a las 6 de la mañana,
   - el S&P 500 y el Nasdaq del viernes como si fueran de hoy,
   - titulares viejos que Google Noticias vuelve a fechar hoy («el Ibex supera los 18.600 puntos» con el Ibex en 19.700)
     y páginas de cotización que no son noticias («Precio del Brent hoy. Cotización en tiempo real»).
   Aquí: de qué día es cada cifra, qué titular vale y de qué tema es cada uno. */

// lo que no es una noticia: páginas de cotización y de relleno que Google Noticias fecha cada día
const NOT_RUIDO = /tiempo real|cotizaci[oó]n (de )?hoy|^precio (del|de la|de) [^.]{0,40}\bhoy\b|minuto a minuto|\bhor[oó]scopo|loter[ií]a|\bquiniela/i;
// el nivel de un índice en el titular: si no cuadra con el de hoy (más de un 5 % de diferencia), es una noticia vieja
const NOT_NIVELES = [
  ['^IBEX', /\bIbex(?:[ -]?35)?\b[^.]{0,80}?\b(\d{1,2}[.\s]\d{3}(?:,\d+)?)\s*puntos/i],
  ['^GSPC', /\bS&P(?:[ -]?500)?\b[^.]{0,80}?\b(\d{1,2}[.\s]\d{3}(?:,\d+)?)\s*puntos/i],
  ['^NDX', /\bNasdaq(?:[ -]?100)?\b[^.]{0,80}?\b(\d{1,2}[.\s]\d{3}(?:,\d+)?)\s*puntos/i],
  ['^STOXX50E', /\bEuro ?Stoxx(?:[ -]?50)?\b[^.]{0,80}?\b(\d{1,2}[.\s]\d{3}(?:,\d+)?)\s*puntos/i],
  ['^GDAXI', /\bDax\b[^.]{0,80}?\b(\d{1,2}[.\s]\d{3}(?:,\d+)?)\s*puntos/i],
];
// lo que habla de un nivel que aún no se ha alcanzado no es una noticia vieja
const NOT_PREVISION = /podr[ií]a|objetivo|previs|hacia los|llegar a|apunta a|potencial|si (sube|cae|baja)|soporte|resistencia/i;
const numTitular = (s) => +String(s).replace(/[.\s]/g, '').replace(',', '.');
function titularCuadra(t) {
  const MK = (S.precios && S.precios.mercados) || {};
  if (!t || NOT_PREVISION.test(t)) return true;
  for (const [k, re] of NOT_NIVELES) {
    const m = re.exec(t), p = MK[k] && MK[k].precio;
    if (m && p > 0) { const v = numTitular(m[1]); if (v > 100 && Math.abs(v / p - 1) > 0.05) return false; }
  }
  return true;
}
// las horas que cuentan como «reciente»: un día, y el fin de semana entero si es sábado, domingo o lunes
function horasRecientes(base = 30) {
  const d = new Date().getDay();
  return base + (d === 1 ? 48 : d === 0 ? 24 : 0);
}
const edadHoras = (d) => (d ? (Date.now() - new Date(d).getTime()) / 36e5 : Infinity);
const notValida = (n, horas) => !!(n && n.t && n.u && !NOT_RUIDO.test(n.t) && titularCuadra(n.t) && (!horas || edadHoras(n.d) <= horas));

/* los temas, como los de Investing (la app que usa un amigo de Carlos para las noticias): por zonas y por mercados */
const NOT_TEMAS = [
  ['todo', 'Todo', 'All'], ['tuyo', 'Lo tuyo', 'Yours'], ['espana', 'España', 'Spain'], ['eeuu', 'EEUU', 'US'], ['europa', 'Europa', 'Europe'],
  ['asia', 'Asia y emergentes', 'Asia & emerging'], ['tipos', 'Tipos y bancos centrales', 'Rates & central banks'], ['materias', 'Materias primas', 'Commodities'],
  ['divisas', 'Divisas', 'Currencies'], ['cripto', 'Cripto', 'Crypto'], ['region', 'Tu comunidad', 'Your region'],
];
// la zona que pone la Action a cada consulta, y luego lo que dice el titular (manda el titular: una noticia del Ibex
// que salía buscando «bonos» iba a Tipos)
const NOT_Z = { 'España': 'espana', EEUU: 'eeuu', Europa: 'europa', Asia: 'asia', Emergentes: 'asia', Tipos: 'tipos', 'Materias primas': 'materias', Divisas: 'divisas', Cripto: 'cripto', Empresas: 'espana' };
const NOT_RE = [
  ['cripto', /bitcoin|cripto|ethereum|\bBTC\b|blockchain|stablecoin/i],
  ['materias', /petr[oó]leo|\bBrent\b|\bOPEP\b|\boro\b|\bplata\b|\bcobre\b|gas natural|materias primas|\bcrudo\b/i],
  ['espana', /\bIbex\b|bolsa (de madrid|espa[ñn]ola)|\bCNMV\b/i],
  ['tipos', /\bBCE\b|\bFed\b|Reserva Federal|tipos de inter|Lagarde|Powell|inflaci[oó]n|\bIPC\b|\bbonos?\b|prima de riesgo|Banco de Inglaterra|Banco de Jap[oó]n/i],
  ['divisas', /d[oó]lar|divisas?\b|\byen\b|libra esterlina|tipo de cambio|euro frente/i],
  ['eeuu', /Wall Street|\bS&P\b|Nasdaq|Dow Jones|EE\.? ?UU|Estados Unidos/i],
  ['asia', /China|Jap[oó]n|Nikkei|Hang Seng|\bIndia\b|Brasil|emergentes|\bAsia|Corea/i],
  ['europa', /Euro ?Stoxx|\bDax\b|\bCAC\b|\bFTSE\b|Europa|europe[ao]s?\b|Alemania|Francia|Italia|Reino Unido/i],
  ['espana', /Espa[ñn]a|espa[ñn]ol/i],
];
const temaNoticia = (n) => { for (const [k, re] of NOT_RE) if (re.test(n.t || '')) return k; return NOT_Z[n.z] || 'europa'; };

/* todas las noticias de hoy en una lista: las de lo tuyo (con su posición), las del mercado (con su tema) y las de tu
   comunidad; sin repetidas, sin ruido y de la más nueva a la más vieja */
function noticiasTodas(M, horas = 24 * 7) {
  const N = (S.precios && S.precios.noticias) || {}, out = [], vistos = new Set();
  const meter = (n, extra) => {
    const k = String(n.t || '').toLowerCase().replace(/\W+/g, '').slice(0, 48);
    if (!notValida(n, horas) || vistos.has(k)) return;
    vistos.add(k); out.push({ ...n, ...extra });
  };
  for (const f of (M && M.filas) || []) {
    const i = f.inst, lista = (N[i.id] && N[i.id].length ? N[i.id] : i.yahoo ? noticiasIdea(i.yahoo) : []) || [];
    for (const n of lista) meter(n, { tema: 'tuyo', inst: i, id: i.id, varDia: f.varUlt, fechaMov: fechaMovFila(f) });
  }
  for (const n of N.mercado || []) meter(n, { tema: temaNoticia(n) });
  const c = comunidadUsuario();
  if (c) for (const n of noticiasComunidad(c, 8, 7)) meter(n, { tema: 'region' });
  return out.sort((a, b) => (String(b.d || '') > String(a.d || '') ? 1 : -1));
}

/* de qué día es cada cifra */
const ayerIso = () => { const x = deIso(hoyIso()); x.setDate(x.getDate() - 1); return iso(x); };
// «hoy», «ayer» o el día de la semana corto («vie»): para poner al lado de una cifra que no es de hoy
function diaCifra(fecha) {
  if (!fecha || fecha >= hoyIso()) return '';
  if (fecha === ayerIso()) return L('ayer', 'yest.');
  return diaSemL(deIso(fecha).getDay()).slice(0, 3);
}
// el día del último cambio de una posición: el de su precio en directo o, si no va en directo, el de su último precio
const fechaMovFila = (f) => f.fechaMov || (f.vivo ? hoyIso() : f.fecha || null);
/* Buenos días (12 nov: «hoy» es hoy en todas partes). Lo de arriba es M.dia, igual que en Inicio, en el widget y en la
   casilla de hoy del calendario. Aquí: una nota si la bolsa aún no ha abierto (o si solo se ha movido la cripto), el
   último día de bolsa anterior con la misma cifra que su casilla del calendario, y con qué día van los fondos. */
function diaDeLaCartera(M) {
  const hoy = hoyIso(), esFondo = (f) => /^Fondo/.test(f.inst.tipo || '');
  const conHoy = M.filas.filter((f) => f.varDia != null), bolsaHoy = conHoy.some((f) => f.inst.clase !== 'Cripto');
  const finde = [0, 6].includes(new Date().getDay()), cripto = M.filas.some((f) => f.inst.clase === 'Cripto');
  const pronto = new Date().getHours() < 10;
  const nota = bolsaHoy ? '' : conHoy.length
    ? (finde ? L('Es fin de semana: lo de hoy es solo la cripto, que cotiza todos los días.', 'It’s the weekend: today is just crypto, which trades every day.') : pronto ? L('La bolsa aún no ha abierto: lo de hoy es solo la cripto, que cotiza a todas horas.', 'The stock market hasn’t opened yet: today is just crypto, which trades around the clock.') : L('Lo de hoy es solo la cripto: lo demás aún no tiene precio de hoy.', 'Today is just crypto: the rest has no price for today yet.'))
    : (finde ? L('Es fin de semana: hoy no cotiza nada de lo tuyo.', 'It’s the weekend: nothing of yours trades today.') : pronto ? L('La bolsa aún no ha abierto: hoy no se ha movido nada de lo tuyo.', 'The stock market hasn’t opened yet: nothing of yours has moved today.') : L('Aún no hay precios de hoy de lo tuyo.', 'No prices for today yet for your holdings.'));
  // el último día anterior con movimiento, con la cifra de su casilla del calendario
  let antes = null;
  try {
    const u = cambiosPorDia(M, 12).filter((x) => x.d < hoy && (cripto || ![0, 6].includes(deIso(x.d).getDay()))).pop();
    if (u) { const x = deIso(u.d); antes = { d: u.d, e: u.e, p: u.p, t: u.d === ayerIso() ? L(`Ayer, ${diaSemL(x.getDay()).slice(0, 3)} ${x.getDate()}`, `Yesterday, ${diaSemL(x.getDay()).slice(0, 3)} ${x.getDate()}`) : L(`El ${DIAS_LARGOS[x.getDay()]} ${x.getDate()}`, `${DIAS_EN[x.getDay()]} ${x.getDate()}`) }; }
  } catch (e) { antes = null; }
  const fondos = M.filas.filter((f) => esFondo(f) && fechaMovFila(f)).map(fechaMovFila).sort();
  const uf = fondos.length ? fondos[fondos.length - 1] : null;
  const corto = (d) => { const x = deIso(d); return `${diaSemL(x.getDay()).slice(0, 3)} ${x.getDate()}`; };
  const notaFondos = uf && uf < hoy ? L(`Los fondos publican su valor uno o dos días después: su cambio va en el día de ese valor (el último de los tuyos, del ${corto(uf)}).`, `Funds publish their price a day or two later: their change goes on that day (your latest is from ${corto(uf)}).`) : '';
  return { nota, antes, notaFondos, bolsaHoy };
}
// la hora de los precios que se están viendo (la última vez que los bajó la Action, o ahora si van en directo)
function horaPrecios() {
  const g = S.precios && S.precios.generado;
  if (!g) return '';
  const t = new Date(g);
  return isFinite(t) ? t.toLocaleTimeString(IDIOMA === 'en' ? 'en-GB' : 'es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
}
// una ficha de un índice: nombre, cambio y, si no es de hoy, de qué día
function fichaIndice(k, nom) {
  const MK = (S.precios && S.precios.mercados) || {}, m = MK[k];
  if (!m || m.variacion_dia == null) return '';
  const v = m.variacion_dia, dc = diaCifra(m.fecha);
  return `<span class="${v >= 0 ? 'up' : 'down'}"${dc ? ` title="${esc(L('Último cierre', 'Last close'))}"` : ''}><i>${v >= 0 ? '↑' : '↓'}</i>${esc(nom)} <b>${pctS(v, 2)}</b>${dc ? `<small class="fi-dia">${esc(dc)}</small>` : ''}</span>`;
}
// vistaNoticias: la cáscara; el contenido lo pinta el trozo «noticias» (pintarNoticias) en cuanto se baja
const vistaNoticias = () => `<div class="panel-not" id="panelNot" aria-busy="true"><div class="pav-esq" role="status" aria-label="${L('Preparando las noticias…', 'Getting the news ready…')}"><i></i><i></i><i></i></div></div>`;
