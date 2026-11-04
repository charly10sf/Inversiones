# Backlog (impacto × diferenciación × esfuerzo)

Rehecho el 4 nov 2026 con el roadmap (https://claude.ai/artifact/V5ZM52iyxEDzMKZXBKatHX) y la investigación (claude/roadmap-investigacion.md en el Proyecto; los informes enteros en claude/investigacion/). Se revisa en la sesión de plan de cada versión. Lo que ya tiene versión está en claude/versiones/; aquí va lo que no la tiene, lo que se dejó fuera y las reglas.

Puntuación: impacto para el usuario (1–5), diferenciación en España (1–5), esfuerzo en sesiones (S una, M dos o tres, L cuatro a seis, XL más), coste al mes, riesgo legal, de quién depende.

## Sin versión fija, por orden de puntuación
| Idea | Imp. | Dif. | Esf. | Coste | Legal | Depende | Candidata | De dónde sale |
|---|---|---|---|---|---|---|---|---|
| Edad de tu dinero invertido (antigüedad media ponderada) | 3 | 4 | S | 0 | — | — | 0.8.6 (Tu año) | YNAB |
| Tendencias 90 días frente a 12 meses (ritmo de aportación, costes, diversificación) | 3 | 4 | M | 0 | bajo | — | 1.1.1 o 1.3 | Apple Fitness |
| Pendientes con «posponer una semana» | 2 | 3 | M | 0 | bajo | — | 1.2 | Linear |
| Ctrl/Cmd+K en la web | 2 | 2 | S–M | 0 | — | — | 1.2 si cabe | Linear |
| Rentabilidad separada: no realizada, realizada, dividendos, efecto divisa | 3 | 3 | M | 0 | — | — | 1.3 | Simply Wall St, Sharesight |
| Preguntas para tu asesor o tu banco (la IA prepara 5–8 sobre tu cartera) | 3 | 4 | S | 0,001 €/Pro | bajo | — | 1.3 | bloque 4 |
| Laboratorio en lenguaje natural («¿y si aporto 200 € más?» → parámetros del simulador) | 3 | 3 | S | 0 | bajo | — | 1.3 | bloque 4 |
| Dictar un movimiento («compré 3 Iberdrola a 12,40 el martes») | 2 | 3 | S | 0 | — | — | 1.3 | bloque 4 |
| Entrevista de perfil con la IA (rellena Tú sin proponer productos) | 3 | 3 | M | 0,02 €/una vez | bajo | — | 1.4 | bloque 4 |
| Solapamientos explicados por la IA (el X-Ray calcula) | 2 | 3 | S | 0 | — | — | 1.4 | bloque 4 |
| Snowflake o gráfico-resumen de los seis factores de cada ficha | 3 | 2 | M | 0 | — | — | 1.4 | Simply Wall St |
| Insignias de antigüedad de suscripción, «Miembro n.º X» | 2 | 2 | S | 0 | — | — | 1.4 | getquin, Arc |
| Importar reenviando el correo de confirmación del bróker | 3 | 3 | L | 0 | RGPD | correo propio | 1.5 o después | Sharesight |
| Acceso de un beneficiario tras inactividad («Life Beat») | 2 | 4 | M | 0 | medio | — | 2.0 | Kubera |
| Terminal de análisis como producto aparte | 2 | 1 | XL | datos | — | licencia | no, salvo que se pida | Parqet Terminal |
| Swing trading para fundadores con tope propio (lo pidió Josmi en oct) | 2 | 2 | L | 0 | alto en estándar | solo fundador | 1.5 si los amigos lo siguen pidiendo | amigos |
| Noticias enteras sin pagar (enlace real de Google Noticias y foto servida desde Toisón) | 3 | 1 | M | 0 | derechos de prensa | abogado | 1.4 | Carlos, 25 oct |
| Contenido para redes que se haga solo (mapa del día, resumen de la semana) | 2 | 2 | M | 0 | — | — | con La semana (1.2) | Carlos, 30 oct |
| Titularidad por posición (gananciales, pareja, herencia) con la renta por persona | 3 | 5 | M | 0 | bajo | — | 1.3 | Rankia, bloque 2 |
| Tendencias y hábitos que se recortaron del plan si falta tiempo: Tu año (0.8.6), picos explicados y alertas de fondos (1.1.1), hitos y cierre fiscal (1.2), XTB/Bitvavo/Portfolio Performance e inglés completo (1.0.x) | — | — | — | — | — | — | se recuperan en la siguiente intermedia | roadmap |
| Toisón como servidor MCP de solo lectura | 3 | 4 | L | 0 | medio | cifrado | 1.6 | Parqet, Finary, Rotki |
| Más diseños, atajos de teclado, módulos ES, CSS por secciones | 1 | 1 | M | 0 | — | — | cuando sobre tiempo | 0.6 |
| Comunidad pública con rankings; operar desde la app; day trading; precios objetivo por IA; anuncios; plan de por vida; servicio humano de renta | — | — | — | — | alto | — | NO (ver el roadmap, «Lo que no se va a hacer») | ESMA, CNMV, MAR |

## Visto y pendiente (técnico)
- Del 0.6: pasar a módulos ES poco a poco; partir el CSS por secciones; radar y escaneo más ligeros.
- Visto el 29 oct: cuando la IA cambia de modelo a mitad de respuesta, empieza de cero y repite las herramientas. Mirarlo al pasar la IA a Firebase Functions (0.9).
- Visto el 30 oct (0.7i): el resto de pestañas en un ordenador ancho (Análisis, Mercados) no se han mirado a 2.048 px. Candidata: una letra.
- De la revisión aparte de la 0.7d (leves): el primer aviso del código se pierde si se sale justo después de crear la cuenta; revisarKit deja de intentarlo a los 2,5 min con el tutorial abierto; pruebas de entrada corta, Escape en la IA y growia fallan a veces con toda la tanda a la vez.
- Pendiente de la auditoría del 4 nov: aria-modal de la IA al cambiar el tamaño de la ventana; código muerto (pavHacienda, PAV_LUEGO).
- TTL de fallos_ia: con Blaze (0.8.3), crear el TTL sobre «caduca» y quitar limpiarFallosIA.
- Del revisor del roadmap (4 nov): la AI Act pide alfabetización documentada (art. 4): una página «cómo usa Toisón la IA» (0.9); seguro de responsabilidad civil: preguntar al asesor (semana del 30 nov); registro de actividades de tratamiento (0.9, con el abogado).
- Decisiones de Carlos del 4 nov: 1.0 a principios de enero (lunes 11 ene); toison.es/app; opción B del fundador; no quiere su dirección pública (el asesor propone la alternativa). Pendiente: confirmar el precio (se queda 3,99/29,99) y las semanas de exámenes (mueven la 1.1).
- Las ramas pruebas-rapidas, v0.7q–v0.7v, v0.9, v0.9-noche y v0.8.1 ya están en main: se pueden borrar.

## Reglas
- Una idea nueva se apunta aquí con su puntuación, su por qué y su versión candidata; el backlog entero se revisa en la sesión de plan de cada gorda, no antes.
- Regla de diseño (ESMA 2023, Robinhood 2021): «celebra el plan, no la operación». Nada de confeti, «lo más comprado», avisos de precio con botón ni rankings de rentabilidad.
- Lo que toque cuentas, cifrado, Hacienda, pagos o el prompt público de la IA lleva revisión aparte antes de publicarse.
