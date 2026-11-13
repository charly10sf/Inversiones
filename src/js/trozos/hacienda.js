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
.hz-tira { display: grid !important; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) auto; align-items: center; gap: 24px; padding: 18px 22px !important; }
.hz-tira-p { display: grid; gap: 6px; } .hz-tira-p > b { font: 600 18px/1.2 var(--ui); } .hz-falta-t { color: var(--aviso); font-weight: 600; }
.hz-seg { display: flex; gap: 4px; margin-top: 4px; }
.hz-seg i { flex: 1; height: 6px; border-radius: 9px; background: var(--sep); }
.hz-seg i.z-listo { background: var(--primario); } .hz-seg i.z-falta { background: var(--aviso); }
.hz-tira-r { display: grid; gap: 2px; justify-items: start; padding-left: 24px; border-left: 1px solid var(--sep); }
.hz-tira-r small { font-size: 12px; color: var(--tenue); } .hz-tira-r b { font: 500 22px/1.15 var(--ui); letter-spacing: -.02em; }
.hz-A { display: grid; grid-template-columns: 330px minmax(0, 1fr); gap: 20px; align-items: start; }
.hz-lista { padding: 10px !important; position: sticky; top: 84px; max-height: calc(100vh - 100px); overflow: auto; scrollbar-width: thin; }
.hz-A-der { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; min-width: 0; }
.hz-panel > *, .hz-sec > *, .hz-falta-c > * { min-width: 0; }
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
.hz-panel { display: grid !important; grid-template-columns: minmax(0, 1fr); gap: 20px !important; padding: 26px 28px !important; min-width: 0; }
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
.hz-gratis { display: grid !important; gap: 12px !important; margin-bottom: 8px; font-variant-numeric: tabular-nums; }
.hz-gratis .hz-ey { display: block; font: 600 11px/1.2 var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--texto-2); }
.hz-gr-n { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.hz-gr-n > div { display: grid; gap: 4px; } .hz-gr-n b { font: 300 34px/1 var(--ui); letter-spacing: -.03em; } .hz-gr-n span { font-size: 12.5px; color: var(--tenue); }
.hz-gr-n i { font-style: normal; font-size: 22px; color: var(--tenue); padding-bottom: 20px; }
.hz-gr-n .z-tot b { font-weight: 400; }
.hz-gr-de { display: flex; flex-wrap: wrap; gap: 6px 18px; padding-top: 12px; border-top: 1px solid var(--sep); font-size: 13px; color: var(--texto-2); }
.hz-gr-de b { font-weight: 600; color: var(--texto); }
@media (max-width: 599px) { .hz-gr-n { gap: 8px; flex-wrap: nowrap; } .hz-gr-n b { font-size: 25px; } .hz-gr-n i { font-size: 16px; padding-bottom: 18px; } .hz-gr-n span { font-size: 11.5px; } }
.hz-tira-b { display: flex; gap: 8px; }
.hz-falta-b { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.hz-falta-n { margin: 4px 0 0; font-size: 13px; color: var(--texto-2); }
.hz-falta.z-hecho { grid-template-columns: auto 1fr auto; align-items: center; background: var(--sube-fondo); box-shadow: none; padding: 12px 14px; }
.hz-falta.z-hecho > .hz-ic { color: var(--sube); }
.hz-falta.z-hecho div { display: grid; gap: 2px; } .hz-falta.z-hecho b { font-size: 14px; font-weight: 600; } .hz-falta.z-hecho span { font-size: 13px; color: var(--texto-2); }
.hz-cmp { display: grid; gap: 8px; padding: 14px; border-radius: var(--r-m); border: 1px dashed var(--aro); }
.hz-cmp label { font: 600 13.5px/1.2 var(--ui); }
.hz-cmp-f { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.hz-cmp-f input { width: 150px; height: 44px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--borde); background: var(--superficie-2); color: var(--texto); font: 500 15px/1 var(--ui); font-variant-numeric: tabular-nums; text-align: right; }
.hz-cmp-f span { color: var(--tenue); }
.hz-cmp-r { display: flex; gap: 8px; align-items: flex-start; margin: 2px 0 0; font-size: 13.5px; line-height: 1.5; }
.hz-cmp-r.z-ok { color: var(--sube); } .hz-cmp-r.z-mal { color: var(--aviso); }
.hz-cmp-r .hz-ic { margin-top: 1px; }
.hz-hoja { display: grid; gap: 16px; }
.hz-hoja-cab { display: flex; justify-content: space-between; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
.hz-hoja-cab h3 { margin: 6px 0 4px; font: var(--titulo-estilo, normal) var(--titulo-peso, 500) 26px/1.15 var(--titulo); letter-spacing: var(--titulo-espacio, -.02em); }
[data-tema="marfil"] .hz-hoja-cab h3 { font-family: var(--marca); letter-spacing: 0; }
.hz-hoja-cab p { margin: 0; font-size: 13.5px; color: var(--tenue); }
.hz-hoja-b { display: flex; gap: 8px; flex-wrap: wrap; }
.hz-hoja-p { display: flex; align-items: center; gap: 12px; font: 600 12.5px/1 var(--ui); color: var(--texto-2); }
.hz-prog { flex: 1; max-width: 240px; height: 6px; border-radius: 9px; background: var(--sep); overflow: hidden; }
.hz-prog i { display: block; height: 100%; background: var(--primario); transition: width .3s; }
.hz-hg { display: grid; padding: 12px 16px 6px; border-radius: var(--r-l); box-shadow: inset 0 0 0 1px var(--aro); background: color-mix(in srgb, var(--superficie) 70%, transparent); }
.hz-hg h4 { margin: 0; padding-bottom: 6px; font: 600 11px/1.2 var(--ui); letter-spacing: .12em; text-transform: uppercase; color: var(--tenue); }
.hz-hg.z-no { padding-bottom: 12px; box-shadow: inset 0 0 0 1px var(--sep); background: none; }
.hz-hg.z-no p { margin: 0; font-size: 13px; line-height: 1.5; color: var(--texto-2); }
.hz-hf { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 11px 0 8px; border-top: 1px solid var(--sep); }
.hz-hg h4 + .hz-hf { border-top: 0; }
.hz-hf-t { display: grid; gap: 4px; } .hz-hf-t b { font-size: 14.5px; font-weight: 600; } .hz-hf-t small { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.hz-hf.z-hecho .hz-hf-t b { text-decoration: line-through; text-decoration-color: var(--tenue); color: var(--texto-2); }
.hz-hf-tag { font: 600 11px/1 var(--ui); color: var(--texto-2); }
.hz-hf-tag.z-tu { color: var(--oro-texto); } .hz-hf-tag.z-mira { color: var(--aviso); }
.hz-hf-n { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; border: 0; background: none; padding: 6px 8px; margin-right: -8px; border-radius: 8px; font: 600 15.5px/1 var(--ui); font-variant-numeric: tabular-nums; color: var(--texto); cursor: pointer; }
.hz-hf-n .hz-ic { width: 14px; height: 14px; color: var(--tenue); }
.hz-hf-n:hover { background: var(--primario-fondo); } .hz-hf-n:hover .hz-ic { color: var(--oro-texto); }
.hz-hf-s { font-size: 13px; color: var(--tenue); padding-right: 8px; }
.hz-hs { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 0 0 2px 40px; font-size: 13px; color: var(--texto-2); }
.hz-hs .hz-hf-n { font-size: 14px; font-weight: 500; color: var(--texto-2); }
.hz-ck { position: relative; display: inline-grid; place-items: center; width: 44px; height: 44px; margin: -10px; cursor: pointer; }
.hz-ck input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
.hz-ck i { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; box-shadow: inset 0 0 0 1.5px var(--aro); color: transparent; }
.hz-ck i .hz-ic { width: 14px; height: 14px; stroke-width: 2.4; }
.hz-ck input:checked + i { background: var(--primario); box-shadow: none; color: var(--sobre-primario); }
.hz-ck input:focus-visible + i { outline: 2px solid var(--primario); outline-offset: 2px; }
.hz-hoja-pie { display: grid; gap: 4px; padding: 4px 2px 0; font-size: 13px; color: var(--texto-2); } .hz-hoja-pie b { color: var(--texto); }
.hz-hoja.z-lado { max-width: 420px; }
.hz-hoja.z-lado .hz-hoja-cab { flex-direction: column; align-items: flex-start; }
.hz-B-hoja { display: grid; grid-template-columns: 420px 1fr; gap: 20px; align-items: start; }
.hz-B-hoja .hz-volver { grid-column: 1 / -1; justify-self: start; }
.hz-B-hoja .hz-hoja { padding: 20px; border-radius: var(--r-xl); background: var(--superficie); box-shadow: inset 0 0 0 1px var(--borde); }
.hz-renta-web { position: sticky; top: 84px; display: grid; justify-items: start; align-content: start; gap: 10px; padding: 18px; border-radius: var(--r-l); border: 1.5px dashed var(--aro); color: var(--texto-2); }
.hz-renta-web span { font: 600 11px/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; } .hz-renta-web p { margin: 0; font-size: 13.5px; max-width: 46ch; line-height: 1.5; }
@media (max-width: 899px) { .hz-solo-pc { display: none !important; } }
@media print {
  body * { visibility: hidden !important; }
  #hzHoja, #hzHoja * { visibility: visible !important; }
  #hzHoja { position: absolute; left: 0; top: 0; width: 100%; max-width: none; color: CanvasText; background: Canvas; }
  #hzHoja .hz-hoja-b, #hzHoja .hz-ck, #hzHoja .hz-hf-n .hz-ic { display: none !important; }
  #hzHoja .hz-hf { grid-template-columns: minmax(0, 1fr) auto; }
  #hzHoja .hz-hg { box-shadow: none; border: 1px solid GrayText; break-inside: avoid; }
}
@media (max-width: 899px) {
  .hz-A { grid-template-columns: minmax(0, 1fr); }
  .hz-lista { position: static; max-height: none; }
  .hz-tira { grid-template-columns: 1fr; gap: 12px; }
  .hz-tira-r { padding-left: 0; border-left: 0; }
  .hz-hs { padding-left: 20px; }
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
  lado: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M14 4.5v15"/>',
  imprimir: '<path d="M7.5 9V4.5h9V9"/><rect x="4" y="9" width="16" height="7.5" rx="2"/><path d="M7.5 14h9v6h-9z"/>',
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
  // con ganancia, un intermediario español retiene el 19 %: se pregunta una vez (fiscal[año].hzRetEtc) y se suma a lo retenido
  const gEtc = sum(etc, (m) => Math.max(0, hzNeto(m))), retEtc = d.hzRetEtc == null || d.hzRetEtc === '' ? null : +d.hzRetEtc;
  if (etc.length) add({ k: 'c0031', g: 'rcm', cas: '0031', t: etc.length === 1 ? `${nombreInst(etc[0].instrumento)} (ETC)` : 'Ventas de ETC', sub: resumenVentas(etc), v: fa.rcmVentas, o: origen(etc), e: gEtc > 0.5 && retEtc == null ? 'falta' : 'listo', ventas: etc,
    preg: gEtc > 0.5 ? { g: gEtc, r: retEtc, plats: yLista([...new Set(etc.map((m) => m.plataforma).filter(Boolean))]) } : null,
    pone: [['Valor de transmisión', sum(etc, (m) => +m.importe || 0)], ['Valor de adquisición', sum(etc, (m) => +m.coste_vendido || 0)], ...(retEtc ? [['Retenciones', retEtc]] : [])],
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
  add({ k: 'hoja', g: 'sale', t: 'Tu hoja para Renta Web', sub: 'Para tenerla al lado', e: 'sale', nav: true });
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
  // las fechas de compra de lo que salió en esta venta (FIFO), si Toisón las tiene
  const fx = [...new Set((Array.isArray(m.fifo) ? m.fifo : []).map((l) => l.f).filter((f) => /^\d{4}-\d\d-\d\d/.test(f || '')))].sort();
  return `<div class="hz-venta${on ? ' z-on' : ''}"><button type="button" class="hz-venta-cab" data-hz="abre" data-id="${esc(m.id)}" aria-expanded="${on}"><span><b>${esc(nombreInst(m.instrumento))}</b><small>${fmtNum(+m.uds, +m.uds % 1 ? 4 : 0)} ${cripto ? (i.simbolo || 'uds.') : +m.uds === 1 ? 'ud.' : 'uds.'} · ${fechaCorta(m.fecha)} · ${esc(m.plataforma || '')}</small></span><b class="${r < 0 ? 'hz-baja' : 'hz-sube'}">${hzSg(r)}</b>${hzIc(on ? 'abajo' : 'der', 'hz-chev')}</button>
    ${on ? `<div class="hz-venta-c">${m.coste_vendido != null ? hzCuenta([['Lo cobraste al vender, ya sin comisiones', +m.importe || 0], ['Lo que te costó, con sus comisiones', -(+m.coste_vendido || 0)]], [m.resultado < 0 ? 'Pérdida' : 'Ganancia', m.resultado || 0]) : ''}
      ${ap ? `<p class="hz-ojo"><b>Esta pérdida no cuenta entera este año.</b> Volviste a comprar ${esc(nombreInst(m.instrumento))} el ${fechaCorta(ap.fecha)}, dentro de ${ap.r.plazo}: ${eur(-ap.importe, 2)} se aplazan hasta que vendas lo recomprado. Renta Web te lo pide como pérdida no computable.</p>` : ''}
      ${fx.length ? `<p class="hz-ojo">${fx.length === 1 ? `Hacienda cuenta que vendes primero lo que compraste antes: ${fmtNum(+m.uds, +m.uds % 1 ? 4 : 0)} de tu compra del ${fechaLarga(fx[0])}.` : `Hacienda cuenta que vendes primero lo que compraste antes: salen de ${fx.length} compras, la primera del ${fechaLarga(fx[0])}.`}</p>` : ''}
      <div class="hz-campos">${cripto ? hzCampo(['Moneda virtual', `${i.nombre || nombreInst(m.instrumento)}${i.simbolo ? ` (${i.simbolo})` : ''}`]) : hzCampo(['Entidad emisora', i.nombre || nombreInst(m.instrumento)])}${hzCampo(['Valor de transmisión', +m.importe || 0])}${m.coste_vendido != null ? hzCampo(['Valor de adquisición', +m.coste_vendido]) : ''}${hzCampo(['Fecha de transmisión', fechaEs(m.fecha)])}${fx.length === 1 ? hzCampo(['Fecha de adquisición', fechaEs(fx[0])]) : fx.length ? hzCampo(['Fechas de adquisición', fx.map(fechaEs).join(', ')], false) : ''}</div></div>` : ''}</div>`;
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

// lo que falta del ETC: ¿te retuvieron algo al venderlo?
function hzPregEtc(c) {
  const p = c.preg, st = hzEstado();
  if (p.r != null) return `<div class="hz-falta z-hecho">${hzIc('ok')}<div><b>Contestado: ${p.r ? `te retuvieron ${eur(p.r, 2)}` : 'no te retuvieron nada'}.</b><span>${p.r ? 'Se resta de lo que pagas.' : 'Así queda: sin retención.'}</span></div><button type="button" class="hz-enl" data-hz="etc" data-r="borrar">Cambiar</button></div>`;
  const r19 = Math.round(p.g * 19) / 100;
  return `<div class="hz-falta"><span class="hz-falta-i">${hzIc('alerta')}</span><div class="hz-falta-c"><b>¿${esc(p.plats || 'Tu bróker')} te retuvo algo al vender?</b>
    <span>Los brókeres españoles retienen el 19 % de lo que ganas con un ETC (aquí serían ${eur(r19, 2)}); los de fuera, normalmente nada. Sale en su informe fiscal, que publican en enero.</span>
    <div class="hz-falta-b"><button type="button" class="btn peq" data-hz="etc" data-r="0">No, nada</button><button type="button" class="btn peq" data-hz="etc" data-r="${r19}">Sí, ${eur(r19, 2)}</button><button type="button" class="btn peq" data-hz="etc" data-r="otra">Otra cifra</button><button type="button" class="btn peq" data-hz="etc" data-r="nose">No lo sé</button></div>
    ${st.etcOtra ? `<div class="hz-cmp-f"><input id="hzEtcOtra" inputmode="decimal" aria-label="Lo que te retuvieron, en euros" placeholder="${hzN(r19)}"><span>€</span><button type="button" class="btn pri peq" data-hz="etc" data-r="leer">Guardar</button></div>` : ''}
    ${st.etcNose ? '<p class="hz-falta-n">Cuando llegue el informe de tu bróker, contéstalo aquí. Mientras, la cuenta va sin retención.</p>' : ''}</div></div>`;
}
// ¿qué pone tu borrador? Se compara con lo tuyo y se guarda (cifrado, con la cartera) por si vuelves
function hzComparar(c, R) {
  const obj = c.k === 'perd' ? -c.v : c.v, b = ((R.d.hzBorr || {})[c.k]) ?? '';
  let res = '';
  if (b !== '') {
    const n = numero(String(b));
    if (n != null && !Number.isNaN(n)) res = Math.abs(n - obj) < 0.005 ? `<p class="hz-cmp-r z-ok">${hzIc('ok')}Cuadra con lo tuyo.</p>`
      : `<p class="hz-cmp-r z-mal">${hzIc('alerta')}<span>No cuadra: el borrador dice ${eur(n, 2)} y a ti te sale ${eur(obj, 2)} (${hzSg(obj - n)}). ${c.k === 'c0328' && Math.abs(n) < 0.005 ? 'Lo más probable: tu bróker las puso en la 0031. Míralo allí.' : 'Mira qué venta o qué cobro le falta o le sobra al borrador: la cifra de Toisón sale de tus movimientos.'}</span></p>`;
  }
  return `<div class="hz-cmp"><label for="hzCmp-${c.k}">¿Qué pone tu borrador?</label><div class="hz-cmp-f"><input id="hzCmp-${c.k}" inputmode="decimal" placeholder="${hzN(obj)}" value="${esc(b)}" data-hz-cmp="${c.k}"><span>€</span><button type="button" class="btn peq" data-hz="cmp" data-k="${c.k}">Comparar</button></div>${res}</div>`;
}

function hzCuerpo(c, R, M) {
  if (c.k === 'datos') return hzDatosPaso(R, M);
  if (c.k === 'res') return hzResPaso(R);
  if (c.k === 'hoja') return hzHoja(R, { sinTit: true });
  const falta = c.falta ? `<div class="hz-falta"><span class="hz-falta-i">${hzIc('alerta')}</span><div class="hz-falta-c"><b>${esc(c.falta.t)}</b><span>${c.falta.x}</span><button type="button" class="btn peq" data-hz="datos">${esc(c.falta.b)}</button></div></div>` : '';
  const ventas = c.ventas ? `<div class="hz-sec"><h4>Venta a venta: lo que vas a ver en Renta Web</h4><div class="hz-ventas">${c.ventas.map((m) => hzVenta(m, c.cripto)).join('')}</div></div>` : '';
  const deSale = c.de ? `<div class="hz-sec"><h4>De dónde sale</h4>${hzCuenta(c.de, c.tot || (c.v != null ? ['Lo tuyo', c.v] : null))}</div>` : '';
  const pone = c.pone ? `<div class="hz-sec"><h4>${c.o === 'tu' ? 'Lo que vas a teclear' : 'Lo que tiene que poner'}</h4><div class="hz-campos">${c.pone.map((x) => hzCampo(x)).join('')}</div></div>` : '';
  return `${falta}${deSale}${c.preg ? hzPregEtc(c) : ''}${ventas}${pone}${c.ojo ? `<p class="hz-ojo">${c.ojo}</p>` : ''}${c.o === 'borrador' && c.v != null && (c.k !== 'perd' || c.v) ? hzComparar(c, R) : ''}`;
}

/* ---------- la hoja para tener al lado de Renta Web: en su orden, con marcar, copiar todo e imprimir ---------- */
const HZ_RENTA_WEB = 'https://sede.agenciatributaria.gob.es/Sede/Renta.html';
function hzFilasHoja(R) {
  const out = [];
  for (const c of R.L) {
    if (c.nav || c.e === 'no') continue;
    const subs = [];
    if (c.ventas) for (const m of c.ventas) { const n = nombreInst(m.instrumento); subs.push([`${n} · transmisión`, +m.importe || 0]); if (m.coste_vendido != null) subs.push([`${n} · adquisición`, +m.coste_vendido]); }
    else if (c.pone) for (const [t, v] of c.pone) if (typeof v === 'number' && Math.abs(v - (c.v || 0)) > 0.004) subs.push([t, v]);
    if (c.k === 'c0031' && c.preg && c.preg.r) subs.push(['Retenciones', c.preg.r]);
    out.push({ c, subs, val: c.k === 'perd' ? (c.v ? -c.v : null) : c.v });
  }
  return out;
}
function hzHoja(R, { sinTit = false, lado = false } = {}) {
  const fil = hzFilasHoja(R), hechos = new Set(R.d.hzHechos || []), n = fil.filter((f) => hechos.has(f.c.k)).length;
  const neto = R.fa.cuota - R.fa.retenido, no = R.L.filter((c) => c.e === 'no');
  const tag = (c) => (c.o === 'tu' ? '<span class="hz-hf-tag z-tu">mételo tú</span>' : c.e === 'comprueba' ? '<span class="hz-hf-tag z-mira">mira dónde la pone</span>' : c.e === 'falta' ? '<span class="hz-hf-tag z-mira">falta un dato</span>' : '<span class="hz-hf-tag">compruébalo</span>');
  const num = (v, et) => `<button type="button" class="hz-hf-n" data-hz="copia" data-v="${hzCopiable(v)}" aria-label="Copiar ${esc(et)}">${hzN(v)}${hzIc('copiar')}</button>`;
  const fila = ({ c, subs, val }) => `<div class="hz-hf${hechos.has(c.k) ? ' z-hecho' : ''}"><label class="hz-ck"><input type="checkbox" data-hz-hecho="${c.k}"${hechos.has(c.k) ? ' checked' : ''} aria-label="Hecho: ${esc(c.t)}"><i>${hzIc('ok')}</i></label>
      <div class="hz-hf-t"><b>${esc(c.t)}</b><small>${hzCasN(c)} ${tag(c)}</small></div><div class="hz-hf-v">${val != null ? num(val, c.t) : '<span class="hz-hf-s">en el borrador</span>'}</div></div>
    ${subs.map(([t, v]) => `<div class="hz-hs"><span>${esc(t)}</span>${num(v, t)}</div>`).join('')}`;
  const grupos = []; for (const f of fil) { if (!grupos.length || grupos[grupos.length - 1].g !== f.c.g) grupos.push({ g: f.c.g, fs: [] }); grupos[grupos.length - 1].fs.push(f); }
  return `<div class="hz-hoja${lado ? ' z-lado' : ''}" id="hzHoja">
    <div class="hz-hoja-cab"><div>${sinTit ? '' : `<small class="hz-ey">Renta de ${R.anio}</small><h3>Lo que metes en Renta Web</h3>`}<p>En el orden de Renta Web. Ve marcando lo que ya está.</p></div>
      <div class="hz-hoja-b">${lado ? '' : `<button type="button" class="btn peq hz-solo-pc" data-hz="lado">${hzIc('lado')}Para tener al lado</button>`}<button type="button" class="btn peq" data-hz="copiaTodo">${hzIc('copiar')}Copiar todo</button><button type="button" class="btn peq" data-hz="imprimir">${hzIc('imprimir')}Imprimir o PDF</button></div></div>
    <div class="hz-hoja-p"><span>${n} de ${fil.length} hechas</span><div class="hz-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${fil.length}" aria-valuenow="${n}" aria-label="Hechas"><i style="width:${fil.length ? (n / fil.length) * 100 : 0}%"></i></div></div>
    ${grupos.map(({ g, fs }) => `<div class="hz-hg"><h4>${HZ_AP[g]}</h4>${fs.map(fila).join('')}</div>`).join('')}
    ${no.length ? `<div class="hz-hg z-no"><h4>No te toca</h4><p>${esc(yLista(no.map((c) => c.t + (c.cas ? ` (${c.cas})` : ''))))}.</p></div>` : ''}
    <div class="hz-hg z-no"><h4>Lo demás, en Renta Web</h4><p>Vivienda, alquiler, deducciones de tu comunidad, donativos, plan de pensiones: lo revisas allí.</p></div>
    <div class="hz-hoja-pie"><span>Por tus inversiones: <b>${eur(Math.abs(neto), 0)} ${neto >= -0.5 ? 'a pagar' : 'retenidos de más'}</b>, sin contar tu sueldo.</span><span>Si el borrador no cuadra, mira qué venta o qué cobro le falta: la cifra de Toisón sale de tus movimientos.</span></div>
  </div>`;
}
function hzTextoHoja(R) {
  const L1 = [`Renta de ${R.anio} · lo que metes en Renta Web (Toisón)`];
  for (const { c, subs, val } of hzFilasHoja(R)) {
    L1.push(`${c.cas ? c.cas + ' ' : ''}${c.t}: ${val != null ? hzCopiable(val) : 'en el borrador'}`);
    for (const [t, v] of subs) L1.push(`  ${t}: ${hzCopiable(v)}`);
  }
  return L1.join('\n');
}
function hzLado(R) {
  return `<div class="hz-B-hoja"><button type="button" class="hz-enl hz-volver" data-hz="lado">${hzIc('izq')}Volver al recorrido</button>${hzHoja(R, { lado: true })}
    <div class="hz-renta-web"><span>Renta Web, en otra ventana</span><p>Abre Renta Web en otra ventana y pon esta al lado: la hoja ocupa 420 px y cada cifra se copia con un toque.</p><a class="btn peq" href="${HZ_RENTA_WEB}" target="_blank" rel="noopener">Abrir Renta Web</a></div></div>`;
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
    <div class="hz-tira-r"><small>Por tus inversiones</small><b class="${neto > 0.5 ? 'hz-baja' : neto < -0.5 ? 'hz-sube' : ''}">${eur(Math.abs(neto), 0)} ${neto > 0.5 ? 'a pagar' : neto < -0.5 ? 'retenidos de más' : ''}</b>${res ? `<button type="button" class="hz-enl" data-hz="ir" data-k="res">Cómo sale</button>` : ''}</div>
    <div class="hz-tira-b"><button type="button" class="btn peq" data-hz="ir" data-k="hoja">${hzIc('lado')}La hoja</button></div></section>`;
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
  if (hzEstado().lado && matchMedia('(min-width: 900px)').matches) return `<div id="hz" class="hz-pH">${hzLado(R)}</div>`;
  return `<div id="hz" class="hz-pH">${hzTira(R)}<div class="hz-A"><aside class="tarjeta hz-lista" aria-label="Las casillas de tu renta">${hzLista(R)}</aside><div class="hz-A-der">${hzPanel(R, M)}</div></div></div>`;
}
/* Hacienda tiene dos páginas, las dos en este trozo: Tu renta (el recorrido) y Cómo tributa y calendario (lo que
   pagas este año, cómo tributa cada cosa, el calendario y lo de antes de «Lo que pagas») */
function pintarHacienda() {
  const el = $('#panelHz'); if (!el || !S.M) return;
  ponerCssHz();
  el.innerHTML = el.dataset.hzPag === 'tu' ? htmlImpuestos(S.M) : htmlHacienda(S.M);
  el.removeAttribute('aria-busy');
  hzEstado().dir = null;
  marcarCifras(el); ponerPreguntale(el); plegarNotas(el); marcarDeslizables(el);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('#panelHz [data-hz]'); if (!b) return;
  const st = hzEstado(), R = S.hzUlt, q = b.dataset.hz;
  if (q === 'copia') { const v = b.dataset.v; try { navigator.clipboard.writeText(v); } catch (x) { /* sin permiso: queda el aviso */ } toast(`Copiado: ${v}`, 1800); return; }
  if (q === 'datos') { editarFiscal(R ? R.anio : anioRenta()); return; }
  if (q === 'ccaa') { cambiarComunidad(); return; }
  if (q === 'filtro') { st.filtro = b.dataset.f; pintarHacienda(); return; }
  if (q === 'lado') { st.lado = !st.lado; pintarHacienda(); scrollTo(0, 0); return; }
  if (q === 'copiaTodo') { if (R) { try { navigator.clipboard.writeText(hzTextoHoja(R)); } catch (x) { /* sin permiso */ } toast('Copiada la hoja entera', 1800); } return; }
  if (q === 'imprimir') { print(); return; }
  if (q === 'cmp') { hzGuardarBorr(b.dataset.k); return; }
  if (q === 'etc') {
    const r = b.dataset.r, y = scrollY;
    if (r === 'otra') { st.etcOtra = true; st.etcNose = false; pintarHacienda(); scrollTo(0, y); const i = $('#hzEtcOtra'); if (i) i.focus(); return; }
    if (r === 'nose') { st.etcNose = true; st.etcOtra = false; pintarHacienda(); scrollTo(0, y); return; }
    let v = r === 'borrar' ? null : r === 'leer' ? numero(($('#hzEtcOtra') || {}).value) : +r;
    if (r === 'leer' && (v == null || Number.isNaN(v) || v < 0)) { toast('Pon lo que te retuvieron, en euros', 2400); return; }
    const d = hzFis(R);
    if (v == null) delete d.hzRetEtc; else d.hzRetEtc = Math.round(v * 100) / 100;
    st.etcOtra = false; st.etcNose = false;
    guardarCartera('Tu renta').then(() => { S.M = calcular(); pintarHacienda(); scrollTo(0, y); });
    return;
  }
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
/* lo que pagas (o te ahorras) con cada cosa que te recomienda la web, todo junto */
function htmlFiscalRecom(M, fa) {
  // 0.7g: en el modo de todos (estándar) GrowFolio no recomienda nada (CNMV): sin esta tabla ni lo que la anuncia
  if (esPublico()) return '';
  const anio = new Date().getFullYear(), filas = [];
  const planes = M.filas.map((f) => planVenta(f, M)).filter(Boolean);
  let gan = 0, ganR = 0; // lo que suman las ventas del plan: ganancias y, aparte, lo de los ETC (rendimiento del capital)
  for (const pl of planes) {
    const esR = esRCMVenta(pl.f.inst), antes = fiscalAnio(anio, gan, ganR).cuota;
    if (esR) ganR += pl.ganancia; else gan += pl.ganancia;
    const despues = fiscalAnio(anio, gan, ganR).cuota;
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
    const esR = esRCMVenta(x.f.inst);
    const ahorro = fiscalAnio(anio, gan, ganR).cuota - fiscalAnio(anio, gan + (esR ? 0 : x.g), ganR + (esR ? x.g : 0)).cuota;
    if (ahorro >= 15) filas.push({ q: `Vender ${x.resto ? 'el resto de ' : ''}${esc(x.f.inst.corto)} con pérdidas`, d: `${eurS(x.g, 0)}: resta de ${esR ? 'tus rendimientos del capital del año (dividendos, intereses y otros ETC)' : 'tus ganancias del año'}${x.f.inst.clase === 'Cripto' && !esR ? '; en cripto la norma no está clara: para ir sobre seguro, no la recompres en un año' : `; no ${/^Fondo/.test(x.f.inst.tipo || '') ? 'lo' : 'la'} recompres en ${(reglaRecompra(x.f.inst) || {}).plazo || 'dos meses'}`}`, v: -ahorro, c: `en la renta de ${anio}`, opc: true });
  }
  const ap = sum(aportacionesActivas(), ({ a }) => +a.importe || 0);
  if (ap > 0) filas.push({ q: `Aportar ${eur(ap, 0)} al mes`, d: 'a fondos de acumulación: no reparten dividendos, no tributan hasta que vendas', v: 0, c: '' });
  if (!filas.length) return '';
  const tot = sum(filas.filter((x) => !x.opc), (x) => x.v);
  return `<section style="margin-top:44px" aria-labelledby="hFisR"><div class="sec-cab"><h2 id="hFisR">Lo que costaría cada paso de tu plan</h2><span class="k">con lo que ya llevas en ${anio}</span></div>
    <div class="tabla-w"><table class="resp"><thead><tr><th>Recomendación</th><th>Qué pasa con Hacienda</th><th class="r">Impuesto</th></tr></thead><tbody>
      ${filas.map((x) => `<tr><td><b style="font-weight:600">${x.q}</b>${x.opc ? '<small>opcional</small>' : ''}</td><td class="txt">${x.d}${x.c ? `<small>${esc(x.c)}</small>` : ''}</td><td class="r ${x.v < 0 ? 'up' : ''}">${x.v ? (x.v < 0 ? `${eur(-x.v, 0)} ${L('menos', 'less')}<small>${L('te lo ahorras', 'you save it')}</small>` : eur(x.v, 0)) : '0\u00a0€'}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="nota">Con todo lo que Toisón recomienda hacer ya, la renta de ${anio} sube unos ${eur(tot, 0)}${filas.some((x) => x.opc) ? '; con lo opcional, menos' : ''}. Cada cifra sale de tu tramo del ahorro (${pctTramo(fa.marginal)} % ahora) y de lo que ya llevas declarado este año.</p></section>`;
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
/* lo gratis de arriba: lo que pagas este año por tus inversiones, en una cuenta (impuesto − retenido = lo que queda) */
function hzGratis(fa) {
  const queda = fa.cuota - fa.retenido, chip = (t, v) => `<span>${t} <b>${v}</b></span>`;
  return `<section class="tarjeta hz-gratis" id="hzGratis"><small class="hz-ey">Este año, por tus inversiones</small>
    <div class="hz-gr-n"><div><b>${eur(fa.cuota, 0)}</b><span>de impuesto</span></div>${fa.retenido ? `<i aria-hidden="true">−</i><div><b>${eur(fa.retenido, 0)}</b><span>ya retenidos</span></div><i aria-hidden="true">=</i><div class="z-tot"><b class="${queda > 0.5 ? 'hz-baja' : queda < -0.5 ? 'hz-sube' : ''}">${eur(Math.abs(queda), 0)}</b><span>${queda >= -0.5 ? 'a pagar en la renta' : 'retenidos de más'}</span></div>` : ''}</div>
    <div class="hz-gr-de">${chip('Ventas', eurS(fa.gp, 0))}${fa.usadas ? chip('Pérdidas de otros años', eurS(-fa.usadas, 0)) : ''}${chip('Dividendos e intereses', eur(fa.rcm, 0))}${fa.nRCM ? chip(fa.nRCM === 1 ? 'Venta de ETC' : 'Ventas de ETC', eurS(fa.rcmVentas, 0)) : ''}${chip('Base del ahorro', `${eur(fa.base, 0)}</b>, tramo del <b>${pctTramo(fa.marginal)} %`)}${fa.sobra + fa.sobraRCM > 0 ? chip(`Pérdidas para hasta ${fa.anio + 4}`, eur(fa.sobra + fa.sobraRCM, 0)) : ''}</div></section>`;
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
    return { f, g, imp: g > 0 ? impuestoDeVenta(g, anio, f.inst).impuesto : 0 };
  }).sort((a, b) => b.g - a.g);
  const totLat = sum(latentes, (x) => x.g);
  const todo = impuestoDeVentas(latentes.map((x) => ({ g: x.g, inst: x.f.inst })), anio).impuesto;
  const perdidas = latentes.filter((x) => x.g < 0);
  const fondos = M.filas.filter((f) => /^Fondo/.test(f.inst.tipo || ''));
  const tr = enElExtranjero(M);
  const cripto = sum(M.filas.filter((f) => f.inst.clase === 'Cripto'), (f) => f.valor);
  const divs = M.filas.filter((f) => f.p && f.p.dividendo_pct);
  return `
    <div class="sec-cab"><h2>Lo que pagas en la renta de ${anio}</h2><span class="k">se presenta entre abril y junio de ${anio + 1}</span><div class="der"><button class="btn peq" data-accion="fiscal">${ICONOS.lapiz}Datos fiscales de ${anio}</button></div></div>
    ${!fa.ventas.length && !fa.otras && !fa.rcm && !fa.retenido ? `<div class="fis-vacio"><p><b>${M.dividendos >= 1 ? `Por ahora no has apuntado nada para la renta de ${anio}.` : `Por ahora no pagas nada en la renta de ${anio}.`}</b> ${M.dividendos >= 1 ? (() => { const da = anio === new Date().getFullYear() ? dividendosAnio(M, anio) : null; return `${da && da.bruto >= 1 ? `Por lo que han pagado tus acciones, este año habrás cobrado unos ${eur(da.bruto, 0)} brutos en dividendos (${esc(yLista([...new Set(da.de.map((x) => x.n))]))}), que` : `Tus posiciones reparten unos ${eur(M.dividendos, 0)} brutos al año en dividendos, que`} tributan (desde un ${pctTramo(tramosAhorro()[0][1])} %) aunque no vendas: mira el informe de tu bróker y apunta lo cobrado en «Datos fiscales» para que salga en la cuenta.`; })() : 'Este año no has apuntado ventas ni dividendos.'} Cuando vendas algo, apúntalo en Inicio con «Apuntar compra o venta» y aquí verás lo que te toca.${M.dividendos >= 1 ? '' : ' Si has cobrado dividendos o intereses, ponlos en «Datos fiscales».'}</p>${recom ? '<p class="k">Más abajo, lo que supondría en la renta cada paso de tu plan.</p>' : ''}</div>` : `${hzGratis(fa)}`}
    ${fa.ventas.length ? `<div class="tabla-w"><table class="resp"><thead><tr><th>Venta</th><th class="r">Unidades</th><th class="r">Valor de venta</th><th class="r" title="Hacienda cuenta que vendes primero las que compraste antes (FIFO)">Lo que te costó</th><th class="r">Resultado</th></tr></thead><tbody>${fa.ventas.map((m) => `<tr><td><b style="font-weight:600">${nombreI(m.instrumento)}</b><small>${fechaLarga(m.fecha)}, ${esc(m.plataforma || '')}</small></td><td class="r">${oc(fmtNum(m.uds, 4))}</td><td class="r">${eur(m.importe || 0)}<small>gastos restados</small></td><td class="r">${eur(m.coste_vendido || 0)}<small>${m.fifo && m.fifo.length ? `${m.fifo.length} ${m.fifo.length === 1 ? 'lote' : 'lotes'}${m.mezcla ? ', con el de partida' : ''}` : ''}</small></td><td class="r ${cls(m.resultado)}">${eurS(m.resultado || 0)}</td></tr>`).join('')}</tbody></table></div>` : ''}

    ${recom}
    ${plegarSec(htmlFiscalDividendos(M))}
    <div style="margin-top:28px">
      <details class="num-sec"><summary><span><b>Si vendieras hoy</b><small>vender todo costaría unos ${eur(todo, 0)} en la renta de ${anio}; posición a posición</small></span></summary><div class="num-cuerpo">
        <div class="tabla-w"><table class="resp"><thead><tr><th>Posición</th><th class="r">Ganancia o pérdida</th><th class="r">Impuesto si vendes todo</th><th class="r">Tipo</th></tr></thead><tbody>
          ${latentes.map((x) => `<tr><td><b style="font-weight:600">${esc(x.f.inst.corto || x.f.inst.nombre)}</b><small>${esc(x.f.pos.plataforma || '')}${/^Fondo/.test(x.f.inst.tipo || '') ? ', se puede traspasar sin pagar' : ''}</small></td><td class="r ${cls(x.g)}">${eurS(x.g, 0)}</td><td class="r">${x.imp > 0 ? eur(x.imp, 0) : '—'}</td><td class="r">${x.g > 0 ? pct((x.imp / x.g) * 100, 1) : x.g < 0 ? '<span class="k">resta</span>' : '—'}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="nota">Vender todo hoy costaría unos ${eur(todo, 0)} en la renta de ${anio}. Las pérdidas restan de las ganancias del mismo año; por eso el impuesto de cada fila depende de lo que ya llevas.</p>
      </div></details>
    </div>
    ${htmlFiscalGuia(M, fa, { tr, cripto, fondos, divs })}`;
}
function htmlFiscalComunidad() {
  const c = comunidadUsuario();
  if (!c) return `<section class="fis-ccaa sin" style="margin-top:44px" aria-labelledby="hCcaa"><div class="sec-cab"><h2 id="hCcaa">En tu comunidad</h2></div>
    <p>Pon dónde vives y verás lo que cambia para ti: en País Vasco y Navarra la escala del ahorro es otra, y lo que pagas si tus padres te ayudan con dinero (la entrada de un piso, por ejemplo) va de casi nada a miles de euros según la comunidad.</p>
    <label class="campo fis-ccaa-sel">Tu comunidad<select data-ccaa>${opcionesComunidad('')}</select></label></section>`;
  const d = DONACIONES[c], ns = noticiasComunidad(c, 3);
  return `<section class="fis-ccaa" style="margin-top:44px" aria-labelledby="hCcaa"><div class="sec-cab"><h2 id="hCcaa">${L('En', 'In')} ${esc(conArticulo(c))}</h2><button type="button" class="enlace" data-accion="ccaa-cambiar">Cambiar</button></div>
    <div class="fis-como">
      <div class="fis-c"><b>Tu escala del ahorro</b><small>ventas, dividendos e intereses</small><p>${TRAMOS_FORAL[c] ? L(`Régimen foral: ${textoTramos(c)}. Es la que usa Toisón en tus cálculos.`, `Foral regime: ${textoTramos(c, true)}. Toisón uses it in your figures.`) : 'La misma en toda España (la de arriba): la parte autonómica del ahorro no cambia de una comunidad a otra.'}</p></div>
      ${d ? `<div class="fis-c"><b>Si tus padres te dan dinero</b><small>donación de padres a hijos</small><p>${esc(L(d[0], (DONACIONES_EN[c] || [])[0] || d[0]))} ${esc(L(d[1], (DONACIONES_EN[c] || [])[1] || d[1]))}</p><small class="fis-norma" data-no-trad>${esc(d[2])}</small></div>` : `<div class="fis-c"><b>Si tus padres te dan dinero</b><small>donación de padres a hijos</small><p>${L(`En ${esc(conArticulo(c))} se aplica la norma estatal del impuesto de donaciones, con sus bonificaciones para residentes. Antes de una donación grande, mira la cifra exacta en la Agencia Tributaria.`, `In ${esc(conArticulo(c))} the national gift tax rules apply, with their allowances for residents. Before a large gift, check the exact figure with the Spanish Tax Agency.`)}</p></div>`}
      <div class="fis-c"><b>Cómo hacerlo bien</b><small>para no perder la rebaja</small><p>Por transferencia (que se vea de dónde sale el dinero), con escritura ante notario cuando la comunidad la pide, y presentando el modelo 651 (o el de tu comunidad) en el mes siguiente. Las donaciones del mismo padre en tres años se suman.</p></div>
    </div>
    ${ns.length ? `<h3 class="fis-ccaa-not">${L(`Noticias de ${esc(conArticulo(c))} que tocan tu dinero`, `News from ${esc(conArticulo(c))} that affects your money`)}</h3>${htmlNoticias(ns, false, 3)}` : ''}
  </section>`;
}
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
  const etf = tiene((f) => f.inst.tipo === 'ETF'), etc = tiene((f) => esRCMVenta(f.inst)), cri = tiene((f) => f.inst.clase === 'Cripto' && !esRCMVenta(f.inst));
  const lista = (v) => yLista(v.map((f) => esc(f.inst.corto)));
  const como = [
    x.fondos.length && ['Fondos de inversión', lista(x.fondos), 'Mientras no los vendas no pagas nada. Si pasas el dinero de un fondo a otro (traspaso) tampoco: el impuesto se aplaza hasta que lo saques de verdad. Al reembolsar te retienen el 19 % de la ganancia.'],
    accES.length && ['Acciones españolas', lista(accES), 'Pagas por la ganancia al vender (FIFO: primero salen las más antiguas). Los dividendos llegan con el 19 % retenido, que se resta en la renta.'],
    accEx.length && ['Acciones extranjeras', lista(accEx), 'Igual al vender. Los dividendos pueden traer la retención del país de la sede: en la renta recuperas hasta el 15 % con la deducción por doble imposición; lo que pase de ahí se pierde salvo que lo reclames allí.'],
    etf.length && ['ETF', lista(etf), 'Al vender, como una acción: cada venta paga por la ganancia (FIFO) y no hay traspasos sin impuestos. En la renta van con los fondos, como «fondos cotizados».'],
    etc.length && ['ETC (oro, materias primas…)', lista(etc), 'No es un fondo ni una acción: es un título de deuda. En una consulta de 2025 sobre un ETC de petróleo (V0267-25), Tributos dijo que lo que se gana o se pierde al venderlo es rendimiento del capital mobiliario, como los intereses, y no una ganancia patrimonial; no hay consulta expresa sobre los de oro, pero están hechos igual. Va en otro apartado de la renta, con las ganancias de acciones y fondos solo se compensa hasta un 25 % y, con un bróker español, puede llevar una retención del 19 % de la ganancia al vender. La recompra es de dos meses, cotice donde cotice, y tampoco hay traspasos sin impuestos.'],
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
    if (ap) dosMeses.push({ n: 'warn', t: ap.parte >= 0.999 ? `La pérdida de ${nombreInst(v.instrumento)} (${eurS(v.resultado, 0)}) no cuenta todavía` : `De la pérdida de ${nombreInst(v.instrumento)} (${eurS(v.resultado, 0)}), ${eurS(ap.importe, 0)} no cuentan todavía`, d: `${ap.aporte ? `Tu aportación automática del ${fechaLarga(ap.fecha)}` : `Compraste el ${fechaLarga(ap.fecha)}`}, a menos de ${r.plazo} de la venta${ap.parte < 0.999 ? `, un ${fmtNum(ap.parte * 100, 0)} % de lo que vendiste` : ''}. Esa parte contará cuando vendas lo recomprado; en lo que te calcula Toisón ya no resta.` });
    else if (libre >= hoy) dosMeses.push({ n: 'info', t: `Si recompras ${nombreInst(v.instrumento)} antes del ${fechaLarga(libre)}, esa pérdida no resta este año`, d: `Lo vendiste con ${eurS(v.resultado, 0)} el ${fechaLarga(v.fecha)}; la regla de la recompra (${r.plazo}) la deja para cuando vendas lo recomprado.` });
  }
  // calendario
  const cal = [
    [`${anio}-12-31`, `31 dic ${anio}`, `El año fiscal se cierra el 31 de diciembre: lo que se vende hasta ese día, con ganancia o con pérdida, cuenta en la renta de ${anio}; lo de después, en la del siguiente (ese día la bolsa de Madrid cierra a las 14:00 y en los fondos cuenta la hora de corte). La recompra cuenta: si se compra lo mismo en los dos meses antes o después de vender (acciones y ETF de bolsas de la UE, y los ETC coticen donde coticen) o en el año antes o después (fondos, y acciones y ETF de fuera de la UE), esa pérdida no resta ese año, o solo en la parte que no se recompra. En cripto la regla de los dos meses no se aplica. Los traspasos entre fondos no cuentan.`],
    [`${anio + 1}-02-15`, `ene-feb ${anio + 1}`, 'Los brókeres publican el informe fiscal del año en su app o su web (en Trade Republic: Perfil, Impuestos).'],
    [`${anio + 1}-03-31`, `31 mar ${anio + 1}`, `Modelos 720 y 721, solo si te tocan. Son informativos (no se paga nada) y se presentan del 1 de enero al 31 de marzo. Tocan si a 31 de diciembre tenías fuera de España más de 50.000 € en alguno de estos bloques, cada uno por separado: cuentas (cuenta también el saldo medio del último trimestre); valores y fondos; inmuebles (los tres van en el 720); y cripto en plataformas extranjeras (el 721). Los años siguientes, solo si un bloque sube más de 20.000 € desde la última vez que lo presentaste, o si dejas de tener algo que declaraste. Hoy tienes ${eur(x.tr, 0)} en brókeres de fuera de España y ${eur(x.cripto, 0)} en cripto.`],
    [`${anio + 1}-04-08`, `abril ${anio + 1}`, `Empieza la renta de ${anio}: revisa en el borrador ventas, dividendos e intereses.`],
    [`${anio + 1}-06-30`, `30 jun ${anio + 1}`, 'Último día para presentarla (si sale a pagar y la domicilias, unos días antes).'],
  ].filter(([d]) => d >= hoy);
  // formas legales de pagar menos, según lo que tienes
  const latentes = M.filas.map((f) => ({ f, g: f.valor - f.coste }));
  const perd = latentes.filter((y) => y.g < -50), gan = latentes.filter((y) => y.g > 50);
  const trucos = [
    x.fondos.length && ['Los traspasos entre fondos no tributan', 'Al pasar el dinero de un fondo a otro con un traspaso no se paga nada hasta el día que se saca.'],
    perd.length && gan.length && ['Ganancias y pérdidas del mismo año se compensan', 'Las pérdidas de lo que se vende restan de las ganancias de lo vendido ese mismo año.'],
    ['Una ganancia grande, en uno o en dos años', `Los primeros ${fmtNum(TA[0][0], 0)} € de la base del ahorro pagan el ${pctTramo(TA[0][1])} %; de ahí a ${fmtNum(TA[1][0], 0)} €, el ${pctTramo(TA[1][1])} %. Una venta grande repartida entre dos años puede quedar en el tramo bajo.`],
    ['Acumulación y reparto no tributan igual', 'Un fondo o ETF de acumulación reinvierte los dividendos sin que pagues por ellos cada año; uno de reparto te los da y tributan.'],
    fa.sobra > 0 && ['Tienes pérdidas pendientes de compensar', `Te quedan ${eur(fa.sobra, 0)} para compensar en los próximos 4 años.`],
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

/* lo que se guarda de Tu renta va en la cartera cifrada, en fiscal[año] (claves hz*: hzRetEtc, hzBorr, hzHechos) */
const hzFis = (R) => { const f = (S.cartera.fiscal = S.cartera.fiscal || {}); return (f[R.anio] = f[R.anio] || {}); };
function hzGuardarBorr(k) {
  const R = S.hzUlt, inp = document.getElementById('hzCmp-' + k); if (!R || !inp) return;
  const d = hzFis(R), v = inp.value.trim(), y = scrollY;
  d.hzBorr = { ...(d.hzBorr || {}) }; if (v) d.hzBorr[k] = v; else delete d.hzBorr[k];
  pintarHacienda(); scrollTo(0, y);
  guardarCarteraCallada('Tu renta');
}
document.addEventListener('change', (e) => {
  const t = e.target.closest && e.target.closest('#panelHz [data-hz-hecho]'); if (!t || !S.hzUlt) return;
  const d = hzFis(S.hzUlt), h = new Set(d.hzHechos || []), y = scrollY;
  if (t.checked) h.add(t.dataset.hzHecho); else h.delete(t.dataset.hzHecho);
  d.hzHechos = [...h];
  pintarHacienda(); scrollTo(0, y);
  const otra = document.querySelector(`#panelHz [data-hz-hecho="${CSS.escape(t.dataset.hzHecho)}"]`); if (otra) otra.focus({ preventScroll: true });
  guardarCarteraCallada('Tu renta');
});
document.addEventListener('keydown', (e) => {
  const t = e.target; if (e.key !== 'Enter' || !t || !t.closest || !t.closest('#panelHz')) return;
  if (t.dataset.hzCmp) { e.preventDefault(); hzGuardarBorr(t.dataset.hzCmp); }
  else if (t.id === 'hzEtcOtra') { e.preventDefault(); const b = $('#panelHz [data-hz="etc"][data-r="leer"]'); if (b) b.click(); }
});
