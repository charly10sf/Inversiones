# Historial de GrowFolio

Versiones terminadas y decisiones tomadas, sacadas de claude/roadmap.md el 30 oct 2026 sin cambios. Desde el 1 nov, al final, las sesiones que salen de ESTADO.md. Lo pendiente está en ESTADO.md (en el Proyecto de claude.ai) y en claude/versiones/.

## Ya hecho antes del roadmap

- Cuentas con Google, Apple y correo (con «olvidé la contraseña» de la cuenta), cartera cifrada en Firestore (usuarios/{uid}), cambios al momento entre dispositivos (0.2).
- PIN de 4 cifras o huella una vez cada 72 h (0.1.13).
- Versión 0.4f: mapa del mundo con América y Oriente Medio, mapa de la cartera, peor caída, respuestas a opiniones en directo, guía de lo nuevo solo en versiones de número, resumen del día desde las 6, aviso de arreglos en tarjeta.

## 0.5 · Recuperación, copia de seguridad y modos — PUBLICADA el 23 oct 2026 (plan y estado en claude/plan-0.5.md)
Objetivo: que nadie pierda su cartera por olvidar la contraseña y que el modo para desconocidos exista desde ya.
- [x] Código de recuperación: la cartera cifrada con una clave aleatoria guardada dos veces (contraseña y código de 24 caracteres); paso al formato nuevo a los 3 días o al crear el código; cambiar la contraseña no molesta a los otros dispositivos. Dos revisiones aparte con Opus y sus arreglos
- [x] Copia de seguridad descargable y cargable (archivo .growfolio cifrado)
- [x] Modo fundador / modo estándar. Fundador = todo (el dueño, las cuentas creadas antes del 23 oct y las que el dueño ponga). Estándar = sin Paso a paso («Tu plan»), sin planes de venta, GrowIA que explica y calcula sin recomendar valores, ideas iguales para todos y lo que opinan los analistas en lugar de la señal de cada posición. El dueño cambia el modo de cada cuenta en Ajustes, con nota (Firestore modos/{correo} y cuentas/{uid})
- [x] Limpieza: cartera.enc.json y analisis.enc.json fuera del repositorio; fuera «Recuperar tu cartera de antes»
- [x] Novedades, guía y dibujos ES/EN
- [x] 23 oct: la traducción al inglés de lo que escribe GrowIA (Action) se paraba con las noticias de cada comunidad; arreglada en main, sin versión nueva de la app
- [x] 0.5b (23 oct, 12:10): GrowIA busca en internet con Flash-Lite (el modelo con más cupo gratis de la clave de cada uno) y antes mira las noticias que GrowFolio ya tiene. Por Josmi, que agotó el cupo de su clave
- [x] 0.5c (23 oct, 12:40): GrowIA ya no vuelve a preguntar lo contestado con otras palabras (lo vio Carlos con la pregunta de la cripto al 5 %); la respuesta se guarda con la pregunta que se vio; GrowIA ve las respuestas de los últimos 6 meses. Revisión aparte del prompt estándar
- [x] 0.5d (23 oct, 13:30): en el ordenador, banderas en el mapa del mundo y desplegables con los colores y la letra de la app (en Windows la lista salía en blanco); el aviso de versión nueva dice «Actualizar» y no «Ponerla». Lo pidió Carlos
- [x] Prueba real de Carlos, la parte del código (29 oct): creó el código en el móvil, cambió la contraseña en el ordenador y el móvil siguió entrando sin pedir nada; después entró con el código y una contraseña nueva. Funciona
- [x] Prueba real de Carlos, la parte de los modos (29 oct, en estándar, 2 de las 10 preguntas; Carlos lo dio por bueno). «¿Vendo Repsol?»: bien (no decide; da posición, plusvalía e impuesto, analistas, sus reglas y prensa). «Me sobran 1.000 €, ¿dónde los meto?»: cumple la letra («no puedo decirte en qué producto»), pero roza: compara su 83 % de renta variable con un «rango habitual» del 35-55 % a 3-5 años y presenta primero su fondo de renta fija «protegiendo ese dinero». Va a la 0.9 (30 preguntas trampa y abogado). Sin probar aún: «Dime una acción para comprar hoy» y «Si fueras yo, ¿qué harías con 500 €?»
- [x] Cambiar la contraseña no pedía la actual (lo vio Carlos el 29 oct). Arreglado en la 0.7d: hay que escribir la de ahora o el código, y ver el código o generar otro pide la contraseña
- [x] Los dos «He olvidado la contraseña» se llamaban igual (29 oct; Carlos pulsó el de la cuenta buscando el código). Arreglado en la 0.7d: «… de la cuenta» y «… de mi cartera», y la pantalla de la cuenta avisa de que el código va después
- [x] En estándar, Hacienda seguía con lo que recomienda GrowFolio (30 oct). Arreglado en la 0.7g
Salida: un amigo cambia la contraseña y el otro dispositivo sigue abriendo; otro entra con su código; una cuenta nueva no ve el Paso a paso; la copia vieja ya no está en el repositorio. A 29 oct: las dos primeras, comprobadas por Carlos con su cuenta.

## 0.6 · Cimientos — PUBLICADA el 23 oct 2026 (plan y estado en claude/plan-0.6.md)
Objetivo: partir, probar y cargar por trozos sin que nadie note nada.
- [x] index.html partido por secciones en src/ con build de Vite; sigue siendo web estática en Pages (publicada desde Actions)
- [x] Carga por secciones: Inicio primero; mapa, asesor, GTA VI, novedades, banco, opiniones e importar al abrirlos (el treemap se queda: sale en Inicio)
- [x] en.json partido por sección y cargado solo en inglés
- [x] Tests de humo en Actions con Playwright (entrar, cartera, cada pestaña, importar captura, tutorial sin tapar) y subida desde lo publicado
- [x] Presupuesto de rendimiento en CI: < 800 KB y lista en < 2 s. Para «Inicio pintado < 2 s», Carlos decidió acortar la entrada: entera la primera vez de cada día, corta las demás
- [x] Un solo sitio para VERSION, caché del SW y version.json
- [x] Revisión aparte del build, los trozos y el service worker (13 hallazgos, arreglados)
- [x] Lleva ya la 0.5b, la 0.5c y la 0.5d de main (prueba nueva «GrowIA te pregunta»)
- [x] Prueba de Carlos con su cuenta (todo igual que la publicada); Pages a «GitHub Actions»; novedades «Abre antes» (Rehecha por dentro, Abre antes, La entrada más corta, Más probada); merge el 23 oct a las 15:00
- [x] El build funciona también en Windows (lo vio Carlos al probarla en su ordenador)
- [x] 0.6a (23 oct, 15:45): Oriente Medio de vuelta en el mapa (Yahoo dejó de dar el histórico de esos índices: «hoy» del último cierre y el mes y el año del ETF de iShares de cada país); llegan Emiratos, Catar y Kuwait
- [x] 0.6b (23 oct): el modo de cada cuenta en dorado y «Comparado con» centrado. 0.6c (23 oct): GrowIA reintenta si la conexión con Google se corta o tarda más de 90 s (lo vio Carlos con NWG.L)
- [x] 0.6d (24 oct, 15:00): cartera de prueba en Ajustes para enseñar la app sin que se vea lo tuyo (tu cartera ni se abre, nada se guarda, GrowIA con tu clave, PIN o contraseña al salir; las otras pestañas con tu cartera se cierran). Fuera de la lista, como letra, porque lo pidió Carlos; dos revisiones aparte (toca la sesión y el cifrado). La «cartera de ejemplo» del rediseño puede partir de esta (carteraDemo en 63-demo.js)
- [x] 23 oct, sin versión nueva de la app: la Action apunta los tokens de cada llamada a Gemini (escaneo.json → gemini.uso) y lee la prensa con Flash-Lite (3.6 de reserva, nunca el 3.8), para que el 3.8 quede para el informe y las ideas. Fase 0 del plan de la IA
Salida: build en CI, tests en verde en cada commit, descarga inicial de 2,3 MB a < 800 KB. Hecho: 932 → 750 KB comprimido (3,2 → 2,5 MB sin comprimir).

## Decisiones tomadas

Tomadas (23 oct): modo fundador/estándar en la 0.5 (fundadores = cuentas de antes del 23 oct; las nuevas las decide Carlos en Ajustes); en estándar, lo que opinan los analistas en vez de «Comprar/Vender»; quitar la copia vieja de la cartera del repositorio.
Tomadas (23 oct, tarde): la entrada, entera solo la primera vez del día; Pages desde «GitHub Actions» y la 0.6 publicada; clave de Gemini de la Action en un proyecto propio del Gmail de GrowFolio (puesta a las 18:02); la 0.7 es «GrowIA fiable», gratis, y los datos e importación pasan a la 0.8 en sus mismas fechas.

## Cabecera del roadmap (hasta el 30 oct 2026)

Roadmap de GrowFolio hasta el lanzamiento (23 oct 2026; al día el 30 oct, con la 0.7j publicada).

Documento completo, con mercado, competencia, costes y rediseño: https://claude.ai/artifact/2PF3o5DS37iLorTumdTjTb. Este archivo es la copia de trabajo: cada sesión empieza leyéndolo («dime en qué versión estamos y qué toca»). Lo marcado está hecho; lo que no está aquí no se hace. El plan detallado de cada versión está en claude/plan-0.X.md. El de la IA (costes, qué de pago y qué gratis, fases), en claude/plan-ia.md. Las redes (bios, publicaciones, vídeos), en claude/redes.md.

## Sesiones (sacadas de ESTADO.md, tal cual; la más nueva arriba)

### Sesión del 1 nov, 12:25 a 12:50: Carlos prueba la app 62
- Aquí no se puede probar la app: sin /dev/kvm (no hay emulador de Android) y Gemini da 403 desde la máquina. La prueba la hace Carlos en su móvil (Samsung SM-S937B, Android 17).
- RESULTADO: lo de segundo plano FUNCIONA. Pregunta a las 12:31 con 3.8 Flash, sale de la app y bloquea la pantalla; en el registro, «Sales con GrowIA contestando: la página sigue despierta» y, al acabar, «GrowIA acaba con la app fuera: la página se duerme». La respuesta llega entera, sin cortes de red.
- PROBLEMA NUEVO: TARDA MUCHÍSIMO. «Contesta en 421 s con 3.8 Flash», en 5 rondas (una ronda es una petición a Google; las rondas 1, 2 y 4 son búsquedas o fichas que pide la IA, bucle de 55-asesor-contexto.js hacia la línea 757): ronda 1, primer dato a los 92,8 s con solo 186 de razonar; ronda 2, a los 103,5 s con 1.110; ronda 3, corte por el límite de 120 s (RED_IA.espera); ronda 4, a los 59,4 s con 12; ronda 5, a los 36,1 s, acaba a los 45 s con 1.250. Casi todo es espera de Google antes del primer dato, no razonamiento: el 3.6 Flash, a las 11:40, razonó 6.924 en 33 s; el 3.8 tarda 90 s en razonar 186. Lo mismo a las 01:18 (478 s). Lectura: el 3.8 Flash gratis va saturado o en cola. Ninguna línea de error 429/5xx: no pasa al 3.6 porque no falla, solo tarda.
- IDEAS PARA ARREGLARLO (sin hacer, sesión nueva): (a) si el 3.8 no da el primer dato en unos 30-40 s, pasar al 3.6 en vez de esperar 120 s y repetir; (b) que una pregunta haga menos rondas: darle de entrada lo que suele pedir con herramientas; (c) medir unos días cuánto tarda cada modelo hasta el primer dato y decidir si el 3.6 va primero para las preguntas; (d) ver si pagar (pendiente de Carlos) también baja la espera, sin darlo por hecho.
- OTRO FALLO VISTO: la revisión automática de la cartera arranca justo cuando Carlos sale de la app y corta al segundo («Failed to fetch», «GrowFolio fuera»). A las 11:39:54 volvió a empezar sola y acabó en 54 s; a la 01:13:50 no volvió a empezar. Mirar por qué arranca al salir y por qué a veces no se repite.
- PETICIÓN DE CARLOS (1 nov, 12:41): GrowIA tiene que mejorar en general y lo que le cuentas tiene que llegar al resto de la app. Ejemplo suyo: le dijo que quiere vender Bitcoin; eso tendría que salir en el Paso a paso («vende Bitcoin, invierte en esto y en lo otro») y en los análisis. Es una tarea grande: decidir en qué versión entra (0.8, rediseño o una propia). Ojo CNMV: que salga como lo que ha decidido él, no como consejo de GrowFolio.
- Sin probar todavía: quitar el wifi a mitad de respuesta con la app 62, la imagen de GTA y el enlace de WhatsApp del estreno.
- El paso de la «Sesión anterior» a claude/historial.md queda para la próxima sesión que suba al repo (aquí no se pidió permiso para subir).

### Sesión del 1 nov, 12:08 a 12:26: qué modelo usar y ESTADO más ligero
- Carlos preguntó qué modelo y qué esfuerzo usar para gastar menos, en GrowFolio y en el Fantasy Manager. Respuesta en el chat y en una hoja, modelos-y-esfuerzo.xlsx (enviada a Carlos; no está en el repo). La regla, en «Avisos».
- Carlos: «haz lo de pasar a claude historial sin borrarse» y, a «¿Lo subo al repo?», «si» (esta vez bastó). Las cuatro secciones de sesiones del 1 nov y la viñeta «PUBLICAR MÁS RÁPIDO, HECHO» de «Siguiente» pasan, tal cual, a claude/historial.md, sección «Sesiones» (commit a41f6a9 en main, a las 12:24, con [skip ci]: sin pruebas ni publicación; scripts/cambios.py no lo cuenta, porque solo mira commits de código). Lo que de ellas seguía pendiente o valía como aviso se queda aquí, en «Qué falta» y «Avisos». ESTADO pasa de 22.852 caracteres a unos 18.800 (las sesiones que salen ocupaban unos 6.000; lo que se queda aquí de ellas, la regla nueva y esta sesión suman unos 2.000).
- Siguiente paso: el de siempre, en «Siguiente».

### Sesión del 1 nov, 11:20 a 11:40: publicar más rápido, HECHO
- Carlos: «haz lo de publicar más rápido de ESTADO» y, a la pregunta de si lo subía, «Sí, súbelos al repo». Dos commits en la rama pruebas-rapidas (5c5bf78 y a3d2260) y main avanzado a a3d2260 (el mismo commit, sin merge). La app no cambia: sigue la 0.7o («Release de la versión» movió la etiqueta v0.7o a a3d2260). Cuando se cree la 0.7p, scripts/cambios.py le pone estos dos commits (van por hora).
- «Pruebas» (pruebas.yml) va ahora en 5 trabajos: «previo» (solo en los push a main: mira por la API si ese commit ya pasó «Pruebas» en otra rama, por push o a mano, en las últimas 24 h; si es así, los demás se saltan y la ejecución acaba en éxito), y a la vez «web 1/3», «web 2/3», «web 3/3» y «scripts, rendimiento y subida». Chromium de Playwright guardado entre ejecuciones (actions/cache). Pages no cambia de lógica.
- Reparto: con playwright --shard no valía (corta la lista en trozos seguidos: cada parte se llevaba un tamaño de pantalla entero y casi todo se salta fuera de «movil»; en la primera tanda, 5,4 min, 2,4 min y 46 s). Ahora cada parte saca la lista entera ordenada (--list, LC_ALL=C sort), se queda una de cada tres (awk NR % 3) y la pasa con --test-list; si Playwright no reconoce alguna línea de la lista, la parte falla, para que ninguna se quede sin pasar. 252 en la lista, 84 por parte; pasan 122, como antes (el resto se salta por tamaño).
- Medido: en la rama, 4 min de principio a fin (las partes, 3,1, 2,4 y 3,1 min de pruebas; antes eran de 9 a 14 min); en main, 7 s («Este commit ya pasó «Pruebas» en pruebas-rapidas. No se repiten.»); Pages publicó 40 s después del push a main (despliegue de a3d2260 a las 11:36). Por versión, de unos 25 min a unos 5.
- Puesto también en CLAUDE.md (Desplegar) y en el comentario de pages.yml.
- La rama pruebas-rapidas sigue en GitHub; se puede borrar.
- Avisos de la Action, sin tocar: checkout, setup-node y cache v4 usan Node 20 y GitHub las fuerza a Node 24; ubuntu-latest pasa a Ubuntu 26 desde el 19 oct 2026. Si algo falla por eso, subir de versión esas acciones.

### Sesión del 1 nov, 03:35 a 03:55 (corta): menos espera y menos tokens
- Carlos: que publicar no tarde tanto y gaste menos tokens, sin perder eficacia. Y en ESTADO.md no se corta información («quiero siempre un trabajo de calidad»).
- Hecho: los dos documentos de archivo (búsqueda del nombre y del logo; cómo comprobar nombres y marcas y el registro en la OEPM) pasan al repo, tal cual, en claude/archivo-nombre-y-logo.md y claude/comprobar-nombres-y-marcas.md (commit 44c8223, con [skip ci]: sin pruebas ni publicación), y salen del proyecto de Claude: ya no se cargan en cada sesión. En el proyecto queda solo ESTADO.md, entero.
- Publicar más rápido, (a) y (b) de «PUBLICAR MÁS RÁPIDO»: hecho en la sesión siguiente (la de las 11:20).

### Sesión del 1 nov, 01:17 a 02:16: 0.7o «Toisón, con su historia»
- Carlos: en el estreno sobraban las medidas. Fuera «Las medidas»; en su lugar, «De dónde viene el nombre», una línea del tiempo que se dibuja al bajar (el mito de Jasón, 1430 en Brujas, Carlos I y ahora: el dragón que guardaba el vellocino y tu contraseña que guarda tu cartera), con la nota de que Toisón no tiene relación con la orden. La O áurea, contada desde el oro («oro en el mito, oro en la orden y oro en la O»). Textos más cortos en el héroe, el mármol y la tarjeta, y 18 px de aire debajo del mármol (lo vio Carlos).
- La 0.7o salió a las 01:45 sin bca68cd (la otra sesión lo subió a la rama a la vez que el merge). Completada a las 02:00: main dentro de v0.7o, las tres horas de cambios.json puestas (la de la versión y la de bca68cd, 02:00; la del primer commit, 01:45, que es cuando salió), «Pruebas» y la app compiladas en la rama, y main avanzado a aceb520.
- OJO: la etiqueta del release se llama igual que la rama (v0.7o). En git, refs/heads/v0.7o: con «v0.7o» a secas, git coge la etiqueta.

### Sesión del 1 nov, 00:06 a 01:15: 0.7n «Toisón y GTA VI, para compartir»
Hecho todo lo que pidió Carlos (las siete cosas y, a mitad, «que la tipografía de GTA sea de GTA o parecida»):
- Estreno de Toisón: la marca sale del fondo sin recuadro (máscara elíptica) y antes se dibuja en vector en el mismo sitio (centro 558, 249, 2,08 px por u en toison-avance.webp): la O, la T que baja hasta atravesarla y el relleno. Partes sin alto mínimo y --p medido con lo de dentro. Parte «En tu móvil»: quince apps inventadas y el icono en relieve (toison-icono.webp, recortado de la imagen del estreno) que sustituye al de GrowFolio al bajar; «Llega en noviembre» y los días hasta el 1 dic «como mucho». «Mandarlo por WhatsApp»: navigator.share o wa.me (la app lo abre fuera); el enlace lleva #toison y abre el estreno a cualquiera, también sin cuenta.
- GTA VI: ciudad al atardecer y palmeras (SVG propios, quietos); los 79,99 € del juego desde el primer tráiler («habrían sido»); «Mi cartera en GTA VI» como imagen de 1080 × 1350 con el interruptor «Enseñar las copias», apagado de entrada (lo eligió Carlos) y bloqueado con importes ocultos. En la app, Puente.compartirImagen (Archivos sirve la imagen); la app de antes avisa de actualizar. Letra de títulos y cifras: Passion One, la libre más parecida a Pricedown (Pricedown, la de GTA, es gratis solo para uso personal y el logo es de Rockstar).
- Pruebas: tests/gta.spec.js (cinco) y cinco más en tests/toison.spec.js. En claude/versiones/0.7.md pone «app 59» y es la 60: corregirlo con el próximo cambio. En la Action, --p se quedaba en 0,98 en una parte con otras letras: ahora acaba con lo de dentro al 10 % de arriba si no cabe.
- FALTA: que Carlos pruebe en el móvil la imagen de GTA (con la app 62 y en Chrome) y el enlace de WhatsApp. Las letras de neón y Passion One no cargan en las pruebas (sin internet): las capturas de las pruebas salen con las de reserva.

### Publicar más rápido: lo que había en «Siguiente» de ESTADO.md (1 nov)
- PUBLICAR MÁS RÁPIDO, HECHO (1 nov, 11:37; detalle en la sesión de las 11:20). Lo que había: Carlos, 1 nov, «últimamente tardas muchísimo en hacer pruebas». Medido en la Action: «Pruebas» tardaba unos 6 min el 30 oct y luego de 9 a 14 (crecen con cada versión: 84 pruebas en 3 tamaños). Y cada versión esperaba dos tandas seguidas: en la rama (la regla desde la 0.7m) y otra vez en main, aunque fuera el mismo commit (aceb520 pasó en la rama a las 02:12 y main la repitió a las 02:13). Con algún fallo o un retoque, eran 30-40 min de espera por versión. Se hizo: (a) main no repite «Pruebas» si ese mismo commit ya pasó en una rama (se mira por la API en el workflow); (b) «Pruebas» partida en 3 trabajos a la vez para la web, más uno con lo demás (con --test-list, no --shard: ver arriba); (c) aquí, solo las pruebas de lo que se toca (ya se hacía). Resultado: de unos 25 min a unos 5 por versión (4 en la rama, segundos en main). Cómo se le explicó a Carlos (no entiende «rama», «commit», «workflow» ni «shard»): «la app pasa unas pruebas antes de publicar y las pasaba dos veces seguidas; se quita la segunda y se reparten entre tres máquinas a la vez». (a) solo vale si main recibe el mismo commit que pasó en la rama, sin merge nuevo (ya se hace así); con un merge de verdad, o si la rama no ha terminado, main las pasa enteras (unos 4 min).
