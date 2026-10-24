/* =====================================================================
   Calendario: lo que viene para tu cartera y cuántos días faltan. Resultados y dividendos de tus
   acciones (del radar, que la Action renueva cada 3 horas, o de la ficha de la Action), los resultados
   de las grandes empresas que hay dentro de tus fondos, la Fed y el BCE, los días sin bolsa, Hacienda,
   GTA VI y tus aportaciones. Las fechas fijas salen de los calendarios oficiales de la Fed, el BCE y la
   NYSE (revisados el 20 de octubre de 2026): hay que añadir las de 2028 cuando se publiquen.
   ===================================================================== */
const AG_FED = ['2026-10-28', '2026-12-09', '2027-01-27', '2027-03-17', '2027-04-28', '2027-06-09', '2027-07-28', '2027-09-15', '2027-10-27', '2027-12-08'];
const AG_BCE = ['2026-10-29', '2026-12-17', '2027-02-04', '2027-03-18', '2027-04-29', '2027-06-10', '2027-07-22', '2027-09-09', '2027-10-28', '2027-12-16'];
// días sin bolsa: dónde ('us' Wall Street, 'eu' las europeas) y por qué
// días sin bolsa, bolsa a bolsa (Nueva York, Madrid, Londres, Fráncfort y Euronext: París, Ámsterdam, Bruselas y
// Lisboa). Fuentes: los calendarios de cada bolsa; Madrid y Euronext siguen el calendario TARGET del euro.
const AG_BOLSAS = { us: ['Wall Street', 'Wall Street'], mad: ['la Bolsa de Madrid', 'the Madrid exchange'], lon: ['la Bolsa de Londres', 'the London Stock Exchange'], fra: ['la Bolsa de Fráncfort', 'the Frankfurt exchange'], eur: ['Euronext (París, Ámsterdam…)', 'Euronext (Paris, Amsterdam…)'] };
const AG_CIERRES = [
  ['2026-11-03', 'tok', 'el Día de la Cultura japonés'], ['2026-11-23', 'tok', 'el Día de Acción de Gracias japonés'],
  ['2026-11-26', 'us', 'Acción de Gracias'], ['2026-12-24', 'fra', 'Nochebuena'], ['2026-12-25', 'us mad lon fra eur hk', 'Navidad'], ['2026-12-28', 'lon', 'San Esteban'], ['2026-12-31', 'fra tok', 'Nochevieja'],
  ['2027-01-01', 'us mad lon fra eur tok hk', 'Año Nuevo'], ['2027-01-18', 'us', 'el día de Martin Luther King'], ['2027-02-15', 'us', 'el Día de los Presidentes'],
  ['2027-03-26', 'us mad lon fra eur', 'Viernes Santo'], ['2027-03-29', 'mad lon fra eur', 'Lunes de Pascua'], ['2027-05-03', 'lon', 'el festivo de mayo británico'],
  ['2027-05-31', 'us', 'el Memorial Day'], ['2027-05-31', 'lon', 'el festivo de primavera británico'], ['2027-06-18', 'us', 'Juneteenth'], ['2027-07-05', 'us', 'el Día de la Independencia'],
  ['2027-08-30', 'lon', 'el festivo de verano británico'], ['2027-09-06', 'us', 'el Día del Trabajo'], ['2027-11-25', 'us', 'Acción de Gracias'],
  ['2027-12-24', 'us', 'Navidad'], ['2027-12-24', 'fra', 'Nochebuena'], ['2027-12-27', 'lon', 'Navidad'], ['2027-12-28', 'lon', 'San Esteban'], ['2027-12-31', 'fra', 'Nochevieja'],
];
// medias sesiones: [fecha, bolsa, hora de cierre allí (en minutos), por qué, estimada]. NYSE cierra a las 13:00 de
// Nueva York, Londres a las 12:30, Euronext a las 14:05 y Madrid a las 14:00. Fuentes: NYSE, LSEG, Euronext y BME
const AG_MEDIAS = [
  ['2026-11-27', 'us', 780, 'el día después de Acción de Gracias'],
  ['2026-12-24', 'mad', 840, 'Nochebuena'], ['2026-12-24', 'lon', 750, 'Nochebuena'], ['2026-12-24', 'eur', 845, 'Nochebuena'], ['2026-12-24', 'us', 780, 'Nochebuena'],
  ['2026-12-31', 'mad', 840, 'Nochevieja'], ['2026-12-31', 'lon', 750, 'Nochevieja'], ['2026-12-31', 'eur', 845, 'Nochevieja'],
  ['2027-11-26', 'us', 780, 'el día después de Acción de Gracias'],
  // 2027: Londres, confirmado; Euronext, lo de otros años; Madrid, por confirmar (en 2021, con las mismas fechas, cerró)
  ['2027-12-24', 'mad', null, 'Nochebuena', true], ['2027-12-24', 'lon', 750, 'Nochebuena'], ['2027-12-24', 'eur', 845, 'Nochebuena', true],
  ['2027-12-31', 'mad', null, 'Nochevieja', true], ['2027-12-31', 'lon', 750, 'Nochevieja'], ['2027-12-31', 'eur', 845, 'Nochevieja', true],
];
const AG_TZ = { us: 'America/New_York', mad: 'Europe/Madrid', lon: 'Europe/London', fra: 'Europe/Berlin', eur: 'Europe/Paris' };
const AG_CORTO = { us: ['NY', 'NY'], mad: ['Madrid', 'Madrid'], lon: ['Londres', 'London'], fra: ['Fráncfort', 'Frankfurt'], eur: ['Euronext', 'Euronext'] };
// festivos en España en los que la Bolsa de Madrid abre: [fecha, qué se celebra, dónde ('*' = toda España)].
// Fuente: el BOE (fiestas laborales de 2026 y 2027). Las fiestas de cada pueblo y de cada isla no están
const FIESTAS_ES = [
  ['2026-11-02', 'el lunes después de Todos los Santos', 'andalucia aragon asturias canarias clm cyl extremadura madrid navarra'],
  ['2026-12-07', 'el lunes después del Día de la Constitución', 'andalucia aragon asturias cantabria cyl extremadura madrid murcia rioja melilla'],
  ['2026-12-08', 'la Inmaculada', '*'],
  ['2027-01-06', 'Reyes', '*'],
  ['2027-03-01', 'el Día de Andalucía', 'andalucia'], ['2027-03-01', 'el Día de les Illes Balears', 'baleares'],
  ['2027-03-10', 'la Fiesta del Eid Fitr', 'melilla'],
  ['2027-03-19', 'San José', 'galicia madrid murcia navarra valencia'],
  ['2027-03-25', 'Jueves Santo', 'andalucia aragon asturias baleares canarias cantabria clm cyl extremadura galicia madrid murcia navarra paisvasco rioja ceuta melilla'],
  ['2027-04-23', 'San Jorge, el Día de Aragón', 'aragon'], ['2027-04-23', 'la Fiesta de Castilla y León', 'cyl'],
  ['2027-05-17', 'el Día de las Letras Gallegas', 'galicia'], ['2027-05-17', 'la Fiesta del Sacrificio', 'ceuta melilla'],
  ['2027-05-27', 'el Corpus Christi', 'clm'], ['2027-05-31', 'el Día de Castilla-La Mancha', 'clm'],
  ['2027-06-09', 'el Día de la Región de Murcia', 'murcia'], ['2027-06-09', 'el Día de La Rioja', 'rioja'],
  ['2027-06-24', 'San Juan', 'cataluna'],
  ['2027-07-28', 'el Día de las Instituciones de Cantabria', 'cantabria'],
  ['2027-08-05', 'Nuestra Señora de África', 'ceuta'],
  ['2027-08-16', 'el lunes después de la Asunción', 'andalucia aragon asturias canarias cyl madrid'],
  ['2027-09-08', 'el Día de Asturias', 'asturias'], ['2027-09-08', 'el Día de Extremadura', 'extremadura'],
  ['2027-09-15', 'La Bien Aparecida', 'cantabria'],
  ['2027-10-07', 'el aniversario del primer Gobierno Vasco', 'paisvasco'],
  ['2027-10-11', 'el lunes que sustituye al 15 de agosto', 'extremadura'],
  ['2027-10-12', 'la Fiesta Nacional', '*'],
  ['2027-11-01', 'Todos los Santos', '*'],
  ['2027-12-06', 'el Día de la Constitución', '*'],
  ['2027-12-08', 'la Inmaculada', '*'],
];
const FIESTAS_EN = { 'el lunes después de Todos los Santos': "the Monday after All Saints' Day", 'el lunes después del Día de la Constitución': 'the Monday after Constitution Day', 'la Inmaculada': 'the Immaculate Conception', 'Reyes': 'Epiphany', 'el Día de Andalucía': 'Andalusia Day', 'el Día de les Illes Balears': 'Balearic Islands Day', 'la Fiesta del Eid Fitr': 'Eid al-Fitr', 'San José': "St Joseph's Day", 'Jueves Santo': 'Maundy Thursday', 'San Jorge, el Día de Aragón': "St George's Day, Aragon Day", 'la Fiesta de Castilla y León': 'Castile and León Day', 'el Día de las Letras Gallegas': 'Galician Literature Day', 'la Fiesta del Sacrificio': 'Eid al-Adha', 'el Corpus Christi': 'Corpus Christi', 'el Día de Castilla-La Mancha': 'Castilla-La Mancha Day', 'el Día de la Región de Murcia': 'Murcia Day', 'el Día de La Rioja': 'La Rioja Day', 'San Juan': "St John's Day", 'el Día de las Instituciones de Cantabria': 'Cantabria Institutions Day', 'Nuestra Señora de África': 'Our Lady of Africa', 'el lunes después de la Asunción': 'the Monday after the Assumption', 'el Día de Asturias': 'Asturias Day', 'el Día de Extremadura': 'Extremadura Day', 'La Bien Aparecida': 'La Bien Aparecida', 'el aniversario del primer Gobierno Vasco': 'the anniversary of the first Basque Government', 'el lunes que sustituye al 15 de agosto': 'the Monday in lieu of 15 August', 'la Fiesta Nacional': 'National Day', 'Todos los Santos': "All Saints' Day", 'el Día de la Constitución': 'Constitution Day' };
// la bolsa de cada acción o ETF, por el final de su símbolo en Yahoo
const bolsaDe = (i) => { const y = String((i && i.yahoo) || ''); if (!y || /^Fondo/.test(i.tipo || '') || i.clase === 'Cripto' || /-EUR$|=/.test(y)) return null; if (/\.MC$/i.test(y)) return 'mad'; if (/\.L$/i.test(y)) return 'lon'; if (/\.(DE|F)$/i.test(y)) return 'fra'; if (/\.(PA|AS|BR|LS)$/i.test(y)) return 'eur'; if (!y.includes('.')) return 'us'; return null; };
// cada tipo: su icono y en qué filtro sale
const AG_TIPOS = { resultados: ['resultados', 'res'], fondo: ['resultados', 'res'], dividendo: ['dividendo', 'div'], cobro: ['dividendo', 'div'], banco: ['banco', 'eco'], festivo: ['festivo', 'eco'], media: ['media', 'eco'], fiesta: ['fiesta', 'eco'], hacienda: ['fiscal', 'eco'], aportacion: ['aporte', 'apo'], otro: ['mando', 'otro'], ia: ['chispa', 'eco'] };
const AG_FILTROS = [['todo', 'Todo', 'All'], ['res', 'Resultados', 'Earnings'], ['div', 'Dividendos', 'Dividends'], ['eco', 'Economía', 'Economy'], ['apo', 'Aportaciones', 'Contributions']];
const AG_FESTIVOS_EN = { 'Nochebuena': 'Christmas Eve', 'Nochevieja': "New Year's Eve", 'San Esteban': 'Boxing Day', 'el festivo de mayo británico': 'the UK early May bank holiday', 'el festivo de primavera británico': 'the UK spring bank holiday', 'el festivo de verano británico': 'the UK summer bank holiday', 'Acción de Gracias': 'Thanksgiving', 'Navidad': 'Christmas', 'Año Nuevo': "New Year's Day", 'el día de Martin Luther King': 'Martin Luther King Jr. Day', 'el Día de los Presidentes': "Presidents' Day", 'Viernes Santo': 'Good Friday', 'Lunes de Pascua': 'Easter Monday', 'el Memorial Day': 'Memorial Day', 'Juneteenth': 'Juneteenth', 'el Día de la Independencia': 'Independence Day', 'el Día del Trabajo': 'Labor Day' };
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MESES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// en el calendario y en GTA VI las frases llevan nombres y cifras dentro: van escritas en los dos idiomas
const L = (es, en) => (IDIOMA === 'en' ? en : es);
const mesL = (m) => L(MESES_LARGOS[m], MESES_EN[m]), diaSemL = (d) => L(DIAS_SEM[d], DIAS_EN[d].slice(0, 3));
const fechaCortaL = (d) => { const x = deIso(d); return L(`${x.getDate()} ${MESES[x.getMonth()]}`, `${MESES_EN[x.getMonth()].slice(0, 3)} ${x.getDate()}`); };
// el índice que copia cada fondo, para saber qué empresas lleva dentro (las diez mayores, de la Action)
const AG_INDICES = [[/small|peque/i, null], [/nasdaq/i, null], [/s&p ?500|sp ?500|us 500|\bus\b|\busa\b|ee\.? ?uu|estados unidos|north america|norteam/i, 'IVV'], [/emerg/i, 'EEM'], [/europe|europa|eurozone|eurozona|stoxx/i, 'IEUR'], [/world|global|mundial|acwi|all.world|developed|desarrollad/i, 'URTH']];
const AG_ALIAS = { GOOG: 'GOOGL' };

/* «hoy», «mañana», «en 3 días», «en 2 semanas», «en 3 meses» (corto: «3 días», «2 sem.») */
function faltan(d, corto) {
  const n = diasEntre(hoyIso(), d);
  if (n <= 0) return corto ? L('Hoy', 'Today') : L('hoy', 'today');
  if (n === 1) return corto ? L('Mañana', 'Tomorrow') : L('mañana', 'tomorrow');
  if (n < 14) return corto ? L(`${n} días`, `${n} days`) : L(`en ${n} días`, `in ${n} days`);
  if (n < 60) { const s = Math.round(n / 7); return corto ? L(`${s} sem.`, `${s} wk`) : L(`en ${s} semanas`, `in ${s} weeks`); }
  const m = Math.round(n / 30.4);
  return corto ? L(`${m} ${m === 1 ? 'mes' : 'meses'}`, `${m} mo`) : L(`en ${m} ${m === 1 ? 'mes' : 'meses'}`, `in ${m} ${m === 1 ? 'month' : 'months'}`);
}
const fechaDia = (d) => { const x = deIso(d); return L(`${DIAS_LARGOS[x.getDay()]} ${x.getDate()} de ${MESES_LARGOS[x.getMonth()]}`, `${DIAS_EN[x.getDay()]}, ${MESES_EN[x.getMonth()]} ${x.getDate()}`); };
/* la hora de España a la que en otra zona son las h:m de ese día (la Fed decide a las 14:00 de Nueva York) */
/* lo que tienes en brókeres de fuera de España (modelo 720: valores y cuentas en el extranjero; la cripto va aparte,
   en el 721). Los españoles se reconocen por su nombre; todo lo demás (Trade Republic, Interactive Brokers, Revolut,
   Degiro…) cuenta como de fuera */
const BROKER_ES = /myinvestor|openbank|\bing\b|renta ?4|indexa|bbva|santander|caixa|bankinter|sabadell|self ?bank|inversis|finizens|abanca|unicaja|kutxa|ibercaja|cajamar|\bevo\b|mapfre|bestinver|cobas|azvalor|magallanes|true value|imaginbank|pibank|trea|andbank|mediolanum/i;
const esDeFuera = (plat) => !!plat && !BROKER_ES.test(plat);
function enElExtranjero(M) {
  return sum(M.filas.filter((f) => esDeFuera(f.pos.plataforma) && f.inst.clase !== 'Cripto'), (f) => f.valor) + sum(M.efectivo.filter((e) => esDeFuera(e.plataforma)), (e) => e.importe);
}
// 0.3.9: el 720 va por bloques (valores por un lado, cuentas por otro) y cada uno tiene su umbral de 50.000 €
function bloques720(M) {
  return { valores: sum(M.filas.filter((f) => esDeFuera(f.pos.plataforma) && f.inst.clase !== 'Cripto'), (f) => f.valor), cuentas: sum(M.efectivo.filter((e) => esDeFuera(e.plataforma)), (e) => e.importe) };
}
/* el día de España (AAAA-MM-DD) en que cae una hora local de otra bolsa: Tokio abre a las 9:00 de su martes, que
   en España aún es lunes por la noche */
function diaEspana(d, zona, h, m = 0) {
  try {
    const [y, mo, da] = d.split('-').map(Number);
    const t0 = Date.UTC(y, mo - 1, da, h, m);
    const p = new Intl.DateTimeFormat('en-US', { timeZone: zona, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(t0));
    const g = (k) => +p.find((x) => x.type === k).value;
    const t = t0 - (Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute')) - t0);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
  } catch (e) { return d; }
}
function horaEspana(d, zona, h, m = 0) {
  try {
    const [y, mo, da] = d.split('-').map(Number);
    const t0 = Date.UTC(y, mo - 1, da, h, m);
    const p = new Intl.DateTimeFormat('en-US', { timeZone: zona, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(t0));
    const g = (k) => +p.find((x) => x.type === k).value;
    const t = t0 - (Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute')) - t0);
    return new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }).format(new Date(t));
  } catch (e) { return null; }
}
/* el día hábil anterior (para cobrar un dividendo hay que tener la acción al cierre de ese día) */
function habilAntes(d) {
  const x = deIso(d);
  do x.setDate(x.getDate() - 1); while (x.getDay() === 0 || x.getDay() === 6);
  return iso(x);
}
/* resultados y dividendo de una empresa: del radar (para todos) o de la ficha de la Action */
function fechasDe(inst, precio) {
  const r = inst && inst.yahoo ? radarPorSim(inst.yahoo) : null;
  const p = (inst && S.precios && S.precios.instrumentos && S.precios.instrumentos[inst.id]) || {};
  const o = { rd: null, rh: null, re: false, xd: null, dp: null, dve: null, dva: false };
  if (r && r.rd) { o.rd = r.rd; o.rh = r.rh || null; o.re = !!r.re; } else if (p.proximos_resultados) o.rd = p.proximos_resultados;
  if (r && r.xd) { o.xd = r.xd; o.dp = r.dp || null; o.dve = r.dve != null ? +r.dve : null; o.dva = !!r.dva; }
  else if (p.ex_dividendo) { o.xd = p.ex_dividendo; if (p.dividendo_pct && precio) { o.dve = (precio * p.dividendo_pct) / 100 / (inst.pais === 'GB' || inst.pais === 'US' ? 4 : 2); o.dva = true; } }
  return o;
}
function horaResultados(x) {
  if (x.rh === 'a') { const h = horaEspana(x.rd, 'America/New_York', 9, 30) || '15:30'; return L(`antes de abrir Wall Street (a las ${h} en España)`, `before Wall Street opens (${h} in Spain)`); }
  if (x.rh === 'c') { const h = horaEspana(x.rd, 'America/New_York', 16, 0) || '22:00'; return L(`tras el cierre de Wall Street (a las ${h} en España)`, `after Wall Street closes (${h} in Spain)`); }
  return '';
}
function indiceDe(inst) {
  if (!inst || inst.tipo === 'Acción' || inst.clase !== 'Renta variable') return null;
  const se = Object.keys(inst.sector_etf || {});
  if (se.length) return se.length === 1 && ['IVV', 'URTH', 'IEUR', 'EEM'].includes(se[0]) ? se[0] : null;
  const n = `${inst.nombre || ''} ${inst.corto || ''}`;
  for (const [re, k] of AG_INDICES) if (re.test(n)) return k;
  return null;
}
const conUs = (M) => M.filas.some((f) => ((f.inst.region || {}).EEUU || 0) + ((f.inst.region || {}).Global || 0) > 0 || (f.inst.tipo === 'Acción' && (f.inst.pais === 'US' || (f.inst.yahoo && !f.inst.yahoo.includes('.')))));
const conEu = (M) => M.filas.some((f) => ((f.inst.region || {}).Europa || 0) + ((f.inst.region || {}).Global || 0) > 0 || (f.inst.tipo === 'Acción' && f.inst.pais && f.inst.pais !== 'US'));

/* todo lo que viene en los próximos días, ordenado */
function agendaLista(M, dias = 120) {
  const hoy = hoyIso(), hasta = iso(new Date(Date.now() + dias * 86400000));
  const ev = [];
  const add = (e) => { if (e.d && e.d >= hoy && e.d <= hasta) ev.push(e); };
  const t = tramoAhorro();
  const vacia = !M.filas.length;
  // tus posiciones, juntando las de la misma empresa en varios brókers
  const porInst = new Map();
  for (const f of M.filas) {
    let g = porInst.get(f.inst.id);
    if (!g) { g = { inst: f.inst, f, uds: 0, valor: 0, plats: new Set(), pos: f.pos }; porInst.set(f.inst.id, g); }
    g.uds += f.uds || 0; g.valor += f.valor || 0; if (f.pos.plataforma) g.plats.add(f.pos.plataforma);
  }
  // lo que pesa cada empresa grande dentro de tus fondos
  const part = (S.precios && S.precios.participaciones_etf) || {};
  const dentro = new Map();
  for (const g of porInst.values()) {
    const k = indiceDe(g.inst);
    if (!k || !part[k] || !(g.valor > 0)) continue;
    const pesos = new Map();
    for (const h of part[k]) { const s = AG_ALIAS[h.s] || h.s; pesos.set(s, (pesos.get(s) || 0) + (+h.w || 0)); }
    for (const [s, w] of pesos) {
      if (w < 1.5) continue;
      let e = dentro.get(s); if (!e) { e = { euros: 0, fondos: [] }; dentro.set(s, e); }
      e.euros += (g.valor * w) / 100; e.fondos.push({ n: g.inst.corto || g.inst.nombre, w });
    }
  }
  const txtFondos = (e) => (e.fondos.length === 1 ? L(`tu ${e.fondos[0].n} (un ${fmtNum(e.fondos[0].w, 1)} %)`, `your ${e.fondos[0].n} (${fmtNum(e.fondos[0].w, 1)} %)`) : yLista(e.fondos.map((x) => `${L('tu', 'your')} ${x.n} (${fmtNum(x.w, 1)} %)`)));
  const directas = new Set();
  for (const g of porInst.values()) {
    const i = g.inst;
    if (i.tipo !== 'Acción') continue;
    const sim = String(i.yahoo || '').toUpperCase(), x = fechasDe(i, g.f.precio), n = i.corto || i.nombre;
    if (sim) directas.add(AG_ALIAS[sim] || sim);
    const enFondos = dentro.get(AG_ALIAS[sim] || sim);
    const plats = [...g.plats].join(' y ');
    const accFicha = `<button type="button" class="btn peq" data-pos="${esc(g.pos.id)}">${L('Abrir su ficha', 'Open its page')}</button>`;
    if (x.rd) {
      const hora = horaResultados(x);
      add({ id: `res:${i.id}:${x.rd}`, d: x.rd, tipo: 'resultados', nom: n, t: L(`Resultados de ${n}`, `${n} earnings`), s: hora ? hora[0].toUpperCase() + hora.slice(1) : L('Presenta las cuentas del trimestre', 'Quarterly results'), est: x.re,
        det: L(`${esc(n)} enseña sus cuentas del trimestre${hora ? ` ${esc(hora)}` : ''}. Es el día que más se suele mover, para arriba o para abajo: si se moviera un 5 %, serían unos ${eur(g.valor * 0.05, 0)} de los tuyos.${enFondos ? ` Además tienes unos ${eur(enFondos.euros, 0)} de ${esc(n)} dentro de ${esc(txtFondos(enFondos))}.` : ''}${x.re ? ' La fecha aún es una estimación: puede cambiar unos días.' : ''}`,
          `${esc(n)} reports its quarterly results${hora ? ` ${esc(hora)}` : ''}. It's usually the day it moves the most, up or down: a 5 % move would be about ${eur(g.valor * 0.05, 0)} of yours.${enFondos ? ` You also have about ${eur(enFondos.euros, 0)} of ${esc(n)} inside ${esc(txtFondos(enFondos))}.` : ''}${x.re ? ' The date is still an estimate: it may move a few days.' : ''}`), acc: accFicha });
    }
    if (x.xd) {
      const bruto = x.dve != null && g.uds ? x.dve * g.uds : null;
      const fis = fiscalidadSede(i.pais, i.tipo), neto = bruto != null ? bruto * (1 - t - (fis.pierde || 0) / 100) : null;
      const ud = fmtNum(g.uds, g.uds % 1 ? 2 : 0), estm = x.dva ? L(' (calculado con el último que pagó)', ' (worked out from the last one it paid)') : '';
      const cuanto = bruto != null ? L(`Con tus ${oc(ud)} acciones, unos ${eur(bruto, 2)} brutos y ${eur(neto, 2)} netos${estm}.`, `With your ${ud} shares, about ${eur(bruto, 2)} gross and ${eur(neto, 2)} net${estm}.`) : '';
      add({ id: `div:${i.id}:${x.xd}`, d: x.xd, tipo: 'dividendo', nom: n, t: L(`Dividendo de ${n}: fecha de corte`, `${n} dividend: ex-date`), s: L(`Para cobrarlo, tenla al cierre del ${fechaCorta(habilAntes(x.xd))}`, `To get it, hold it at the close on ${fechaCortaL(habilAntes(x.xd))}`), importe: !x.dp && neto != null ? neto : null, aprox: x.dva,
        det: L(`Para cobrar el dividendo tienes que tener la acción al cierre del ${esc(fechaDia(habilAntes(x.xd)))}. Ese día su precio baja más o menos lo que paga, así que comprar justo antes no sale gratis. ${cuanto} ${esc(fis.txt)}`, `To get the dividend you need to hold the share at the close on ${esc(fechaDia(habilAntes(x.xd)))}. That day the price drops by roughly what it pays, so buying just before isn't free money. ${cuanto} ${esc(trad(fis.txt))}`), acc: accFicha });
      if (x.dp && x.dp > x.xd) add({ id: `cob:${i.id}:${x.dp}`, d: x.dp, tipo: 'cobro', nom: n, t: L(`Cobras el dividendo de ${n}`, `${n} dividend paid`), s: plats ? L(`Llega a ${plats}`, `Arrives at ${plats}`) : L('Llega a tu bróker', 'Arrives at your broker'), importe: neto, aprox: x.dva,
        det: `${bruto != null ? L(`Unos ${eur(bruto, 2)} brutos; tras la retención y lo que toca en la renta, te quedan unos ${eur(neto, 2)}${estm}. `, `About ${eur(bruto, 2)} gross; after withholding and income tax you keep about ${eur(neto, 2)}${estm}. `) : ''}${esc(trad(fis.txt))}`, acc: accFicha });
    }
  }
  // resultados de las grandes empresas que hay dentro de tus fondos: solo las que más pesan en lo tuyo (las seis
  // con más euros tuyos detrás y al menos 50 €), para que el calendario no se llene de empresas que no son tuyas
  const pesadas = [...dentro].filter(([s, e]) => !directas.has(s) && e.euros >= 50).sort((a, b) => b[1].euros - a[1].euros).slice(0, 6);
  for (const [s, e] of pesadas) {
    const r = radarPorSim(s);
    if (!r || !r.rd) continue;
    const n = nombreRadar(r), hora = horaResultados(r);
    add({ id: `fon:${s}:${r.rd}`, d: r.rd, tipo: 'fondo', nom: n, euros: e.euros, t: L(`Resultados de ${n}`, `${n} earnings`), s: L(`Dentro de ${txtFondos(e)}`, `Inside ${txtFondos(e)}`), est: !!r.re,
      det: L(`${esc(n)} es de las mayores empresas de ${esc(txtFondos(e))}: unos ${eur(e.euros, 0)} de lo tuyo dependen de ella. Presenta sus cuentas${hora ? ` ${esc(hora)}` : ''} y, si se moviera un 5 %, tu fondo lo notaría en unos ${eur(e.euros * 0.05, 0)}.`,
        `${esc(n)} is one of the biggest companies in ${esc(txtFondos(e))}: about ${eur(e.euros, 0)} of yours depends on it. It reports${hora ? ` ${esc(hora)}` : ''} and, if it moved 5 %, your fund would feel about ${eur(e.euros * 0.05, 0)}.`),
      acc: `<button type="button" class="btn peq" data-consulta="${esc(r.s)}">${L('Ver', 'See')} ${esc(n)}</button>` });
  }
  // bancos centrales
  const reg = (() => { try { return reparto(M, 'region', 'todo').filas; } catch (e) { return []; } })();
  const pesoReg = (k) => { const x = reg.find((y) => y.k === k); return x ? x.pct : 0; };
  const us = pesoReg('EEUU'), liq = M.liquidez + sum(M.filas.filter((f) => ['Monetario', 'Renta fija'].includes(f.inst.clase)), (f) => f.valor);
  for (const d of AG_FED) {
    const h = horaEspana(d, 'America/New_York', 14, 0) || '20:00';
    add({ id: `fed:${d}`, d, tipo: 'banco', t: L('La Fed decide los tipos', 'Fed rate decision'), s: L(`Reserva Federal de EEUU, a las ${h} en España`, `US Federal Reserve, ${h} in Spain`),
      det: L(`La Reserva Federal decide los tipos de interés de EEUU. Publica la decisión a las ${h} (hora de España) y media hora después da la rueda de prensa. Si baja los tipos o avisa de bajadas, la bolsa suele recibirlo bien y el dólar tiende a bajar; si los sube, al revés.${us >= 5 ? ` Un ${fmtNum(us, 0)} % de tu cartera está en EEUU.` : ''}`,
        `The Federal Reserve sets US interest rates. It publishes the decision at ${h} (Spanish time) and holds a press conference half an hour later. If it cuts or hints at cuts, stocks usually like it and the dollar tends to fall; if it raises them, the opposite.${us >= 5 ? ` ${fmtNum(us, 0)} % of your portfolio is in the US.` : ''}`),
      acc: `<a class="btn peq" href="#mercados">${L('Ver Mercados', 'See Markets')}</a>` });
  }
  for (const d of AG_BCE) {
    add({ id: `bce:${d}`, d, tipo: 'banco', t: L('El BCE decide los tipos', 'ECB rate decision'), s: L('Banco Central Europeo, a las 14:15', 'European Central Bank, 14:15'),
      det: L(`El Banco Central Europeo decide los tipos del euro a las 14:15 y lo explica en rueda de prensa a las 14:45. Lo nota sobre todo el dinero parado: cuentas remuneradas, fondos monetarios y letras. Si baja los tipos, rinden menos; a la bolsa europea le suele sentar bien.${liq >= 1 ? ` Tienes ${eur(liq, 0)} en efectivo, monetarios y renta fija.` : ''}`,
        `The European Central Bank sets euro interest rates at 14:15 and explains it at a press conference at 14:45. Idle money feels it most: savings accounts, money market funds and T-bills. If it cuts rates they pay less; European stocks usually like it.${liq >= 1 ? ` You have ${eur(liq, 0)} in cash, money market and bonds.` : ''}`),
      acc: `<a class="btn peq" href="#mercados">${L('Ver Mercados', 'See Markets')}</a>` });
  }
  // días sin bolsa: los de las bolsas donde tienes acciones o ETF (eso es «lo tuyo») y, si lo tuyo depende de
  // ellas (fondos de EE. UU. o de Europa), Wall Street y las europeas
  const mias = new Set(M.filas.map((f) => bolsaDe(f.inst)).filter(Boolean));
  const ver = new Set(mias);
  if (vacia || conUs(M)) ver.add('us');
  if ((vacia || conEu(M)) && ![...mias].some((x) => x !== 'us')) ver.add('mad').add('eur');
  const porFecha = new Map();
  for (const [d, donde, motivo] of AG_CIERRES) for (const bo of donde.split(' ')) if (ver.has(bo)) { if (!porFecha.has(d)) porFecha.set(d, []); porFecha.get(d).push([bo, motivo]); }
  for (const [d, cierres] of porFecha) {
    const bolsas = [...new Set(cierres.map(([bo]) => bo))], motivos = [...new Set(cierres.map(([, m]) => m))];
    // si cierran Madrid y Euronext a la vez (y nada más de Europa tuyo), se dice «las bolsas europeas»
    const soloEuGen = !mias.size || ![...mias].some((x) => x !== 'us');
    const nombres = bolsas.filter((bo) => !(soloEuGen && bo === 'eur' && bolsas.includes('mad'))).map((bo) => (soloEuGen && bo === 'mad' ? L('las bolsas europeas', 'European markets') : L(...AG_BOLSAS[bo])));
    const t = nombres.length === 1 ? L(`Cierra ${nombres[0]}`, `${nombres[0][0].toUpperCase() + nombres[0].slice(1)} closed`) : L(`Cierran ${yLista(nombres)}`, `${yLista(nombres)} closed`);
    const mot = motivos.map((m) => L(m, AG_FESTIVOS_EN[m] || m));
    add({ id: `fes:${d}`, d, tipo: 'festivo', bolsas, todas: [...ver].every((bo) => bolsas.includes(bo)), mio: bolsas.some((bo) => mias.has(bo)), t: t[0].toUpperCase() + t.slice(1), s: L(`Por ${yLista(motivos)}`, `For ${yLista(mot)}`),
      det: L(`Ese día no abre${nombres.length > 1 ? 'n' : ''} ${esc(yLista(nombres))}. Lo que tienes allí no cambia de precio, y lo que mandes comprar o vender se hace el siguiente día que abra.`,
        `${esc(yLista(nombres))} ${nombres.length > 1 ? "don't" : "doesn't"} open that day. What you hold there doesn't change price, and any buy or sell order goes through on the next trading day.`) });
  }
  // medias sesiones: las de las mismas bolsas, con la hora de cierre en hora de España
  const medias = new Map();
  for (const [d, bo, min, motivo, est] of AG_MEDIAS) if (ver.has(bo)) { if (!medias.has(d)) medias.set(d, []); medias.get(d).push({ bo, motivo, est, hora: min == null ? '' : horaEspana(d, AG_TZ[bo], Math.floor(min / 60), min % 60) || '' }); }
  for (const [d, ms] of medias) {
    const soloEuGen = !mias.size || ![...mias].some((x) => x !== 'us');
    const lista = ms.filter((m) => !(soloEuGen && m.bo === 'eur' && ms.some((x) => x.bo === 'mad')));
    const nombre = (m) => (soloEuGen && m.bo === 'mad' ? L('las bolsas europeas', 'European markets') : L(...AG_BOLSAS[m.bo]));
    const motivo = ms[0].motivo, motEn = L(motivo, AG_FESTIVOS_EN[motivo] || ({ 'el día después de Acción de Gracias': 'the day after Thanksgiving' })[motivo] || motivo);
    const principal = lista.find((m) => m.bo === 'mad') || lista[0];
    // (si de Madrid aún no se sabe, se dice; no se da por hecha la media sesión)
    const porVer = !principal.hora;
    const cap = (x) => x[0].toUpperCase() + x.slice(1);
    const t = porVer ? L('Madrid, horario por confirmar', 'Madrid hours to be confirmed') : lista.length === 1 ? L(`${cap(nombre(principal))} ${soloEuGen && principal.bo === 'mad' ? 'cierran' : 'cierra'} a las ${principal.hora}`, `${cap(nombre(principal))} ${soloEuGen && principal.bo === 'mad' ? 'close' : 'closes'} at ${principal.hora}`)
      : L('Media sesión en las bolsas', 'Half day on the markets');
    const corto = (m) => (soloEuGen && m.bo === 'mad' ? L('las europeas', 'Europe') : ({ us: L('Nueva York', 'New York'), mad: 'Madrid', lon: L('Londres', 'London'), fra: L('Fráncfort', 'Frankfurt'), eur: 'Euronext' })[m.bo]);
    const detalle = lista.map((m) => (m.hora ? L(`${corto(m)} a las ${m.hora}`, `${corto(m)} at ${m.hora}`) : L(`${corto(m)}, por confirmar`, `${corto(m)} to be confirmed`)));
    add({ id: `med:${d}`, d, tipo: 'media', hora: principal.hora, bolsas: lista.map((m) => m.bo), est: lista.some((m) => m.est), mio: lista.some((m) => mias.has(m.bo)), t,
      s: porVer ? (lista.length === 1 ? L(`BME aún no ha dicho si abre por ${motivo}`, `BME hasn't said yet whether it opens for ${motEn}`) : L(`Por ${motivo}: ${yLista(detalle)}`, `For ${motEn}: ${yLista(detalle)}`))
        : lista.length === 1 ? L(`Media sesión por ${motivo}`, `Half day for ${motEn}`) : L(`Cierran antes por ${motivo}: ${yLista(detalle)}`, `Early close for ${motEn}: ${yLista(detalle)}`),
      det: L(`Ese día cierra${lista.length > 1 ? 'n' : ''} antes de lo normal (en hora de España): ${esc(yLista(detalle))}. Lo que mandes comprar o vender después se hace el siguiente día que abra. Suele moverse poco dinero, así que los precios pueden saltar más de lo normal.${porVer ? ' BME aún no ha publicado su calendario de ese año: otros años ha abierto hasta las 14:00, pero en 2021, con las mismas fechas, cerró todo el día.' : lista.some((m) => m.est) ? ' La hora de Euronext es la de otros años: la confirma en diciembre.' : ''}`,
        `${lista.length > 1 ? 'They close' : 'It closes'} early that day (Spanish time): ${esc(yLista(detalle))}. Anything you buy or sell later goes through on the next trading day. Volumes are usually thin, so prices can jump more than usual.${porVer ? " BME hasn't published that year's calendar yet: other years it has traded until 14:00, but in 2021, with the same dates, it closed all day." : lista.some((m) => m.est) ? " Euronext's time is the usual one: it confirms it in December." : ''}`) });
  }
  // festivos en España (los de toda España y los de tu comunidad) en los que la bolsa abre igual
  const ccaa = comunidadUsuario();
  for (const [d, motivo, donde] of FIESTAS_ES) {
    const x = deIso(d).getDay(); if (x === 0 || x === 6) continue;
    const todas = donde === '*', aqui = todas || (ccaa && donde.split(' ').includes(ccaa));
    if (!aqui || AG_CIERRES.some(([c, bo]) => c === d && bo.split(' ').includes('mad'))) continue;
    const motEn = FIESTAS_EN[motivo] || motivo;
    add({ id: `fie:${d}`, d, tipo: 'fiesta', t: todas ? L('Festivo en España, la bolsa abre', 'Holiday in Spain, markets open') : L(`Festivo en ${conArticulo(ccaa)}, la bolsa abre`, `Holiday in ${conArticulo(ccaa)}, markets open`),
      s: L(`Por ${motivo}`, `For ${motEn}`),
      det: L(`Es festivo${todas ? ' en toda España' : ` en ${conArticulo(ccaa)}`}, pero la Bolsa de Madrid abre como cualquier otro día: va con el calendario de las bolsas europeas, no con el de los festivos. Puedes comprar y vender desde tu bróker como siempre.`,
        `It's a public holiday${todas ? ' across Spain' : ` in ${conArticulo(ccaa)}`}, but the Madrid exchange opens like any other day: it follows the European markets' calendar, not the holiday one. You can buy and sell through your broker as usual.`) });
  }
  // Hacienda: del 15 de noviembre al 31 de diciembre, lo que vendas cuenta en la renta de este año
  const y = new Date().getFullYear();
  if (hoy >= `${y}-11-15`) {
    const perd = M.filas.filter((f) => f.pl < -1), sumP = -sum(perd, (f) => f.pl);
    const nPerd = esc(yLista(perd.slice(0, 3).map((f) => f.inst.corto || f.inst.nombre)));
    add({ id: `ren:${y}`, d: `${y}-12-31`, tipo: 'hacienda', t: L(`Último día para la renta de ${y}`, `Last day for your ${y} tax return`), s: L('Lo que vendas hasta hoy cuenta en esta declaración', 'What you sell up to today counts in this return'),
      det: L(`Lo que vendas hasta el 31 de diciembre va a la renta de ${y}, que se presenta en primavera de ${y + 1}. Las pérdidas restan de las ganancias: si este año has ganado vendiendo y tienes algo en pérdidas, venderlo antes de fin de año baja lo que pagas. Ojo: si compras lo mismo en los dos meses antes o después de vender (un año en fondos y en lo que cotiza fuera de la UE), esa pérdida no cuenta todavía.${M.realizado ? ` Este año llevas ${eurS(M.realizado, 0)} en ventas.` : ''}${sumP >= 1 ? ` Tienes ${eur(sumP, 0)} en pérdidas sin vender (${nPerd}).` : ''}`,
        `What you sell up to 31 December goes into your ${y} tax return, filed in spring ${y + 1}. Losses are subtracted from gains: if you've made gains selling this year and have something at a loss, selling it before year end lowers what you pay. Careful: if you buy the same thing back within the next two months, that loss doesn't count yet.${M.realizado ? ` This year your sales come to ${eurS(M.realizado, 0)}.` : ''}${sumP >= 1 ? ` You have ${eur(sumP, 0)} in unrealised losses (${nPerd}).` : ''}`),
      acc: `<a class="btn peq" href="#fiscal">${L('Ir a Hacienda', 'Go to Taxes')}</a>` });
  }
  // GTA VI
  const ttwo = [...porInst.values()].some((g) => /^TTWO$/i.test(g.inst.yahoo || ''));
  add({ id: 'gta6', d: '2026-11-19', tipo: 'otro', t: L('Sale GTA VI', 'GTA VI comes out'), s: ttwo ? L('Take-Two, que tienes, se juega mucho ese día', 'Take-Two, which you own, has a lot riding on it') : L('En PS5 y Xbox Series X y S', 'On PS5 and Xbox Series X|S'),
    det: L(`Sale GTA VI en PS5 y Xbox Series X y S.${ttwo ? ' Es el juego del que más depende Take-Two: esos días su precio puede moverse bastante.' : ''}`, `GTA VI comes out on PS5 and Xbox Series X|S.${ttwo ? " It's the game Take-Two depends on most: its price may move a lot around then." : ''}`), acc: `<button type="button" class="btn peq" data-gta>${L('Abrir la cuenta atrás', 'Open the countdown')}</button>` });
  // tus aportaciones, juntas si caen el mismo día
  const porDia = new Map();
  for (const a of S.cartera.aportaciones || []) {
    if (!(+a.importe)) continue;
    for (const d of fechasAportacion({ ...a, desde: a.desde > hoy ? a.desde : hoy }, iso(new Date(Date.now() - 86400000)), hasta)) {
      let g = porDia.get(d); if (!g) { g = { importe: 0, nombres: [], plats: new Set(), insts: [] }; porDia.set(d, g); }
      g.importe += +a.importe; g.nombres.push((S.inst[a.instrumento] && S.inst[a.instrumento].corto) || a.instrumento); g.insts.push(a.instrumento); if (a.plataforma) g.plats.add(a.plataforma);
    }
  }
  for (const [d, g] of porDia) {
    const n = [...new Set(g.nombres)];
    const pl = esc(yLista([...g.plats]));
    add({ id: `apo:${d}`, d, tipo: 'aportacion', varias: n.length > 1, nombresAp: yLista(n), inst: n.length === 1 ? g.insts[0] : null, t: n.length > 1 ? L('Tus aportaciones automáticas', 'Your automatic contributions') : L(`Aportación a ${n[0]}`, `Contribution to ${n[0]}`), s: n.length > 1 ? yLista(n) : [...g.plats].join(', ') || L('Automática', 'Automatic'), importe: g.importe,
      det: L(`Se hace sola: ${eur(g.importe, 0)} a ${esc(yLista(n))}${g.plats.size ? ` desde ${pl}` : ''}. GrowFolio la suma a tu cartera con el precio del primer día después (el que usa el fondo).`, `It happens on its own: ${eur(g.importe, 0)} into ${esc(yLista(n))}${g.plats.size ? ` from ${pl}` : ''}. GrowFolio adds it to your portfolio at the price of the next trading day (the one the fund uses).`), acc: `<a class="btn peq" href="#plan">${L('Ver tu plan', 'See your plan')}</a>` });
  }
  // lo que ha visto la IA en las noticias, si no está ya
  const ia = iaActual();
  for (const e of (ia && ia.calendario) || []) {
    if (!e || !e.t || /aportaci/i.test(e.t) || !/^\d{4}-\d{2}-\d{2}$/.test(String(e.d || '')) || isNaN(deIso(e.d))) continue;
    // si ya sale (la IA suele decir lo mismo con otras palabras y un día antes o después), no se repite
    const te = normTxt(e.t);
    if (ev.some((x) => (x.d === e.d && te.includes(normTxt(x.t))) || (x.nom && te.includes(normTxt(x.nom)) && Math.abs(diasEntre(x.d, e.d)) <= 3))) continue;
    // si nombra algo tuyo (una posición o algo que vendiste), es tuyo: sale en «Solo lo mío» y no viene «de las noticias»
    const nombres = [...(M.filas || []).map((f) => f.inst.corto), ...(S.cartera.movimientos || []).map((m) => (S.inst[m.instrumento] || {}).corto)].filter((n) => n && n.length >= 3);
    const tuyo = nombres.some((n) => te.includes(normTxt(n)));
    add({ id: `ia:${e.d}:${normTxt(e.t).slice(0, 24)}`, d: e.d, tipo: 'ia', t: e.t, mio: tuyo, s: tuyo ? L('Lo ha calculado GrowIA con lo tuyo', 'Worked out by GrowIA from your holdings') : L('Lo ha visto GrowIA en las noticias', 'Spotted by GrowFolio AI in the news'), ia: true, det: L('Sale de las noticias que lee GrowIA: la fecha puede moverse.', 'It comes from the news GrowFolio AI reads: the date may move.') });
  }
  return ev.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : (ordenAg(a) - ordenAg(b))));
}
const ordenAg = (e) => ['resultados', 'dividendo', 'cobro', 'aportacion', 'fondo', 'banco', 'hacienda', 'festivo', 'media', 'fiesta', 'ia', 'otro'].indexOf(e.tipo);
// la versión de antes, para el plan (aportaciones) y Expertos (resultados y dividendos)
function eventos(M, dias = 45) {
  return agendaLista(M, dias).filter((e) => ['resultados', 'dividendo', 'aportacion'].includes(e.tipo));
}
const tituloAg = (e) => (e.ia ? rellenarIA(e.t, {}) : esc(e.t));
const iconoAg = (e) => (e.tipo === 'otro' ? MANDO : ICONOS[AG_TIPOS[e.tipo][0]] || ICONOS.agenda);
const importeAg = (e) => (e.importe != null && isFinite(e.importe) ? `<span class="ag-imp${e.tipo === 'cobro' ? ' up' : ''}">${e.tipo === 'cobro' ? '+' : ''}${e.aprox ? '≈ ' : ''}${eur(e.importe, e.importe < 10 ? 2 : 0)}</span>` : '');

/* en Cartera: lo próximo, con los días que faltan */
function htmlAgenda(M) {
  // lo tuyo primero: de las empresas de dentro de tus fondos, solo las dos que más te tocan
  const todos = agendaLista(M, 40).filter((e) => !['festivo', 'media', 'fiesta'].includes(e.tipo) || diasEntre(hoyIso(), e.d) <= 7);
  const fondos = new Set(todos.filter((e) => e.tipo === 'fondo').sort((a, b) => b.euros - a.euros).slice(0, 2).map((e) => e.id));
  const ev = todos.filter((e) => e.tipo !== 'fondo' || fondos.has(e.id)).slice(0, 5);
  if (!ev.length) return '';
  return `<section class="ag-card" aria-labelledby="hAg">
    <div class="sec-cab"><h2 id="hAg">${L('Lo que viene', 'Coming up')}</h2><div class="der"><a class="enlace acento" href="#agenda">${L('Ver el calendario', 'See the calendar')}</a></div></div>
    <ul class="ag-mini">${ev.map((e) => `<li class="t-${e.tipo}"><a href="#agenda" data-ag-ir="${esc(e.id)}"><span class="ag-cd${diasEntre(hoyIso(), e.d) <= 1 ? ' pronto' : ''}">${faltan(e.d, true)}</span><span class="ag-ic">${iconoAg(e)}</span><span class="ag-tx"><b>${tituloAg(e)}</b><small>${esc(e.s)}</small></span>${importeAg(e)}</a></li>`).join('')}</ul>
  </section>`;
}

/* cómo está la bolsa un día, para pintar la celda entera del calendario: cerrada (todas las tuyas o solo alguna),
   media sesión o festivo con la bolsa abierta. Sale de los eventos de ese día, estén o no en la pestaña elegida */
function estadoDiaAg(lista) {
  const fes = lista.find((e) => e.tipo === 'festivo'), med = lista.find((e) => e.tipo === 'media'), fie = lista.find((e) => e.tipo === 'fiesta');
  const ev = [fes, med, fie].filter(Boolean);
  // cada una con su texto corto, para las celdas estrechas del móvil
  if (fes && fes.todas) return { cls: 'cierra', etq: L('Cerrada', 'Closed'), corto: L('Cerrada', 'Closed'), ev };
  if (fes) {
    const b = fes.bolsas || [], eu = b.includes('mad') && b.includes('eur') && b.length === 2;
    const nom = eu ? L('Europa', 'Europe') : b.length > 2 ? L('varias', 'several') : b.map((x) => L(...(AG_CORTO[x] || [x, x]))).join(L(' y ', ' & '));
    const cor = eu ? 'Eur' : b.length > 1 ? L('varias', 'several') : ({ us: 'NY', mad: 'Mad', lon: 'Lon', fra: 'Fra', eur: 'Eur' })[b[0]] || '';
    return { cls: 'cierra-p', etq: L(`Sin ${nom}`, `${nom} shut`), corto: b.length > 1 && !eu ? L('Algunas', 'Some') : L(`Sin ${cor}`, `${cor} shut`), ev };
  }
  if (med && !med.hora) return { cls: 'media', etq: L('¿Abre Madrid?', 'Madrid open?'), corto: L('¿Abre?', 'Open?'), ev };
  if (med) { const h = String(med.hora).replace(':00', ' h'); return { cls: 'media', etq: L(`Hasta las ${h}`, `Until ${h}`), corto: h, ev }; }
  if (fie) return { cls: 'fiesta', etq: L('Festivo', 'Holiday'), corto: L('Festivo', 'Holiday'), ev };
  return null;
}

/* la pestaña Calendario */
/* qué entra en cada pestaña (0.2.4, solo dos): «Solo lo mío», lo de tus propias posiciones, tus aportaciones y tu
   renta; «En general», además lo que más pesa dentro de tus fondos y lo importante del mercado */
const AG_MODOS = [['mio', 'Solo lo mío', 'Just mine'], ['tu', 'En general', 'Everything']];
const AG_MIO = new Set(['resultados', 'dividendo', 'cobro', 'aportacion', 'hacienda', 'banco']);
const enModo = (e, m) => m === 'tu' || (m === 'mio' ? AG_MIO.has(e.tipo) || !!e.mio : AG_TIPOS[e.tipo][1] === m);
// el color de cada tarjeta de «Próximos»
const AG_COLOR = { res: '#F3ECDD', div: '#4CBF8E', eco: '#A2967F', apo: '#EDBB45', otro: '#8A8172' };
const AG_CAT = { resultados: ['Resultados', 'Earnings'], fondo: ['En tus fondos', 'In your funds'], dividendo: ['Dividendo', 'Dividend'], cobro: ['Cobro', 'Payment'], banco: ['Bancos centrales', 'Central banks'], festivo: ['Sin bolsa', 'Market closed'], media: ['Media sesión', 'Half day'], fiesta: ['Festivo, con bolsa', 'Holiday, market open'], hacienda: ['Hacienda', 'Taxes'], aportacion: ['Tu aportación', 'Your contribution'], otro: ['GTA VI', 'GTA VI'], ia: ['Para vigilar', 'To watch'] };
function impactoAg(e, M) {
  const eu = (x) => eur(x, x < 10 ? 2 : 0);
  if ((e.tipo === 'dividendo' || e.tipo === 'cobro' || e.tipo === 'aportacion') && e.importe != null && isFinite(e.importe)) return e.tipo === 'aportacion' ? (e.varias && e.nombresAp ? L(`${eu(e.importe)} a ${e.nombresAp}`, `${eu(e.importe)} into ${e.nombresAp}`) : L(`${eu(e.importe)} que aportas`, `${eu(e.importe)} you put in`)) : L(`${e.aprox ? '≈ ' : ''}${eu(e.importe)} para ti`, `${e.aprox ? '≈ ' : ''}${eu(e.importe)} for you`);
  if (e.tipo === 'resultados') { const id = String(e.id).split(':')[1], f = M && M.filas.find((x) => x.inst.id === id); if (f && f.valor) return L(`Tu posición: ${eur(f.valor, 0)}`, `Your holding: ${eur(f.valor, 0)}`); }
  if (e.tipo === 'fondo' && e.euros) return L(`≈ ${eur(e.euros, 0)} tuyos dentro`, `≈ ${eur(e.euros, 0)} of yours inside`);
  if (e.tipo === 'banco') return L('Mueve tipos y bolsas', 'Moves rates and stocks');
  if (e.tipo === 'festivo') return L('Ese día no hay bolsa', 'No trading that day');
  if (e.tipo === 'media') return e.hora ? L(`Se negocia hasta las ${e.hora}`, `Trading until ${e.hora}`) : L('Horario por confirmar', 'Hours to be confirmed');
  if (e.tipo === 'fiesta') return L('La bolsa abre normal', 'Markets open as usual');
  return '';
}
const enDias = (d) => { const n = diasEntre(hoyIso(), d); return n <= 0 ? L('Hoy', 'Today') : n === 1 ? L('Mañana', 'Tomorrow') : L(`En ${n} días`, `In ${n} days`); };
// lo que ya pasó: noticias de lo que tienes y del mercado, con cómo va hoy cada cosa
function pasadoAg(modo) {
  const N = (S.precios && S.precios.noticias) || {}, I = (S.precios && S.precios.instrumentos) || {}, MK = (S.precios && S.precios.mercados) || {};
  const ids = new Set((S.cartera.posiciones || []).map((p) => p.instrumento));
  let lista = [];
  if (modo !== 'eco') for (const id of ids) for (const n of N[id] || []) lista.push({ ...n, id });
  if (modo === 'tu' || modo === 'eco') for (const n of N.mercado || []) lista.push({ ...n, id: null });
  if (modo === 'div') lista = lista.filter((n) => /dividend/i.test(n.t));
  if (modo === 'res') lista = lista.filter((n) => /resultad|beneficio|ingres|ventas|earnings|cuentas/i.test(n.t));
  const vistos = new Set();
  lista = lista.filter((n) => n.d && n.t).sort((a, b) => (b.d > a.d ? 1 : -1)).filter((n) => { const k = n.t.slice(0, 48); if (vistos.has(k)) return false; vistos.add(k); return true; }).slice(0, 10);
  // «Mercados hoy»: el titular del día y cómo van las bolsas y el bitcoin
  const fichas = [['^GSPC', 'S&P 500'], ['^IBEX', 'Ibex'], ['BTC-EUR', 'Bitcoin']].filter(([k]) => MK[k] && MK[k].variacion_dia != null);
  const hoyM = (modo === 'tu' || modo === 'eco') && fichas.length && (N.mercado || []).length ? (() => {
    const n = N.mercado[0], x = deIso(String(n.d).slice(0, 10));
    return `<div class="agp"><div class="agp-fe"><span>${diaSemL(x.getDay()).slice(0, 3)}</span><b>${x.getDate()}</b><span>${L(MESES[x.getMonth()], MESES_EN[x.getMonth()].slice(0, 3))}</span></div>
      <div class="agp-c agp-hoy"><p class="agp-src"><span class="agp-rayo">${ICONOS.growia}</span>${String(n.d).slice(0, 10) === hoyIso() ? L('Mercados hoy', 'Markets today') : L('Mercados', 'Markets')}</p><a class="agp-t grande noti" data-no-trad href="${esc(n.u)}" target="_blank" rel="noopener noreferrer" data-nf="${esc(n.f || '')}" data-nd="${esc(n.d || '')}">${esc(n.t)}</a>
        <div class="agp-fichas">${fichas.map(([k, nom]) => { const v = MK[k].variacion_dia; return `<span class="${v >= 0 ? 'up' : 'down'}"><i>${v >= 0 ? '↑' : '↓'}</i>${esc(nom)} <b>${pctS(v, 2)}</b></span>`; }).join('')}</div></div></div>`;
  })() : '';
  const resto = hoyM ? lista.filter((n) => n !== lista.find((x) => x.id === null)) : lista;
  const tarjeta = (n) => {
    const x = deIso(String(n.d).slice(0, 10)), i = n.id && S.inst[n.id], v = n.id && I[n.id] && I[n.id].variacion_dia;
    return `<div class="agp"><div class="agp-fe"><span>${diaSemL(x.getDay()).slice(0, 3)}</span><b>${x.getDate()}</b><span>${L(MESES[x.getMonth()], MESES_EN[x.getMonth()].slice(0, 3))}</span></div>
      <div class="agp-c"><p class="agp-src">${i ? logo(i.dominio, i.corto || i.nombre) : `<span class="agp-rayo">${ICONOS.mercados}</span>`}<span data-no-trad>${esc(n.f || '')}</span></p>
        <a class="agp-t noti" data-no-trad href="${esc(n.u)}" target="_blank" rel="noopener noreferrer" data-nf="${esc(n.f || '')}" data-nd="${esc(n.d || '')}">${esc(n.t)}</a>
        ${i ? `<p class="agp-pie"><span class="chip">${esc(i.corto || i.nombre)}</span>${v != null ? `<span class="${v >= 0 ? 'up' : 'down'}">${L('hoy', 'today')} ${pctS(v, 2)}</span>` : ''}</p>` : ''}</div></div>`;
  };
  const todas = hoyM ? [hoyM, ...resto.map(tarjeta)] : resto.map(tarjeta);
  return { html: todas.slice(0, S.agPasado ? 10 : 4).join(''), mas: todas.length > 4 && !S.agPasado };
}
function vistaAgenda(M) {
  const hoy = hoyIso();
  const todos = agendaLista(M, 120);
  if (S.agModo == null) S.agModo = LS.get('inv-agmodo', null);
  // lo que eligieras la última vez; si no, «Solo lo mío» (o «En general» mientras no tengas nada metido)
  const modo = AG_MODOS.some(([k]) => k === S.agModo) ? S.agModo : M.filas.length ? 'mio' : 'tu';
  const ev = todos.filter((e) => enModo(e, modo));
  const abiertos = S.agAbiertos || (S.agAbiertos = new Set());
  const cuenta = (tipos) => ev.filter((e) => tipos.includes(e.tipo) || (tipos.includes('resultados') && e.tipo === 'fondo')).length;
  const cobros = sum(ev.filter((e) => e.tipo === 'cobro' || (e.tipo === 'dividendo' && e.importe != null)), (e) => e.importe || 0);
  const resumen = [
    cuenta(['resultados']) && L(`${cuenta(['resultados'])} ${cuenta(['resultados']) === 1 ? 'presentación de resultados' : 'presentaciones de resultados'}`, `${cuenta(['resultados'])} earnings ${cuenta(['resultados']) === 1 ? 'report' : 'reports'}`),
    cuenta(['dividendo']) && L(`${cuenta(['dividendo'])} ${cuenta(['dividendo']) === 1 ? 'dividendo' : 'dividendos'}${cobros >= 0.5 ? ` (unos ${eur(cobros, cobros < 10 ? 2 : 0)} netos)` : ''}`, `${cuenta(['dividendo'])} ${cuenta(['dividendo']) === 1 ? 'dividend' : 'dividends'}${cobros >= 0.5 ? ` (about ${eur(cobros, cobros < 10 ? 2 : 0)} net)` : ''}`),
    cuenta(['banco']) && L(`${cuenta(['banco'])} reuniones de la Fed y el BCE`, `${cuenta(['banco'])} Fed and ECB meetings`),
  ].filter(Boolean);
  // «Próximos»: las tarjetas grandes de lo que viene
  const proxTodos = ev.filter((e) => e.tipo !== 'fiesta' || diasEntre(hoy, e.d) <= 10).slice(0, 14);
  const prox = S.agProxTodo ? proxTodos : proxTodos.slice(0, 6);
  // cada cosa que viene, como una entrada: el resguardo con los días que faltan (y un anillo que se va cerrando según
  // se acerca, sobre un mes) y, al otro lado, qué es, cuándo y lo que te toca a ti
  const tarjeta = (e) => {
    const cls = AG_TIPOS[e.tipo][1], col = AG_COLOR[cls] || AG_COLOR.eco, cat = AG_CAT[e.tipo] || AG_CAT.ia;
    const n = Math.max(0, diasEntre(hoy, e.d)), x = deIso(e.d), lleno = Math.max(0.06, 1 - Math.min(n, 30) / 30);
    const imp = impactoAg(e, M), cuando = `${diaSemL(x.getDay()).slice(0, 3)} ${x.getDate()} ${L(MESES[x.getMonth()], MESES_EN[x.getMonth()].slice(0, 3))}`;
    return `<button type="button" class="agc" style="--c:${col}" data-ag-ir="${esc(e.id)}">
      <span class="agc-res" aria-hidden="true"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" class="f"/><circle cx="22" cy="22" r="19" class="v" pathLength="1" style="stroke-dasharray:${lleno.toFixed(3)} 1"/></svg>
        ${n <= 1 ? `<b class="agc-n pal">${n ? L('Mañana', 'Tmrw') : L('Hoy', 'Today')}</b>` : `<b class="agc-n">${n}</b><small>${L('días', 'days')}</small>`}</span>
      <span class="agc-c"><span class="agc-cat">${iconoAg(e)}<span class="agc-cn">${L(cat[0], cat[1])}</span><span class="agc-cuando">${esc(cuando)}${e.est ? ` ${L('(estimada)', '(est.)')}` : ''}</span></span>
        <b class="agc-t">${tituloAg(e)}</b>
        ${imp ? `<span class="agc-imp">${esc(imp)}</span>` : ''}</span></button>`;
  };
  // el mes, plegado: la semana con puntos; al tocarlo se despliegan las cinco semanas
  const lunes = deIso(hoy); lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  const porDia = new Map(); for (const e of ev) { if (!porDia.has(e.d)) porDia.set(e.d, []); porDia.get(e.d).push(e); }
  const porDiaTodo = new Map(); for (const e of todos) { if (!porDiaTodo.has(e.d)) porDiaTodo.set(e.d, []); porDiaTodo.get(e.d).push(e); }
  const celda = (k, mini) => {
    const x = new Date(lunes); x.setDate(lunes.getDate() + k);
    const d = iso(x), es = porDia.get(d) || [], pasado = d < hoy, finde = x.getDay() === 0 || x.getDay() === 6;
    const est = estadoDiaAg(porDiaTodo.get(d) || []);
    const tipos = [...new Set(es.map((e) => e.tipo))].slice(0, 3);
    const mes = !mini && (x.getDate() === 1 || k === 0) ? `<span class="m">${L(MESES[x.getMonth()], MESES_EN[x.getMonth()].slice(0, 3))}</span>` : '';
    const lbl = `${fechaDia(d)}${es.length ? `: ${es.map((e) => e.t).join(', ')}` : ''}`;
    const dentro = `${mini ? `<span class="sem">${L(['L', 'M', 'X', 'J', 'V', 'S', 'D'], ['M', 'T', 'W', 'T', 'F', 'S', 'S'])[k % 7]}</span>` : ''}<span class="n">${x.getDate()}${mes}</span>${est ? `<span class="ag-est"><span class="el">${esc(est.etq)}</span><span class="ec" aria-hidden="true">${esc(est.corto)}</span></span>` : ''}<span class="ag-pts">${tipos.filter((t) => !['festivo', 'media', 'fiesta'].includes(t) || !est).map((t) => `<i class="t-${t}"></i>`).join('')}</span>`;
    const ce = est ? ' ' + est.cls : '';
    return es.length && !pasado
      ? `<button type="button" class="ag-c${ce}${d === hoy ? ' hoy' : ''}${finde ? ' finde' : ''}" data-ag-dia="${d}" aria-label="${esc(lbl)}">${dentro}</button>`
      : `<span class="ag-c${ce}${pasado ? ' pasado' : ''}${d === hoy ? ' hoy' : ''}${finde ? ' finde' : ''}"${est ? ` title="${esc(est.ev.map((e) => e.t).join(' · '))}"` : ''}>${dentro}</span>`;
  };
  const mesAbierto = !!S.agMes;
  // el mes entero (de lunes a domingo), desde este hasta dentro de 14 meses: la Fed, el BCE y los festivos
  // ya están puestos hasta finales del año que viene; resultados y dividendos, los próximos que se saben
  const MAX_MESES = 14;
  const mesN = Math.max(0, Math.min(MAX_MESES, S.agMesN || 0));
  const m0 = (() => { const b = deIso(hoy); return new Date(b.getFullYear(), b.getMonth() + mesN, 1); })();
  const evMesTodo = mesAbierto ? agendaLista(M, 470) : [];
  const evMes = evMesTodo.filter((e) => enModo(e, modo));
  const porDiaMes = new Map(); for (const e of evMes) { if (!porDiaMes.has(e.d)) porDiaMes.set(e.d, []); porDiaMes.get(e.d).push(e); }
  // la celda entera dice si la bolsa cierra, si es media sesión o si es festivo con la bolsa abierta (en cualquier pestaña)
  const estMes = new Map(); { const g = new Map(); for (const e of evMesTodo) { if (!g.has(e.d)) g.set(e.d, []); g.get(e.d).push(e); } for (const [d, l] of g) { const st = estadoDiaAg(l); if (st) estMes.set(d, st); } }
  for (const [d, st] of estMes) { const l = porDiaMes.get(d) || []; for (const e of st.ev) if (!l.some((x) => x.id === e.id)) l.push(e); porDiaMes.set(d, l.sort((a, b) => ordenAg(a) - ordenAg(b))); }
  const desfase = (m0.getDay() + 6) % 7, diasMes = new Date(m0.getFullYear(), m0.getMonth() + 1, 0).getDate();
  const nCeldas = Math.ceil((desfase + diasMes) / 7) * 7;
  const celdaMes = (k) => {
    const x = new Date(m0.getFullYear(), m0.getMonth(), 1 - desfase + k), d = iso(x);
    const fuera = x.getMonth() !== m0.getMonth(), es = fuera ? [] : porDiaMes.get(d) || [], pasado = d < hoy, finde = x.getDay() === 0 || x.getDay() === 6;
    const st = fuera ? null : estMes.get(d);
    const tipos = [...new Set(es.map((e) => e.tipo))].filter((t) => !st || !['festivo', 'media', 'fiesta'].includes(t)).slice(0, 3);
    const cls = `ag-c${st ? ' ' + st.cls : ''}${fuera ? ' fuera' : ''}${pasado ? ' pasado' : ''}${d === hoy ? ' hoy' : ''}${finde ? ' finde' : ''}${S.agDia === d ? ' sel' : ''}`;
    const dentro = `<span class="n">${x.getDate()}</span>${st ? `<span class="ag-est"><span class="el">${esc(st.etq)}</span><span class="ec" aria-hidden="true">${esc(st.corto)}</span></span>` : ''}<span class="ag-pts">${tipos.map((t) => `<i class="t-${t}"></i>`).join('')}</span>`;
    return es.length ? `<button type="button" class="${cls}" data-ag-sel="${d}" aria-pressed="${S.agDia === d}" aria-label="${esc(`${fechaDia(d)}: ${es.map((e) => e.t).join(', ')}`)}">${dentro}</button>` : `<span class="${cls}">${dentro}</span>`;
  };
  const nomMes = (() => { const m = mesL(m0.getMonth()); return m[0].toUpperCase() + m.slice(1) + ' ' + m0.getFullYear(); })();
  const evDelMes = evMes.filter((e) => e.d.slice(0, 7) === iso(m0).slice(0, 7));
  const diaSel = S.agDia && S.agDia.slice(0, 7) === iso(m0).slice(0, 7) ? S.agDia : null;
  // la lista: esta semana, la que viene y luego cada mes
  const finSem = new Date(lunes); finSem.setDate(lunes.getDate() + 6);
  const finSig = new Date(lunes); finSig.setDate(lunes.getDate() + 13);
  const grupoDe = (d) => (d <= iso(finSem) ? L('Esta semana', 'This week') : d <= iso(finSig) ? L('La semana que viene', 'Next week') : (() => { const x = deIso(d); const m = mesL(x.getMonth()); return m[0].toUpperCase() + m.slice(1) + (x.getFullYear() !== new Date().getFullYear() ? ` ${x.getFullYear()}` : ''); })());
  const grupos = [];
  for (const e of ev) {
    const gk = grupoDe(e.d);
    let g = grupos[grupos.length - 1]; if (!g || g.k !== gk) { g = { k: gk, dias: [] }; grupos.push(g); }
    let dd = g.dias[g.dias.length - 1]; if (!dd || dd.d !== e.d) { dd = { d: e.d, ev: [] }; g.dias.push(dd); }
    dd.ev.push(e);
  }
  const item = (e) => {
    const on = abiertos.has(e.id);
    return `<li class="ag-e t-${e.tipo}${on ? ' on' : ''}" data-ag-id="${esc(e.id)}"><button type="button" class="ag-f" data-ag="${esc(e.id)}" aria-expanded="${on}"><span class="ag-ic">${iconoAg(e)}</span><span class="ag-tx"><b>${tituloAg(e)}${e.est ? ` <span class="chip">${L('fecha estimada', 'estimated date')}</span>` : ''}</b><small>${esc(e.s)}</small></span>${importeAg(e)}</button>
      <div class="ag-det"${on ? '' : ' hidden'}><p>${e.det || ''}</p>${e.acc ? `<div class="ag-acc">${e.acc}</div>` : ''}</div></li>`;
  };
  const pasado = pasadoAg(modo);
  return `
  <a class="vista-volver" href="#cartera">${SVG('<path d="M15 18l-6-6 6-6"/>', 2)}${L('Inicio', 'Home')}</a><div class="vista-cab"><h1>${L('Calendario', 'Calendar')}</h1><p>${resumen.length ? `${L('En los próximos cuatro meses', 'Over the next four months')}: ${esc(yLista(resumen))}.` : L('Lo que viene para lo que tienes, con los días que faltan, y lo último que ha pasado.', 'What’s coming up for what you own, with a countdown, and the latest news.')}</p></div>
  <div class="ag2">
    <div class="tabs ag-modos" role="group" aria-label="${L('Qué ver', 'Show')}">${AG_MODOS.map(([k, n, en]) => `<button data-agm="${k}" aria-pressed="${modo === k}">${L(n, en)}</button>`).join('')}</div>
    ${modo === 'mio' && !M.filas.length ? `<p class="nota">${L('Cuando metas tus acciones y fondos, aquí saldrán sus resultados y dividendos con lo que te toca en euros.', 'Once you add your shares and funds, their earnings and dividends will show up here, with what you get in euros.')}</p>` : ''}
    <section class="ag2-sec"><h2>${L('Próximos', 'Coming up')}</h2>
      ${prox.length ? `<div class="agc-fila">${prox.map((e) => tarjeta(e)).join('')}</div>${proxTodos.length > 6 ? `<button type="button" class="enlace acento agc-mas" data-ag-prox>${S.agProxTodo ? L('Ver menos', 'Show less') : L(`Ver ${proxTodos.length - 6} más`, `Show ${proxTodos.length - 6} more`)}</button>` : ''}` : `<div class="vacio">${L('Nada a la vista en esta pestaña.', 'Nothing coming up in this tab.')}</div>`}</section>
    <div class="ag2-cols"><div class="ag2-izq">
    <section class="ag-mes2${mesAbierto ? ' on' : ''}">
      <button type="button" class="ag-mes-b" data-ag-mes aria-expanded="${mesAbierto}"><span>${ICONOS.agenda}${mesAbierto ? L('El calendario', 'The calendar') : L('Esta semana', 'This week')}</span><span class="ag-mes-v">${mesAbierto ? L('Plegar', 'Collapse') : L('Ver el mes', 'See the month')}<i aria-hidden="true"></i></span></button>
      ${mesAbierto ? `<div class="ag-nav"><button type="button" class="ib" data-ag-mesn="-1" aria-label="${L('Mes anterior', 'Previous month')}"${mesN ? '' : ' disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>
          <div class="ag-nav-t"><b data-no-trad>${esc(L(nomMes, `${MESES_EN[m0.getMonth()]} ${m0.getFullYear()}`))}</b><small>${evDelMes.length ? L(`${evDelMes.length} ${evDelMes.length === 1 ? 'cosa' : 'cosas'} este mes`, `${evDelMes.length} ${evDelMes.length === 1 ? 'thing' : 'things'} this month`) : L('Nada apuntado este mes', 'Nothing this month')}</small></div>
          <button type="button" class="ib" data-ag-mesn="1" aria-label="${L('Mes siguiente', 'Next month')}"${mesN < MAX_MESES ? '' : ' disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div>
        <div class="ag-cal" data-ag-desliza>${L(['L', 'M', 'X', 'J', 'V', 'S', 'D'], ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((x) => `<span class="sem" data-no-trad>${x}</span>`).join('')}${Array.from({ length: nCeldas }, (_, k) => celdaMes(k)).join('')}</div>
        ${diaSel ? `<div class="ag-diap"><h3>${esc(fechaDia(diaSel))}<small>${faltan(diaSel, true)}</small></h3><ul class="ag-evs">${(porDiaMes.get(diaSel) || []).map(item).join('')}</ul></div>` : `<p class="ag-pista">${L('Toca un día con puntos (o marcado) para ver qué pasa. Las flechas (o deslizar) te llevan a los meses siguientes.', 'Tap a day with dots (or shading) to see what happens. The arrows (or swiping) take you to the next months.')}${comunidadUsuario() ? '' : ` <a href="#futuro" class="enlace acento">${L('Pon tu comunidad en Objetivos', 'Set your region in Goals')}</a> ${L('y saldrán también sus festivos.', 'to see its holidays too.')}`}</p>`}
        <div class="ag-ley">${[['resultados', L('Resultados', 'Earnings')], ['dividendo', L('Dividendos', 'Dividends')], ['banco', L('Bancos centrales', 'Central banks')], ['aportacion', L('Aportaciones', 'Contributions')]].map(([t, n]) => `<span><i class="t-${t}"></i>${n}</span>`).join('')}${[['cierra', L('Bolsa cerrada', 'Market closed')], ['media', L('Media sesión', 'Half day')], ['fiesta', L('Festivo, la bolsa abre', 'Holiday, market open')]].map(([c, n]) => `<span><i class="sw ${c}"></i>${n}</span>`).join('')}</div>`
        : `<div class="ag-semana">${Array.from({ length: 7 }, (_, k) => celda(k, true)).join('')}</div>`}
    </section>
    ${grupos.length > 0 ? `<section class="ag2-sec ag2-mas"><h2>${L('Más adelante', 'Later on')}</h2>
      ${grupos.map((g) => `<section class="ag-grupo"><h3>${esc(g.k)}</h3>${g.dias.map((dd) => { const x = deIso(dd.d); return `<div class="ag-dia" id="ag-d-${dd.d}"><div class="ag-fe"><span class="ds">${diaSemL(x.getDay())}</span><b>${x.getDate()}</b><span class="cd">${faltan(dd.d, true)}</span></div><ul class="ag-evs">${dd.ev.map(item).join('')}</ul></div>`; }).join('')}</section>`).join('')}</section>` : ''}
    </div><div class="ag2-der">
    ${pasado.html ? `<section class="ag2-sec ag2-ult"><h2>${L('Lo último', 'Latest')}</h2><div class="agp-lista">${pasado.html}</div>${pasado.mas ? `<button type="button" class="btn peq ag-mas-not" data-ag-pasado>${L('Ver más noticias', 'More news')}</button>` : ''}</section>` : ''}
    </div></div>
    <p class="nota ag2-pie">${L('Resultados y dividendos: Yahoo Finance (las empresas a veces los mueven unos días). Fed, BCE y festivos: sus calendarios oficiales. Noticias: Google Noticias. Los importes son orientativos.', 'Earnings and dividends: Yahoo Finance (companies sometimes move them a few days). Fed, ECB and holidays: their official calendars. News: Google News. Amounts are approximate.')}</p>
  </div>`;
}
/* el mes se puede pasar deslizando el dedo, como en el calendario del móvil */
{
  let x0 = null, y0 = 0;
  document.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && e.target.closest && e.target.closest('[data-ag-desliza]')) { x0 = e.clientX; y0 = e.clientY; } else x0 = null; }, { passive: true });
  document.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const n = Math.max(0, Math.min(14, (S.agMesN || 0) + (dx < 0 ? 1 : -1)));
    if (n !== (S.agMesN || 0)) { S.agMesN = n; S.agDia = null; pintar(); }
  }, { passive: true });
}
/* abrir y cerrar cada fecha, filtrar y saltar a un día */
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-agm]');
  if (f) { S.agModo = f.dataset.agm; LS.set('inv-agmodo', S.agModo); pintar(); return; }
  if (e.target.closest('[data-ag-prox]')) { S.agProxTodo = !S.agProxTodo; pintar(); return; }
  if (e.target.closest('[data-ag-mes]')) { S.agMes = !S.agMes; if (!S.agMes) { S.agMesN = 0; S.agDia = null; } pintar(); return; }
  const mn = e.target.closest('[data-ag-mesn]');
  if (mn) { if (mn.disabled) return; S.agMesN = Math.max(0, Math.min(14, (S.agMesN || 0) + +mn.dataset.agMesn)); S.agDia = null; pintar(); return; }
  const sel = e.target.closest('[data-ag-sel]');
  if (sel) { S.agDia = S.agDia === sel.dataset.agSel ? null : sel.dataset.agSel; pintar(); const p = document.querySelector('.ag-diap'); if (p) p.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }); return; }
  if (e.target.closest('[data-ag-pasado]')) { S.agPasado = true; pintar(); return; }
  const b = e.target.closest('.ag-f');
  if (b) {
    const li = b.closest('.ag-e'), id = b.dataset.ag, det = li.querySelector('.ag-det'), on = !li.classList.contains('on');
    li.classList.toggle('on', on); b.setAttribute('aria-expanded', on); det.hidden = !on;
    const ab = S.agAbiertos || (S.agAbiertos = new Set()); if (on) ab.add(id); else ab.delete(id);
    return;
  }
  const dia = e.target.closest('[data-ag-dia]');
  if (dia) { const el = document.getElementById('ag-d-' + dia.dataset.agDia); if (el) { el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); el.classList.remove('destello'); void el.offsetWidth; el.classList.add('destello'); } return; }
  const ir = e.target.closest('[data-ag-ir]');
  if (ir) {
    const id = ir.dataset.agIr;
    (S.agAbiertos || (S.agAbiertos = new Set())).add(id);
    const modoVe = S.agModo || LS.get('inv-agmodo', null) || (S.M && S.M.filas.length ? 'mio' : 'tu');
    if (modoVe !== 'tu') { const ev0 = agendaLista(S.M, 120).find((x) => x.id === id); if (ev0 && !enModo(ev0, modoVe)) S.agModo = 'tu'; }
    const ve = () => { const li = document.querySelector(`.ag-e[data-ag-id="${CSS.escape(id)}"]`); if (li) { li.scrollIntoView({ behavior: 'smooth', block: 'center' }); li.classList.remove('destello'); void li.offsetWidth; li.classList.add('destello'); } };
    if (S.vista === 'agenda') { e.preventDefault(); pintar(); setTimeout(ve, 30); } else S.agIr = id;
  }
});

/* ¿El precio al que dices que compraste cuadra con lo que valía ese día? Si no, casi seguro que es
   otro fondo u otra clase del mismo (mismo índice, distinto ISIN y distinto precio): la web multiplicaría
   tus participaciones por un precio que no es el tuyo. Busca en tu lista uno que sí cuadre. */
function precioCompraRaro(f) {
  if (!f || f.estimada || !f.hist || !(f.uds > 0) || !(f.coste > 0)) return null;
  let lotes; try { lotes = lotesDe(f.pos); } catch (e) { return null; }
  for (const l of lotes) {
    const fecha = l.mezcla ? f.pos.desde : l.f;
    if (!fecha || !(l.u > 0) || !(l.c > 0)) continue;
    const pagado = l.c / l.u, real = precioEn(f.hist, fecha, 'antes');
    if (!real) continue;
    const r = pagado / real;
    if (r > 0.8 && r < 1.25) continue;
    const cerca = (v) => v.filter((x) => x.p && Math.abs(pagado / x.p - 1) < 0.04).sort((a, b) => Math.abs(pagado / a.p - 1) - Math.abs(pagado / b.p - 1))[0] || null;
    let otro = cerca(S.instOrden.filter((id) => id !== f.inst.id && S.inst[id].clase === f.inst.clase).map((id) => { const h = histDe(id); return { id, p: h ? precioEn(h, fecha, 'antes') : null }; }));
    // si no está en tu lista, en el catálogo común: los del mismo tipo y la misma zona
    if (!otro) {
      const cands = candidatosCatRaro(f), faltan = cands.filter((c) => !S.catHistC[c]);
      if (faltan.length) { if (!S.cargandoCand) { S.cargandoCand = true; cargarCandidatosCat(faltan).then(() => { S.cargandoCand = false; pintar(); }); } }
      else otro = cerca(cands.map((cid) => ({ cid, p: S.catHistC[cid].length ? precioEn(S.catHistC[cid], fecha, 'antes') : null })));
    }
    return { f, fecha, pagado, real, otro };
  }
  return null;
}
S.catHistC = {};
const regionPrincipal = (r) => (Object.entries(r || {}).sort((a, b) => b[1] - a[1])[0] || [])[0];
function candidatosCatRaro(f) {
  const r0 = regionPrincipal(f.inst.region);
  return Object.entries((S.cat && S.cat.v) || {}).filter(([cid, x]) => x.cl === f.inst.clase && regionPrincipal(x.r) === r0 && f.inst.cat !== cid && (!f.inst.isin || String(x.isin || '') !== String(f.inst.isin))).map(([cid]) => cid).slice(0, 16);
}
async function cargarCandidatosCat(cids) {
  await Promise.all(cids.map(async (cid) => {
    try { const r = await fetch(CFG.dev ? `dev/cat/${cid}.json` : GH.raw(`cat/${cid}.json`, 'catalogo'), { cache: 'force-cache' }); const j = r.ok ? await r.json() : null; S.catHistC[cid] = (j && j.h) || []; } catch (e) { S.catHistC[cid] = []; }
  }));
}
function avisoPrecioRaro(x) {
  const fondo = /^Fondo/.test(x.f.inst.tipo || '');
  const oc0 = x.otro && x.otro.cid && S.cat && S.cat.v[x.otro.cid];
  const o = x.otro && (x.otro.id ? S.inst[x.otro.id] : oc0 ? { nombre: oc0.n, corto: oc0.c || oc0.n } : null);
  return {
    n: 'bad', i: ICONOS.alerta, t: `${x.f.inst.corto}: el precio de compra no cuadra`,
    d: `Pones que compraste a ${precioFmt(x.pagado)} el ${fechaLarga(x.fecha)}, pero ${x.f.inst.nombre || x.f.inst.corto} valía ${precioFmt(x.real)} ese día. ${o ? `Cuadra con ${o.nombre} (${precioFmt(x.otro.p)} ese día): seguramente es el tuyo.` : `Seguramente tienes ${fondo ? 'otro fondo u otra clase del mismo' : 'otro valor'}: mira el ISIN en tu bróker y búscalo por ISIN.`} Mientras tanto, el valor y la ganancia salen mal.`,
    acc: o ? `<button class="btn peq pri" data-accion="cambiar-inst" data-id="${esc(x.f.pos.id)}" data-inst="${esc(x.otro.id || 'cat:' + x.otro.cid)}">Cambiar a ${esc(o.corto || o.nombre)}</button>` : `<button class="btn peq" data-accion="editar-pos" data-id="${esc(x.f.pos.id)}">Revisarla</button>`,
  };
}
function avisos(M) {
  const av = [];
  // quien venía de la 0.1: arriba del todo, una forma fácil de recuperar lo que no llegó a la cuenta
  if (!S.demo && S.kv && S.cartera && S.cartera.kit && S.cartera.kit.codigo && !S.cartera.kit.guardado) av.push({ n: 'info', grave: true, i: ICONOS.candado, t: L('Guarda tu código de recuperación', 'Save your recovery code'), d: L('Si olvidas la contraseña de tu cartera, con él la recuperas. Sin él y sin la contraseña, nadie puede abrirla, ni GrowFolio.', 'If you forget your portfolio password, it gets your portfolio back. Without it and without the password, nobody can open it, not even GrowFolio.'), acc: `<button class="btn peq pri" data-accion="ver-kit">${L('Verlo y guardarlo', 'See and save it')}</button>` });
  // 0.5: aún en el formato 1 (el paso es solo a los días): se puede crear ya
  else if (!S.demo && !S.kv && S.cartera && conKit() && LS.get('inv-05-desde') && diasEntre(LS.get('inv-05-desde'), hoyIso()) >= 1) av.push({ n: 'info', grave: true, i: ICONOS.candado, t: L('Crea tu código de recuperación', 'Create your recovery code'), d: L('Con él recuperas tu cartera si algún día olvidas su contraseña. Se crea en un segundo. Si tienes GrowFolio abierto en otro móvil u ordenador, ciérralo y vuelve a abrirlo después.', 'It gets your portfolio back if you ever forget its password. It takes a second. If GrowFolio is open on another phone or computer, close it and open it again afterwards.'), acc: `<button class="btn peq pri" data-accion="ver-kit">${L('Crearlo', 'Create it')}</button>` });
  // 0.5: fuera «¿Te falta algo de tu cartera de antes?» (la de la 0.1 en GitHub o en el dispositivo): ya no queda nadie con ella
  for (const f of M.filas) { const x = precioCompraRaro(f); if (x) av.push({ ...avisoPrecioRaro(x), grave: true }); }
  for (const f of M.filas) {
    const s = f.senal;
    if ((s.analistas || s.nivel === 'vender') && (+f.pos.stop && f.precio <= +f.pos.stop)) av.push({ n: 'bad', i: ICONOS.stop, t: `${f.inst.corto}: precio de salida alcanzado`, d: s.analistas ? L(`Está a ${precioFmt(f.precio)}, por debajo del precio de salida que pusiste (${precioFmt(+f.pos.stop)}).`, `It is at ${precioFmt(f.precio)}, below the exit price you set (${precioFmt(+f.pos.stop)}).`) : s.motivos[0] });
    else if (+f.pos.stop && f.precio && (f.precio / +f.pos.stop - 1) * 100 < 5) av.push({ n: 'warn', i: ICONOS.alerta, t: `${f.inst.corto} se acerca a tu salida`, d: `Está a un ${fmtNum((f.precio / f.pos.stop - 1) * 100, 1)} % de ${precioFmt(+f.pos.stop)}.` });
  }
  const sueltas = M.filas.filter((f) => f.inst.tipo === 'Acción');
  const pctSueltas = M.total ? (sum(sueltas, (f) => f.valor) / M.total) * 100 : 0;
  const lim = +(S.cartera.limite_acciones ?? 20);
  if (sueltas.length) av.push({ n: pctSueltas > lim ? 'warn' : 'info', i: pctSueltas > lim ? ICONOS.alerta : ICONOS.info, t: `Acciones sueltas: ${pct(pctSueltas, 1)} de la cartera`, d: `Tu límite es el ${fmtNum(lim, 0)} %. ${pctSueltas > lim ? 'Lo has pasado.' : `Te queda margen de ${eur(((lim - pctSueltas) / 100) * M.total, 0)}.`}` });
  const estimadas = M.filas.filter((f) => f.estimada);
  if (estimadas.length) av.push({ n: 'warn', i: ICONOS.alerta, t: L(`${estimadas.length === 1 ? 'Una posición' : estimadas.length + ' posiciones'} con la cantidad estimada`, `${estimadas.length === 1 ? 'One holding' : estimadas.length + ' holdings'} with an estimated quantity`), d: L(`${yLista(estimadas.map((f) => f.inst.corto))}. Pon las participaciones exactas en la ficha de cada una (botón Editar) para que cuadre al céntimo.`, `${yLista(estimadas.map((f) => f.inst.corto))}. Enter the exact units on each one's page (Edit button) so it matches to the cent.`) });
  for (const f of M.filas) {
    if (f.p && f.p.estado === 'antiguo') av.push({ n: 'warn', i: ICONOS.alerta, t: `${f.inst.corto}: precio sin actualizar`, d: `Último precio bueno del ${fechaLarga(f.p.fecha)}.` });
    // solo si de verdad no tiene precio: muchas lo sacan del catálogo, del radar o de su último cierre aunque no estén
    // en la lista de la Action, y entonces el aviso se quedaba aunque el precio ya saliera
    if (f.precio == null) av.push({ n: 'warn', i: ICONOS.alerta, t: `${f.inst.corto || f.pos.instrumento}: sin precio`, d: 'Si lo acabas de añadir, GrowFolio le busca precio en la próxima actualización.' });
  }
  if (S.precios && S.precios.generado && (Date.now() - new Date(S.precios.generado)) > 3 * 86400000) av.push({ n: 'warn', i: ICONOS.alerta, t: 'Los datos llevan días sin actualizarse', d: 'Mira la pestaña Actions del repositorio: GitHub pausa las tareas programadas tras 60 días sin actividad.' });
  return av;
}
/* los avisos graves (un precio de compra que no cuadra) van arriba, antes de las posiciones */
function htmlAvisosGraves(M) {
  const av = avisos(M).filter((a) => a.grave);
  return av.length ? `<ul class="lista graves">${av.map((a) => `<li class="${a.n}">${a.i}<div><b>${esc(a.t)}</b><span>${esc(a.d)}</span>${a.acc ? `<div class="aviso-acc">${a.acc}</div>` : ''}</div></li>`).join('')}</ul>` : '';
}
function htmlAvisos(M) {
  const av = avisos(M).filter((a) => !a.grave);
  return `<section aria-labelledby="hAvi">
    <div class="sec-cab"><h2 id="hAvi">Avisos</h2>${av.length ? '' : '<span class="k">nada que vigilar</span>'}</div>
    ${av.length ? `<ul class="lista">${av.map((a) => `<li class="${a.n}">${a.i}<div><b>${esc(a.t)}</b><span>${esc(a.d)}</span>${a.acc ? `<div class="aviso-acc">${a.acc}</div>` : ''}</div></li>`).join('')}</ul>` : ''}
  </section>`;
}

