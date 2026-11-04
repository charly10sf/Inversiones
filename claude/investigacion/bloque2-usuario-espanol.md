# Bloque 2 — El usuario español: qué le falta y qué pregunta una y otra vez

Investigación para el plan de Toisón (4 de noviembre de 2026). Cada dato lleva su fuente y la fecha de la página o del hilo. Donde no he podido comprobar algo lo digo.

**Límites de esta investigación.** Forocoches, Bogleheads.es y Reddit (r/SpainFIRE, r/eupersonalfinance) no se pueden leer desde aquí (bloqueo del sitio o error al cargar): de ellos solo tengo los títulos de los hilos que devolvió el buscador, no su contenido. El manual de Renta 2025 de la AEAT cargó una vez (compensación de pérdidas) y después dio error de servidor; la regla de los dos meses y el modelo 720 los cito por la ley (artículos de la LIRPF y del Reglamento de Gestión) a través de guías que los reproducen, no por el manual. La cuota de búsquedas web se agotó antes de poder revisar Selfbank, Openbank y Bankinter: en esos tres no tengo datos propios. Lo que sí he leído a fondo: unos 35 hilos de Rankia (2013–2026), Finect, OCU, guías de 2026 (guiafiscal.es, helpmycash, Xataka), las páginas de ayuda de los competidores españoles (micartera, bolsarex, filios, inveriok, donkycapital) y el Consejo para la Defensa del Contribuyente.

---

## 0. Marco fiscal vigente para la renta 2026 (lo que Toisón tiene que tener bien)

| Regla | Valor vigente (ejercicio 2026) | Norma | Fuente comprobada |
|---|---|---|---|
| Tramos de la base del ahorro | 19 % hasta 6.000 €; 21 % de 6.000 a 50.000; 23 % de 50.000 a 200.000; 27 % de 200.000 a 300.000; **30 % desde 300.000** | Art. 66 y 76 LIRPF; el 30 % lo introdujo la Ley 7/2024 (desde el ejercicio 2025) | [guiafiscal.es, actualizado 1 nov 2026](https://guiafiscal.es/irpf/tramos-irpf-2026/); [helpmycash, 23 oct 2026](https://www.helpmycash.com/invertir/como-tributan-las-inversiones-guia-facil/) |
| Compensación entre bloques del ahorro | Rendimientos del capital mobiliario y ganancias/pérdidas se integran por separado; el saldo negativo de uno compensa hasta el **25 %** del positivo del otro; el resto se arrastra **4 años**; las pérdidas pendientes se compensan obligatoriamente en la cuantía máxima cada año | Art. 49 LIRPF | [Manual Renta 2025 AEAT, 8.1.4](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-ayuda-presentacion/irpf-2025/8-cumplimentacion-irpf/8_1-base-imponible-general-base-ahorro/8_1_4-compensaciones-partidas-negativas-base-ahorro.html); [guiafiscal calculadora 2026](https://guiafiscal.es/calculadoras/compensacion-perdidas-irpf/) |
| Regla de recompra («dos meses») | La pérdida no se computa si se compran valores homogéneos en los **2 meses** anteriores o posteriores (valores cotizados en mercado oficial); **1 año** para el resto (no cotizados en esos mercados) | Art. 33.5 f) y g) LIRPF | [guiafiscal calculadora](https://guiafiscal.es/calculadoras/compensacion-perdidas-irpf/); [Rankia 6798163, abr 2025–may 2026](https://www.rankia.com/foros/fiscalidad/temas/6798163-norma-antiaplicacion-regla-dos-meses) |
| Traspaso de fondos | No tributa; las nuevas participaciones conservan valor y fecha de adquisición de las antiguas; **los ETF quedan fuera** del régimen (tributan como acciones) | Art. 94.1.a y 94.2.a.3º LIRPF | [guiafiscal calculadora (cita los artículos)](https://guiafiscal.es/calculadoras/compensacion-perdidas-irpf/); [helpmycash 23 oct 2026](https://www.helpmycash.com/invertir/como-tributan-las-inversiones-guia-facil/) |
| Planes de pensiones | 1.500 € individuales (o el 30 % de rendimientos del trabajo y actividades si es menor); +8.500 € en planes de empleo (empresa y trabajador); +4.250 € para autónomos en planes de empleo simplificados (tope conjunto 8.500 con el anterior); +1.000 € al cónyuge con rentas < 8.000 €; exceso sobre el 30 %/base se arrastra 5 años; **sin cambios en 2026** | Art. 51 y 52 LIRPF (redacción Ley 31/2022); RD 304/2004 art. 6.3 | [guiafiscal.es, 24 oct 2026](https://guiafiscal.es/irpf/plan-de-pensiones-limite-aportacion/) |
| Modelo 720 | Bienes en el extranjero > **50.000 €** por bloque (cuentas; valores/seguros/rentas; inmuebles) a 31 de diciembre; se repite solo si un bloque sube > **20.000 €** o se cancela algo declarado; plazo 1 enero–31 marzo; desde la Ley 5/2022 ya no tiene régimen sancionador propio | Art. 42 bis, 42 ter y 54 bis RGAT | [Rankia blog IBKR, actualizado 26 oct 2026](https://www.rankia.com/blog/irpf-declaracion-renta/5834848-como-incluir-declaracion-renta-cartera-interactive-brokers); [Finect 24 feb 2026 sobre DGT V2475-25](https://www.finect.com/usuario/eduardogarcia/articulos/adios-al-modelo-720-para-muchos-usuarios-de-trade-republic-hacienda-fija-los-criterios-oficiales) |
| Modelo 721 (cripto) | Monedas en custodios **no residentes** > **50.000 €** en conjunto a 31 de diciembre; se repite si sube > 20.000 €; 1 enero–31 marzo; la autocustodia queda fuera (DGT V2290-23); exchanges con establecimiento en España informan ellos (172/173) | Art. 42 quater RGAT | [guiafiscal.es, 2 jul 2026](https://guiafiscal.es/irpf/modelo-721-paso-a-paso/); [cointracking, 5 mar 2026](https://cointracking.info/es/guia-fiscal/spain/modelo-721) |

Novedad a vigilar: el Consejo para la Defensa del Contribuyente aprobó el 22 de julio de 2026 la **Propuesta 2/2026** sobre «disfunciones en la integración y compensación de ganancias y pérdidas» (el límite de 4 años y el 25 % dejan pérdidas sin compensar). Es una propuesta, no una norma aprobada ([PDF del Ministerio](https://www.hacienda.gob.es/sgt/gabsehacienda/cdc/propuestas%20e%20informes/propuesta-2-2026-disfunciones-en-la-integracion-y-compensacion-de-ganancias-y-perdidas-patrimoniales.pdf)). Si cambiara la ley en 2027, Toisón tendría que actualizar el motor de compensación.

---

## 1. Traspasos de fondos sin tributar y el coste fiscal arrastrado

**Qué es y cómo funciona.** El traspaso entre fondos (y entre comercializadoras del mismo fondo) no tributa; las participaciones nuevas heredan el valor y la fecha de compra de las antiguas (art. 94 LIRPF). Se aplica FIFO sobre las participaciones del mismo fondo. Los ETF no entran en el régimen desde la Ley 11/2021 y tributan como acciones. Un traspaso entre fondos en divisas distintas tampoco tributa por el cambio de moneda ([Finect, pregunta 4427, hace ~1 año](https://www.finect.com/preguntas/4427/traspasar-un-fondo-de-inversion-nominado-en-divisa-x-a-otro-fondo-nominado-en-divisa-diferente-tributa-en-espana-por-la-venta-de-interna-de-divisas)). La entidad que tiene los datos fiscales es la comercializadora, no la gestora; con cuentas ómnibus la gestora ni siquiera sabe quién es el partícipe.

**Qué preguntan una y otra vez.**
- «Tengo el mismo fondo en dos comercializadoras; si traspaso una parte, ¿el FIFO va por bróker o por todo lo que tengo?» Sin respuesta cerrada en el hilo: unos dicen que la gestora lo sabe, otros que cada comercializadora solo ve lo suyo y que al final es el partícipe quien tiene que llevar el FIFO. [Rankia 4706674, 19–22 ago 2020](https://www.rankia.com/foros/fondos-inversion/temas/4706674-fifo-traspaso-fondo-dos-comercializadoras?page=1).
- «¿Cuánto tarda un traspaso externo y qué camino es más rápido (directo, por monetario, cambio de comercializador)?» ~8 días hábiles según la CNMV para traspaso directo; el cambio de comercializador «tarda lo que quiera»; CaixaBank cobra custodia (0,70–1,09 % + IVA) a quien no tenga el 55 % en producto propio. [Rankia 6557895, 14 oct 2024 → 23 may 2026](https://www.rankia.com/foros/fondos-inversion/temas/6557895-traspaso-fondos-externos).
- «¿Cómo apunto un traspaso en mi Excel / en Portfolio Performance para que no cuente como venta y la plusvalía siga siendo la de origen?» Hilos de Bogleheads.es solo por título (no se pudo leer el contenido): [«Herramienta para seguimiento de cartera que permita traspasos» (t=1497)](https://bogleheads.es/foro/viewtopic.php?t=1497), [«Dudas fiscalidad traspasos y apuntes contables en el excel» (t=1054)](https://bogleheads.es/foro/viewtopic.php?t=1054), [«Duda contabilización traspasos de cara a plusvalías» (t=512)](https://bogleheads.es/foro/viewtopic.php?t=512), [«Plantilla seguimiento fondos», más de 20 páginas (t=85)](https://bogleheads.es/foro/viewtopic.php?t=85&start=380).
- «Vendo con pérdidas y recompro el mismo fondo: ¿los dos meses se esquivan pasando por un monetario?» Pasar por otro fondo distinto no activa la regla; recomprar el mismo ISIN sí. [Rankia 6557895](https://www.rankia.com/foros/fondos-inversion/temas/6557895-traspaso-fondos-externos).

**Herramienta que usan hoy.** Excel propio (la plantilla de Bogleheads.es es la referencia), Portfolio Performance (no tiene «traspaso» nativo: se registra como venta+compra con el coste de origen, y de ahí las dudas), la posición de la propia comercializadora (sin plusvalía fiscal consolidada), y desde 2026 importadores como Bolsarex que piden «el fichero con las dos patas del traspaso» ([bolsarex, 24 oct 2026](https://bolsarex.app/guias/exportar-movimientos-myinvestor/)).

**Qué podría hacer Toisón.**
- Un movimiento «Traspaso» de primera clase (origen, destino, participaciones, fecha) que **arrastre lotes FIFO con fecha y coste de origen** y muestre en cada posición el «coste fiscal» frente al «coste de compra». Ya tiene traspasos en Hacienda; falta enseñarlo por lote y en la posición.
- Detectar el traspaso al importar (dos operaciones del mismo importe en fechas próximas, una «reembolso por traspaso» y otra «suscripción por traspaso»).
- Avisar cuando un ETF se marca como traspaso (no se puede) y cuando un fondo está en dos brókers (el FIFO es global; enseñar qué lote saldría).
- Simulador «si traspaso X al fondo Y» → sin impuesto, pero coste fiscal arrastrado de Z y antigüedad W.

---

## 2. Compensación de pérdidas y ganancias (4 años, el 25 % entre bloques)

**Norma vigente.** Ver cuadro del apartado 0. Detalles del Manual 2025 que importan para el cálculo: las pérdidas pendientes de 2021–2024 se compensan primero contra el saldo positivo de su mismo bloque; el cruce con el otro bloque se limita al 25 % **del saldo positivo**, y ese 25 % lo comparten las pérdidas del año y las arrastradas; la casilla 0460 abre una ventana con los saldos pendientes de los 4 años siguientes ([AEAT, Manual 2025, 8.1.4](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-ayuda-presentacion/irpf-2025/8-cumplimentacion-irpf/8_1-base-imponible-general-base-ahorro/8_1_4-compensaciones-partidas-negativas-base-ahorro.html)). Las pérdidas en la base general (p. ej. un crédito incobrable) no cruzan a la del ahorro, de ahí la Propuesta 2/2026 del CDC.

**Qué preguntan.**
- «¿Puedo compensar los dividendos con las pérdidas de acciones?» (sí, hasta el 25 %) y «¿cuánto me queda pendiente de hace 3 años y dónde lo veo?» ([Finect, pregunta 1223](https://www.finect.com/preguntas/1223/limites-a-la-compensacion-de-rentas-en-la-base-imponible-del-ahorro); [Finect, Josetrecet, Renta 2025-2026](https://www.finect.com/usuario/Josetrecet/articulos/compensar-perdidas-ganancias-declaracion-renta-que-puedes-que)).
- «Vendo en diciembre con pérdidas para compensar, ¿qué pasa si recompro en enero?» (la regla de los dos meses no se corta a 31 de diciembre; mirar extractos hasta el 28 de febrero y en todos los brókers) — [Rankia 6798163, Invertdiv 11 may 2026](https://www.rankia.com/foros/fiscalidad/temas/6798163-norma-antiaplicacion-regla-dos-meses).
- «Un bróker me da ganancias y otro pérdidas, ¿se netean?» (sí, el contribuyente es uno, pero el borrador solo trae lo que informan las entidades españolas).
- Las ventas de Trade Republic 2025 aparecieron en el borrador en la casilla 0031 (capital mobiliario) en vez de 0332/0337 (ganancias), lo que **cambia las reglas de compensación** del usuario sin que lo sepa ([Finect, 29–30 abr 2026](https://www.finect.com/usuario/avillanuevae/articulos/un-error-de-trade-republic-descuadra-miles-de-borradores-de-la-renta-2025-como-solucionarlo-paso-a-paso)).

**Herramienta que usan hoy.** El propio Renta Web (ventana de la 0460), la calculadora de guiafiscal.es, Excel. Nadie lleva «el saldo pendiente por año de origen» de forma continua; se descubre en abril.

**Qué podría hacer Toisón.**
- Ya calcula compensaciones. Falta el **registro de pérdidas pendientes por año de origen** (2022, 2023, 2024, 2025) que el usuario mete una vez desde su última renta (casilla 0460) y que caduque solo.
- Aviso en noviembre–diciembre: «tienes X de pérdidas que caducan este año y Y de ganancias latentes; realizar Z las aprovecharía» (en modo público, formulado como «lo que supondría»).
- Mostrar el 25 % como barra: cuánto de los dividendos ya está cubierto por pérdidas y cuánto queda.

---

## 3. Regla de los dos meses (valores homogéneos)

**Norma vigente.** Art. 33.5 f) (2 meses, valores cotizados en mercados oficiales de la UE/MiFID) y g) (1 año, resto). La pérdida se declara pero se marca como «no computable» y se integra cuando se vendan los valores recomprados; en Renta Web cada operación afectada se marca con una casilla ([Rankia 6798163, Invertdiv 6 may 2026](https://www.rankia.com/foros/fiscalidad/temas/6798163-norma-antiaplicacion-regla-dos-meses)). «Homogéneo» es la misma empresa (acciones) o el mismo ISIN (fondos); cambiar de bróker no rompe la homogeneidad ([misma fuente, mivisa 15 abr 2025](https://www.rankia.com/foros/fiscalidad/temas/6798163-norma-antiaplicacion-regla-dos-meses)). En gananciales, la cuenta individual de un cónyuge y la conjunta cuentan como el mismo titular real ([Rankia 4732572, 22–23 sep 2020](https://www.rankia.com/foros/fiscalidad/temas/4732572-valores-homogeneos)).

**Qué preguntan (es el hilo fiscal más largo de Rankia).** [«Regla de los dos meses - minusvalías»](https://www.rankia.com/foros/fiscalidad/temas/1999230-regla-dos-meses-minusvalias?page=1): abierto el **18 oct 2013**, **107 páginas y 840 respuestas**, con mensajes aún en mayo–junio de 2025. Las dudas de la página 96 ([13 may–24 jun 2025](https://www.rankia.com/foros/fiscalidad/temas/1999230-regla-dos-meses-minusvalias?page=96)) son las mismas de 2013:
- «Compré en días seguidos y vendí todo con pérdidas: ¿las compras previas cuentan como recompra?» (Chemas, 24 jun 2025; Hacienda le dijo por teléfono que «no son imputables»).
- «Vendí con pérdidas, recompré a la semana y vendí con menos ganancia: ¿puedo compensar?» (goyoaor, 19 jun 2025).
- «Vendí las últimas 100 con ganancias dos meses después de las pérdidas de enero: ¿ya puedo compensar?» (Albertus1970, 13 may 2025).
- ¿Se aplica a cripto? (sin respuesta en el hilo) y ¿a quien hace trading del mismo ISIN? (sí, a casi todas las pérdidas) — [Rankia 6798163](https://www.rankia.com/foros/fiscalidad/temas/6798163-norma-antiaplicacion-regla-dos-meses).
- Con IBKR, si el usuario cambió el método de lotes en Tax Optimizer, lo que ve no es FIFO ni lo que exige Hacienda; para valores solo cotizados fuera de la UE la ventana es de un año ([Rankia blog IBKR, 26 oct 2026](https://www.rankia.com/blog/irpf-declaracion-renta/5834848-como-incluir-declaracion-renta-cartera-interactive-brokers)).

**Herramienta que usan hoy.** Ninguna que avise antes. Excel a mano; en 2026 aparecen calculadoras que aplican «FIFO + regla de los 2 meses» sobre el fichero del bróker: micartera.app (TR, DEGIRO, Trading 212, IBKR; casillas 0328, 0424/0425, 0029) y bolsarex.app (iOS, calculadora gratis sin registro) ([micartera, 22 abr 2026](https://micartera.app/blog/informe-fiscal-trade-republic-2025-interpretar); [bolsarex, 24 oct 2026](https://bolsarex.app/guias/exportar-movimientos-myinvestor/)).

**Qué podría hacer Toisón.**
- Aviso **antes de operar**: al registrar una venta con pérdida, marcar en rojo cualquier compra del mismo ISIN/empresa en los 60 días anteriores y mantener el aviso 60 días después (incluido el cambio de año y todos los brókers de la cartera, y las cuentas de los dos cónyuges si están en la misma cartera).
- Diferenciar 2 meses / 1 año según el mercado del valor (Toisón tiene el catálogo de ~840 empresas: añadir «cotiza en mercado UE/oficial sí/no»).
- En el informe: la pérdida «declarada pero no computable» con el lote al que se suma, y la casilla que hay que marcar en Renta Web.

---

## 4. Dividendos con retención en origen y doble imposición

**Norma vigente.** El dividendo se declara íntegro en la casilla 0029; la retención extranjera va a la **deducción por doble imposición internacional (casilla 0588)**, que es la menor de (a) lo pagado fuera hasta el tope del convenio (normalmente 15 %) y (b) lo que ese dividendo paga en España al tipo medio del ahorro. Lo que exceda del convenio **no lo devuelve España**: hay que pedirlo al país de origen. Renta Web **no rellena la 0588 sola** ([OCU, 7 may 2025](https://www.ocu.org/inversiones/fiscalidad-y-derechos/impuestos/analisis/2025/05/como-declarar-los-dividendos-de-acciones-extranjeras); [allinvestview, 2026](https://www.allinvestview.com/es/calculadora-doble-imposicion-dividendos/)). La retención española del 19 % del bróker va a la 0597 ([Rankia blog IBKR](https://www.rankia.com/blog/irpf-declaracion-renta/5834848-como-incluir-declaracion-renta-cartera-interactive-brokers)).

| País | Retención interna | Tope convenio | Cómo se recupera el exceso | Fuente |
|---|---|---|---|---|
| EE. UU. | 30 %; **15 % con W-8BEN** | 15 % | El bróker corrige o 1040-NR; guardar el 1042-S | [allinvestview](https://www.allinvestview.com/es/calculadora-doble-imposicion-dividendos/) |
| Alemania | **26,375 %** (25 % + 5,5 % de recargo) | 15 % | Portal BOP del BZSt (§50c EStG), certificado de residencia por año y por dividendo; desde 2023 hay que registrarse; **el BZSt tarda ~18 meses**; plazo 4 años | [Rankia 4624201, jun–ago 2024](https://www.rankia.com/foros/bolsa/temas/4624201-como-recuperar-retenciones-dividendos-empresas-alemanas?page=5) |
| Francia | 12,8 % si el pagador sabe que eres no residente; 25–30 % si no | 15 % | Si retienen 12,8 % se recupera todo en la 0588; si no, formularios 5000/5001 | [OCU, 14 feb 2022](https://www.ocu.org/inversiones/fiscalidad-y-derechos/impuestos/analisis/2022/02/dividendos-acciones-francesas-retenciones-y-pagos); [Rankia 6961393, 26 ago–12 sep 2025](https://www.rankia.com/foros/bolsa/temas/6961393-trade-republic-retencion-origen-francia) |
| Suiza | **35 %** | 15 % | Formulario 90 a la Administración Federal por correo, con la liquidación del banco; varios meses; 3 años de plazo | [ibani, 19 oct 2026](https://www.ibani.com/es/guias/impuesto-anticipado-35-reembolso-no-residentes) |
| Países Bajos | 15 % | 15 % | Nada que recuperar | [allinvestview](https://www.allinvestview.com/es/calculadora-doble-imposicion-dividendos/) |
| Reino Unido | 0 % | 10 % | Nada (REIT aparte) | [allinvestview](https://www.allinvestview.com/es/calculadora-doble-imposicion-dividendos/) |
| Italia / Portugal / Bélgica / Suecia / Austria | 26 / 28 / 30 / 30 / 27,5 % | 15 % | Solicitud en cada país (Modello A; Mod. 22-RFI; 276 Div.; SKV 3740; DIAG) | [allinvestview](https://www.allinvestview.com/es/calculadora-doble-imposicion-dividendos/) |
| Irlanda (ETF domiciliados) | El ETF no retiene al partícipe; el W-8BEN no aplica a ETF | — | — | — |

**Qué preguntan.**
- «Cobré dividendos de una farmacéutica de EE. UU. con 15 % de retención y la retención no sale en mis datos fiscales, ¿la pongo en la 588?» ([Rankia 6815879, 1 may 2025](https://www.rankia.com/foros/fiscalidad/temas/6815879-deduccion-por-doble-imposicion-dividendos)).
- «¿Qué retención aplica Trade Republic a los dividendos franceses?» (a uno le retuvieron 12,8 % sin registrar nada; otro teme el 25 %) ([Rankia 6961393, ago–sep 2025](https://www.rankia.com/foros/bolsa/temas/6961393-trade-republic-retencion-origen-francia)).
- «¿Cómo recupero el 11,375 % alemán y merece la pena?» (hilo de 14 páginas, 2021–2024) ([Rankia 4624201](https://www.rankia.com/foros/bolsa/temas/4624201-como-recuperar-retenciones-dividendos-empresas-alemanas?page=5)).
- «BMW me retuvo 270 € en Alemania y mi banco 143 € más: ¿qué pongo en la casilla?» (sin respuestas desde 2017) ([Rankia 3553358, 28 abr 2017](https://www.rankia.com/foros/fiscalidad/temas/3553358-dividendos-retencion-origen-alemania)).
- «Con IBKR no me retienen el 19 % español, ¿hago algo?» y «los intereses irlandeses me los retienen al 20 % salvo que mande el formulario 8-3-6 sellado por Hacienda» ([Rankia blog IBKR, 26 oct 2026](https://www.rankia.com/blog/irpf-declaracion-renta/5834848-como-incluir-declaracion-renta-cartera-interactive-brokers)).
- «Trade Republic no me aplica la 588: en alemanas me retienen 26,375 % y en España solo me deducen 15 %» ([micartera, 22 abr 2026](https://micartera.app/blog/informe-fiscal-trade-republic-2025-interpretar)).

**Herramienta que usan hoy.** La calculadora de allinvestview, Excel, el informe fiscal del bróker (que trae la retención en origen pero no la deducción), y para recuperar el exceso: el portal del BZSt a mano o el bróker (DEGIRO/IBKR cobran por tramitarlo; en los hilos casi nadie lo hace salvo cantidades grandes).

**Qué podría hacer Toisón.**
- En la pestaña Dividendos, por dividendo: bruto, retención origen, **parte deducible en la 0588 (hasta el 15 %)**, **exceso no recuperable en España** y país al que reclamarlo, con el nombre del formulario. Suma anual «te están quitando X € al año que solo recuperas pidiéndolos a Alemania».
- Aviso de W-8BEN: si una posición de EE. UU. retiene 30 %, decir «tu bróker no tiene tu W-8BEN».
- Explicar con una cifra por qué una acción alemana o suiza rinde menos neto que una holandesa o británica («coste fiscal del país» en la ficha del radar: solo información, sin recomendar).

---

## 5. Modelos 720 y 721

**Norma vigente.** Cuadro del apartado 0. Lo nuevo de 2025–2026 es la **consulta vinculante DGT V2475-25 (12 dic 2025)**: la cuenta de efectivo de Trade Republic migrada a IBAN español se gestiona desde la sucursal española y **ya no es cuenta en el extranjero**; la sucursal es la obligada a informar. La consulta solo habla de la cuenta de efectivo; la cuenta de valores (custodia en Alemania) no tiene pronunciamiento ([Finect, 24 feb 2026](https://www.finect.com/usuario/eduardogarcia/articulos/adios-al-modelo-720-para-muchos-usuarios-de-trade-republic-hacienda-fija-los-criterios-oficiales); [Rankia, artículo actualizado 6 oct 2026](https://www.rankia.com/blog/cuentas-corrientes/6780762-declarar-intereses-trade-republic)). Revolut tiene IBAN español desde 2024 y, según Finect, su cuenta ya no va al 720 ([Finect, actualizado 16 sep 2026](https://www.finect.com/usuario/avillanuevae/articulos/tienes-una-cuenta-con-revolut-como-declararla-en-la-renta-2024-2025)). DEGIRO (flatexDEGIRO Bank SE, Alemania), IBKR (Irlanda), Scalable, Trading 212 y los depósitos vía Raisin siguen en el 720.

**Qué preguntan (el hilo «Rellenando el Modelo 720» tiene 568 páginas).**
- «¿Hay que incluir los valores de TR en el 720 o ya no?» El 26–27 feb 2026 en el hilo de TR hay quien afirma que «ya no hace falta ni para cuenta ni para valores» y quien lo llama «publicidad engañosa con un tema fiscal»; debaten si el 196/189 de la sucursal sustituye al 720 y si los ETF en XTB (sucursal española) cuentan ([Rankia 5135420, pág. 301](https://www.rankia.com/foros/bolsa/temas/5135420-seguimiento-opiniones-trade-republic?page=301)).
- «El IBAN de TR es virtual y el dinero está en una cuenta colectiva de un banco alemán: ¿es extranjero?» ([Rankia depósitos 5470352, pág. 2805, 27 ago 2025](https://www.rankia.com/foros/depositos/temas/5470352-tabla-depositos-monillo?page=2805)).
- «¿En qué país está depositado un ETF irlandés comprado en IBKR: el del bróker o el del custodio?», «¿el margen no usado de DEGIRO cuenta?», «¿cuántos IBAN genera Revolut, uno por divisa?» ([Rankia 2602508, pág. 74, ago–nov 2019](https://www.rankia.com/foros/depositos/temas/2602508-rellenando-modelo-720?page=74)).
- «Ya presenté el 720; he subido 20.000 €, ¿lo repito?» y «cerré la cuenta, ¿tengo que declararlo?» (comentarios al artículo de Rankia sobre TR, 2026).
- 721: «¿Bitvavo/Binance/Coinbase/Kraken son españoles o extranjeros?» Las guías remiten a preguntar al exchange ([cointracking, 5 mar 2026](https://cointracking.info/es/guia-fiscal/spain/modelo-721)); el fiat en un exchange no es cripto y podría ir al 720.

**Herramienta que usan hoy.** El formulario de la AEAT a mano, Excel con el valor a 31/12 de cada bróker, el informe fiscal de TR (que trae datos del 720), guías como autodeclaro.

**Qué podría hacer Toisón.** Ya tiene 720/721. Mejoras concretas:
- Tabla de **entidades y su situación 720** (TR efectivo: no; TR valores: sin criterio, por defecto sí; Revolut efectivo: no; DEGIRO, IBKR, Scalable, T212, Raisin: sí; Bitvavo: pregunta al exchange) con la fuente y la fecha, y que el usuario lo pueda cambiar.
- Valor a 31 de diciembre por bloque y bróker, el umbral de 50.000 y el de +20.000 respecto a la última presentación, y el aviso en enero.
- Borrador del 720 por registro (clave de bien, país, saldo 31/12, saldo medio del 4.º trimestre para cuentas) exportable; no presentarlo, solo prepararlo.

---

## 6. Planes de pensiones, PIAS, SIALP y EPSV

**Norma vigente 2026.**

| Producto | Límite anual | Fiscalidad | Fuente |
|---|---|---|---|
| Plan de pensiones / PPA individual | 1.500 € (o 30 % de rendimientos del trabajo y actividades) | Reduce la base general; rescate como rendimiento del trabajo; aportaciones con más de 10 años rescatables desde 2025; traspasos entre planes sin impuesto | [guiafiscal, 24 oct 2026](https://guiafiscal.es/irpf/plan-de-pensiones-limite-aportacion/); [helpmycash, 23 oct 2026](https://www.helpmycash.com/invertir/como-tributan-las-inversiones-guia-facil/) |
| Plan de empleo (empresa + trabajador) | +8.500 € | Igual | [guiafiscal](https://guiafiscal.es/irpf/plan-de-pensiones-limite-aportacion/) |
| Plan de empleo simplificado de autónomos | +4.250 € (tope conjunto 8.500 con el anterior) | Igual | [guiafiscal](https://guiafiscal.es/irpf/plan-de-pensiones-limite-aportacion/) |
| PIAS | 8.000 €/año, 240.000 € en total; mínimo 5 años | Rendimiento exento solo si se cobra como renta vitalicia; de la renta tributa el 40/35/28/24/20/8 % según la edad (menos de 40 → 70 o más); costes de hasta el 2,25 % | [OCU, 1 jul 2026](https://www.ocu.org/inversiones/ahorrar/depositos-y-seguros/articulos/2026/07/pias-merecen-la-pena-ventajas-fiscales-rentabilidad-y-alternativas); [helpmycash](https://www.helpmycash.com/invertir/como-tributan-las-inversiones-guia-facil/) |
| SIALP / CIALP | 5.000 €/año; mínimo 5 años | Rendimiento exento si se cumple el plazo; no reduce la base | [life5, rev. abr 2026](https://life5.es/blog/fiscalidad/sialp-ppa-pias-diferencias/) |
| EPSV (solo residentes en Euskadi) | 5.000 € individual; 8.000 € empleo; 4.000 € autónomos; **tope conjunto 10.000 €** (antes 12.000) | Reforma por Normas Forales de 2025 (Álava 3/2025, Gipuzkoa 1/2025, Bizkaia 2/2025) en vigor desde el **1 ene 2026**: el rescate en capital integra el 70 % (exención del 30 %, antes 40 %), con opción de mantener el régimen anterior para aportaciones previas a 2026; deducción en cuota del 15 % para menores de 36 en planes de empleo; liquidez a los 10 años | [Inverco, ago 2025](https://www.inverco.es/wp-content/uploads/2025/08/AP.1-Aprobacion-de-la-reforma-fiscal-de-la-prevision-social-complementaria-en-los-territorios-forales-de-Alava-Guipuzcoa-y-Vizcaya.pdf); [carlosgalan.net, 29 ene 2026](https://carlosgalan.net/epsv-indexa-capital/) |

**Qué preguntan.** «¿Cuánto me ahorro en la renta si aporto 1.500 €?» (depende del tipo marginal, nadie se lo calcula con su nómina); «¿Qué diferencia hay entre EPSV y plan de pensiones?» ([Rankia blog 2326715](https://www.rankia.com/blog/planes-de-pensiones/2326715-cuales-son-principales-diferencias-plan-pensiones-epsv); [Finect 218](https://www.finect.com/preguntas/218/diferencia-entre-epsv-y-plan-de-pensiones)); «¿Merece la pena un PIAS?» (OCU: no siempre, por costes); «Soy autónomo, ¿puedo meter 5.750 €?» (1.500 + 4.250, sí); «¿cómo rescato sin que me cruja Hacienda?» (rescate en varios años, el 40 % de reducción para aportaciones anteriores a 2007 con plazos).

**Herramienta que usan hoy.** El simulador del banco/gestora (Indexa, MyInvestor, Bankinter), Excel, la web de la gestora para el valor; ningún tracker de los Bogleheads lleva planes junto a los fondos porque no se pueden vender ni traspasar a fondos.

**Qué podría hacer Toisón (no tiene planes de pensiones).**
- Posición «Plan de pensiones / EPSV / PPA / PIAS / SIALP» con aportaciones del año y **ahorro fiscal estimado** con el tipo marginal del usuario (ya tiene perfil y, si se añade, el sueldo). Contador «te quedan X € hasta el límite» en noviembre.
- Patrimonio total con y sin planes (son ilíquidos hasta jubilación o 10 años).
- Simulador de rescate: capital vs renta, impacto en la base general del año. En modo público, solo «lo que supondría».
- Para Euskadi y Navarra, régimen foral propio (tramos, límites, EPSV): hoy Toisón no lo distingue; es un bloque de trabajo aparte.

---

## 7. Letras del Tesoro, depósitos y cuentas remuneradas

**Norma vigente.** Intereses de cuentas y depósitos: rendimiento del capital mobiliario, casilla 0027, retención del 19 % si la entidad opera en España. Letras del Tesoro: rendimiento implícito (diferencia entre compra y amortización), **sin retención**, se declara en la renta del año de la amortización o venta (casilla 0027 / históricamente «casilla 30» de Letras); si se venden antes del vencimiento, es una transmisión, también rendimiento del capital mobiliario, no ganancia patrimonial. Bonos y obligaciones: el cupón lleva retención ([helpmycash, 23 oct 2026](https://www.helpmycash.com/invertir/como-tributan-las-inversiones-guia-facil/); [Xataka, 30 mar 2026](https://www.xataka.com/basics/letras-tesoro-renta-2025-como-tributan-cuanta-retencion-tienen-tu-declaracion-2026); [Finect, 12 dic 2023](https://www.finect.com/usuario/eduardogarcia/articulos/letras-del-tesoro-como-tributan-en-la-declaracion-de-la-renta)). Trade Republic retiene el 19 % desde el pago del **1 de julio de 2025** y los intereses anteriores (IBAN alemán) hay que sumarlos a mano ([Rankia 6780762](https://www.rankia.com/blog/cuentas-corrientes/6780762-declarar-intereses-trade-republic)). Depósitos extranjeros vía Raisin: sin retención española, con la retención del país (va a la 0588 como los dividendos). Revolut: 19 % en la cuenta remunerada; las «cuentas flexibles» son fondos monetarios, no se informan a Hacienda y hay que declararlas a mano al vender ([Finect, 16 sep 2026](https://www.finect.com/usuario/avillanuevae/articulos/tienes-una-cuenta-con-revolut-como-declararla-en-la-renta-2024-2025)).

**Qué preguntan.**
- «¿El interés que me pagaron el 1 de enero va a la renta de 2024 o de 2025?» y «TR no me da certificado de intereses, solo extracto: ¿vale?» (comentarios a [Rankia 6780762](https://www.rankia.com/blog/cuentas-corrientes/6780762-declarar-intereses-trade-republic), 2025–2026).
- «En un depósito de DB me avisaron de que con más de 50K tendría que hacer el 720» ([Rankia depósitos, 27 ago 2025](https://www.rankia.com/foros/depositos/temas/5470352-tabla-depositos-monillo?page=2805)); el hilo «Tabla depósitos» tiene más de 2.800 páginas: la gente mueve depósitos cada pocos meses y los sigue en una tabla compartida.
- «¿Las Letras salen en el borrador?» (sí si están en entidad española o en el Banco de España, pero el usuario no sabe la casilla).

**Herramienta que usan hoy.** La tabla de depósitos de Rankia, Excel, el borrador. Portfolio Performance no lleva bien productos sin precio; los trackers alemanes (getquin, Parqet) ignoran Letras españolas.

**Qué podría hacer Toisón (no tiene Letras ni depósitos).**
- Tipo de activo «Efectivo remunerado» (cuenta, depósito a plazo, Letra, fondo monetario) con TAE, fecha de vencimiento, retención sí/no y entidad. Interés devengado diario (no necesita precio de mercado) y **calendario de vencimientos** (ya tiene calendario).
- En Hacienda: intereses del año con retención y sin ella, por casilla (0027) y lo que falta por pagar; marcar los extranjeros para la 0588 y el 720.
- Aviso «este depósito vence el día X; a tipos de hoy, renovarlo supondría Y» (solo información).

---

## 8. Inmuebles e hipoteca en el patrimonio neto

**Norma vigente.** En IRPF, la vivienda habitual no genera renta; las demás generan imputación del 1,1–2 % del valor catastral o rendimientos del alquiler. En el **Impuesto sobre el Patrimonio** el inmueble se valora por el mayor de valor catastral, comprobado o de adquisición (para compras desde 2022, el valor de referencia del Catastro), la vivienda habitual está exenta hasta 300.000 € (400.000 en Bizkaia) y las deudas (hipoteca) se restan ([OCU, 28 feb 2023](https://www.ocu.org/fincas-y-casas/gestion/alquiler/analisis/2023/02/impuesto-patrimonio-vivienda)). El mínimo exento general es de 700.000 € en la mayoría de comunidades (no pude confirmarlo en la página de OCU, que corta antes; es la cifra estatal del art. 28 LIP).

**Qué preguntan.** Más que fiscalidad, quieren verlo: «¿cómo calculo mi patrimonio neto si la casa vale X y debo Y?» (Bankinter y Finary lo venden como función: [Bankinter calculadora de patrimonio](https://www.bankinter.com/blog/finanzas-personales/ranking-riqueza-espana-calculadora-patrimonio)); «¿a qué valor pongo la casa: compra, catastro, idealista?»; «¿cómo meto la hipoteca en Portfolio Performance?» (como cuenta con saldo negativo, es un apaño).

**Herramienta que usan hoy.** Excel; Finary (francés, 59,99–149,99 €/año) e Inveriok (español, con simulador de hipoteca y patrimonio neto) ([Inveriok, 7 sep 2026](https://www.inveriok.com/blog/exportar-movimientos-myinvestor-excel)); Fintonic no lleva inversiones.

**Qué podría hacer Toisón (no tiene inmuebles).**
- Activo «Inmueble» (valor manual con fecha, tipo: habitual / alquilado / segunda) y pasivo «Hipoteca» (capital pendiente, cuota, tipo, fecha fin) con amortización mensual automática (cuadro francés).
- Patrimonio neto total = inversiones + efectivo + inmuebles − hipoteca, con la vista «solo financiero» para quien no quiera mezclar.
- Aviso de Patrimonio si el neto supera los umbrales de su comunidad (umbral y exención de habitual por CCAA) y, para alquilados, la imputación/rendimiento en la renta.
- No pretender valorar el inmueble automáticamente: valor manual y recordatorio anual.

---

## 9. Herencias, carteras de familia o pareja, gananciales

**Norma vigente.** El heredero adquiere en la fecha del fallecimiento por el valor declarado en Sucesiones; la plusvalía anterior («plusvalía del muerto») no tributa; las rentas desde el fallecimiento son del heredero ([Rankia 1702151, 5 mar 2013](https://www.rankia.com/foros/fiscalidad/temas/1702151-fiscalidad-herencia-fondo-inversion)). Bienes heredados o donados son privativos aunque se esté en gananciales. En gananciales, lo adquirido con dinero común es al 50 % y así se declara, aunque la cuenta tenga un solo titular; los frutos de bienes privativos son gananciales ([Rankia 6381570, 15 may 2024](https://www.rankia.com/foros/fiscalidad/temas/6381570-cuenta-valores-dinero-privativo?page=1); [Rankia 3613010, 2017–2018](https://www.rankia.com/foros/fiscalidad/temas/3613010-cotitularidad-cuenta-valores)). Los datos fiscales atribuyen por titularidad formal (una cuenta a nombre de uno sale al 100 % de ese; la conjunta al 50 %), y el contribuyente puede corregirlo.

**Qué preguntan.**
- «Heredé acciones y entre el fallecimiento y la adjudicación hubo scrip dividend: ¿qué valor tienen las nuevas?» ([Rankia 3860983, abr–jun 2023](https://www.rankia.com/foros/fiscalidad/temas/3860983-ayuda-declarar-acciones-heredadas)).
- «Mi cuenta de valores es de dinero heredado pero va asociada a la cuenta común: ¿la venta la declaro solo yo? Tengo pérdidas que solo yo puedo usar» ([Rankia 6381570, 15 may 2024](https://www.rankia.com/foros/fiscalidad/temas/6381570-cuenta-valores-dinero-privativo?page=1)).
- «Vendo con pérdidas en mi cuenta de ING y recompro en la cuenta conjunta de Clicktrade con mi mujer: ¿esquivo los dos meses?» (no, en gananciales es el mismo titular real) ([Rankia 4732572, sep 2020](https://www.rankia.com/foros/fiscalidad/temas/4732572-valores-homogeneos)).
- «¿Cuenta conjunta o dos individuales para tributar menos?» (conjunta al 50 % en gananciales; con separación de bienes cada uno lo suyo) ([Rankia 3613010](https://www.rankia.com/foros/fiscalidad/temas/3613010-cotitularidad-cuenta-valores)).

**Herramienta que usan hoy.** Nada: Excel con una columna «titular». Ningún tracker de consumo lleva el porcentaje de titularidad por posición.

**Qué podría hacer Toisón (no tiene varias carteras ni carteras compartidas).**
- Campo **titular y porcentaje** por cuenta/posición (yo 100 %, pareja 100 %, 50/50) y el régimen (gananciales / separación / pareja de hecho) en el perfil. Hacienda saldría por persona: dos borradores, cada uno con su 25 %, sus pérdidas pendientes y su 720.
- Movimiento «Herencia / Donación» que fija valor y fecha de adquisición en la fecha del fallecimiento (sin ganancia previa) y lo marca como privativo.
- Aviso de valores homogéneos entre las cuentas de los dos cónyuges.
- Esto es también la base de «carteras familiares» (padres que llevan la de los hijos) sin compartir contraseñas.

---

## 10. Brókers sin API en España: qué exportan y en qué formato

| Entidad | Qué exporta el cliente | Formato y columnas | Informe fiscal | Lo que falla | Fuente |
|---|---|---|---|---|---|
| **MyInvestor** (custodia en Inversis) | Operaciones de fondos, acciones y ETF desde la web de Inversis (`Inversiones › Operaciones y consultas › Consulta de operaciones`, «-Todos-», rango de fechas, botón Excel); movimientos de cuenta desde `Posición global › cuenta › Documentación` | **Excel .xls** con Fecha Operación, Fecha Liquidación, Nº Operación, Mercado, Tipo Operación, ISIN, Valor, Títulos, Divisa, Precio Neto, Importe neto; extracto PDF | «Informes fiscales» en `Mi perfil › Documentación y extractos`; MyInvestor informa a la AEAT (fondos, dividendos, ventas) | Datos fiscales con «venta de derechos de suscripción» fantasma sin emisor; «Resultado Total» del informe que no cuadra con los correos de compra/venta (conversión USD↔EUR); las ventas de acciones salen en el borrador **sin valor de adquisición**; la información de Inversis no está el primer día de campaña | [bolsarex, 24 oct 2026](https://bolsarex.app/guias/exportar-movimientos-myinvestor/); [filios, 2023/ago 2026](https://www.filios.app/blog/como-exportar-informes-de-myinvestor-para-importarlos-en-filios/); [Rankia 6327013, 2 abr 2025 → 25 may 2026](https://www.rankia.com/foros/bancos-cajas/temas/6327013-datos-fiscales-myinvestor?page=2); [Rankia 7088483, 29 nov 2025 → 19 abr 2026](https://www.rankia.com/foros/bolsa/temas/7088483-como-declarar-venta-acciones-declaracion-renta-myinvestor) |
| **ING (Broker Naranja)** | «Consultar › Últimos movimientos» con filtro por tipo; PDF de operaciones a fin de año | **PDF** (Ver/Guardar); sin Excel | Documento fiscal anual; ING informa a la AEAT compras y ventas | Los botones del PDF desaparecieron tras el 31 ene 2024 y volvieron el 21 feb; el documento fiscal anual «con importes y conceptos incorrectos» que no corrigen (2017) | [Rankia 6250306, 15–24 feb 2024](https://www.rankia.com/foros/bancos-cajas/temas/6250306-ing-broker-desaparece-formulario-pdf-historial-operacion-cuenta-valores); [Rankia 3617527, 28 jun 2017](https://www.rankia.com/foros/bolsa/temas/3617527-broker-naranja-resumen-movimientos) |
| **Renta 4** | Movimientos de cuenta en **Norma 43** (formato bancario); la herramienta de cartera enseña valor, no rentabilidad | Norma 43 (texto fijo), Excel desde la web | Informe fiscal anual (no leído) | Importar Norma 43 en trackers no funciona (MyTadvisor no lo acepta) | [Rankia 6704018, 6 feb → 12 oct 2025](https://www.rankia.com/foros/fondos-inversion/temas/6704018-programa-para-comparacion-carteras-fondos?page=1) |
| **Selfbank / Singular Bank, Openbank, Bankinter** | No comprobado en esta investigación (se agotó la cuota de búsqueda) | — | — | — | — |
| **Trade Republic** | «Informe Fiscal Anual» PDF (solo periodo IBAN español en 2025, desde junio); extractos mensuales PDF; sin CSV oficial | PDF | Secciones: capital mobiliario (intereses, dividendos con retención origen y 19 %), ganancias FIFO por venta (ISIN, fechas, cantidades, precios, comisiones), movimientos, retenciones; disponible desde mediados–finales de mayo | FIFO solo con lotes de TR; no aplica la 0588; ventas en 0031 en el borrador; traspasos con fecha/precio erróneos; errores de NIF | [micartera, 22 abr 2026](https://micartera.app/blog/informe-fiscal-trade-republic-2025-interpretar); [Finect, 29 abr 2026](https://www.finect.com/usuario/avillanuevae/articulos/un-error-de-trade-republic-descuadra-miles-de-borradores-de-la-renta-2025-como-solucionarlo-paso-a-paso) |
| **DEGIRO** | «Informe Anual» PDF en `Buzón › Documentos`; Actividad exportable a Excel/CSV y PDF | PDF, CSV | Sin fecha fija («antes de los plazos»); no se envía a Hacienda y no se corrige una vez emitido; acuerdo con TaxDown hasta 2027 | Resúmenes con errores (Álava 2020); hay que teclear cada operación | [finantresnoticias, 8 jul 2026](https://finantresnoticias.com/plataformas-de-inversion/degiro-informe-anual-fiscal-buzon-documentos/); [Rankia 4647510, jun 2020](https://www.rankia.com/foros/bolsa/temas/4647510-declaracion-renta-incluir-movimientos-degiro?page=1) |
| **Interactive Brokers** | Activity Statement (anual/mensual, 5 años), Flex Queries (CSV/Excel a medida), Dividend Report (el de 2025 salió el 17 mar 2026), Forex Income Worksheet, 1042-S | CSV, Excel, PDF | No hay informe «para la renta española»; el Forex Worksheet sigue reglas de EE. UU. | No retiene el 19 % español; retiene 20 % en intereses irlandeses salvo 8-3-6; Tax Optimizer ≠ FIFO; sin casillas confirmadas para opciones/futuros/forex | [Rankia blog IBKR, 26 oct 2026](https://www.rankia.com/blog/irpf-declaracion-renta/5834848-como-incluir-declaracion-renta-cartera-interactive-brokers) |
| **Revolut** | «Informe fiscal anual» en la app (intereses); extractos de operaciones | PDF | Retiene 19 % en la cuenta remunerada e informa; las cuentas flexibles (fondos monetarios) y las acciones no se informan | Las ventas de acciones en USD hay que calcularlas a mano con tipo BCE | [Finect, 16 sep 2026](https://www.finect.com/usuario/avillanuevae/articulos/tienes-una-cuenta-con-revolut-como-declararla-en-la-renta-2024-2025); [Rankia 7288510, 16 abr → 19 jun 2026](https://www.rankia.com/foros/fiscalidad/temas/7288510-como-declarar-acciones-dolares-traves-revolut?page=1) |

**Qué preguntan.** «¿Dónde descargo las operaciones de MyInvestor?» (todas las guías de 2026 remiten a la web de Inversis, no a la app); «¿Por qué Hacienda tiene mi venta pero no mi compra?»; «¿Puedo meter las 200 operaciones de DEGIRO agrupadas por ISIN o una a una?» (Álava: 12 individuales y el resto agrupadas; AEAT: agrupar si el importe de venta cuadra) ([Rankia 4647510](https://www.rankia.com/foros/bolsa/temas/4647510-declaracion-renta-incluir-movimientos-degiro?page=1)).

**Herramienta que usan hoy.** El fichero del bróker + Excel; y una **nueva generación de micro-SaaS españoles** que importan esos ficheros: micartera.app (TR, DEGIRO, T212, IBKR → casillas), bolsarex.app (MyInvestor/Inversis, calculadora gratis, iOS), filios.app (MyInvestor y «ver tutoriales» para más), corebalance.app (CSV MyInvestor), donkycapital.com (MyInvestor, DEGIRO, Scalable, TR; TWR y dividendos), inveriok.com (finanzas personales con Excel bancario), Rankia MyPortfolio (gratis, desde julio de 2025, importador CSV en inglés y con problemas de formato español) ([Rankia 6800303, 10–18 jul 2025](https://www.rankia.com/foros/fondos-inversion/temas/6800303-cambios-morningstar?page=17)). Ninguno de ellos publica precio en la página de ayuda.

**Qué podría hacer Toisón.** Importadores **específicos por bróker** con el formato exacto (Toisón hoy importa con IA genérica, que es más caro y menos fiable):
- MyInvestor/Inversis .xls (las 11 columnas de arriba; detectar traspasos por pares; «Tipo Operación» mapea a compra/venta/traspaso/dividendo).
- Trade Republic PDF (informe fiscal y extractos), DEGIRO CSV de Actividad, IBKR Flex Query CSV (plantilla recomendada publicada por Toisón), Revolut CSV, Renta 4 Norma 43 (solo efectivo), ING PDF.
- Un «comprobador de borrador»: el usuario pega los datos fiscales (o importa el fichero de la AEAT) y Toisón marca qué falta (compras sin valor de adquisición, IBAN alemán de TR, ventas en 0031) — es el problema número uno de abril–junio.
- Publicar la guía «cómo exportar de cada bróker» con capturas (es lo que buscan en Google; los competidores ya lo hacen y así captan tráfico).

---

## 11. Fondos indexados con ISIN europeo: precio con retraso, sin ticker, dónde está el valor liquidativo

**Qué pasa.** Un fondo se valora una vez al día; algunos a las 12:00 españolas, otros publican al día siguiente la sesión anterior, algunos también en fin de semana; cada gestora tiene su ritmo (D+1, D+2) y la web de la gestora es la fuente más fiable; los agregadores (Morningstar) van detrás y a veces mezclan dos días ([Rankia 1828063, 2013–2015](https://rankia.com/foros/fondos-inversion/temas/1828063-cuando-actualiza-valoracion-fondo-inversion?page=1)). Para fondos en divisa distinta del euro, gestora y Morningstar aplican tipos de cambio en momentos distintos y los VL no cuadran ([Rankia 4023368, 14–15 sep 2018](https://www.rankia.com/foros/fondos-inversion/temas/4023368-valor-liquidativo-real)). Histórico por ISIN: Financial Times (pestaña de precios históricos), la gestora, Morningstar, Finect ([Finect 480](https://www.finect.com/preguntas/480/donde-puedo-encontrar-un-listado-con-los-valores-de-cotizacion-mensuales-de-diferentes-fondos-identificados-por-su-isin)). Inverco publica datos agregados mensuales, no VL diarios por ISIN; la CNMV tiene los informes periódicos, no series diarias.

**Qué preguntan.** «¿Por qué mi fondo no se ha movido si la bolsa subió?»; «¿Por qué el VL de mi banco no coincide con Morningstar?»; «Morningstar ha cambiado, ¿dónde sigo ahora mi cartera de fondos?» (hilo de 27 páginas en 2025; Rankia lanzó MyPortfolio como sustituto; los usuarios piden formato español en el CSV, TWR y TIR, y se quejan de que algunos ISIN no devuelven precio en Yahoo) ([Rankia 6800303, jul 2025](https://www.rankia.com/foros/fondos-inversion/temas/6800303-cambios-morningstar?page=17)); «quiero comparar mi cartera con un fondo o un índice y Renta 4 solo me enseña el valor» ([Rankia 6704018, feb–oct 2025](https://www.rankia.com/foros/fondos-inversion/temas/6704018-programa-para-comparacion-carteras-fondos?page=1)).

**Herramienta que usan hoy.** Excel/Google Sheets con scripts que buscan el código de Morningstar a partir del ISIN, Portfolio Performance (con fuentes de precio configuradas a mano), MyPortfolio de Rankia, la web de la gestora.

**Qué podría hacer Toisón.** Ya usa Yahoo (sin licencia comercial) y le pasa lo del hilo: ISIN europeos que no devuelven precio.
- Fecha del VL **visible** en cada fondo («VL del 3 nov») y «pendiente de valorar» en vez de un 0 % engañoso.
- Fuente alternativa por ISIN (gestora, FT, Morningstar) con prioridad configurable; esto conecta con el bloque de datos con licencia.
- Cambio de divisa explícito: VL en divisa del fondo × tipo BCE del día, y enseñarlo para que el usuario entienda la diferencia con el banco.
- Comparar la cartera con un fondo cualquiera por ISIN, no solo con el MSCI World (es lo que pedía wildcat y sigue sin solución en octubre de 2025).

---

## 12. Monedas y divisas

**Norma vigente.** Cada operación se declara en euros al tipo del día de la operación (compra, venta, dividendo), con tipos oficiales (BCE/Banco de España). La diferencia de cambio de los saldos en moneda extranjera se imputa cuando se cobra o paga (art. 14.2.e LIRPF): si no se han convertido los dólares no hay nada que declarar; al convertirlos hay una ganancia o pérdida aparte. Para una venta en USD, la DGT (consulta citada como V5716-26 por Rankia) calcula la ganancia en dólares con comisiones y la convierte al tipo del día de venta ([Rankia blog IBKR, 26 oct 2026](https://www.rankia.com/blog/irpf-declaracion-renta/5834848-como-incluir-declaracion-renta-cartera-interactive-brokers); [Rankia 6802037, 20 abr 2025 → 8 may 2026](https://www.rankia.com/foros/fiscalidad/temas/6802037-declaracion-moneda-extranjera-interactive-brokers)).

**Qué preguntan.**
- «IBKR me deja los dólares sin convertir, ¿qué tipo uso y qué pasa con el saldo abierto?»; «¿puedo copiar el Forex Income Worksheet en una casilla?» (no: mezcla conversiones, intereses en USD y FX implícito de dividendos) ([Rankia 6802037](https://www.rankia.com/foros/fiscalidad/temas/6802037-declaracion-moneda-extranjera-interactive-brokers)).
- «Vendí NVIDIA en Revolut, parte la pasé a euros con pérdida de cambio: ¿va en la 1624 o en la 326?» ([Rankia 7288510, abr–jun 2026](https://www.rankia.com/foros/fiscalidad/temas/7288510-como-declarar-acciones-dolares-traves-revolut?page=1)).
- «Cambié 10k € a 11,5k $ y hice dos operaciones: ¿se aplica el cambio dos veces?» ([Rankia 5254456, ene 2022](https://www.rankia.com/foros/fiscalidad/temas/5254456-fiscalidad-acciones-diferente-divisa?page=1)).
- MyInvestor: el «Resultado Total» de su informe no cuadra porque convierte a USD y vuelve a EUR ([Rankia 6327013, 25 may 2026](https://www.rankia.com/foros/bancos-cajas/temas/6327013-datos-fiscales-myinvestor?page=2)).

**Herramienta que usan hoy.** Excel con la tabla de tipos del BCE pegada; Autodeclaro y Filios (citados en el hilo, con desconfianza: «no sabría explicar el cálculo si Hacienda me pregunta»).

**Qué podría hacer Toisón.** Ya tiene «lotes FIFO con tipo de cambio del día» en el plan (0.7).
- Guardar el **tipo BCE del día** en cada lote y cada venta, y enseñar el cálculo en dos líneas («ganancia en USD × tipo del día de venta = …»); es el argumento que el usuario necesita frente a Hacienda.
- Saldos en divisa como posición propia con su coste medio en euros; al convertir, generar la ganancia/pérdida de cambio (casillas 1624 y siguientes) separada de la de las acciones (0326–0328).
- Importar el tipo oficial del BCE (serie diaria pública, sin licencia) en lugar del tipo de Yahoo para todo lo fiscal.

---

## 13. El informe fiscal del bróker y los errores típicos al declarar (abril–junio)

**Qué da cada bróker** (resumen de la tabla del apartado 10): TR un PDF estructurado pero parcial (solo IBAN español, FIFO solo propio, sin 0588); DEGIRO un PDF informativo que no se envía ni se corrige; IBKR extractos en bruto y un Dividend Report en marzo; Revolut un PDF de intereses; MyInvestor un informe fiscal y, además, datos a la AEAT con huecos. Ningún bróker extranjero consolida con otros brókers, y el **FIFO que exige Hacienda es global por contribuyente**.

**Errores que cuentan los foros (campaña de la renta 2025, abril–junio de 2026).**

| Error | Dónde se cuenta | Consecuencia |
|---|---|---|
| Ventas de acciones de TR volcadas en la casilla 0031 (capital mobiliario) en lugar de 0332/0337 | [Finect, 29 abr 2026](https://www.finect.com/usuario/avillanuevae/articulos/un-error-de-trade-republic-descuadra-miles-de-borradores-de-la-renta-2025-como-solucionarlo-paso-a-paso) | Mal bloque de compensación; rectificativa si ya se presentó |
| Olvidar el periodo con IBAN alemán de TR (enero–junio 2025): intereses, dividendos y ventas no están en el borrador ni en el informe | [micartera, 22 abr 2026](https://micartera.app/blog/informe-fiscal-trade-republic-2025-interpretar); [Rankia 6780762](https://www.rankia.com/blog/cuentas-corrientes/6780762-declarar-intereses-trade-republic) | Rentas sin declarar |
| Aceptar el borrador con la venta pero sin valor de adquisición (MyInvestor, ING) | [Rankia 7088483, nov 2025–abr 2026](https://www.rankia.com/foros/bolsa/temas/7088483-como-declarar-venta-acciones-declaracion-renta-myinvestor) | Ganancia = 100 % del importe de venta |
| «Venta de derechos de suscripción» fantasma en datos fiscales | [Rankia 6327013, 2 abr 2025](https://www.rankia.com/foros/bancos-cajas/temas/6327013-datos-fiscales-myinvestor?page=2) | El usuario no sabe si borrarla |
| No rellenar la 0588 (Renta Web no la rellena) o meter la retención extranjera como retención española (0597) | [OCU, 7 may 2025](https://www.ocu.org/inversiones/fiscalidad-y-derechos/impuestos/analisis/2025/05/como-declarar-los-dividendos-de-acciones-extranjeras); [Rankia 6815879](https://www.rankia.com/foros/fiscalidad/temas/6815879-deduccion-por-doble-imposicion-dividendos) | Pagar dos veces |
| Pedir en la 0588 el 26,375 % alemán o el 35 % suizo entero | [micartera](https://micartera.app/blog/informe-fiscal-trade-republic-2025-interpretar); [allinvestview](https://www.allinvestview.com/es/calculadora-doble-imposicion-dividendos/) | Deducción indebida (tope 15 %) |
| FIFO por bróker en vez de global; o lotes de IBKR con Tax Optimizer | [micartera](https://micartera.app/blog/informe-fiscal-trade-republic-2025-interpretar); [Rankia blog IBKR](https://www.rankia.com/blog/irpf-declaracion-renta/5834848-como-incluir-declaracion-renta-cartera-interactive-brokers) | Valor de adquisición erróneo |
| No marcar la pérdida «no computable» por recompra en los dos meses, sobre todo cuando cruza el año | [Rankia 6798163, may 2026](https://www.rankia.com/foros/fiscalidad/temas/6798163-norma-antiaplicacion-regla-dos-meses) | Pérdida compensada indebidamente |
| Copiar el Forex Income Worksheet de IBKR en una casilla | [Rankia 6802037, 8 may 2026](https://www.rankia.com/foros/fiscalidad/temas/6802037-declaracion-moneda-extranjera-interactive-brokers) | Casillas que no cuadran |
| Olvidar las cuentas flexibles de Revolut (fondos monetarios no informados) | [Finect, 16 sep 2026](https://www.finect.com/usuario/avillanuevae/articulos/tienes-una-cuenta-con-revolut-como-declararla-en-la-renta-2024-2025) | Rentas sin declarar |
| Interés pagado el 1 de enero imputado al año equivocado | [Rankia 6780762, comentarios](https://www.rankia.com/blog/cuentas-corrientes/6780762-declarar-intereses-trade-republic) | Descuadre con el borrador |
| Dar por hecho que TR «ya no necesita 720 para nada» | [Rankia 5135420 pág. 301, 26–27 feb 2026](https://www.rankia.com/foros/bolsa/temas/5135420-seguimiento-opiniones-trade-republic?page=301) | Omitir el 720 de la cuenta de valores |
| Agrupar operaciones sin que el importe total de venta cuadre con el del bróker | [Rankia 4647510, jun 2020](https://www.rankia.com/foros/bolsa/temas/4647510-declaracion-renta-incluir-movimientos-degiro?page=1) | Requerimiento |
| Fiarse de respuestas de IA sobre el 720 («se inventa las respuestas») | [Rankia 5135420 pág. 301, 27 feb 2026](https://www.rankia.com/foros/bolsa/temas/5135420-seguimiento-opiniones-trade-republic?page=301) | Desconfianza hacia cualquier app con IA en fiscal |

**Herramienta que usan hoy.** El borrador + el PDF del bróker + Excel; TaxDown (acuerdo con DEGIRO hasta 2027); micartera, bolsarex, autodeclaro, filios para sacar casillas.

**Qué podría hacer Toisón.**
- El **informe para la renta en PDF y CSV** (ya en el plan para la 0.9) con exactamente las casillas que la gente busca: 0027, 0029, 0588, 0597, 0326–0328/0332–0337, 1624+, 1800+; una línea por operación con su regla aplicada (FIFO, dos meses, traspaso) y el tipo de cambio.
- El **comprobador de borrador** del apartado 10, con los 13 errores de la tabla como reglas automáticas.
- Un calendario de la campaña: 17 mar (Dividend Report de IBKR), 19 mar aprox. (borrador), mediados de mayo (informe TR), 30 jun (fin); 1–31 mar (720/721).
- Lenguaje: «lo que dice tu borrador» frente a «lo que sale de tus operaciones», con la diferencia explicada; sin decir «declara así», que es asesoramiento fiscal personal (política de Anthropic y CNMV).

---

## Las 20 preguntas que más se repiten (con fuente)

1. **«Vendí con pérdidas y recompré: ¿puedo compensar o no?»** — [Rankia 1999230](https://www.rankia.com/foros/fiscalidad/temas/1999230-regla-dos-meses-minusvalias?page=96) (107 páginas, 2013–2025); [Rankia 6798163](https://www.rankia.com/foros/fiscalidad/temas/6798163-norma-antiaplicacion-regla-dos-meses) (2025–2026).
2. **«¿Tengo que presentar el 720 por Trade Republic / Revolut / DEGIRO / IBKR?»** — [Rankia 5135420 p. 301](https://www.rankia.com/foros/bolsa/temas/5135420-seguimiento-opiniones-trade-republic?page=301) (feb 2026); [Finect DGT V2475-25](https://www.finect.com/usuario/eduardogarcia/articulos/adios-al-modelo-720-para-muchos-usuarios-de-trade-republic-hacienda-fija-los-criterios-oficiales) (feb 2026); [Rankia 2602508](https://www.rankia.com/foros/depositos/temas/2602508-rellenando-modelo-720?page=74) (568 páginas).
3. **«Hacienda tiene mi venta pero no mi compra: ¿qué pongo?»** — [Rankia 7088483](https://www.rankia.com/foros/bolsa/temas/7088483-como-declarar-venta-acciones-declaracion-renta-myinvestor) (nov 2025–abr 2026).
4. **«¿Dónde pongo la retención extranjera del dividendo? ¿La 588?»** — [Rankia 6815879](https://www.rankia.com/foros/fiscalidad/temas/6815879-deduccion-por-doble-imposicion-dividendos) (may 2025); [OCU](https://www.ocu.org/inversiones/fiscalidad-y-derechos/impuestos/analisis/2025/05/como-declarar-los-dividendos-de-acciones-extranjeras) (may 2025).
5. **«¿Cómo recupero lo que me retiene Alemania de más (26,375 %)?»** — [Rankia 4624201](https://www.rankia.com/foros/bolsa/temas/4624201-como-recuperar-retenciones-dividendos-empresas-alemanas?page=5) (14 páginas, 2021–2024).
6. **«¿Qué retención me aplica TR en dividendos franceses, 12,8 o 25 %?»** — [Rankia 6961393](https://www.rankia.com/foros/bolsa/temas/6961393-trade-republic-retencion-origen-francia) (ago–sep 2025).
7. **«¿Qué tipo de cambio uso con IBKR/Revolut si no he convertido los dólares?»** — [Rankia 6802037](https://www.rankia.com/foros/fiscalidad/temas/6802037-declaracion-moneda-extranjera-interactive-brokers) (2025–2026); [Rankia 7288510](https://www.rankia.com/foros/fiscalidad/temas/7288510-como-declarar-acciones-dolares-traves-revolut?page=1) (2026); [Rankia 5254456](https://www.rankia.com/foros/fiscalidad/temas/5254456-fiscalidad-acciones-diferente-divisa?page=1) (2022).
8. **«Mi borrador no cuadra con el informe de TR / de MyInvestor»** — [Finect](https://www.finect.com/usuario/avillanuevae/articulos/un-error-de-trade-republic-descuadra-miles-de-borradores-de-la-renta-2025-como-solucionarlo-paso-a-paso) (abr 2026); [Rankia 6327013](https://www.rankia.com/foros/bancos-cajas/temas/6327013-datos-fiscales-myinvestor?page=2) (2025–2026).
9. **«¿Dónde descargo mis movimientos de MyInvestor en Excel?»** — [bolsarex](https://bolsarex.app/guias/exportar-movimientos-myinvestor/), [filios](https://www.filios.app/blog/como-exportar-informes-de-myinvestor-para-importarlos-en-filios/), [inveriok](https://www.inveriok.com/blog/exportar-movimientos-myinvestor-excel), [donkycapital](https://www.donkycapital.com/en/brokers/import-from-myinvestor) (todas 2026).
10. **«Tengo el mismo fondo en dos brókers: ¿el FIFO es por bróker o global?»** — [Rankia 4706674](https://www.rankia.com/foros/fondos-inversion/temas/4706674-fifo-traspaso-fondo-dos-comercializadoras?page=1) (2020); [micartera](https://micartera.app/blog/informe-fiscal-trade-republic-2025-interpretar) (2026).
11. **«¿Cuánto tarda un traspaso externo y cuál es el camino más rápido?»** — [Rankia 6557895](https://www.rankia.com/foros/fondos-inversion/temas/6557895-traspaso-fondos-externos) (2024–2026).
12. **«¿Cómo apunto un traspaso en mi Excel / Portfolio Performance sin que cuente como venta?»** — Bogleheads.es [t=1497](https://bogleheads.es/foro/viewtopic.php?t=1497), [t=1054](https://bogleheads.es/foro/viewtopic.php?t=1054), [t=512](https://bogleheads.es/foro/viewtopic.php?t=512) (solo títulos).
13. **«¿Puedo meter 200 operaciones de DEGIRO agrupadas o una a una?»** — [Rankia 4647510](https://www.rankia.com/foros/bolsa/temas/4647510-declaracion-renta-incluir-movimientos-degiro?page=1) (2020).
14. **«Los intereses de TR: ¿qué casilla, con o sin retención, y el del 1 de enero a qué año?»** — [Rankia 6780762](https://www.rankia.com/blog/cuentas-corrientes/6780762-declarar-intereses-trade-republic) (2025–2026).
15. **«¿Dónde veo el valor liquidativo real de mi fondo y por qué no coincide con el banco?»** — [Rankia 4023368](https://www.rankia.com/foros/fondos-inversion/temas/4023368-valor-liquidativo-real) (2018); [Rankia 1828063](https://rankia.com/foros/fondos-inversion/temas/1828063-cuando-actualiza-valoracion-fondo-inversion?page=1); [Finect 480](https://www.finect.com/preguntas/480/donde-puedo-encontrar-un-listado-con-los-valores-de-cotizacion-mensuales-de-diferentes-fondos-identificados-por-su-isin).
16. **«Morningstar ha cambiado: ¿dónde sigo mi cartera de fondos ahora?»** — [Rankia 6800303](https://www.rankia.com/foros/fondos-inversion/temas/6800303-cambios-morningstar?page=17) (27 páginas, 2025).
17. **«Quiero comparar mi cartera con un fondo o índice y mi bróker solo enseña el valor»** — [Rankia 6704018](https://www.rankia.com/foros/fondos-inversion/temas/6704018-programa-para-comparacion-carteras-fondos?page=1) (2025, sin solución).
18. **«Cuenta de valores en gananciales / dinero heredado: ¿declaro al 50 % o al 100 %?»** — [Rankia 6381570](https://www.rankia.com/foros/fiscalidad/temas/6381570-cuenta-valores-dinero-privativo?page=1) (2024); [Rankia 3613010](https://www.rankia.com/foros/fiscalidad/temas/3613010-cotitularidad-cuenta-valores); [Rankia 4732572](https://www.rankia.com/foros/fiscalidad/temas/4732572-valores-homogeneos).
19. **«Heredé acciones/fondos: ¿qué valor y fecha de adquisición pongo?»** — [Rankia 3860983](https://www.rankia.com/foros/fiscalidad/temas/3860983-ayuda-declarar-acciones-heredadas) (2020–2023); [Rankia 1702151](https://www.rankia.com/foros/fiscalidad/temas/1702151-fiscalidad-herencia-fondo-inversion).
20. **«¿Cuánto me desgrava el plan de pensiones / EPSV y qué cambia en 2026?»** — [guiafiscal](https://guiafiscal.es/irpf/plan-de-pensiones-limite-aportacion/) (oct 2026); [carlosgalan.net EPSV](https://carlosgalan.net/epsv-indexa-capital/) (ene 2026); [Rankia 2326715](https://www.rankia.com/blog/planes-de-pensiones/2326715-cuales-son-principales-diferencias-plan-pensiones-epsv); [Finect 218](https://www.finect.com/preguntas/218/diferencia-entre-epsv-y-plan-de-pensiones).

Títulos de Forocoches encontrados pero no leídos (el sitio no se puede abrir desde aquí): [«Información fiscal para Renta 2026»](https://forocoches.com/foro/showthread.php?t=10650144), [«¿MyInvestor vuelca los DATOS DE ACCIONES MAL en HACIENDA?»](https://forocoches.com/foro/index.php/showthread.php?p=511567408), [«Duda con MyInvestor y todo lo referente a hacienda»](https://forocoches.com/foro/showthread.php?t=9693279), [«Hacienda - Myinvestor»](https://forocoches.com/foro/showthread.php?t=9913890), [«Portfolio performance - programa gratuito»](https://forocoches.com/foro/showthread.php?t=8193383), [«Análisis cartera fondos indexados»](https://forocoches.com/foro/showthread.php?t=10257163). Coinciden con las preguntas 3, 8, 9 y 12.

---

## Lo que esto cambia en el plan de Toisón (resumen de hallazgos)

1. **La competencia española ya existe y es de nicho fiscal.** micartera.app, bolsarex.app, filios.app, autodeclaro, corebalance.app, donkycapital.com, inveriok.com y el MyPortfolio gratuito de Rankia (julio 2025) hacen hoy «fichero del bróker → FIFO + dos meses → casillas». Toisón no puede vender «Hacienda» como novedad; lo que no tiene nadie es la unión de tracker completo + Hacienda + el comprobador de borrador + plan. El importador específico por bróker (Inversis .xls de 11 columnas, PDF de TR, CSV de DEGIRO, Flex de IBKR) pasa de «nice to have» a requisito mínimo.
2. **La regla de los dos meses es la duda número uno desde 2013** (107 páginas, 840 respuestas, activa en 2025) y nadie avisa *antes* de operar. Un aviso al registrar una venta con pérdida, con ventana que cruza el año y todos los brókers, es barato y diferencial.
3. **El problema de abril no es calcular, es cotejar.** TR volcó ventas en la casilla equivocada (abr 2026), MyInvestor manda ventas sin valor de adquisición y «derechos» fantasma, Revolut no informa las cuentas flexibles, y la DGT solo ha aclarado la cuenta de efectivo de TR para el 720. Un «comprobador de borrador» con las 13 reglas de la tabla del apartado 13 es la función que la gente pagaría en abril.
4. **Divisa y FX como lotes fiscales.** Los hilos de 2025–2026 (IBKR, Revolut) giran en torno al tipo del día y el saldo en dólares sin convertir. Toisón debería guardar el tipo BCE por lote y separar la ganancia de cambio (1624+) de la de la acción (0326+), y enseñar el cálculo.
5. **Dividendos: la 0588 y el exceso no recuperable.** Renta Web no la rellena; los brókers tampoco. Mostrar por dividendo lo deducible (hasta 15 %) y lo que solo devuelve el país de origen (Alemania 11,375 %, Suiza 20 %, con formulario y plazo) es sencillo con lo que Toisón ya tiene.
6. **Lo que falta para «todo en un sitio» y que piden los foros:** planes de pensiones/EPSV con límites 2026 y ahorro fiscal, Letras/depósitos/monetarios con vencimientos, inmuebles con hipoteca, y titularidad por posición (gananciales, pareja, herencia). Todo ello con cálculo sencillo (sin precio de mercado) y encaja en la 0.9–1.1.
7. **Fuentes de VL.** Los Bogleheads sufren con ISIN europeos sin precio (también en Yahoo). Enseñar la fecha del VL y tener fuente alternativa por ISIN evita el «0 %» engañoso.
8. **Marco normativo estable para 2026** (tramos 19–30 %, 1.500/8.500/4.250, 50.000/20.000 en 720 y 721) con dos cosas a vigilar: la Propuesta 2/2026 del CDC sobre compensación y las Normas Forales vascas en vigor desde el 1 de enero de 2026 (EPSV al 30 %).
