/* =========================== 0.9 · las pestañas del modo avanzado (trozo «avanzado») ===========================
   Se baja la primera vez que abres una pestaña que no es el Resumen. Todo con los cálculos que ya tiene la app:
   rentabilidadCartera (TWR y TIR), serieCartera, volatilidadSerie, caidaDetalle, fiscalAnio, lotesDe, reparto,
   empresasPorDentro… Cada tarjeta dice cómo se calcula. Sin «compra» ni «vende»: lo que supondría, y lo decide el
   usuario. Las pestañas que aún no tienen sus datos dicen qué llevarán y dónde está hoy esa información. */
const pavT = (c, titulo, cuerpo, como = '', enlace = '') => `<section class="pav-t pav-${c}"><div class="pav-et"><h2>${titulo}</h2>${enlace}</div>${cuerpo}${como ? `<p class="pav-como"><b>${L('Cómo se calcula', 'How it is worked out')} ·</b> ${como}</p>` : ''}</section>`;
const pavKpis = (xs, cols = 2) => `<div class="pav-kpis" style="--cols:${cols}">${xs.filter(Boolean).map(([k, v, c = '', s = '']) => `<div class="pav-kpi"><small>${k}</small><b class="${c}">${v}</b>${s ? `<span>${s}</span>` : ''}</div>`).join('')}</div>`;
const pavTabla = (cab, filas, clase = '') => `<div class="pav-tabla"><table class="${clase}"><thead><tr>${cab.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const pavIr = (href, t) => `<a href="${href}">${t}</a>`;
const pavNom = (f) => esc(f.inst.corto || f.inst.nombre);
const pavColor = (v, max = 6) => { const k = Math.min(1, Math.abs(v) / max); return `background: color-mix(in srgb, var(--${v >= 0 ? 'sube' : 'baja'}) ${Math.round(8 + k * 22)}%, transparent)`; };   // como mucho al 30 %: el texto encima se lee (WCAG AA)
// una barra de reparto (de 0 al máximo) o una que va a los dos lados del cero (ganado y perdido)
const pavFila = (n, v, max, col, txt) => `<div class="pav-fila"><span title="${esc(n)}">${esc(n)}</span><span class="pav-pista"><i style="left:0;width:${Math.max(0.5, Math.min(100, (v / (max || 1)) * 100)).toFixed(1)}%;background:${col}"></i></span><span>${txt}</span></div>`;
const pavDos = (n, v, max) => `<div class="pav-fila"><span title="${esc(n)}">${esc(n)}</span><span class="pav-pista"><i style="${v >= 0 ? 'left:50%' : `left:${(50 - (Math.abs(v) / (max || 1)) * 50).toFixed(1)}%`};width:${((Math.abs(v) / (max || 1)) * 50).toFixed(1)}%;background:var(--${v >= 0 ? 'sube' : 'baja'})"></i><i class="pav-cero"></i></span><span class="${cls(v)}">${eurS(v, 0)}</span></div>`;
const PAV_COL = ['var(--reparto-1)', 'var(--reparto-2)', 'var(--reparto-3)', 'var(--reparto-4)', 'var(--reparto-5)', 'var(--reparto-6)'];
const PAV_CSS = `
/* el panel de una pestaña: 12 columnas en el ordenador, una en el móvil */
.panel-av { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: var(--e3); align-items: start; margin-bottom: var(--e5); }
.panel-av > * { grid-column: 1 / -1; }
.pav-carga { grid-column: 1 / -1; }
@media (min-width: 900px) {
  .pav-c3 { grid-column: span 3; } .pav-c4 { grid-column: span 4; } .pav-c5 { grid-column: span 5; } .pav-c6 { grid-column: span 6; }
  .pav-c7 { grid-column: span 7; } .pav-c8 { grid-column: span 8; } .pav-c9 { grid-column: span 9; } .pav-c12 { grid-column: span 12; }
}
.pav-t { position: relative; min-width: 0; padding: 18px 18px 16px; border-radius: var(--r-l); background: var(--superficie); border: 1px solid var(--borde); }
.pav-et { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 12px; font: 600 11px/14px var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--texto-2); }
[data-tema="marfil"] .pav-et { font: 600 13px/16px var(--marca); color: var(--primario); border-bottom: 1px solid var(--borde); padding-bottom: 8px; background: linear-gradient(var(--oro-hilo), var(--oro-hilo)) left bottom / 40px 2px no-repeat; }
.pav-et h2 { margin: 0; font: inherit; letter-spacing: inherit; text-transform: inherit; color: inherit; }
.pav-et a, .pav-et button { font: 600 12.5px/1 var(--ui); letter-spacing: 0; text-transform: none; font-style: normal; color: var(--oro-texto); text-decoration: none; background: none; border: 0; padding: 0; cursor: pointer; }
.pav-como { margin: 12px 0 0; font-size: 12px; line-height: 1.45; color: var(--tenue); }
.pav-como b { font-weight: 650; color: var(--texto-2); }
.pav-kpis { display: grid; grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr)); gap: 14px 18px; }
@media (max-width: 760px) { .pav-kpis { --cols: 2 !important; } }
.pav-kpi small { display: block; font: 500 12px/1.3 var(--ui); color: var(--tenue); }
.pav-kpi b { display: block; margin-top: 2px; font: 600 20px/1.2 var(--ui); font-variant-numeric: tabular-nums; letter-spacing: -.01em; white-space: nowrap; }
.pav-kpi span { font-size: 12px; color: var(--texto-2); }
.pav-tabla { overflow-x: auto; }
.pav-tabla table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; font-size: 13px; }
.pav-tabla th { text-align: right; font: 600 10.5px/1.2 var(--ui); letter-spacing: .08em; text-transform: uppercase; color: var(--tenue); padding: 0 8px 10px; border-bottom: 1px solid var(--sep); white-space: nowrap; }
.pav-tabla td { text-align: right; padding: 9px 8px; border-bottom: 1px solid var(--sep); white-space: nowrap; }
.pav-tabla :is(th, td):first-child { text-align: left; padding-left: 0; }
.pav-tabla td small { display: block; font-size: 11.5px; color: var(--tenue); }
.pav-calor td { text-align: center; font-weight: 600; font-size: 12px; padding: 7px 4px; border: 2px solid var(--superficie); border-radius: 6px; }
.pav-calor th { text-align: center; }
.pav-fila { display: grid; grid-template-columns: minmax(96px, 170px) minmax(0, 1fr) minmax(72px, auto); gap: 10px; align-items: center; min-height: 32px; font-size: 13px; }
.pav-fila > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pav-fila > span:last-child { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
.pav-pista { position: relative; height: 8px; border-radius: 9px; background: var(--sep); overflow: hidden; }
.pav-pista i { position: absolute; top: 0; bottom: 0; border-radius: 9px; }
.pav-pista .pav-cero { position: absolute; top: 0; bottom: 0; left: 50%; width: 1px; background: var(--aro); }
.pav-matriz td { text-align: center; font-size: 12px; font-weight: 600; padding: 8px 4px; border: 2px solid var(--superficie); border-radius: 6px; }
.pav-matriz th { font-size: 10px; text-align: center; }
.pav-vacio { padding: 26px 20px; text-align: center; color: var(--texto-2); }
.pav-vacio h2 { margin: 0 0 8px; font: var(--titulo-estilo) var(--titulo-peso, 500) 22px/1.2 var(--titulo); letter-spacing: var(--titulo-espacio); color: var(--texto); }
.pav-vacio p { margin: 0 auto 14px; max-width: 56ch; }
.pav-lista { list-style: none; margin: 0; padding: 0; }
.pav-lista li { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 10px; padding: 9px 0; font-size: 13px; }
.pav-lista li + li { border-top: 1px solid var(--sep); }
.pav-lista b { font-weight: 650; }
.panel-av .chart { margin-top: 6px; }

.pav-kpi b.warn { color: var(--aviso); }
/* las cinco de la noche del 3 nov */
.pav-filtros { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin: 14px 0 12px; }
.pav-sel { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--texto-2); }
.pav-sel select, .pav-sel input, .pav-rebal input { min-height: 40px; padding: 0 10px; border-radius: var(--r-s); border: 1px solid var(--borde); background: var(--fondo); color: var(--texto); font: 500 14px/1 var(--ui); font-variant-numeric: tabular-nums; }
.pav-sel input { width: 96px; } .pav-rebal input { width: 74px; }
.pav-ley { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin: 8px 0 14px; font-size: 12px; color: var(--texto-2); }
.pav-ley span { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.pav-ley i { display: inline-block; width: 14px; height: 3px; border-radius: 2px; }
@media (max-width: 560px) { .pav-mov th:nth-child(4), .pav-mov td:nth-child(4) { display: none; } .pav-rebal small { display: none; } .pav-rebal input { width: 58px; } .pav-rebal th, .pav-rebal td { padding-left: 4px; padding-right: 4px; } }
.pav-warn { color: var(--aviso); }
.pnl-cab { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font: 600 15px/1.2 var(--ui); }
.pnl-cal { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.pnl-ds { font: 600 10.5px/1 var(--ui); color: var(--tenue); text-align: center; padding: 4px 0; text-transform: uppercase; letter-spacing: .04em; }
.pnl-d { min-height: 58px; padding: 5px 6px; border-radius: var(--r-s); display: grid; align-content: space-between; font-variant-numeric: tabular-nums; overflow: hidden; }
.pnl-d small { font-size: 10.5px; color: var(--texto-2); }
.pnl-d b { font: 600 12px/1.1 var(--ui); white-space: nowrap; }
.pnl-d span { font-size: 10.5px; color: var(--texto-2); white-space: nowrap; }
.pnl-d :is(span, b) i { font-style: normal; }
.pnl-d.vacio { background: color-mix(in srgb, var(--superficie) 40%, transparent); opacity: .75; }
@media (max-width: 480px) { .pnl-d { min-height: 50px; padding: 4px; } .pnl-d span { font-size: 9.5px; } .pnl-d b { font-size: 10.5px; letter-spacing: -.02em; } }
/* 0.8.3b: en 360 px, «+1.200» tampoco cabía: un punto menos de letra y de relleno */
@media (max-width: 380px) { .pnl-cal { gap: 3px; } .pnl-d { padding: 4px 3px; } .pnl-d b { font-size: 10px; letter-spacing: -.03em; } }
.mov-t { display: inline-block; padding: 2px 8px; border-radius: var(--r-p); font-size: 12px; font-weight: 600; background: color-mix(in srgb, var(--texto) 8%, transparent); }
.mov-t.compra { color: var(--sube); background: color-mix(in srgb, var(--sube) 13%, transparent); }
.mov-t.venta { color: var(--baja); background: color-mix(in srgb, var(--baja) 13%, transparent); }
.mov-pl { display: block; font-size: 11.5px; color: var(--tenue); }
.mov-f { white-space: nowrap; font-variant-numeric: tabular-nums; }
.lab-campos { margin-top: 0; }
/* 0.8.3b: en el móvil, una debajo de otra con las casillas alineadas (antes cada una empezaba donde acababa su etiqueta) */
@media (max-width: 680px) { .lab-campos { display: grid; justify-content: start; } .lab-campos .pav-sel > span { min-width: 10em; } }
/* el resultado de lo vendido, que se abre (4 nov) */
.pav-kpi-btn { display: inline-flex; align-items: center; gap: 4px; min-height: 32px; padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; text-decoration: underline dotted color-mix(in srgb, currentColor 45%, transparent); text-underline-offset: 5px; }
.pav-kpi-btn svg { width: 16px; height: 16px; opacity: .7; transition: transform .2s; }
.pav-kpi-btn[aria-expanded="true"] svg { transform: rotate(180deg); }
.pav-desg { display: grid; gap: 14px; margin: 16px 0 4px; padding: 14px 16px; border-radius: var(--r-m, 12px); background: var(--superficie-2); border: 1px solid var(--sep); }
.desg-cab, .desg-tot { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-variant-numeric: tabular-nums; }
.desg-cab { padding-bottom: 6px; font: 600 12px/1.3 var(--ui); letter-spacing: .02em; color: var(--texto-2); }
.desg-cab b { font-size: 15px; }
.pav-desg ul { list-style: none; margin: 0; padding: 0; }
.pav-desg li { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 8px 0; border-top: 1px solid var(--sep); font-variant-numeric: tabular-nums; }
.pav-desg li > span { min-width: 0; }
.pav-desg li b { font-weight: 650; }
.pav-desg li small { display: block; font-size: 12px; color: var(--tenue); }
.pav-desg li > b { white-space: nowrap; }
.desg-tot { padding-top: 10px; border-top: 1px solid var(--texto-2); font: 650 15px/1.2 var(--ui); }
/* tu reparto objetivo, rehecho (4 nov) */
.ro-vistazo { display: grid; gap: 10px; margin: 18px 0 6px; }
.ro-vistazo small { display: block; margin-bottom: 5px; font: 500 12px/1.2 var(--ui); color: var(--tenue); }
.ro-barra { display: flex; height: 14px; border-radius: 8px; overflow: hidden; background: var(--sep); gap: 2px; }
.ro-barra i { display: block; height: 100%; min-width: 2px; }
.ro-lista { margin-top: 10px; }
.ro-fila { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(118px, auto); grid-template-areas: "n paso dif" "pista pista pista"; gap: 8px 14px; align-items: center; padding: 14px 0 12px; border-bottom: 1px solid var(--sep); }
.ro-n { grid-area: n; min-width: 0; }
.ro-n b { display: flex; align-items: center; gap: 8px; font-weight: 650; font-size: 14.5px; }
.ro-n b i, .ro-dest i { flex: none; width: 10px; height: 10px; border-radius: 3px; }
.ro-n small { display: block; margin: 2px 0 0 18px; font-size: 12.5px; color: var(--tenue); font-variant-numeric: tabular-nums; }
.ro-paso { grid-area: paso; display: inline-flex; align-items: center; gap: 2px; padding: 3px; border-radius: 12px; border: 1px solid var(--borde); background: var(--fondo); }
.ro-paso button { width: 40px; height: 40px; border: 0; border-radius: 9px; background: none; color: var(--texto); font: 500 20px/1 var(--ui); cursor: pointer; }
.ro-paso button:hover:not(:disabled) { background: var(--superficie-2); }
.ro-paso button:disabled { opacity: .3; cursor: default; }
.ro-paso input { width: 52px; min-height: 40px; padding: 0; border: 0; background: none; color: var(--texto); text-align: right; font: 650 16px/1 var(--ui); font-variant-numeric: tabular-nums; -moz-appearance: textfield; }
.ro-paso input::-webkit-inner-spin-button, .ro-paso input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.ro-paso span { padding: 0 4px 0 2px; font-weight: 600; color: var(--texto-2); }
.ro-paso input.ro-tope { animation: ro-tope .5s; }
@keyframes ro-tope { 30% { color: var(--aviso); transform: translateX(-3px); } 60% { transform: translateX(3px); } }
.ro-dif { grid-area: dif; text-align: right; font-size: 13.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
.ro-dif small { display: block; font-size: 11.5px; font-weight: 500; color: var(--tenue); }
.ro-ok { color: var(--sube); font-weight: 600; }
.ro-pista { grid-area: pista; position: relative; height: 6px; border-radius: 6px; background: var(--sep); }
.ro-pista i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 6px; opacity: .85; }
.ro-pista b { position: absolute; top: -4px; bottom: -4px; width: 2px; margin-left: -1px; border-radius: 2px; background: var(--texto); }
.ro-total { display: grid; gap: 8px; margin: 16px 0 4px; }
.ro-total .ro-pista { grid-area: auto; width: 100%; height: 8px; }
.ro-total-t { display: flex; align-items: baseline; gap: 10px; font-size: 13.5px; font-variant-numeric: tabular-nums; }
.ro-total-t b { font-size: 17px; font-weight: 650; }
.ro-acc { margin-bottom: 0; }
.ro-acc select { min-width: 140px; }
.ro-dest { list-style: none; margin: 0; padding: 0; }
.ro-dest li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 12px; padding: 10px 0; border-top: 1px solid var(--sep); font-variant-numeric: tabular-nums; }
.ro-dest li:first-child { border-top: 0; }
.ro-dest span { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.ro-dest b { font-weight: 650; text-align: right; }
.ro-dest small { grid-column: 1 / -1; margin-left: 18px; font-size: 12.5px; color: var(--tenue); }
@media (max-width: 560px) { .ro-fila { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "n paso" "dif dif" "pista pista"; } .ro-dif { text-align: left; display: flex; gap: 8px; align-items: baseline; } .ro-dif small { display: inline; } }
/* 0.8.3a · Rentabilidad y Riesgo en básico: una cifra grande por tarjeta y su «¿Qué es?» */
.pab-lead { margin: 0 0 2px; font-size: 14px; line-height: 1.45; color: var(--texto-2); }
.pab { display: flex; flex-direction: column; }
.pab-cab { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font: 600 15px/1.3 var(--ui); color: var(--texto); }
.pab-cab svg { width: 18px; height: 18px; flex: none; color: var(--oro-texto); }
[data-tema="marfil"] .pab-cab { font: 600 16px/1.3 var(--marca); color: var(--primario); }
.pab-grande { margin: 2px 0 6px; font: 650 30px/1.15 var(--ui); font-variant-numeric: tabular-nums; letter-spacing: -.015em; overflow-wrap: anywhere; }
.pab-grande small { font-size: 15px; font-weight: 500; color: var(--texto-2); letter-spacing: 0; }
.pab-grande.down { color: var(--baja); } .pab-grande.warn { color: var(--aviso); }
.pab-frase { margin: 0; font: 600 24px/1.3 var(--ui); font-variant-numeric: tabular-nums; }
.pab-frase b { font-weight: 700; }
.pab-sub { margin: 6px 0 0; font-size: 13.5px; line-height: 1.5; color: var(--texto-2); }
.pab-sub b { font-weight: 650; }
.pab-que { margin: auto 0 0; padding-top: 12px; border-top: 1px solid var(--sep); font-size: 13px; line-height: 1.5; color: var(--texto-2); }
.pab > :not(.pab-que) + .pab-que { margin-top: 14px; }
.pab-que b { font-weight: 600; color: var(--oro-texto); }
.pab-escala { display: flex; gap: 5px; margin: 4px 0 10px; }
.pab-escala i { flex: 1; max-width: 28px; height: 7px; border-radius: 9px; background: var(--sep); }
.pab-escala i.on { background: var(--oro-texto); }
.pab-cifras { display: flex; flex-wrap: wrap; gap: 10px 28px; margin-top: 14px; }
.pab-cifras small { display: block; font-size: 12px; color: var(--tenue); }
.pab-cifras b { font: 600 18px/1.3 var(--ui); font-variant-numeric: tabular-nums; }
.pab-meses { display: grid; grid-template-columns: repeat(6, minmax(0, 76px)); gap: 8px; margin-top: 12px; }
@media (max-width: 560px) { .pab-meses { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.pab-meses span { padding: 7px 10px; border-radius: var(--r-s); background: var(--superficie-2); border: 1px solid var(--sep); }
.pab-meses small { display: block; font-size: 11.5px; color: var(--tenue); text-transform: capitalize; }
.pab-meses b { font-size: 14px; font-weight: 650; font-variant-numeric: tabular-nums; }
.pab-crisis { display: grid; gap: 4px; margin: 12px 0 2px; }
.pab-cr { display: grid; grid-template-columns: minmax(110px, 1.1fr) minmax(0, 1.4fr) auto; gap: 14px; align-items: center; min-height: 52px; }
.pab-cr b { display: block; font-weight: 600; font-size: 14px; }
.pab-cr small { display: block; font-size: 12px; color: var(--tenue); font-variant-numeric: tabular-nums; }
.pab-cr-v { text-align: right; white-space: nowrap; }
.pab-cr-v b { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
.pab-cr .pav-pista { height: 9px; }
.pab-pregs { display: grid; gap: 10px; }
.pab-ia.pav-c12 .pab-pregs { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.pab-preg { min-height: 48px; padding: 10px 14px; border-radius: var(--r-m, 12px); border: 1px solid var(--borde); background: var(--superficie-2); color: var(--texto); font: 500 13.5px/1.35 var(--ui); text-align: left; cursor: pointer; }
.pab-preg:hover { border-color: var(--oro-texto); }
@media (min-width: 900px) { .pab-grande { font-size: 32px; } }
@media (max-width: 560px) {
  .pab-frase { font-size: 21px; } .pab-grande { font-size: 27px; }
  .pab-cr { grid-template-columns: minmax(96px, 1fr) minmax(48px, .8fr) auto; gap: 10px; }
}
/* en el móvil, «En un mes malo» y «Tu peor caída» van de dos en dos, como en la maqueta */
@media (min-width: 380px) and (max-width: 899px) {
  .panel-av:has(.pab-escala) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .panel-av:has(.pab-escala) > .pav-c3:nth-of-type(2), .panel-av:has(.pab-escala) > .pav-c3:nth-of-type(3) { grid-column: span 1; }
  .panel-av:has(.pab-escala) > .pav-c3:nth-of-type(2) .pab-grande, .panel-av:has(.pab-escala) > .pav-c3:nth-of-type(3) .pab-grande { font-size: 23px; }
  .panel-av:has(.pab-escala) > .pav-c3:nth-of-type(2) .pab-que, .panel-av:has(.pab-escala) > .pav-c3:nth-of-type(3) .pab-que { display: none; }
}
`;
const ponerCssAv = () => { if (!$('#pavCss')) { const s = document.createElement('style'); s.id = 'pavCss'; s.textContent = PAV_CSS; document.head.appendChild(s); } };

/* Básico: «¿Qué es?» de cada bloque de Hoy, solo en básico. Va detrás del título del bloque (o al principio si no tiene) */
const QUE_ES = {
  patrimonio: ['Todo lo que tienes sumado, con el precio de ahora. La línea es cómo ha ido cambiando.', 'Everything you own added up, at today\'s price. The line is how it has changed.'],
  posiciones: ['Cada cosa en la que tienes dinero, lo que vale hoy y lo que has ganado o perdido desde que la compraste.', 'Each thing you have money in, what it is worth today and what you have gained or lost since you bought it.'],
  reparto: ['Dónde está tu dinero. Repartido entre muchos sitios, un mal año de uno pesa menos.', 'Where your money is. Spread across many places, a bad year in one weighs less.'],
  agenda: ['Lo que pasa estas semanas con lo tuyo. Lo que hagas lo decides tú.', 'What is coming up for what you own. What you do is up to you.'],
  ia: ['La IA lee tu cartera y las noticias, explica y hace cuentas. No te dice qué comprar ni vender.', 'The AI reads your portfolio and the news, explains and does the maths. It does not tell you what to buy or sell.'],
  cifras: ['Tus números de un vistazo: por plataforma, lo que metiste y lo que cobras.', 'Your numbers at a glance: by platform, what you put in and what you collect.'],
  mapa: ['Cada cuadro es una posición: más grande cuanto más vale, verde si sube y rojo si baja.', 'Each box is a holding: bigger the more it is worth, green if it rises and red if it falls.'],
  informe: ['Un resumen de las noticias del día de lo que tienes, escrito por la IA.', 'A summary of today\'s news about what you own, written by the AI.'],
  noticias: ['Los últimos titulares de las empresas y fondos que tienes.', 'The latest headlines about the companies and funds you own.'],
  movidas: ['Las empresas que más suben y bajan hoy en las bolsas.', 'The companies rising and falling most today.'],
  futuro: ['Lo que podrías tener si sigues aportando y los mercados se portan como de media. No es una promesa.', 'What you could have if you keep investing and markets behave as on average. Not a promise.'],
  metas: ['Si llegas a cada meta que te has puesto con lo que aportas.', 'Whether you reach each goal you set with what you put in.'],
  renta: ['Lo que llevas ganado este año con lo que has vendido y lo que pagarías en la renta.', 'What you have made this year from sales and what you would pay in tax.'],
  vistazo: ['Lo que dicen los números y los analistas de cada posición, en una línea.', 'What the numbers and analysts say about each holding, in one line.'],
};
function ponerQueEs(raiz) {
  for (const m of $$('[data-que-es]', raiz)) {
    const k = m.dataset.queEs, q = QUE_ES[k], blk = m.nextElementSibling; m.remove();
    if (!q || !blk) continue;
    const p = document.createElement('p'); p.className = 'que-es';
    p.innerHTML = `<b>${L('¿Qué es?', 'What is it?')}</b> ${esc(L(q[0], q[1]))}`;
    const cab = k === 'patrimonio' ? blk.querySelector('.hero-sub') : blk.querySelector('.sec-cab, .car-tabs, .iac-cab');
    if (k === 'patrimonio' && cab) cab.before(p);
    else if (cab) cab.after(p);
    else blk.prepend(p);
  }
}

const diasAtras = (n) => iso(new Date(Date.now() - n * 864e5));

function pintarPanelAv() {
  const el = $('#panelAv'); if (!el) return;
  ponerCssAv();
  const p = el.dataset.p, M = S.M || calcular();
  // 0.8.3a: en básico, Rentabilidad y Riesgo sencillos (las demás, como en el avanzado)
  const f = (modoApp() === 'basico' && { rentab: pavRentabBas, riesgo: pavRiesgoBas }[p]) || { rentab: pavRentab, riesgo: pavRiesgo, hacienda: pavHacienda, reparto: pavReparto, div: pavDiv, costes: pavCostes, pnl: pavPnl, mov: pavMov, grafico: pavGrafico, rebal: pavRebal, lab: pavLab }[p];
  let html;
  try { html = !M.filas.length ? pavSinCartera() : f ? f(M) : pavLuego(p); }
  catch (e) { console.warn(e); html = pavT('c12', L('No se ha podido calcular', 'Could not work it out'), `<p class="nota" style="margin:0">${esc(e.message || '')}</p>`); }
  // al repintar (un botón, un campo de la pestaña), el foco vuelve al mismo mando: el mismo atributo y el mismo puesto
  const ae = document.activeElement, ATTR = ['data-pnl-mes', 'data-mov-f', 'data-mov-res', 'data-graf-r', 'data-graf-pos', 'data-obj-k', 'data-obj-mas', 'data-obj-menos', 'data-obj-acc', 'data-obj-add', 'data-rebal-aport', 'data-lab'];
  const at = ae && el.contains(ae) ? ATTR.find((x) => ae.hasAttribute(x)) : null, pos = at ? $$(`[${at}]`, el).indexOf(ae) : -1;
  el.innerHTML = html; el.removeAttribute('aria-busy'); ponerPreguntale(el); marcarCifras(el);
  if (at) { const n = $$(`[${at}]`, el)[pos]; if (n && !n.disabled) n.focus({ preventScroll: true }); else { const t = el.querySelector('.pav-et h2'); if (t) { t.tabIndex = -1; t.focus({ preventScroll: true }); } } }
  requestAnimationFrame(() => dibujarPanelAv(p, M));
}
const pavSinCartera = () => `<section class="pav-t pav-c12 pav-vacio"><h2>${L('Aquí salen tus números', 'Your numbers show up here')}</h2><p>${L('En cuanto metas lo que tienes, esta pestaña se llena con tus datos.', 'As soon as you add what you own, this tab fills up with your data.')}</p><button type="button" class="btn pri" data-accion="nueva-pos">${ICONOS.mas}${L('Meter lo que tengo', 'Add what I own')}</button></section>`;

/* ---------- Lo que aún llega en las sesiones siguientes ---------- */
const PAV_LUEGO = {
  pos: [L('Todas tus posiciones en una tabla, con hasta 22 columnas a elegir (coste medio, peso frente a tu objetivo, TWR, TIR, dividendos, TER, PER, divisa…) y filtros por tipo y por bróker.', 'All your holdings in one table, with up to 22 columns to choose from and filters by type and broker.'), '#posiciones', L('Tus posiciones', 'Your holdings')],
  pnl: [L('Un calendario con lo que ganó o perdió tu cartera cada día de bolsa, la ganancia acumulada del mes, tu mejor y tu peor día y lo que más ha ganado y perdido.', 'A calendar with what your portfolio made or lost each trading day, the month so far, your best and worst day.'), '#cartera', L('La gráfica de Hoy', 'The Today chart')],
  grafico: [L('El gráfico de velas de cada posición con medias de 20, 50 y 200 días, volumen, RSI y MACD, y tus avisos de precio.', 'The candlestick chart of each holding with 20, 50 and 200-day averages, volume, RSI and MACD, and your price alerts.'), '#posiciones', L('La ficha de cada posición', 'Each holding\'s page')],
  divX: [L('Lo cobrado y lo previsto mes a mes, la rentabilidad por dividendo y sobre lo que pagaste, los próximos cobros y la retención en origen.', 'What you have collected and what is expected month by month, yield, yield on cost, upcoming payments and withholding.'), '#analisis', L('Tus números, en Análisis', 'Your numbers, in Analysis')],
  costesX: [L('La comisión de cada fondo y lo que se lleva al año y en 20 años, el más barato de su índice y lo que pagas en cada bróker.', 'Each fund\'s fee and what it takes per year and over 20 years, the cheapest of its index and what each broker charges.'), '#analisis', L('Tus números, en Análisis', 'Your numbers, in Analysis')],
  mov: [L('Todas tus operaciones con filtros (compras, ventas, dividendos, aportaciones, comisiones) y el dinero que has metido mes a mes.', 'All your transactions with filters and the money you have put in month by month.'), '#posiciones', L('Tus posiciones', 'Your holdings')],
  rebal: [L('Tu reparto objetivo frente a lo que tienes, y el cálculo de cómo quedaría con tu próxima aportación programada. Lo decides tú.', 'Your target mix against what you hold, and how it would look after your next scheduled contribution. Your call.'), '#futuro', L('Tus objetivos', 'Your goals')],
  lab: [L('¿Y si…? (aportar más, jubilarte antes, cambiar de fondo) y la prueba con el pasado de tu reparto de hoy.', 'What if…? (invest more, retire earlier, switch funds) and a backtest of your current mix.'), '#futuro', L('Lo que podrías tener', 'What you could have')],
};
function pavLuego(p) {
  const x = PAV_LUEGO[p] || [''], nom = (PEST_AV.find(([k]) => k === p) || [])[1] || '';
  return `<section class="pav-t pav-c12 pav-vacio"><h2>${esc(L(nom, (PEST_AV.find(([k]) => k === p) || [])[2] || nom))}</h2><p>${x[0]}</p><p class="nota">${L('Esta pestaña se llena en las próximas versiones. Mientras, lo tienes aquí:', 'This tab fills up in the next versions. Meanwhile, you have it here:')}</p>${x[1] ? `<a class="btn" href="${x[1]}">${x[2]}</a>` : ''}</section>`;
}

/* ---------- Rentabilidad ---------- */
// lo que ha hecho una serie de índices (idx) desde una fecha: null si la serie empieza después
function pavDesde(serie, desde, campo = 'idx') {
  if (!serie || serie.length < 2 || serie[0].d > desde) return null;
  let a = serie[0];
  for (const x of serie) { if (x.d > desde) break; a = x; }
  const z = serie[serie.length - 1];
  return a[campo] > 0 ? (z[campo] / a[campo] - 1) * 100 : null;
}
function pavBenchSerie(id, desde) {
  const h = histBench(id); if (!h || !h.length) return null;
  const s = h.filter(([d]) => d >= desde).map(([d, v]) => ({ d, idx: v }));
  const hoy = precioBenchHoy(id); if (hoy && s.length && s[s.length - 1].d < hoyIso()) s.push({ d: hoyIso(), idx: hoy });
  const antes = precioEn(h, desde, 'antes'); if (antes) s.unshift({ d: desde, idx: antes });
  return s;
}
// 0.8.3a: lo ganado, el mismo en los dos modos: subida sin vender + ventas hechas + dividendos e intereses apuntados
function pavGanado(M) {
  const ventas = sum((S.cartera.movimientos || []).filter((m) => m.tipo === 'venta'), (m) => m.resultado || 0);
  const rcm = sum(Object.values(S.cartera.fiscal || {}), (d) => +d.rcm || 0);
  return { ventas, rcm, total: M.pl + ventas + rcm };
}
function pavRentab(M) {
  const R = rentabilidadCartera(M), tw = R.twr, s = tw && tw.serie;
  const anio = new Date().getFullYear(), ini = `${anio}-01-01`;
  const per = [[L('1 mes', '1 month'), diasAtras(30)], [L('3 meses', '3 months'), diasAtras(91)], [L('Este año', 'This year'), ini], [L('1 año', '1 year'), diasAtras(365)]];
  const desde = R.desde || (s && s[0].d);
  const b = desde ? pavBenchSerie('fidelity-world', per.map(([, d]) => d).concat(desde).sort()[0]) : null;
  const fila = (nom, ser) => [nom, ...per.map(([, d]) => { const v = pavDesde(ser, d); return v == null ? '—' : `<b class="${cls(v)}">${pctS(v, 1)}</b>`; }), (() => { const v = desde ? pavDesde(ser, desde) : null; return v == null ? '—' : `<b class="${cls(v)}">${pctS(v, 1)}</b>`; })()];
  const filas = [];
  if (s) filas.push(fila(L('Tu cartera (TWR)', 'Your portfolio (TWR)'), s));
  if (b) filas.push(fila('MSCI World (EUR)', b));
  if (s && b) filas.push([L('Diferencia, en puntos', 'Difference, in points'), ...per.map(([, d]) => d).concat(desde).map((d) => { const x = pavDesde(s, d), y = pavDesde(b, d); return x == null || y == null ? '—' : `<span class="${cls(x - y)}">${masSi(x - y, 1)}${fmtNum(x - y, 1)}</span>`; })]);
  const cab = ['', ...per.map(([n]) => n), L('Desde el inicio', 'Since start')];
  const porQue = !s ? `<p class="nota" style="margin:12px 0 0">${R.sinFecha && R.sinFecha.length ? L(`La de tu cartera necesita la fecha de compra de ${esc(R.sinFecha.slice(0, 4).join(', '))}${R.sinFecha.length > 4 ? '…' : ''}: ponla en su ficha o importa tus movimientos.`, `Your portfolio's needs the purchase date of ${esc(R.sinFecha.slice(0, 4).join(', '))}.`) : L('La de tu cartera sale en cuanto haya historial suficiente.', 'Yours shows up once there is enough history.')}</p>` : '';
  const tablaPer = filas.length ? pavTabla(cab, filas) : `<p class="nota" style="margin:0">${R.sinFecha && R.sinFecha.length ? L(`Para calcularla hace falta la fecha de compra de: ${esc(R.sinFecha.slice(0, 4).join(', '))}. Ponla en su ficha.`, `It needs the purchase date of: ${esc(R.sinFecha.slice(0, 4).join(', '))}. Add it on its page.`) : L('Aún no hay historial suficiente para calcularla.', 'Not enough history yet to work it out.')}</p>`;
  const tir = R.tir != null && !R.corto ? pctS(R.tir, 1) : '—';
  const { ventas, rcm } = pavGanado(M);
  const kpis = pavKpis([
    [L('Rentabilidad por tiempo (TWR)', 'Time-weighted return (TWR)'), tw ? pctS(tw.total, 1) : '—', tw ? cls(tw.total) : '', tw && tw.anual != null ? L(`${pctS(tw.anual, 1)} al año`, `${pctS(tw.anual, 1)} a year`) : ''],
    [L('Con tus aportaciones (TIR)', 'Money-weighted (IRR)'), tir, R.tir != null ? cls(R.tir) : '', L('al año', 'a year')],
    [L('Aportado', 'Put in'), eur(R.metido || M.invertido, 0)],
    [L('Sacado', 'Taken out'), eur(R.sacado || 0, 0)],
  ], 4);
  const lado = pavKpis([
    [L('Subida de precios sin vender', 'Unrealised price gains'), eurS(M.pl, 0), cls(M.pl)],
    [L('Ventas ya hechas', 'Realised sales'), eurS(ventas, 0), cls(ventas)],
    rcm ? [L('Dividendos e intereses apuntados', 'Dividends and interest recorded'), eurS(rcm, 0), cls(rcm)] : null,
    [L('Total', 'Total'), eurS(M.pl + ventas + rcm, 0), cls(M.pl + ventas + rcm)],
  ], 2);
  // mes a mes, con la TWR: el índice a fin de cada mes frente al del mes anterior
  let calor = '';
  if (s && s.length > 20) {
    const fin = new Map(); for (const x of s) fin.set(x.d.slice(0, 7), x.idx);
    const meses = [...fin.keys()].sort(), anios = [...new Set(meses.map((m) => m.slice(0, 4)))].slice(-4);
    const prev = (m) => { const i = meses.indexOf(m); return i > 0 ? fin.get(meses[i - 1]) : s[0].idx; };
    const MS = IDIOMA === 'en' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    calor = `<div class="pav-tabla"><table class="pav-calor"><thead><tr><th></th>${MS.map((m) => `<th>${m}</th>`).join('')}<th>${L('Año', 'Year')}</th></tr></thead><tbody>${anios.map((a) => {
      let acc = 1;
      const tds = MS.map((_, i) => { const m = `${a}-${String(i + 1).padStart(2, '0')}`; if (!fin.has(m)) return '<td></td>'; const v = (fin.get(m) / prev(m) - 1) * 100; acc *= 1 + v / 100; return `<td style="${pavColor(v)}">${pctS(v, 1)}</td>`; }).join('');
      const ya = (acc - 1) * 100;
      return `<tr><th style="text-align:left">${a}</th>${tds}<td style="${pavColor(ya, 20)}"><b>${pctS(ya, 1)}</b></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
  const pos = M.filas.filter((f) => f.coste > 0).map((f) => [f.inst.corto || f.inst.nombre, f.valor - f.coste]).sort((a, b) => b[1] - a[1]);
  const maxP = Math.max(1, ...pos.map(([, v]) => Math.abs(v)));
  return [
    pavT('c12', L('Por periodo', 'By period'), kpis + `<div style="margin-top:16px">${tablaPer}</div>${porQue}`, L('La <b>TWR</b> (rentabilidad por tiempo) quita el efecto de cuándo aportas: es la que se compara con un índice. La <b>TIR</b> sí lo cuenta: lo que ha ganado tu dinero de verdad, al año. El MSCI World es su fondo indexado en euros, con los dividendos dentro. Sale «—» si aún no hay tanto historial.', '<b>TWR</b> removes the effect of when you invest: it is the one to compare with an index. <b>IRR</b> includes it: what your money really made, per year.')),
    pavT('c4', L('De dónde sale lo ganado', 'Where the gain comes from'), lado, L('Lo de las ventas sale de tus ventas apuntadas; los dividendos, de lo que pusiste en Hacienda.', 'Sales come from your recorded sales; dividends, from what you entered in Taxes.')),
    pavT('c8', L('Lo que ha aportado cada posición', 'What each holding has contributed'), pos.map(([n, v]) => pavDos(n, v, maxP)).join(''), L('Lo que vale hoy menos lo que te costó, sin lo ya vendido.', 'Value today minus cost, without what you already sold.')),
    calor ? pavT('c6', L('Mes a mes', 'Month by month'), calor, L('La rentabilidad por tiempo de cada mes; el color, más intenso cuanto más se movió.', 'The time-weighted return of each month; the stronger the colour, the bigger the move.')) : '',
    s && b ? pavT('c6', L('Contra el MSCI World', 'Against the MSCI World'), `<div class="chart" id="pavBench"></div><p class="pav-ley"><span><i style="background:var(--grafica)"></i>${L('Tu cartera (TWR)', 'Your portfolio (TWR)')}</span><span><i style="background:var(--reparto-2)"></i>MSCI World</span></p>`, L('Las dos desde tu primera compra, en %. Tu cartera, con la TWR.', 'Both since your first purchase, in %. Your portfolio, with TWR.')) : '',
  ].join('');
}

/* ---------- Riesgo ---------- */
function pavRetornos(serie) { const r = []; for (let i = 1; i < serie.length; i++) if (serie[i - 1].v > 0) r.push(serie[i].v / serie[i - 1].v - 1); return r; }
function pavCorr(a, b) {
  const n = Math.min(a.length, b.length); if (n < 20) return null;
  const ma = sum(a.slice(0, n)) / n, mb = sum(b.slice(0, n)) / n;
  let c = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; }
  return va && vb ? c / Math.sqrt(va * vb) : null;
}
// los precios de algo en las mismas fechas que la serie de tu cartera
const pavEnFechas = (h, serie) => serie.map((x) => ({ d: x.d, v: precioEn(h, x.d, 'antes') })).filter((x) => x.v);
// 0.8.3a: las cifras de riesgo, una sola vez para los dos modos (la misma cifra no puede salir distinta en básico y en avanzado)
function pavRiesgoBase(M) {
  const s = serieCartera(M, 366);
  if (s.length < 30) return null;
  const vol = volatilidadSerie(s), r1 = (s[s.length - 1].v / s[0].v - 1) * 100, rr = pavRetornos(s);
  const dias = diasEntre(s[0].d, s[s.length - 1].d) || 365;
  const hb = histBench('fidelity-world'), sb = hb ? pavEnFechas(hb, s) : [];
  const enSerie = s[s.length - 1].v;   // lo que tiene precios (sin el efectivo, que no cae)
  return { s, vol, r1, rr, dias, hb, sb, enSerie, cr: claseRiesgo(vol), volB: sb.length === s.length ? volatilidadSerie(sb) : null,
    var95: vol ? 1.645 * (vol / 100) / Math.sqrt(12) * enSerie : null, peor1: caidaMaxima(s), c10: caidaDetalle(serieCartera(M, 3650)) };
}
function pavRiesgo(M) {
  if (S.detAv) delete S.detAv.riesgo;   // sin precios sale antes: que no quede el cálculo de antes
  const B = pavRiesgoBase(M);
  if (!B) return pavT('c12', L('Riesgo', 'Risk'), `<p class="nota" style="margin:0">${L('Faltan precios del último año para calcularlo.', 'Prices for the last year are missing.')}</p>`);
  const { s, vol, r1, rr, dias, sb, enSerie, var95, peor1, c10, cr } = B;
  const k = Math.sqrt((rr.length * 365) / dias);
  const neg = rr.filter((x) => x < 0), dDown = neg.length ? Math.sqrt(sum(neg, (x) => x * x) / rr.length) * k * 100 : null;
  // con menos de un año de precios, la subida se pasa a «al año» para compararla con la volatilidad (que ya es anual)
  const r1a = dias < 330 ? (Math.pow(1 + r1 / 100, 365 / dias) - 1) * 100 : r1;
  const sharpe = vol ? r1a / vol : null, sortino = dDown ? r1a / dDown : null;
  let beta = null;
  if (sb.length === s.length) { const rb = pavRetornos(sb), n = Math.min(rr.length, rb.length), mb = sum(rb) / n, mr = sum(rr) / n; let cv = 0, vb = 0; for (let i = 0; i < n; i++) { cv += (rr[i] - mr) * (rb[i] - mb); vb += (rb[i] - mb) ** 2; } beta = vb ? cv / vb : null; }
  const top = M.filas.find((f) => f.inst.tipo === 'Acción') || M.filas[0], top5 = sum(M.filas.slice(0, 5), (f) => f.peso);
  const kp = pavKpis([
    [L('Volatilidad (1 año)', 'Volatility (1 year)'), pct(vol, 1), '', cr ? L(`riesgo ${cr} de 7`, `risk ${cr} of 7`) : ''],
    dias < 330 ? [L(`Rentabilidad (${Math.round(dias / 30)} meses)`, `Return (${Math.round(dias / 30)} months)`), pctS(r1, 1), cls(r1)] : [L('Rentabilidad (1 año)', 'Return (1 year)'), pctS(r1, 1), cls(r1)],
    ['Sharpe', sharpe == null ? '—' : fmtNum(sharpe, 2)],
    ['Sortino', sortino == null ? '—' : fmtNum(sortino, 2)],
    [L('Beta frente al MSCI World', 'Beta vs MSCI World'), beta == null ? '—' : fmtNum(beta, 2)],
    [L('Peor caída en 1 año', 'Worst drop in 1 year'), pct(peor1, 1), 'down'],
    [L('VaR 95 % (1 mes)', 'VaR 95% (1 month)'), var95 == null ? '—' : eurS(-var95, 0), 'down'],
    [top.inst.tipo === 'Acción' ? L('En una sola empresa, como mucho', 'Largest single company') : L('En una sola posición, como mucho', 'Largest single holding'), pct(top.peso, 1), top.inst.tipo === 'Acción' && top.peso > 10 ? 'warn' : '', pavNom(top)],
  ], 4);
  // si la bolsa mundial cayera un 20 %: con tu beta
  const esc20 = beta != null ? -0.2 * beta * M.totalPos : null;
  // correlación entre tus cinco mayores posiciones con precios
  const cinco = M.filas.filter((f) => histDe(f.inst.id)).slice(0, 5);
  const rets = cinco.map((f) => { const x = pavEnFechas(histDe(f.inst.id), s); return x.length === s.length ? pavRetornos(x) : null; });
  const matriz = cinco.length > 1 ? `<div class="pav-tabla"><table class="pav-matriz"><thead><tr><th></th>${cinco.map((f) => `<th title="${pavNom(f)}">${esc((f.inst.corto || f.inst.nombre).slice(0, 10))}</th>`).join('')}</tr></thead><tbody>${cinco.map((f, i) => `<tr><th style="text-align:left">${pavNom(f)}</th>${cinco.map((g, j) => { if (i === j) return '<td>—</td>'; const c = rets[i] && rets[j] ? pavCorr(rets[i], rets[j]) : null; return c == null ? '<td>·</td>' : `<td style="background: color-mix(in srgb, var(--grafica) ${Math.round(Math.max(0, c) * 55)}%, transparent)">${fmtNum(c, 2)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>` : '';
  const porPos = pavTabla([L('Posición', 'Holding'), L('Peso', 'Weight'), L('Riesgo', 'Risk'), L('Volatilidad', 'Volatility'), 'Beta'], M.filas.map((f) => [`<b>${pavNom(f)}</b>`, pct(f.peso, 1), f.p && f.p.riesgo ? `${f.p.riesgo} / 7` : '—', f.p && f.p.volatilidad != null ? pct(f.p.volatilidad, 1) : '—', f.p && f.p.fundamentales && f.p.fundamentales.beta != null ? fmtNum(f.p.fundamentales.beta, 2) : '—']));
  // lo que la IA necesita para explicar estas cifras (Carlos, 4 nov: decía «no tengo el dato de origen»): cómo sale cada una,
  // con qué números y el mismo cálculo hecho al MSCI World en las mismas fechas, para que pueda comparar
  try {
    const volB = B.volB, r1B = sb.length === s.length ? (sb[sb.length - 1].v / sb[0].v - 1) * 100 : null;
    const nomC = cinco.map((f) => f.inst.corto || f.inst.nombre);
    const pares = []; for (let i = 0; i < cinco.length; i++) for (let j = i + 1; j < cinco.length; j++) { const c = rets[i] && rets[j] ? pavCorr(rets[i], rets[j]) : null; if (c != null) pares.push(`${nomC[i]} y ${nomC[j]}: ${fmtNum(c, 2)}`); }
    S.detAv = Object.assign(S.detAv && S.detAv.uid === uidActual() ? S.detAv : { uid: uidActual() }, { riesgo: [
      `Periodo: del ${s[0].d} al ${s[s.length - 1].d} (${dias} días, ${s.length} precios de cierre de la cartera recompuesta con las posiciones de hoy; el efectivo no entra porque no cae). Valor de la parte con precio: ${eur(enSerie, 0)} de un total de ${eur(M.total, 0)}.`,
      `Volatilidad anual: ${fmtNum(vol, 1)} % (desviación típica de los cambios entre cierres, pasada a un año). Escala de riesgo 1–7 que sale: ${cr || '—'}.`,
      `Rentabilidad del periodo: ${fmtNum(r1, 1)} %${dias < 330 ? ` (al año: ${fmtNum(r1a, 1)} %)` : ''}. Sharpe = rentabilidad anual / volatilidad = ${sharpe == null ? '—' : fmtNum(sharpe, 2)} (sin restar el tipo sin riesgo). Sortino = rentabilidad anual / volatilidad solo de las bajadas (${dDown == null ? '—' : fmtNum(dDown, 1) + ' %'}) = ${sortino == null ? '—' : fmtNum(sortino, 2)}.`,
      `Beta frente al MSCI World (su fondo indexado en euros, Fidelity MSCI World): covarianza de los cambios de la cartera con los del índice entre la varianza del índice, en las mismas fechas = ${beta == null ? '— (faltan precios del índice en esas fechas)' : fmtNum(beta, 2)}.`,
      `VaR 95 % a un mes (paramétrico): 1,645 × volatilidad anual / √12 × valor con precio = 1,645 × ${fmtNum(vol, 1)} % / 3,46 × ${eur(enSerie, 0)} = ${var95 == null ? '—' : eur(var95, 0)} (${var95 == null ? '—' : fmtNum(var95 / enSerie * 100, 1)} % de esa parte). Supone que los cambios siguen una campana y que el futuro se mueve como el último año; no dice cuánto se pierde en el mes malo de cada 20.`,
      volB != null ? `El MSCI World, en las mismas fechas: volatilidad ${fmtNum(volB, 1)} %, rentabilidad ${fmtNum(r1B, 1)} %, VaR 95 % a un mes ${fmtNum(1.645 * volB / Math.sqrt(12), 1)} % (beta 1 por definición). Sirve de referencia para «lo normal» de una cartera de bolsa mundial.` : '',
      `Peor caída en el periodo: ${fmtNum(peor1, 1)} %.${c10 && c10.peor ? ` Peor caída con hasta 10 años de precios: ${fmtNum(c10.peor.pct, 1)} % (del ${c10.peor.desde} al ${c10.peor.hasta}${c10.peor.vuelve ? `, recuperada el ${c10.peor.vuelve}` : ', sin recuperar'}).` : ''}`,
      `Mayor posición: ${top.inst.corto || top.inst.nombre}, ${fmtNum(top.peso, 1)} %. Las 5 mayores: ${fmtNum(top5, 1)} %.${esc20 != null ? ` Si la bolsa mundial cae un 20 %, con esa beta: ${eur(esc20, 0)} sobre ${eur(M.totalPos, 0)} en posiciones.` : ''}`,
      pares.length ? `Correlaciones del último año (de −1 a 1) entre las ${cinco.length} mayores posiciones con precios: ${pares.join('; ')}.` : 'Correlaciones: no hay dos posiciones con precios suficientes en esas fechas.',
      `Por posición (peso, riesgo 1–7, volatilidad, beta): ${M.filas.map((f) => `${f.inst.corto || f.inst.nombre} ${fmtNum(f.peso, 1)} %, ${f.p && f.p.riesgo ? f.p.riesgo : '—'}, ${f.p && f.p.volatilidad != null ? fmtNum(f.p.volatilidad, 1) + ' %' : '—'}, ${f.p && f.p.fundamentales && f.p.fundamentales.beta != null ? fmtNum(f.p.fundamentales.beta, 2) : '—'}`).join('; ')}.`,
    ].filter(Boolean).join('\n') });
  } catch (e) { console.warn(e); }
  const caidaTxt = c10 && c10.peor ? L(`La peor de los últimos años: <b class="down">${pctS(c10.peor.pct, 1)}</b>, del ${fechaConAnio(c10.peor.desde)} al ${fechaConAnio(c10.peor.hasta)}${c10.peor.vuelve ? `; volvió a su máximo el ${fechaConAnio(c10.peor.vuelve)}` : '; todavía no ha vuelto a su máximo'}.`, `The worst in recent years: <b class="down">${pctS(c10.peor.pct, 1)}</b>.`) : '';
  return [
    pavT('c12', L('Medidas de riesgo', 'Risk measures'), kp, L('Con tus posiciones de hoy y los precios del último año. <b>Volatilidad</b>: cuánto se mueve al año. <b>Sharpe</b> y <b>Sortino</b>: lo ganado por cada punto de riesgo (Sortino solo cuenta las bajadas; aquí sin restar el tipo sin riesgo). <b>Beta</b>: cuánto se mueve cuando se mueve el MSCI World (1 = igual). <b>VaR</b>: en 19 de cada 20 meses no perderías más que eso, suponiendo que se mueve como hasta ahora.', 'With today\'s holdings and last year\'s prices.')),
    pavT('c6', L('Si pasara…', 'If it happened…'), pavKpis([
      esc20 != null ? [L('La bolsa mundial cae un 20 %', 'World stocks fall 20%'), eurS(esc20, 0), 'down', L(`con tu beta de ${fmtNum(beta, 2)}`, `with your beta of ${fmtNum(beta, 2)}`)] : null,
      c10 && c10.peor ? [L('Tu peor caída otra vez', 'Your worst drop again'), eurS(enSerie * c10.peor.pct / 100, 0), 'down', pctS(c10.peor.pct, 1)] : null,
      [L('Las 5 mayores posiciones', 'Your 5 largest holdings'), pct(top5, 1), '', L('del total', 'of the total')],
    ], 1), L('Lo que supondría en tu cartera de hoy. No es una previsión.', 'What it would mean for your portfolio today. Not a forecast.')),
    matriz ? pavT('c6', L('Cómo se mueven juntas', 'How they move together'), matriz, L('Correlación del último año, de −1 a 1: cuanto más cerca de 1, más suben y bajan a la vez.', 'Last year\'s correlation, from −1 to 1.')) : '',
    pavT('c12', L('Caída desde el máximo', 'Drop from the high'), `${caidaTxt ? `<p style="margin:0 0 8px">${caidaTxt}</p>` : ''}<div class="chart" id="pavCaida"></div>`, L('Cada día, lo lejos que estaba tu cartera de su máximo hasta entonces, con tus posiciones de hoy (hasta 10 años atrás).', 'Each day, how far your portfolio was from its high so far, with today\'s holdings.')),
    pavT('c12', L('Posición a posición', 'Holding by holding'), porPos, L('Riesgo: la escala oficial de 1 a 7. Volatilidad y beta, del último año.', 'Risk: the official 1–7 scale.')),
  ].join('');
}

/* =========================== 0.8.3a · Rentabilidad y Riesgo en básico ===========================
   Doc del básico y el avanzado (Lucía): una cifra grande por tarjeta, en euros y en frases, con su «¿Qué es?»; sin
   siglas. Las cifras salen del mismo cálculo que el avanzado (pavGanado, pavCostesBase, pavRiesgoBase): un solo
   cálculo, dos maneras de contarlo. En básico, Ingresos y costes no tienen pestaña: van como dos tarjetas aquí. */
const pabDur = (d) => L(duracion(d), d < 75 ? `${Math.round(d)} days` : d < 548 ? `${Math.round(d / 30.4)} months` : `${fmtNum(d / 365, 1)} years`);
const pabT = (c, titulo, cuerpo, que = '', id = '') => `<section class="pav-t pab pav-${c}"${id ? ` id="${id}"` : ''}><h2 class="pab-cab">${titulo}</h2>${cuerpo}${que ? `<p class="pab-que"><b>${L('¿Qué es?', 'What is it?')}</b> ${que}</p>` : ''}</section>`;
const pabLead = (t) => `<p class="pab-lead">${t}</p>`;
function pabPreguntas(qs, c = 'c4') {
  return `<section class="pav-t pab pab-ia pav-${c}"><h2 class="pab-cab">${ICONOS_PL.asistente}<span>${L('Pregúntale a la IA', 'Ask the AI')}</span></h2><div class="pab-pregs">${qs.map((q) => `<button type="button" class="pab-preg" data-accion="asesor" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div></section>`;
}

/* ---------- Rentabilidad, en básico ---------- */
function pavRentabBas(M) {
  // sin la fecha de compra de algo, lo metido con fechas se queda corto: entonces, lo que costó lo que tienes
  const R = rentabilidadCartera(M), G = pavGanado(M), metido = R.sinFecha.length || !R.metido ? M.invertido : R.metido;
  const pg = metido ? (G.total / metido) * 100 : null, tir = R.tir != null && !R.corto ? R.tir : null;
  const gana = G.total >= 0;
  const frase = `${gana ? L('Has ganado', "You've made") : L('Has perdido', "You've lost")} <b class="${cls(G.total)}">${eur(Math.abs(G.total), 0)}</b>${pg != null ? L(`, un ${pct(Math.abs(pg), 1)}`, `, ${pct(Math.abs(pg), 1)}`) : ''}.`;
  const alAnio = tir != null ? L(`Contando cuándo metiste el dinero, un <b class="${cls(tir)}">${pctS(tir, 1)}</b> al año.`, `Counting when you put the money in, <b class="${cls(tir)}">${pctS(tir, 1)}</b> a year.`)
    : R.sinFecha && R.sinFecha.length ? L(`Para saber cuánto es al año hace falta la fecha de compra de ${esc(R.sinFecha.slice(0, 3).join(', '))}${R.sinFecha.length > 3 ? '…' : ''}: ponla en su ficha.`, `To work out the yearly figure, add the purchase date of ${esc(R.sinFecha.slice(0, 3).join(', '))}.`)
    : R.corto ? L('Cuánto es al año, en cuanto lleves mes y medio: antes engañaría.', 'The yearly figure shows after six weeks: before that it would mislead.') : '';
  const cifras = `<div class="pab-cifras"><div><small>${L('Has metido', 'Put in')}</small><b>${eur(metido, 0)}</b></div><div><small>${L('Vale hoy', 'Worth today')}</small><b>${eur(M.total, 0)}</b></div>${R.sacado > 0 ? `<div><small>${L('Has sacado', 'Taken out')}</small><b>${eur(R.sacado, 0)}</b></div>` : ''}</div>`;
  const hero = pabT('c12', L('Lo que has ganado', 'What you have made'), `<p class="pab-frase">${frase}</p>${alAnio ? `<p class="pab-sub">${alAnio}</p>` : ''}${cifras}`,
    L('Lo que vale hoy lo que tienes, menos lo que te costó, más lo que ganaste al vender y los dividendos que apuntaste. «Al año» tiene en cuenta cuándo entró cada euro: no es lo mismo ganar un 10 % en un año que en cinco.', 'What you hold is worth today, minus its cost, plus what you made selling and the dividends you recorded. «A year» counts when each euro went in.'));
  const s = R.twr && R.twr.serie;
  const graf = pabT('c8', L('Lo que has metido y lo que vale', 'What you put in and what it is worth'), s && s.length > 2
    ? `<div class="chart" id="pabMetido"></div><p class="pav-ley"><span><i style="background:var(--grafica)"></i>${L('Lo que vale', 'Worth')}</span><span><i style="background:var(--texto-2)"></i>${L('Lo que has metido', 'Put in')}</span></p>`
    : `<p class="nota" style="margin:0">${R.sinFecha && R.sinFecha.length ? L('Sale en cuanto tus posiciones tengan fecha de compra.', 'It shows once your holdings have a purchase date.') : L('Sale en cuanto haya historial suficiente.', 'It shows once there is enough history.')}</p>`,
    L('La distancia entre las dos líneas es lo que has ganado (o perdido) con lo que tienes hoy; los escalones, cada vez que metiste dinero.', 'The gap between the two lines is what you have made with what you hold today; the steps, each time you put money in.'));
  // ¿y si lo hubieras metido en un indexado? Cada euro, el mismo día, en un fondo del MSCI World en euros
  const bm = R.flujos.length && !R.sinFecha.length ? benchMismoDinero(R, 'fidelity-world') : null;
  let idx;
  if (bm && !bm.sinDatos) {
    const dif = R.valor - bm.valor;
    idx = `<p class="pab-grande">${eur(bm.valor, 0)}</p><p class="pab-sub">${L(`tendrías con el mismo dinero, los mismos días, en un indexado de la bolsa mundial. Lo tuyo${M.total - R.valor > 1 ? ', sin el efectivo,' : ''} vale ${eur(R.valor, 0)}: <b class="${cls(dif)}">${eur(Math.abs(dif), 0)} ${dif >= 0 ? 'más' : 'menos'}</b>.`, `you would have with the same money, on the same days, in a world index fund. Yours${M.total - R.valor > 1 ? ', without cash,' : ''} is worth ${eur(R.valor, 0)}: <b class="${cls(dif)}">${eur(Math.abs(dif), 0)} ${dif >= 0 ? 'more' : 'less'}</b>.`)}</p>`;
  } else idx = `<p class="nota" style="margin:0">${bm && bm.desdeDatos ? L(`El indexado tiene precios desde ${fechaConAnio(bm.desdeDatos)}, y tu primera compra es anterior.`, `The index fund has prices from ${fechaConAnio(bm.desdeDatos)}; your first purchase is earlier.`) : L('Sale en cuanto tus posiciones tengan fecha de compra.', 'It shows once your holdings have a purchase date.')}</p>`;
  const indexado = pabT('c4', L('¿Y en un indexado?', 'And in an index fund?'), idx, L('Un fondo del MSCI World en euros, con los dividendos dentro y su comisión descontada. Lo de hoy no dice nada de lo que pasará.', 'An MSCI World fund in euros, dividends included and its fee taken off. Today says nothing about the future.'));
  // lo que cobras y lo que te cuesta: las dos tarjetas de Ingresos y costes
  const D = dividendosMeses(M), nomMes = (k) => { const d = deIso(k + '-01'); return IDIOMA === 'en' ? MESES_EN[d.getMonth()].slice(0, 3) : MESES[d.getMonth()]; };
  const meses = D.meses.filter((m) => m.neto >= 1);
  const cobras = pabT('c6', L('Lo que cobrarás', 'What you will collect'), D.bruto
    ? `<p class="pab-grande">≈ ${eur(D.neto, 0)}</p><p class="pab-sub">${L(`en los próximos 12 meses, ya descontado lo de Hacienda (${eur(D.bruto, 0)} antes).`, `over the next 12 months, after tax (${eur(D.bruto, 0)} before).`)}</p><div class="pab-meses">${meses.slice(0, 6).map((m) => `<span><small>${nomMes(m.k)}</small><b>${eur(m.neto, 0)}</b></span>`).join('')}</div>`
    : D.sinCal.length ? `<p class="pab-sub" style="margin-top:0">${L(`Aún no están las fechas. Lo que reparten al año: ${yLista(D.sinCal.map((x) => `${esc(x.n)} (unos ${eur(x.anual, 0)})`))}.`, `Dates not in yet. What they pay a year: ${D.sinCal.map((x) => `${esc(x.n)} (about ${eur(x.anual, 0)})`).join(', ')}.`)}</p>`
    : `<p class="pab-sub" style="margin-top:0">${L('Ninguna de tus posiciones reparte dividendo: los fondos de acumulación lo reinvierten dentro.', 'None of your holdings pays a dividend: accumulating funds reinvest it.')}</p>`,
    L('Repite lo que pagó cada empresa el último año, con lo que tienes hoy. No está prometido: lo decide cada empresa.', "Repeats what each company paid last year, with what you hold today. Not guaranteed: each company decides."), 'pab-div');
  const C = pavCostesBase(M), caro = [...C.conTer].sort((a, b) => b.valor * b.inst.ter - a.valor * a.inst.ter)[0];
  const cuesta = pabT('c6', L('Lo que te cuesta', 'What it costs you'), C.conTer.length
    ? `<p class="pab-grande">${eur(C.anual, 0)} <small>${L('al año', 'a year')}</small></p><p class="pab-sub">${L(`≈ ${eur(C.total20, 0)} en 20 años si lo de hoy se queda ahí.`, `≈ ${eur(C.total20, 0)} over 20 years if today's amount stays.`)}${caro ? L(` El que más: ${pavNom(caro)}, ${eur((caro.valor * caro.inst.ter) / 100, 0)} al año.`, ` The biggest: ${pavNom(caro)}, ${eur((caro.valor * caro.inst.ter) / 100, 0)} a year.`) : ''}</p>`
    : `<p class="pab-sub" style="margin-top:0">${L('No tienes fondos con comisión conocida.', 'No funds with a known fee.')}</p>`,
    L('La comisión de cada fondo (su TER). No te la cobran aparte: va descontada del precio, por eso no se ve.', "Each fund's fee (its TER). It isn't charged separately: it comes off the price, so you don't see it."), 'pab-costes');
  const nombres = M.filas.filter((f) => f.inst.tipo !== 'Efectivo').slice(0, 2).map((f) => f.inst.corto || f.inst.nombre);
  return [
    pabLead(L('Cuánto has ganado de verdad, lo que cobras y lo que te cuesta.', 'What you have really made, what you collect and what it costs you.')),
    hero, graf, indexado, cobras, cuesta,
    pabPreguntas([L('¿Voy bien?', 'Am I doing well?'), L('¿Por qué lo de «al año» no es lo que he ganado?', 'Why is the yearly figure not what I made?'), nombres.length ? L(`¿Cuánto me cuesta ${nombres[0]} frente a otros parecidos?`, `How much does ${nombres[0]} cost me compared with similar ones?`) : L('¿Me cobran mucho?', 'Am I paying a lot?')], 'c12'),
  ].join('');
}

/* ---------- Riesgo, en básico ---------- */
// tres crisis de verdad, con lo que tienes hoy: lo que llegó a caer cada inversión entre esas fechas (con sus precios si
// los hay; si no, lo que cayó su tipo de inversión, en euros). La cripto no existía en 2008: cuenta lo de 2022.
const PAB_CRISIS = [
  { t: 'Crisis financiera', en: 'Financial crisis', c: ['2007 a 2009', '2007 to 2009'], ini: '2007-10-09', fin: '2009-03-09', cl: { rv: -50, rf: -3, oro: -5, mp: -55, cripto: -75 } },
  { t: 'Covid', en: 'Covid', c: ['feb a mar de 2020', 'Feb to Mar 2020'], ini: '2020-02-19', fin: '2020-03-23', cl: { rv: -33, rf: -5, oro: -8, mp: -30, cripto: -50 } },
  { t: 'Tipos e inflación', en: 'Rates and inflation', c: ['2022', '2022'], ini: '2022-01-03', fin: '2022-10-12', cl: { rv: -17, rf: -13, oro: -2, mp: 0, cripto: -70 } },
];
const pabClase = (f) => { const c = f.inst.clase; return f.inst.tipo === 'Efectivo' || c === 'Efectivo' || c === 'Monetario' ? '' : c === 'Renta fija' ? 'rf' : c === 'Oro' ? 'oro' : c === 'Materias primas' ? 'mp' : c === 'Cripto' ? 'cripto' : 'rv'; };
function pabCrisis(M, x) {
  let cambio = 0, reales = 0;
  for (const f of M.filas) {
    if (!(f.valor > 0)) continue;
    const h = histDe(f.inst.id);
    let pc = null;
    if (h && h.length && h[0][0] <= x.ini) {
      const p0 = precioEn(h, x.ini, 'antes');
      if (p0) { let min = p0; for (const [d, v] of h) { if (d > x.fin) break; if (d >= x.ini && v != null && v < min) min = v; } pc = (min / p0 - 1) * 100; reales += f.valor; }
    }
    if (pc == null) { const k = pabClase(f); pc = k ? x.cl[k] : 0; }
    cambio += (f.valor * pc) / 100;
  }
  return { cambio, pct: M.total ? (cambio / M.total) * 100 : 0, reales };
}
function pavRiesgoBas(M) {
  if (S.detAv) delete S.detAv.riesgo;
  const B = pavRiesgoBase(M);
  if (!B) return pabLead(L('Cuánto se mueve tu cartera y qué pasaría en una mala racha.', 'How much your portfolio moves and what a bad spell would mean.')) + pabT('c12', L('Riesgo', 'Risk'), `<p class="nota" style="margin:0">${L('Faltan precios del último año para calcularlo.', 'Prices for the last year are missing.')}</p>`);
  const { vol, cr, volB, var95, c10 } = B, crB = claseRiesgo(volB);
  const puntos = `<div class="pab-escala" role="img" aria-label="${L(`${cr} de 7`, `${cr} of 7`)}">${[1, 2, 3, 4, 5, 6, 7].map((i) => `<i${i <= cr ? ' class="on"' : ''}></i>`).join('')}</div>`;
  const comp = crB == null ? '' : cr === crB ? L('Lo normal en una cartera de bolsa mundial', 'Normal for a world stock portfolio') + (vol < volB * 0.9 ? L('; algo menos que el MSCI World', '; a bit less than the MSCI World') : vol > volB * 1.1 ? L('; algo más que el MSCI World', '; a bit more than the MSCI World') : '') + '.'
    : cr < crB ? L(`Menos que una cartera de bolsa mundial (un ${crB}).`, `Less than a world stock portfolio (a ${crB}).`) : L(`Más que una cartera de bolsa mundial (un ${crB}).`, `More than a world stock portfolio (a ${crB}).`);
  const t1 = pabT('c3', L('Cuánto se mueve', 'How much it moves'), `${puntos}<p class="pab-grande">${L(`${cr} de 7`, `${cr} of 7`)}</p>${comp ? `<p class="pab-sub">${comp}</p>` : ''}`,
    L('La escala de los folletos de los fondos: 1 casi no se mueve, 7 se mueve muchísimo.', 'The scale on fund factsheets: 1 barely moves, 7 moves a lot.'));
  const t2 = pabT('c3', L('En un mes malo', 'In a bad month'), `<p class="pab-grande down">${var95 == null ? '—' : eurS(-var95, 0)}</p><p class="pab-sub">${L('Uno de cada veinte meses puede ser así o peor.', 'One month in twenty can be like this or worse.')}</p>`,
    L('Una estimación con lo que se ha movido tu cartera el último año. No es un límite: puede ser peor.', 'An estimate from how your portfolio moved over the last year. Not a limit: it can be worse.'));
  const p = c10 && c10.peor, dd = (a, b) => Math.round((tiempoDe(b) - tiempoDe(a)) / 864e5);
  const t3 = pabT('c3', L('Tu peor caída', 'Your worst drop'), p ? `<p class="pab-grande down">${pctS(p.pct, 1)}</p><p class="pab-sub">${L(`Del ${fechaConAnio(p.desde)} al ${fechaConAnio(p.hasta)}.`, `From ${fechaConAnio(p.desde)} to ${fechaConAnio(p.hasta)}.`)} ${p.vuelve ? L(`Volvió a su máximo en ${pabDur(dd(p.hasta, p.vuelve))}.`, `It got back to its high in ${pabDur(dd(p.hasta, p.vuelve))}.`) : L('Todavía no ha vuelto a su máximo.', "It hasn't got back to its high yet.")}</p>` : `<p class="pab-sub" style="margin-top:0">${L('Con lo que tienes hoy, no ha tenido caídas que contar.', 'With what you hold today, no drops worth mentioning.')}</p>`,
    L('Lo más que ha bajado desde un máximo hasta el punto más bajo, con lo que tienes hoy y hasta 10 años atrás.', 'The most it has fallen from a high to the lowest point, with what you hold today, up to 10 years back.'));
  const acc = M.filas.find((f) => f.inst.tipo === 'Acción'), mayor = M.filas.find((f) => f.inst.tipo !== 'Efectivo') || M.filas[0];
  const repartido = (f) => f && f !== acc && f.inst.tipo !== 'Acción' && f.inst.clase === 'Renta variable';
  const t4 = acc
    ? pabT('c3', L('La empresa que más pesa', 'Your largest company'), `<p class="pab-grande${acc.peso > 10 ? ' warn' : ''}">${pavNom(acc)}, ${pct(acc.peso, 1)}</p>${repartido(mayor) ? `<p class="pab-sub">${L(`${pavNom(mayor)} pesa más (${pct(mayor.peso, 0)}), pero va repartido en muchas empresas.`, `${pavNom(mayor)} weighs more (${pct(mayor.peso, 0)}), but it is spread across many companies.`)}</p>` : ''}`,
      L('Cuanto más pesa una sola cosa, más depende tu cartera de ella.', 'The more one thing weighs, the more your portfolio depends on it.'))
    : pabT('c3', L('Lo que más pesa', 'Your largest holding'), `<p class="pab-grande">${pct(mayor.peso, 1)}</p><p class="pab-sub">${pavNom(mayor)}${repartido(mayor) ? L(': va repartido en muchas empresas.', ': spread across many companies.') : '.'}</p>`,
      L('Cuanto más pesa una sola cosa, más depende tu cartera de ella.', 'The more one thing weighs, the more your portfolio depends on it.'));
  const cs = PAB_CRISIS.map((x) => ({ x, r: pabCrisis(M, x) })), maxC = Math.max(1, ...cs.map((y) => Math.abs(y.r.pct)));
  const crisis = pabT('c8', L('Si pasara otra vez', 'If it happened again'), `<p class="pab-sub" style="margin-top:0">${L('Con tu cartera de hoy y lo que cayó cada cosa entonces.', 'With your portfolio of today and what each thing fell back then.')}</p><div class="pab-crisis">${cs.map(({ x, r }) => `<div class="pab-cr"><span><b>${L(x.t, x.en)}</b><small>${L(x.c[0], x.c[1])}</small></span><span class="pav-pista"><i style="left:0;width:${Math.max(1, (Math.abs(r.pct) / maxC) * 100).toFixed(1)}%;background:var(--${r.cambio < 0 ? 'baja' : 'sube'})"></i></span><span class="pab-cr-v"><b class="${cls(r.cambio)}">${eurS(r.cambio, 0)}</b><small>${pctS(r.pct, 1)}</small></span></div>`).join('')}</div><p class="pab-sub">${L('No quiere decir que vaya a pasar, ni que vaya a ser igual.', "It doesn't mean it will happen, or that it would be the same.")}</p>`,
    L('Con los precios de entonces de lo que tienes cuando los hay; si no, con lo que cayó su tipo de inversión (la bolsa mundial, la renta fija, el oro…) en euros. La cripto no existía en 2008: cuenta como en 2022.', 'With the prices back then of what you hold where available; otherwise with what its kind of investment fell, in euros. Crypto did not exist in 2008: it counts as in 2022.'));
  const acciones = M.filas.filter((f) => f.inst.tipo === 'Acción').slice(0, 2).map((f) => f.inst.corto || f.inst.nombre);
  const ia = pabPreguntas([L('¿Por qué mi cartera cae menos (o más) que la bolsa?', 'Why does my portfolio fall less (or more) than the market?'), acciones.length ? L(`¿Cuánto del riesgo viene de ${acciones.join(' y ')}?`, `How much of the risk comes from ${acciones.join(' and ')}?`) : L('¿De dónde viene el riesgo de mi cartera?', 'Where does my portfolio risk come from?'), L('¿Cómo aguantaría otra caída como la de 2022?', 'How would it cope with another fall like 2022?')]);
  const larga = serieCartera(M, 3650);
  const desde = larga.length > 30 ? pabT('c12', L(`Tu cartera desde ${larga[0].d.slice(0, 4)}`, `Your portfolio since ${larga[0].d.slice(0, 4)}`), '<div class="chart" id="pabDesde"></div>', L('Lo que habría valido cada día lo que tienes hoy (no cuenta cuándo compraste). La marca, tu peor caída.', 'What what you hold today would have been worth each day. The mark, your worst drop.')) : '';
  // lo que la IA necesita para explicar estas tarjetas («explícame esta cifra»)
  try {
    S.detAv = Object.assign(S.detAv && S.detAv.uid === uidActual() ? S.detAv : { uid: uidActual() }, { riesgo: [
      `Modo básico. Escala de riesgo 1–7 (la de los folletos, por la volatilidad anual de ${fmtNum(vol, 1)} % del último año): ${cr}${crB ? `; el MSCI World en las mismas fechas, ${crB} (volatilidad ${fmtNum(volB, 1)} %)` : ''}.`,
      var95 == null ? '' : `«En un mes malo»: VaR 95 % a un mes paramétrico = 1,645 × volatilidad anual / √12 × valor con precio (${eur(B.enSerie, 0)}) = ${eur(var95, 0)}. Uno de cada veinte meses podría ser así o peor; no es un límite.`,
      p ? `Peor caída con hasta 10 años de precios y las posiciones de hoy: ${fmtNum(p.pct, 1)} % (del ${p.desde} al ${p.hasta}${p.vuelve ? `, recuperada el ${p.vuelve}` : ', sin recuperar'}).` : '',
      `Mayor empresa: ${acc ? `${acc.inst.corto || acc.inst.nombre}, ${fmtNum(acc.peso, 1)} %` : 'ninguna acción suelta'}. Mayor posición: ${mayor.inst.corto || mayor.inst.nombre}, ${fmtNum(mayor.peso, 1)} %.`,
      `Crisis con la cartera de hoy (lo que llegó a caer cada posición entre esas fechas con sus precios si los hay; si no, la caída de su tipo en euros: ${PAB_CRISIS.map((x) => `${x.t} renta variable ${x.cl.rv} %, renta fija ${x.cl.rf} %, oro ${x.cl.oro} %, cripto ${x.cl.cripto} %`).join('; ')}): ${cs.map(({ x, r }) => `${x.t} (${x.ini} a ${x.fin}) ${eur(r.cambio, 0)}, ${fmtNum(r.pct, 1)} % del total; con precios reales ${eur(r.reales, 0)} de ${eur(M.total, 0)}`).join('; ')}.`,
    ].filter(Boolean).join('\n') });
  } catch (e) { console.warn(e); }
  return [pabLead(L('Cuánto se mueve tu cartera y qué pasaría en una mala racha.', 'How much your portfolio moves and what a bad spell would mean.')), t1, t2, t3, t4, crisis, ia, desde].join('');
}

/* ---------- Hacienda ---------- */
const PAV_FUERA = /trade ?republic|interactive|revolut|degiro|scalable|etoro|xtb|freedom|lightyear|trading ?212|bitvavo|binance|coinbase|kraken/i;
function pavHacienda(M) {
  const anio = new Date().getFullYear(), fa = fiscalAnio(anio);
  const pagar = Math.max(0, fa.cuota - fa.retenido);
  // lotes y lo que supondría venderlos hoy (FIFO, con tu tramo de ahora)
  const lotes = [];
  for (const f of M.filas) {
    if (!f.precio || f.inst.tipo === 'Efectivo') continue;
    for (const l of lotesDe(f.pos)) { if (!(l.u > 1e-9)) continue; const v = l.u * f.precio; lotes.push({ f, l, v, g: v - l.c }); }
  }
  const gTotal = sum(lotes, (x) => x.g), siTodo = impuestoDeVenta(gTotal).impuesto;
  lotes.sort((a, b) => Math.abs(b.g) - Math.abs(a.g));
  const tabla = pavTabla([L('Posición', 'Holding'), L('Compra', 'Bought'), L('Coste → hoy', 'Cost → today'), L('Ganancia', 'Gain'), L('Si lo vendieras', 'If you sold it')], lotes.slice(0, 14).map(({ f, l, v, g }) => [`<b>${pavNom(f)}</b>`, `${l.f ? fechaConAnio(l.f) : '—'}<small>${fmtNum(l.u, l.u < 10 ? 4 : 2)} ${L('uds.', 'units')}${l.mezcla ? L(' · coste medio', ' · average cost') : ''}</small>`, `${eur(l.c, 0)}<small>${eur(v, 0)}</small>`, `<span class="${cls(g)}">${eurS(g, 0)}</span>`, g > 0 ? `≈ ${eur(impuestoDeVenta(g).impuesto, 0)}` : `<small>${L('compensaría', 'would offset')}</small>`]))
    + (lotes.length > 14 ? `<p class="pav-como" style="margin-top:8px">${L(`Y ${lotes.length - 14} lotes más, más pequeños.`, `And ${lotes.length - 14} smaller lots.`)}</p>` : '');
  const fuera = (pred) => sum(M.filas.filter((f) => PAV_FUERA.test(f.pos.plataforma || '') && pred(f)), (f) => f.valor);
  const cripto = fuera((f) => f.inst.clase === 'Cripto'), valores = fuera((f) => f.inst.clase !== 'Cripto');
  const aviso = (cuanto, mod, que) => L(`${que}: hoy ${eur(cuanto, 0)}. El modelo ${mod} (informativo) toca por encima de 50.000 € a 31 de diciembre. ${cuanto > 50000 ? '<b>Con lo de hoy, lo superarías.</b>' : 'Con lo de hoy, no te toca.'}`, `${que}: ${eur(cuanto, 0)} today. Form ${mod} applies above €50,000 on 31 December.`);
  const avisos = [
    ['31 dic', L(`Cierra el año fiscal: lo que vendas después cuenta para la renta de ${anio + 1}.`, `The tax year ends: what you sell afterwards counts for ${anio + 1}.`)],
    [L('Fondos', 'Funds'), L('El traspaso entre fondos no paga impuestos; vender un ETF o una acción, sí.', 'Switching between funds is tax-free; selling an ETF or a share is not.')],
    [L('2 meses', '2 months'), L('Si vendes con pérdidas y recompras lo mismo en los dos meses de antes o de después, esa pérdida se aplaza.', 'If you sell at a loss and buy the same back within two months, that loss is deferred.')],
    ['721', aviso(cripto, '721', L('Cripto en exchanges de fuera de España', 'Crypto on exchanges outside Spain'))],
    ['720', aviso(valores, '720', L('Valores en brókers de fuera de España', 'Securities at brokers outside Spain'))],
  ];
  return [
    pavT('c12', L(`Renta de ${anio} (se presenta entre abril y junio de ${anio + 1})`, `${anio} tax return`), pavKpis([
      [L('Ganancias y pérdidas por ventas', 'Gains and losses from sales'), eurS(fa.gp, 0), cls(fa.gp)],
      [L('Dividendos e intereses', 'Dividends and interest'), eur(fa.rcm, 0)],
      [L('Pérdidas de años anteriores', 'Losses from earlier years'), eur(fa.pendientes, 0), '', fa.usadas ? L(`usas ${eur(fa.usadas, 0)}`, `using ${eur(fa.usadas, 0)}`) : ''],
      [L('Base del ahorro', 'Savings tax base'), eur(fa.base, 0)],
      [L('Impuesto', 'Tax'), eur(fa.cuota, 0), '', L(`tramo del ${pctTramo(fa.marginal)} %`, `${pctTramo(fa.marginal)}% bracket`)],
      [L('Ya retenido', 'Already withheld'), eur(fa.retenido, 0)],
      [L('Te saldría a pagar', 'You would owe'), `≈ ${eur(pagar, 0)}`, pagar > 0 ? 'warn' : ''],
      [L('Para compensar más adelante', 'To offset later'), eur(fa.sobra, 0)],
    ], 4), L(`Con tus ventas apuntadas y lo que pusiste en Hacienda (dividendos, retenciones, pérdidas de otros años). Tramos del ahorro: ${textoTramos()}. Es un cálculo, no asesoramiento fiscal.`, 'With your recorded sales and what you entered in Taxes. It is a calculation, not tax advice.'), pavIr('#fiscal', L('Hacienda', 'Taxes'))),
    pavT('c8', L('Tus lotes y lo que supondría vender cada uno', 'Your lots and what selling each would mean'), (lotes.length ? tabla : `<p class="nota" style="margin:0">${L('Sin lotes con precio.', 'No priced lots.')}</p>`) + `<p class="pav-como" style="margin-top:10px">${L(`Si vendieras todo hoy: ganancia de ${eurS(gTotal, 0)} e impuesto de ≈ ${eur(siTodo, 0)} (sumado a lo que ya llevas este año).`, `If you sold everything today: a gain of ${eurS(gTotal, 0)} and tax of ≈ ${eur(siTodo, 0)}.`)}</p>`, L('FIFO: al vender, sale primero lo que compraste antes. Cada lote, como si lo vendieras solo, con lo que llevas este año. Lo decides tú.', 'FIFO: what you bought first goes first. Each lot as if sold on its own. Your call.')),
    pavT('c4', L('Avisos', 'Reminders'), `<ul class="pav-lista">${avisos.map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('')}</ul>`, L('Los de fuera se miran por el nombre del bróker o del exchange que pusiste en cada posición. Es información, no asesoramiento fiscal.', 'Foreign ones are detected from the broker name on each holding.')),
  ].join('');
}

/* ---------- Reparto y X-Ray ---------- */
function pavReparto(M) {
  const g = (titulo, dim, base) => {
    const r = reparto(M, dim, base).filas; if (!r.length) return '';
    const top = r.slice(0, 6), resto = r.slice(6), filas = resto.length ? [...top.slice(0, 5), { k: L('Otros', 'Other'), pct: sum(resto, (x) => x.pct) + top[5].pct }] : top;
    const max = Math.max(...filas.map((x) => x.pct));
    return pavT('c4', titulo, filas.map((x, i) => pavFila(String(x.k), x.pct, max, PAV_COL[i % 6], pct(x.pct, 1))).join(''));
  };
  const d = empresasPorDentro(M), emp = d.filas.slice(0, 12);
  const top5 = sum(M.filas.slice(0, 5), (f) => f.peso);
  const xray = emp.length ? pavTabla([L('Empresa', 'Company'), L('Cómo la tienes', 'How you hold it'), L('Valor', 'Value'), L('Del total', 'Of total')], emp.map((x) => [`<b>${esc(x.n)}</b>`, x.directa ? L('Directa', 'Direct') : L('Dentro de tus fondos', 'Inside your funds'), eur(x.v, 0), pct(M.total ? (x.v / M.total) * 100 : 0, 1)])) : '';
  const sol = htmlSolapes(M);
  return [
    g(L('Por clase de activo', 'By asset class'), 'clase'),
    g(L('Por región', 'By region'), 'region'),
    g(L('Por sector (renta variable)', 'By sector (equities)'), 'sector', 'rv'),
    g(L('Por tipo de producto', 'By product type'), 'producto'),
    g(L('Por bróker', 'By broker'), 'plataforma'),
    pavT('c4', L('Concentración', 'Concentration'), pavKpis([
      [L('Posiciones', 'Holdings'), String(M.filas.length)],
      ...(() => { const a = M.filas.find((f) => f.inst.tipo === 'Acción'); return [[L('La mayor posición', 'Largest holding'), pct(M.filas[0].peso, 1), '', pavNom(M.filas[0])], a ? [L('La mayor empresa suelta', 'Largest single company'), pct(a.peso, 1), a.peso > 10 ? 'warn' : '', pavNom(a)] : null]; })(),
      [L('Las 5 mayores', 'The 5 largest'), pct(top5, 1)],
      [L('Empresas contadas', 'Companies counted'), String(d.filas.length), '', L('con las 10 mayores de cada fondo', 'with the top 10 of each fund')],
    ], 2), L('Un fondo indexado ya va repartido por dentro; por encima del 10 % en una sola empresa, una mala noticia suya se nota en toda la cartera.', 'Above 10% in one holding, its bad news shows across the portfolio.')),
    xray ? pavT('c8', L('X-Ray: las empresas que tienes de verdad', 'X-Ray: the companies you really own'), xray, L('Suma las acciones que tienes sueltas y las que van dentro de tus fondos indexados (las 10 mayores de cada uno, con sus pesos publicados).', 'Adds your direct shares and those inside your index funds (top 10 of each).')) : '',
    sol ? pavT('c4', L('¿Se pisan tus fondos?', 'Do your funds overlap?'), sol.replace(/<h3[^>]*>.*?<\/h3>/, '')) : '',
  ].join('');
}

/* ---------- Dividendos ---------- */
function pavDiv(M) {
  const D = dividendosMeses(M), hoy = hoyIso();
  const con = M.filas.filter((f) => f.p && f.p.dividendo_pct);
  const prox = con.filter((f) => f.p.ex_dividendo && f.p.ex_dividendo >= hoy).sort((a, b) => (a.p.ex_dividendo < b.p.ex_dividendo ? -1 : 1));
  const rcm = fiscalAnio(new Date().getFullYear()).rcm;
  const kp = pavKpis([
    [L('Previsto los próximos 12 meses', 'Expected next 12 months'), eur(D.bruto, 0), '', L(`${eur(D.neto, 0)} netos`, `${eur(D.neto, 0)} net`)],
    [L('Al año, con el precio de hoy', 'Per year, at today\'s price'), eur(M.dividendos, 0), '', L('brutos', 'gross')],
    [L('Rentabilidad por dividendo', 'Dividend yield'), pct(M.total ? (M.dividendos / M.total) * 100 : 0, 2)],
    [L('Sobre lo que pagaste', 'Yield on cost'), pct(M.invertido ? (M.dividendos / M.invertido) * 100 : 0, 2)],
    [L('Cobrado este año (apuntado)', 'Collected this year (recorded)'), eur(rcm, 0), '', L('en Hacienda', 'in Taxes')],
    [L('Posiciones que reparten', 'Holdings that pay'), `${con.length} de ${M.filas.length}`],
  ], 2);
  const d12 = htmlDividendos12(M);
  const tabla = con.length ? pavTabla([L('Posición', 'Holding'), L('Dividendo', 'Yield'), L('Al año', 'Per year'), L('Próximo', 'Next ex-date')], con.sort((a, b) => b.valor * b.p.dividendo_pct - a.valor * a.p.dividendo_pct).map((f) => [`<b>${pavNom(f)}</b>`, pct(f.p.dividendo_pct, 1), eur((f.valor * f.p.dividendo_pct) / 100, 0), f.p.ex_dividendo && f.p.ex_dividendo >= hoy ? fechaConAnio(f.p.ex_dividendo) : '—'])) : `<p class="nota" style="margin:0">${L('Ninguna de tus posiciones reparte dividendo (los fondos de acumulación lo reinvierten dentro).', 'None of your holdings pays a dividend (accumulating funds reinvest it).')}</p>`;
  return [
    pavT('c4', L('Tus números', 'Your numbers'), kp, L('Dividendos brutos de los últimos 12 meses de cada posición sobre su precio de hoy. Lo cobrado sale de lo que pusiste en Hacienda.', 'Gross dividends of the last 12 months on today\'s price.')),
    pavT('c8', L('Mes a mes, lo previsto', 'Month by month, expected'), d12 || `<p class="nota" style="margin:0">${L('Sin cobros previstos.', 'No expected payments.')}</p>`, L('Con las fechas de pago del año pasado y lo anunciado. Ni prometido ni seguro: lo decide cada empresa. Lo neto descuenta la retención española (19 %) y la del país de origen que no se recupera.', 'Based on last year\'s dates and what has been announced. Not guaranteed.')),
    pavT('c12', L('Posición a posición', 'Holding by holding'), tabla + (prox.length ? `<p class="pav-como" style="margin-top:10px">${L(`El próximo: ${pavNom(prox[0])}, el ${fechaConAnio(prox[0].p.ex_dividendo)} (fecha ex-dividendo: hay que tenerla el día antes).`, `Next: ${pavNom(prox[0])}, on ${fechaConAnio(prox[0].p.ex_dividendo)}.`)}</p>` : '')),
  ].join('');
}

/* ---------- Costes ---------- */
// 0.8.3a: lo que cuestan los fondos, una vez para los dos modos
function pavCostesBase(M) {
  const conTer = M.filas.filter((f) => f.inst.ter != null);
  const anual = sum(conTer, (f) => (f.valor * f.inst.ter) / 100), base = sum(conTer, (f) => f.valor);
  let r = 7; try { r = cfgProy().bolsa; } catch (e) {}
  // lo que se llevaría la comisión en 20 años si lo de hoy creciera a la rentabilidad media que usas en la proyección
  const en20 = (v, ter) => { let x = v, c = 0; for (let i = 0; i < 20; i++) { const g = x * ter / 100; c += g; x = x * (1 + r / 100) - g; } return c; };
  const total20 = sum(conTer, (f) => en20(f.valor, f.inst.ter));
  const comis = sum((S.cartera.movimientos || []).filter((m) => String(m.fecha || '').startsWith(String(new Date().getFullYear()))), (m) => +m.gastos || +m.comision || 0);
  return { conTer, anual, base, r, en20, total20, comis };
}
function pavCostes(M) {
  const { conTer, anual, base, r, en20, total20, comis } = pavCostesBase(M);
  const tabla = conTer.length ? pavTabla([L('Fondo', 'Fund'), 'TER', L('Al año', 'Per year'), L('En 20 años*', 'Over 20 years*')], [...conTer].sort((a, b) => b.valor * b.inst.ter - a.valor * a.inst.ter).map((f) => [`<b>${pavNom(f)}</b>`, pct(f.inst.ter, 2), eur((f.valor * f.inst.ter) / 100, 2), `≈ ${eur(en20(f.valor, f.inst.ter), 0)}`])) : `<p class="nota" style="margin:0">${L('No tienes fondos con comisión conocida.', 'No funds with a known fee.')}</p>`;
  const sinTer = M.filas.filter((f) => f.inst.ter == null && f.inst.tipo !== 'Acción' && f.inst.clase !== 'Cripto');
  return [
    pavT('c4', L('Lo que pagas', 'What you pay'), pavKpis([
      [L('Comisión media de tus fondos (TER)', 'Average fund fee (TER)'), pct(base ? (anual / base) * 100 : 0, 2)],
      [L('Al año, en euros', 'Per year, in euros'), eur(anual, 0)],
      [L('En 20 años', 'Over 20 years'), `≈ ${eur(total20, 0)}`, 'warn'],
      comis ? [L('Comisiones de compra y venta este año', 'Trading fees this year'), eur(comis, 2), '', L('apuntadas', 'recorded')] : null,
    ], 1), L(`La TER ya va descontada del precio del fondo: no te la cobran aparte. En 20 años, con lo de hoy creciendo un ${fmtNum(r, 1)} % al año (la media de tu proyección).`, `The TER is already taken from the fund price. Over 20 years, with today's value growing ${fmtNum(r, 1)}% a year.`)),
    pavT('c8', L('Fondo a fondo', 'Fund by fund'), tabla + (sinTer.length ? `<p class="pav-como" style="margin-top:10px">${L(`Sin comisión conocida: ${sinTer.map(pavNom).join(', ')}.`, `Fee unknown: ${sinTer.map(pavNom).join(', ')}.`)}</p>` : ''), L('*Lo que se llevaría la comisión si lo de hoy siguiera ahí 20 años. Cambiar de fondo puede tener coste en Hacienda: el traspaso entre fondos no paga impuestos; entre ETF, sí. Lo decides tú.', '*What the fee would take if today\'s amount stayed 20 years. Your call.')),
  ].join('');
}

/* ---------- Las gráficas, una vez pintado (con su ancho de verdad) ---------- */
function dibujarPanelAv(p, M) {
  if (modoApp() === 'basico' && (p === 'rentab' || p === 'riesgo')) { dibujarPanelBas(p, M); return; }
  if (p === 'rentab') {
    const el = $('#pavBench'), R = rentabilidadCartera(M), s = R.twr && R.twr.serie; if (!el || !s) return;
    const b = pavBenchSerie('fidelity-world', s[0].d); if (!b) return;
    const b0 = b[0].idx;
    grafLinea(el, [{ datos: s.map((x) => ({ d: x.d, v: (x.idx - 1) * 100 })), color: 'var(--grafica)', nombre: L('Tu cartera (TWR)', 'Your portfolio (TWR)') }, { datos: b.map((x) => ({ d: x.d, v: (x.idx / b0 - 1) * 100 })), color: 'var(--reparto-2)', nombre: 'MSCI World' }], { alto: 220, sinRef: true, titulo: L('Tu cartera frente al MSCI World', 'Your portfolio vs the MSCI World'), fmt: (v) => pctS(v, 1), ejeFmt: (t) => `${fmtNum(t, 0)} %` });
  }
  if (p === 'grafico') {
    const el = $('#pavGraf'), { f } = pavGrafPos(M); if (!el || !f) return;
    const h = (histDe(f.pos.instrumento) || []).filter((x) => x && x[1] != null).map(([d, v]) => ({ d, v }));
    const dias = (PAV_RANGOS.find(([k]) => k === (S.grafRango || '1A')) || PAV_RANGOS[1])[1], desde = diasAtras(dias), corta = (xs) => xs.filter((x) => x.d >= desde);
    grafLinea(el, [{ datos: corta(h), color: 'var(--grafica)', nombre: L('Precio', 'Price') }, { datos: corta(pavMedia(h, 50)), color: 'var(--reparto-2)', nombre: L('Media de 50 días', '50-day average') }, { datos: corta(pavMedia(h, 200)), color: 'var(--reparto-4)', nombre: L('Media de 200 días', '200-day average') }], { alto: innerWidth < 560 ? 200 : 280, sinRef: true, titulo: f.inst.corto || f.inst.nombre, fmt: (v) => precioFmt(v) });
  }
  if (p === 'riesgo') {
    const el = $('#pavCaida'), c = caidaDetalle(serieCartera(M, 3650)); if (!el || !c) return;
    grafLinea(el, c.dd, { alto: innerWidth < 560 ? 150 : 180, color: 'var(--baja)', rellenoA: 0, sinRef: true, titulo: L('Distancia al máximo', 'Distance from the high'), fmt: (v) => pctS(v, 1), ejeFmt: (t) => `${fmtNum(t, 0)} %`, marca: c.peor ? { d: c.peor.hasta, txt: pctS(c.peor.pct, 1) } : null });
  }
}

// las dos gráficas del básico: lo metido frente a lo que vale, y tu cartera de hoy hacia atrás con la peor caída marcada
function dibujarPanelBas(p, M) {
  if (p === 'rentab') {
    const el = $('#pabMetido'), R = rentabilidadCartera(M), s = R.twr && R.twr.serie; if (!el || !s) return;
    let k = 0, met = 0; const fl = R.flujos, m = [];
    for (const x of s) { while (k < fl.length && fl[k].d <= x.d) { met -= fl[k].imp; k++; } m.push({ d: x.d, v: met }); }
    grafLinea(el, [{ datos: s.map((x) => ({ d: x.d, v: x.v })), color: 'var(--grafica)', nombre: L('Lo que vale', 'Worth') }, { datos: m, color: 'var(--texto-2)', nombre: L('Lo que has metido', 'Put in') }], { alto: innerWidth < 560 ? 180 : 220, sinRef: true, titulo: L('Lo que has metido y lo que vale', 'What you put in and what it is worth'), fmt: (v) => eur(v, 0) });
  }
  if (p === 'riesgo') {
    const el = $('#pabDesde'), s = serieCartera(M, 3650); if (!el || s.length < 30) return;
    const c = caidaDetalle(s);
    grafLinea(el, s, { alto: innerWidth < 560 ? 160 : 200, color: 'var(--grafica)', sinRef: true, titulo: L('Tu cartera de hoy, hacia atrás', 'Your portfolio of today, going back'), fmt: (v) => eur(v, 0), marca: c && c.peor ? { d: c.peor.hasta, txt: pctS(c.peor.pct, 1) } : null });
  }
}

/* =========================== 0.9 · las cinco pestañas que faltaban (noche del 3 nov) ===========================
   Día a día, Movimientos, Gráfico técnico, Tu reparto objetivo y Laboratorio. Todo con lo que ya tiene la app. Ni
   «compra» ni «vende»: lo que supondría, y lo decide el usuario. Los botones y los campos de estas pestañas se
   atienden aquí abajo, una vez, al bajarse el trozo. */
const PAV_MESES = () => (IDIOMA === 'en' ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] : ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']);
const pavChips = (attr, actual, xs) => `<div class="tabs" role="group">${xs.map(([k, t]) => `<button type="button" ${attr}="${k}" aria-pressed="${actual === k}">${t}</button>`).join('')}</div>`;

/* ---------- Día a día ---------- */
function pavDias(M) {
  // sin cripto, el sábado y el domingo no son días de bolsa (serieCartera pone un punto «hoy» también en fin de semana)
  const s0 = serieCartera(M, 420), cripto = M.filas.some((f) => f.inst.clase === 'Cripto'), out = [];
  const s = cripto ? s0 : s0.filter((x) => { const g = deIso(x.d).getDay(); return g !== 0 && g !== 6; });
  for (let i = 1; i < s.length; i++) if (s[i - 1].v > 0) out.push({ d: s[i].d, e: s[i].v - s[i - 1].v, p: (s[i].v / s[i - 1].v - 1) * 100 });
  return out;
}
function pavPnl(M) {
  const ds = pavDias(M);
  if (ds.length < 5) return pavT('c12', L('Día a día', 'Day by day'), `<p class="nota" style="margin:0">${L('Aún no hay precios de suficientes días para contarlo.', 'Not enough days of prices yet.')}</p>`);
  const meses = [...new Set(ds.map((x) => x.d.slice(0, 7)))].sort();
  let mes = S.pnlMes && meses.includes(S.pnlMes) ? S.pnlMes : meses[meses.length - 1];
  const i = meses.indexOf(mes), delMes = ds.filter((x) => x.d.startsWith(mes)), porDia = new Map(delMes.map((x) => [x.d, x]));
  const [a, m] = mes.split('-').map(Number), primero = new Date(a, m - 1, 1), nd = new Date(a, m, 0).getDate(), hueco = (primero.getDay() + 6) % 7;
  const DS = IDIOMA === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  let celdas = '';
  for (let k = 0; k < hueco; k++) celdas += '<i></i>';
  for (let d = 1; d <= nd; d++) {
    const k = `${mes}-${String(d).padStart(2, '0')}`, x = porDia.get(k);
    celdas += x ? `<div class="pnl-d" style="${pavColor(x.p, 2)}" role="img" aria-label="${esc(`${fechaCorta(k)}: ${S.oculto ? '' : eurS(x.e, 0) + ', '}${pctS(x.p, 2)}`)}"><small>${d}</small><b>${S.oculto ? '••' : ((x.e > 0 ? '+' : '') + euCorto(x.e)).replace(/\s€$/, '<i class="eu"> €</i>')}</b><span>${x.e > 0 ? '<i>▲</i> ' : x.e < 0 ? '<i>▼</i> ' : ''}${pctS(x.p, 1)}</span></div>` : `<div class="pnl-d vacio"><small>${d}</small></div>`;
  }
  const tot = sum(delMes, (x) => x.e), verdes = delMes.filter((x) => x.e > 0).length;
  const mejor = delMes.reduce((b, x) => (!b || x.e > b.e ? x : b), null), peor = delMes.reduce((b, x) => (!b || x.e < b.e ? x : b), null);
  const cab = `<div class="pnl-cab"><button type="button" class="ib" data-pnl-mes="${esc(meses[i - 1] || '')}" ${i > 0 ? '' : 'disabled'} aria-label="${L('Mes anterior', 'Previous month')}">‹</button><b>${PAV_MESES()[m - 1]} ${a}</b><button type="button" class="ib" data-pnl-mes="${esc(meses[i + 1] || '')}" ${i < meses.length - 1 ? '' : 'disabled'} aria-label="${L('Mes siguiente', 'Next month')}">›</button></div>`;
  const cal = `${cab}<div class="pnl-cal">${DS.map((x) => `<span class="pnl-ds">${x}</span>`).join('')}${celdas}</div>`;
  const kpis = pavKpis([
    [L('En el mes', 'This month'), eurS(tot, 0), cls(tot)],
    [L('Días en verde', 'Green days'), `${verdes} ${L('de', 'of')} ${delMes.length}`],
    mejor ? [L('Mejor día', 'Best day'), eurS(mejor.e, 0), cls(mejor.e), `${Number(mejor.d.slice(8))} · ${pctS(mejor.p, 2)}`] : null,
    peor ? [L('Peor día', 'Worst day'), eurS(peor.e, 0), cls(peor.e), `${Number(peor.d.slice(8))} · ${pctS(peor.p, 2)}`] : null,
  ], 4);
  // los últimos doce meses, sumados
  const ult = meses.slice(-12).map((k) => [k, sum(ds.filter((x) => x.d.startsWith(k)), (x) => x.e)]);
  const maxM = Math.max(1, ...ult.map(([, v]) => Math.abs(v)));
  const barras = ult.map(([k, v]) => pavDos(`${PAV_MESES()[+k.slice(5) - 1].slice(0, 3)} ${k.slice(2, 4)}`, v, maxM)).join('');
  // lo que más ha movido tu cartera el último día
  const mov = M.filas.filter((f) => f.dia != null && f.varDia != null && !f.diaViejo).map((f) => [f.inst.corto || f.inst.nombre, f.dia]).filter(([, v]) => isFinite(v) && Math.abs(v) > 0.005).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 6);
  const maxD = Math.max(1, ...mov.map(([, v]) => Math.abs(v)));
  return [
    pavT('c8', L('Tu cartera, día a día', 'Your portfolio, day by day'), kpis + `<div style="margin-top:16px">${cal}</div>`, L('Con lo que tienes hoy y el precio de cierre de cada día de bolsa: lo que cambió su valor de un día al siguiente. No cuenta las compras ni las ventas que hiciste por medio, así que un día en que compraste no sale como una subida.', 'With what you own today and each trading day\'s close: how its value changed from one day to the next. Purchases and sales in between are not counted.')),
    pavT('c4', L('Mes a mes', 'Month by month'), barras, L('La suma de los días de cada mes, en euros, con lo que tienes hoy.', 'The sum of each month\'s days, in euros, with what you own today.')),
    mov.length ? pavT('c12', L('Lo que más ha movido tu cartera hoy', 'What moved your portfolio most today'), mov.map(([n, v]) => pavDos(n, v, maxD)).join(''), L('Lo que ha ganado o perdido cada posición en la última sesión, en euros.', 'What each holding gained or lost in the last session, in euros.')) : '',
  ].join('');
}

/* ---------- Movimientos ---------- */
function pavListaMov(M) {
  const xs = [], vistas = new Set();
  for (const m of S.cartera.movimientos || []) {
    if (!m || !m.fecha) continue;
    const t = m.tipo === 'venta' ? 'venta' : m.tipo === 'compra' ? 'compra' : 'otro';
    if (t === 'compra') vistas.add(`${m.instrumento}|${m.fecha}`);
    xs.push({ d: m.fecha, t, n: nombreInst(m.instrumento), u: +m.uds || null, imp: +m.importe || (m.precio && m.uds ? m.precio * m.uds : 0), res: t === 'venta' && m.resultado != null ? +m.resultado : null, coste: t === 'venta' && m.coste_vendido != null ? +m.coste_vendido : null, pl: m.plataforma || '' });
  }
  // las compras que salen de tus posiciones (la primera, las aportaciones programadas, los lotes) y no están apuntadas
  for (const f of M.filas) {
    let lotes = []; try { lotes = lotesDe(f.pos); } catch (e) {}
    for (const l of lotes) {
      if (!(l.c > 0) || vistas.has(`${f.pos.instrumento}|${l.f}`)) continue;
      xs.push({ d: l.f, t: 'compra', n: f.inst.corto || f.inst.nombre, u: l.u || null, imp: l.c, aprox: !!l.mezcla, pl: f.pos.plataforma || '' });
    }
  }
  return xs.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
}
// el resultado de las ventas, por partes: las que dejaron ganancia y las que dejaron pérdida, cada una con su cuenta
function pavDesgRes(xs, res) {
  const gan = xs.filter((x) => x.res > 0).sort((a, b) => b.res - a.res), per = xs.filter((x) => x.res < 0).sort((a, b) => a.res - b.res), cero = xs.filter((x) => !x.res);
  const una = (x) => `<li><span><b>${esc(x.n)}</b><small>${esc(fechaConAnio(x.d))}${x.coste != null ? ` · ${L(`vendido por ${eur(x.imp, 0)}, te costó ${eur(x.coste, 0)}`, `sold for ${eur(x.imp, 0)}, cost ${eur(x.coste, 0)}`)}` : ` · ${L(`vendido por ${eur(x.imp, 0)}`, `sold for ${eur(x.imp, 0)}`)}`}</small></span><b class="${cls(x.res)}">${eurS(x.res, 0)}</b></li>`;
  const bloque = (tit, ys, cl) => ys.length ? `<div class="desg-b"><div class="desg-cab"><span>${tit}</span><b class="${cl}">${eurS(sum(ys, (x) => x.res), 0)}</b></div><ul>${ys.map(una).join('')}</ul></div>` : '';
  return `<div class="pav-desg" id="movDesg">
    ${bloque(L(`Lo que suma · ${gan.length} ${gan.length === 1 ? 'venta' : 'ventas'} con ganancia`, `What adds · ${gan.length} sale${gan.length === 1 ? '' : 's'} at a gain`), gan, 'up')}
    ${bloque(L(`Lo que resta · ${per.length} ${per.length === 1 ? 'venta' : 'ventas'} con pérdida`, `What takes away · ${per.length} sale${per.length === 1 ? '' : 's'} at a loss`), per, 'down')}
    ${cero.length ? `<p class="nota" style="margin:0">${L(`${cero.length} ${cero.length === 1 ? 'venta' : 'ventas'} sin ganancia ni pérdida.`, `${cero.length} sale${cero.length === 1 ? '' : 's'} with no gain or loss.`)}</p>` : ''}
    <div class="desg-tot"><span>${L('Resultado', 'Result')}</span><b class="${cls(res)}">${eurS(res, 0)}</b></div>
    <p class="pav-como" style="margin-top:4px">${L('Cada venta: lo que te dieron menos lo que te costaron esas participaciones (las primeras que compraste, como cuenta Hacienda). Las comisiones van dentro si las apuntaste.', 'Each sale: what you got minus what those units cost you (the first ones you bought, as the tax office counts it). Fees are included if you recorded them.')}</p>
  </div>`;
}
function pavMov(M) {
  const todos = pavListaMov(M), fil = S.movFil || 'todo', xs = todos.filter((x) => fil === 'todo' || x.t === fil);
  const T = { compra: L('Compra', 'Buy'), venta: L('Venta', 'Sale'), otro: L('Otro', 'Other') };
  const comprado = sum(todos.filter((x) => x.t === 'compra'), (x) => x.imp), vendido = sum(todos.filter((x) => x.t === 'venta'), (x) => x.imp);
  const conRes = todos.filter((x) => x.res != null), res = sum(conRes, (x) => x.res);
  // al tocar el resultado, lo que suma y lo que resta (Carlos, 4 nov)
  const abierto = !!S.movRes && conRes.length > 0;
  const vRes = conRes.length ? `<button type="button" class="pav-kpi-btn" data-mov-res aria-expanded="${abierto}" aria-controls="movDesg" aria-label="${L(`Resultado de lo vendido, ${eurS(res, 0)}: ver lo que suma y lo que resta`, `Result of sales, ${eurS(res, 0)}: see what adds and what takes away`)}">${eurS(res, 0)}${SVG('<path d="M6 9l6 6 6-6"/>', 2.2)}</button>` : eurS(res, 0);
  const kpis = pavKpis([
    [L('Operaciones', 'Transactions'), fmtNum(todos.length, 0)],
    [L('Comprado', 'Bought'), eur(comprado, 0)],
    [L('Vendido', 'Sold'), eur(vendido, 0)],
    [L('Resultado de lo vendido', 'Result of sales'), vRes, cls(res)],
  ], 4) + (abierto ? pavDesgRes(conRes, res) : '');
  const MAX = 150;
  const filas = xs.slice(0, MAX).map((x) => [`<span class="mov-f">${esc(fechaConAnio(x.d))}</span>`, `<b>${esc(x.n)}</b>${x.pl ? `<small class="mov-pl">${esc(x.pl)}</small>` : ''}`, `<span class="mov-t ${x.t}">${T[x.t]}</span>${x.aprox ? ` <small title="${L('Sin fecha exacta: la de la posición', 'No exact date: the holding\'s')}">≈</small>` : ''}`, x.u != null ? fmtNum(x.u, x.u < 10 ? 4 : 2) : '—', `${eur(x.imp, 2)}${x.res != null ? `<small class="${cls(x.res)}"> ${eurS(x.res, 0)}</small>` : ''}`]);
  const tabla = xs.length ? pavTabla([L('Fecha', 'Date'), L('Qué', 'What'), L('Tipo', 'Type'), L('Particip.', 'Units'), L('Importe', 'Amount')], filas, 'pav-mov') + (xs.length > MAX ? `<p class="nota">${L(`Y ${xs.length - MAX} más antiguas.`, `And ${xs.length - MAX} older ones.`)}</p>` : '') : `<p class="nota" style="margin:0">${L('No hay movimientos de este tipo.', 'No transactions of this type.')}</p>`;
  // lo que has metido cada mes (las compras), el último año
  const desde = diasAtras(365).slice(0, 7), porMes = new Map();
  for (const x of todos) if (x.t === 'compra' && x.d.slice(0, 7) >= desde) porMes.set(x.d.slice(0, 7), (porMes.get(x.d.slice(0, 7)) || 0) + x.imp);
  const ms = [...porMes.entries()].sort(), maxM = Math.max(1, ...ms.map(([, v]) => v));
  return [
    pavT('c12', L('Tus operaciones', 'Your transactions'), kpis + `<div class="pav-filtros">${pavChips('data-mov-f', fil, [['todo', L('Todas', 'All')], ['compra', L('Compras', 'Buys')], ['venta', L('Ventas', 'Sales')]])}</div>` + tabla, L('Las compras y ventas que has apuntado o importado y, si no lo están, las compras que salen de tus posiciones (la primera compra, los lotes y las aportaciones programadas). Las marcadas con ≈ no tienen fecha exacta.', 'The buys and sales you recorded or imported and, if missing, the buys that come from your holdings. Those marked ≈ have no exact date.')),
    ms.length ? pavT('c12', L('Lo que has metido cada mes', 'What you put in each month'), ms.map(([k, v]) => pavFila(`${PAV_MESES()[+k.slice(5) - 1].slice(0, 3)} ${k.slice(0, 4)}`, v, maxM, 'var(--grafica)', eur(v, 0))).join(''), L('La suma de las compras de cada mes, el último año.', 'The sum of each month\'s buys, over the last year.')) : '',
  ].join('');
}

/* ---------- Gráfico técnico ---------- */
// la media de los últimos n días de bolsa en cada punto (los datos viejos son semanales: se promedia lo que caiga en
// ese tramo de calendario, n días de bolsa ≈ n·7/5 días de calendario)
function pavMedia(h, n) {
  // cada punto pesa los días que cubre (un dato semanal, 7; uno diario, 1), para que donde se juntan los dos la media no
  // se tuerza hacia lo diario
  const ms = (n * 7 / 5) * 864e5, out = [], t = h.map((x) => Date.parse(x.d));
  const w = t.map((x, i) => (i ? Math.max(1, Math.min(7, Math.round((x - t[i - 1]) / 864e5))) : 1));
  let j = 0, s = 0, sw = 0;
  for (let i = 0; i < h.length; i++) {
    s += h[i].v * w[i]; sw += w[i];
    while (j < i && t[j] <= t[i] - ms) { s -= h[j].v * w[j]; sw -= w[j]; j++; }
    if (t[i] - t[0] >= ms * 0.9 && sw > 0) out.push({ d: h[i].d, v: s / sw });
  }
  return out;
}
function pavRsi(h, n = 14) {
  // solo con datos diarios (entre puntos, como mucho 5 días)
  const xs = []; for (let i = h.length - 1; i > 0 && xs.length < 120; i--) { if (Date.parse(h[i].d) - Date.parse(h[i - 1].d) > 5 * 864e5) break; xs.unshift(h[i].v - h[i - 1].v); }
  if (xs.length < n + 1) return null;
  let g = 0, p = 0;
  for (let i = 0; i < n; i++) { if (xs[i] > 0) g += xs[i]; else p -= xs[i]; }
  g /= n; p /= n;
  for (let i = n; i < xs.length; i++) { g = (g * (n - 1) + Math.max(0, xs[i])) / n; p = (p * (n - 1) + Math.max(0, -xs[i])) / n; }
  if (g === 0 && p === 0) return 50;   // sin moverse
  return p === 0 ? 100 : 100 - 100 / (1 + g / p);
}
const PAV_RANGOS = [['6M', 182], ['1A', 365], ['3A', 1095], ['5A', 1826]];
function pavGrafPos(M) {
  const fs = M.filas.filter((f) => histDe(f.pos.instrumento));
  const f = fs.find((x) => x.pos.id === S.grafPos) || [...fs].sort((a, b) => b.valor - a.valor)[0];
  return { fs, f };
}
function pavGrafico(M) {
  const { fs, f } = pavGrafPos(M);
  if (!f) return pavT('c12', L('Gráfico técnico', 'Technical chart'), `<p class="nota" style="margin:0">${L('Ninguna de tus posiciones tiene todavía historial de precios.', 'None of your holdings has price history yet.')}</p>`);
  const h = (histDe(f.pos.instrumento) || []).filter((x) => x && x[1] != null).map(([d, v]) => ({ d, v }));
  const ult = h[h.length - 1], m50 = pavMedia(h, 50), m200 = pavMedia(h, 200), rsi = pavRsi(h);
  const ano = h.filter((x) => x.d >= diasAtras(365)), hi = Math.max(...ano.map((x) => x.v)), lo = Math.min(...ano.map((x) => x.v));
  const sobre = (m) => (m.length ? (ult.v / m[m.length - 1].v - 1) * 100 : null);
  const s50 = sobre(m50), s200 = sobre(m200), rango = S.grafRango || '1A';
  const sel = `<label class="pav-sel"><span>${L('Posición', 'Holding')}</span><select data-graf-pos>${fs.map((x) => `<option value="${esc(x.pos.id)}"${x === f ? ' selected' : ''}>${pavNom(x)}</option>`).join('')}</select></label>`;
  const kpis = pavKpis([
    [L('Último precio', 'Last price'), precioFmt(ult.v), '', esc(fechaConAnio(ult.d))],
    [L('Frente a su media de 50 días', 'Against its 50-day average'), s50 == null ? '—' : pctS(s50, 1), s50 == null ? '' : cls(s50)],
    [L('Frente a su media de 200 días', 'Against its 200-day average'), s200 == null ? '—' : pctS(s200, 1), s200 == null ? '' : cls(s200)],
    [L('RSI de 14 días', '14-day RSI'), rsi == null ? '—' : fmtNum(rsi, 0), '', rsi == null ? '' : rsi >= 70 ? L('ha subido mucho en poco tiempo; no dice qué va a pasar', 'rose a lot in a short time; it does not tell what comes next') : rsi <= 30 ? L('ha bajado mucho en poco tiempo; no dice qué va a pasar', 'fell a lot in a short time; it does not tell what comes next') : L('en la zona media', 'in the middle range')],
    ano.length > 5 ? [L('Máximo de un año', '1-year high'), precioFmt(hi), '', pctS((ult.v / hi - 1) * 100, 1)] : null,
    ano.length > 5 ? [L('Mínimo de un año', '1-year low'), precioFmt(lo), '', pctS((ult.v / lo - 1) * 100, 1)] : null,
  ], 3);
  return [
    pavT('c12', L('Gráfico técnico', 'Technical chart'), `<div class="pav-filtros">${sel}${pavChips('data-graf-r', rango, PAV_RANGOS.map(([k]) => [k, k]))}</div><div class="chart" id="pavGraf"></div><p class="pav-ley"><span><i style="background:var(--grafica)"></i>${L('Precio', 'Price')}</span><span><i style="background:var(--reparto-2)"></i>${L('Media de 50 días', '50-day average')}</span><span><i style="background:var(--reparto-4)"></i>${L('Media de 200 días', '200-day average')}</span></p>` + kpis,
      L('Con el precio de cierre de cada día en euros (los años viejos, semana a semana): por eso no hay velas ni volumen. Las medias son las de los últimos 50 y 200 días de bolsa. El RSI mide, de 0 a 100, cuánto han pesado las subidas frente a las bajadas en las últimas 14 sesiones. Son cálculos sobre el precio, no una señal para comprar ni vender.', 'With each day\'s closing price in euros (older years, weekly): hence no candles or volume. The averages are those of the last 50 and 200 trading days. RSI measures, from 0 to 100, how much rises weighed against falls over the last 14 sessions. These are price calculations, not a buy or sell signal.')),
  ].join('');
}

/* ---------- Tu reparto objetivo ----------
   Rehecho el 4 nov (Carlos: «he superado el 100 % y me deja» y «necesita un overhaul general»). Cada tipo con lo que tienes,
   tu objetivo con − y + y su barra; el total no puede pasar de 100 (el campo se para en lo que queda por repartir);
   dos barras para ver de un vistazo lo que tienes y lo que quieres; cuánto haría falta aportar para llegar sin vender; y
   la aportación repartida hacia el objetivo, como cuenta, no como consejo. */
const LS_OBJ = 'inv-reparto-obj';
const CLASES_OBJ = ['Renta variable', 'Renta fija', 'Monetario', 'Oro', 'Materias primas', 'Cripto', 'Efectivo', 'Otros'];
const r1d = (x) => Math.round(x * 10) / 10;
// lo que tienes hoy en enteros que suman 100 (el resto mayor se lleva el punto que falta)
function pavDesdeHoy(r) {
  const xs = r.filas.filter((x) => x.pct > 0).map((x) => ({ k: x.k, b: Math.floor(x.pct), f: x.pct - Math.floor(x.pct) }));
  let falta = 100 - sum(xs, (x) => x.b);
  for (const x of [...xs].sort((a, b) => b.f - a.f)) { if (falta <= 0) break; x.b++; falta--; }
  return Object.fromEntries(xs.map((x) => [x.k, x.b]));
}
function pavObjetivo(r) {
  const o = LS.get(LS_OBJ, null);
  if (o && typeof o === 'object') return o;
  return pavDesdeHoy(r);   // sin objetivo puesto: lo que tienes hoy, para empezar desde ahí
}
const pavColClase = (k) => { const i = CLASES_OBJ.indexOf(k); return i >= 0 && i < 6 ? PAV_COL[i] : i >= 6 ? 'var(--tenue)' : PAV_COL[5]; };
// el máximo que puede tener un tipo sin que el total pase de 100
const pavTopeObj = (o, k) => Math.max(0, r1d(100 - sum(Object.entries(o).filter(([x]) => x !== k), ([, v]) => +v || 0)));
function pavPonerObj(k, v) {
  const r = reparto(S.M || calcular(), 'clase', 'todo'), o = { ...pavObjetivo(r) };
  const tope = pavTopeObj(o, k), n = r1d(Math.max(0, Math.min(tope, +v || 0)));
  o[k] = n; LS.set(LS_OBJ, o);
  return { n, tope, cortado: (+v || 0) > tope + 0.05 };
}
function pavRebal(M) {
  const r = reparto(M, 'clase', 'todo'), obj = pavObjetivo(r), total = r.total || M.total, puesto = !!LS.get(LS_OBJ, null);
  const ord = (k) => { const i = CLASES_OBJ.indexOf(k); return i < 0 ? 99 : i; };
  const ks = [...new Set([...r.filas.map((x) => x.k), ...Object.keys(obj)])].sort((a, b) => ord(a) - ord(b));
  const tienes = (k) => (r.filas.find((x) => x.k === k) || { pct: 0, v: 0 });
  const sumObj = r1d(sum(ks, (k) => +obj[k] || 0)), queda = r1d(100 - sumObj), cuadra = Math.abs(queda) < 0.05;
  const desv = sum(ks, (k) => Math.abs(tienes(k).pct - (+obj[k] || 0))) / 2;
  // lo que habría que aportar para llegar sin vender: el total con el que lo que más sobra baja a su objetivo
  let sinVender = null, imposible = false;
  if (cuadra && puesto) {
    let T = total;
    // lo que no llega al 1 % y tiene objetivo 0 no cuenta (unos euros de efectivo no obligan a vender)
    for (const k of ks) { const v = tienes(k).v, o = +obj[k] || 0; if (o <= 0) { if (tienes(k).pct >= 1) imposible = true; } else T = Math.max(T, v / (o / 100)); }
    sinVender = imposible ? null : Math.max(0, T - total);
  }
  const ap = cfgProy().aport, meses = sinVender && ap > 0 ? Math.ceil(sinVender / ap) : null;
  const kp = pavKpis([
    [L('Lejos de tu objetivo', 'Away from your target'), cuadra ? `${fmtNum(desv, 1)} pp` : '—', desv > 10 ? 'warn' : '', cuadra ? (desv < 2 ? L('casi en su sitio', 'almost there') : L('lo que tendrías que mover', 'what you would need to move')) : L('cuando tu objetivo sume 100', 'once your target adds up to 100')],
    [L('Para llegar solo aportando', 'To get there only by adding'), !cuadra || !puesto ? '—' : imposible ? L('Vendiendo', 'Selling') : sinVender < 1 ? L('Ya estás', 'You are there') : euCorto(sinVender), '', !puesto ? L('cuando pongas tu objetivo', 'once you set your target') : !cuadra ? '' : imposible ? L('algo con objetivo 0 % solo baja si vendes', 'something at 0% only drops if you sell') : meses ? L(`unos ${meses} ${meses === 1 ? 'mes' : 'meses'} con tus ${eur(ap, 0)} al mes`, `about ${meses} month${meses === 1 ? '' : 's'} at ${eur(ap, 0)} a month`) : ''],
  ], 2);
  // de un vistazo: lo que tienes y lo que quieres, en dos barras
  const barra = (pcts) => `<div class="ro-barra">${ks.filter((k) => pcts(k) > 0).map((k) => `<i style="width:${Math.min(100, pcts(k)).toFixed(2)}%;background:${pavColClase(k)}" title="${esc(trad(k))}: ${pct(pcts(k), 1)}"></i>`).join('')}</div>`;
  const vistazo = `<div class="ro-vistazo"><div><small>${L('Tienes', 'You have')}</small>${barra((k) => tienes(k).pct)}</div><div><small>${L('Tu objetivo', 'Your target')}</small>${barra((k) => +obj[k] || 0)}</div></div>`;
  const filas = ks.map((k) => {
    const t = tienes(k), o = +obj[k] || 0, dif = t.pct - o, eu = (dif / 100) * total, tope = pavTopeObj(obj, k);
    const txt = !cuadra ? '' : Math.abs(dif) < 0.5 ? `<span class="ro-ok">${L('En su sitio', 'On target')}</span>` : dif < 0 ? `<span>${L(`Te faltan ${eur(-eu, 0)}`, `${eur(-eu, 0)} short`)}</span><small>${fmtNum(dif, 1)} pp</small>` : `<span>${L(`Te sobran ${eur(eu, 0)}`, `${eur(eu, 0)} over`)}</span><small>+${fmtNum(dif, 1)} pp</small>`;
    const n = esc(trad(k));
    return `<div class="ro-fila">
      <div class="ro-n"><b><i style="background:${pavColClase(k)}"></i>${n}</b><small>${L(`Tienes ${pct(t.pct, 1)}`, `You have ${pct(t.pct, 1)}`)}${t.v ? ` · ${eur(t.v, 0)}` : ''}</small></div>
      <div class="ro-paso" role="group" aria-label="${L(`Objetivo de ${n}`, `Target for ${n}`)}"><button type="button" data-obj-menos="${esc(k)}" aria-label="${L(`Bajar ${n} un punto`, `Lower ${n} by one point`)}" ${o <= 0 ? 'disabled' : ''}>−</button><input type="number" inputmode="decimal" min="0" max="${tope}" step="0.5" value="${r1d(o)}" data-obj-k="${esc(k)}" aria-label="${L(`Objetivo para ${n}, en %`, `Target for ${n}, in %`)}"><span>%</span><button type="button" data-obj-mas="${esc(k)}" aria-label="${L(`Subir ${n} un punto`, `Raise ${n} by one point`)}" ${o >= tope ? 'disabled' : ''}>+</button></div>
      <div class="ro-dif">${txt}</div>
      <div class="ro-pista" aria-hidden="true"><i style="width:${Math.min(100, t.pct).toFixed(1)}%;background:${pavColClase(k)}"></i><b style="left:${Math.min(100, o).toFixed(1)}%"></b></div>
    </div>`;
  }).join('');
  const faltan = CLASES_OBJ.filter((k) => !ks.includes(k));
  const anadir = faltan.length ? `<label class="pav-sel ro-anadir"><span>${L('Añadir un tipo', 'Add a type')}</span><select data-obj-add><option value="">${L('Elegir…', 'Choose…')}</option>${faltan.map((k) => `<option value="${esc(k)}">${esc(trad(k))}</option>`).join('')}</select></label>` : '';
  const estado = cuadra ? `<span class="ro-ok">${L('Repartido el 100 %', '100% allocated')}</span>` : queda > 0 ? `<span class="pav-warn">${L(`Te queda ${pct(queda, 1)} por repartir`, `${pct(queda, 1)} left to allocate`)}</span>` : `<span class="pav-warn">${L(`Te pasas en ${pct(-queda, 1)}: baja algún tipo`, `${pct(-queda, 1)} over: lower a type`)}</span>`;
  const total100 = `<div class="ro-total" id="roTotal" aria-live="polite"><div class="ro-pista"><i style="width:${Math.min(100, sumObj).toFixed(1)}%;background:${cuadra ? 'var(--sube)' : 'var(--aviso)'}"></i></div><div class="ro-total-t"><b>${pct(sumObj, 1)}</b>${estado}</div></div>`;
  const acciones = `<div class="pav-filtros ro-acc">${anadir}<button type="button" class="btn peq" data-obj-acc="hoy">${L('Empezar desde lo que tengo', 'Start from what I own')}</button>${puesto ? `<button type="button" class="btn peq" data-obj-acc="quitar">${L('Quitar mi objetivo', 'Remove my target')}</button>` : ''}</div>`;
  // la aportación repartida hacia el objetivo: primero a lo que más falta (en euros, con el total de después)
  const aport = Math.max(0, +(S.rebalAport != null ? S.rebalAport : ap) || 0), tras = total + aport;
  const falta = ks.map((k) => [k, Math.max(0, ((+obj[k] || 0) / 100) * tras - tienes(k).v)]), sf = sum(falta, ([, v]) => v);
  const reparte = new Map(falta.map(([k, v]) => [k, sf > 0 ? (v / sf) * Math.min(aport, sf) : 0]));
  const sobra = Math.max(0, aport - sf);
  const campo = `<label class="pav-sel"><span>${L('Si aportaras', 'If you put in')}</span><input type="number" inputmode="decimal" min="0" step="50" value="${aport}" data-rebal-aport> €</label>`;
  const destino = !cuadra ? `<p class="nota" style="margin:0">${L('Cuando tu objetivo sume 100 %, aquí sale cómo quedaría.', 'Once your target adds up to 100%, this shows how it would look.')}</p>`
    : !(aport > 0) ? `<p class="nota" style="margin:0">${L('Pon una cantidad para ver cómo quedaría.', 'Enter an amount to see how it would look.')}</p>`
    : `<ul class="ro-dest">${ks.filter((k) => (reparte.get(k) || 0) >= 1).sort((a, b) => reparte.get(b) - reparte.get(a)).map((k) => { const desp = ((tienes(k).v + reparte.get(k)) / tras) * 100; return `<li><span><i style="background:${pavColClase(k)}"></i>${esc(trad(k))}</span><b>${eur(reparte.get(k), 0)}</b><small>${L(`quedaría en ${pct(desp, 1)} (objetivo ${pct(+obj[k] || 0, 1)})`, `would end at ${pct(desp, 1)} (target ${pct(+obj[k] || 0, 1)})`)}</small></li>`; }).join('')}</ul>${sobra >= 1 ? `<p class="nota">${L(`Con eso ya llegarías a tu objetivo y sobrarían ${eur(sobra, 0)}: repartidos como tu objetivo, no lo cambian.`, `That would reach your target with ${eur(sobra, 0)} to spare: split like your target, they don't change it.`)}</p>` : ''}`;
  return [
    pavT('c12', L('Tu reparto objetivo', 'Your target mix'), kp + vistazo + `<div class="ro-lista">${filas}</div>` + total100 + acciones + (puesto ? '' : `<p class="nota" style="margin:8px 0 0">${L('De momento sale lo que tienes hoy. Cámbialo con − y + o escribiendo el número, y se guarda.', 'For now it shows what you own today. Change it with − and + or by typing, and it is saved.')}</p>`),
      L('Escribe el porcentaje que quieres de cada tipo; se guarda en este dispositivo. Entre todos no pueden pasar de 100. «Te faltan» y «Te sobran» son la distancia en euros con tu patrimonio de hoy. «Para llegar solo aportando» es lo que tendrías que meter, sin vender nada, para que lo que más sobra baje a su objetivo.', 'Type the percentage you want of each type; it is saved on this device. Together they cannot go over 100. «Short» and «over» are the distance in euros with your net worth today. «To get there only by adding» is what you would need to put in, without selling, for the most overweight type to drop to its target.')),
    pavT('c12', L('Tu próxima aportación', 'Your next contribution'), `<div class="pav-filtros" style="margin-top:0">${campo}</div>${destino}`, L('La aportación va primero a lo que más se queda por debajo de tu objetivo. Es una cuenta, no una recomendación: lo decides tú.', 'The contribution goes first to what is furthest below your target. It is a sum, not a recommendation: your call.')),
  ].join('');
}

/* ---------- Laboratorio ---------- */
function pavFuturo(ini, mes, anual, anios) { const r = Math.pow(1 + anual / 100, 1 / 12) - 1, n = Math.round(anios * 12); let v = ini; for (let i = 0; i < n; i++) v = v * (1 + r) + mes; return v; }
function pavLabRes(M) {
  const c = cfgProy(), L0 = S.lab || {}, mes = +(L0.mes ?? c.aport) || 0, anios = Math.max(1, Math.min(50, +(L0.anios ?? 10) || 10)), r = +(L0.r ?? c.bolsa ?? 7);
  const base = pavFuturo(M.total, mes, r, anios), mas = pavFuturo(M.total, mes + 100, r, anios), puesto = M.total + mes * anios * 12;
  const esc3 = [[L('Si va peor (−2 puntos)', 'If worse (−2 points)'), r - 2], [L('Con lo que has puesto', 'With your figure'), r], [L('Si va mejor (+2 puntos)', 'If better (+2 points)'), r + 2]];
  return pavKpis([
    ...esc3.map(([n, x]) => [n, euCorto(pavFuturo(M.total, mes, x, anios)), '', `${fmtNum(x, 1)} % ${L('al año', 'a year')}`]),
    [L('Lo que habrías puesto tú', 'What you would have put in'), euCorto(puesto)],
    [L('Con 100 € más al mes', 'With €100 more a month'), `+${euCorto(mas - base)}`, 'up', L(`en ${anios} años`, `in ${anios} years`)],
  ], 3);
}
function pavLab(M) {
  const c = cfgProy(), L0 = S.lab || {};
  const campo = (k, t, v, paso, suf) => `<label class="pav-sel"><span>${t}</span><input type="number" inputmode="decimal" step="${paso}" value="${v}" data-lab="${k}"> ${suf}</label>`;
  const s = serieCartera(M, 3660);   // unos días de margen: lo viejo es semanal
  const per = [[L('1 año', '1 year'), 365], [L('3 años', '3 years'), 1095], [L('5 años', '5 years'), 1826], [L('10 años', '10 years'), 3650]];
  const back = s.length > 20 ? per.map(([n, d]) => { const v = pavDesde(s, diasAtras(d), 'v'); if (v == null) return null; const anual = d > 400 ? (Math.pow(1 + v / 100, 365 / d) - 1) * 100 : null; return [n, pctS(v, 1), cls(v), anual != null ? L(`${pctS(anual, 1)} al año`, `${pctS(anual, 1)} a year`) : '']; }) : [];
  let caida = null; try { caida = caidaDetalle(s); } catch (e) {}
  const prueba = back.filter(Boolean).length ? pavKpis([...back, caida && caida.peor ? [L('Peor caída en ese tiempo', 'Worst drop in that time'), pctS(caida.peor.pct, 1), 'down'] : null], 3) : `<p class="nota" style="margin:0">${L('Faltan precios para mirar atrás.', 'Not enough prices to look back.')}</p>`;
  return [
    pavT('c7', L('¿Y si…?', 'What if…?'), `<div class="pav-filtros lab-campos">${campo('mes', L('Aportas al mes', 'You put in monthly'), L0.mes ?? c.aport, 50, '€')}${campo('anios', L('Durante', 'For'), L0.anios ?? 10, 1, L('años', 'years'))}${campo('r', L('Rentabilidad al año', 'Return a year'), L0.r ?? c.bolsa, 0.5, '%')}</div><div id="labRes" aria-live="polite">${pavLabRes(M)}</div>`,
      L('Una cuenta con interés compuesto: lo que tienes hoy más lo que aportes cada mes, creciendo a esa rentabilidad cada año, sin impuestos ni inflación. Los mercados no suben en línea recta: para ver la horquilla de lo probable, mira «Lo que podrías tener».', 'A compound-interest sum: what you own today plus what you put in each month, growing at that return each year, before tax and inflation. Markets do not rise in a straight line: for the likely range, see «What you could have».'), pavIr('#proyeccion', L('Lo que podrías tener', 'What you could have'))),
    pavT('c5', L('Lo de hoy, con el pasado', 'Today\'s mix, with the past'), prueba, L('Lo que habría hecho la cartera que tienes hoy (las mismas participaciones) con los precios de cada día del pasado. No cuenta lo que compraste o vendiste por medio. Lo pasado no dice lo que va a pasar.', 'What today\'s portfolio (same units) would have done with past prices. It ignores what you bought or sold in between. The past does not tell the future.')),
  ].join('');
}

// los botones y campos de estas pestañas
document.addEventListener('click', (e) => {
  const t = e.target.closest && e.target.closest('[data-pnl-mes], [data-mov-f], [data-graf-r], [data-mov-res], [data-obj-mas], [data-obj-menos], [data-obj-acc]'); if (!t || !$('#panelAv')) return;
  if (t.hasAttribute('data-mov-res')) S.movRes = !S.movRes;
  if (t.dataset.objMas != null || t.dataset.objMenos != null) {
    const k = t.dataset.objMas ?? t.dataset.objMenos, o = pavObjetivo(reparto(S.M || calcular(), 'clase', 'todo')), v = +o[k] || 0;
    // con decimales, el primer toque redondea al entero
    pavPonerObj(k, t.dataset.objMas != null ? Math.floor(v + 1) : Math.ceil(v - 1));
  }
  if (t.dataset.objAcc === 'hoy') { LS.set(LS_OBJ, pavDesdeHoy(reparto(S.M || calcular(), 'clase', 'todo'))); toast(L('Objetivo puesto con lo que tienes hoy. Cámbialo a tu gusto.', 'Target set to what you own today. Change it as you like.'), 3500); }
  if (t.dataset.objAcc === 'quitar') { LS.del(LS_OBJ); toast(L('Objetivo quitado.', 'Target removed.'), 2500); }
  if (t.dataset.pnlMes != null) { if (!t.dataset.pnlMes) return; S.pnlMes = t.dataset.pnlMes; }
  if (t.dataset.movF) S.movFil = t.dataset.movF;
  if (t.dataset.grafR) S.grafRango = t.dataset.grafR;
  vibrar(); pintarPanelAv();
});
// se repinta al momento siguiente: repintar dentro del «change» quita el campo con el foco puesto y el navegador lanza
// otro «change» a mitad
const repintarAv = () => { clearTimeout(repintarAv.t); repintarAv.t = setTimeout(pintarPanelAv, 0); };
document.addEventListener('change', (e) => {
  const t = e.target; if (!$('#panelAv') || !t.closest || !t.closest('#panelAv')) return;
  if (t.matches('[data-graf-pos]')) { S.grafPos = t.value; repintarAv(); }
  else if (t.matches('[data-obj-k]')) {
    const x = pavPonerObj(t.dataset.objK, String(t.value).replace(',', '.'));
    if (x.cortado) toast(L(`Entre todos no pueden pasar de 100 %: ${trad(t.dataset.objK)} se queda en ${pct(x.n, 1)}.`, `Together they can't go over 100%: ${trad(t.dataset.objK)} stays at ${pct(x.n, 1)}.`), 3500);
    repintarAv();
  } else if (t.matches('[data-obj-add]')) {
    if (!t.value) return;
    const o = { ...pavObjetivo(reparto(S.M || calcular(), 'clase', 'todo')), [t.value]: 0 }; LS.set(LS_OBJ, o); repintarAv();
  } else if (t.matches('[data-rebal-aport]')) { S.rebalAport = Math.max(0, +t.value || 0); repintarAv(); }
});
document.addEventListener('input', (e) => {
  const t = e.target; if (!t.matches) return;
  // mientras escribes, el campo no deja pasar de lo que queda por repartir; el resto se repinta al salir del campo
  if (t.matches('#panelAv [data-obj-k]')) {
    if (t.value === '') return;
    const x = pavPonerObj(t.dataset.objK, String(t.value).replace(',', '.'));
    if (x.cortado) { t.value = String(x.n); t.classList.remove('ro-tope'); void t.offsetWidth; t.classList.add('ro-tope'); vibrar(20); }
    return;
  }
  if (t.matches('#panelAv [data-rebal-aport]')) { S.rebalAport = Math.max(0, +t.value || 0); return; }
  if (!t.matches('#panelAv [data-lab]')) return;
  S.lab = { ...(S.lab || {}), [t.dataset.lab]: t.value === '' ? undefined : +t.value };
  const r = $('#labRes'); if (r) { r.innerHTML = pavLabRes(S.M || calcular()); marcarCifras(r); }
});
