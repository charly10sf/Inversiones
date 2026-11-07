/* =====================================================================
   Presentación de Toisón (0.8, paso 5p): «la película». Se cuenta bajando, como toison.es: una portada distinta en cada
   diseño (el relieve de mármol en Mármol, el sello en Borgoña, el símbolo sobre la proporción áurea en Marfil), ocho
   capítulos con algo que tocar en cada uno y un final para empezar. Los textos cambian con «Estoy empezando / Llevo
   años invirtiendo». La maqueta aprobada (3 nov) es https://claude.ai/artifact/THN75znmPR44S1A94LYbev.
   Va en un trozo (src/partes.json): se baja solo la primera vez en cada dispositivo, y su CSS va aquí dentro para no
   pesar al abrir la app. Las dos imágenes en relieve, igual: solo la del diseño en el que estás, y solo al salir.
   Lo que se anima sin parar (el polvo de oro, el radar, el mármol que respira, el brillo del botón) solo cambia
   transform y opacity. Con «reducir movimiento», todo quieto y a la vista.
   Mármol G (0.8.3): detrás, la misma piedra que la app (la de #acabadoTema, fija); la portada (toison-marmol.webp) es el
   relieve y la palabra sin fondo, sin máscara, y sin las vetas en SVG de antes. La hace scripts/marca_marmol_g.py.
   ===================================================================== */
const PR_CSS = `
.intro.pres{display:block;padding:0;container-type:size;--facil:cubic-bezier(.2,.7,.2,1);background:var(--fondo);color:var(--texto)}
[data-tema] .intro.pres{background:var(--fondo)}
.pres .pr-grano{position:absolute;inset:0;pointer-events:none;opacity:var(--grano);z-index:0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");mix-blend-mode:overlay}
[data-tema="marmol"] .intro.pres{background:var(--fondo) var(--pr-piedra,none) center top/cover no-repeat}
.pres .pr-sc{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:none;outline:none;z-index:1}
.pres .pr-sc::-webkit-scrollbar{display:none}
.pres .pr-barra{position:absolute;left:0;right:0;top:0;height:2px;background:var(--metal);transform-origin:left;transform:scaleX(0);z-index:6;pointer-events:none}
.pres .pr-cab{position:absolute;left:0;right:0;top:0;z-index:5;display:flex;align-items:center;gap:6px;padding:calc(10px + env(safe-area-inset-top)) 14px 18px;background:linear-gradient(var(--fondo),color-mix(in srgb,var(--fondo) 80%,transparent) 65%,transparent);pointer-events:none}
.pres .pr-cab>*{pointer-events:auto}
.pres .pr-m{display:flex;align-items:center;gap:8px;margin-right:auto;font:500 13px/1 var(--marca);letter-spacing:.14em;opacity:0;transition:opacity .5s}
.pres .pr-m .simb-ts{width:20px;height:auto}
.pres .pr-m,.pres .pr-rh{white-space:nowrap}
.pres .pr-cab .idiomas{transition:opacity .3s}
.pres.bajado .pr-cab .idiomas{opacity:0;visibility:hidden;width:0;overflow:hidden;margin:0}
.pres.bajado .pr-m{opacity:1}
.pres .pr-rh{font:500 13px/1 var(--marca);letter-spacing:.04em;color:var(--oro-texto);margin-left:4px}
.pres .pr-rh:empty{display:none}
.pres .pr-rh::before{content:'·';color:var(--texto-2);margin-right:6px}
[data-tema="borgona"] .pres .pr-rh{font-style:italic}
.pres .intro-saltar{min-height:40px;padding:0 14px;border-radius:var(--r-p);background:color-mix(in srgb,var(--superficie) 80%,transparent);box-shadow:inset 0 0 0 1px var(--sep);font:500 13px/1 var(--ui);color:var(--texto-2)}
.pres .pr-ix{position:absolute;right:6px;top:50%;transform:translateY(-50%);z-index:5;display:flex;flex-direction:column;gap:2px;opacity:0;transition:opacity .5s}
.pres.bajado .pr-ix{opacity:1}
.pres .pr-ix button{width:28px;height:24px;border:0;background:none;display:grid;place-items:center;padding:0;cursor:pointer}
.pres .pr-ix i{width:5px;height:5px;border-radius:50%;background:var(--aro);transition:transform .3s,background .3s}
.pres .pr-ix button[aria-current="true"] i{background:var(--oro-texto);transform:scale(1.7)}
.pres .simb-ts .s-o{fill:var(--sim-o)}.pres .simb-ts .s-t{fill:var(--sim-t)}
.pres .num{font-variant-numeric:tabular-nums}
.pres .pr-tarj{position:relative;background:var(--superficie);border-radius:var(--r-l);box-shadow:inset 0 0 0 2px var(--borde),var(--sombra-t);padding:14px 16px;overflow:hidden;text-align:left}
[data-tema="marmol"] .pres .pr-tarj,[data-tema="borgona"] .pres .pr-tarj{background:radial-gradient(420px 160px at 20% -60px,color-mix(in srgb,var(--oro-texto) 9%,transparent),transparent 72%),var(--superficie)}
.pres .pr-tarj::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(105deg,transparent 30%,color-mix(in srgb,var(--oro-texto) 16%,transparent) 48%,transparent 66%);transform:translateX(-130%)}
.pres .vivo .pr-tarj::after{animation:pr-destello 1.5s var(--facil) 1.3s forwards}
@keyframes pr-destello{to{transform:translateX(120%)}}
.pres .pr-eti{display:block;font:600 10.5px/1.2 var(--ui);letter-spacing:.14em;text-transform:uppercase;color:var(--texto-2);margin-bottom:8px}
[data-tema="marfil"] .pres .pr-eti{font:600 13px/1.2 var(--marca);font-variant:small-caps;text-transform:lowercase;letter-spacing:.08em;color:var(--texto);padding-bottom:5px;border-bottom:1px solid var(--texto);display:inline-block}
[data-tema="borgona"] .pres .pr-eti{font:italic 500 15px/1.2 var(--marca);letter-spacing:0;text-transform:none;color:var(--oro-texto)}
[data-tema="borgona"] .pres .pr-eti::after{content:'';display:block;width:22px;height:1px;background:var(--oro-texto);margin-top:5px}
.pres .pr-pas{display:inline-flex;align-items:center;gap:4px;padding:4px 9px;border-radius:var(--r-p);font:600 12px/1.2 var(--ui)}
.pres .pr-pas.sube{background:var(--sube-fondo);color:var(--sube)}
.pres .pr-pas.baja{background:var(--baja-fondo);color:var(--baja)}
.pres .pr-pas.aviso{background:var(--aviso-fondo);color:var(--aviso)}
.pres .pr-pas.oro{background:color-mix(in srgb,var(--oro-texto) 14%,transparent);color:var(--oro-texto)}
.pres .pr-enlace{border:0;background:none;min-height:44px;padding:0 6px;color:var(--texto-2);font:500 14px/1 var(--ui);text-decoration:underline;text-decoration-color:var(--hilo);text-underline-offset:4px;cursor:pointer}
.pres .pr-disco{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex:none;background:var(--superficie-2);box-shadow:inset 0 0 0 1px var(--hilo);font:600 13px/1 var(--marca);letter-spacing:.04em;color:var(--oro-texto)}
.pres .pr-k{display:flex;align-items:center;gap:10px;margin:0 0 10px;font:600 11px/1 var(--ui);letter-spacing:.18em;text-transform:uppercase;color:var(--oro-texto)}
.pres .pr-k .rom{font:500 15px/1 var(--marca);letter-spacing:.06em}
.pres .pr-k::after{content:'';flex:0 0 28px;height:1px;background:var(--hilo);transform:scaleX(0);transform-origin:left;transition:transform .9s var(--facil) .2s}
.pres .vivo .pr-k::after{transform:none}
[data-tema="marfil"] .pres .pr-k{font:600 13px/1 var(--marca);font-variant:small-caps;text-transform:lowercase;letter-spacing:.1em;color:var(--texto)}
[data-tema="marfil"] .pres .pr-k::after{background:var(--texto)}
[data-tema="borgona"] .pres .pr-k{font:italic 500 16px/1 var(--marca);text-transform:none;letter-spacing:0}
.pres .pr-h{font:500 clamp(30px,9.4cqw,44px)/1.08 var(--marca);margin:0 0 12px;letter-spacing:-.005em;color:var(--texto)}
.pres .pr-h em{color:var(--oro-texto);font-style:italic}
[data-tema="marfil"] .pres .pr-h em{font-style:normal}
[data-tema="borgona"] .pres .pr-h{font-style:italic}
.pres .pr-h .w{display:inline-block;opacity:0;transform:translateY(.5em);transition:opacity .6s var(--facil),transform .7s var(--facil);transition-delay:calc(var(--i)*60ms + 120ms)}
.pres .vivo .pr-h .w{opacity:1;transform:none}
.pres .pr-x{margin:0;color:var(--texto-2);font-size:15px;line-height:1.55}
.pres .pr-x .exp{display:none}
.pres.experto .pr-x .nov{display:none}.pres.experto .pr-x .exp{display:inline}
.pres .aparece{opacity:0;transform:translateY(18px);transition:opacity .7s var(--facil),transform .8s var(--facil);transition-delay:var(--d,0ms)}
.pres .vivo .aparece,.pres .vivo.aparece{opacity:1;transform:none}
.pres .pr-toca{display:inline-flex;align-items:center;gap:6px;font:600 11px/1 var(--ui);letter-spacing:.12em;text-transform:uppercase;color:var(--oro-texto);margin-top:10px}
.pres .pr-toca::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--oro-texto);animation:pr-late 1.6s ease-in-out infinite}
@keyframes pr-late{50%{opacity:.25;transform:scale(.7)}}
.pres .pr-seg{display:inline-flex;padding:3px;border-radius:var(--r-p);background:var(--superficie);box-shadow:inset 0 0 0 1px var(--sep)}
.pres .pr-seg button{border:0;background:none;min-height:44px;padding:0 14px;border-radius:var(--r-p);font:550 13px/1 var(--ui);color:var(--texto-2);white-space:nowrap;cursor:pointer;transition:transform .15s ease}
.pres .pr-seg button[aria-pressed="true"]{background:var(--metal);color:var(--sobre-primario);box-shadow:inset 0 1px 0 var(--brillo)}
.pres .pr-seg button:active,.pres .btn:active,.pres .pr-fila:active{transform:scale(.97)}
.pres .btn.pri{position:relative;overflow:hidden}
.pres .btn.pri::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,var(--brillo) 50%,transparent 65%);transform:translateX(-130%);animation:pr-pasa 5s ease-in-out 2.5s infinite;pointer-events:none}
@keyframes pr-pasa{0%,72%{transform:translateX(-130%)}100%{transform:translateX(130%)}}
/* portada */
.pres .pr-port{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:76px 26px 44px;min-height:100cqh;max-width:640px;margin:0 auto}
.pres .pr-luz{position:absolute;inset:-10% -20% auto;height:70%;background:radial-gradient(closest-side,color-mix(in srgb,var(--oro-texto) var(--luz-graf),transparent),transparent);opacity:0;transition:opacity 2.4s ease .6s;pointer-events:none}
.pres .vivo .pr-luz{opacity:1}
.pres .pr-heroe{position:relative;width:100%;display:flex;justify-content:center;z-index:1}
.pres .pr-relieve{position:relative;width:min(150cqw,760px);margin:-10px calc((100% - min(150cqw,760px))/2) 0;aspect-ratio:1120/640;-webkit-mask-image:radial-gradient(closest-side,var(--fondo) 52%,color-mix(in srgb,var(--fondo) 60%,transparent) 72%,transparent 98%);mask-image:radial-gradient(closest-side,var(--fondo) 52%,color-mix(in srgb,var(--fondo) 60%,transparent) 72%,transparent 98%)}
.pres .pr-lento{position:absolute;inset:0;animation:pr-respira 18s ease-in-out infinite alternate}
@keyframes pr-respira{to{transform:scale(1.05)}}
.pres .pr-relieve img,.pres .pr-medalla img{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity 1.1s ease 1.5s}
.pres .vivo .pr-relieve img,.pres .vivo .pr-medalla img{opacity:1}
.pres .pr-vec{position:absolute;inset:0;width:100%;height:100%;transition:opacity .7s ease 2.3s}
.pres .vivo .pr-vec{opacity:0}
.pres .pr-vec path{fill:none;stroke:var(--oro-texto);stroke-width:1.1;stroke-linejoin:round;stroke-dasharray:2;stroke-dashoffset:2;transition:stroke-dashoffset 1.3s cubic-bezier(.6,0,.2,1) .15s}
.pres .pr-vec .vo{stroke:var(--sim-o)}
.pres .pr-vec .vt{transition-delay:.7s}
.pres .vivo .pr-vec path{stroke-dashoffset:0}
.pres .pr-h-marfil{position:relative;width:min(62cqw,240px)}
.pres .pr-emb{width:46%;margin:0 auto;position:relative;z-index:1;padding:22% 0 12%}
.pres .pr-emb .simb-ts{display:block;width:100%;height:auto;overflow:visible}
.pres .pr-emb path{stroke:var(--oro-texto);stroke-width:1.6;stroke-dasharray:2;stroke-dashoffset:2;fill-opacity:0;transition:stroke-dashoffset 1.6s cubic-bezier(.6,0,.2,1),fill-opacity .9s ease 1.3s,stroke-opacity .6s ease 1.9s}
.pres .pr-emb .s-t{transition-delay:.35s,1.5s,2s}
.pres .vivo .pr-emb path{stroke-dashoffset:0;fill-opacity:1;stroke-opacity:0}
.pres .pr-aurea{position:absolute;inset:-8% -14%;width:128%;height:auto;overflow:visible}
.pres .pr-aurea .l{fill:none;stroke:var(--grafica);stroke-width:.45;opacity:.55;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 2.2s ease .5s}
.pres .pr-aurea .o{fill:none;stroke:var(--primario);stroke-width:.5;opacity:.3;stroke-dasharray:2;stroke-dashoffset:2;transition:stroke-dashoffset 2.4s ease .7s}
.pres .vivo .pr-aurea .l,.pres .vivo .pr-aurea .o{stroke-dashoffset:0}
.pres .pr-h-borgona{position:relative;width:min(54cqw,220px);aspect-ratio:1}
.pres .pr-medalla{position:absolute;inset:0;border-radius:50%;overflow:hidden;box-shadow:0 0 0 1px var(--hilo),0 30px 60px -20px var(--hondo),inset 0 0 50px var(--hondo)}
.pres .pr-medalla::after{content:'';position:absolute;inset:0;border-radius:50%;background:linear-gradient(115deg,transparent 35%,color-mix(in srgb,var(--sim-o) 24%,transparent) 50%,transparent 65%);transform:translateX(-120%)}
.pres .vivo .pr-medalla::after{animation:pr-destello 1.6s var(--facil) 2.6s forwards}
.pres .pr-aro-m{position:absolute;inset:-9px;border-radius:50%;box-shadow:inset 0 0 0 1px var(--hilo)}
.pres .pr-palabra{display:flex;gap:.12em;justify-content:center;margin:18px 0 6px;padding-left:.12em;font:500 clamp(30px,10cqw,48px)/1 var(--marca);letter-spacing:.12em;position:relative;z-index:1}
.pres .pr-palabra span{display:inline-block;opacity:0;transform:translateY(.4em);transition:opacity .7s var(--facil),transform .8s var(--facil);transition-delay:calc(1.4s + var(--i)*90ms)}
.pres .vivo .pr-palabra span{opacity:1;transform:none}
[data-tema="marmol"] .pres .pr-palabra{display:none}
[data-tema="marmol"] .pres .pr-relieve{-webkit-mask-image:none;mask-image:none}
.pres .pr-filete{display:none}
[data-tema="marfil"] .pres .pr-filete{display:flex;justify-content:space-between;gap:10px;width:100%;white-space:nowrap;font:500 11px/1.2 var(--marca);font-variant:small-caps;letter-spacing:.08em;color:var(--texto-2);border-top:2px solid var(--texto);border-bottom:1px solid var(--texto);padding:6px 0;margin-bottom:26px}
.pres .pr-orla{display:none}
[data-tema="borgona"] .pres .pr-orla{display:flex;align-items:center;gap:10px;width:60%;margin:4px 0 8px;color:var(--oro-texto)}
[data-tema="borgona"] .pres .pr-orla::before,[data-tema="borgona"] .pres .pr-orla::after{content:'';flex:1;height:1px;background:var(--hilo)}
[data-tema="borgona"] .pres .pr-orla i{width:6px;height:6px;transform:rotate(45deg);background:var(--oro-texto)}
.pres .pr-h1{font:500 clamp(26px,8cqw,38px)/1.12 var(--marca);margin:14px 0 10px;color:var(--texto)}
.pres .pr-h1 em{color:var(--oro-texto)}
[data-tema="borgona"] .pres .pr-h1{font-style:italic}
[data-tema="marfil"] .pres .pr-h1 em{font-style:normal}
.pres .pr-ent{margin:0 auto;max-width:31ch;color:var(--texto-2)}
.pres .pr-perfil-l{margin:22px 0 8px;font-size:12.5px;color:var(--texto-2)}
.pres .pr-baja{margin-top:26px;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;color:var(--texto-2)}
.pres .pr-baja svg{width:22px;height:22px;stroke:var(--oro-texto);fill:none;stroke-width:1.6;animation:pr-bajar 2s ease-in-out infinite}
@keyframes pr-bajar{50%{transform:translateY(6px);opacity:.5}}
.pres .pr-polvo{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}
.pres .pr-polvo i{position:absolute;bottom:-6px;width:var(--t);height:var(--t);border-radius:50%;background:var(--oro-texto);opacity:0;animation:pr-sube var(--dur) linear var(--del) infinite;box-shadow:0 0 6px color-mix(in srgb,var(--oro-texto) 70%,transparent)}
@keyframes pr-sube{0%{opacity:0;transform:translate(0,0)}12%{opacity:var(--o)}80%{opacity:var(--o)}100%{opacity:0;transform:translate(var(--dx),-92cqh)}}
/* capítulos */
.pres .pr-sec{position:relative;min-height:100cqh;padding:88px 34px 48px 22px;display:flex;flex-direction:column;justify-content:center;gap:34px;max-width:560px;margin:0 auto;box-sizing:border-box}
.pres .pr-sec>*{position:relative;z-index:1}
.pres .pr-num{position:absolute;right:8px;top:62px;font:500 120px/1 var(--marca);color:var(--oro-texto);opacity:0;transform:translateY(20px);transition:opacity 1.2s ease,transform 1.2s var(--facil);pointer-events:none;z-index:0;translate:0 calc(var(--p,0) * 90px)}
.pres .pr-sec.vivo .pr-num{opacity:.07;transform:none}
[data-tema="marfil"] .pres .pr-sec.vivo .pr-num{opacity:.09}
.pres .pr-esc{position:relative;width:100%;opacity:0;transform:translateY(30px) scale(.97);transition:opacity .8s ease .25s,transform 1s var(--facil) .25s;translate:0 calc(var(--p,0) * 14px)}
.pres .pr-sec.vivo .pr-esc{opacity:1;transform:none}
.pres .pr-flota{position:absolute;right:-8px;top:-34px;z-index:3;padding:8px 12px;border-radius:var(--r-m);background:color-mix(in srgb,var(--superficie) 86%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:inset 0 0 0 1px var(--hilo),0 18px 30px -16px var(--hondo);font-size:11px;color:var(--texto-2);line-height:1.25;rotate:2.5deg;translate:0 calc(var(--p,0) * -36px);opacity:0;transform:translateY(10px);transition:opacity .7s ease 1.1s,transform .8s var(--facil) 1.1s;text-align:left}
.pres .pr-flota b{display:block;font:500 15px/1.2 var(--marca);color:var(--texto)}
.pres .vivo .pr-flota{opacity:1;transform:none}
.pres .pr-fin{text-align:center;align-items:center}
.pres .pr-fin .pr-h{text-align:center}
.pres .pr-fin .pr-x{max-width:32ch}
.pres .pr-botones{display:flex;flex-direction:column;align-items:center;gap:4px;width:100%;margin-top:6px}
.pres .pr-botones .btn{width:min(100%,280px);justify-content:center}
.pres .pr-medalla-fin{position:relative;width:96px;height:96px;margin:2px auto 10px;border-radius:50%;display:grid;place-items:center;background:var(--superficie-2);box-shadow:inset 0 0 0 1.5px var(--hilo),0 14px 30px -14px var(--hondo)}
.pres .pr-medalla-fin .simb-ts{width:56px;height:auto}
@media (min-width:900px){
  .pres .pr-sec{max-width:1040px;display:grid;grid-template-columns:1fr minmax(320px,420px);align-items:center;gap:64px;padding:96px 64px 56px}
  .pres .pr-sec.pr-fin{display:flex}
  .pres .pr-num{right:auto;left:40px;font-size:200px}
  .pres .pr-ix{right:16px}
  .pres .pr-h{font-size:clamp(40px,4.2vw,58px)}
  .pres .pr-x{font-size:17px;max-width:46ch}
  .pres .pr-h1{font-size:46px}
  .pres .pr-ent{font-size:17px}
}
/* escenas */
.pres .pr-graf{display:block;width:calc(100% + 32px);margin:8px -16px -14px;height:auto;overflow:visible}
.pres .pr-graf .linea{fill:none;stroke:var(--grafica);stroke-width:2;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 1.6s cubic-bezier(.5,0,.2,1) .5s}
.pres .pr-graf .area{opacity:0;transition:opacity 1s ease 1.4s}
.pres .vivo .pr-graf .linea{stroke-dashoffset:0}.pres .vivo .pr-graf .area{opacity:1}
.pres .pr-cifra{display:block;font:500 34px/1.1 var(--ui);letter-spacing:-.01em}
.pres .pr-cifra small{font-size:.5em;color:var(--texto-2)}
.pres .pr-pastis{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.pres .pr-chips{position:relative;display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-bottom:12px;min-height:66px}
.pres .pr-chip{padding:6px 11px;border-radius:var(--r-p);background:var(--superficie-2);box-shadow:inset 0 0 0 1px var(--hilo);font:600 12px/1 var(--ui);transition:transform .8s var(--facil),opacity .7s ease;transition-delay:calc(.3s + var(--i)*110ms)}
.pres .vivo .pr-chip{transform:translateY(46px) scale(.55);opacity:0}
.pres .pr-junto{position:absolute;inset:auto 0 8px;text-align:center;font:italic 500 17px/1.2 var(--marca);color:var(--oro-texto);opacity:0;transition:opacity .8s ease 1.8s}
.pres .vivo .pr-junto{opacity:1}
.pres .pr-filas{display:flex;flex-direction:column}
.pres .pr-fila{display:flex;align-items:center;gap:12px;padding:10px 0;border:0;background:none;text-align:left;width:100%;border-top:1px solid var(--sep);min-height:48px;color:var(--texto);font:inherit;cursor:pointer;opacity:0;transform:translateX(14px);transition:opacity .5s ease,transform .6s var(--facil),background .2s;transition-delay:calc(.4s + var(--i)*140ms)}
.pres .pr-fila:first-child{border-top:0}
.pres .vivo .pr-fila{opacity:1;transform:none}
.pres .pr-fila .tx{flex:1;min-width:0}
.pres .pr-fila .tx b{display:block;font:600 13.5px/1.3 var(--ui)}
.pres .pr-fila .tx span{display:block;font-size:12.5px;color:var(--texto-2)}
.pres .pr-fila .det{display:block;max-height:0;overflow:hidden;font-size:12.5px;color:var(--texto);opacity:0;transition:max-height .4s ease,opacity .4s ease,margin .4s ease}
.pres .pr-fila.abierta .det{max-height:90px;opacity:1;margin-top:6px}
.pres .pr-dia{width:42px;height:46px;border-radius:var(--r-m);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none;box-shadow:inset 0 0 0 1.5px var(--hilo);background:color-mix(in srgb,var(--oro-texto) 7%,transparent)}
.pres .pr-dia b{font:500 19px/1 var(--marca);color:var(--oro-texto)}
.pres .pr-dia small{font:600 9px/1.2 var(--ui);letter-spacing:.1em;text-transform:uppercase;color:var(--texto-2)}
.pres .pr-decides{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--sep);font:italic 500 14px/1.2 var(--marca);color:var(--oro-texto)}
.pres .pr-merc .pr-fila{gap:10px}
.pres .pr-merc .pr-fila[aria-pressed="true"]{background:color-mix(in srgb,var(--oro-texto) 8%,transparent);border-radius:var(--r-m);margin:0 -8px;padding:10px 8px;width:calc(100% + 16px)}
.pres .pr-spark{width:54px;height:22px;fill:none;stroke-width:1.6;flex:none}
.pres .pr-expl{margin-top:10px;padding:12px 14px;border-radius:var(--r-m);background:var(--superficie-2);font-size:13.5px;line-height:1.45;min-height:64px}
.pres .pr-expl b{color:var(--oro-texto);font-weight:600}
.pres .pr-radar{display:block;width:62%;max-width:200px;margin:0 auto 10px;overflow:visible}
.pres .pr-radar circle.r{fill:none;stroke:var(--hilo);stroke-width:.8}
.pres .pr-radar .barre{transform-origin:100px 100px;animation:pr-gira 4.5s linear infinite}
@keyframes pr-gira{to{transform:rotate(360deg)}}
.pres .pr-radar .pt{fill:var(--oro-texto);animation:pr-late 2.4s ease-in-out infinite;animation-delay:var(--d)}
.pres .pr-votos{display:flex;height:6px;border-radius:3px;overflow:hidden;gap:2px;margin:8px 0 4px}
.pres .pr-votos i{display:block}
.pres .pr-idea-cab{display:flex;align-items:center;gap:10px}
.pres .pr-idea-cab .tx{flex:1}
.pres .pr-idea-cab b{font:600 15px/1.2 var(--ui)}
.pres .pr-idea-cab .tx span{display:block;font-size:12px;color:var(--texto-2)}
.pres .pr-impacto{margin-top:10px;font-size:13.5px;line-height:1.45}
.pres .pr-medidor{position:relative;height:8px;border-radius:4px;background:var(--superficie-2);margin:8px 0 4px}
.pres .pr-medidor i{position:absolute;inset:0 auto 0 0;border-radius:4px;background:var(--reparto-1);transition:width .7s var(--facil)}
.pres .pr-medidor i.nuevo{background:var(--oro-texto);opacity:.45}
.pres .pr-medidor u{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--texto);border-radius:1px}
.pres .pr-medidor.pasa i.nuevo{background:var(--aviso);opacity:.7}
.pres .pr-leyenda{display:flex;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--texto-2)}
.pres .pr-chat{display:flex;flex-direction:column;gap:8px}
.pres .pr-sug{display:flex;flex-direction:column;gap:6px}
.pres .pr-sug button{text-align:left;border:0;padding:11px 14px;min-height:44px;border-radius:var(--r-m);background:var(--superficie);box-shadow:inset 0 0 0 1px var(--hilo);font:500 13.5px/1.3 var(--ui);color:var(--texto);cursor:pointer}
.pres .pr-sug button:disabled{opacity:.45}
.pres .pr-burb{max-width:86%;padding:10px 13px;border-radius:16px;font-size:13.5px;line-height:1.45}
.pres .pr-burb.yo{align-self:flex-end;background:var(--superficie-2);border-bottom-right-radius:4px}
.pres .pr-burb.ia{align-self:flex-start;background:var(--superficie);box-shadow:inset 0 0 0 1px var(--borde);border-bottom-left-radius:4px}
.pres .pr-quien{display:flex;align-items:center;gap:6px;font:italic 500 13px/1 var(--marca);color:var(--oro-texto);margin-bottom:5px}
.pres .pr-quien .ic-pl{width:14px;height:14px}
.pres .pr-cur::after{content:'▍';color:var(--oro-texto);animation:pr-late 1s steps(2) infinite}
.pres .pr-nota-ia{font-size:11.5px;color:var(--texto-2);text-align:center;margin:2px 0 0}
.pres .pr-rango{width:100%;accent-color:var(--oro-texto);height:44px;margin:4px 0}
.pres .pr-renta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:4px}
.pres .pr-renta div{background:var(--superficie-2);border-radius:var(--r-m);padding:9px 10px}
.pres .pr-renta small{display:block;font-size:11px;color:var(--texto-2)}
.pres .pr-renta b{font:600 14.5px/1.2 var(--ui)}
.pres .pr-renta .pagar b{color:var(--oro-texto);font:500 19px/1.1 var(--marca)}
.pres .pr-tramos{display:flex;height:8px;border-radius:4px;overflow:hidden;margin:12px 0 4px;background:var(--superficie-2)}
.pres .pr-tramos i{display:block;height:100%;transition:width .3s ease}
.pres .pr-lbl{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;color:var(--texto-2)}
.pres .pr-lbl b{font:500 22px/1 var(--marca);color:var(--texto)}
.pres .pr-fut-n{font:500 clamp(34px,11cqw,44px)/1 var(--marca);color:var(--oro-texto);margin:2px 0}
.pres .pr-fut-s{font-size:12.5px;color:var(--texto-2)}
.pres .pr-anos{display:flex;gap:6px;margin-top:8px}
.pres .pr-anos button{flex:1;min-height:44px;border:0;border-radius:var(--r-p);background:var(--superficie-2);font:600 13px/1 var(--ui);color:var(--texto-2);cursor:pointer}
.pres .pr-anos button[aria-pressed="true"]{background:var(--metal);color:var(--sobre-primario)}
.pres .pr-fut-g{display:block;width:100%;height:80px;margin-top:8px}
.pres .pr-fut-g .a{fill:color-mix(in srgb,var(--grafica) 22%,transparent)}
.pres .pr-fut-g .b{fill:color-mix(in srgb,var(--texto) 9%,transparent)}
.pres .pr-fut-g .l{fill:none;stroke:var(--grafica);stroke-width:2}
.pres .pr-cand{display:block;width:96px;margin:4px auto 10px;overflow:visible}
.pres .pr-cand .arco{fill:none;stroke:var(--oro-texto);stroke-width:7;stroke-linecap:round;transform:translateY(-14px);transition:transform .7s cubic-bezier(.5,1.6,.4,1) .9s}
.pres .vivo .pr-cand .arco{transform:none}
.pres .pr-cand .cuerpo{fill:var(--superficie-2);stroke:var(--hilo);stroke-width:1.5}
.pres .pr-cand .ojo{fill:var(--oro-texto)}
.pres .pr-cifrado{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 0;border-top:1px solid var(--sep);font-size:12.5px;color:var(--texto-2)}
.pres .pr-cifrado b{font:600 14px/1 ui-monospace,monospace;color:var(--texto);letter-spacing:.04em}
.pres .pr-etiqs{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px}
.pres.quieta *,.pres.quieta *::before,.pres.quieta *::after{animation:none!important;transition:none!important}
.pres.quieta .pr-polvo,.pres.quieta .pr-vec{display:none}
.pres.quieta :is(.pr-h .w,.aparece,.pr-palabra span,.pr-fila,.pr-esc,.pr-relieve img,.pr-medalla img,.pr-flota){opacity:1!important;transform:none!important}
.pres.quieta .pr-chip{opacity:0!important}
.pres.quieta .pr-junto{opacity:1!important}
.pres.quieta .pr-emb path,.pres.quieta .pr-graf .linea,.pres.quieta .pr-aurea .l,.pres.quieta .pr-aurea .o{stroke-dashoffset:0!important}
.pres.quieta .pr-emb path{fill-opacity:1!important;stroke-opacity:0!important}
.pres.quieta .pr-graf .area{opacity:1!important}
`;

// la T de la web, sin estrías: es la que se traza encima del relieve
const PR_T_WEB = () => TS_T_D.split('Z')[0] + 'Z';
const prSimb = (c = '') => `<svg class="simb-ts ${c}" viewBox="-82 -78 164 147" aria-hidden="true"><path class="s-o" d="${TS_O_D}" pathLength="2"/><path class="s-t" d="${TS_T_D}" pathLength="2"/></svg>`;
const prEur = (n) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' }).format(n) + ' €';
const prCifra = (v) => { const [e, c] = v.toFixed(2).split('.'); return `${new Intl.NumberFormat('es-ES', { useGrouping: 'always' }).format(+e)}<small>,${c} €</small>`; };
let prUid = 0;
function prSerie(n, semilla, deriva = 0.55) {
  let s = semilla; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  let v = 50; const a = [];
  for (let i = 0; i < n; i++) { v += (r() - (1 - deriva)) * 7; a.push(v); }
  return a;
}
function prTrazo(a, w, h, pad = 8) {
  const mn = Math.min(...a), mx = Math.max(...a);
  const p = a.map((v, i) => [i / (a.length - 1) * w, pad + (1 - (v - mn) / (mx - mn || 1)) * (h - 2 * pad)]);
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 1; i < p.length; i++) { const [x0, y0] = p[i - 1], [x1, y1] = p[i], cx = (x0 + x1) / 2; d += `C${cx.toFixed(1)} ${y0.toFixed(1)} ${cx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`; }
  return d;
}
function prGrafica(semilla = 11, alto = 96) {
  const id = 'prg' + (++prUid), d = prTrazo(prSerie(46, semilla), 300, alto);
  return `<svg class="pr-graf" viewBox="0 0 300 ${alto}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--grafica)" stop-opacity=".42"/><stop offset="1" stop-color="var(--grafica)" stop-opacity="0"/></linearGradient></defs><path class="area" d="${d}L300 ${alto}L0 ${alto}Z" fill="url(#${id})"/><path class="linea" d="${d}" pathLength="1"/></svg>`;
}
const prSpark = (s, sube) => `<svg class="pr-spark" viewBox="0 0 54 22" aria-hidden="true"><path d="${prTrazo(prSerie(16, s, sube ? 0.62 : 0.4), 54, 22, 3)}" stroke="var(--${sube ? 'sube' : 'baja'})"/></svg>`;

// Ejemplos: las mismas cifras de la maqueta. Ningún texto da órdenes (regla de la CNMV): «Lo decides tú»
const PR_MERC = [
  ['IBEX 35', '+0,62 %', true, 'El IBEX sube un 0,62 %:', 'tus acciones españolas suman unos 41 € hoy.'],
  ['S&P 500', '−0,41 %', false, 'El S&P 500 baja un 0,41 %:', 'tu fondo de EE. UU. pierde unos 27 € hoy.'],
  ['Euro / dólar', '+1,20 %', true, 'El euro sube un 1,2 % frente al dólar:', 'lo que tienes en dólares vale unos 38 € menos al pasarlo a euros.'],
  ['Oro', '+0,90 %', true, 'El oro sube un 0,9 %:', 'tu ETF de oro gana unos 18 €.'],
  ['Bono español a 10 años', '3,02 %', false, 'El bono a 10 años paga un 3,02 %:', 'es la referencia de tus fondos de renta fija y de las hipotecas.'],
];
const PR_IDEAS = [
  { ini: 'IB', n: 'Iberdrola', s: 'Energía · España', v: [18, 6, 1], sec: 'Energía', de: 12, a: 14, lim: 25 },
  { ini: 'AS', n: 'ASML', s: 'Tecnología · Países Bajos', v: [26, 5, 0], sec: 'Tecnología', de: 34, a: 36, lim: 30 },
  { ini: 'NO', n: 'Novo Nordisk', s: 'Salud · Dinamarca', v: [14, 10, 3], sec: 'Salud', de: 4, a: 6, lim: 20 },
];
const PR_CHAT = [
  ['¿Cómo va Repsol?', 'Repsol sube un 1,4 % hoy y un 9 % desde que la compraste: llevas 212 € ganados. Los analistas están entre mantener y comprar, y el próximo dato son sus resultados de febrero.'],
  ['¿Qué supondría aportar 500 € más al mes?', 'Con 700 € al mes en vez de 200, en 20 años y con un 6 % anual de ejemplo, tendrías unos 483.000 € en vez de 252.000 €. Aportar no paga impuestos: se paga al vender con ganancias.'],
  ['¿Cuánto bajaría mi cartera si la bolsa cae un 20 %?', 'Con tu reparto, unos 7.900 € (un 16 %). El oro y la renta fija amortiguan parte de la caída; la tecnología, que es el 34 %, la haría más fuerte.'],
];
const PR_FLOTAS = [['Riesgo de la cartera', '4 de 7'], ['En la renta', '0 € por aportar'], ['Euro / dólar', '1,0842'], ['Precio objetivo medio', '14,20 €'], ['Contesta en', 'unos segundos'], ['Pérdidas de este año', 'compensan'], ['Tu meta: la casa', 'en 2034'], ['Cifrada en', 'tu dispositivo']];
function prIdea(o) {
  const tot = o.v[0] + o.v[1] + o.v[2], pasa = o.a > o.lim;
  return `<div class="pr-idea-cab"><span class="pr-disco">${o.ini}</span><div class="tx"><b>${o.n}</b><span>${o.s}</span></div></div>
  <div class="pr-votos" aria-hidden="true"><i style="width:${o.v[0] / tot * 100}%;background:var(--sube)"></i><i style="width:${o.v[1] / tot * 100}%;background:var(--aviso)"></i><i style="width:${o.v[2] / tot * 100}%;background:var(--baja)"></i></div>
  <div class="pr-leyenda"><span>${esc(trad(`Analistas: ${o.v[0]} comprar · ${o.v[1]} mantener · ${o.v[2]} vender`))}</span></div>
  <p class="pr-impacto">${esc(trad(`Con 1.000 € de ella, ${o.sec} pasaría del ${o.de} % al ${o.a} % de tu cartera.`))} ${pasa ? `<span class="pr-pas aviso">${esc(trad(`Tu límite es el ${o.lim} %`))}</span>` : esc(trad(`Tu límite es el ${o.lim} %.`))}</p>
  <div class="pr-medidor${pasa ? ' pasa' : ''}" aria-hidden="true"><i class="nuevo" style="width:${o.a / 50 * 100}%"></i><i style="width:${o.de / 50 * 100}%"></i><u style="left:${o.lim / 50 * 100}%"></u></div>`;
}
// Los ocho capítulos: el título (lo último, en cursiva de oro), el texto para quien empieza (nov) y para quien lleva
// años (exp), una escena y, al aparecer, lo que hace la escena (vivo)
const PR_CAPS = [
  { rom: 'I', k: 'Cartera', t: 'Todo lo que tienes,', em: 'junto',
    nov: 'Da igual que tengas un fondo en el banco, acciones en otro sitio y algo de cripto en una app: ves cuánto tienes en total y si ganas o pierdes.',
    exp: 'Fondos, acciones, ETF, oro y cripto de cualquier bróker, con precio en directo: rentabilidad por posición y total, comisiones fondo a fondo y reparto por país, sector y tipo.',
    esc: () => `<div class="pr-chips" aria-hidden="true">${['MyInvestor', 'Trade Republic', 'Revolut', 'Bitvavo', 'Interactive Brokers', 'Tu banco'].map((n, i) => `<span class="pr-chip" style="--i:${i}">${n}</span>`).join('')}<span class="pr-junto">Seis sitios, un solo total</span></div>
      <div class="pr-tarj"><span class="pr-eti">Patrimonio</span><b class="pr-cifra num" data-cuenta="48230.15">0<small>,00 €</small></b>
      <div class="pr-pastis"><span class="pr-pas sube">▲ 0,84 % hoy</span><span class="pr-pas sube">+6.120 € desde que compraste</span></div>${prGrafica(11)}</div>`,
    vivo(el, quieta) {
      const c = $('[data-cuenta]', el), fin = +c.dataset.cuenta;
      if (quieta) { c.innerHTML = prCifra(fin); return; }
      const t0 = performance.now() + 900;
      const paso = (t) => { const k = Math.min(1, Math.max(0, (t - t0) / 1400)), e = 1 - Math.pow(1 - k, 3); c.innerHTML = prCifra(fin * e); if (k < 1 && c.isConnected) requestAnimationFrame(paso); };
      requestAnimationFrame(paso);
    } },
  { rom: 'II', k: 'Tu mes', t: 'Tu mes,', em: 'de un vistazo',
    nov: 'Tus aportaciones programadas, lo que hay que vigilar y las fechas que importan, cada una con lo que supondría en la renta. Lo que hagas lo decides tú.',
    exp: 'Aportaciones programadas, resultados de lo que tienes, límites de tu perfil que se pasan y el efecto fiscal de cada movimiento antes de hacerlo, con la regla de recompra incluida.',
    esc: () => `<div class="pr-tarj"><span class="pr-eti">Noviembre</span><div class="pr-filas">
      ${[['5', 'Tu aportación programada', '200 € al fondo mundial', 'Aportar no paga impuestos: solo se paga al vender con ganancias.'],
        ['12', 'Resultados de Inditex', 'La tienes en cartera', 'Los presenta antes de abrir la bolsa. Ese día la IA te los resume en dos líneas.'],
        ['20', 'Lo que hay que vigilar', 'Tecnología: 34 %. Tu límite es el 30 %', 'Es el límite que pusiste en tu perfil. Ves qué supondría cada opción antes de decidir.']]
        .map(([d, b, s, x], i) => `<button type="button" class="pr-fila" style="--i:${i}" aria-expanded="false"><span class="pr-dia"><b>${d}</b><small>nov</small></span><span class="tx"><b>${b}</b><span>${s}</span><span class="det">${x}</span></span></button>`).join('')}
      </div><div class="pr-decides">Lo decides tú</div></div><p class="pr-toca">Toca una fecha</p>`,
    vivo(el) {
      const fs = $$('.pr-fila', el);
      fs.forEach((f) => { f.onclick = () => { const a = !f.classList.contains('abierta'); fs.forEach((g) => { g.classList.remove('abierta'); g.setAttribute('aria-expanded', 'false'); }); f.classList.toggle('abierta', a); f.setAttribute('aria-expanded', String(a)); }; });
    } },
  { rom: 'III', k: 'Mercados', t: 'El mundo,', em: 'traducido a tu cartera',
    nov: 'Bolsas, tipos, divisas y materias primas, y en una frase qué significa cada movimiento para lo tuyo.',
    exp: 'Índices, tipos, divisas y materias primas, con el efecto del tipo de cambio en lo que tienes en otras monedas: en euros, no en porcentajes sueltos.',
    esc: () => `<div class="pr-tarj pr-merc"><span class="pr-eti">Hoy en los mercados</span><div class="pr-filas">
      ${PR_MERC.map(([n, v, sube], i) => `<button type="button" class="pr-fila" style="--i:${i}" data-m="${i}" aria-pressed="${i === 2}"><span class="tx"><b>${n}</b></span>${prSpark(i * 13 + 3, sube)}<span class="pr-pas ${sube ? 'sube' : 'baja'} num">${v}</span></button>`).join('')}
      </div><div class="pr-expl aparece" style="--d:900ms" aria-live="polite"></div></div><p class="pr-toca">Toca uno</p>`,
    vivo(el) {
      const ex = $('.pr-expl', el), pon = (k) => { ex.innerHTML = `${esc(trad(PR_MERC[k][3]))} <b>${esc(trad(PR_MERC[k][4]))}</b>`; };
      pon(2);
      $$('[data-m]', el).forEach((b) => { b.onclick = () => { $$('[data-m]', el).forEach((c) => c.setAttribute('aria-pressed', String(c === b))); pon(+b.dataset.m); }; });
    } },
  { rom: 'IV', k: 'Ideas', t: 'Unas 2.800 empresas,', em: 'con tus límites delante',
    nov: 'La opinión de los analistas y las ideas del radar, las mismas para todos. Toisón te enseña qué cambiaría en tu cartera; lo que hagas lo decides tú.',
    exp: 'Consenso de analistas, precio objetivo y factores de unas 2.800 empresas de España, Europa y EE. UU., con el impacto de cada idea en tu reparto y en los límites de tu perfil.',
    esc: () => `<svg class="pr-radar" viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="prb${++prUid}" x1="0" x2="1"><stop offset="0" stop-color="var(--oro-texto)" stop-opacity="0"/><stop offset="1" stop-color="var(--oro-texto)" stop-opacity=".35"/></linearGradient></defs>
      <circle class="r" cx="100" cy="100" r="96"/><circle class="r" cx="100" cy="100" r="64"/><circle class="r" cx="100" cy="100" r="32"/>
      <g class="barre"><path d="M100 100L196 100A96 96 0 0 0 167.9 32.1Z" fill="url(#prb${prUid})"/></g>
      ${[[60, 50], [140, 64], [128, 140], [70, 132], [100, 30], [40, 100], [158, 112], [92, 160]].map(([x, y], i) => `<circle class="pt" cx="${x}" cy="${y}" r="3.2" style="--d:${i * 0.3}s"/>`).join('')}</svg>
      <div class="pr-tarj"><span class="pr-eti">Del radar</span><div class="pr-idea" aria-live="polite"></div><div class="pr-decides">Lo decides tú<button type="button" class="pr-enlace" style="margin-left:auto;font-style:normal" data-otra>Otra idea</button></div></div>`,
    vivo(el) { let k = 0; const pon = () => { $('.pr-idea', el).innerHTML = prIdea(PR_IDEAS[k]); }; pon(); $('[data-otra]', el).onclick = () => { k = (k + 1) % PR_IDEAS.length; pon(); }; } },
  { rom: 'V', k: 'La IA', t: 'Pregunta', em: 'lo que quieras',
    nov: 'Contesta con tus números delante y te lo explica fácil. Es una IA: explica y calcula, no te dice qué comprar.',
    exp: 'Lee tu cartera, tus metas y las noticias del día; calcula escenarios y simula aportaciones o caídas. Explica y calcula; no da órdenes de compra o venta.',
    esc: () => `<div class="pr-chat"><div class="pr-sug">${PR_CHAT.map(([q], i) => `<button type="button" data-q="${i}">${q}</button>`).join('')}</div></div><p class="pr-toca">Toca una pregunta</p><p class="pr-nota-ia">Es una IA. Lo que hagas lo decides tú.</p>`,
    vivo(el, quieta) { $$('[data-q]', el).forEach((b) => { b.onclick = () => prPreguntar(el, +b.dataset.q, quieta); }); } },
  { rom: 'VI', k: 'Hacienda', t: 'La renta,', em: 'sin sorpresas',
    nov: 'Antes de vender ves lo que pagarías a Hacienda. Y en primavera, una guía para hacer la declaración.',
    exp: 'Ganancias por FIFO, tramos del ahorro del 19 % en adelante, pérdidas que compensan, la regla de los dos meses y el traspaso entre fondos sin pagar.',
    esc: () => `<div class="pr-tarj"><span class="pr-eti">Si vendieras parte del fondo mundial</span>
      <div class="pr-lbl"><span>Vendes</span><b class="num" data-v></b></div>
      <input class="pr-rango" type="range" min="1000" max="40000" step="500" value="12000" aria-label="${esc(trad('Cuánto vendes'))}">
      <div class="pr-renta"><div><small>Ganancia</small><b class="num" data-g></b></div><div class="pagar"><small>A pagar</small><b class="num" data-p></b></div><div><small>Te queda</small><b class="num" data-q></b></div></div>
      <div class="pr-tramos" aria-hidden="true"><i data-t1 style="background:var(--reparto-1)"></i><i data-t2 style="background:var(--reparto-2)"></i></div>
      <div class="pr-leyenda"><span>19 % hasta 6.000 €</span><span>21 % de 6.000 a 50.000 €</span></div></div><p class="pr-toca">Mueve la barra</p>`,
    vivo(el) {
      const r = $('.pr-rango', el);
      const pinta = () => { const v = +r.value, g = v * 0.3, t1 = Math.min(g, 6000), t2 = Math.max(0, g - 6000), p = t1 * 0.19 + t2 * 0.21; $('[data-v]', el).textContent = prEur(v); $('[data-g]', el).textContent = prEur(g); $('[data-p]', el).textContent = prEur(p); $('[data-q]', el).textContent = prEur(v - p); $('[data-t1]', el).style.width = (t1 / 12000 * 100) + '%'; $('[data-t2]', el).style.width = (t2 / 12000 * 100) + '%'; };
      r.oninput = pinta; pinta();
    } },
  { rom: 'VII', k: 'Tu futuro', t: 'Hasta dónde', em: 'puedes llegar',
    nov: 'Cuánto podrías tener según lo que apartes cada mes. Es un ejemplo con un 6 % al año, no una promesa.',
    exp: 'Proyección con tus aportaciones, la inflación y varios escenarios de rentabilidad, junto a tus metas y la fecha en que las alcanzarías.',
    esc: () => `<div class="pr-tarj"><span class="pr-eti">Con 48.230 € de hoy</span>
      <div class="pr-fut-n num" data-f></div><div class="pr-fut-s" data-fs></div>
      <svg class="pr-fut-g" viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true"><path class="a"/><path class="b"/><path class="l"/></svg>
      <div class="pr-lbl" style="margin-top:8px"><span>Apartas cada mes</span><b class="num" data-m></b></div>
      <input class="pr-rango" type="range" min="0" max="1000" step="25" value="200" aria-label="${esc(trad('Aportación al mes'))}">
      <div class="pr-anos">${[10, 20, 30].map((a) => `<button type="button" data-a="${a}" aria-pressed="${a === 20}">${a} años</button>`).join('')}</div></div>`,
    vivo(el) {
      let anos = 20; const r = $('.pr-rango', el);
      const pinta = () => {
        const m = +r.value, f = (n) => 48230 * Math.pow(1.005, n) + m * (Math.pow(1.005, n) - 1) / 0.005, n = anos * 12, tot = f(n), ap = 48230 + m * n;
        $('[data-f]', el).textContent = prEur(Math.round(tot / 1000) * 1000);
        $('[data-fs]', el).textContent = trad(`en ${anos} años · de ellos, ${prEur(Math.round(ap / 1000) * 1000)} los pones tú`);
        $('[data-m]', el).textContent = prEur(m);
        const mx = f(360) * 1.02 || 1, pts = Array.from({ length: 31 }, (_, i) => { const k = n * i / 30; return [i * 10, 80 - f(k) / mx * 76, 80 - (48230 + m * k) / mx * 76]; });
        const linea = 'M' + pts.map((p) => p[0] + ' ' + p[1].toFixed(1)).join('L'), base = 'M' + pts.map((p) => p[0] + ' ' + p[2].toFixed(1)).join('L');
        $('.pr-fut-g .a', el).setAttribute('d', linea + 'L300 80L0 80Z'); $('.pr-fut-g .b', el).setAttribute('d', base + 'L300 80L0 80Z'); $('.pr-fut-g .l', el).setAttribute('d', linea);
      };
      r.oninput = pinta;
      $$('[data-a]', el).forEach((b) => { b.onclick = () => { anos = +b.dataset.a; $$('[data-a]', el).forEach((c) => c.setAttribute('aria-pressed', String(c === b))); pinta(); }; });
      pinta();
    } },
  { rom: 'VIII', k: 'Privada', t: 'Tu cartera', em: 'es tuya',
    nov: 'Se cifra con tu contraseña y se guarda en tu dispositivo. Nadie más la ve, tampoco Toisón. Cuando preguntas a la IA, solo sale lo que necesita para contestarte, y te lo avisa antes.',
    exp: 'Cifrada en tu dispositivo con una clave que sale de tu contraseña: Toisón no la tiene. A la IA solo va lo necesario para cada respuesta, y te lo avisa antes de mandar nada.',
    esc: () => `<div class="pr-tarj" style="text-align:center"><svg class="pr-cand" viewBox="0 0 96 100" aria-hidden="true"><path class="arco" d="M28 46V32a20 20 0 0 1 40 0v14"/><rect class="cuerpo" x="16" y="44" width="64" height="50" rx="12"/><circle class="ojo" cx="48" cy="64" r="6"/><rect class="ojo" x="45.5" y="66" width="5" height="14" rx="2.5"/></svg>
      <div class="pr-cifrado"><span>Lo que ves tú</span><b class="num">48.230,15 €</b></div>
      <div class="pr-cifrado"><span>Lo que vería cualquier otro</span><b data-cif data-no-trad>48.230,15 €</b></div>
      <div class="pr-etiqs"><span class="pr-pas oro">Cifrada</span><span class="pr-pas oro">En tu dispositivo</span><span class="pr-pas oro">Solo tú</span></div></div>`,
    vivo(el, quieta) {
      const b = $('[data-cif]', el), car = 'A9x#Qk2Lm7Pz4Rw8Ts$Vy3', orig = b.textContent; let n = 0;
      if (quieta) { b.textContent = 'k9#Xq2Lm7Pz4'; return; }
      setTimeout(() => { const t = setInterval(() => { if (!b.isConnected) return clearInterval(t); b.textContent = [...orig].map((c, i) => (i < n / 2 ? car[(i * 7 + n) % car.length] : c)).join(''); if (++n > 26) clearInterval(t); }, 45); }, 1300);
    } },
];
function prPreguntar(el, k, quieta) {
  const ch = $('.pr-chat', el), [q, r] = PR_CHAT[k];
  $$('[data-q]', el).forEach((b) => { b.disabled = true; });
  $$('.pr-burb', ch).forEach((b) => b.remove());
  const yo = document.createElement('div'); yo.className = 'pr-burb yo'; yo.textContent = trad(q); ch.appendChild(yo);
  const ia = document.createElement('div'); ia.className = 'pr-burb ia'; ia.dataset.noTrad = '';
  ia.innerHTML = `<span class="pr-quien">${ICONOS_PL.asistente}${esc(L('La IA', 'GrowIA'))}</span><span class="pr-cur" aria-live="polite"></span>`;
  ch.appendChild(ia);
  const pal = trad(r).split(' '), cur = $('.pr-cur', ia); let n = 0;
  const t = setInterval(() => { if (!cur.isConnected) return clearInterval(t); cur.textContent = pal.slice(0, ++n).join(' '); if (n >= pal.length) { clearInterval(t); cur.classList.remove('pr-cur'); $$('[data-q]', el).forEach((b) => { b.disabled = false; }); } }, quieta ? 0 : 55);
}
// el título palabra a palabra (ya traducido) con lo último en cursiva de oro
const prPartir = (t, em) => { let i = 0; const w = (s) => trad(s).split(' ').filter(Boolean).map((p) => `<span class="w" style="--i:${i++}">${esc(p)}</span>`).join(' '); return `${w(t)}${em ? ` <em>${w(em)}</em>` : ''}`; };
const prVec = (vb, tr) => `<svg class="pr-vec" viewBox="${vb}" aria-hidden="true"><g transform="${tr}"><path class="vo" pathLength="2" d="${TS_O_D}"/><path class="vt" pathLength="2" d="${PR_T_WEB()}"/></g></svg>`;
const prPolvo = (n = 18, semilla = 3) => { let s = semilla; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; return `<div class="pr-polvo" aria-hidden="true">${Array.from({ length: n }, () => `<i style="left:${(r() * 100).toFixed(1)}%;--t:${(1.5 + r() * 2.5).toFixed(1)}px;--o:${(0.25 + r() * 0.55).toFixed(2)};--dur:${(9 + r() * 10).toFixed(1)}s;--del:${(-r() * 18).toFixed(1)}s;--dx:${((r() - 0.5) * 60).toFixed(0)}px"></i>`).join('')}</div>`; };
// la portada, distinta en cada diseño: solo se pinta (y se baja su imagen) la del diseño en el que estás
function prHeroe(tema) {
  if (tema === 'marfil') return `<div class="pr-h-marfil"><svg class="pr-aurea" viewBox="0 0 200 150" aria-hidden="true"><g transform="translate(100 70)"><path class="o" pathLength="2" d="${TS_O_D}"/></g><rect class="l" x="19.1" y="20" width="161.8" height="100" pathLength="1"/><path class="l" d="M119.1 20V120M119.1 81.8H180.9M142.7 81.8V120M119.1 96.4H142.7M133.7 81.8V96.4" pathLength="1"/><path class="l" d="M19.1 120A100 100 0 0 1 119.1 20A61.8 61.8 0 0 1 180.9 81.8A38.2 38.2 0 0 1 142.7 120A23.6 23.6 0 0 1 119.1 96.4A14.6 14.6 0 0 1 133.7 81.8" pathLength="1"/></svg><div class="pr-emb">${prSimb()}</div></div>`;
  if (tema === 'borgona') return `<div class="pr-h-borgona"><span class="pr-aro-m"></span><div class="pr-medalla"><img src="toison-sello.webp" alt="" decoding="async">${prVec('0 0 420 420', 'translate(210 235) scale(2.08)')}</div></div>`;
  return `<div class="pr-relieve"><div class="pr-lento"><img src="toison-marmol.webp" alt="${esc(trad('Toisón: una T dorada en forma de columna que atraviesa una O de mármol claro'))}" decoding="async">${prVec('0 0 1120 640', 'translate(558 249) scale(2.08)')}</div></div>`;
}

function pantallaIntro(seguir) {
  if (!$('#prCss')) { const s = document.createElement('style'); s.id = 'prCss'; s.textContent = PR_CSS; document.head.appendChild(s); }
  const quieta = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tema = temaActual(), experto = LS.get('inv-nivel', '') === 'exp';
  // al final: crear la cartera o entrar. Sin sesión en la cuenta, también «Ya tengo cuenta: entrar»
  const sinSesion = PERFIL_CUENTA && !FB.user, nuevo = !S.enc;
  const caps = PR_CAPS.map((c, i) => `<section class="pr-sec" data-c="${i}" aria-label="${esc(trad(c.k))}"><span class="pr-num" aria-hidden="true">${c.rom}</span>
      <div><p class="pr-k"><span class="rom" data-no-trad>${c.rom}</span>${esc(c.k)}</p><h2 class="pr-h" data-no-trad aria-label="${esc(trad(`${c.t} ${c.em}`))}"><span aria-hidden="true">${prPartir(c.t, c.em)}</span></h2><p class="pr-x"><span class="nov">${esc(c.nov)}</span><span class="exp">${esc(c.exp)}</span></p></div>
      <div class="pr-esc"><div class="pr-flota" aria-hidden="true"><span>${esc(PR_FLOTAS[i][0])}</span><b>${esc(PR_FLOTAS[i][1])}</b></div>${c.esc()}</div></section>`).join('');
  $('#app').innerHTML = `<div class="intro pres${quieta ? ' quieta' : ''}${experto ? ' experto' : ''}" role="region" aria-label="${esc(trad('Presentación de Toisón'))}">
    <div class="pr-grano" aria-hidden="true"></div><div class="pr-barra" aria-hidden="true"></div>
    <div class="pr-cab"><span class="pr-m">${prSimb()}<b data-no-trad>TOISÓN</b><span class="pr-rh" data-no-trad></span></span>${selectorIdioma('mini')}<button class="intro-saltar" type="button" data-in="fin">Saltar</button></div>
    <nav class="pr-ix" aria-label="${esc(trad('Capítulos'))}">${['Portada', ...PR_CAPS.map((c) => c.k), 'Empezar'].map((n, i) => `<button type="button" data-ir="${i}" title="${esc(trad(n))}" aria-label="${esc(trad(n))}"><i></i></button>`).join('')}</nav>
    <div class="pr-sc" tabindex="-1">
      <section class="pr-port" data-port aria-label="Toisón"><div class="pr-luz" aria-hidden="true"></div>${quieta ? '' : prPolvo(20, 5)}
        <div class="pr-filete" aria-hidden="true"><span>${esc(trad(`Versión ${baseVer(VERSION)}`))}</span><span>Inversiones · Renta · Mercados</span></div>
        <div class="pr-heroe">${prHeroe(tema)}</div>
        <p class="pr-palabra" role="img" aria-label="Toisón" data-no-trad>${[...'TOISÓN'].map((c, i) => `<span style="--i:${i}" aria-hidden="true">${c}</span>`).join('')}</p>
        <div class="pr-orla" aria-hidden="true"><i></i></div>
        <h1 class="pr-h1 aparece" style="--d:2.1s"><span>Todas tus inversiones,</span> <em>en un solo sitio</em></h1>
        <p class="pr-ent aparece" style="--d:2.3s">Fondos, acciones, ETF, oro y cripto de cualquier bróker, con la renta hecha y una IA que conoce tu cartera.</p>
        <p class="pr-perfil-l aparece" style="--d:2.5s">Te lo cuento a tu medida:</p>
        <div class="pr-seg aparece" style="--d:2.5s" role="group" aria-label="${esc(trad('Te lo cuento a tu medida'))}"><button type="button" data-p="nov" aria-pressed="${!experto}">Estoy empezando</button><button type="button" data-p="exp" aria-pressed="${experto}">Llevo años invirtiendo</button></div>
        <div class="pr-baja aparece" style="--d:2.8s"><span>Baja despacio · ocho capítulos</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></div>
      </section>
      ${caps}
      <section class="pr-sec pr-fin" data-fin aria-label="${esc(trad('Empezar'))}">${quieta ? '' : prPolvo(14, 9)}<div class="pr-medalla-fin">${prSimb()}</div>
        <h2 class="pr-h" data-no-trad aria-label="${esc(trad('¿Empezamos?'))}"><span aria-hidden="true">${prPartir('¿Empezamos?', '')}</span></h2>
        <p class="pr-x aparece" style="--d:500ms">${nuevo ? 'Crea tu cartera en un minuto. Al entrar te enseño la app y por dónde empezar. En la web y en Android, con widget.' : 'Tu cartera te espera donde la dejaste. En la web y en Android, con widget.'}</p>
        <div class="pr-botones aparece" style="--d:700ms"><button type="button" class="btn pri" data-in="${sinSesion ? 'crear' : 'fin'}">${nuevo ? 'Crear mi cartera' : 'Entrar'}</button>${sinSesion ? '<button type="button" class="pr-enlace" data-in="entrar">Ya tengo cuenta: entrar</button>' : ''}<button type="button" class="pr-enlace" data-in="arriba">Verlo otra vez</button></div>
      </section>
    </div>
  </div>`;
  const raiz = $('.intro.pres'), sc = $('.pr-sc', raiz), barra = $('.pr-barra', raiz), rh = $('.pr-rh', raiz);
  // Mármol: la piedra de la app detrás (la dirección con huella que puso el build en #acabadoTema; la de la raíz no existe en dist)
  const piedra = $('#acabadoTema') && getComputedStyle($('#acabadoTema')).backgroundImage;
  if (piedra && piedra !== 'none') raiz.style.setProperty('--pr-piedra', piedra);
  const secs = [$('[data-port]', raiz), ...$$('.pr-sec', raiz)], hechos = new Set(), puntos = $$('.pr-ix button', raiz);
  requestAnimationFrame(() => requestAnimationFrame(() => secs[0].classList.add('vivo')));
  const marcar = (s) => {
    s.classList.add('vivo');
    const i = secs.indexOf(s), c = s.dataset.c != null ? PR_CAPS[+s.dataset.c] : null;
    puntos.forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
    rh.textContent = c ? `${c.rom} · ${trad(c.k)}` : '';
    if (c && !hechos.has(s)) { hechos.add(s); try { c.vivo(s, quieta); } catch (e) { console.warn(e); } }
  };
  let io = null;
  if ('IntersectionObserver' in window) { io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) marcar(e.target); }), { root: sc, threshold: 0.38 }); secs.forEach((s) => io.observe(s)); }
  else secs.forEach(marcar);
  // al bajar: la barra de arriba, la cabecera con el capítulo y la profundidad (cada cosa a su velocidad)
  let raf = 0;
  const pinta = () => {
    raf = 0; const H = sc.scrollHeight - sc.clientHeight, vh = sc.clientHeight || 1, y = sc.scrollTop;
    barra.style.transform = `scaleX(${H > 0 ? Math.min(1, y / H) : 0})`;
    raiz.classList.toggle('bajado', y > vh * 0.5);
    if (quieta) return;
    for (const s of secs) { if (!s.classList.contains('pr-sec')) continue; const q = (s.offsetTop - y) / vh; if (q > -1.2 && q < 1.2) s.style.setProperty('--p', q.toFixed(3)); }
  };
  const pedir = () => { if (!raf) raf = requestAnimationFrame(pinta); };
  sc.addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', pedir);
  pinta();
  const ir = (s) => sc.scrollTo({ top: s.offsetTop, behavior: quieta ? 'auto' : 'smooth' });
  let hecho = false;
  const fin = (modo) => {
    if (hecho) return; hecho = true;
    LS.set('inv-intro', true); LS.set('inv-intro2', true);
    if (modo) S.modoCuenta = modo;
    if (io) io.disconnect();
    document.removeEventListener('keydown', tecla); removeEventListener('resize', pedir); if (raf) cancelAnimationFrame(raf);
    seguir();
  };
  const tecla = (e) => {
    if (e.target.closest && e.target.closest('input')) return;
    const i = Math.max(0, secs.findIndex((s) => s.offsetTop + s.offsetHeight / 2 > sc.scrollTop));
    if (e.key === 'PageDown' || (e.key === 'ArrowDown' && e.altKey)) { e.preventDefault(); ir(secs[Math.min(secs.length - 1, i + 1)]); }
    else if (e.key === 'Enter' && sc.scrollTop >= sc.scrollHeight - sc.clientHeight - 4 && !e.target.closest('button')) fin();
  };
  document.addEventListener('keydown', tecla);
  raiz.addEventListener('click', (e) => {
    const p = e.target.closest('[data-p]');
    if (p) { const exp = p.dataset.p === 'exp'; raiz.classList.toggle('experto', exp); LS.set('inv-nivel', exp ? 'exp' : 'nov'); $$('[data-p]', raiz).forEach((c) => c.setAttribute('aria-pressed', String(c === p))); return; }
    const d = e.target.closest('[data-ir]'); if (d) { ir(secs[+d.dataset.ir]); return; }
    const b = e.target.closest('[data-in]'); if (!b) return;
    const a = b.dataset.in;
    if (a === 'arriba') sc.scrollTo({ top: 0, behavior: quieta ? 'auto' : 'smooth' });
    else fin(a === 'crear' || a === 'entrar' ? a : null);
  });
  setTimeout(() => sc.focus({ preventScroll: true }), 50);
}
