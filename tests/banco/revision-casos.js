// Mejorar la IA, parte 4 (19 nov 2026) · los días del banco de la revisión diaria del fundador (tests/banco/revision.json):
// cada uno cambia la cartera fija del banco (cartera-fundador.js) para que ese día pase algo. Se ejecuta dentro de la
// página (page.evaluate), después de carteraFundador, con el nombre del caso. Devuelve lo que ha cambiado, para el agente
// que puntúa.
export function casoRevision(caso) {
  const hoy = hoyIso(), I = S.precios.instrumentos, ahora = new Date().toISOString();
  const mover = (id, pct) => { const x = I[id]; if (!x) return; const p0 = x.precio; I[id] = { ...x, cierre_anterior: p0, precio: p0 * (1 + pct / 100), precio_local: x.precio_local ? x.precio_local * (1 + pct / 100) : x.precio_local, variacion_dia: pct, fecha: hoy }; };
  const hecho = { caso };
  if (caso === 'caida') {
    // un día de pánico: las bolsas caen un 6–7 %, el bitcoin un 9 %, el oro sube un 2 %
    for (const id of ['repsol', 'bat', 'iag']) mover(id, -7);
    mover('btc', -9); mover('phau', 2);
    for (const [k, m] of Object.entries(S.precios.mercados || {})) if (/IBEX|STOXX|GDAXI|GSPC|NDX|IXIC|N225/i.test(k)) S.precios.mercados[k] = { ...m, cierre_anterior: m.precio, precio: m.precio * 0.935, variacion_dia: -6.5, fecha: hoy };
    hecho.cambio = 'Repsol, BAT e IAG −7 % hoy, Bitcoin −9 %, oro +2 %, índices −6,5 % (los fondos aún sin el precio de hoy)';
  } else if (caso === 'resultados') {
    mover('repsol', -9);
    S.escaneo = S.escaneo || {};
    S.escaneo.lectura = { ...(S.escaneo.lectura || {}), 'REP.MC': { imp: 'negativo', rel: 5, d: ahora, txt: 'Repsol presentó hoy sus resultados del tercer trimestre: el beneficio neto cae un 38 % por los márgenes del refino y la compañía rebaja un 20 % el dividendo previsto para 2027. La acción cae un 9 % en la sesión.', cat: 'resultados' } };
    hecho.cambio = 'Repsol presenta resultados hoy: beneficio −38 %, dividendo de 2027 −20 %, la acción −9 %';
  } else if (caso === 'atascado') {
    let d = hoy; for (let i = 0; i < 8; i++) d = habilAntes(d);
    window.__viejoNB = d;
    if (I['nb-short']) I['nb-short'] = { ...I['nb-short'], fecha: d };
    hecho.cambio = `el fondo de Neuberger con el valor liquidativo del ${d} (8 sesiones sin precio)`;
  } else if (caso === 'aplazada') {
    // además de la venta de septiembre (650 € aplazados), otra del S&P 500 hace 10 días con 490 € de pérdida
    (S.cartera.movimientos = S.cartera.movimientos || []).push({ id: 'mb3', fecha: sumarDias(hoy, -10), tipo: 'venta', instrumento: 'ishares-us', plataforma: 'MyInvestor', uds: 50, precio: 12, importe: 600, coste_vendido: 1090, resultado: -490 });
    hecho.cambio = 'otra venta del S&P 500 hace 10 días con 490 € de pérdida (también aplazada por la aportación automática)';
  } else if (caso === 'dividendo') {
    // el corte del dividendo de IAG fue ayer: la acción baja más o menos lo que paga; el cobro, en unos días
    const ayer = habilAntes(hoy);
    if (I.iag) I.iag = { ...I.iag, ex_dividendo: ayer, dividendos_pagos: [...(I.iag.dividendos_pagos || []), [ayer, 0.05]] };
    mover('iag', -1.1);
    hecho.cambio = `IAG cortó ayer (${ayer}) un dividendo de 0,05 € por acción (unos 33 € brutos y 26 € netos con sus 652,53) y hoy cae un 1,1 %`;
  } else if (caso === 'ayer') {
    // la de ayer, como la deja la app: el día normal del banco hecho hace un día (la pone la prueba en S.iaPropio)
    hecho.cambio = 'nada nuevo desde la revisión de ayer (va en los datos)';
  }
  S.M = calcular();
  return hecho;
}
