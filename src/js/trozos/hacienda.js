/* =====================================================================
   Hacienda > Tu renta: el recorrido casilla a casilla, en el orden de Renta Web (maqueta aprobada por Carlos el
   11 nov 2026: claude/sesion-maqueta-hacienda.md; referencia de textos y estados en claude/maquetas/hz-hacienda.js).
   Lista a la izquierda, agrupada por los apartados de Renta Web, con lo que no te toca en gris; la casilla abierta a
   la derecha, con Anterior y Siguiente, y la app recuerda dónde lo dejaste. Todo sale de lo que ya sabe Toisón:
   las ventas apuntadas, los Datos fiscales del año y lo que tienes. Informa y calcula; no asesora.
   Va en un trozo: no hace falta para abrir Inicio. Las clases sueltas llevan «z-» delante porque chocan con reglas
   de la app (.on, .ok, .tu…).
   ===================================================================== */
const HZ_CSS = `
#hz { display: grid; gap: 20px; margin-top: 6px; padding-bottom: 40px; font-variant-numeric: tabular-nums; }
#hz * { box-sizing: border-box; }
.hz-ic { width: 18px; height: 18px; flex: none; }
.hz-ey { display: block; font: 600 11px/1.2 var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--texto-2); }
.hz-h2 { margin: 6px 0 0; font: var(--titulo-estilo, normal) var(--titulo-peso, 500) 30px/1.12 var(--titulo); letter-spacing: var(--titulo-espacio, -.02em); }
[data-tema="marfil"] .hz-h2 { font-family: var(--marca); font-weight: 500; letter-spacing: 0; }
.hz-nota { margin: 0; font-size: 13px; line-height: 1.5; color: var(--tenue); }
.hz-enl { display: inline-flex; align-items: center; gap: 5px; border: 0; background: none; padding: 4px 0; font: 600 13.5px/1.2 var(--ui); color: var(--oro-texto); cursor: pointer; }
.hz-enl .hz-ic { width: 15px; height: 15px; }
#hz .btn .hz-ic { width: 16px; height: 16px; margin-right: 7px; }
#hz .btn .hz-ic:last-child:not(:first-child) { margin: 0 0 0 7px; }
#hz .btn.peq { font-weight: 600; }
.hz-sube { color: var(--sube); } .hz-baja { color: var(--baja); }
.hz-cas { display: inline-flex; align-items: center; padding: 3px 7px; border-radius: 6px; font: 600 11.5px/1 var(--ui); font-variant-numeric: tabular-nums; letter-spacing: .02em; color: var(--texto-2); background: var(--superficie-2); box-shadow: inset 0 0 0 1px var(--aro); white-space: nowrap; }
.hz-est { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px 4px 8px; border-radius: 99px; font: 600 12px/1.1 var(--ui); white-space: nowrap; background: var(--sep); color: var(--texto-2); }
.hz-est i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.hz-est.z-ok { background: color-mix(in srgb, var(--texto) 8%, transparent); color: var(--texto-2); }
.hz-est.z-tu { background: var(--primario-fondo); color: var(--oro-texto); }
.hz-est.z-mira, .hz-est.z-falta { background: var(--aviso-fondo); color: var(--aviso); }
.hz-sec { display: grid; gap: 10px; }
.hz-sec h4 { margin: 0; font: 600 11px/1.2 var(--ui); letter-spacing: .12em; text-transform: uppercase; color: var(--tenue); }
.hz-cuenta { display: grid; border-radius: var(--r-m); background: color-mix(in srgb, var(--texto) 3.5%, transparent); box-shadow: inset 0 0 0 1px var(--sep); padding: 4px 14px; }
.hz-cuenta > div { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; padding: 9px 0; font-size: 14px; border-bottom: 1px solid var(--sep); }
.hz-cuenta > div:last-child { border-bottom: 0; }
.hz-cuenta span { color: var(--texto-2); }
.hz-cuenta b { font-weight: 500; white-space: nowrap; }
.hz-cuenta .z-tot { border-top: 1px solid var(--aro); border-bottom: 0; }
.hz-cuenta .z-tot span { color: var(--texto); font-weight: 600; } .hz-cuenta .z-tot b { font-weight: 650; }
.hz-campos { display: grid; border-radius: var(--r-m); box-shadow: inset 0 0 0 1px var(--aro); overflow: hidden; }
.hz-campo { display: grid; grid-template-columns: minmax(0, 1fr) auto 36px; align-items: center; gap: 12px; padding: 7px 8px 7px 14px; border-bottom: 1px solid var(--sep); min-height: 48px; }
.hz-campo:last-child { border-bottom: 0; }
.hz-campo span { font-size: 13px; color: var(--tenue); }
.hz-campo b { font: 600 15px/1.25 var(--ui); text-align: right; letter-spacing: -.005em; overflow-wrap: anywhere; }
.hz-campo:not(:has(.hz-cp)) { grid-template-columns: minmax(0, 1fr) auto; padding-right: 14px; }
.hz-cp { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; border: 0; background: color-mix(in srgb, var(--texto) 6%, transparent); color: var(--texto-2); cursor: pointer; }
.hz-cp:hover { color: var(--texto); background: var(--primario-fondo); }
.hz-cp .hz-ic { width: 16px; height: 16px; }
.hz-ojo { margin: 0; padding-left: 12px; border-left: 2px solid var(--hilo); font-size: 13.5px; line-height: 1.55; color: var(--texto-2); }
.hz-ojo b { color: var(--texto); font-weight: 600; }
.hz-ventas { display: grid; gap: 10px; }
.hz-venta { border-radius: var(--r-m); box-shadow: inset 0 0 0 1px var(--aro); overflow: hidden; }
.hz-venta.z-on { box-shadow: inset 0 0 0 1.5px var(--primario); }
.hz-venta-cab { display: flex; align-items: center; gap: 12px; width: 100%; border: 0; background: color-mix(in srgb, var(--texto) 3%, transparent); padding: 12px 14px; text-align: left; color: var(--texto); cursor: pointer; font: inherit; }
.hz-venta-cab > span { flex: 1; display: grid; gap: 2px; } .hz-venta-cab b { font-size: 15px; font-weight: 600; } .hz-venta-cab small { font-size: 12.5px; color: var(--tenue); }
.hz-venta-cab > b { font: 600 16px/1 var(--ui); }
.hz-chev { color: var(--tenue); width: 16px; height: 16px; }
.hz-venta-c { display: grid; gap: 12px; padding: 12px 14px 14px; }
.hz-falta { display: grid; grid-template-columns: 34px 1fr; gap: 12px; padding: 16px; border-radius: var(--r-m); background: var(--aviso-fondo); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--aviso) 35%, transparent); }
.hz-falta-i { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: color-mix(in srgb, var(--aviso) 22%, transparent); color: var(--aviso); }
.hz-falta-c { display: grid; gap: 6px; justify-items: start; } .hz-falta-c b { font-size: 15.5px; font-weight: 600; line-height: 1.35; } .hz-falta-c > span { font-size: 13.5px; line-height: 1.5; color: var(--texto-2); }
.hz-res { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin: 2px 0 0; }
.hz-res b { font: 300 46px/1 var(--ui); letter-spacing: -.035em; }
.hz-res span { font: 500 16px/1.2 var(--ui); color: var(--texto-2); }
.hz-res-f { margin: 0; font-size: 14.5px; line-height: 1.55; color: var(--texto-2); max-width: 62ch; }
.hz-res-f b { color: var(--texto); font-weight: 600; }
.hz-aviso { display: flex; gap: 10px; align-items: flex-start; margin: 0; padding: 12px 14px; border-radius: var(--r-m); background: color-mix(in srgb, var(--texto) 4%, transparent); font-size: 13px; line-height: 1.5; color: var(--texto-2); }
.hz-aviso .hz-ic { color: var(--tenue); margin-top: 1px; }
.hz-aviso b { color: var(--texto); font-weight: 600; }
.hz-tira { display: grid !important; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); align-items: center; gap: 24px; padding: 18px 22px !important; }
.hz-tira-p { display: grid; gap: 6px; } .hz-tira-p > b { font: 600 18px/1.2 var(--ui); } .hz-falta-t { color: var(--aviso); font-weight: 600; }
.hz-seg { display: flex; gap: 4px; margin-top: 4px; }
.hz-seg i { flex: 1; height: 6px; border-radius: 9px; background: var(--sep); }
.hz-seg i.z-listo { background: var(--primario); } .hz-seg i.z-falta { background: var(--aviso); }
.hz-tira-r { display: grid; gap: 2px; justify-items: start; padding-left: 24px; border-left: 1px solid var(--sep); }
.hz-tira-r small { font-size: 12px; color: var(--tenue); } .hz-tira-r b { font: 500 22px/1.15 var(--ui); letter-spacing: -.02em; }
.hz-A { display: grid; grid-template-columns: 330px minmax(0, 1fr); gap: 20px; align-items: start; }
.hz-lista { padding: 10px !important; position: sticky; top: 84px; max-height: calc(100vh - 100px); overflow: auto; scrollbar-width: thin; }
.hz-A-der { display: grid; gap: 20px; min-width: 0; }
.hz-pasos { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.hz-pg { padding: 14px 10px 6px; font: 600 10.5px/1.2 var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--tenue); }
.hz-pg:first-child { padding-top: 6px; }
.hz-paso { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; align-items: center; gap: 11px; width: 100%; padding: 9px 10px; border: 0; border-radius: var(--r-m); background: none; color: var(--texto); text-align: left; font: inherit; cursor: pointer; }
.hz-paso:hover { background: color-mix(in srgb, var(--texto) 5%, transparent); }
.hz-paso.z-on { background: var(--sel-plano, var(--primario-fondo)); box-shadow: inset 3px 0 0 var(--primario); }
.hz-pi { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px var(--aro); color: var(--tenue); }
.hz-pi .hz-ic { width: 14px; height: 14px; stroke-width: 2.2; }
.hz-paso.z-listo .hz-pi { background: var(--primario); color: var(--sobre-primario); box-shadow: none; }
.hz-paso.z-falta .hz-pi { background: var(--aviso); color: var(--superficie); box-shadow: none; }
.hz-paso.z-sale .hz-pi { box-shadow: inset 0 0 0 1.5px var(--hilo); color: var(--oro-texto); }
.hz-paso.z-fuera, .hz-paso.z-gris { cursor: default; } .hz-paso.z-fuera:hover, .hz-paso.z-gris:hover { background: none; }
/* lo que no te toca: apagado con el color, no con opacidad (el contraste de la letra pequeña tiene que seguir llegando) */
.hz-paso.z-gris .hz-pi { box-shadow: inset 0 0 0 1px var(--sep); color: var(--tenue); } .hz-paso.z-gris .hz-pt b { font-weight: 500; color: var(--tenue); }
.hz-paso.z-gris .hz-cas { background: none; box-shadow: inset 0 0 0 1px var(--sep); color: var(--tenue); }
.hz-pt { display: grid; gap: 2px; min-width: 0; } .hz-pt b { font-size: 14px; font-weight: 600; line-height: 1.25; }
.hz-pt small { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12px; color: var(--tenue); line-height: 1.3; }
.hz-pt small .hz-cas { padding: 2px 5px; font-size: 10.5px; }
.hz-sh { color: var(--tenue); } .hz-sh.z-f { color: var(--aviso); font-weight: 600; } .hz-sh.z-m { color: var(--aviso); } .hz-sh.z-t { color: var(--oro-texto); }
.hz-paso em { font: 500 13px/1 var(--ui); font-style: normal; color: var(--texto-2); white-space: nowrap; }
.hz-filtro { display: flex; gap: 2px; margin: 4px 4px 2px; padding: 3px; border-radius: 99px; background: var(--superficie-2); box-shadow: inset 0 0 0 1px var(--aro); }
.hz-filtro button { flex: 1; border: 0; background: none; padding: 7px 6px; border-radius: 99px; font: 600 12.5px/1 var(--ui); color: var(--texto-2); cursor: pointer; }
.hz-filtro button[aria-pressed="true"] { background: var(--sel-plano, var(--primario-fondo)); color: var(--texto); }
.hz-vacio { margin: 10px; font-size: 13px; color: var(--tenue); }
.hz-panel { display: grid !important; gap: 20px !important; padding: 26px 28px !important; min-width: 0; }
.hz-panel-cab { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.hz-recuerda { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 99px; background: var(--primario-fondo); font: 600 12px/1 var(--ui); color: var(--texto-2); }
.hz-recuerda .hz-ic { width: 14px; height: 14px; color: var(--oro-texto); }
.hz-ptu { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: -8px; }
.hz-ptu small { flex-basis: 100%; margin-bottom: -10px; font-size: 12px; color: var(--tenue); }
.hz-ptu b { font: 300 36px/1.05 var(--ui); letter-spacing: -.03em; }
.hz-panel-pie { display: flex; justify-content: space-between; gap: 10px; padding-top: 18px; border-top: 1px solid var(--sep); }
.hz-datos { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px 28px; padding: 14px 16px; border-radius: var(--r-m); background: color-mix(in srgb, var(--texto) 3.5%, transparent); }
.hz-datos > div { display: grid; gap: 3px; } .hz-datos small { font-size: 12px; color: var(--tenue); } .hz-datos b { font-size: 14.5px; font-weight: 600; }
.hz-datos .hz-enl { margin-left: auto; }
.hz-sec .btn { justify-self: start; }
.hz-docs { display: grid; gap: 6px; }
.hz-doc { display: grid; grid-template-columns: 20px 1fr; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: var(--r-m); box-shadow: inset 0 0 0 1px var(--sep); }
.hz-doc .hz-ic { color: var(--tenue); margin-top: 1px; }
.hz-doc span { display: grid; gap: 2px; } .hz-doc b { font-size: 14px; font-weight: 600; } .hz-doc small { font-size: 12.5px; line-height: 1.45; color: var(--texto-2); }
.hz-panel.hz-entra-d { animation: hzEntraD .26s cubic-bezier(.2, .8, .2, 1); }
.hz-panel.hz-entra-i { animation: hzEntraI .26s cubic-bezier(.2, .8, .2, 1); }
@keyframes hzEntraD { from { transform: translateX(36px); opacity: .25; } }
@keyframes hzEntraI { from { transform: translateX(-36px); opacity: .25; } }
@media (prefers-reduced-motion: reduce) { .hz-panel.hz-entra-d, .hz-panel.hz-entra-i { animation: none; } }
@media (max-width: 899px) {
  .hz-A { grid-template-columns: 1fr; }
  .hz-lista { position: static; max-height: none; }
  .hz-tira { grid-template-columns: 1fr; gap: 12px; }
  .hz-tira-r { padding-left: 0; border-left: 0; }
  .hz-panel { padding: 18px 16px !important; gap: 18px !important; }
  .hz-h2 { font-size: 27px; }
}
`;
const ponerCssHz = () => { if (!$('#hzCss')) { const s = document.createElement('style'); s.id = 'hzCss'; s.textContent = HZ_CSS; document.head.appendChild(s); } };

/* ---------- iconos (trazo, 24×24) ---------- */
const HZ_P = {
  ok: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  alerta: '<path d="M12 8v5"/><path d="M12 16.6v.1"/>',
  raya: '<path d="M7 12h10"/>',
  copiar: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
  doc: '<path d="M7 3.5h6.5l4 4V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z"/><path d="M13.5 3.5V8h4"/><path d="M8.5 12.5h7M8.5 16h5"/>',
  der: '<path d="M9.5 6l6 6-6 6"/>', izq: '<path d="M14.5 6l-6 6 6 6"/>', abajo: '<path d="M6 9.5l6 6 6-6"/>',
  lista: '<path d="M9 7h11M9 12h11M9 17h11"/><path d="M4.5 7h.1M4.5 12h.1M4.5 17h.1"/>',
  reloj: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  lapiz: '<path d="M5 19l1-4.2L15.6 5.2a1.9 1.9 0 0 1 2.7 0l.5.5a1.9 1.9 0 0 1 0 2.7L9.2 18z"/><path d="M13.8 7l3.2 3.2"/>',
};
const hzIc = (k, c = '') => `<svg class="hz-ic${c ? ' ' + c : ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${HZ_P[k]}</svg>`;

/* ---------- cifras: en pantalla con sus puntos; para copiar, como las quiere Renta Web (1234,56) ---------- */
const hzN = (n) => fmtNum(n, 2);
const hzCopiable = (n) => (n < 0 ? '-' : '') + Math.abs(n).toFixed(2).replace('.', ',');
const hzSg = (n) => (n > 0.004 ? '+' : '') + eur(n, 2);
// el broker manda tus datos a Hacienda (y llegan al borrador): los españoles y Trade Republic con IBAN español
const hzInforma = (plat) => !!plat && (!esDeFuera(plat) || /trade ?republic/i.test(plat));
const hzGrupo = (m) => { const i = S.inst[m.instrumento] || {}; return esRCMVenta(i) ? 'etc' : i.clase === 'Cripto' ? 'cripto' : /^Fondo/.test(i.tipo || '') ? 'fondos' : i.tipo === 'ETF' ? 'etf' : 'acciones'; };
const hzNeto = (m) => { const a = perdidaAplazada(m); return (m.resultado || 0) - (a ? a.importe : 0); };

/* ---------- las casillas, en el orden de Renta Web, sacadas de lo que sabe Toisón ----------
   Cada una: { k, g (apartado), cas, t, sub, v (lo tuyo; null si Toisón no lo sabe), o (borrador | tu), e (listo |
   comprueba | falta | no), de (de dónde sale), pone (lo que tiene que poner Renta Web), ojo, ventas }.
   e: 'no' es lo que no te toca: sale en gris en su apartado y no se abre. */
const HZ_AP = { datos: 'Antes de empezar', trabajo: 'Rendimientos del trabajo', rcm: 'Rendimientos del capital mobiliario', gp: 'Ganancias y pérdidas patrimoniales', comp: 'Compensación de pérdidas', ded: 'Deducciones', inf: 'Declaraciones informativas', sale: 'Lo que sale' };
function hzCasillas(anio, M) {
  const fa = fiscalAnio(anio), d = datosFiscales(anio), L0 = [];
  const vs = fa.ventas.slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const de = (g) => vs.filter((m) => hzGrupo(m) === g);
  const origen = (l) => (l.length && l.every((m) => hzInforma(m.plataforma)) ? 'borrador' : 'tu');
  const tiene = (f) => M.filas.some(f);
  // dónde se cobran dividendos e intereses: lo que reparte y el efectivo (la cripto no paga nada de eso)
  const platsCobro = new Set([...M.filas.filter((f) => f.inst.clase !== 'Cripto' && f.p && f.p.dividendo_pct).map((f) => f.pos.plataforma), ...M.efectivo.map((e) => e.plataforma)].filter(Boolean));
  const deFueraSinInforme = [...platsCobro].filter((p) => !hzInforma(p));
  const add = (c) => { L0.push(c); return c; };
  const resumenVentas = (l) => yLista([...new Set(l.map((m) => nombreInst(m.instrumento)))]);

  add({ k: 'datos', g: 'datos', t: 'Tus datos y tus informes', sub: comunidadUsuario() ? nombreComunidad(comunidadUsuario()) : 'Falta tu comunidad', e: comunidadUsuario() ? 'listo' : 'falta', nav: true });

  add({ k: 'sueldo', g: 'trabajo', cas: '', t: 'Tu sueldo', sub: 'Lo declara tu empresa', v: null, o: 'borrador', e: 'listo',
    ojo: 'Tu empresa le manda a Hacienda lo que te paga y lo que te retiene, así que viene en el borrador. Compruébalo con el certificado de retenciones, que te da en enero. Toisón todavía no lo cuenta: lo que sale aquí es solo lo de tus inversiones.' });

  // dividendos e intereses: los apuntas en Datos fiscales (en bruto). Si dices cuánto es de intereses, cada uno va en su casilla
  const rcm = +d.rcm || 0, int = d.intereses == null || d.intereses === '' ? null : +d.intereses;
  const origenRcm = deFueraSinInforme.length ? 'tu' : 'borrador';
  const ojoRcm = `Van en bruto, antes de la retención; la retención se resta después, en lo que sale.${deFueraSinInforme.length ? ` Lo que cobres en ${yLista(deFueraSinInforme)} no lo trae el borrador: eso lo metes tú.` : ''}`;
  if (rcm > 0 && int != null) {
    add(int > 0 ? { k: 'c0027', g: 'rcm', cas: '0027', t: 'Intereses de cuentas', sub: 'Lo que te ha pagado el efectivo', v: int, o: origenRcm, e: 'listo', de: [['Intereses que apuntaste en Datos fiscales', int]], pone: [['Ingresos íntegros', int]], ojo: ojoRcm }
      : { k: 'c0027', g: 'rcm', cas: '0027', t: 'Intereses de cuentas', sub: 'No apuntaste intereses', e: 'no' });
    const div = Math.max(0, rcm - int);
    add(div > 0 ? { k: 'c0029', g: 'rcm', cas: '0029', t: 'Dividendos', sub: 'Lo que te han pagado tus acciones', v: div, o: origenRcm, e: 'listo', de: [['Dividendos e intereses de Datos fiscales', rcm], ['Menos los intereses, que van en la 0027', -int]], pone: [['Ingresos íntegros', div]], ojo: ojoRcm }
      : { k: 'c0029', g: 'rcm', cas: '0029', t: 'Dividendos', sub: 'No apuntaste dividendos', e: 'no' });
  } else if (rcm > 0) {
    add({ k: 'rcm', g: 'rcm', cas: '0027 y 0029', t: 'Intereses y dividendos', sub: 'Falta separar los intereses', v: rcm, o: origenRcm, e: 'falta', de: [['Dividendos e intereses de Datos fiscales', rcm]],
      falta: { t: '¿Cuánto es de intereses?', x: 'Los intereses del efectivo van en la casilla 0027 y los dividendos en la 0029. Pon los intereses en Datos fiscales y cada uno sale en su casilla. La cuenta de lo que pagas no cambia.', b: 'Poner los intereses' }, ojo: ojoRcm });
  } else {
    const da = anio === new Date().getFullYear() ? dividendosAnio(M, anio) : null;
    if ((da && da.bruto >= 1) || M.dividendos >= 1) add({ k: 'rcm', g: 'rcm', cas: '0027 y 0029', t: 'Intereses y dividendos', sub: 'No has apuntado lo cobrado', v: null, o: origenRcm, e: 'falta',
      falta: { t: '¿Cuánto cobraste en dividendos e intereses?', x: `${da && da.bruto >= 1 ? `Por lo que han pagado tus acciones, este año habrás cobrado unos ${eur(da.bruto, 0)} brutos en dividendos (${esc(yLista([...new Set(da.de.map((x) => x.n))]))}).` : `Tus posiciones reparten unos ${eur(M.dividendos, 0)} brutos al año.`} Lo exacto sale en el informe de tu bróker: apúntalo en Datos fiscales, en bruto.`, b: 'Apuntarlo' }, ojo: ojoRcm });
    else {
      add({ k: 'c0027', g: 'rcm', cas: '0027', t: 'Intereses de cuentas', sub: 'No has apuntado intereses', e: 'no' });
      add({ k: 'c0029', g: 'rcm', cas: '0029', t: 'Dividendos', sub: 'No has apuntado dividendos', e: 'no' });
    }
  }

  // los ETC: rendimiento del capital mobiliario (V0267-25), no ganancia patrimonial
  const etc = de('etc');
  if (etc.length) add({ k: 'c0031', g: 'rcm', cas: '0031', t: etc.length === 1 ? `${nombreInst(etc[0].instrumento)} (ETC)` : 'Ventas de ETC', sub: resumenVentas(etc), v: fa.rcmVentas, o: origen(etc), e: 'listo', ventas: etc,
    pone: [['Valor de transmisión', sum(etc, (m) => +m.importe || 0)], ['Valor de adquisición', sum(etc, (m) => +m.coste_vendido || 0)]],
    ojo: 'Un ETC es un título de deuda: lo que ganas al venderlo es rendimiento del capital mobiliario, no la venta de una acción. Por eso va aquí, en «transmisión de otros activos financieros», y no con las acciones.' });
  else if (tiene((f) => esRCMVenta(f.inst))) add({ k: 'c0031', g: 'rcm', cas: '0031', t: 'Ventas de ETC', sub: `No vendiste ningún ETC en ${anio}.`, e: 'no' });

  // ganancias y pérdidas: fondos, ETF, acciones, lo vendido fuera de Toisón y la cripto
  const fon = de('fondos'), etf = de('etf'), acc = de('acciones'), cri = de('cripto');
  add(fon.length ? { k: 'fondos', g: 'gp', cas: '', t: 'Fondos de inversión', sub: `Reembolsos de ${resumenVentas(fon)}`, v: sum(fon, hzNeto), o: origen(fon), e: 'listo', ventas: fon,
    ojo: 'Solo cuenta cuando sacas el dinero del fondo. Los traspasos entre fondos no se declaran.' }
    : { k: 'fondos', g: 'gp', cas: '', t: 'Fondos de inversión', sub: 'No sacaste dinero de ningún fondo. Los traspasos no se declaran.', e: 'no' });
  add(etf.length ? { k: 'etf', g: 'gp', cas: '', t: 'Fondos cotizados (ETF)', sub: resumenVentas(etf), v: sum(etf, hzNeto), o: origen(etf), e: 'listo', ventas: etf,
    ojo: 'Aunque coticen como una acción, los ETF no van con ellas: van con los fondos, en «transmisiones de instituciones de inversión colectiva», como fondos cotizados, en la parte que no lleva retención. Una línea por cada venta.' }
    : { k: 'etf', g: 'gp', cas: '', t: 'Fondos cotizados (ETF)', sub: `No vendiste ninguno en ${anio}.`, e: 'no' });
  if (acc.length) {
    const tr = acc.some((m) => /trade ?republic/i.test(m.plataforma || '')), fueraUE = acc.some((m) => !cotizaEnUE(S.inst[m.instrumento] || {}));
    add({ k: 'c0328', g: 'gp', cas: '0328', t: 'Ventas de acciones', sub: resumenVentas(acc), v: sum(acc, hzNeto), o: origen(acc), e: tr ? 'comprueba' : 'listo', ventas: acc,
      ojo: [tr && '<b>Mira bien dónde las pone el borrador.</b> Trade Republic a veces manda las ventas de acciones como rendimientos del capital (casilla 0031). Si las ves allí, quítalas de la 0031 y ponlas aquí.',
        fueraUE && 'La ayuda de Renta reserva este apartado para las acciones de bolsas españolas y europeas. Las que solo cotizan fuera (en EEUU o en Londres, por ejemplo) van en «otros elementos patrimoniales».'].filter(Boolean).join(' ') || 'Una línea por cada venta, con lo que cobraste y lo que te costó, las dos con sus comisiones.' });
  } else add({ k: 'c0328', g: 'gp', cas: '0328', t: 'Ventas de acciones', sub: `No vendiste acciones en ${anio}.`, e: 'no' });
  if (fa.otras) add({ k: 'otras', g: 'gp', cas: '', t: 'Ventas que no están en Toisón', sub: 'Lo que apuntaste en Datos fiscales', v: fa.otras, o: 'tu', e: 'listo', de: [['Resultado de las ventas que no apuntaste en Toisón', fa.otras]],
    ojo: 'Toisón solo sabe el resultado, no cada venta. Las líneas, con sus fechas e importes, las sacas del informe de ese bróker.' });
  if (cri.length) add({ k: 'cripto', g: 'gp', cas: '', t: 'Monedas virtuales', sub: resumenVentas(cri), v: sum(cri, hzNeto), o: origen(cri), e: 'listo', ventas: cri, cripto: true,
    ojo: `Cada venta a euros y cada cambio de una cripto por otra, con su valor de venta y de compra.${cri.some((m) => !hzInforma(m.plataforma)) ? ' Tu exchange todavía no manda tus ventas al borrador: si no las metes tú, no están.' : ''}` });
  else if (tiene((f) => f.inst.clase === 'Cripto')) add({ k: 'cripto', g: 'gp', cas: '', t: 'Monedas virtuales', sub: `No vendiste cripto en ${anio}.`, e: 'no' });

  // compensación: las pérdidas de los cuatro años anteriores (y los rendimientos negativos, que van aparte)
  if (fa.pendientes > 0 || fa.pendientesRcm > 0) {
    const usa = fa.usadas + fa.usadasRcm, queda = fa.pendientes - fa.usadas + fa.pendientesRcm - fa.usadasRcm;
    add({ k: 'perd', g: 'comp', cas: '1634', t: 'Pérdidas de años anteriores', sub: usa > 0 ? `Compensas ${eur(usa, 0)} este año` : 'Este año no compensas nada', v: -usa, o: 'borrador', e: 'listo',
      de: [['Te quedaban de años anteriores', fa.pendientes + fa.pendientesRcm], ['Las restas este año de lo que ganas', -usa]], tot: ['Te queda para los años siguientes', queda],
      pone: usa > 0 ? [['Pérdidas que compensas', usa]] : null,
      ojo: `Renta Web las arrastra de tus declaraciones anteriores: solo compruébalo.${usa > 0 && usa < fa.pendientes + fa.pendientesRcm - 0.005 ? ' Con las de los rendimientos del capital (por ejemplo, de un ETC) solo se puede restar de las ganancias hasta el 25 %.' : ''}` });
  } else add({ k: 'perd', g: 'comp', cas: '1634', t: 'Pérdidas de años anteriores', sub: 'No has apuntado ninguna en Datos fiscales.', e: 'no' });

  // deducciones: la doble imposición, si tienes acciones de fuera que pagan dividendos
  const ext = M.filas.filter((f) => f.inst.tipo === 'Acción' && f.inst.pais && f.inst.pais !== 'ES' && f.p && f.p.dividendo_pct);
  add(ext.length ? { k: 'c0588', g: 'ded', cas: '0588', t: 'Dividendos de fuera', sub: yLista([...new Set(ext.map((f) => f.inst.corto || f.inst.nombre))]), v: null, o: 'tu', e: 'listo',
    ojo: 'Lo que te retuvieron fuera por esos dividendos se resta aquí, para no pagar dos veces: como mucho, lo que habrías pagado en España por ellos (normalmente, hasta el 15 %). Sale en el informe fiscal de tu bróker.' }
    : { k: 'c0588', g: 'ded', cas: '0588', t: 'Dividendos de fuera', sub: 'No tienes acciones de fuera que paguen dividendos.', e: 'no' });

  // informativas: 720 (valores y cuentas fuera) y 721 (cripto fuera), cada bloque con su umbral de 50.000 €
  const b = bloques720(M), cr = sum(M.filas.filter((f) => f.inst.clase === 'Cripto' && esDeFuera(f.pos.plataforma)), (f) => f.valor);
  const pasa = [b.valores > 50000 && ['Valores en brókeres de fuera', b.valores, '720'], b.cuentas > 50000 && ['Cuentas fuera de España', b.cuentas, '720'], cr > 50000 && ['Cripto en exchanges de fuera', cr, '721']].filter(Boolean);
  add(pasa.length ? { k: 'm720', g: 'inf', cas: [...new Set(pasa.map((x) => x[2]))].join(' y '), t: 'Bienes y cripto fuera de España', sub: 'Algún bloque pasa de 50.000 €', v: null, o: 'tu', e: 'comprueba',
    de: pasa.map(([t, v]) => [`${t}, hoy`, v]),
    ojo: `Cuenta lo que tengas el 31 de diciembre. Se presenta del 1 de enero al 31 de marzo de ${anio + 1} y no se paga nada. Si ya lo presentaste otros años, solo vuelves si ese bloque ha subido más de 20.000 €.` }
    : { k: 'm720', g: 'inf', cas: '720 y 721', t: 'Bienes y cripto fuera de España', sub: 'Lo que tienes fuera no pasa de 50.000 € en ningún bloque.', e: 'no' });

  add({ k: 'res', g: 'sale', t: 'Lo que pagas por tus inversiones', sub: 'Con lo que sabe Toisón', e: 'sale', nav: true });
  return { anio, fa, d, L: L0 };
}

/* ---------- estado, chips ---------- */
const HZ_EST = { listo: (o) => (o === 'tu' ? ['tu', 'Lo metes tú'] : ['ok', 'Lo trae el borrador']), comprueba: () => ['mira', 'Compruébalo en el borrador'], falta: () => ['falta', 'Falta un dato'] };
const hzChipEst = (c) => { if (!HZ_EST[c.e] || c.nav) return ''; const [k, t] = HZ_EST[c.e](c.o); return `<span class="hz-est z-${k}"><i></i>${t}</span>`; };
const hzCasN = (c) => (c.cas ? `<span class="hz-cas">${c.cas}</span>` : '');
const hzSubLista = (c) => (c.nav ? `<span class="hz-sh${c.e === 'falta' ? ' z-f' : ''}">${esc(c.sub)}</span>` : c.e === 'falta' ? '<span class="hz-sh z-f">Falta un dato</span>' : c.e === 'comprueba' ? '<span class="hz-sh z-m">Mira dónde la pone</span>' : c.o === 'tu' ? '<span class="hz-sh z-t">Lo metes tú</span>' : '<span class="hz-sh">Lo trae el borrador</span>');
const hzVal = (c) => (c.v == null ? '' : c.k === 'perd' ? (c.v ? eur(c.v, 0) : '') : (c.v > 0.004 ? '+' : '') + eur(c.v, 0));
const hzIcoPaso = { listo: 'ok', comprueba: 'ok', falta: 'alerta', sale: 'der' };
// las casillas que cuentan en «X de Y listas»: las que te tocan, sin el principio ni el final
const hzCuentan = (R) => R.L.filter((c) => !c.nav && c.e !== 'no');
const hzNav = (R) => R.L.filter((c) => c.e !== 'no');

/* ---------- dónde lo dejaste (la casilla, no las cifras: va en el dispositivo) ---------- */
const HZ_LS = 'inv-hz-donde';
const hzEstado = () => S.hzR || (S.hzR = { k: null, filtro: 'todo', abierta: null, recuerda: null, dir: null });
function hzElegir(R) {
  const st = hzEstado(), nav = hzNav(R);
  if (st.k && nav.some((c) => c.k === st.k)) return;
  const g = LS.get(HZ_LS, null);
  if (g && g.a === R.anio && nav.some((c) => c.k === g.k)) { st.k = g.k; st.recuerda = g.t || null; return; }
  st.k = (nav.find((c) => c.e === 'falta' || c.e === 'comprueba') || nav[0]).k;
}
const hzGuardarDonde = (R) => LS.set(HZ_LS, { a: R.anio, k: hzEstado().k, t: Date.now() });
function hzCuando(t) {
  const d = new Date(t), h = new Date(), dias = Math.round((new Date(h.getFullYear(), h.getMonth(), h.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  return dias <= 0 ? 'hoy' : dias === 1 ? 'ayer' : dias < 7 ? `hace ${dias} días` : `el ${fechaCorta(iso(d))}`;
}

/* ---------- trozos de una casilla ---------- */
const hzCopia = (val, et) => `<button type="button" class="hz-cp" data-hz="copia" data-v="${esc(val)}" aria-label="Copiar ${esc(et)}">${hzIc('copiar')}</button>`;
const hzCampo = ([et, val], copia = true) => { const n = typeof val === 'number'; return `<div class="hz-campo"><span>${esc(et)}</span><b>${n ? hzN(val) : esc(val)}</b>${copia ? hzCopia(n ? hzCopiable(val) : val, et) : ''}</div>`; };
const hzCuenta = (filas, tot) => `<div class="hz-cuenta">${filas.map(([t, n]) => `<div><span>${esc(t)}</span><b>${hzN(n)}</b></div>`).join('')}${tot ? `<div class="z-tot"><span>${esc(tot[0])}</span><b>${eur(tot[1], 2)}</b></div>` : ''}</div>`;
function hzVenta(m, cripto) {
  const st = hzEstado(), i = S.inst[m.instrumento] || {}, on = st.abierta === m.id, ap = perdidaAplazada(m), r = hzNeto(m);
  return `<div class="hz-venta${on ? ' z-on' : ''}"><button type="button" class="hz-venta-cab" data-hz="abre" data-id="${esc(m.id)}" aria-expanded="${on}"><span><b>${esc(nombreInst(m.instrumento))}</b><small>${fmtNum(+m.uds, +m.uds % 1 ? 4 : 0)} ${cripto ? (i.simbolo || 'uds.') : +m.uds === 1 ? 'ud.' : 'uds.'} · ${fechaCorta(m.fecha)} · ${esc(m.plataforma || '')}</small></span><b class="${r < 0 ? 'hz-baja' : 'hz-sube'}">${hzSg(r)}</b>${hzIc(on ? 'abajo' : 'der', 'hz-chev')}</button>
    ${on ? `<div class="hz-venta-c">${m.coste_vendido != null ? hzCuenta([['Lo cobraste al vender, ya sin comisiones', +m.importe || 0], ['Lo que te costó, con sus comisiones', -(+m.coste_vendido || 0)]], [m.resultado < 0 ? 'Pérdida' : 'Ganancia', m.resultado || 0]) : ''}
      ${ap ? `<p class="hz-ojo"><b>Esta pérdida no cuenta entera este año.</b> Volviste a comprar ${esc(nombreInst(m.instrumento))} el ${fechaCorta(ap.fecha)}, dentro de ${ap.r.plazo}: ${eur(-ap.importe, 2)} se aplazan hasta que vendas lo recomprado. Renta Web te lo pide como pérdida no computable.</p>` : ''}
      <div class="hz-campos">${cripto ? hzCampo(['Moneda virtual', `${i.nombre || nombreInst(m.instrumento)}${i.simbolo ? ` (${i.simbolo})` : ''}`]) : hzCampo(['Entidad emisora', i.nombre || nombreInst(m.instrumento)])}${hzCampo(['Valor de transmisión', +m.importe || 0])}${m.coste_vendido != null ? hzCampo(['Valor de adquisición', +m.coste_vendido]) : ''}${hzCampo(['Fecha de transmisión', fechaEs(m.fecha)])}</div></div>` : ''}</div>`;
}
const fechaEs = (iso) => { const [a, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${a}`; };

function hzDatosPaso(R, M) {
  const d = R.d, ccaa = comunidadUsuario(), anio = R.anio;
  const plats = [...new Set([...M.filas.map((f) => f.pos.plataforma), ...M.efectivo.map((e) => e.plataforma)].filter(Boolean))];
  const INF = { 'Trade Republic': 'En la app: Perfil, Impuestos, el informe fiscal del año. Con IBAN español, sus datos llegan al borrador, aunque a veces mal colocados.', MyInvestor: 'Es español: retiene y se lo comunica a Hacienda, así que sus fondos y su cuenta suelen venir bien en el borrador. Descarga igualmente su información fiscal del año.', Bitvavo: 'Sus datos todavía no llegan a tu borrador: descarga el informe o el historial de operaciones del año y mete tú cada venta.' };
  const inf = plats.map((p) => [p, INF[p] || (hzInforma(p) ? 'Es español: lo que le toca suele venir ya en el borrador. Descarga su información fiscal del año para comprobarlo.' : 'No manda tus datos a Hacienda: descarga su informe fiscal o el historial del año y mete tú lo que salga en él.')]);
  const fila = [['Dividendos e intereses', d.rcm], ['De ellos, intereses', d.intereses], ['Retenciones', d.retenido], ['Pérdidas de años anteriores', d.pendientes], ['Ventas fuera de Toisón', d.otras]].filter(([, v]) => v != null && v !== '' && +v);
  return `<div class="hz-datos"><div><small>Comunidad</small><b>${ccaa ? esc(nombreComunidad(ccaa)) : 'Sin poner'}</b></div><div><small>Año</small><b>${anio}, se presenta en ${anio + 1}</b></div><button type="button" class="hz-enl" data-hz="ccaa">${hzIc('lapiz')}${ccaa ? 'Cambiar' : 'Ponerla'}</button></div>
    ${ccaa ? '' : `<div class="hz-falta"><span class="hz-falta-i">${hzIc('alerta')}</span><div class="hz-falta-c"><b>¿En qué comunidad vives?</b><span>La escala del ahorro es la misma en casi toda España, pero no en el País Vasco ni en Navarra, y algunas deducciones dependen de ella.</span><button type="button" class="btn peq" data-hz="ccaa">Elegir comunidad</button></div></div>`}
    <div class="hz-sec"><h4>Lo que has apuntado para ${anio}</h4>${fila.length ? hzCuenta(fila.map(([t, v]) => [t, +v])) : '<p class="hz-nota">Todavía nada. Las ventas que apuntas en Toisón ya cuentan; lo demás (dividendos, retenciones, pérdidas de otros años) va en Datos fiscales.</p>'}
      <button type="button" class="btn peq" data-hz="datos">${hzIc('lapiz')}Datos fiscales de ${anio}</button></div>
    ${inf.length ? `<div class="hz-sec"><h4>Los informes de tus brókeres</h4><div class="hz-docs">${inf.map(([p, x]) => `<div class="hz-doc">${hzIc('doc')}<span><b>${esc(p)}</b><small>${x}</small></span></div>`).join('')}</div><p class="hz-nota">Los publican entre enero y marzo de ${anio + 1}.</p></div>` : ''}`;
}

function hzResPaso(R) {
  const fa = R.fa, ret = fa.retenido, neto = fa.cuota - ret;
  return `<div class="hz-res"><b class="${neto > 0.5 ? 'hz-baja' : neto < -0.5 ? 'hz-sube' : ''}">${eur(Math.abs(neto), 0)}</b><span>${neto > 0.5 ? 'a pagar por tus inversiones' : neto < -0.5 ? 'retenidos de más por tus inversiones' : 'por tus inversiones'}</span></div>
    <p class="hz-res-f">De tus inversiones sale un impuesto de <b>${eur(fa.cuota, 0)}</b>${ret ? ` y ya te han retenido <b>${eur(ret, 0)}</b>` : ''}. Con tu sueldo, la renta entera puede salir a pagar o a devolver: eso Toisón todavía no lo calcula.</p>
    <div class="hz-sec"><h4>Cómo sale</h4>${hzCuenta([['Ventas (ganancias menos pérdidas)', fa.gp], ...(fa.usadas ? [['Pérdidas de años anteriores', -fa.usadas]] : []), ['Dividendos, intereses y ETC', fa.rcmT], ...(fa.usadasRcm ? [['Rendimientos negativos de años anteriores', -fa.usadasRcm]] : [])], ['Base del ahorro', fa.base])}
      ${hzCuenta([['Impuesto, con la escala del ahorro', fa.cuota], ['Ya retenido por tus bancos y brókeres', -ret]], [neto >= 0 ? 'Te queda por pagar' : 'Te han retenido de más', Math.abs(neto)])}</div>
    ${fa.sobra > 0 || fa.sobraRCM > 0 ? `<p class="hz-ojo">Te quedan <b>${eur(fa.sobra + fa.sobraRCM, 0)}</b> de pérdidas para restar en los cuatro años siguientes. Renta Web las guarda sola.</p>` : ''}
    <p class="hz-aviso">${hzIc('reloj')}<span><b>Es una estimación.</b> Sale de lo que has apuntado en Toisón con la escala del ahorro de ${R.anio}. La cifra que vale es la de Renta Web.</span></p>`;
}

function hzCuerpo(c, R, M) {
  if (c.k === 'datos') return hzDatosPaso(R, M);
  if (c.k === 'res') return hzResPaso(R);
  const falta = c.falta ? `<div class="hz-falta"><span class="hz-falta-i">${hzIc('alerta')}</span><div class="hz-falta-c"><b>${esc(c.falta.t)}</b><span>${c.falta.x}</span><button type="button" class="btn peq" data-hz="datos">${esc(c.falta.b)}</button></div></div>` : '';
  const ventas = c.ventas ? `<div class="hz-sec"><h4>Venta a venta: lo que vas a ver en Renta Web</h4><div class="hz-ventas">${c.ventas.map((m) => hzVenta(m, c.cripto)).join('')}</div></div>` : '';
  const deSale = c.de ? `<div class="hz-sec"><h4>De dónde sale</h4>${hzCuenta(c.de, c.tot || (c.v != null ? ['Lo tuyo', c.v] : null))}</div>` : '';
  const pone = c.pone ? `<div class="hz-sec"><h4>${c.o === 'tu' ? 'Lo que vas a teclear' : 'Lo que tiene que poner'}</h4><div class="hz-campos">${c.pone.map((x) => hzCampo(x)).join('')}</div></div>` : '';
  return `${falta}${deSale}${ventas}${pone}${c.ojo ? `<p class="hz-ojo">${c.ojo}</p>` : ''}`;
}

/* ---------- la pantalla ---------- */
function hzLista(R) {
  const st = hzEstado(), f = st.filtro;
  const pasa = (c) => f === 'todo' || (!c.nav && c.e !== 'no' && ((f === 'tu' && c.o === 'tu') || (f === 'mira' && (c.e === 'comprueba' || c.e === 'falta'))));
  const gr = []; for (const c of R.L) { if (!pasa(c)) continue; if (!gr.length || gr[gr.length - 1].g !== c.g) gr.push({ g: c.g, cs: [] }); gr[gr.length - 1].cs.push(c); }
  const filtros = `<div class="hz-filtro" role="group" aria-label="Qué ver">${[['todo', 'Todo'], ['tu', 'Metes tú'], ['mira', 'Por mirar']].map(([k, n]) => `<button type="button" data-hz="filtro" data-f="${k}" aria-pressed="${f === k}">${n}</button>`).join('')}</div>`;
  const item = (c) => {
    if (c.e === 'no') return `<li><div class="hz-paso z-gris"><span class="hz-pi">${hzIc('raya')}</span><span class="hz-pt"><b>${esc(c.t)}</b><small>${hzCasN(c)}<span class="hz-sh">No te toca</span></small></span></div></li>`;
    const e = c.e === 'falta' ? 'falta' : c.nav && c.e === 'sale' ? 'sale' : 'listo';
    return `<li><button type="button" class="hz-paso z-${e}${st.k === c.k ? ' z-on' : ''}" data-hz="ir" data-k="${c.k}"${st.k === c.k ? ' aria-current="step"' : ''}><span class="hz-pi">${hzIc(hzIcoPaso[e])}</span><span class="hz-pt"><b>${esc(c.t)}</b><small>${hzCasN(c)}${hzSubLista(c)}</small></span>${hzVal(c) ? `<em>${hzVal(c)}</em>` : ''}</button></li>`;
  };
  return `${filtros}<ol class="hz-pasos">${gr.map(({ g, cs }) => `<li class="hz-pg">${HZ_AP[g]}</li>${cs.map(item).join('')}`).join('')}
    ${f === 'todo' ? `<li class="hz-pg">Y lo demás</li><li><div class="hz-paso z-fuera"><span class="hz-pi">${hzIc('lista')}</span><span class="hz-pt"><b>Vivienda, deducciones, alquileres</b><small><span class="hz-sh">Lo revisas en Renta Web</span></small></span></div></li>` : ''}</ol>
    ${!gr.length ? `<p class="hz-vacio">${f === 'tu' ? 'Nada que tengas que meter tú: todo lo trae el borrador.' : 'Nada por mirar.'}</p>` : ''}`;
}
function hzTira(R) {
  const cs = hzCuentan(R), f = cs.filter((c) => c.e === 'falta').length, n = cs.length - f, neto = R.fa.cuota - R.fa.retenido, res = R.L.find((c) => c.k === 'res');
  return `<section class="tarjeta hz-tira"><div class="hz-tira-p"><small class="hz-ey">Renta de ${R.anio}</small><b>${n} de ${cs.length} ${cs.length === 1 ? 'casilla lista' : 'casillas listas'}${f ? ` <span class="hz-falta-t">· ${f === 1 ? 'falta 1 dato' : `faltan ${f} datos`}</span>` : ''}</b>
      <div class="hz-seg" aria-hidden="true">${cs.map((c) => `<i class="z-${c.e === 'falta' ? 'falta' : 'listo'}"></i>`).join('')}</div></div>
    <div class="hz-tira-r"><small>Por tus inversiones</small><b class="${neto > 0.5 ? 'hz-baja' : neto < -0.5 ? 'hz-sube' : ''}">${eur(Math.abs(neto), 0)} ${neto > 0.5 ? 'a pagar' : neto < -0.5 ? 'retenidos de más' : ''}</b>${res ? `<button type="button" class="hz-enl" data-hz="ir" data-k="res">Cómo sale</button>` : ''}</div></section>`;
}
function hzPanel(R, M) {
  const st = hzEstado(), nav = hzNav(R), i = nav.findIndex((c) => c.k === st.k), c = nav[i], ant = nav[i - 1], sig = nav[i + 1];
  const ey = `${HZ_AP[c.g]}${c.cas ? ` · ${/^\d+$/.test(c.cas) ? 'casilla ' : ''}${c.cas}` : ''}`;
  const tu = !c.nav && (c.v != null || HZ_EST[c.e]) ? `<div class="hz-ptu">${c.v != null ? `<small>Lo tuyo</small><b>${c.k === 'perd' ? eur(-c.v, 2) : hzSg(c.v)}</b>` : ''}${hzChipEst(c)}</div>` : '';
  return `<section class="tarjeta hz-panel${st.dir ? ' hz-entra-' + st.dir : ''}" id="hzPanel" aria-labelledby="hzTit"><div class="hz-panel-cab"><small class="hz-ey">${esc(ey)}</small>
      ${st.recuerda ? `<span class="hz-recuerda">${hzIc('reloj')}Lo dejaste aquí ${hzCuando(st.recuerda)}</span>` : ''}</div>
    <h2 class="hz-h2" id="hzTit">${esc(c.t)}</h2>${tu}${hzCuerpo(c, R, M)}
    <div class="hz-panel-pie">${ant ? `<button type="button" class="btn peq" data-hz="ir" data-k="${ant.k}">${hzIc('izq')}${esc(ant.t)}</button>` : '<span></span>'}${sig ? `<button type="button" class="btn pri peq" data-hz="ir" data-k="${sig.k}">Siguiente: ${esc(sig.t)}${hzIc('der')}</button>` : ''}</div></section>`;
}
function htmlHacienda(M) {
  const R = hzCasillas(anioRenta(), M);
  S.hzUlt = R;
  hzElegir(R);
  return `<div id="hz" class="hz-pH">${hzTira(R)}<div class="hz-A"><aside class="tarjeta hz-lista" aria-label="Las casillas de tu renta">${hzLista(R)}</aside><div class="hz-A-der">${hzPanel(R, M)}</div></div></div>`;
}
function pintarHacienda() {
  const el = $('#panelHz'); if (!el || !S.M) return;
  ponerCssHz();
  el.innerHTML = htmlHacienda(S.M);
  el.removeAttribute('aria-busy');
  hzEstado().dir = null;
  marcarCifras(el);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('#panelHz [data-hz]'); if (!b) return;
  const st = hzEstado(), R = S.hzUlt, q = b.dataset.hz;
  if (q === 'copia') { const v = b.dataset.v; try { navigator.clipboard.writeText(v); } catch (x) { /* sin permiso: queda el aviso */ } toast(`Copiado: ${v}`, 1800); return; }
  if (q === 'datos') { editarFiscal(R ? R.anio : anioRenta()); return; }
  if (q === 'ccaa') { cambiarComunidad(); return; }
  if (q === 'filtro') { st.filtro = b.dataset.f; pintarHacienda(); return; }
  if (q === 'abre') { st.abierta = st.abierta === b.dataset.id ? null : b.dataset.id; const y = scrollY; pintarHacienda(); scrollTo(0, y); return; }
  if (q === 'ir') {
    const nav = R ? hzNav(R) : [], de = nav.findIndex((c) => c.k === st.k), a = nav.findIndex((c) => c.k === b.dataset.k);
    if (a < 0) return;
    st.dir = a > de ? 'd' : 'i'; st.k = b.dataset.k; st.recuerda = null; st.abierta = null;
    if (R) hzGuardarDonde(R);
    pintarHacienda();
    const pn = $('#hzPanel'); if (pn && pn.getBoundingClientRect().top < 70) pn.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
});
