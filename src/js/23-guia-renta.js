/* =====================================================================
   Guía de la declaración de la renta: los pasos, en qué casilla va cada cosa y lo tuyo de ese año.
   De enero a junio es la del año pasado (la que toca presentar); después, la del año en curso.
   ===================================================================== */
function htmlGuiaRenta(M) {
  const hoy = new Date(), anio = hoy.getMonth() < 6 ? hoy.getFullYear() - 1 : hoy.getFullYear(), pres = anio + 1;
  const fa = fiscalAnio(anio), d = datosFiscales(anio);
  const plats = new Set([...M.filas.map((f) => f.pos.plataforma), ...M.efectivo.map((e) => e.plataforma)].filter(Boolean));
  const ventas = (S.cartera.movimientos || []).filter((m) => m.tipo === 'venta' && String(m.fecha).startsWith(String(anio)));
  const grupo = (m) => { const i = S.inst[m.instrumento] || {}; return i.clase === 'Cripto' ? 'cripto' : /^Fondo/.test(i.tipo || '') ? 'fondos' : 'acciones'; };
  const lineaV = (m) => `<li><span>${esc(nombreInst(m.instrumento))}</span><span class="k">${fechaCorta(m.fecha)}</span><b class="${cls(m.resultado)}">${eurS(m.resultado || 0, 0)}</b></li>`;
  const deGrupo = (g) => ventas.filter((m) => grupo(m) === g);
  const tuyas = (g, vacio) => { const v = deGrupo(g); return v.length ? `<ul class="rg-ventas">${v.map(lineaV).join('')}</ul>` : `<p class="k">${vacio}</p>`; };
  const extranjeras = M.filas.some((f) => f.inst.tipo === 'Acción' && f.inst.pais && f.inst.pais !== 'ES');
  const informes = [
    plats.has('Trade Republic') && ['Trade Republic', 'En la app: Perfil, Impuestos, el informe fiscal del año. Si tu cuenta tiene IBAN español, sus datos llegan al borrador, aunque a veces mal colocados: las ventas pueden aparecer como rendimientos del capital (casilla 0031) en vez de ganancias (0328).'],
    plats.has('MyInvestor') && ['MyInvestor', 'Es español: retiene y se lo comunica a Hacienda, así que sus fondos y su cuenta suelen venir bien en el borrador. Descarga igualmente su información fiscal del año para comprobarlo.'],
    plats.has('Bitvavo') && ['Bitvavo', 'Sus datos todavía no llegan a tu borrador (con la norma europea DAC8, los exchanges ya informan a Hacienda desde 2026): descarga el informe o el historial de operaciones del año y mete tú cada venta.'],
  ].filter(Boolean);
  const casillas = [
    ['Intereses de cuentas', '0027', 'Lo que te ha pagado el efectivo (Trade Republic y similares), en bruto.'],
    ['Dividendos', '0029', 'En bruto, antes de retenciones. La retención española sale aparte y se resta de lo que pagas.'],
    ['Ventas de acciones y ETF', '0328', 'Una línea por cada venta: fechas, lo que pagaste y lo que cobraste (con comisiones).'],
    ['Reembolsos de fondos', 'fondos de inversión', 'Solo cuando sacas el dinero. Los traspasos entre fondos no se declaran.'],
    ['Criptomonedas', 'monedas virtuales', 'Cada venta a euros y cada cambio de una cripto por otra, con su valor de compra y de venta.'],
    extranjeras && ['Doble imposición internacional', '0588', 'Lo que te retuvieron fuera por dividendos, hasta el 15 %: así no pagas dos veces.'],
    ['Pérdidas de años anteriores', '1634', 'Las de los 4 últimos años que te queden por compensar.'],
  ].filter(Boolean);
  const paso = (n, t, cuando, cuerpo) => `<li class="rg-paso"><span class="rg-n">${n}</span><div><div class="rg-cab"><b>${t}</b>${cuando ? `<span class="rg-cuando">${cuando}</span>` : ''}</div>${cuerpo}</div></li>`;
  let n = 0;
  return `<div class="rg">
    <p class="rg-intro">Renta de <b>${anio}</b>: se presenta desde primeros de abril hasta el 30 de junio de ${pres} (las fechas exactas las publica Hacienda). Con lo que GrowFolio sabe, sale una cuota de <b>${eur(fa.cuota, 0)}</b> en la base del ahorro${fa.retenido ? `, menos ${eur(fa.retenido, 0)} que ya te retuvieron` : ''}.${!d.otras && !d.rcm ? ' <button class="enlace acento" data-accion="fiscal">Apunta tus datos fiscales</button> para que cuadre.' : ''}</p>
    <ol class="rg-pasos">
      ${anio === hoy.getFullYear() ? paso(++n, 'Cierra el año antes del 31 de diciembre', `31 dic ${anio}`, `<p>${esPublico() ? 'Si este año tienes ganancias, las pérdidas de lo que vendas antes del 31 de diciembre las restan.' : 'Si este año tienes ganancias, mira si te compensa vender algo con pérdidas para restarlas: el Paso a paso te lo propone con cifras.'} Ojo con la recompra: si compras lo mismo en los dos meses antes o después de vender (acciones y ETF de bolsas de la UE) o en el año antes o después (fondos, y acciones y ETF de fuera de la UE: EEUU, Reino Unido, Suiza…), esa pérdida no resta, o solo en la parte que no recompres. En cripto la regla de los dos meses no se aplica, aunque hay quien defiende la de un año.</p>`) : ''}
      ${paso(++n, 'Descarga los informes fiscales de tus brókeres', `enero-marzo ${pres}`, informes.length ? `<ul class="rg-lista">${informes.map(([t, x]) => `<li><b>${t}</b><span>${x}</span></li>`).join('')}</ul>` : '<p>Cada bróker publica en enero o febrero un informe con tus ventas, dividendos e intereses del año.</p>')}
      ${paso(++n, 'Modelos 720 y 721, solo si te tocan', `hasta el 31 mar ${pres}`, `<p>Son informativos (no se paga nada) y solo si a 31 de diciembre tenías más de 50.000 € fuera de España: el 720 para valores y cuentas, el 721 para cripto en plataformas extranjeras. Si no llegas, no tienes que hacer nada.</p>`)}
      ${paso(++n, 'Entra en Renta Web y abre el borrador', `desde primeros de abril de ${pres}`, `<p>En la web de la Agencia Tributaria o en su app, con Cl@ve, certificado digital o el número de referencia (te lo dan con tu DNI y la casilla 0505 de la renta anterior). El borrador trae lo que tus bancos y brókeres españoles han comunicado: no lo confirmes sin revisarlo.</p>`)}
      ${paso(++n, 'Revisa cada apartado con lo tuyo', '', `<div class="rg-casillas">${casillas.map(([t, c, x]) => `<div class="rg-c"><div class="rg-c-cab"><b>${t}</b><span class="rg-cas">${/^\d/.test(c) ? `casilla ${c}` : c}</span></div><p>${x}</p>${t === 'Ventas de acciones y ETF' ? tuyas('acciones', `No tienes ventas de acciones o ETF apuntadas en ${anio}.`) : t === 'Reembolsos de fondos' ? tuyas('fondos', `Ningún reembolso apuntado en ${anio}.`) : t === 'Criptomonedas' ? tuyas('cripto', `Ninguna venta de cripto apuntada en ${anio}.`) : t === 'Dividendos' && d.rcm ? `<p class="k">Has apuntado ${eur(d.rcm, 0)} de dividendos e intereses en ${anio}.</p>` : ''}</div>`).join('')}</div><p class="k">Los números de casilla cambian a veces de un año a otro: si no cuadran, búscalas por su nombre. Las ventas que hiciste fuera de GrowFolio no salen aquí.</p>`)}
      ${paso(++n, 'Compara con lo que calcula GrowFolio', '', `<p>Base del ahorro de ${anio}: ${eur(fa.base, 0)}. Cuota: ${eur(fa.cuota, 0)}. Si el borrador da mucho más, suele faltar el valor de compra de alguna venta o sobrar una venta duplicada; si da mucho menos, falta alguna venta de un bróker extranjero.</p>`)}
      ${paso(++n, 'Preséntala antes del 30 de junio', `30 jun ${pres}`, `<p>Si sale a pagar, puedes fraccionarlo sin intereses: 60 % en junio y 40 % en noviembre. Si la domicilias, hazlo hasta el 25 de junio. Si sale a devolver, cuanto antes la presentes, antes cobras.</p>`)}
    </ol>
    <p class="nota">Guía orientativa con la normativa vigente; la cifra exacta sale en tu borrador y en los informes de tus brókeres. Para dudas concretas, pregúntale a GrowIA: tiene tus números.</p>
  </div>`;
}

