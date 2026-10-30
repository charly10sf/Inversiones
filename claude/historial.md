# Historial de GrowFolio

Versiones terminadas y decisiones tomadas, sacadas de claude/roadmap.md el 30 oct 2026 sin cambios. Lo pendiente está en ESTADO.md (en el Proyecto de claude.ai) y en claude/versiones/.

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

Roadmap de GrowFolio hasta el lanzamiento (23 oct 2026; al día el 30 oct, con la 0.7i publicada).

Documento completo, con mercado, competencia, costes y rediseño: https://claude.ai/artifact/2PF3o5DS37iLorTumdTjTb. Este archivo es la copia de trabajo: cada sesión empieza leyéndolo («dime en qué versión estamos y qué toca»). Lo marcado está hecho; lo que no está aquí no se hace. El plan detallado de cada versión está en claude/plan-0.X.md. El de la IA (costes, qué de pago y qué gratis, fases), en claude/plan-ia.md. Las redes (bios, publicaciones, vídeos), en claude/redes.md.
