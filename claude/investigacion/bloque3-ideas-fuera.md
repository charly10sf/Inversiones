# Bloque 3 — Ideas de fuera de las finanzas que enganchan y dan calidad percibida

Fecha de la investigación: 4 de noviembre de 2026. Todas las fechas entre paréntesis son la fecha de la página o del documento; cuando no la había, lo digo. Conversiones a euros marcadas como aproximadas (≈, al cambio orientativo de 0,85–0,90 €/$; comprobar el día que haga falta).

Leyenda de las traducciones a Toisón:
- **Coste**: S = una sesión de Claude de 2–4 h; M = 2–3 sesiones; L = 4 o más.
- **Semanal**: si alguien lo usaría o lo vería cada semana (sí / no / a diario).
- **Riesgo**: legal (CNMV/ESMA/Play) o de «gamificar la inversión»: ninguno / bajo / medio / alto.
- **Ya**: lo que Toisón ya tiene (según contexto-toison.md): sí / parcial / no.

Nota de método: la cuota de búsquedas web se agotó a mitad del trabajo (es compartida entre agentes). Lo que no pude comprobar lo marco como «no verificado» en vez de rellenarlo.

---

## 0. El marco legal primero: qué dicen ESMA, FCA, IOSCO (y qué pasa con la CNMV)

Esto es lo que separa «hábito» de «casino». Toisón no es una empresa de servicios de inversión ni ejecuta órdenes, así que MiFID II no le aplica directamente; pero el abogado que revisará los textos, la política de apps financieras de Google Play, la política de Anthropic y la propia idea de «app seria» hacen que convenga adoptar estos criterios como reglas de diseño.

### ESMA — Discussion Paper sobre digitalización (ESMA35-43-3682, 14 dic 2023)
Fuente: https://www.esma.europa.eu/sites/default/files/2023-12/ESMA35-43-3682_Discussion_Paper_on_MiFID_II_investor_protection_topics_linked_to_digitalisation.pdf (párrafos 83–120). Es un documento de consulta, no norma, pero es el texto europeo más concreto sobre «digital engagement practices» (DEP).

Lo que ESMA considera **inaceptable** (bullets consolidados tras el párrafo 106):
- «Use of gamification techniques that encourage investors to trade more should not be allowed in the case of risky products. This includes using techniques such as positive reinforcement immediately after financial transaction (…) messages to congratulate the investor/trader, use of confetti or badges».
- «Firms should not influence the clients' choices through DEPs such as gamification».
- Párr. 95: los incentivos «can motivate the investor to continuously observe the portfolio and trade frequently».
- Párr. 86: en un experimento citado, los inversores que recibían puntos hicieron «almost 40% more trades» que los que no.
- Párr. 112: preocupación por categorías tipo «most popular», «hot», «trending» o «top movers» como arquitectura de elección que empuja a operar.
- Párr. 118–119: si la empresa manda avisos de un cambio significativo de precio, debe valorar antes si ese contenido es adecuado para el público objetivo; los avisos push pueden provocar picos de operativa a corto plazo.
- Nudging: fijar apalancamiento alto por defecto, no.

Lo que ESMA considera **aceptable o deseable**:
- Párr. 96: «celebrating the reaching of a long-term investment goal» y «the diversification of a portfolio should be encouraged», en vez de celebrar operaciones.
- Párr. 97: tablas de clasificación de «traders who have the most diversified portfolio», no de los que más operan.
- Párr. 93: gamificación para «help users learn about (complex) financial concepts in an interactive manner».
- Párr. 109: empujar por defecto hacia instrumentos no complejos y menos arriesgados.
- «Firms are encouraged to use DEPs to provide (prospective) clients with educational content, in a neutral manner».
- Párr. 106: a petición del inversor, poder limitar el número de operaciones por día, semana o mes; mostrar un mensaje de que operar en exceso puede causar daño financiero; poder salir del proceso en cualquier momento sin completar la operación.

Resumen en una frase para Toisón: **celebra el plan (aportar, diversificar, cumplir metas a largo plazo), nunca la operación; no uses listas «trending» de mercado como empujón; los avisos por precio, sin llamada a actuar.**

### ESMA — otros documentos
- Directrices de gobernanza de producto MiFID II (ESMA35-43-3448, 27 mar 2023): las técnicas de las apps que empujan hacia comportamientos dañinos «will never be in the interest of the client». Vía https://www.cpduk.co.uk/news/digital-engagement-practices-investment-services-why-regulatory-spotlight-moved-and-where-it (sin fecha visible; cita documentos hasta marzo de 2026).
- Informe sobre el «retail investor journey» (ESMA35-243228190-7410, 12 mar 2026, 96 respuestas a la consulta de mayo de 2025): señala gamificación, finfluencers y marketing digital agresivo como amplificadores de riesgo, pide protección frente a dark patterns, y dice que «firms should not take a formalistic or box-ticking approach». No abre un expediente específico sobre DEP. Fuentes: https://www.ropesgray.com/en/insights/viewpoints/102mqx7/esma-report-on-the-retail-investor-journey-key-takeaways y el artículo de CPD UK de arriba.
- Acción supervisora común sobre conflictos de interés MiFID II (2025–2026) con las plataformas digitales entre las prioridades (Finance Magnates, 29 may 2026: https://www.financemagnates.com/forex/your-trading-app-looks-like-a-gambling-shop-regulators-have-noticed/).

### IOSCO — informe final sobre Digital Engagement Practices (FR/07/2025, 19 may 2025)
Nombra «badges, rewards, celebratory messages, and instant gratification features»; observa que estas herramientas pueden alterar la evaluación del riesgo y llevar a peores resultados, y que ya no existe el intermediario humano que frenaba al cliente. Buenas prácticas en gobernanza, divulgación, seguimiento y educación. Sin fuerza legal directa. Fuente: artículo de Finance Magnates de arriba (29 may 2026) y CPD UK.

### FCA (Reino Unido) — los datos más duros que hay
- Research Note «Digital engagement practices: a trading apps experiment» (20 jun 2024; actualizado 3 jun 2026 sin cambios): experimento con más de 9.000 consumidores; precios parpadeando, avisos push, tablas de clasificación de traders y puntos/sorteos «can increase the trading frequency and risk taking of consumers»; mayor efecto en personas con menor cultura financiera, mujeres y 18–34 años. https://www.fca.org.uk/publications/research-notes/research-note-digital-engagement-practices-trading-apps-experiment
- Occasional Paper 66 (abr 2025), con datos reales cruzados con ficheros de crédito: el usuario mediano de «alto engagement» hizo 7 veces más operaciones que el de bajo; 4,8 puntos más de probabilidad de una pérdida grande (>2 % de la renta anual); casi el doble de «engagement potencialmente problemático» (medido con marcos de juego); 4 veces más inicios de sesión nocturnos (23:00–06:00); estrés financiero del 5,1 % frente al 1,9 % (7,3 % en usuarios de CFD). Ninguna de las firmas había medido el efecto causal de sus prácticas. Vía Finance Magnates (29 may 2026).

### Directiva (UE) 2023/2673 (se aplica desde el 19 jun 2026 vía ley nacional)
Prohíbe a los comerciantes diseñar interfaces de servicios financieros a distancia que «deceives or manipulates consumers». Más la DSA art. 25 y el Reglamento de IA art. 5 (prohibición de técnicas manipuladoras, en vigor desde el 2 feb 2025). Vía CPD UK.

### CNMV
No he podido abrir un documento propio de la CNMV sobre gamificación: la nota de prensa del 9 oct 2026 en la que, según el titular, la CNMV compara el atractivo de las criptomonedas entre jóvenes con «el gaming y las apuestas» (https://www.articulo14.es/economia/la-cnmv-alerta-sobre-el-atractivo-de-las-criptomonedas-entre-los-jovenes-las-compara-con-el-gaming-y-las-apuestas-20261009.html) no cargó, y la cuota de búsquedas se agotó antes de encontrar otra fuente. Lo que sí consta: la CNMV aloja en su web la consulta de ESMA sobre digitalización (https://internet.cnmv.es/DocPortal/DocFaseConsulta/CESR/Digitalisationenen.pdf), es decir, la hace suya como supervisor nacional. **Pendiente**: buscar «CNMV gamificación» en cnmv.es y las comparecencias del presidente de 2025–2026 cuando haya cuota.

### El precedente Robinhood
El 31 de marzo de 2021 Robinhood quitó el confeti que celebraba la primera operación, el primer paso de cash management y las invitaciones, tras la denuncia del regulador de Massachusetts por «aggressive tactics to attract inexperienced investors» y uso de gamificación para manipular; lo sustituyó por «dynamic visual experiences» y dijo que el confeti «gets distracting». https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html (31 mar 2021).

---

## 1. Duolingo — rachas, hábito, avisos, widget, Year in Review

Fuentes principales: Jackson Shuttleworth (Group PM de Retención) en Lenny's Podcast, 15 dic 2024, resumen en https://www.recall.it/summary/lennys-podcast/behind-the-product-duolingo-streaks-or-jackson-shuttleworth-group-pm-retention-team ; blog de Duolingo «How streaks keep learners committed» (10 may 2017) https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/ ; «How we developed our addictive and delightful widget» (29 ago 2023) https://blog.duolingo.com/widget-feature ; «How we built a personalized Year-in-Review» (8 dic 2022) https://blog.duolingo.com/year-in-review-behind-the-scenes ; Android Authority sobre Year in Review 2025 https://www.androidauthority.com/duolingo-year-in-review-2025-3621782 .

### 1.1 La racha, con perdón incorporado
- **Cómo funciona**: un día cuenta si haces una lección (antes era por XP; pasar a «una lección al día» disparó el uso; exigir solo un ejercicio no subió los DAU). Más de 9 millones de usuarios con racha de un año o más. Más de 600 experimentos sobre la racha en cuatro años, la mitad descartados.
- **Lo que hace que no sea castigo**: dos «congelaciones» funcionan mejor que una, tres no mejoran; dar dos congelaciones a los nuevos fue uno de sus mayores logros; «earn back» recupera la racha perdida haciendo X lecciones en un plazo; principio declarado: flexibilidad antes que castigo, celebrar al usuario aunque falle. El «Streak Wager» (apostar gemas a mantener 7 días) subió la retención a 7 días un 14 % (2017); el «Weekend Amulet» subió un 4 % la vuelta a la semana siguiente y bajó un 5 % las rachas perdidas.
- **Por qué engancha**: el salto grande de retención es de 1 a 2 días; a los 7 días la racha «se fija». Un solo cambio de copy explicando la regla («Start a day to extend your streak, but miss a day and it resets») dio más de 10.000 DAU incrementales.
- **Traducción a Toisón**: NO una racha de abrir la app a diario (eso es justo lo que ESMA describe en el párr. 95: mirar la cartera continuamente). Sí una **racha de meses cumpliendo tu plan** (aportación hecha y cartera dentro de tus límites), con una «pausa» al año sin romperla (vacaciones, imprevisto) y «recuperar» si aportas lo del mes siguiente antes del día 15. Y una segunda, discreta: **«meses sin vender»** («llevas 14 meses sin tocar nada») como marcador de paciencia, no como medalla ruidosa. Coste S. Semanal: no (mensual; se ve en Hoy). Riesgo: bajo (celebra ahorro y disciplina, lo que ESMA llama meta a largo plazo). Ya: no.

### 1.2 El widget: dos datos y una emoción
- **Cómo funciona**: solo dos datos (días de racha y si hoy está hecha). Duo cambia de humor según la hora y si falta la lección; 25 ilustraciones. Principios: debe empujar a una acción al tocarlo, enfocado (la investigación dijo que recordar la racha y su riesgo ya valía), personalidad propia, distinto del push. Lanzado iOS jul 2022, Android mar 2023. La instalación despegó con una promoción dentro de la app tras la lección.
- **Dato**: la mitad de los que tienen el widget llevan al menos seis meses de racha; mejor retención incluso descontando que los que lo instalan ya son más comprometidos.
- **Traducción**: Toisón ya tiene widget. Rehacer el **widget pequeño con dos datos**: «tu mes» (aportación hecha o pendiente, y si estás dentro de límites) y una sola cifra elegible (patrimonio o variación del mes), con **modo discreto** (sin euros). Por defecto, que el dato sea el mes, no el día (evita el «mirar a cada rato»). Y una pantalla dentro de la app que invite a instalarlo justo después de completar el Paso a paso del mes. Coste M. Semanal: a diario. Riesgo: bajo si no muestra variación diaria por defecto. Ya: parcial.

### 1.3 Avisos que la gente agradece
- **Cómo funciona**: recordatorio de práctica 23,5 h después de la última sesión; «streak saver» a las 22:00 si no has hecho la lección; los usuarios lo ven como ayuda, no spam.
- **Traducción**: avisos locales **solo por hechos tuyos**: «mañana toca tu aportación», «has cobrado un dividendo de X», «tu fondo Y ha cambiado el TER», «el 31 de diciembre cierra el año fiscal: te quedan Z € de pérdidas por compensar», «hace tres meses que no revisas tu reparto». Nunca un aviso de precio con llamada a actuar (párr. 118–119 de ESMA). Coste S (ya hay avisos locales; es definir la lista y el tono). Semanal: alguno a la semana. Riesgo: ninguno si se cumple la regla. Ya: parcial.

### 1.4 Year in Review: un «estilo» para que todos tengan algo que compartir
- **Cómo funciona**: empezó por email en dic 2019, dentro de la app desde 2020; muestra días activos, minutos, palabras, lecciones, percentil de XP y un «estilo de aprendiz» (personalidad según hábitos: devoto de la racha, cambia de idioma…). En 2025: lecciones, XP, minutos, racha y comparación con otros; última tarjeta compartible; compartir con un amigo da 100 gemas.
- **Dato clave**: en 2020 el 10 % con más XP generó más de la mitad de las compartidas; añadieron el «estilo» para que el resto también tuviera motivo, y subió «significativamente» la tasa de compartir. Millones de tarjetas compartidas, #Duolingo365 tendencia cada año, pico de altas en 2021 tras el lanzamiento, y más lecciones y tiempo después de verlo.
- **Lecciones del equipo**: premiar el compromiso, que sea disfrutable para todos y no solo para los mejores, copy e ilustración universales.
- **Traducción**: ver 3.4 (Tu año en Toisón). La parte que viene de Duolingo: un **«estilo de inversor»** calculado con el comportamiento (frecuencia de aportación, rotación, diversificación, concentración por sector, cuánto lees el radar), con nombre sobrio («Constante», «Paciente», «Diversificador», «Explorador»), para que quien ganó poco también tenga tarjeta. Coste: dentro de Tu año (L en total). Semanal: no. Riesgo: bajo; nunca «estilos» que premien operar mucho.

### 1.5 Una frase que explique la regla
- **Dato**: un cambio de copy a 63 caracteres explicando la racha dio +10.000 DAU; cambiar el botón de «continue» a «commit to my goal» fue una mejora significativa; preseleccionar una meta más dura no mejoró la retención, dejar elegir sí.
- **Traducción**: Toisón ya tiene «¿Qué es?» por bloque. Convertirlo en regla: **cada cifra con su frase de ≤ 70 caracteres** visible sin tocar, y las metas las elige el usuario (nunca un objetivo de aportación preseleccionado alto). Coste S (revisión de textos). Semanal: a diario. Riesgo: ninguno. Ya: parcial.

### 1.6 Medir antes de añadir
- **Dato**: 600 experimentos, la mitad fallan; métrica norte «current user retention».
- **Traducción**: Toisón no puede hacer A/B con 20 usuarios, pero sí contar eventos (Firebase Analytics gratis): quién abre qué pestaña, cuántos completan el Paso a paso del mes, cuántos instalan el widget. Sin eso, el resto de este documento son hipótesis. Coste S. Riesgo: RGPD (anonimizar, consentimiento). Ya: no.

**No copiar de Duolingo**: la racha diaria, el personaje que se enfada, las gemas, las ligas semanales.

---

## 2. Strava — comparar sin enseñar lo íntimo, retos, kudos, resumen anual, mapas

Fuentes: Strava Design, «Understanding how athletes use the feed» (28 sep 2017) https://medium.com/strava-design/understanding-how-athletes-use-the-feed-aae986eaa818 ; estudio de Radboud University sobre kudos, vía Canadian Running (10 ene 2023) https://runningmagazine.ca/?p=91520 ; road.cc sobre controles de privacidad (12 ago 2021) https://road.cc/content/tech-news/strava-adds-privacy-features-hiding-data-285549 ; Sacra sobre Strava como «neutral social layer» https://www.sacra.com/chat/h/d1c5f57d-6bad-42ba-9fd0-18fddd762f92/ (sin fecha); Year in Sport 2025, Endurance Sportswire (2 dic 2025) https://www.endurancesportswire.com/strava-releases-12th-annual-year-in-sport-trend-report-revealing-that-doomscrolling-is-out-movement-is-in/ ; Gadgets & Wearables sobre el recap individual 2025 https://gadgetsandwearables.com/?p=17590747 (sin fecha).

### 2.1 Kudos: reconocimiento de un toque
- **Cómo funciona**: un toque, sin texto. Los atletas lo describen como «virtual high fives». Dan kudos «a quien ha hecho un esfuerzo».
- **Dato**: estudio de 329 miembros de cinco clubes holandeses durante un año (Journal of Social Networks, 2023): quienes recibían más kudos corrían más; quienes tenían los kudos desactivados corrían menos; muchos cambiaban su comportamiento para conseguirlos; en 4 de 5 clubes pesó más lo que hacían los amigos cercanos que los kudos en sí. Antes del estudio, el 83 % usaba Strava para registrar, el 78 % para ver progreso, el 31 % por lo social y el 21 % por validación. Sin tamaños de efecto en la noticia.
- **Traducción**: kudos **a hechos del plan, no a resultados**: «Carlos ha hecho su aportación de noviembre» → un toque de ánimo de los amigos. Requiere grupo privado de amigos (carteras compartidas no existen aún). Coste L (modelo de datos compartido en Firebase, invitaciones, privacidad). Semanal: sí si hay grupo. Riesgo: medio (párr. 100 de ESMA habla de «social (validation) rewards»; es defendible si solo premia aportar/diversificar; nunca kudos a una compra concreta). Ya: no. Para 1.x, no para la 1.0.

### 2.2 Comparar sin enseñar lo íntimo
- **Cómo funciona** (ago 2021): zonas de privacidad de hasta 1,6 km al inicio y al final de cualquier actividad, ocultar el mapa entero, ocultar velocidad/potencia/calorías/pulso a seguidores y público (tú sí los ves), «Only You» por actividad, notas privadas. En la investigación de 2017: los atletas quieren redes íntimas, no añadir a todos sus contactos; «I'm not in it for the followers»; casi nadie comparte a otras redes.
- **Traducción**: regla de producto: **en todo lo compartible, porcentajes y hechos, nunca euros**, y el usuario decide qué campo se ve. Un **modo discreto** global (oculta cantidades en toda la app y en el widget; muchas apps de banca lo tienen) para enseñar la pantalla a alguien. Coste S. Semanal: a diario. Riesgo: ninguno; mejora RGPD. Ya: no (Tu año del roadmap anterior ya preveía «sin cifras absolutas si no quieres»).

### 2.3 Retos mensuales
- **Cómo funciona**: retos de distancia, tiempo, días o segmentos; motivan a quienes no compiten.
- **Traducción**: **retos de conducta**, nunca de rentabilidad: «12 de 12 aportaciones», «revisa tus costes este trimestre», «lee cuatro fichas del radar este mes», «comprueba tu reparto objetivo». Opcional, sin ranking. Coste M. Semanal: sí. Riesgo: bajo. Ya: no.

### 2.4 Segmentos y Local Legends
- Clasificaciones por tramo de carretera y por quién lo repite más. En inversión, una clasificación por rendimiento es lo que ESMA rechaza; la única variante admitida (párr. 97) sería «quién tiene la cartera más diversificada», y con 20 usuarios no tiene sentido. **No traducir.**

### 2.5 Year in Sport
- **Dato**: 180 millones de usuarios en 185 países (dic 2025). El recap individual de 2025 pasó a ser solo para Premium (~80 $/año ≈ 70 €), con críticas por ser «a slideshow of already known stats».
- **Lección**: un resumen anual que repite totales que ya ves en el perfil aburre y, si además lo cobras, cabrea. El valor está en lo que no ves el resto del año (ver 3.4).

### 2.6 Mapa de calor personal
- **Cómo funciona**: tus rutas acumuladas pintan un mapa.
- **Traducción**: Toisón ya tiene «Día a día» (calendario de ganancias). Añadir un **calendario de calor de aportaciones** (estilo GitHub: cada mes, cuánto aportaste, cuántos movimientos) y, en Tu año, el mapa del mundo con «dónde vive tu dinero» ya existe (Reparto). Coste S. Semanal: no. Riesgo: ninguno. Ya: parcial.

**No copiar de Strava**: segmentos, KOM, Local Legends, perfiles públicos, el feed abierto.

---

## 3. Spotify Wrapped — el «Tu año»: formato, qué comparte la gente, por qué

Fuentes: Music Business Worldwide (8 dic 2025) https://www.musicbusinessworldwide.com/spotify-wrapped-campaign-hit-200m-engaged-users-in-24-hours-a-19-yoy-increase ; Fast Company (4 dic 2025) https://www.fastcompany.com/91454685/spotify-wrapped-2025-eagerly-checking-your-listening-age-everyone-else-is-too ; Fortune / The Conversation (3 dic 2025) https://fortune.com/2025/12/03/why-spotify-wrapped-marketing-genius-individuality-uniqueness-belonging-psychology/ ; Rosie Hoggmascall en UX Collective, «What's happened to Spotify Wrapped» (18 dic 2024) https://uxdesign.cc/whats-happened-to-spotify-wrapped-cdfc32bf56a7 .

### 3.1 Números
- 2025: 200 millones de «usuarios comprometidos» (vieron al menos una historia) en unas 24 h, +19 % interanual (en 2024 tardó 62 h); unos 500 millones de compartidos (+41 %), contando compartir en la app, descargas y capturas. 2022: 120 millones, ~28 % de los MAU. 2021: 60 millones de gráficos compartidos. #SpotifyWrapped: 73.700 millones de visualizaciones en TikTok en 2023.

### 3.2 Formato
- Tarjetas a pantalla completa que se pasan tocando, un dato por tarjeta, listas para captura en vertical. En 2024 recortaron ~40 % el contenido, texto centrado en todas las pantallas, sin imagen focal, dos de ocho tarjetas eran de IA; Rolling Stone dijo que «sucked the joy right out of the beginning of the month» y la autora vio que sus conocidos compartieron mucho menos. Lección: el formato no salva un contenido vago.

### 3.3 Por qué se comparte: identidad, no cifras
- Las tarjetas más compartidas históricamente son las de **persona** (Audio Aura, Listening Personality) y, en 2025, la **Listening Age** (la edad que «aparentas» por lo que escuchas), que se compartió también porque fallaba de forma graciosa. Teoría de la distintividad óptima (Brewer, 1991): queremos parecernos al grupo y a la vez ser únicos; Wrapped da las dos cosas. En 2025 añadieron «multiplayer» para comparar con amigos y «Clubs» (seis tipos de oyente).

### 3.4 Traducción: «Tu año en Toisón» (ya en el roadmap anterior para el 20 de diciembre)
Ocho a diez tarjetas, todas con versión «sin euros»:
1. Portada con tu estilo de inversor (ver 1.4).
2. «Aportaste X de 12 meses» y tu racha de plan.
3. **Edad de tu dinero invertido** (ver 8.3): antigüedad media ponderada de tus posiciones; es la «Listening Age» de Toisón y es educativa (premia mantener).
4. Tu mes más movido del mercado y qué hiciste tú (si no vendiste, se dice: «te quedaste quieto, que suele ser lo difícil»).
5. Dónde vive tu dinero (mapa de países, % no euros).
6. Lo que te costó la cartera (TER total en %, y en euros si lo activas).
7. Dividendos cobrados (opcional en euros).
8. Rentabilidad frente al MSCI World (solo tu dato, nunca ranking entre usuarios).
9. Lo que supondría en la renta (resumen Hacienda).
10. Tarjeta final compartible: estilo + meses aportando + edad del dinero + país principal. Sin cifras absolutas por defecto.
- **Coste**: L (2–3 sesiones: cálculo, diseño de tarjetas con los tres estilos Mármol/Marfil/Borgoña, compartir por hoja nativa de Android). **Semanal**: no (anual, pero es el mayor momento de captación del año: Duolingo vio pico de altas). **Riesgo**: bajo si no hay comparación de rentabilidad entre personas ni tono de «haz esto el año que viene». Ya: no (planeado).

**No copiar de Wrapped**: rellenar con texto de IA, tarjetas que repiten totales, la comparación pública de resultados.

---

## 4. Revolut y Monzo — avisos útiles, widgets, categorías, round-ups, «Year in Monzo»

Fuentes Revolut: «Introducing new and improved Analytics» (19 nov 2019) https://www.revolut.com/blog/post/introducing-new-and-improved-analytics/ ; Finextra sobre Revolut 10 (verano de 2023, fecha no indicada; 35 millones de clientes, +90 % de clientes que la usan como cuenta principal en Europa) https://www.finextra.com/pressarticle/98301/revolut-overhauls-design-and-layout-of-primary-app-account .
Fuentes Monzo: «15 features that'll turn Monzo sceptics into Monzo obsessives» (24 oct 2019) https://monzo.com/blog/2019/10/24/15-features-thatll-turn-monzo-sceptics-into-monzo-obsessives ; hilo oficial «Year in Monzo 2024 is here» (16 dic 2024) https://community.monzo.com/t/year-in-monzo-2024-is-here/172368 ; Yorkshire Evening Post sobre Year in Monzo 2024 https://www.yorkshireeveningpost.co.uk/business/consumer/monzo-wrapped-how-to-find-2024-year-in-review-4911556 .
No pude verificar la explicación oficial de Monzo sobre por qué sus avisos instantáneos reducen la ansiedad (cuota de búsquedas agotada).

### 4.1 Revolut Analytics: proyección a fin de mes y «picos explicados»
- **Cómo funciona**: estimación del gasto a fin de mes según el día a día y los pagos programados (mejora con el tiempo); si hay presupuesto, te dice si vas bien y se pone rojo si te pasas; en los picos del gráfico indica la causa («fue el alquiler»); categorías personalizadas que recategorizan el pasado; el ciclo mensual empieza el día que cobras.
- **Traducción**: en la gráfica de patrimonio, **anotar los saltos con su causa** («aportación», «dividendo», «caída del mercado», «traspaso»), que es lo que la gente pregunta a la IA («¿por qué bajó aquí?»); y que «Tu mes» empiece el día que cobras (configurable). Coste M. Semanal: sí. Riesgo: ninguno. Ya: parcial («lo que más se mueve» explica el día, no los picos del histórico).

### 4.2 Etiquetas propias de posiciones
- **Traducción** de las categorías personalizadas: etiquetas libres por posición («núcleo», «satélite», «capricho», «para la casa») y reparto por etiqueta. Coste S–M. Semanal: no. Riesgo: ninguno. Ya: no.

### 4.3 Pantalla de inicio configurable (Revolut 10)
- **Cómo funciona**: widgets dentro de la app para tarjetas o destinatarios favoritos, acceso de un toque a lo clave; razón declarada: «a clear view of their money in one place» y que la gente encuentre funciones que no conoce.
- **Traducción**: bloques de Hoy reordenables y ocultables (patrimonio, tu mes, lo que más se mueve, tu plan, La semana). Coste M. Semanal: a diario. Riesgo: ninguno. Ya: no.

### 4.4 Monzo: aviso al instante de cada gasto y bill tracker
- **Cómo funciona**: notificación en el momento del pago con saldo actualizado; «bill tracker» avisa cuando una domiciliación cambia de importe; sobregiro transparente con aviso antes de cobrar.
- **Traducción**: **aviso cuando algo tuyo cambia sin que hayas hecho nada**: cambia el TER de un fondo, se anuncia un dividendo distinto al anterior, un split, una posición sale de tus límites. Es lo que Monzo hace con las facturas. Coste M (hay que detectar cambios en los datos de GitHub Actions). Semanal: ocasional. Riesgo: ninguno. Ya: no.

### 4.5 Pots con meta, Pots bloqueados y Salary Sorter
- **Cómo funciona**: huchas con objetivo y barra de progreso; hucha bloqueada hasta una fecha que avisa si intentas sacar antes; reparto automático del sueldo al cobrar.
- **Traducción**: Toisón no mueve dinero, así que no hay round-ups. Pero sí: **metas con fecha** que avisan al anotar una venta antes de tiempo («esta posición la marcaste como "para 2032"; ¿lo apuntas igual?») — es un límite que puso el propio usuario, no una orden. Coste S. Semanal: no. Riesgo: bajo si el tono es «tú lo marcaste». Ya: parcial (metas y límites existen).

### 4.6 Year in Monzo: tono a elegir y «moods»
- **Cómo funciona** (dic 2024): eliges tono «nice» o «savage» (cambia diseño, animaciones y textos, no los datos); 300 frases para los 150 comercios principales; ~50 «moods» (≈100 con ambos tonos) basados en dónde y cuánto gastas; componentes reutilizables tipo historia; datos del 1 de enero al 31 de octubre; excluyeron cuentas externas conectadas porque los datos no cumplían su calidad; pensado para compartir. Quejas: datos de cuenta conjunta ausentes, un comercio mal clasificado, un usuario encontró el «mood» condescendiente.
- **Traducción**: en Tu año, **dos tonos**: «sobrio» (por defecto; Carlos quiere app cara) y «con guasa» (opcional). La lección de excluir datos de baja calidad vale: si una posición importada por IA no cuadra, no entra en el resumen. Coste: dentro de Tu año. Riesgo: ninguno.

**No copiar**: Revolut tiene «Trading» con listas de populares y notificaciones de precio; nada de eso.

---

## 5. Apple Fitness y Apple Watch — anillos, insignias, resúmenes, haptics

Fuentes: Apple Newsroom «Get active with Apple Watch» (14 abr 2025) https://www.apple.com/newsroom/2025/04/get-active-with-apple-watch/ ; Apple Support «Track daily activity with Apple Watch» https://support.apple.com/108359 (sin fecha); Beyond Nudge, «The psychology behind Apple Watch» (30 ene 2024) https://beyondnudge.substack.com/p/the-psychology-behind-apple-watch .

### 5.1 Tres anillos diarios
- **Cómo funciona**: Move (calorías activas), Exercise (minutos), Stand (horas con al menos un minuto de pie); el anillo se solapa si te pasas; metas personalizables por día de la semana y pausables en días de descanso. Efecto «goal gradient»: ver el anillo casi cerrado empuja a cerrarlo.
- **Dato**: Apple Heart and Movement Study, más de 140.000 participantes: quienes cierran los anillos al menos el 50 % de los días tienen un 48 % menos de probabilidad de mala calidad de sueño, 73 % menos de pulso en reposo elevado y 57 % menos de estrés elevado (asociaciones, no causalidad).
- **Traducción**: **tres anillos mensuales en «Tu mes»**: (1) aportación del mes hecha, (2) cartera dentro de tu reparto objetivo y tus límites, (3) revisión mensual hecha (has pasado por el Paso a paso). Mensuales, no diarios. Ninguno mide operaciones. Se pueden pausar («este mes no aporto»). Coste M. Semanal: sí (se mira). Riesgo: bajo; es adherencia al propio plan. Ya: parcial (Tu mes y Tu plan existen, sin forma de anillos).

### 5.2 Insignias por hitos y récords, retos mensuales a tu medida
- **Cómo funciona**: premios por récords personales, rachas y hitos; categorías (Monthly Challenges, Competition awards, en curso); el «Close Your Rings Day» (24 abr) da un premio de edición limitada, pegatinas animadas y un pin físico en las Apple Store.
- **Traducción**: **hitos sobrios y privados**: «primer año invirtiendo», «12 aportaciones seguidas», «primera renta hecha con Toisón», «primer 10.000 € de patrimonio» (este último solo visible para ti). Es exactamente lo que ESMA llama «celebrating the reaching of a long-term investment goal». Nada por operaciones. Sin confeti: una tarjeta con tipografía Ibarra y un cambio de color sutil. Coste S–M. Semanal: no. Riesgo: bajo. Ya: no.

### 5.3 Resumen semanal y Tendencias
- **Cómo funciona**: botón de resumen semanal con media diaria y total; «Trends» compara tus últimos 90 días con los últimos 365, flechas arriba/abajo, y una sugerencia neutra cuando algo baja («walk an extra quarter of a mile a day»); requiere 6 meses de datos.
- **Traducción**: **Tendencias de Toisón**: ritmo de aportación 90 días frente a 12 meses, coste medio, diversificación, concentración; flecha y una frase sobre tu propio plan («para mantener el ritmo del año faltarían 120 €/mes»). Nada sobre productos. Coste M. Semanal: sí. Riesgo: bajo (es sobre tu plan, no sobre comprar/vender). Ya: no.

### 5.4 Haptics y recordatorios configurables
- **Cómo funciona**: vibración al cerrar un anillo; recordatorios de «vas bien / te quedas atrás» que se pueden desactivar; Daily Coaching desactivable.
- **Traducción**: `navigator.vibrate` en Android al completar un paso del mes o cerrar un anillo (10–20 ms, discreto); cada tipo de aviso con su interruptor. Coste S. Riesgo: ninguno. Ya: parcial.

**No copiar**: competiciones semanales con amigos por puntos (en inversión = ranking de rentabilidad).

---

## 6. Notion y Linear — sensación de calidad, atajos, velocidad, changelog como producto

Fuentes: Linear, «Startups, write changelogs» (Karri Saarinen, 18 may 2020) https://linear.app/blog/startups-write-changelogs ; Gunpowder Labs, «Linear's delightful design patterns» (22 dic 2024) https://gunpowderlabs.com/2024/12/22/linear-delightful-patterns ; 925 Studios, «Linear design breakdown» (14 mar 2026) https://www.925studios.co/blog/linear-design-breakdown-saas-ui-2026 ; Built In sobre la cultura de «craft» en Notion (3 feb 2025) https://builtin.com/articles/why-craft-defines-notions-culture . De Notion no encontré mecanismos tan concretos como de Linear; lo que hay es cultura (rendimiento, intuición, detalle) más que trucos.

### 6.1 Velocidad medible
- **Cómo funciona**: carga < 200 ms, cambio de vista < 100 ms; UI optimista (el elemento aparece antes de que confirme el servidor y se revierte si falla); «skeleton states» con la forma del contenido en vez de spinners; el sidebar no se mueve al cambiar de vista.
- **Por qué da calidad**: la velocidad se nota sin saber de diseño. Gunpowder cita el dato de Amazon (cada 100 ms de latencia, −1 % de ventas) y el umbral de 100 ms para sentir algo instantáneo.
- **Traducción**: Toisón ya abre con < 1000 KB. Añadir: **abrir siempre con los últimos precios en caché** y actualizar sin parpadeo; esqueletos en Análisis mientras calcula; la barra de pestañas fija. Medir con Lighthouse y poner el número en el changelog. Coste S–M. Semanal: a diario. Riesgo: ninguno. Ya: parcial.

### 6.2 Cmd+K y atajos
- **Cómo funciona**: paleta de comandos con búsqueda difusa que muestra el atajo de cada acción; modo «solo teclado» para aprender.
- **Traducción**: en la web, **Ctrl/Cmd+K**: «ir a Hacienda», «buscar Iberdrola», «preguntar a la IA», «añadir movimiento». En Android, accesos directos al mantener pulsado el icono (ya estaba en el roadmap anterior). Coste S–M. Semanal: sí (usuarios de web). Riesgo: ninguno. Ya: no.

### 6.3 El changelog como producto
- **Cómo funciona** (Linear 2020): ritmo fijo (semanal o quincenal), uno a tres cambios grandes con captura o vídeo y los arreglos agrupados; lo escribe quien lo hizo; se publica en la web y en Twitter; alta a la newsletter durante el onboarding; más de 1.000 seguidores al año; les sirvió para captar usuarios, candidatos e inversores («Actions speak louder than words»).
- **Traducción**: Toisón ya tiene «novedades por versión» dentro de la app. Sacarlas a una **página pública /novedades** con una captura por versión, fecha, y un enlace «pedido por un usuario» cuando venga de feedback; aviso opcional por correo (Firebase ya tiene el correo). Es lo que se enseña a quien pregunta «¿esto se mantiene?». Coste S. Semanal: no (por versión). Riesgo: ninguno. Ya: parcial.

### 6.4 Color solo para significado, rejilla de 4 px
- **Cómo funciona**: paleta gris con el color reservado a estado, prioridad e interactivo; rejilla de 4 px; acciones extra solo al pasar el ratón; detalles al tocar.
- **Traducción**: **auditoría de color** en los tres diseños: verde/rojo solo para variación, un acento solo para acciones, todo lo demás neutro; una sola rejilla de espaciado. Coste M (una sesión por diseño). Semanal: a diario. Riesgo: ninguno. Ya: parcial.

### 6.5 Bandeja con posponer
- **Cómo funciona**: inbox por proyecto, cola de triaje (aceptar/rechazar), «snooze» con lenguaje natural («2d»).
- **Traducción**: **Pendientes** en Hoy: aportación de este mes, dividendo por confirmar, posición fuera de límites, documento fiscal por revisar; cada uno con «posponer una semana». Coste M. Semanal: sí. Riesgo: bajo (son tareas de tu plan, no órdenes). Ya: parcial (Paso a paso).

### 6.6 Que se pueda contactar
- **Cómo funciona**: formulario dentro de la app, correo de soporte real, responder a los emails de Linear llega a alguien. Gunpowder lo contrasta con el típico «noreply» y botón roto.
- **Traducción**: botón «Escríbeme» en Ajustes (mailto o formulario a Firebase) y en cada versión del changelog, qué se arregló por quién lo pidió. Coste S. Riesgo: ninguno. Ya: no (el roadmap anterior preveía soporte por correo).

---

## 7. Arc y Things — detalles de acabado, sonidos, micro-animaciones

Fuentes: Input/Inverse, entrevista al equipo de diseño de Arc (7 jun 2022) https://www.inverse.com/input/design/the-browser-company-arc-design-interview ; LogRocket, análisis UX de Arc (29 abr 2024) https://blog.logrocket.com/ux-design/ux-analysis-arc-opera-edge/ ; MacStories, reseña de Things 3 (may 2017) https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/ .
**No verificado**: el diseño de sonido de Arc y los sonidos de Things; ninguna de las fuentes que pude abrir lo describe, así que no lo cito como dato.

### 7.1 Arc: el onboarding como «unboxing» con pequeñas victorias
- **Cómo funciona**: tutorial de varios pasos con mucho color (lo modelaron como la apertura de una película), «little wins» tempranas (eliges un gradiente y ves el resultado), y termina con una **tarjeta de miembro** personalizada y compartible; la beta por invitación daba sensación de exclusividad. Principio declarado: «we've pretty much figured out good UX as an industry», así que se inspiran en cine y videojuegos.
- **Traducción**: onboarding de Toisón que empiece eligiendo diseño (Mármol/Marfil/Borgoña) y vea el cambio al instante, y termine con un **carnet de miembro** («Miembro n.º 23, desde noviembre de 2026») compartible sin ningún dato financiero. Para los amigos de la prueba cerrada, «fundador». Coste S–M. Semanal: no. Riesgo: ninguno. Ya: parcial (presentación y tutorial existen).

### 7.2 Arc: figura y fondo, el marco iluminado
- **Cómo funciona**: la interfaz retrocede (sidebar que se esconde) y el contenido es la figura; un marco con luz suave inspirado en Robert Irwin; color como algo personal («más casa que herramienta»).
- **Traducción**: en Análisis (13 pestañas) y en el gráfico de patrimonio, **modo lectura**: oculta la barra y deja solo el gráfico; y persistir el último estado (pestaña, rango, posición) como Arc persiste las pestañas 12 h. Coste S–M. Semanal: sí. Riesgo: ninguno. Ya: no.

### 7.3 Things 3: el botón «+» que se arrastra, la tarjeta que salta, el progreso en el menú
- **Cómo funciona**: el «Magic Plus» se arrastra a donde quieras crear algo; al tocar una tarea sale como tarjeta y el resto se atenúa; vibración al coger una tarea, al usar el «+» y al tirar para buscar; indicador de progreso de cada proyecto en el menú lateral; mucho blanco, tipografía en negrita, encabezados dentro de los proyectos, sección «This Evening».
- **Traducción**: (a) **indicador de progreso del mes** junto a «Paso a paso» en la navegación (un pequeño anillo o fracción 2/4); (b) al tocar una posición, la tarjeta se expande y el resto se atenúa; (c) encabezados dentro de Posiciones (por etiqueta o por bróker) con una nota debajo. Coste S cada una. Semanal: a diario. Riesgo: ninguno. Ya: no.

**No copiar**: el exceso de color de Arc, el personaje. Toisón ya tiene su identidad (Inter + Ibarra Real Nova).

---

## 8. Copilot Money, Monarch, YNAB — finanzas personales con calidad

Fuentes: Apple Developer, «How Copilot Money developed an interest in Swift Charts» (9 jun 2025) https://developer-mdn.apple.com/articles/copilot-money/ ; ficha de Copilot en App Store (4,8★, 31.000+ valoraciones; Apple Design Award Finalist 2024; Editors' Choice) https://apps.apple.com/app/id1447330651 ; análisis de diseño de Copilot https://blakecrosley.com/zh-Hant/guides/design/copilot-money (sin fecha); reseña de Monarch (14 ago 2026, act. 22 sep 2026) https://marriagekidsandmoney.com/monarch-money-review/ ; YNAB «Is YNAB worth it? 12 customers weigh in» (26 dic 2021) https://www.ynab.com/blog/is-ynab-worth-it-12-customers-weigh-in ; guía de las cuatro reglas de YNAB (7 may 2026, act. 18 oct 2026) https://www.fincomparelab.com/guides/ynab-4-rules/ .

Precios (referencia para Toisón a 2,99 €/mes o 24,99 €/año): Monarch 99,99 $/año (≈ 86–90 €) o 14,99 $/mes, Plus 199,99 $/año; YNAB 109 $/año (≈ 94–98 €) o 14,99 $/mes; Copilot no publica el precio en la ficha (suscripción con un mes gratis). Conversiones aproximadas.

### 8.1 Copilot: el fondo retrocede, el color significa
- **Cómo funciona**: lienzo azul marino casi negro, superficies por escalones de tono sin bordes visibles; el color solo en los datos, con un significado fijo cada uno (verde ingresos, rojo-naranja gastos, azul patrimonio e interactivo, amarillo pendiente/aviso); gráficos nativos que responden a pellizco, arrastre y toque; la pantalla empieza con tarjetas-resumen y el detalle aparece al tocar; datos en local («the app is really responsive»); categorización automática que aprende; seguimiento de inversiones con comparación frente a índices intradía; «no vendemos tus datos, no entrenamos IA de terceros con ellos, sin anuncios».
- **Traducción**: (a) **diccionario de cuatro colores** documentado en el repo y aplicado a los tres diseños; (b) **la privacidad como función visible**: una tarjeta en Ajustes y en la ficha de Play con tres frases (cifrado con tu contraseña, nadie lo ve, sin anuncios); Toisón ya lo hace, le falta decirlo así. Coste S. Semanal: a diario. Riesgo: ninguno; cuidado con la frase sobre IA, porque la cartera sí pasa por Anthropic (decir la verdad: «se envía cifrada en tránsito y no se usa para entrenar»). Ya: parcial.

### 8.2 Monarch: dos personas, una casa; reglas; deshacer
- **Cómo funciona**: lo que el autor más echaría en falta es la **colaboración** (dos inicios de sesión, un presupuesto, categorías de «dinero propio» separadas); metas junto al presupuesto; reglas que categorizan solas; presupuesto con arrastre; sin anuncios ni upsells. Quejas: **no hay deshacer**, cuentas que se desconectan, caro.
- **Traducción**: (a) **deshacer** al editar o borrar un movimiento (S; es una de las quejas más repetidas en apps de finanzas); (b) **reglas de importación** por bróker («si el CSV dice "Ausschüttung" es dividendo») (M); (c) cartera compartida en pareja, dos cuentas y una cartera (L, para 1.x). Semanal: (a) y (b) cuando importas; (c) sí. Riesgo: ninguno; (c) añade RGPD de dos personas. Ya: no.

### 8.3 YNAB: un método con nombre y «la edad del dinero»
- **Cómo funciona**: cuatro reglas (dar a cada dólar un trabajo, asumir los gastos reales, encajar los golpes, envejecer el dinero); **Age of Money** = media de cuánto tiempo llevaban en la cuenta los dólares de tus últimas diez salidas, visible en la pestaña Reflect, necesita diez movimientos, 30 días como hito, «no hay objetivo universal». YNAB afirma que los nuevos ahorran de media 600 $ el primer mes y más de 6.000 $ el primer año (su propia página de precios; metodología no explicada; el blog de 2021 dice «dos meses» en un sitio y «un mes» en otro).
- **Por qué funciona**: un método con nombre convierte una herramienta en una disciplina y da vocabulario para hablar de ella. La métrica propia (edad del dinero) es simple, no depende del mercado y premia la paciencia.
- **Traducción**: (a) **Edad de tu dinero invertido**: antigüedad media ponderada por importe de tus posiciones actuales (y la de lo vendido este año, para Hacienda: >1 año o no cambia nada en España, pero da conciencia de rotación); una cifra en Hoy, en Tu año y en Análisis. Coste S. Semanal: sí. Riesgo: ninguno. (b) **Las reglas de Toisón**, cuatro frases sobre proceso, no sobre productos (p. ej.: «Aporta antes de mirar», «Cada euro tiene su sitio en tu reparto», «Ajusta sin castigarte», «Deja envejecer lo que compras»), que aparezcan en el onboarding y en la web. Coste S–M (texto, revisión del abogado por el tono). Riesgo: bajo si son sobre hábitos; medio si parecen consejo. Ya: no.

---

## 9. Robinhood y Public — lo que funciona del diseño y lo que es «casino»

Fuentes: CNBC sobre la retirada del confeti (31 mar 2021) https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html ; UX Collective, «How Robinhood gamified investing and exploited users» (2 sep 2024) https://uxdesign.cc/how-robinhood-gamified-investing-and-exploited-users-633152780355 ; IXD@Pratt, crítica de diseño de Robinhood (13 feb 2025) https://ixd.prattsi.org/2025/02/design-critique-robinhood-ios-app/ ; Brand Knew / Fast Company sobre la marca de Public (8 jun 2021) https://www.brandknewmag.com/?p=21064 ; FinLedger sobre la comunidad de Public (6 oct 2021) https://develop.finledger.com/articles/as-retail-investors-flock-public-is-focused-on-community-building .

### 9.1 Lo que sí funciona en Robinhood (y Toisón puede usar)
- **Color de rendimiento** en el botón y en la pantalla (verde si sube, rojo si baja) como señal rápida; **odómetro** en los precios cuando cambian (los dígitos giran), elogiado por dar «situational awareness»; gráfico de cartera con rangos (1D, 1S, 1M) para decisiones de alto nivel; separar «Trade» en Buy/Sell/Options por «natural mapping». Quejas de Pratt: sin rango de fechas personalizado y sin vista de reparto en el gráfico (Toisón tiene ambas).
- **Traducción**: **números con odómetro** en patrimonio y variación al refrescar (quality sin casino: es una animación de dato, no una celebración). Coste S. Semanal: a diario. Riesgo: ninguno. Ya: no.

### 9.2 Lo que es casino (y por qué Toisón no debe copiarlo)
- Confeti y vítores tras la primera operación (celebra la actividad, no el resultado); «rasca» con una acción gratis (lotería desde el primer día); listas de «top movers / trending / popular» (urgencia y rebaño); push frecuentes con emojis (impulso ante oscilaciones); compra de un toque sin pausa. Datos (1T 2020): por dólar de cuenta, los usuarios de Robinhood negociaron 9 veces más acciones que los de E-Trade y 40 veces más que los de Schwab, y 88 veces más contratos de opciones que Schwab; 13 millones de usuarios con media de 31 años a principios de 2021; multa de 65 millones de dólares de la SEC en dic 2020 por el payment for order flow. El confeti se quitó el 31 mar 2021 tras la denuncia de Massachusetts.
- **Qué toca en Toisón ahora**: Hoy tiene «lo que más se mueve». Es informativo y sobre tu cartera, pero ESMA (párr. 112) señala precisamente las categorías «top movers». Dos ajustes de bajo coste: (1) que el bloque sea siempre **sobre tus posiciones**, nunca un «trending» del mercado general; (2) que cada línea lleve el «por qué» (noticia) y la frase «qué supone para tu cartera», sin botón de acción. En Ideas, el radar no se ordena por «lo más comprado» ni «lo más caliente». Coste S. Riesgo: reduce uno existente. Ya: parcial.

### 9.3 Public: engagement «alrededor de la cartera», no operando
- **Cómo lo cuentan**: «engagement doesn't come from day trading. It comes from being active around your portfolio» (educarse, seguir, hablar); 90 % de sus usuarios se identifican como inversores a largo plazo; «81% of people who bought a meme stock actually went on to build a diverse portfolio» (datos de la propia empresa); dejaron el PFOF en feb 2021; Town Hall (preguntas a fundadores); marca sobria (Helvetica, mucho blanco, fotos de usuarios reales), «we're building long-term investors, not just people who want to gamble on a quick stock». No pude verificar en estas fuentes el detalle de que Public muestre carteras ajenas solo en porcentajes.
- **Traducción**: es la tesis de producto de Toisón escrita por otro: la razón para volver cada semana debe ser **aprender, revisar y planear**, no mirar precios. Eso justifica La semana (sección 10), las fichas del radar y Tendencias por encima de cualquier cosa que haga mirar el ticker. Coste: ninguno (criterio). Riesgo: lo reduce.

---

## 10. Wealthsimple — editorial

Fuentes: Media in Canada sobre la edición impresa de TLDR (23 ago 2023) https://mediaincanada.com/2023/08/23/spotted-wealthsimple-brings-its-newsletter-to-print ; página de TLDR https://wealthsimple.com/tldr (último número archivado: 19 de octubre de 2026).

### 10.1 TLDR: el boletín como producto
- **Cómo funciona**: semanal, lanzado a finales de 2021; en agosto de 2023 llegó a tres millones de suscriptores, «el boletín financiero más leído de Canadá»; promesa: «A weekly dose of money, culture, and enough financial news to make you sound smart at parties»; etiquetas «Smart graphs» y «Bad puns»; titulares como «Oh no, you're rich!» o «Canada's Starlink dilemma»; archivo público con emoji por tema; pie que dice que no es asesoramiento. Para celebrar los tres millones imprimieron un número como periódico gratuito con puesto y café en Union Station (Toronto).
- **Por qué funciona**: da una razón semanal para pensar en dinero que no es el precio de nada; la marca se asocia a explicar, no a vender; el archivo público es SEO y prueba de constancia.
- **Traducción**: **«La semana»**: cada domingo, cinco frases y un gráfico sobre lo que pasó en los mercados y «qué supondría para una cartera típica española» (la misma para todos, cumple la línea CNMV de «las mismas ideas para todos»), generado con GitHub Actions + Haiku (≈ 0,005 $ por resumen) a partir de las noticias que Toisón ya recoge, revisado por Carlos antes de publicar; visible en Hoy, en una página pública /la-semana y por correo opcional. Tono sobrio, sin «bad puns». Coste M (la tubería) + 15 min semanales de revisión. Semanal: sí, es la pieza semanal por definición. Riesgo: bajo si es general y sin «compra X»; el abogado debe ver la plantilla. Ya: parcial (Mercados y noticias con resumen de IA, sin formato semanal ni página pública).

---

## 11. Mercury — cabecera de cine

Fuente: análisis de diseño de Mercury https://blakecrosley.com/guides/design/mercury (sin fecha; © 2026). Son observaciones de un tercero sobre la web de marketing; la tipografía Arcadia no es pública, así que los valores son inferencias del autor.

### 11.1 Fotografía dirigida, no stock
- **Cómo funciona**: héroe «cinematográfico»: composición dramática, escenarios aspiracionales (una mesa en la ladera de una montaña), etalonaje con sombras frías y luces cálidas, viñeta sutil; texto sobre un degradado que llega al ~80 % de oscuridad para que se lea sin tapar la foto; el autor recomienda encargar fotografía propia en vez de licenciar stock de «gente con portátil».
- **Traducción**: la web de Toisón (ya hay un doc «web-toison») con **una sola foto propia** de verdad (Madrid, una mesa, una libreta, luz de tarde; sin bolsas ni gráficos verdes) y degradado para el texto. Coste S (la foto la hace Carlos con el móvil; el resto es CSS). Semanal: n/a (captación). Riesgo: ninguno. Ya: no.

### 11.2 Las cifras como tipografía de primera clase
- **Cómo funciona**: saldos a 28 px, peso 500, tracking −0,5 px, interlineado 1,0; etiqueta pequeña y apagada encima; titulares 45 px/peso 480; cuerpo con interlineado 1,625; paleta casi negra por capas (15,15,20 → 25,25,32 → 38,38,48), bordes blancos al 8 %, acento morado apagado (fuera de los azules y verdes de la banca), colores semánticos desaturados; transiciones de 0,2 s y un brillo en hover.
- **Traducción**: **estilo tipográfico propio para las cantidades** en Toisón: Inter con cifras tabulares (`font-variant-numeric: tabular-nums`), peso 500, tracking ligeramente negativo, etiqueta encima; bordes al 8 % de opacidad en el diseño oscuro; transiciones de 0,2 s en todos los botones. Coste S. Semanal: a diario. Riesgo: ninguno. Ya: parcial (Inter e Ibarra ya están; falta el sistema para números).

---

## 12. Lo que NO hay que copiar (lista corta para pegar en ESTADO.md)

Confeti, vítores o insignias tras una operación (ESMA, bullets tras párr. 106); «rasca y gana»; listas «trending / populares / top movers» del mercado como arquitectura de elección (párr. 112); avisos push de precio con llamada a actuar (párr. 118–119); rachas diarias de abrir la app (párr. 95); rankings o competiciones de rentabilidad entre usuarios (párr. 97 y 100; FCA 2024: las tablas de traders aumentan frecuencia y riesgo); compra de un toque; puntos por operar (≈ +40 % de operaciones, párr. 86); personajes que se enfadan; tonos «savage» por defecto.

---

## 13. Tabla final: las 25 mejores traducciones a Toisón

| # | Idea | De quién | Qué hace en Toisón | Coste | Semanal | Riesgo | Ya |
|---|------|----------|--------------------|-------|---------|--------|----|
| 1 | Regla «celebra el plan, no la operación» | ESMA 2023, Robinhood 2021 | Criterio escrito en el repo y en ESTADO.md; revisar Hoy, avisos, Ideas y Tu año contra él | S | a diario | lo reduce | no |
| 2 | Tres anillos mensuales | Apple Watch | Aportación hecha / dentro de límites / revisión hecha, en Tu mes; pausables | M | sí | bajo | parcial |
| 3 | Racha de meses cumpliendo el plan, con pausa y recuperación | Duolingo | Meses seguidos con aportación y dentro de límites; una pausa al año; recuperar antes del día 15 | S | mensual | bajo | no |
| 4 | «Meses sin vender» | Duolingo (invertido) | Contador discreto de paciencia en Hoy y Tu año | S | mensual | bajo | no |
| 5 | Tu año en Toisón (10 tarjetas, sin euros por defecto) | Spotify, Duolingo, Monzo | Estilo de inversor, aportaciones, edad del dinero, países, costes, dividendos, vs MSCI World, renta; tarjeta final compartible | L | anual | bajo | planeado |
| 6 | Estilo de inversor | Duolingo YiR | Arquetipo por conducta (constancia, rotación, diversificación) para que todos tengan tarjeta | M | anual | bajo | no |
| 7 | Edad de tu dinero invertido | YNAB | Antigüedad media ponderada de las posiciones; en Hoy, Análisis y Tu año | S | sí | ninguno | no |
| 8 | Widget de dos datos + modo discreto | Duolingo | Tu mes (hecho/pendiente) y una cifra elegible; por defecto el mes, no el día; promoción interna tras el Paso a paso | M | a diario | bajo | parcial |
| 9 | Avisos solo por hechos tuyos | Duolingo, Monzo | Aportación mañana, dividendo cobrado, TER cambiado, fuera de límites, cierre fiscal; nunca precio con CTA | S | sí | ninguno | parcial |
| 10 | Aviso cuando algo cambia sin tocarlo | Monzo bill tracker | Detectar cambios de TER, dividendo, split en los datos de GitHub Actions | M | ocasional | ninguno | no |
| 11 | Modo discreto global y «porcentajes, nunca euros» en lo compartible | Strava | Interruptor que oculta cantidades en app y widget; regla para tarjetas | S | a diario | ninguno | no |
| 12 | Picos del gráfico explicados | Revolut | Anotar saltos del patrimonio con su causa (aportación, dividendo, mercado, traspaso) | M | sí | ninguno | parcial |
| 13 | Tendencias 90 días vs 12 meses | Apple Fitness | Ritmo de aportación, costes, diversificación, con flecha y frase sobre tu plan | M | sí | bajo | no |
| 14 | Hitos sobrios y privados | Apple Watch | Primer año, 12 aportaciones, primera renta, primer 10.000 €; tarjeta tipográfica, sin confeti | S–M | no | bajo | no |
| 15 | La semana | Wealthsimple TLDR | Cinco frases y un gráfico cada domingo, igual para todos, revisado por Carlos; página pública y correo opcional | M | sí | bajo | parcial |
| 16 | Changelog público /novedades | Linear | Una captura por versión, fecha, «pedido por un usuario»; correo opcional | S | por versión | ninguno | parcial |
| 17 | Botón «Escríbeme» | Linear | Formulario o mailto en Ajustes; cerrar el círculo en el changelog | S | no | ninguno | no |
| 18 | Abrir con caché y esqueletos; barra fija | Linear | Últimos precios al instante, esqueletos en Análisis, medir con Lighthouse | S–M | a diario | ninguno | parcial |
| 19 | Ctrl/Cmd+K en la web | Linear | Ir a pantalla, buscar posición, preguntar a la IA, añadir movimiento | S–M | sí (web) | ninguno | no |
| 20 | Diccionario de cuatro colores + números tabulares | Copilot, Mercury, Linear | Verde/rojo solo variación, un acento para acción; `tabular-nums`, peso 500, etiqueta encima | M | a diario | ninguno | parcial |
| 21 | Odómetro en patrimonio y variación | Robinhood (lo bueno) | Dígitos que giran al refrescar; animación de dato, no celebración | S | a diario | ninguno | no |
| 22 | «Lo que más se mueve» solo sobre tus posiciones y con el porqué | ESMA párr. 112 | Nunca trending de mercado; cada línea con noticia y «qué supone», sin botón | S | a diario | lo reduce | parcial |
| 23 | Pendientes con posponer | Linear inbox | Aportación, dividendo por confirmar, fuera de límites, documento fiscal; «posponer una semana» | M | sí | bajo | parcial |
| 24 | Deshacer en movimientos + reglas de importación | Monarch | Deshacer edición/borrado; reglas por bróker para clasificar CSV/PDF | S + M | al importar | ninguno | no |
| 25 | Onboarding con elección de diseño y carnet de miembro | Arc | Primera pantalla elige Mármol/Marfil/Borgoña; termina con «Miembro n.º X desde…» compartible sin datos | S–M | no | ninguno | parcial |

Fuera de la tabla pero anotadas para 1.x: kudos a aportaciones en grupo privado de amigos (Strava, L, riesgo medio), cartera compartida en pareja (Monarch, L), retos de conducta (Strava, M), etiquetas de posiciones (Revolut, S–M), modo lectura en Análisis (Arc, S–M), progreso del mes en la navegación y tarjeta que se expande (Things, S), fotografía propia en la web (Mercury, S), «Las reglas de Toisón» (YNAB, S–M, revisar con el abogado), medir eventos con Firebase Analytics (Duolingo, S, RGPD).

---

## 14. Pendientes de verificar (sin cuota de búsqueda)
- Documento o comparecencia propia de la CNMV sobre gamificación (la nota del 9 oct 2026 no cargó).
- Explicación oficial de Monzo sobre por qué los avisos instantáneos reducen la ansiedad.
- Diseño de sonido de Arc y sonidos de Things 3.
- Que Public muestre las carteras ajenas solo en porcentajes.
- Formato exacto (número de tarjetas, vídeo) del Year in Sport individual de Strava 2025.
