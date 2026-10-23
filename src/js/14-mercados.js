/* =========================== Mercados =========================== */
/* Qué es cada mercado y qué implica que suba o baje. "tuyo" dice qué posiciones tuyas lo notan. */
const GRUPOS_MERC = ['Europa', 'EEUU', 'Asia y emergentes', 'Tipos y riesgo', 'Divisas', 'Materias primas', 'Cripto'];
const conRegion = (r, min = 40, soloFondos) => (f) => f.inst.clase === 'Renta variable' && (!soloFondos || /^Fondo|ETF/.test(f.inst.tipo || '')) && ((f.inst.region || {})[r] || 0) >= min;
const MERC_INFO = {
  '^IBEX': { g: 'Europa', que: 'Las 35 mayores empresas de la bolsa española: muchos bancos, Inditex, Iberdrola, Repsol.', sube: 'Va bien la bolsa española, sobre todo bancos y energía.', baja: 'Caen sobre todo bancos y energía, que pesan mucho en el índice.', tuyo: (f) => f.inst.tipo === 'Acción' && f.inst.pais === 'ES' },
  '^STOXX50E': { g: 'Europa', que: 'Las 50 mayores de la zona euro. Se parece a lo que llevan los fondos europeos.', sube: 'Sube la bolsa europea: lo notan tus fondos de Europa.', baja: 'Baja la bolsa europea: si aportas cada mes, compras más barato.', tuyo: conRegion('Europa', 40, true) },
  '^GDAXI': { g: 'Europa', que: 'Las 40 grandes de Alemania: industria, coches, química. Es el termómetro de la economía europea.', sube: 'La industria europea va bien.', baja: 'Dudas con la industria europea (exportaciones, aranceles, energía).', tuyo: conRegion('Europa', 40, true) },
  '^FCHI': { g: 'Europa', que: 'Las 40 grandes de París: lujo (LVMH, Hermès), energía y bancos.', sube: 'Tira el lujo y el consumo europeo.', baja: 'Suele pesar el lujo, muy ligado a China.', tuyo: conRegion('Europa', 40, true) },
  '^FTSE': { g: 'Europa', que: 'Las 100 grandes de Londres: petroleras, mineras, bancos, farma y tabaco.', sube: 'Suben las materias primas o los defensivos británicos.', baja: 'Bajan petroleras y mineras, o la libra se fortalece.', tuyo: (f) => /\.L$/i.test(f.inst.yahoo || '') && f.inst.tipo === 'Acción' },
  '^GSPC': { g: 'EEUU', que: 'Las 500 mayores de EEUU: la mitad de la bolsa mundial. Es el índice de los fondos S&P 500.', sube: 'Sube tu parte de EEUU (en euros también cuenta el dólar).', baja: 'Baja tu parte de EEUU. Para quien aporta cada mes, es comprar más barato.', tuyo: conRegion('EEUU') },
  '^NDX': { g: 'EEUU', que: 'Las 100 mayores tecnológicas (Apple, Microsoft, Nvidia…). Pesan un tercio del S&P 500.', sube: 'Tira la tecnología: arrastra al S&P 500.', baja: 'Corrigen las tecnológicas: suelen sufrir cuando suben los tipos.', tuyo: conRegion('EEUU') },
  '^RUT': { g: 'EEUU', que: '2.000 empresas pequeñas de EEUU, muy pegadas a la economía del país y a los tipos.', sube: 'El mercado confía en la economía de EEUU o espera bajadas de tipos.', baja: 'Miedo a la economía o a los tipos altos: las pequeñas lo notan antes.', tuyo: (f) => /small/i.test(`${f.inst.nombre} ${f.inst.corto}`) },
  '^N225': { g: 'Asia y emergentes', que: 'La bolsa de Japón. Muy sensible al yen: con yen débil, ganan sus exportadoras.', sube: 'Japón va bien o el yen se debilita.', baja: 'El yen se fortalece o hay miedo en Asia.', tuyo: conRegion('Japón y Pacífico', 10) },
  '^HSI': { g: 'Asia y emergentes', que: 'Hong Kong: las grandes chinas cotizadas (Tencent, Alibaba). Pesan mucho en los fondos de emergentes.', sube: 'Ayudas del Gobierno chino o mejores datos de China.', baja: 'Dudas con China: lo nota tu fondo de emergentes.', tuyo: conRegion('Emergentes') },
  '000001.SS': { g: 'Asia y emergentes', que: 'La bolsa de China continental: refleja su economía y las medidas de Pekín.', sube: 'Estímulos o mejores datos en China.', baja: 'China se frena: afecta a materias primas, lujo y emergentes.', tuyo: conRegion('Emergentes') },
  '^NSEI': { g: 'Asia y emergentes', que: 'Las 50 grandes de la India, uno de los mayores pesos de los fondos de emergentes.', sube: 'Crece la India: tira de los emergentes.', baja: 'Se enfría la India o sale dinero extranjero.', tuyo: conRegion('Emergentes') },
  '^BVSP': { g: 'Asia y emergentes', que: 'Brasil: materias primas, petróleo y bancos.', sube: 'Suben las materias primas o entra dinero en Latinoamérica.', baja: 'Bajan las materias primas o el real se debilita.', tuyo: conRegion('Emergentes') },
  '^TNX': { g: 'Tipos y riesgo', inverso: true, que: 'Lo que paga EEUU por endeudarse a 10 años. Marca el precio del dinero en todo el mundo.', sube: 'Malo para la bolsa cara (tecnológicas) y para los bonos que ya tienes; hipotecas más caras. Bueno para quien compra bonos nuevos.', baja: 'Bueno para la bolsa y los bonos: el dinero se abarata. Si cae de golpe, puede ser miedo a una recesión.', tuyo: (f) => f.inst.clase === 'Renta fija' || conRegion('EEUU')(f) },
  '^IRX': { g: 'Tipos y riesgo', inverso: true, que: 'Las letras de EEUU a 3 meses: van pegadas a lo que el mercado espera de la Reserva Federal.', sube: 'El mercado espera tipos altos más tiempo.', baja: 'El mercado espera que la Reserva Federal baje tipos.', tuyo: (f) => f.inst.clase === 'Renta fija' || f.inst.clase === 'Monetario' },
  '^VIX': { g: 'Tipos y riesgo', inverso: true, que: 'El «índice del miedo»: cuánto espera el mercado que se mueva el S&P 500. Por debajo de 15, calma; por encima de 30, pánico.', sube: 'Más nervios: suelen caer las bolsas. Es cuando no conviene vender por impulso.', baja: 'Vuelve la calma a los mercados.', tuyo: () => true },
  'EURUSD=X': { g: 'Divisas', inverso: true, que: 'Cuántos dólares vale un euro.', sube: 'Euro más fuerte: lo que tienes en dólares (bolsa de EEUU, oro) vale menos en euros.', baja: 'Euro más débil: tus inversiones en dólares valen más en euros.', tuyo: (f) => conRegion('EEUU')(f) || f.inst.clase === 'Oro' },
  'EURGBP=X': { g: 'Divisas', inverso: true, que: 'Cuántas libras vale un euro.', sube: 'Lo que cotiza en libras vale menos en euros.', baja: 'Lo que cotiza en libras vale más en euros.', tuyo: (f) => /\.L$/i.test(f.inst.yahoo || '') && f.inst.clase !== 'Oro' },
  'JPY=X': { g: 'Divisas', que: 'Cuántos yenes vale un dólar.', sube: 'Yen débil: ayuda a las exportadoras japonesas.', baja: 'Yen fuerte: a veces es señal de miedo, porque el yen hace de refugio.', tuyo: conRegion('Japón y Pacífico', 10) },
  'DX-Y.NYB': { g: 'Divisas', que: 'El dólar frente a las grandes monedas.', sube: 'Dólar fuerte: suele pesar en emergentes y materias primas.', baja: 'Dólar débil: suele ayudar a emergentes, oro y materias primas.', tuyo: (f) => conRegion('Emergentes')(f) || f.inst.clase === 'Oro' },
  'BZ=F': { g: 'Materias primas', que: 'El petróleo de referencia en Europa.', sube: 'Bueno para petroleras; malo para aerolíneas, transporte y la inflación.', baja: 'Sufren las petroleras; ganan aerolíneas, transporte y consumidores.', tuyo: (f) => f.p && /Oil|Gas|Airlines/i.test(f.p.industria || '') },
  'SI=F': { g: 'Materias primas', que: 'Medio refugio y medio metal industrial (placas solares, electrónica): se mueve como el oro pero con más fuerza, en las dos direcciones.', sube: 'Más miedo, tipos a la baja o más demanda industrial.', baja: 'Se enfría la industria o vuelve el apetito por el riesgo.', tuyo: (f) => /plata|silver/i.test(`${f.inst.nombre || ''} ${f.inst.corto || ''}`) },
  'GC=F': { g: 'Materias primas', que: 'El refugio clásico: sube con el miedo, la inflación y cuando bajan los tipos.', sube: 'Más miedo o tipos a la baja: sube tu oro.', baja: 'Vuelve el apetito por el riesgo o suben los tipos descontada la inflación.', tuyo: (f) => f.inst.clase === 'Oro' },
  'HG=F': { g: 'Materias primas', que: 'El «doctor cobre»: se usa en todo, así que sube cuando la industria mundial (sobre todo China) va bien.', sube: 'Señal de economía fuerte; ayuda a mineras y emergentes.', baja: 'Señal de frenazo industrial.', tuyo: conRegion('Emergentes') },
  'NG=F': { g: 'Materias primas', que: 'El gas natural en EEUU. Pesa en la factura de la industria y en la inflación.', sube: 'Más inflación y costes para la industria.', baja: 'Alivio en costes y en la inflación.', tuyo: (f) => f.p && /Utilities|Gas/i.test(f.p.industria || '') },
  'BTC-EUR': { g: 'Cripto', que: 'La mayor criptomoneda. Muy volátil: se mueve con el apetito por el riesgo.', sube: 'Apetito por el riesgo: suele ir con la tecnología.', baja: 'Huida del riesgo: puede caer mucho en poco tiempo.', tuyo: (f) => f.inst.clase === 'Cripto' },
};
/* cada mercado en una fila: nombre, mini gráfica, precio y cambio de hoy; al tocarla, qué es, cómo va y qué te implica */
function filaMercado(sym, m, M) {
  const info = MERC_INFO[sym] || {};
  const v = (S.liveM[sym] && S.liveM[sym].var != null) ? S.liveM[sym].var : m.variacion_dia;
  const plano = v == null || Math.abs(v) < 0.05, sube = v > 0;
  const filasT = info.tuyo && M ? M.filas.filter((f) => { try { return info.tuyo(f); } catch (e) { return false; } }) : [];
  const tuyos = [...new Set(filasT.map((f) => f.inst.corto || f.inst.nombre))];
  // cuánto de tu cartera depende de este mercado (en vez de un "te afecta" que salía en todos)
  // en tipos y riesgo (bono, VIX) afecta a casi todo y el porcentaje no dice nada
  const peso = M && M.total && m.grupo !== 'Tipos y riesgo' ? (sum(filasT, (f) => f.valor) / M.total) * 100 : 0;
  const nombreM = sym === '^VIX' ? 'VIX (nervios en bolsa)' : m.nombre;
  return `<details class="mfila" data-sym="${esc(sym)}">
    <summary><span class="mf-n"><b>${esc(nombreM)}</b>${peso >= 1 ? `<small class="mf-tuyo" title="${esc(L(`Lo notan: ${yLista(tuyos)}. Varios mercados pueden tocar la misma parte (el DAX y el Euro Stoxx, por ejemplo): no se suman.`, `Felt by: ${tuyos.join(', ')}. Several markets can touch the same part (DAX and Euro Stoxx, say): they don't add up.`))}">${fmtNum(peso, 0)} % ${L('de tu cartera', 'of your portfolio')} (${esc(tuyos.length > 1 ? L(`${tuyos[0]} y ${tuyos.length - 1} más`, `${tuyos[0]} and ${tuyos.length - 1} more`) : tuyos[0])})</small>` : ''}</span>${miniSpark(sym)}<span class="mf-p"><span class="merc-p">${B('mp:' + sym)}</span>${B('mv:' + sym)}</span></summary>
    <div class="mf-det">
      ${info.que ? `<p class="mf-que">${esc(info.que)}</p>` : ''}
      <div class="chart" data-spark-m="${esc(sym)}"></div>
      <div class="merc-r"><span>1 mes <b class="${cls(m.rent && m.rent['1m'])}">${pctS(m.rent && m.rent['1m'], 1)}</b></span><span>Año <b class="${cls(m.rent && m.rent.ytd)}">${pctS(m.rent && m.rent.ytd, 1)}</b></span><span>1 año <b class="${cls(m.rent && m.rent['1a'])}">${pctS(m.rent && m.rent['1a'], 1)}</b></span></div>
      ${info.sube ? `<p class="merc2-imp ${plano ? '' : (sube !== !!info.inverso) ? 'sube' : 'baja'}"><b>${plano ? 'Si sube' : sube ? 'Hoy sube' : 'Hoy baja'}:</b> ${esc(plano ? info.sube : sube ? info.sube : info.baja)}</p>${plano ? `<p class="merc2-imp"><b>Si baja:</b> ${esc(info.baja)}</p>` : ''}` : ''}
      ${tuyos.length ? `<p class="merc2-tuyo">${L(`Lo nota en tu cartera: ${esc(tuyos.slice(0, 4).join(', '))}${tuyos.length > 4 ? ` y ${tuyos.length - 4} más` : ''}`, `Felt in your portfolio by: ${esc(tuyos.slice(0, 4).join(', '))}${tuyos.length > 4 ? ` and ${tuyos.length - 4} more` : ''}`)}</p>` : ''}
    </div>
  </details>`;
}
function tarjetaMercado(sym, m, M) {
  const info = MERC_INFO[sym] || {};
  const v = (S.liveM[sym] && S.liveM[sym].var != null) ? S.liveM[sym].var : m.variacion_dia;
  const plano = v == null || Math.abs(v) < 0.05;
  const sube = v > 0;
  const tuyos = info.tuyo && M ? [...new Set(M.filas.filter((f) => { try { return info.tuyo(f); } catch (e) { return false; } }).map((f) => f.inst.corto || f.inst.nombre))] : [];
  return `<article class="merc2">
    <div class="merc2-cab"><div class="merc2-n"><b>${esc(m.nombre)}</b>${info.que ? `<small>${esc(info.que)}</small>` : ''}</div>
      <div class="merc2-p"><span class="merc-p">${B('mp:' + sym)}</span>${B('mv:' + sym)}</div></div>
    <div class="merc2-g"><div class="chart" data-spark-m="${esc(sym)}"></div>
      <div class="merc-r"><span>1 mes <b class="${cls(m.rent && m.rent['1m'])}">${pctS(m.rent && m.rent['1m'], 1)}</b></span><span>Año <b class="${cls(m.rent && m.rent.ytd)}">${pctS(m.rent && m.rent.ytd, 1)}</b></span><span>1 año <b class="${cls(m.rent && m.rent['1a'])}">${pctS(m.rent && m.rent['1a'], 1)}</b></span></div></div>
    ${info.sube ? `<p class="merc2-imp ${plano ? '' : (sube !== !!info.inverso) ? 'sube' : 'baja'}"><b>${plano ? 'Si sube' : sube ? 'Hoy sube' : 'Hoy baja'}:</b> ${esc(plano ? info.sube : sube ? info.sube : info.baja)}</p>${plano ? `<p class="merc2-imp"><b>Si baja:</b> ${esc(info.baja)}</p>` : ''}` : ''}
    ${tuyos.length ? `<p class="merc2-tuyo">${L(`Lo nota en tu cartera: ${esc(tuyos.slice(0, 4).join(', '))}${tuyos.length > 4 ? ` y ${tuyos.length - 4} más` : ''}`, `Felt in your portfolio by: ${esc(tuyos.slice(0, 4).join(', '))}${tuyos.length > 4 ? ` and ${tuyos.length - 4} more` : ''}`)}</p>` : ''}
  </article>`;
}
function vistaMercados(M) {
  const merc = (S.precios && S.precios.mercados) || {};
  const N = (S.precios && S.precios.noticias && S.precios.noticias.mercado) || [];
  const porGrupo = new Map(GRUPOS_MERC.map((g) => [g, []]));
  for (const [sym, m] of Object.entries(merc)) { const g = m.grupo || (MERC_INFO[sym] && MERC_INFO[sym].g) || 'Otros'; if (!porGrupo.has(g)) porGrupo.set(g, []); porGrupo.get(g).push([sym, m]); }
  const grupos = [...porGrupo.entries()].filter(([, v]) => v.length);
  if (S.mgrupo == null) S.mgrupo = LS.get('inv-mgrupo', null);
  // en el móvil se ve un grupo cada vez (con pestañas); en el ordenador, todos
  const act = grupos.some(([g]) => g === S.mgrupo) ? S.mgrupo : (grupos[0] || [''])[0];
  const abierto = innerWidth >= 760;
  return `
  <div class="vista-cab vista-merc"><h1>Mercados</h1><p>Bolsas del mundo, tipos, divisas y materias primas: qué son, cómo van y qué significa que suban o bajen para lo que tienes.</p></div>
  <div class="pila pila-merc">
    ${htmlBuscaMercados()}
    ${htmlMapaMundo()}
    <section class="mgrupos-w" aria-labelledby="hMg">
      <div class="sec-cab"><h2 id="hMg">Cómo van</h2><span class="k">La línea son sus tres últimos meses y la cifra, lo de hoy. Toca uno para ver qué es y qué significa para ti.</span></div>
      <div class="mg-tabs" role="tablist" aria-label="Grupos de mercados">${grupos.map(([g]) => `<button type="button" role="tab" data-mg="${esc(g)}" aria-selected="${g === act}">${esc(MG_CORTO[g] || g)}</button>`).join('')}</div>
      <div class="mgrupos">${grupos.map(([g, v]) => `<section class="mgrupo${g === act ? ' act' : ''}" data-g="${esc(g)}" aria-label="${esc(g)}"><h3 class="mg-t">${esc(g)}</h3><div class="mfilas">${v.map(([sym, m]) => filaMercado(sym, m, M)).join('')}</div></section>`).join('')}</div>
    </section>
    ${htmlMercadoInforme(abierto)}
    ${htmlMovidas(abierto)}
    <section aria-labelledby="hNotM"><div class="sec-cab"><h2 id="hNotM">Noticias de mercado</h2><span class="k">bolsas, bancos centrales, petróleo y divisas</span></div>${htmlNoticias(N.slice(0, 6), false, 6).replace('class="noticias"', 'class="noticias dos-col"')}${N.length > 6 ? `<details class="mas-noticias"><summary>Ver ${Math.min(N.length, 16) - 6} noticias más</summary>${htmlNoticias(N.slice(6, 16), false, 10).replace('class="noticias"', 'class="noticias dos-col"')}</details>` : ''}</section>
  </div>`;
}
const MG_CORTO = { 'Asia y emergentes': 'Asia', 'Tipos y riesgo': 'Tipos', 'Materias primas': 'Materias primas' };
// las pestañas de grupos del móvil: cambia sin volver a pintar la página (y se recuerda)
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-mg]'); if (!b) return;
  S.mgrupo = b.dataset.mg; LS.set('inv-mgrupo', S.mgrupo);
  for (const t of $$('.mg-tabs [data-mg]')) t.setAttribute('aria-selected', String(t === b));
  for (const g of $$('.mgrupo[data-g]')) g.classList.toggle('act', g.dataset.g === S.mgrupo);
  for (const el of $$('.mgrupo.act [data-spark-m]')) if (!el.closest('details:not([open])')) dibujarSparkM(el);
});

