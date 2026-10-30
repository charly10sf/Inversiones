/* =====================================================================
   Impuestos (IRPF de territorio común, residente en España)
   - Ganancias y pérdidas de ventas, dividendos e intereses van a la base del ahorro.
   - Lo vendido se calcula con FIFO (primero salen las acciones más antiguas), como pide Hacienda.
   - Saldos negativos: se compensan entre ganancias y rendimientos hasta el 25 % y el resto en 4 años.
   - Al comprar, algunos países cobran una tasa: España 0,2 % y Francia 0,4 % (empresas de más de
     1.000 M€), Italia 0,1 %, Reino Unido 0,5 %. Los ETF y fondos no la pagan.
   ===================================================================== */
/* Tu comunidad (en tu perfil): cambia la escala del ahorro solo en País Vasco y Navarra, que tienen la suya
   (régimen foral); en las demás es la misma en toda España. Y cambia mucho lo que se paga por una donación de tus
   padres (la entrada de un piso, por ejemplo). Datos de 2026, con la norma de cada una para poder comprobarla. */
const COMUNIDADES = [['andalucia', 'Andalucía'], ['aragon', 'Aragón'], ['asturias', 'Asturias'], ['baleares', 'Illes Balears'], ['canarias', 'Canarias'], ['cantabria', 'Cantabria'], ['clm', 'Castilla-La Mancha'], ['cyl', 'Castilla y León'], ['cataluna', 'Cataluña'], ['ceuta', 'Ceuta'], ['valencia', 'Comunitat Valenciana'], ['extremadura', 'Extremadura'], ['galicia', 'Galicia'], ['madrid', 'Comunidad de Madrid'], ['melilla', 'Melilla'], ['murcia', 'Región de Murcia'], ['navarra', 'Navarra'], ['paisvasco', 'País Vasco'], ['rioja', 'La Rioja']];
const nombreComunidad = (c) => (COMUNIDADES.find(([k]) => k === c) || [])[1] || '';
// para frases: «en la Comunidad de Madrid», «de la Región de Murcia»
const NOMBRE_CCAA_EN = { andalucia: 'Andalusia', aragon: 'Aragon', asturias: 'Asturias', baleares: 'the Balearic Islands', canarias: 'the Canary Islands', cantabria: 'Cantabria', clm: 'Castilla-La Mancha', cyl: 'Castile and León', cataluna: 'Catalonia', ceuta: 'Ceuta', valencia: 'the Valencian Community', extremadura: 'Extremadura', galicia: 'Galicia', madrid: 'the Community of Madrid', melilla: 'Melilla', murcia: 'the Region of Murcia', navarra: 'Navarre', paisvasco: 'the Basque Country', rioja: 'La Rioja' };
const conArticulo = (c) => L(({ madrid: 'la Comunidad de Madrid', valencia: 'la Comunitat Valenciana', murcia: 'la Región de Murcia', baleares: 'Baleares' })[c] || nombreComunidad(c), NOMBRE_CCAA_EN[c] || nombreComunidad(c));
const comunidadUsuario = () => (S.cartera && S.cartera.perfil && S.cartera.perfil.comunidad) || null;
const opcionesComunidad = (sel) => `<option value="">${L('Elige tu comunidad', 'Choose your region')}</option>${COMUNIDADES.map(([k, n]) => `<option value="${k}"${k === sel ? ' selected' : ''} data-no-trad>${esc(n)}</option>`).join('')}`;
const TRAMOS_COMUN = [[6000, 0.19], [50000, 0.21], [200000, 0.23], [300000, 0.27], [Infinity, 0.30]];
const TRAMOS_FORAL = {
  // Álava, Bizkaia y Gipuzkoa, la misma desde 2026 (NF 2/2025 de Bizkaia y las de las otras dos diputaciones)
  paisvasco: [[7500, 0.19], [15000, 0.20], [30000, 0.22], [50000, 0.24], [90000, 0.255], [120000, 0.26], [240000, 0.265], [300000, 0.27], [Infinity, 0.28]],
  // art. 60 del Texto Refundido de la Ley Foral del IRPF (DFL 4/2008)
  navarra: [[6000, 0.20], [10000, 0.22], [15000, 0.24], [200000, 0.26], [300000, 0.27], [Infinity, 0.28]],
};
const tramosAhorro = (c = comunidadUsuario()) => TRAMOS_FORAL[c] || TRAMOS_COMUN;
const pctTramo = (t) => fmtNum(t * 100, Math.round(t * 1000) % 10 ? 1 : 0);
const textoTramos = (c = comunidadUsuario(), en = false) => { const T = tramosAhorro(c); let d = 0; return T.map(([h, t]) => { const x = h === Infinity ? (en ? `${pctTramo(t)} % above ${fmtNum(d, 0)} €` : `${pctTramo(t)} % por encima de ${fmtNum(d, 0)} €`) : (en ? `${pctTramo(t)} % up to ${fmtNum(h, 0)} €` : `${pctTramo(t)} % hasta ${fmtNum(h, 0)} €`); d = h; return x; }).join(', '); };
const tipoMarginal = (base) => { const T = tramosAhorro(); return (T.find(([h]) => base < h) || T[T.length - 1])[1]; };
// donación de dinero de padres a hijos: [lo que se paga, requisitos, norma]
const DONACIONES_EN = {
  andalucia: ['A 99 % rebate on the tax: you pay almost nothing.', 'A public deed and proof of where the money comes from.'],
  aragon: ['Up to 100,000 € is tax-free (once every 5 years), and a 99 % rebate if the taxable base is 500,000 € or less.', 'File on time; property must be in a deed.'],
  asturias: ['A reduced 2 % rate up to 150,000 €.', 'A public deed and prior wealth of up to 402,678 €; otherwise, the general rate.'],
  baleares: ['A 100 % deduction on the tax since July 2025: nothing to pay.', 'A public deed.'],
  canarias: ['A 99.9 % rebate: you pay almost nothing.', 'A public deed.'],
  cantabria: ['A 100 % rebate since 2024: nothing to pay.', 'The formal requirements of the regional law.'],
  clm: ['A 95 % rebate up to 120,000 €, 90 % up to 240,000 € and 85 % above.', 'A public deed, proof of origin and keeping the gift for 5 years.'],
  cyl: ['A 99 % rebate: you pay almost nothing.', 'A public deed and proof of where the money comes from.'],
  cataluna: ['Reduced rates: 5 % up to 200,000 €, 7 % up to 600,000 € and 9 % above.', 'A public deed (or signing one within a month of the handover).'],
  valencia: ['A 100,000 € allowance and a 99 % rebate: you pay almost nothing.', 'A public deed and proof of origin (up to 4,000 € a digitally signed document is enough).'],
  extremadura: ['A 99 % rebate up to a 300,000 € base and 50 % between 300,000 and 600,000 €.', 'A public deed above 10,000 € (adding the previous three years) and proof of origin.'],
  galicia: ['Reduced rates: 5 % up to 200,000 €, 7 % up to 600,000 € and 9 % above.', 'A public deed; without it, the general scale (5 to 18 %).'],
  madrid: ['A 99 % rebate: you pay almost nothing.', 'A public document above 10,000 € (adding the previous three years) and proof of where the money comes from.'],
  murcia: ['A 99 % deduction on the tax: you pay almost nothing.', 'A public deed and proof of where the money comes from.'],
  navarra: ['Its own foral scale: between parents and children, 0.8 % to 8 %.', 'No deed requirement for the reduced rate.'],
  paisvasco: ['A 1.5 % rate between parents and children, in all three provinces.', 'No deed requirement for the reduced rate.'],
  rioja: ['A 99 % deduction on the tax, with no limit: you pay almost nothing.', 'A notarial document.'],
};
const DONACIONES = {
  andalucia: ['Bonificación del 99 % de la cuota: casi no se paga.', 'Escritura pública y que conste de dónde sale el dinero.', 'Ley 5/2021, art. 33 ter'],
  aragon: ['Hasta 100.000 € no se paga (una vez cada 5 años), y bonificación del 99 % si la base no pasa de 500.000 €.', 'Presentarla a tiempo; los inmuebles, en escritura.', 'DLeg 1/2005, arts. 132-2 y 132-6'],
  asturias: ['Tipo reducido del 2 % hasta 150.000 €.', 'Escritura pública y un patrimonio previo de hasta 402.678 €; si no, tarifa general.', 'DLeg 2/2014, art. 21.3'],
  baleares: ['Deducción del 100 % de la cuota desde julio de 2025: no se paga.', 'Escritura pública.', 'Ley 6/2025'],
  canarias: ['Bonificación del 99,9 %: casi no se paga.', 'Escritura pública.', 'DL 5/2023, art. 26 sexies'],
  cantabria: ['Bonificación del 100 % desde 2024: no se paga.', 'Los requisitos formales de la norma autonómica.', 'Ley de Cantabria 3/2023'],
  clm: ['Bonificación del 95 % hasta 120.000 €, del 90 % hasta 240.000 € y del 85 % por encima.', 'Escritura pública, origen del dinero y mantener lo donado 5 años.', 'Ley 8/2013, art. 17 bis'],
  cyl: ['Bonificación del 99 %: casi no se paga.', 'Escritura pública y origen del dinero.', 'Ley 3/2021'],
  cataluna: ['Tipos reducidos: 5 % hasta 200.000 €, 7 % hasta 600.000 € y 9 % por encima.', 'Escritura pública (o hacerla en el mes siguiente a la entrega).', 'Código Tributario de Cataluña, libro sexto (DLeg 1/2024)'],
  valencia: ['Reducción de 100.000 € y bonificación del 99 %: casi no se paga.', 'Escritura pública y origen del dinero (hasta 4.000 € basta un documento con firma digital).', 'Ley 13/1997, arts. 10 bis y 12 bis'],
  extremadura: ['Bonificación del 99 % hasta 300.000 € de base y del 50 % entre 300.000 y 600.000 €.', 'Escritura pública si pasa de 10.000 € (sumando los tres años anteriores) y origen del dinero.', 'Ley 5/2022'],
  galicia: ['Tipos reducidos: 5 % hasta 200.000 €, 7 % hasta 600.000 € y 9 % por encima.', 'Escritura pública; sin ella, tarifa general (del 5 al 18 %).', 'DLeg 1/2011, art. 9'],
  madrid: ['Bonificación del 99 %: casi no se paga.', 'Documento público si pasa de 10.000 € (sumando los tres años anteriores) y que conste de dónde sale el dinero.', 'DLeg 1/2010, arts. 22 bis y 25'],
  murcia: ['Deducción del 99 % de la cuota: casi no se paga.', 'Escritura pública y origen del dinero.', 'DLeg 1/2010 de Murcia, art. 4'],
  navarra: ['Tarifa foral propia: entre padres e hijos, del 0,8 % al 8 %.', 'Sin requisitos de escritura para la rebaja.', 'DFL 250/2002, art. 34'],
  paisvasco: ['Tipo del 1,5 % entre padres e hijos, en las tres diputaciones.', 'Sin requisitos de escritura para la rebaja.', 'NF 4/2015 (Bizkaia), NF 2/2022 (Gipuzkoa), NF 11/2005 (Álava)'],
  rioja: ['Deducción del 99 % de la cuota, sin límite: casi no se paga.', 'Documento notarial.', 'Ley 2/2024'],
};
const TASA_COMPRA = { ES: [0.002, 'impuesto sobre transacciones financieras español'], FR: [0.004, 'tasa francesa sobre transacciones financieras'], IT: [0.001, 'tasa italiana sobre transacciones financieras'], GB: [0.005, 'impuesto de timbre británico'] };
const SUFIJO_PAIS = { MC: 'ES', PA: 'FR', MI: 'IT', L: 'GB' };
function tasaRadar(x) {
  const pais = PAIS_DE_NOMBRE[x.pais], suf = String(x.s || '').split('.')[1];
  return SUFIJO_PAIS[suf] && SUFIJO_PAIS[suf] === pais ? tasaCompra(pais, 'Acción', x.cap) : null;
}
function tasaCompra(pais, tipo, capital) {
  if (tipo && tipo !== 'Acción') return null;
  const t = TASA_COMPRA[pais];
  if (!t) return null;
  if (pais !== 'GB' && pais !== 'IT' && capital != null && capital < 1e9) return null;
  return { tipo: t[0], nombre: t[1] };
}

/* Retención de los dividendos en el país de la sede de la empresa (tipo general para un particular
   residente en España, con el formulario que gestiona el bróker cuando hace falta). En la renta se
   recupera con la deducción por doble imposición hasta el tipo del convenio, casi siempre el 15 %:
   lo que pase de ahí se pierde salvo que se reclame a ese país. Orientativo. */
const RET_DIV = { ES: 19, US: 15, GB: 0, JE: 0, IM: 0, BM: 0, KY: 0, HK: 0, SG: 0, NL: 15, LU: 15, FR: 12.8, DE: 26.375, IT: 26, CH: 35, DK: 27, SE: 30, FI: 35, NO: 25, BE: 30, PT: 25, AT: 27.5, IE: 25, CA: 25, JP: 15.315, AU: 30, GR: 5, IL: 25, MX: 10, BR: 0, IN: 20, ZA: 20, CY: 0, TW: 21, KR: 22, CN: 10 };
function fiscalidadSede(cod, tipo = 'Acción') {
  const nombre = (cod && PAISES[cod]) || 'su país';
  if (tipo && /^Fondo/.test(tipo)) return { ret: 0, pierde: 0, txt: 'Fondos de acumulación: no reparten; pagas solo al vender (y entre fondos, ni eso, con un traspaso).' };
  if (tipo === 'ETF') return { ret: 0, pierde: 0, txt: 'ETF: si es de acumulación no reparte y pagas solo al vender (los traspasos sin impuestos no valen para los ETF). Si reparte, el dividendo tributa en tu renta.' };
  if (tipo && tipo !== 'Acción') return { ret: 0, pierde: 0, txt: 'No reparte nada: pagas solo al vender.' };
  const ret = cod ? RET_DIV[cod] : null;
  if (ret == null) return { ret: null, pierde: 0, txt: `Dividendos: ${nombre} aplica su propia retención; mira el informe de tu bróker.` };
  if (cod === 'ES') return { ret, pierde: 0, txt: 'Dividendos: llegan con el 19 % retenido; en la renta se ajusta a tu tramo.' };
  if (ret === 0) return { ret, pierde: 0, txt: `Dividendos: ${nombre} no retiene nada; tributan en tu renta como los españoles.` };
  const CDI_DIV = { IE: 0, JP: 5 }; // tipo del convenio cuando no es el 15 %
  const tope = CDI_DIV[cod] ?? 15, pierde = Math.max(0, ret - tope);
  if (!pierde) return { ret, pierde: 0, txt: `Dividendos: ${nombre} retiene un ${fmtNumR(ret)} % y lo recuperas entero en la renta.` };
  if (tope === 0) return { ret, pierde, txt: `Dividendos: ${nombre} retiene un ${fmtNumR(ret)} % y en España no se deduce nada (por el convenio, allí estarían exentos): se evita con un formulario en tu bróker o se reclama a ${nombre}.` };
  return { ret, pierde, txt: `Dividendos: ${nombre} retiene un ${fmtNumR(ret)} % y en la renta solo recuperas el ${tope} %: pierdes un ${fmtNumR(pierde)} % de cada dividendo (se puede reclamar a ${nombre}, con papeleo).` };
}
const tramoAhorro = () => { try { return fiscalAnio(new Date().getFullYear()).marginal; } catch (e) { return 0.19; } };

/* ---------- plazo: no es lo mismo ganar un 50 % en 3 meses que en 3 años ----------
   Se compara todo en "al año": (1 + lo que ganas)^(12 / meses) - 1. Neto: con la tasa de compra, la
   retención de los dividendos que no se recupera y tu tramo del ahorro al vender. */
const anualizar = (pct, meses) => (meses > 0 && pct > -100 ? (Math.pow(1 + pct / 100, 12 / meses) - 1) * 100 : null);
const bolsaAnual = () => { try { return cfgProy().bolsa; } catch (e) { return 7; } };
function rentaEsperada(x, subida, meses, fuente) {
  if (subida == null || !(meses > 0)) return null;
  const t = tramoAhorro();
  const o = origenRadar(x);
  const fis = fiscalidadSede(o.sede);
  const tasa = tasaRadar(x);
  const divP = ((x.div || 0) * meses) / 12;
  const ganP = subida > 0 ? subida * (1 - t) : subida;
  const netoP = ganP + divP * (1 - t - fis.pierde / 100) - (tasa ? tasa.tipo * 100 : 0);
  // un subidón en un mes no se puede repetir cada mes: para pasarlo a "al año" se cuentan al menos 3 meses
  const mA = Math.max(meses, 3);
  return { subida, meses, fuente, divP, netoP, netoAnual: anualizar(netoP, mA), brutoAnual: anualizar(subida + divP, mA), t, fis, tasa };
}
const plazoTxt = (m) => (m == null ? '' : m < 1.5 ? L('un mes', 'a month') : m < 12 ? L(`${Math.round(m)} meses`, `${Math.round(m)} months`) : m === 12 ? L('12 meses', '12 months') : m % 12 === 0 ? L(`${m / 12} años`, `${m / 12} years`) : L(`${fmtNum(m / 12, 1)} años`, `${fmtNum(m / 12, 1)} years`));
/* cuánto llevas ganando al año en una posición: con la fecha de cada compra (o "desde cuándo la tienes") */
function tiempoPos(f) {
  const pos = f.pos;
  let lotes; try { lotes = lotesDe(pos); } catch (e) { return null; }
  const ahora = Date.now();
  let c = 0, cd = 0;
  for (const l of lotes) {
    const d = l.mezcla ? pos.desde || (pos.entrada && pos.entrada.fecha && pos.entrada.fecha < (pos.fecha || hoyIso()) ? pos.entrada.fecha : null) : l.f;
    if (!d) return null;
    const dias = Math.max(1, (ahora - deIso(d)) / 864e5);
    c += l.c; cd += l.c * dias;
  }
  if (!c || !(f.coste > 0) || !(f.valor > 0)) return null;
  const dias = cd / c;
  if (dias < 45) return null;
  return { dias, anual: (Math.pow(f.valor / f.coste, 365 / dias) - 1) * 100 };
}
const duracion = (dias) => (dias < 75 ? `${Math.round(dias)} días` : dias < 548 ? `${Math.round(dias / 30.4)} meses` : `${fmtNum(dias / 365, 1)} años`);

function datosFiscales(anio) { return ((S.cartera.fiscal || {})[anio]) || {}; }
/* la regla de recompra de Hacienda (dos meses en lo que cotiza en la UE, un año en fondos y en lo de fuera, nada en cripto): una venta con
   pérdidas con una compra del mismo valor en ese plazo, antes o después (también una aportación automática), no
   resta este año. Devuelve la primera compra que la bloquea, o null si la pérdida cuenta */
function perdidaAplazada(v) {
  // 0.3.9: se aplaza solo la parte de la pérdida que corresponde a lo recomprado (en el plazo, antes o después) que
  // sigue en tu cartera; lo que salió en esa misma venta ya no está (art. 33.5 LIRPF; DGT V0248-18)
  if (!v || !(v.resultado < 0) || !(+v.uds > 0)) return null;
  const r = reglaRecompra(S.inst[v.instrumento]);
  if (!r || !r.meses) return null;
  const desde = sumarMeses(v.fecha, -r.meses), hasta = sumarMeses(v.fecha, r.meses);
  const lotes = (S.cartera.posiciones || []).filter((p) => p.instrumento === v.instrumento).flatMap((p) => { try { return lotesDe(p); } catch (e) { return []; } });
  const dentro = lotes.filter((l) => !l.mezcla && l.f >= desde && l.f <= hasta);
  const parte = Math.min(1, sum(dentro, (l) => +l.u || 0) / +v.uds);
  if (!(parte > 1e-6)) return null;
  const primero = dentro.map((l) => l.f).sort()[0];
  const aporte = (S.cartera.aportaciones || []).some((a) => a.instrumento === v.instrumento) && !(S.cartera.movimientos || []).some((m) => m.tipo === 'compra' && m.instrumento === v.instrumento && m.fecha === primero);
  return { fecha: primero, r, parte, importe: v.resultado * parte, aporte };
}
function fiscalAnio(anio, extra = 0) {
  const d = datosFiscales(anio);
  const ventas = (S.cartera.movimientos || []).filter((m) => m.tipo === 'venta' && String(m.fecha).startsWith(String(anio)));
  // las pérdidas bloqueadas por una recompra no restan este año (se aplazan hasta vender lo recomprado)
  const gpWeb = sum(ventas, (m) => { const a = perdidaAplazada(m); return (m.resultado || 0) - (a ? a.importe : 0); });
  const otras = +d.otras || 0;
  const gp = gpWeb + otras + extra;
  const rcm = +d.rcm || 0;
  const pendientes = Math.max(0, +d.pendientes || 0);
  // 0.3.9: el 25 % se calcula sobre el saldo positivo antes de compensar y es un tope conjunto con las pérdidas de años
  // anteriores (Manual AEAT 8.1.4); en Álava, Bizkaia y Gipuzkoa no hay compensación cruzada en la base del ahorro
  const cruza = comunidadUsuario() !== 'paisvasco';
  let bGP = gp, bRCM = rcm, cruzado = 0;
  const topeGP = cruza ? 0.25 * Math.max(0, rcm) : 0, topeRCM = cruza ? 0.25 * Math.max(0, gp) : 0;
  if (bGP < 0 && bRCM > 0) { cruzado = Math.min(-bGP, topeGP); bGP += cruzado; bRCM -= cruzado; }
  else if (bRCM < 0 && bGP > 0) { cruzado = Math.min(-bRCM, topeRCM); bRCM += cruzado; bGP -= cruzado; }
  let usadas = 0;
  if (pendientes > 0 && bGP > 0) { usadas = Math.min(bGP, pendientes); bGP -= usadas; }
  const quedaTope = Math.max(0, topeGP - (gp < 0 ? cruzado : 0));
  if (pendientes - usadas > 0 && bRCM > 0 && quedaTope > 0) { const u2 = Math.min(quedaTope, bRCM, pendientes - usadas); bRCM -= u2; usadas += u2; }
  const base = Math.max(0, bGP) + Math.max(0, bRCM);
  return { anio, ventas, gpWeb, otras, gp, rcm, pendientes, usadas, cruzado, base, cuota: irpfAhorro(base), marginal: tipoMarginal(base), sobra: (bGP < 0 ? -bGP : 0) + (pendientes - usadas), retenido: +d.retenido || 0 };
}
/* lo que añade una venta concreta a la factura de este año (con todo lo demás que ya llevas) */
function impuestoDeVenta(ganancia, anio = new Date().getFullYear()) {
  const a = fiscalAnio(anio), b = fiscalAnio(anio, ganancia);
  return { impuesto: b.cuota - a.cuota, antes: a, despues: b };
}

/* Lotes de compra de una posición: los guardados, o uno de partida con lo que tenías al empezar a
   usar la web, más cada aportación automática ya sumada (fecha, unidades y coste de cada una). */
function lotesDe(pos) {
  const f = calcularPos(pos, hoyIso());
  const apo = f.aportes.filter((a) => a.precio).map((a) => ({ f: a.f, u: a.importe / a.precio, c: a.importe }));
  let base;
  if (pos.lotes && pos.lotes.length) base = pos.lotes.map((l) => ({ ...l }));
  else {
    const u = (f.uds ?? 0) - sum(apo, (a) => a.u);
    base = u > 1e-9 ? [{ f: pos.fecha || hoyIso(), u, c: +pos.coste || 0, mezcla: true }] : [];
  }
  return [...base, ...apo].sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : 0));
}
function fifo(lotes, uds) {
  let resto = uds, coste = 0, mezcla = false;
  const usados = [], quedan = [];
  for (const l of lotes) {
    if (resto <= 1e-9) { quedan.push({ ...l }); continue; }
    const u = Math.min(resto, l.u), c = l.c * (u / l.u);
    usados.push({ f: l.f, u, c }); coste += c; resto -= u; mezcla = mezcla || !!l.mezcla;
    if (l.u - u > 1e-9) quedan.push({ ...l, u: l.u - u, c: l.c - c });
  }
  return { coste, usados, quedan, falta: resto > 1e-6 ? resto : 0, mezcla };
}

function editarFiscal(anio = new Date().getFullYear()) {
  const d = datosFiscales(anio);
  const h = hoja(`Datos fiscales de ${anio}`, `<form id="fFis" novalidate>
    <p class="nota" style="margin:0">Lo que GrowFolio no puede saber solo. Con esto calcula lo que pagarías en la renta de ${anio}, que se presenta entre abril y junio de ${anio + 1}.</p>
    <div class="form-grid">
      <label class="campo">Resultado de ventas no apuntadas (€)<input name="otras" inputmode="decimal" value="${val(d.otras)}" placeholder="0"><small>Ganancia o pérdida neta de lo que vendiste este año sin apuntarlo en GrowFolio. Las pérdidas, en negativo.</small></label>
      <label class="campo">Dividendos e intereses cobrados (€)<input name="rcm" inputmode="decimal" value="${val(d.rcm)}" placeholder="0"><small>En bruto, antes de retenciones. Incluye los intereses del efectivo remunerado de tus plataformas.</small></label>
      <label class="campo">Retenciones que ya te han hecho (€)<input name="retenido" inputmode="decimal" value="${val(d.retenido)}" placeholder="0"><small>Las españolas, enteras: se restan de lo que pagas. De lo que te retuvieron fuera, pon como mucho el 15 % de esos dividendos (lo que pasa de ahí no se recupera en la renta).</small></label>
      <label class="campo">Pérdidas de años anteriores sin compensar (€)<input name="pendientes" inputmode="decimal" value="${val(d.pendientes)}" placeholder="0"><small>Las que te queden de los últimos 4 años, en positivo (vienen en tu declaración anterior).</small></label>
    </div>
    <div class="error" id="errFis"></div>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri">Guardar</button></div></form>`);
  $('#fFis', h.el).onsubmit = async (ev) => {
    ev.preventDefault();
    const o = {};
    for (const k of ['otras', 'rcm', 'retenido', 'pendientes']) {
      const n = numero(ev.target[k].value);
      if (Number.isNaN(n)) { $('#errFis', h.el).textContent = 'Algún importe no es un número.'; return; }
      if (n != null) o[k] = n;
    }
    S.cartera.fiscal = { ...(S.cartera.fiscal || {}), [anio]: o };
    await guardarYPintar('Datos fiscales', h);
  };
}

/* las posiciones en pérdidas (más de 50 €) que se podrían vender para compensar; si GrowFolio ya propone vender una
   parte, solo cuenta lo que quedaría (resto: true) */
function restoEnPerdidas(M, planes) {
  const conAporte = new Set(aportacionesActivas().map(({ a }) => a.instrumento));
  return M.filas.filter((f) => !conAporte.has(f.inst.id)).map((f) => {
    const g = f.valor - f.coste, pl = (planes || []).find((x) => x.f && x.f.pos && x.f.pos.id === f.pos.id);
    if (!pl) return { f, g };
    const queda = f.uds ? Math.max(0, +pl.queda || 0) / f.uds : 0;
    return { f, g: g * queda, resto: true };
  }).filter((x) => x.g < -50);
}
/* lo que pagas (o te ahorras) con cada cosa que te recomienda la web, todo junto */
function htmlFiscalRecom(M, fa) {
  // 0.7g: en el modo de todos (estándar) GrowFolio no recomienda nada (CNMV): sin esta tabla ni lo que la anuncia
  if (esPublico()) return '';
  const anio = new Date().getFullYear(), filas = [];
  const planes = M.filas.map((f) => planVenta(f, M)).filter(Boolean);
  let gan = 0;
  for (const pl of planes) {
    gan += pl.ganancia;
    const antes = fiscalAnio(anio, gan - pl.ganancia).cuota, despues = fiscalAnio(anio, gan).cuota;
    filas.push({ q: `Vender ${oc(fmtNum(pl.uds, pl.accion && esEntero(pl.uds) ? 0 : 2))} ${esc(pl.f.inst.corto)}`, d: `${pl.ganancia < 0 ? `pérdida de ${eur(-pl.ganancia, 0)}` : `ganancia de ${eur(pl.ganancia, 0)}`} por FIFO (se venden primero las más antiguas)`, v: despues - antes, c: `en la renta de ${anio}, entre abril y junio de ${anio + 1}` });
    const top = pl.ideas[0];
    if (pl.aIdea > 0 && top) {
      const tasa = tasaRadar(top), fis = fiscalidadSede(origenRadar(top).sede), e = rentaEsperada(top, top.pot, 12);
      filas.push({ q: `Comprar ${eur(pl.aIdea, 0)} de ${esc(nombreRadar(top))}`, d: `${tasa ? `${fmtNum(tasa.tipo * 100, 1)} % de ${tasa.nombre}` : 'sin tasa al comprar'}; ${esc(fis.txt.replace(/^Dividendos: /, 'dividendos: '))}${e ? ` Si llega al objetivo en 12 meses, te quedas un ${pctS(e.netoP, 0)} neto.` : ''}`, v: tasa ? pl.aIdea * tasa.tipo : 0, c: tasa ? 'al comprar, suma a tu precio de compra' : '' });
    }
    if (pl.aColchon > 0.5) filas.push({ q: `Apartar ${eur(pl.aColchon, 0)} para tu colchón`, d: 'en efectivo remunerado (sus intereses tributan como los dividendos) o en un fondo monetario (no paga hasta que lo vendas)', v: 0, c: '' });
    if (pl.aNucleo > 0.5) filas.push({ q: `Meter ${eur(pl.aNucleo, 0)} ${nucleo(M).a.replace(/^a /, 'en ')}`, d: 'fondo de acumulación: no reparte, no paga hasta que vendas, y si lo traspasas a otro fondo, tampoco', v: 0, c: '' });
  }
  const perd = restoEnPerdidas(M, planes);
  if (new Date().getMonth() >= 6) for (const x of perd) {
    const ahorro = fiscalAnio(anio, gan).cuota - fiscalAnio(anio, gan + x.g).cuota;
    if (ahorro >= 15) filas.push({ q: `Vender ${x.resto ? 'el resto de ' : ''}${esc(x.f.inst.corto)} con pérdidas`, d: `${eurS(x.g, 0)}: resta de tus ganancias del año${x.f.inst.clase === 'Cripto' ? '; en cripto la norma no está clara: para ir sobre seguro, no la recompres en un año' : `; no ${/^Fondo/.test(x.f.inst.tipo || '') ? 'lo' : 'la'} recompres en ${(reglaRecompra(x.f.inst) || {}).plazo || 'dos meses'}`}`, v: -ahorro, c: `en la renta de ${anio}`, opc: true });
  }
  const ap = sum(aportacionesActivas(), ({ a }) => +a.importe || 0);
  if (ap > 0) filas.push({ q: `Aportar ${eur(ap, 0)} al mes`, d: 'a fondos de acumulación: no reparten dividendos, no tributan hasta que vendas', v: 0, c: '' });
  if (!filas.length) return '';
  const tot = sum(filas.filter((x) => !x.opc), (x) => x.v);
  return `<section style="margin-top:44px" aria-labelledby="hFisR"><div class="sec-cab"><h2 id="hFisR">Lo que cuesta lo que te recomienda GrowFolio</h2><span class="k">con lo que ya llevas en ${anio}</span></div>
    <div class="tabla-w"><table class="resp"><thead><tr><th>Recomendación</th><th>Qué pasa con Hacienda</th><th class="r">Impuesto</th></tr></thead><tbody>
      ${filas.map((x) => `<tr><td><b style="font-weight:600">${x.q}</b>${x.opc ? '<small>opcional</small>' : ''}</td><td class="txt">${x.d}${x.c ? `<small>${esc(x.c)}</small>` : ''}</td><td class="r ${x.v < 0 ? 'up' : ''}">${x.v ? (x.v < 0 ? `${eur(-x.v, 0)} ${L('menos', 'less')}<small>${L('te lo ahorras', 'you save it')}</small>` : eur(x.v, 0)) : '0\u00a0€'}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="nota">Con todo lo que GrowFolio recomienda hacer ya, la renta de ${anio} sube unos ${eur(tot, 0)}${filas.some((x) => x.opc) ? '; con lo opcional, menos' : ''}. Cada cifra sale de tu tramo del ahorro (${pctTramo(fa.marginal)} % ahora) y de lo que ya llevas declarado este año.</p></section>`;
}
/* una sección con su título pasa a ser un plegable (para las tablas largas) */
function plegarSec(html) {
  const m = /^\s*<section[^>]*><div class="sec-cab"><h2[^>]*>([\s\S]*?)<\/h2>(?:<span class="k">([\s\S]*?)<\/span>)?<\/div>([\s\S]*)<\/section>\s*$/.exec(html || '');
  if (!m) return html || '';
  return `<details class="num-sec" style="margin-top:12px"><summary><span><b>${m[1]}</b>${m[2] ? `<small>${m[2]}</small>` : ''}</span></summary><div class="num-cuerpo">${m[3]}</div></details>`;
}
/* dividendos: lo que retiene el país de la sede, lo que recuperas en la renta y lo que te queda */
function htmlFiscalDividendos(M) {
  // 0.3.9: la misma empresa en dos brókers suma las dos (antes contaba una sola)
  const t = tramoAhorro(), porInst = new Map();
  for (const f of M.filas) if (f.p && f.p.dividendo_pct && f.inst.tipo === 'Acción') { const x = porInst.get(f.inst.id); if (x) x.valor += f.valor; else porInst.set(f.inst.id, { f, valor: f.valor }); }
  const filas = [...porInst.values()].map(({ f, valor }) => {
    const bruto = (valor * f.p.dividendo_pct) / 100, fis = fiscalidadSede(f.inst.pais, f.inst.tipo);
    const pierde = bruto * (fis.pierde || 0) / 100;
    return { f, bruto, fis, ret: bruto * ((fis.ret || 0) / 100), pierde, neto: bruto * (1 - t) - pierde };
  });
  if (!filas.length) return '';
  return `<section style="margin-top:44px" aria-labelledby="hFisD"><div class="sec-cab"><h2 id="hFisD">Tus dividendos</h2><span class="k">al año, con el precio de hoy</span></div>
    <div class="tabla-w"><table class="resp"><thead><tr><th>Posición</th><th class="r">Bruto</th><th class="r">Retención en origen</th><th class="r">Pierdes</th><th class="r">Te queda</th></tr></thead><tbody>
      ${filas.map((x) => `<tr><td><b style="font-weight:600">${esc(x.f.inst.corto)}</b><small>sede en ${esc(PAISES[x.f.inst.pais] || x.f.inst.pais || '—')}, ${pct(x.f.p.dividendo_pct, 1)} al año</small></td><td class="r" data-l="Bruto">${eur(x.bruto, 0)}</td><td class="r" data-l="Retención en origen">${x.fis.ret == null ? '—' : `${eur(x.ret, 0)}<small>${fmtNum(x.fis.ret, 1)} %</small>`}</td><td class="r ${x.pierde > 0 ? 'down' : ''}" data-l="Pierdes">${x.pierde > 0 ? eur(x.pierde, 0) : '0 €'}</td><td class="r" data-l="Te queda">${eur(x.neto, 0)}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="nota">«Te queda» es lo que cobras después de pagar tu tramo del ahorro (${pctTramo(t)} %). Lo que retiene el país de la sede se descuenta en la renta con la deducción por doble imposición hasta el tipo del convenio (casi siempre el 15 %); «Pierdes» es lo que pasa de ahí, que solo se recupera reclamándolo a ese país. Tus fondos de acumulación no reparten y no pagan hasta que vendas.</p></section>`;
}
function htmlImpuestos(M) {
  const anio = new Date().getFullYear();
  const fa = fiscalAnio(anio);
  // lo que cuesta lo que recomienda GrowFolio (vacío en el modo de todos o si no hay nada): solo se anuncia si sale
  const recom = htmlFiscalRecom(M, fa);
  const nombreI = (id) => esc((S.inst[id] && S.inst[id].corto) || id);
  // si vendieras cada posición hoy (FIFO sobre todo lo que tienes = valor menos coste total)
  const latentes = M.filas.map((f) => {
    const g = f.valor - f.coste - (f.pos.plataforma === 'Trade Republic' ? 1 : 0);
    return { f, g, imp: g > 0 ? impuestoDeVenta(g, anio).impuesto : 0 };
  }).sort((a, b) => b.g - a.g);
  const totLat = sum(latentes, (x) => x.g);
  const todo = impuestoDeVenta(totLat, anio).impuesto;
  const perdidas = latentes.filter((x) => x.g < 0);
  const fondos = M.filas.filter((f) => /^Fondo/.test(f.inst.tipo || ''));
  const tr = enElExtranjero(M);
  const cripto = sum(M.filas.filter((f) => f.inst.clase === 'Cripto'), (f) => f.valor);
  const divs = M.filas.filter((f) => f.p && f.p.dividendo_pct);
  return `
    <div class="sec-cab"><h2>Renta de ${anio}</h2><span class="k">se presenta entre abril y junio de ${anio + 1}</span><div class="der"><button class="btn peq" data-accion="fiscal">${ICONOS.lapiz}Datos fiscales de ${anio}</button></div></div>
    ${!fa.ventas.length && !fa.otras && !fa.rcm && !fa.retenido ? `<div class="fis-vacio"><p><b>${M.dividendos >= 1 ? `Por ahora no has apuntado nada para la renta de ${anio}.` : `Por ahora no pagas nada en la renta de ${anio}.`}</b> ${M.dividendos >= 1 ? (() => { const da = anio === new Date().getFullYear() ? dividendosAnio(M, anio) : null; return `${da && da.bruto >= 1 ? `Por lo que han pagado tus acciones, este año habrás cobrado unos ${eur(da.bruto, 0)} brutos en dividendos (${esc(yLista([...new Set(da.de.map((x) => x.n))]))}), que` : `Tus posiciones reparten unos ${eur(M.dividendos, 0)} brutos al año en dividendos, que`} tributan (desde un ${pctTramo(tramosAhorro()[0][1])} %) aunque no vendas: mira el informe de tu bróker y apunta lo cobrado en «Datos fiscales» para que salga en la cuenta.`; })() : 'Este año no has apuntado ventas ni dividendos.'} Cuando vendas algo, apúntalo en Inicio con «Apuntar compra o venta» y aquí verás lo que te toca.${M.dividendos >= 1 ? '' : ' Si has cobrado dividendos o intereses, ponlos en «Datos fiscales».'}</p>${recom ? '<p class="k">Más abajo, lo que pagarías si sigues lo que te recomienda GrowFolio.</p>' : ''}</div>` : `<div class="resumen-fila">
      <div><span class="k">Ventas del año</span><span class="v ${cls(fa.gp)}">${eurS(fa.gp, 0)}</span><small class="k">${fa.ventas.length} en GrowFolio${fa.otras ? `, ${eurS(fa.otras, 0)} fuera` : ''}</small></div>
      <div><span class="k">Dividendos e intereses</span><span class="v">${eur(fa.rcm, 0)}</span><small class="k">${fa.rcm ? 'los que has apuntado' : (() => { const da = anio === new Date().getFullYear() ? dividendosAnio(M, anio) : null; return da && da.bruto >= 1 ? `este año, unos ${eur(da.bruto, 0)} brutos por lo que han pagado tus acciones (${esc(yLista([...new Set(da.de.map((x) => x.n))]))}): mira el informe de tu bróker y apúntalos en Datos fiscales` : 'apúntalos en Datos fiscales'; })()}</small></div>
      <div><span class="k">Base del ahorro</span><span class="v">${eur(fa.base, 0)}</span><small class="k">tramo del ${pctTramo(fa.marginal)} %</small></div>
      <div><span class="k">Cuota estimada</span><span class="v">${eur(fa.cuota, 0)}</span><small class="k">${fa.retenido ? `menos ${eur(fa.retenido, 0)} ya retenidos: ${eurS(fa.cuota - fa.retenido, 0)}` : 'antes de restar retenciones'}</small></div>
      ${fa.sobra > 0 ? `<div><span class="k">Pérdidas para años siguientes</span><span class="v down">${eur(fa.sobra, 0)}</span><small class="k">hasta ${anio + 4}</small></div>` : ''}
    </div>`}
    ${fa.ventas.length ? `<div class="tabla-w"><table class="resp"><thead><tr><th>Venta</th><th class="r">Unidades</th><th class="r">Valor de venta</th><th class="r" title="Hacienda cuenta que vendes primero las que compraste antes (FIFO)">Lo que te costó</th><th class="r">Resultado</th></tr></thead><tbody>${fa.ventas.map((m) => `<tr><td><b style="font-weight:600">${nombreI(m.instrumento)}</b><small>${fechaLarga(m.fecha)}, ${esc(m.plataforma || '')}</small></td><td class="r">${oc(fmtNum(m.uds, 4))}</td><td class="r">${eur(m.importe || 0)}<small>gastos restados</small></td><td class="r">${eur(m.coste_vendido || 0)}<small>${m.fifo && m.fifo.length ? `${m.fifo.length} ${m.fifo.length === 1 ? 'lote' : 'lotes'}${m.mezcla ? ', con el de partida' : ''}` : ''}</small></td><td class="r ${cls(m.resultado)}">${eurS(m.resultado || 0)}</td></tr>`).join('')}</tbody></table></div>` : ''}

    ${recom}
    ${plegarSec(htmlFiscalDividendos(M))}
    <div style="margin-top:28px">
      <details class="num-sec"><summary><span><b>Si vendieras hoy</b><small>vender todo costaría unos ${eur(todo, 0)} en la renta de ${anio}; posición a posición</small></span></summary><div class="num-cuerpo">
        <div class="tabla-w"><table class="resp"><thead><tr><th>Posición</th><th class="r">Ganancia o pérdida</th><th class="r">Impuesto si vendes todo</th><th class="r">Tipo</th></tr></thead><tbody>
          ${latentes.map((x) => `<tr><td><b style="font-weight:600">${esc(x.f.inst.corto || x.f.inst.nombre)}</b><small>${esc(x.f.pos.plataforma || '')}${/^Fondo/.test(x.f.inst.tipo || '') ? ', se puede traspasar sin pagar' : ''}</small></td><td class="r ${cls(x.g)}">${eurS(x.g, 0)}</td><td class="r">${x.imp > 0 ? eur(x.imp, 0) : '—'}</td><td class="r">${x.g > 0 ? pct((x.imp / x.g) * 100, 1) : x.g < 0 ? '<span class="k">resta</span>' : '—'}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="nota">Vender todo hoy costaría unos ${eur(todo, 0)} en la renta de ${anio}. Las pérdidas restan de las ganancias del mismo año; por eso el impuesto de cada fila depende de lo que ya llevas. ${perdidas.length ? `Ahora tienes pérdidas sin vender en ${yLista(perdidas.map((x) => esc(x.f.inst.corto)))}: si algún día las vendes, restan de las ganancias de ese año.` : ''}</p>
      </div></details>
    </div>
    ${htmlFiscalGuia(M, fa, { tr, cripto, fondos, divs })}`;
}
/* Fiscalidad > En tu comunidad: la escala que te toca, lo que se paga si tus padres te dan dinero y las noticias de
   tu comunidad que tocan tu bolsillo (impuestos, ayudas, vivienda). Sin comunidad, un selector para ponerla. */
const RE_DINERO_CCAA = /impuest|IRPF|tribut|deducci|bonific|rebaja fiscal|rebaja de impuestos|ayudas?\b|subvenci|cheque|\bbono\b|hipotec|avales?\b|sucesiones|donaci|declaraci[oó]n de la renta/i;
const RE_FUERA_CCAA = /acampada|manifestaci|protesta|despacho|pol[eé]mic|oposici[oó]n|\bPSOE\b|\bPP\b|\bVox\b|Podemos|Sumar|juicio|imputad|tribunal|elecciones|encuesta|Asamblea/i;
function noticiasComunidad(c = comunidadUsuario(), max = 3, dias = 10) {
  const R = (S.precios && S.precios.noticias && S.precios.noticias._region) || {}, lim = Date.now() - dias * 864e5;
  return (R[c] || []).filter((n) => n.t && n.u && (!n.d || new Date(n.d).getTime() >= lim) && RE_DINERO_CCAA.test(n.t) && !RE_FUERA_CCAA.test(n.t)).slice(0, max);
}
function htmlFiscalComunidad() {
  const c = comunidadUsuario();
  if (!c) return `<section class="fis-ccaa sin" style="margin-top:44px" aria-labelledby="hCcaa"><div class="sec-cab"><h2 id="hCcaa">En tu comunidad</h2></div>
    <p>Pon dónde vives y verás lo que cambia para ti: en País Vasco y Navarra la escala del ahorro es otra, y lo que pagas si tus padres te ayudan con dinero (la entrada de un piso, por ejemplo) va de casi nada a miles de euros según la comunidad.</p>
    <label class="campo fis-ccaa-sel">Tu comunidad<select data-ccaa>${opcionesComunidad('')}</select></label></section>`;
  const d = DONACIONES[c], ns = noticiasComunidad(c, 3);
  return `<section class="fis-ccaa" style="margin-top:44px" aria-labelledby="hCcaa"><div class="sec-cab"><h2 id="hCcaa">${L('En', 'In')} ${esc(conArticulo(c))}</h2><button type="button" class="enlace" data-accion="ccaa-cambiar">Cambiar</button></div>
    <div class="fis-como">
      <div class="fis-c"><b>Tu escala del ahorro</b><small>ventas, dividendos e intereses</small><p>${TRAMOS_FORAL[c] ? L(`Régimen foral: ${textoTramos(c)}. Es la que usa GrowFolio en tus cálculos.`, `Foral regime: ${textoTramos(c, true)}. GrowFolio uses it in your figures.`) : 'La misma en toda España (la de arriba): la parte autonómica del ahorro no cambia de una comunidad a otra.'}</p></div>
      ${d ? `<div class="fis-c"><b>Si tus padres te dan dinero</b><small>donación de padres a hijos</small><p>${esc(L(d[0], (DONACIONES_EN[c] || [])[0] || d[0]))} ${esc(L(d[1], (DONACIONES_EN[c] || [])[1] || d[1]))}</p><small class="fis-norma" data-no-trad>${esc(d[2])}</small></div>` : `<div class="fis-c"><b>Si tus padres te dan dinero</b><small>donación de padres a hijos</small><p>${L(`En ${esc(conArticulo(c))} se aplica la norma estatal del impuesto de donaciones, con sus bonificaciones para residentes. Antes de una donación grande, mira la cifra exacta en la Agencia Tributaria.`, `In ${esc(conArticulo(c))} the national gift tax rules apply, with their allowances for residents. Before a large gift, check the exact figure with the Spanish Tax Agency.`)}</p></div>`}
      <div class="fis-c"><b>Cómo hacerlo bien</b><small>para no perder la rebaja</small><p>Por transferencia (que se vea de dónde sale el dinero), con escritura ante notario cuando la comunidad la pide, y presentando el modelo 651 (o el de tu comunidad) en el mes siguiente. Las donaciones del mismo padre en tres años se suman.</p></div>
    </div>
    ${ns.length ? `<h3 class="fis-ccaa-not">${L(`Noticias de ${esc(conArticulo(c))} que tocan tu dinero`, `News from ${esc(conArticulo(c))} that affects your money`)}</h3>${htmlNoticias(ns, false, 3)}` : ''}
  </section>`;
}
async function ponerComunidad(c) {
  if (!S.cartera) return;
  S.cartera.perfil = { ...(S.cartera.perfil || {}), comunidad: c || null, actualizado: new Date().toISOString() };
  AS.foto = null;
  await guardarYPintar('Tu comunidad');
  if (c) toast(`Apuntado: ${nombreComunidad(c)}. Hacienda y GrowIA ya cuentan con ello.`, 3500);
}
function cambiarComunidad() {
  const h = hoja('Tu comunidad', `<form class="pf-form"><label class="campo">Dónde vives<select name="c">${opcionesComunidad(comunidadUsuario())}</select><small>Para tus impuestos y las noticias de tu comunidad que tocan tu dinero. No usa tu ubicación.</small></label>
    <div class="fila-btns"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn pri">Guardar</button></div></form>`);
  $('form', h.el).onsubmit = async (e) => { e.preventDefault(); h.cerrar(true); await ponerComunidad(e.target.c.value); };
}
document.addEventListener('change', (e) => { const sel = e.target.closest('[data-ccaa]'); if (sel && sel.value) ponerComunidad(sel.value); });
/* la parte de consulta de Fiscalidad: tramos, cómo tributa cada cosa que tienes, la regla de los dos
   meses en tus operaciones, el calendario y las formas legales de pagar menos */
function htmlFiscalGuia(M, fa, x) {
  const anio = fa.anio, hoy = hoyIso();
  // tramos con tu base marcada
  let desde = 0;
  const TA = tramosAhorro(), nT = TA.length;
  const tramos = TA.map(([h, t0]) => { const r = { desde, hasta: h, t: pctTramo(t0), tuyo: fa.base > desde && (fa.base <= h || h === Infinity) }; desde = h; return r; });
  if (!fa.base) tramos[0].tuyo = true;
  // cómo tributa lo que tienes
  const tiene = (fn) => M.filas.filter(fn);
  const accES = tiene((f) => f.inst.tipo === 'Acción' && f.inst.pais === 'ES'), accEx = tiene((f) => f.inst.tipo === 'Acción' && f.inst.pais !== 'ES');
  const etc = tiene((f) => /ETC|ETF/.test(f.inst.tipo || '')), cri = tiene((f) => f.inst.clase === 'Cripto');
  const lista = (v) => yLista(v.map((f) => esc(f.inst.corto)));
  const como = [
    x.fondos.length && ['Fondos de inversión', lista(x.fondos), 'Mientras no los vendas no pagas nada. Si pasas el dinero de un fondo a otro (traspaso) tampoco: el impuesto se aplaza hasta que lo saques de verdad. Al reembolsar te retienen el 19 % de la ganancia.'],
    accES.length && ['Acciones españolas', lista(accES), 'Pagas por la ganancia al vender (FIFO: primero salen las más antiguas). Los dividendos llegan con el 19 % retenido, que se resta en la renta.'],
    accEx.length && ['Acciones extranjeras', lista(accEx), 'Igual al vender. Los dividendos pueden traer la retención del país de la sede: en la renta recuperas hasta el 15 % con la deducción por doble imposición; lo que pase de ahí se pierde salvo que lo reclames allí.'],
    etc.length && ['ETF y ETC (oro)', lista(etc), 'Como una acción: cada venta paga por la ganancia y no hay traspasos sin impuestos.'],
    cri.length && ['Criptomonedas', lista(cri), 'Paga al venderla a euros y también al cambiarla por otra cripto. Por encima de 50.000 € fuera de España hay que presentar el modelo 721.'],
    ['Intereses del efectivo', 'Trade Republic y similares', 'Rendimiento del capital: tributa en la base del ahorro como los dividendos.'],
  ].filter(Boolean);
  // regla de los dos meses en tus operaciones
  const movs = S.cartera.movimientos || [];
  const dosMeses = [];
  for (const v of movs.filter((m) => m.tipo === 'venta' && m.resultado < 0)) {
    const r = reglaRecompra(S.inst[v.instrumento]);
    if (!r || !r.meses) continue;
    const ap = perdidaAplazada(v), libre = libreRecompra(S.inst[v.instrumento], v.fecha);
    if (ap) dosMeses.push({ n: 'warn', t: ap.parte >= 0.999 ? `La pérdida de ${nombreInst(v.instrumento)} (${eurS(v.resultado, 0)}) no cuenta todavía` : `De la pérdida de ${nombreInst(v.instrumento)} (${eurS(v.resultado, 0)}), ${eurS(ap.importe, 0)} no cuentan todavía`, d: `${ap.aporte ? `Tu aportación automática del ${fechaLarga(ap.fecha)}` : `Compraste el ${fechaLarga(ap.fecha)}`}, a menos de ${r.plazo} de la venta${ap.parte < 0.999 ? `, un ${fmtNum(ap.parte * 100, 0)} % de lo que vendiste` : ''}. Esa parte contará cuando vendas lo recomprado; en lo que te calcula GrowFolio ya no resta.` });
    else if (libre >= hoy) dosMeses.push({ n: 'info', t: `Si recompras ${nombreInst(v.instrumento)} antes del ${fechaLarga(libre)}, esa pérdida no resta este año`, d: `Lo vendiste con ${eurS(v.resultado, 0)} el ${fechaLarga(v.fecha)}; la regla de la recompra (${r.plazo}) la deja para cuando vendas lo recomprado.` });
  }
  // calendario
  const cal = [
    [`${anio}-12-31`, `31 dic ${anio}`, L('Último día del año para vender con pérdidas y que resten en la renta de ' + anio + ' (ese día la bolsa de Madrid cierra a las 14:00 y en los fondos cuenta la hora de corte: mejor unos días antes). Los traspasos entre fondos no cuentan.', `Last day of the year to sell at a loss and have it count in your ${anio} tax return (that day the Madrid exchange closes at 14:00 and funds have a cut-off time: better a few days before). Transfers between funds don't count.`)],
    [`${anio + 1}-02-15`, `ene-feb ${anio + 1}`, 'Los brókeres publican el informe fiscal del año en su app o su web (en Trade Republic: Perfil, Impuestos).'],
    [`${anio + 1}-03-31`, `31 mar ${anio + 1}`, `Modelos 720 (valores fuera, por un lado, y cuentas fuera, por otro) y 721 (cripto fuera): cada bloque, solo si pasa de 50.000 €; los años siguientes, si sube más de 20.000 €. Tienes ${eur(x.tr, 0)} en brókeres de fuera de España y ${eur(x.cripto, 0)} en cripto.`],
    [`${anio + 1}-04-08`, `abril ${anio + 1}`, `Empieza la renta de ${anio}: revisa en el borrador ventas, dividendos e intereses.`],
    [`${anio + 1}-06-30`, `30 jun ${anio + 1}`, 'Último día para presentarla (si sale a pagar y la domicilias, unos días antes).'],
  ].filter(([d]) => d >= hoy);
  // formas legales de pagar menos, según lo que tienes
  const latentes = M.filas.map((f) => ({ f, g: f.valor - f.coste }));
  const perd = latentes.filter((y) => y.g < -50), gan = latentes.filter((y) => y.g > 50);
  const trucos = [
    x.fondos.length && ['Usa traspasos, no ventas', 'Para cambiar de un fondo a otro, traspasa: no pagas nada hasta el día que saques el dinero.'],
    perd.length && gan.length && ['Junta ganancias y pérdidas en el mismo año', `Tienes pérdidas sin vender en ${yLista(perd.map((y) => y.f.inst.corto))}. Las pérdidas de lo que vendes restan de las ganancias del mismo año.`],
    ['Vende poco a poco si la ganancia es grande', `Los primeros ${fmtNum(TA[0][0], 0)} € de la base del ahorro pagan el ${pctTramo(TA[0][1])} %; de ahí a ${fmtNum(TA[1][0], 0)} €, el ${pctTramo(TA[1][1])} %. Repartir una venta grande entre dos años puede dejarla en el tramo bajo.`],
    ['Acumulación mejor que reparto', 'Un fondo o ETF de acumulación reinvierte los dividendos sin que pagues por ellos cada año; uno de reparto te los da y tributan.'],
    fa.sobra > 0 && ['Aprovecha tus pérdidas pendientes', `Te quedan ${eur(fa.sobra, 0)} para compensar en los próximos 4 años.`],
  ].filter(Boolean);
  return `
    <section style="margin-top:44px" aria-labelledby="hTram"><div class="sec-cab"><h2 id="hTram">Cuánto pagas: los tramos del ahorro</h2><span class="k">ganancias de ventas, dividendos e intereses de ${anio}</span></div>
      <div class="tramos2${nT > 6 ? ' muchos' : ''}">${tramos.map((t, i) => `<div class="tr2${t.tuyo ? ' tuyo' : ''}" style="--h:${(32 + (i * 68) / Math.max(1, nT - 1)).toFixed(0)}%"><i></i><b>${t.t} %</b><small>${t.hasta === Infinity ? `más de ${fmtNum(t.desde, 0)}\u00a0€` : t.desde ? `${fmtNum(t.desde, 0)} a ${fmtNum(t.hasta, 0)}\u00a0€` : `hasta ${fmtNum(t.hasta, 0)}\u00a0€`}</small>${t.tuyo ? '<span>tú</span>' : ''}</div>`).join('')}</div>
      <p class="nota">${TRAMOS_FORAL[comunidadUsuario()] ? `<span data-no-trad>${L(`Es la escala foral de ${esc(nombreComunidad(comunidadUsuario()))}, distinta de la del resto de España.`, `This is the foral scale of ${esc(conArticulo(comunidadUsuario()))}, different from the rest of Spain.`)}</span> ` : ''}Cada tramo paga solo lo que cae dentro de él. Tu base del ahorro de ${anio} va por ${eur(fa.base, 0)}: ${eur(fa.cuota, 0)} de cuota. Las pérdidas de ventas se compensan con las ganancias del año${comunidadUsuario() === 'paisvasco' ? ' (en el País Vasco no se cruzan con los dividendos)' : ' y, si sobran, con hasta un 25 % de los dividendos e intereses'}; lo que quede, en los 4 años siguientes.</p>
    </section>
    ${htmlFiscalComunidad()}
    <section style="margin-top:44px" aria-labelledby="hComo"><div class="sec-cab"><h2 id="hComo">Cómo tributa lo que tienes</h2></div>
      <div class="fis-como">${como.map(([t, q, d]) => `<div class="fis-c"><b>${t}</b><small>${q}</small><p>${d}</p></div>`).join('')}</div>
    </section>
    ${dosMeses.length ? `<section style="margin-top:44px" aria-labelledby="hDos"><div class="sec-cab"><h2 id="hDos">Ventas con pérdidas y recompras</h2></div><ul class="lista">${dosMeses.map((a) => `<li class="${a.n}">${a.n === 'warn' ? ICONOS.alerta : ICONOS.info}<div><b>${esc(a.t)}</b><span>${esc(a.d)}</span></div></li>`).join('')}</ul></section>` : ''}
    <div class="dos" style="margin-top:44px">
      <section aria-labelledby="hCalF"><div class="sec-cab"><h2 id="hCalF">Calendario fiscal</h2></div>
        <ul class="lista agenda">${cal.map(([d, c, t]) => `<li><div class="dia fis-dia"><b>${esc(c.split(' ')[0])}</b><span class="k">${esc(c.split(' ').slice(1).join(' '))}</span></div><div><span>${esc(t)}</span></div><span></span></li>`).join('')}</ul></section>
      <aside class="lateral" aria-labelledby="hTruc"><div class="sec-cab"><h2 id="hTruc">Para pagar menos, sin trampas</h2></div>
        <ul class="lista">${trucos.map(([t, d]) => `<li class="info">${ICONOS.info}<div><b>${esc(t)}</b><span>${esc(d)}</span></div></li>`).join('')}</ul></aside>
    </div>
    <p class="nota">Cálculo orientativo con la normativa de ${anio}: la cifra exacta sale en el borrador de la renta y en los informes fiscales de tus brókeres.</p>`;
}
function vistaFiscal(M) {
  const t = S.fisTab === 'renta' ? 'renta' : 'tu';
  return `<div class="vista-cab"><h1>Hacienda</h1><p>${esPublico() ? 'Lo que pagarás en la renta, cómo tributa cada cosa y cómo hacer la declaración.' : 'Lo que pagarás en la renta, lo que cuesta cada recomendación, cómo tributa cada cosa y cómo hacer la declaración.'}</p></div>
  <div class="subvistas dos-op" id="fisTabs" role="group" aria-label="Qué ver"><button data-fis="tu" aria-pressed="${t === 'tu'}">${ICONOS.calc}Lo que pagas</button><button data-fis="renta" aria-pressed="${t === 'renta'}">${ICONOS.fiscal}Guía de la renta</button></div>
  ${t === 'renta' ? htmlGuiaRenta(M) : htmlImpuestos(M)}`;
}

