# Plan de la 0.7 · GrowIA fiable (23 oct 2026)

Decidido por Carlos el 23 oct a las 18:14: la 0.7 es «GrowIA fiable» y los datos e importación van después, en sus mismas fechas (última semana de noviembre). Viene del plan de la IA (fase 1; hoy en el doc privado «GrowFolio · Negocio y plan de la IA»). Plan escrito y construido con Opus 5.5 (no con Fable, como dice la regla 5), con Carlos fuera («ve tirando tú por tu cuenta en todo»).

Objetivo: que GrowIA acierte más y se quede sin cupo menos, leyendo todos los factores de cada empresa (negocio, sector, macro, político y regulatorio, social y reputación, mercado) sin gastar más. Todo con Gemini gratis: la Action ya tiene su propio proyecto de Google (23 oct).

## Punto de partida (medido el 23 oct)

- Cada ronda de GrowIA manda 18.232 tokens de instrucciones, herramientas y cartera; una pregunta típica, 1,8 rondas (de 1 a 4 peticiones).
- La Action lee 501 empresas en 24 h, una frase por empresa (escaneo.json → lectura: imp, rel, txt, cat). Desde el 23 oct, con Flash-Lite.
- Lo político y lo social solo llega si sale en un titular de la empresa.
- Ninguna prueba con Gemini de verdad; ningún aviso cuando GrowIA falla a un amigo.

## Lista cerrada

1. Fichas por empresa (Action). La lectura de prensa con Flash-Lite clasifica cada titular (factor, si es bueno o malo, cuánto importa, plazo) y mantiene una ficha por empresa con los seis factores, cada uno con su frase, fecha y fuentes. fichas.json en la rama datos, aparte de escaneo.json (se carga solo cuando hace falta). Lo que la app lee hoy de la lectura sigue igual.
2. Noticias por país, sector y tema (Action). Consultas a Google Noticias por tema (bancos centrales, aranceles, elecciones, regulación, huelgas y boicots…) y por país y sector de lo que hay en las carteras y el radar. Las lee Flash-Lite, dice a qué países y sectores afecta cada una y van a las fichas de esas empresas como macro, político o social.
3. GrowIA lee las fichas. La ficha va dentro de buscar_empresa (no hace falta una herramienta ficha_empresa aparte); en el contexto, la ficha corta de cada posición en vez de los titulares sueltos; el radar, los mercados y la prensa, más cortos. Objetivo: 2 peticiones o menos por pregunta de media y como mucho una búsqueda en internet por pregunta. Lo de bajar a 12.000 tokens por ronda no se ha cumplido: el contexto baja de 39,7k a 35,8k caracteres, porque las fichas y los temas ocupan parte de lo que se quita (las instrucciones y las herramientas, que son la mayor parte, no se han tocado).
4. La revisión diaria de la cartera, en una sola llamada con las fichas (hoy, de 1 a 3).
5. Cupo a la vista, sin nombres de modelos (cambiado el 23 oct a las 19:43, lo pidió Carlos: a quien usa la app le da igual cuántos modelos hay). GrowIA es la cara: arriba avisa solo si quedan 5 respuestas normales o menos (el 3.8 y el 3.6 cuentan juntos) o si contesta la rápida porque la normal se ha quedado sin cupo. En Ajustes de GrowIA se elige «Normal» o «Rápida»; los modelos de Gemini, el cupo de cada uno y lo que se apunta de los fallos van plegados en «Detalles técnicos». Gemini se nombra al poner la clave (hace falta una de Google) y en la privacidad.
6. Noticias útiles en todas las listas (ficha, Expertos, Mercados, Fiscalidad, consulta): cada titular con su factor, si es bueno o malo para la acción y cuánto importa; lo importante arriba y sin repetidos. Sin fotos de la prensa.
7. Banco de preguntas: unas 40 preguntas reales con lo que GrowIA tiene que decir y lo que no (fundador y estándar), que pasa una Action cada noche con la app de verdad, la cartera de prueba y Flash-Lite, y cada semana una muestra de 10 con el 3.6 (casi igual que el 3.8 y con su cupo libre). El resultado, en la rama datos y a la vista del dueño.
8. Fallos de GrowIA que llegan solos: tipo de error, modelo y versión, sin la pregunta ni la cartera, en Firestore (fallos_ia), a la vista del dueño en Ajustes. Revisión aparte (toca las reglas de Firestore).
9. Novedades ES/EN, dibujo y guía; una prueba por cada cosa; revisión aparte del prompt público de GrowIA.
10. Añadido el 23 oct a las 20:23 (lo pidió Carlos): Inicio en el ordenador. Logos en «Lo que más ha movido hoy», el mapa de la cartera a 440 px como mucho y con «Lo último, según GrowIA» al lado (con «Hoy, en lo tuyo»: lo que más se ha movido y por qué) y sin el hueco bajo GrowIA.

Fuera (backlog o versión siguiente): GrowIA y la IA compartida en el Worker de Cloudflare (con los datos, 0.8); Gemini de pago (0.9); análisis a fondo diario con el Pro (cuando se pague).

## Orden de trabajo

1. Fichas en la Action (puntos 1 y 2), directamente en main: no cambian la app y así hay datos de varios días cuando llegue lo demás. Con pruebas de Python.
2. En la rama v0.7: noticias útiles (6), GrowIA con fichas (3, 4, 5).
3. Banco de preguntas (7) y fallos (8).
4. Novedades, revisión aparte, barrido y publicación.

## Criterio de salida

- Fichas al día (leídas en los últimos 7 días) de al menos el 90 % de las empresas con noticias del radar y de todas las acciones de las carteras.
- El banco acierta el 90 % o más con Flash-Lite, y una pregunta media gasta 2 peticiones o menos.
- Una semana sin fallos de GrowIA de tipo «no contesta» o «se corta» que no se recuperen solos. Como los avisos de fallos llegan con la propia 0.7, esto se mide la semana después de publicarla: lo que salga se arregla con letra (0.7a, 0.7b).
- El razonamiento real del 3.8 medido (gemini.uso) y el plan de la IA rehecho con él.
- Presupuesto de rendimiento: < 800 KB y lista en < 2 s (las fichas se bajan al usarlas).

## Números de las versiones siguientes

Los datos e importación pasan a ser la 0.8, con las fechas que tenían (última semana de noviembre y primera de diciembre). El rediseño y la versión pública se renumeran o se juntan en su sesión de plan: lo decide Carlos (una «0.10» confundiría: parece menor que la 0.9).

## Estado

- [x] 1 Fichas (en main desde el 23 oct; 124 empresas a las 18:53)
- [x] 2 Temas (cada 3 horas; con industria desde las 18:36. Los cuatro temas de antes que eran de una sola empresa o sin industria, quitados a mano de fichas.json)
- [x] 3 GrowIA con fichas · [x] 4 Revisión en una llamada (3.6, sin herramientas) · [x] 5 Cupo a la vista · [x] 6 Noticias útiles (en la ficha, Expertos, Mercados y la consulta)
- [x] 7 Banco (construido; falta ver la primera tanda de verdad)
- [x] 8 Fallos (construido; pendiente de la revisión aparte de las reglas)
- [x] 10 Inicio en el ordenador (tests/inicio.spec.js)
- [x] 9 Novedades (con dibujos y guía) y revisión aparte del prompt público y de las reglas de fallos_ia: 11 hallazgos, arreglados (23 oct). El más serio, de cumplimiento: en estándar, las fichas decían «bueno o malo para la acción» de las acciones de cada uno; ahora son «lo que lee la prensa», igual para todos, y GrowIA tiene dicho que no las use para decir que compre, venda o mantenga. La duda de si las fichas cuentan como «recomendación de inversión» (Reglamento de Abuso de Mercado) va al abogado de la 0.9
## Medido el 23 oct por la tarde

- Banco, primera tanda de verdad (Flash-Lite, rama v0.7 antes de la revisión): 36 de 40 (90 %) y 1,7 peticiones por pregunta. Los cuatro fallos: tres por pasar de 4 peticiones al saltar al 3.6 cuando Flash-Lite no contestaba, y uno por la expresión de la prueba («arriesgada» no casaba con «riesgo»). En estándar dijo «Recoger beneficios» (la señal de fundador): era el banco, que no recalculaba las señales al cambiar de modo; arreglado y vigilado («recoger beneficios», «pide vender» y «señal automática» no pueden salir en estándar).
- Banco, segunda tanda (rama v0.7 con las dos revisiones): 39 de 42 (93 %) y 1,6 peticiones por pregunta. En estándar ya no recomienda: «la prensa destaca como negativo…» y «esa decisión te corresponde a ti». Fallos: dos por pasar de 4 peticiones al saltar al 3.6 y uno sin la palabra «arancel».
- Razonamiento del 3.8 aún sin medir: la clave nueva va bien, pero a las 19:41 y a las 20:05 (hora de España) el informe salió con Flash-Lite. El 3.8 estaba saturado (503) y el 3.6 sin cupo, porque las dos tandas del banco saltaron al 3.6 cuando Flash-Lite no contestaba. Arreglado: el banco ya no toca los modelos que no prueba, y informe.json guarda en «intentos» por qué no salió con el 3.8.
- Fichas al día: 110 de las 843 empresas con noticias en 7 días (13 %); la Action lee unas 500 al día, así que el 90 % llega en dos o tres días.
- Rendimiento: 753 KB al abrir (4 KB más que la 0.6c); lista en 2,0-2,3 s en este contenedor, igual que la 0.6c medida a la vez (la máquina iba lenta): la 0.7 no lo empeora.

## Medido el 24 oct

- Fichas: se quedaron paradas en el 38 % porque solo se leía una empresa cuando cambiaban sus noticias, y las leídas antes de las fichas (23 oct, 16:20 UTC) no se volvían a leer. Arreglado en main (se vuelven a leer una vez), más dos fallos que salieron al apretar: un JSON roto de Flash-Lite tiraba las 50 empresas de la pasada (ahora se aprovecha lo que venga bien) y un lote atascado se repetía igual en cada pasada (ahora se parte hasta grupos de 3 o 4 y lo que no sale se aparta en fichas.json → sin). Con pasadas lanzadas a mano: 92,9 % (659 de 709 empresas con noticias en 7 días) y las 4 acciones de las carteras.
- Razonamiento del 3.8: 4 informes, 7.471 tokens de media (de 6.348 a 10.327), 3.391 de salida y 16.756 de entrada. Plan de la IA y coste-ia.py rehechos: lo compartido C, 25,20 €/mes (37,13 € desde enero). Lo que razona en cada pregunta de un usuario sigue sin medir (el banco va con Flash-Lite y el 3.6).
- Rendimiento con la 0.6d dentro: 760 KB y lista en 1,96 s.
- La rama lleva la 0.6d (cartera de prueba) y los arreglos de las fichas de main; 48 pruebas en verde.

- Publicada el 24 oct a las 16:35 (merge de v0.7 a main; reglas de Firestore publicadas por su Action). Banco sobre la versión que sale: 42 de 42 (100 %), 1,6 peticiones por pregunta.

- Para Carlos, después de publicar: activar el TTL de Firestore en fallos_ia sobre el campo «caduca» (consola de Firebase → Firestore → TTL), para que los avisos se borren solos a los 30 días

## Medido el 29 oct (rama datos, 18:50 hora de España; sin cambios en main desde la 0.7c del 25 oct)

- Fichas al día: 788 de las 861 empresas con noticias (91,5 %). Cumple.
- Banco de la noche (Flash-Lite, 29 oct): 42 de 42 y 1,4 peticiones por pregunta. Cumple.
- Muestra semanal con el 3.6 (25 oct, 9:45, antes de la 0.7a): 8 de 10 y 2,7 peticiones de media. Los dos fallos, por pasar de 4 peticiones (6 en «¿compro NatWest?», que intentó buscar en internet; 5 en «idea del mes», que acabó en Flash-Lite). Con los modelos de «Normal», el «≤ 2 peticiones» aún no está demostrado. La siguiente muestra corre el domingo 1 nov: si sigue por encima de 2, arreglo con letra.
- Razonamiento del 3.8 en el informe, 7 informes del 27 al 29 oct: 8.544 tokens de media (de 6.041 a 10.426), 3.312 de salida. El 3.6, 7.811 (5 informes). Con 8.544 el informe pasa de 10,76 € a 11,57 €/mes (21,51 € → 23,13 € desde enero); con la única medida de las ideas (6.513 de razonar, se suponían 3.000), lo compartido C queda en unos 26,4 €/mes y 39,5 € desde enero. coste-ia.py sin tocar.
- Ideas del día con Flash-Lite el 28 oct (15:17): el 3.8 no contestó entre las 11:14 y las 20:18 (informes de esas horas con el 3.6; volvió el mismo día, así que era saturación y no cupo) y en ese momento el 3.6 tampoco. decidir() llama a gemini() con reserva, así que acepta Flash-Lite y se queda 24 h. El informe ya no acepta Flash-Lite si tiene uno reciente; las ideas no. Arreglo candidato en main (Action, sin versión de la app): que las ideas solo usen el 3.8 o el 3.6 y, si no contestan, se queden las de ayer y se reintente en la siguiente pasada.
- El informe sigue probando primero con búsqueda en Google en cada pasada (429 siempre en el plan gratis). Sobra mientras no se pague.
- Pendiente del criterio: la semana sin fallos (24-31 oct) se ve en fallos_ia (Ajustes → Cómo va GrowIA, solo el dueño); desde aquí no se puede leer Firestore.
