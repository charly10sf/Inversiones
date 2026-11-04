# Bloque 1b — Competidores en España y de impuestos/cripto

Fecha de consulta: 4 de noviembre de 2026. Todo lo que no lleva URL propia viene de las páginas enlazadas en cada ficha. Donde pone «no encontrado» es que no lo localicé en esta sesión; donde pone «web no accesible» es que la web oficial rechazó la descarga (Indexa /tarifas, Bankinter, Openbank, Inversis, Koinly) y tiré de comparativas de terceros. Nota de método: el presupuesto de búsquedas web compartido se agotó a mitad del bloque (c); los brókers grandes están cubiertos con comparativas de Rankia/Finect/Dinerio actualizadas en oct–nov 2026 y con sus webs oficiales cuando se pudieron abrir.

Conversión USD→EUR usada cuando hace falta: ~0,86 €/$ (orientativa, no es el cambio del día).

---

## 0. Respuesta a la pregunta clave

**¿Existe hoy en España una app que junte varios brókers Y calcule la renta española?** Sí, y no una sino un racimo nuevo, casi todo de 2025–2026:

| App | Junta brókers | Renta española | Precio | Lo que le falta frente a Toisón |
|---|---|---|---|---|
| **MiCartera** (micartera.app) | 5 (DEGIRO, TR, Trading 212, IBKR, ING) por API o CSV | La más profunda: FIFO lote a lote, regla 2 meses, casillas 0328/0424/0029/0597/0588/0460, compensación 4 años, 720 «si aplica» | 19 € pase 90 días / 99 €/año / 179 €/año | Sin gratis, sin app móvil, sin cripto/fondos traspasables (MyInvestor, Indexa, Revolut «todavía» no), sin 721, sin riesgo/análisis, sin mercados ni noticias |
| **Filios** (filios.app) | IBKR, DEGIRO, Renta 4, TR, MyInvestor, Revolut (subes el informe del bróker) | FIFO con tipos BCE, informe con importes por casilla, valoración 31-dic para 720 y 721 | Gratis hasta 15.000 € / 11–24 €/mes | Sin app nativa, sin IA, sin noticias, sin regla 2 meses anunciada, caro (132–288 €/año) |
| **AllInvestView** | Sync directo DEGIRO e IBKR; archivos de MyInvestor, TR, Revolut, ING, XTB, eToro, Trading 212, Scalable | FIFO entre cuentas, 2 meses, compensación 25 %, 720 con fichero BOE, calculadora doble imposición; servicio humano de informe renta 99 € | Gratis 10 posiciones / desde 6,49 €/mes anual (su web de precios muestra 6,99–29,99 $) | Sin 721, precios en dólares, sin mercados ni radar, IA no descrita |
| **WealthMaia** | CSV/PDF/foto de ~12 brókers; conexión automática «próximamente» | Solo en Plus/Premium: estima IRPF, traspasos, Letras. Sin informe para la renta | 2,99 / 5,99 / 7,99 €/mes anual | Sin informe fiscal descargable, sin 720/721, sin app en tiendas |
| **Autodeclaro** | 20+ brókers por extracto PDF/CSV | 720, 721, 210, ganancias Renta; no es tracker | 45–75 € por modelo (gratis parcial) | No es seguimiento de cartera, es un trámite puntual |
| **Lait** | CSV de 40 bancos, 15 cripto, SnapTrade en Premium | Estima IRPF del ahorro y Patrimonio (Premium) | Gratis / 7,99 €/mes / 59,99 €/año | Sin informe de renta, sin FIFO declarado |
| **Renta Cartera** | IBKR (CSV y Flex), DEGIRO, Quantfury PDF, CSV genérico | FIFO por valor entre cuentas, regla 2 meses, resumen anual exportable | Gratis 10 operaciones / 4,99 €/mes / 49,99 €/año | Sin casillas, sin traspasos de fondos, sin 720/721, sin IA, sin app |

**La más cercana a Toisón es MiCartera** (misma idea: varios brókers + renta española con casillas, hecha por un inversor español solo, con IA fiscal). Le faltan: app Android, plan gratis, cripto, fondos con traspaso, riesgo/análisis, mercados, radar/noticias, IA sobre la cartera entera, diseño «premium». Lo que tiene y Toisón no: casillas exactas del Modelo 100 en PDF, regla de los 2 meses automática, optimizador fiscal (qué vender para compensar), simulador de venta con impuesto, API con DEGIRO/TR/IBKR. **Filios** es la segunda (720 + 721 + patrimonio) y **AllInvestView** la tercera (fichero BOE del 720 y servicio humano de 99 €).

Ninguna de las siete tiene a la vez: cripto + fondos traspasables + acciones/ETF + renta con casillas + app Android + IA. Ahí está el hueco de Toisón.

---

## A. Cripto e impuestos

### A1. Rotki
- **Qué es / para quién:** gestor de cartera cripto de código abierto, local («privacy-first»), para usuarios intermedios-avanzados, DeFi, staking. No es para acciones (sus tipos de activo son cripto, divisas y «Other»).
- **Precio (rotki.com/pricing y /products, vistos 4-nov-2026; findmymoat lo verificó 24-sep-2026):** Starter gratis (1.000 eventos); Supporter 9 €/mes (~90 €/año, 3.000 eventos, 1 dispositivo); Basic 25 €/mes (~250 €/año, 30.000 eventos, 2 dispositivos, 150 MB copia cifrada); Advanced 45 €/mes (~450 €/año, 100.000 eventos, 4 dispositivos, 600 MB). Anual ahorra «2 meses».
- **Funciones estrella:** base de datos local cifrada; decodificación on-chain + exchanges por API de solo lectura; informe de ganancias/pérdidas con reglas fiscales configurables; seguimiento de staking (ETH, Lido, Kraken…); emparejamiento de depósitos/retiradas con transacciones on-chain; gráficos de valor neto y distribución; **asistentes de IA vía MCP** (Basic/Advanced): consultas de solo lectura sobre eventos y saldos, con modos de privacidad; transacciones enriquecidas con Monerium y Gnosis Pay.
- **Datos:** API de exchanges (solo lectura), direcciones on-chain, CSV. Sin PDF.
- **IA:** sí, servidor MCP para conectar tu Claude/ChatGPT a tus datos locales (docs.rotki.com/premium/, rotki.com/products).
- **Diseño:** app de escritorio, panel con gráficas de valor neto; no es «bonita», es técnica.
- **Críticas:** findmymoat (24-sep-2026): «requiere trabajo de configuración: conciliar precios faltantes y eventos sin categoría», tú gestionas copias y seguridad, no da asesoría fiscal. G2: 0 reseñas (22-sep-2026). Sin reseñas españolas encontradas.
- **Fiscalidad española:** ninguna específica. FIFO configurable; nada de 721 ni casillas.
- Fuentes: https://docs.rotki.com/premium/ · https://rotki.com/products/ · https://rotki.com/pricing · https://www.findmymoat.com/tools/rotki · https://www.g2.com/products/rotki-solutions/reviews

### A2. Koinly
- **Qué es / para quién:** calculadora fiscal cripto internacional (20.000+ monedas, 700–900 integraciones), para quien opera en muchos exchanges.
- **Precio:** según CoinTracking (17-sep-2026, precios de jun-2026): Free 0 € (10.000 transacciones, sin informe), Newbie 49 €/año fiscal (100 tx), Hodler 99 € (1.000), Trader 199 € (3.000+). Guía Fiscal (precios jul/ago-2026) lo da en US$49. Se paga una licencia por cada año fiscal. Web ES (koinly.io/es-es/) no accesible en esta sesión.
- **Funciones estrella:** importación automática de 700+ exchanges/wallets; informe fiscal por país (unos 10 específicos, España incluido); tax-loss harvesting; DeFi/NFT; métodos de coste «4+»; servidores UE, ISO 27001.
- **Datos:** API de exchanges, direcciones públicas, CSV.
- **IA:** no encontrada.
- **Diseño:** lo más elogiado en Trustpilot («cómodo y fácil de usar», 7-abr-2026).
- **Críticas (Trustpilot, 4,5/5, 2.383 reseñas, 4-nov-2026):** soporte lento o ignorado (10-jun-2025, 15-may-2025); sincronización rota con OKX/Binance (abr-jun 2025); dudas sobre exactitud («nunca sabes si el resultado es certero o inflado», 8-abr-2025); **«no ofrece ningún informe predefinido con el desglose compra/venta/comisión que pide la Agencia Tributaria»** (usuario de pago, 10-jun-2025). Guía Fiscal: «sin interfaz en español ni informe 721… el que peor encaja con la fiscalidad española».
- **Fiscalidad española:** informe «España» con FIFO; **sin 721**, sin casillas; en inglés.
- Fuentes: https://cointracking.info/es/blog/cointracking-vs-koinly/ · https://guiafiscal.es/comparativas/mejor-software-fiscal-cripto-2026/ · https://es.trustpilot.com/review/koinly.io · https://www.koinx.com/es/library/top-crypto-tax-software-in-spain

### A3. CoinTracking
- **Qué es / para quién:** el veterano (2012), 400+ importaciones, 25+ informes, para alto volumen y asesores (marca blanca).
- **Precio (su propio blog, 17-sep-2026, precios jun-2026):** Free 0 € (solo vista cartera); Starter 39 €/año (200 tx); Pro 129 €/año (3.500 tx, API); Expert desde 219 €/año (20.000 tx, prueba de origen de fondos); Unlimited 769 €/año; Corporate 1.599 €. Cuenta acumulada entre años (no por año fiscal). Prueba 7 días, devolución 14 días.
- **Funciones estrella:** 14 métodos de cálculo; informe específico para España (y 20+ países); prueba de origen de fondos (para el banco); NFT Center; simulación FIFO por wallet; histórico diario de cartera; comprobación de duplicados; cartera pública; servicio «full service» con especialistas (landing en español).
- **Datos:** API de exchanges, CSV, importa el CSV de Koinly.
- **IA:** no encontrada.
- **Diseño:** «interfaz más densa, pensada para usuarios con muchas operaciones» (Guía Fiscal). Novatos Trading Club (2022, afiliado) la llama «intuitiva».
- **Críticas:** Guía Fiscal: no confirma 721 automático; densa. Waltio se vende como «la mejor alternativa a CoinTracking» por sencillez (Trustpilot Waltio, 5-sep-2026: «más sencilla que CoinTracking»). No encontré reseñas españolas negativas concretas.
- **Fiscalidad española:** informe compatible con la Renta, FIFO; **721 no automático**.
- Fuentes: https://cointracking.info/es/blog/cointracking-vs-koinly/ · https://guiafiscal.es/comparativas/mejor-software-fiscal-cripto-2026/ · https://www.novatostradingclub.com/blog/cointracking-opiniones/

### A4. Waltio (sí opera en España; sede París; alianza con Bitvavo en España)
- **Qué es / para quién:** calculadora fiscal cripto francesa con versión española completa; 120.000–150.000 usuarios en Europa; para el inversor minorista español de Bitvavo/Binance/etc.
- **Precio (waltio.com/es/precio-nuestras-ofertas/, actualizada 21-oct-2026):** Gratis 0 € (hasta 50 tx: portfolio, P&L manual, guía IRPF); **Lite 39 €** (50 tx: IRPF base general y del ahorro, **Modelo 721**, P&L automático, guía paso a paso en Renta Web, exportación); Starter 99 € (1.000 tx, + certificado fiscal); Smart 249 € (10.000 tx, «popular»); Unlimited 999 € (ilimitado, documentos para inspección/repatriación bancaria). Por año fiscal; **renovación automática el 1 de octubre**.
- **Funciones estrella:** 900+ exchanges/wallets; IRPF con base general (staking/airdrops) y del ahorro; 721 generado; certificado fiscal; guía con capturas de Renta Web; simulador gratuito; «Waltio para asesores»; alianza Bitvavo (estrategiasdeinversion.com).
- **Datos:** API/direcciones públicas y CSV (su página de precios no lo detalla; la de integraciones sí).
- **IA:** el soporte es «principalmente IA» según quejas (Trustpilot, 5-sep-2026: «poner gente física»).
- **Diseño:** sencillo, guiado, en español; 4,8/5 con 600+ valoraciones en su web.
- **Críticas (Trustpilot 4,1/5, 513 reseñas):** informes bloqueados tras pagar/«genera un certificado pero no te da el cálculo» (29-jun-2026); informe con ganancias en cero tras pagar 99 € (2-jun-2026); **renovaciones y cobros no pedidos** (250 €, 12-oct-2026; recobro tras cancelar, 1-oct-2026); soporte automatizado (5-sep-2026); exportación de Quantfury en Excel (4-sep-2026).
- **Fiscalidad española:** FIFO, IRPF, 721, tramos 19–30 %, modelos 172/173 explicados. No cubre acciones/fondos.
- Fuentes: https://www.waltio.com/es/precio-nuestras-ofertas/ · https://es.trustpilot.com/review/waltio.co · https://www.estrategiasdeinversion.com/actualidad/noticias/empresas/bitvavo-se-alia-con-waltio-para-facilitar-la-declaracion-n-819575

### A5. Otros que aparecen en toda comparativa española (no pedidos, pero relevantes)
- **Divly** (Suecia, interfaz y soporte en español): 39 €/año fiscal con **IRPF + 721 en el mismo plan** (100 operaciones); Guía Fiscal lo recomienda como «el caso español más completo» (ago-2026). https://guiafiscal.es/comparativas/mejor-software-fiscal-cripto-2026/
- **Blockpit** (Austria, absorbió Accointing): 49 €/año fiscal con solo 50 tx; localizado para España; 721 no confirmado. Misma fuente.
- **KoinX**: planes desde 9,99 €, «informes para la Agencia Tributaria» sin detallar (artículo propio, 4-ago-2026). https://www.koinx.com/es/library/top-crypto-tax-software-in-spain

---

## B. Renta en España

### B1. TaxDown
- **Qué es / para quién:** gestoría online de la renta (app + asesores), Colaborador Social de la AEAT, 9.921 reseñas en Trustpilot; rondas de 5,5–5,8 M€; acuerdos con DEGIRO (hasta 1-abr-2027, 30 % de descuento) y XTB.
- **Precio (taxdown.es/precios, 4-nov-2026):** Free (ver resultado gratis); **PRO desde 35 €/año** (app + revisión experto + presentación); **LIVE desde 45 €** (chat/WhatsApp con asesores); **FULL desde 65 €** (asesor personal, revisión de 4 declaraciones, modelos 149/151/210). En su página de inversores los mismos planes salen a 75/99/239 € «desde»: **el precio sube según la complejidad (inversiones, cripto, inmuebles)**. Ejemplo DEGIRO: Pro 52,50 €, Live 69,30 €, Full 167,30 € (finantresnoticias, 27-jul-2026). Trustpilot (18-oct-2026): «cobro de 50 € adicionales por un modelo para gestiones bursátiles».
- **Funciones estrella:** importa los datos fiscales de la AEAT con Cl@ve/referencia; detecta deducciones autonómicas; «TaxDown AI» revisa, calcula y presenta junto con asesores; trazabilidad cripto; compensación ganancias/pérdidas; soporte todo el año a notificaciones; app iOS/Android.
- **Datos:** descarga del borrador AEAT; para brókers, **sube el informe anual** (DEGIRO: informe anual, transacciones, extracto). Su página de inversores no nombra brókers ni formatos.
- **IA:** sí, «TaxDown AI» (sin modelo indicado).
- **Diseño:** app guiada por preguntas; lo más valorado es «sencillo y rápido».
- **Críticas (Trustpilot 4,3/5, 9.921 reseñas; 12 % de 1 estrella):** «errores muy graves» en la declaración (17-oct-2026); carga de XTB «no automática como se anunció» (20-may-2026); borrador presentado sin deducciones (8-jun-2026); FULL no disponible en País Vasco/Navarra; precios «desde».
- **Fiscalidad española que cubre:** toda la renta, pero **sin FIFO propio ni casillas por bróker**: depende de lo que el bróker informe a la AEAT o del informe que subas; no hace 720/721 (Autodeclaro/Koinly los hacen por él).
- Fuentes: https://taxdown.es/precios · https://taxdown.es/servicios/inversores · https://es.trustpilot.com/review/taxdown.es · https://finantresnoticias.com/plataformas-de-inversion/degiro-taxdown-mantienen-acuerdo-fiscal-hasta-2027-puede-aprovechar-usuario/ · https://guiafiscal.es/comparativas/mejor-servicio-renta-online/

### B2. TaxScouts España → ahora **Taxfix**
- TaxScouts España se integró en Taxfix («¡TaxScouts es ahora Taxfix!», cuentas migradas automáticamente; Roams, 13-abr-2026). El antiguo plan de 69,90 € desapareció.
- **Precio (Guía Fiscal, verificado 6-sep-2026):** Pack Renta **Básico 59,90 €** (nómina, autónomo, fondos/ETF, apuestas); **Avanzado 89,90 €** (acciones y **cripto hasta 1.000 operaciones vía Koinly**, alquileres, venta de vivienda, Ley Beckham, 7p). Matrimonios: ahorro de 20 €. Precio cerrado, asesor asignado, cobertura de sanciones por errores del servicio.
- **Datos:** acceso a los datos de la AEAT como Colaborador Social; certificados de compra de acciones; cripto por Koinly.
- **IA:** no encontrada.
- **Críticas:** Guía Fiscal: caro para una renta sencilla; web aún con campaña 2025.
- **Fiscalidad:** la renta entera con humano; FIFO lo hace el asesor; 721 vía Koinly; 720 no indicado.
- Fuentes: https://taxfix.com/es-es/blog/como-hacer-la-declaracion-de-la-renta-con-taxscouts/ · https://roams.es/finanzas/academia/declaracion-renta/taxscouts/ · https://guiafiscal.es/comparativas/mejor-servicio-renta-online/

### B3. Declarando
- **Qué es / para quién:** software + asesoría para **autónomos** (facturación, trimestrales, renta incluida). No vende la renta suelta ni sirve a asalariados.
- **Precio (Guía Fiscal, 23-oct-2026):** Básico 29,90 €/mes + IVA (anual), Pro 39,90, Premium 49,90 (solo este incluye deducciones autonómicas). Mínimo ~360 €/año + IVA.
- **Fiscalidad inversora:** nada específico. Irrelevante para Toisón salvo como referencia de precio «suscripción con renta incluida».
- Fuente: https://guiafiscal.es/comparativas/mejor-servicio-renta-online/

### B4. Sumio
- **No es española ni hace renta.** «Sumio: Control Patrimonio / Net Worth Tracker» es de Fiduciary s.r.o. (Praga). iOS/iPadOS/Mac/Vision. Gratis con Premium 5,99 €/mes, 34,99 €/año, 2,99 €/semana. Registro manual de activos y pasivos, precios de acciones/ETF/cripto/metales, 100+ monedas, importación XLSX (v1.8.12), **resúmenes e informes con IA de acciones y fondos (v1.9.2)**, Face ID, sin cuenta ni conexión bancaria (datos en el dispositivo). Idiomas: ES, EN, DE, CS, FR, PL. Nada de impuestos.
- Fuentes: https://apps.apple.com/es/app/net-worth-tracker-sumio/id1560198579 · https://localazy.com/blog/sumio-personal-finance-app-fiduciary-labs-localazy-interview

---

## C. Lo español de inversión

### C1. Trackers españoles con fiscalidad (la competencia real de Toisón)

#### MiCartera (micartera.app) — la más cercana
- **Qué es / quién:** web SaaS «construida por un inversor español» (Ángel, inversor desde 2018). Para quien hace DCA y quiere ver cada lote, inversores de dividendos y quien declara en España.
- **Precio (web, 4-nov-2026):** sin plan gratis (hay demo sin registro). **Pase Cierre fiscal 2026: 19 € pago único** (90 días de optimizador + simulador). **Anual 99 €** (8,25 €/mes; informes ilimitados, cartera, dividendos, 20 mensajes de IA/mes). **Ultra 179 €/año** (300 mensajes de IA/mes; packs de 250 por 5 €). En su blog de mayo-2026: 10 €/mes.
- **Funciones estrella:** FIFO lote a lote con prorrateo de comisiones consolidado entre brókers; **informe PDF con casillas del Modelo 100 (0328, 0424/0425, 0029, 0597, 0588, 0460)**; **regla de los 2 meses automática** (y 12 meses para no cotizados); **optimizador fiscal** (compensación art. 38, arrastre 4 ejercicios, avisa de la regla de 2 meses); **simulador de venta con impuesto estimado**; dividendos (calendario de próximos cobros, yield, por país con doble imposición); multi-divisa (USD/EUR/GBP) con tipos BCE; precios en vivo, PER/EPS/ROE, recomendaciones de analistas, noticias; simulador de caída de mercado; 720 «si te aplica».
- **Datos:** CSV con detección automática de formato; **API con brókers compatibles** (DEGIRO, TR, Trading 212, IBKR, ING; IBKR vía Flex Query); PDF o CSV ≤10 MB en la calculadora gratuita. Ejercicios 2023–2026.
- **IA:** «asistente fiscal IA» con fuentes oficiales, «no es asesoramiento fiscal»; proveedor no indicado; medido en mensajes/mes.
- **Diseño:** web app, sin apps en tiendas; Stripe; Supabase con RLS; datos cifrados.
- **Críticas:** WealthMaia (16-jul-2026): «sin plan gratis, sin apps móviles, sin avisos y sin IA» (ya tiene IA). AllInvestView: «vinculación solo parcial; enfocada sobre todo en el IRPF de las ventas». Su propio blog: «no soporta MyInvestor, Indexa, Finizens, Revolut ni Scalable todavía; no cubre 720/721; sin comunidad».
- **Fiscalidad española:** FIFO, 2 meses, compensación y arrastre, casillas, dividendos y 0588, 720 parcial. **No**: traspasos de fondos (solo los explica), 721, cripto.
- Fuentes: https://micartera.app/ · https://micartera.app/renta-inversor · https://micartera.app/blog/alternativas-getquin-portfolio-tracker-espana · https://www.wealthmaia.com/es/blog/mejores-apps-seguir-cartera-inversion-espana · https://www.allinvestview.com/best-portfolio-tracker-spain/

#### Filios (filios.app)
- **Qué es / quién:** web app «creada por y para inversores» (Pablo y Jaime); «miles de usuarios». Un usuario de Rankia ya la citaba el 13-jun-2021 («aún está verde»).
- **Precio (web, modificada 14-ago-2026):** Gratis (15.000 € invertidos, 200 movimientos); **Premium 11 €/mes** (200.000 €, 3.000 mov.); **Pro 20 €/mes** (500.000 €, 10.000 mov.); **Ilimitado 24 €/mes**. Prueba Pro 14 días sin tarjeta.
- **Funciones estrella:** todos los activos (acciones, fondos, ETF, **planes de pensiones**, cripto, opciones, cuentas remuneradas, divisas); movimientos complejos (**traspasos**, primas de emisión, splits, ampliaciones, spin-off, scrip); dividendos/cupones/staking/intereses; rentabilidad TWR/RoR/MWR; distribución por tipo/divisa/país/mercado/etiquetas; comisiones; **FIFO con tipos del BCE**; **valoración a 31-dic para 720 y 721**; informe fiscal con importes para copiar en la renta; etiquetas, notas, columnas personalizables.
- **Datos:** «descarga el informe del bróker y cárgalo en dos clics» (IBKR, DEGIRO, Renta 4, TR, MyInvestor, Revolut); manual. Sin API en vivo.
- **IA:** no.
- **Diseño:** tabla densa tipo Excel mejorado; PWA instalable.
- **Críticas:** Trustpilot 4,6/5 (67 reseñas, 13 en 12 meses); MiCartera: «sin regla de 2 meses anunciada ni simulación fiscal; reseñas piden más brókers»; WealthMaia: «sin avisos ni IA».
- **Fiscalidad española:** FIFO, 720, 721, casillas (importes), traspasos registrados como movimiento; sin compensación explícita.
- Fuentes: https://www.filios.app/ · https://www.trustpilot.com/review/filios.app · https://www.rankia.com/foros/bolsa/temas/5048678-aplicacion-para-gestion-cartera

#### AllInvestView
- **Qué es / quién:** plataforma de tracking + impuestos para inversor español (empresa no nombrada); apps en App Store y Google Play; community.
- **Precio:** su blog (precios revisados 1-nov-2026): gratis 10 posiciones; de pago **desde 6,49 €/mes anual** (Starter 77,88 €/año). Su página /pricing muestra **en dólares**: Starter desde 6,99 $/mes, Pro 29,99 $/mes, Advanced lifetime 497 $. **Informe Renta hecho por una persona: 99 € por ejercicio** (5 días hábiles, devolución si no se puede). Prueba 14 días.
- **Funciones estrella:** FIFO entre cuentas, **regla de 2 meses con calculadora**, compensación 25 %, **Modelo 720 con PDF, Excel y fichero BOE**, semáforo de 50.000 € en el gratis, dividendos brutos con retenciones separadas, **calculadora de doble imposición**, TWR/MWR, Sharpe/Sortino, alertas de precio, informes de plusvalías para 17 jurisdicciones, «Magic Import» con IA, sync con 30+ brókers.
- **Datos:** sync directo DEGIRO e IBKR (Flex), archivos de TR, MyInvestor, Revolut, ING, XTB, eToro, Trading 212, Scalable; nunca pide contraseñas del bróker.
- **IA:** «asistente de IA en todos los planes» y «Magic Import», sin detalle ni modelo.
- **Críticas:** no encontradas (reseñas de tiendas no localizadas). Su web mezcla € y $ y fechas («Actualizado 2027»).
- **Fiscalidad española:** FIFO, 2 meses, compensación, 720 (fichero BOE), dividendos y 0588 estimada. **No**: 721, traspasos de fondos.
- Fuentes: https://www.allinvestview.com/best-portfolio-tracker-spain/ · https://www.allinvestview.com/es/informe-renta-inversores/ · https://www.allinvestview.com/pricing/ · https://www.allinvestview.com/es/autodeclaro-vs-allinvestview-modelo-720/

#### WealthMaia
- **Qué es / quién:** «plataforma con la IA Maia que lee tu cartera»; Barcelona; Pablo Marín (CEO), Francisco J. Climent (CTO), Pablo Muñoz (CPO). Solo lectura, sin productos.
- **Precio (web, 4-nov-2026):** prueba 7 días sin tarjeta; **Básico 2,99 €/mes anual** (4,99 sin permanencia): 1 plan/mes, 10 mensajes, briefing diario; **Plus 5,99 €/mes anual** (8,99): chat ilimitado, 20 planes/mes, briefing de tu cartera, avisos proactivos, **fiscalidad (IRPF, traspasos, Letras)**; **Premium 7,99 €/mes anual** (12,99): deep research, varias carteras/brókers en una vista, 50 planes, conexión automática «próximamente». Devolución 30 días.
- **Funciones estrella:** importación por **CSV, PDF o foto**; «planes» mensuales con próxima compra y productos comprables en España (ISIN); briefing diario; avisos cuando una noticia o resultado afecta a una posición; preguntas con tus datos («¿vendo Nvidia o aguanto?», «¿amortizo hipoteca o invierto?»); habla catalán.
- **IA:** central; modelo no indicado; «Maia ofrece información, no asesoramiento financiero personalizado» (ojo: sus ejemplos rozan la recomendación personalizada que la CNMV/Anthropic vetan a Toisón).
- **Diseño:** chat + tarjetas; sin app en tiendas.
- **Críticas:** no encontradas (producto nuevo); su propio artículo admite «sin informe fiscal descargable; lo hacen mejor MiCartera y Filios».
- **Fiscalidad española:** estima impuesto de una venta, traspasos, Letras. Sin informe, sin 720/721.
- Fuentes: https://www.wealthmaia.com/es · https://www.wealthmaia.com/es/blog/mejores-apps-seguir-cartera-inversion-espana

#### Autodeclaro (autodeclaro.es)
- **Qué es / quién:** Autodeclaro Soluciones SL (fundador Daniel), «software desarrollado en España»; genera **720, 721, 210, Renta (ganancias/pérdidas) y cripto** a partir de extractos; «totalmente anónimo, solo email». Partners: Lightyear (20 % dto., 3-feb-2026), Raisin (Auto-720).
- **Precio (según comparativa AllInvestView con precios de nov-2026):** Gratuito (720 parcial); **Premium 45 €** (65 sin rebaja; 20 posiciones); **Unlimited 55 €** (75; ilimitado); Golden 130 € (180; profesional revisa y presenta); Hands Off 250 € (450; preparan los extractos). Un usuario en 2023 citaba 15 €/70 €.
- **Datos:** PDF/CSV de 20+ brókers (DEGIRO, IBKR, XTB, Revolut, Trading 212, eToro, TR, Scalable, HeyTrade, Freedom24, Saxo, Mintos, Coinbase, Binance…); plantillas CSV; «integración directa con algunos».
- **IA:** no mencionada.
- **Críticas:** Trustpilot 4,9/5 (986 reseñas) y Google 4,9 (465). Única queja vista: instrucciones del 721 solo en el email (31-mar-2024). Rankia (18-may-2026): «me evita problemas con los tipos de cambio oficiales; subí los PDF de TR y Raisin y obtuve el archivo listo para Hacienda».
- **Fiscalidad española:** 720 con saldo medio Q4, 721, 210, P&L con FIFO y dividendos, D6 no mencionado. No es tracker.
- Fuentes: https://autodeclaro.es/ · https://www.allinvestview.com/es/autodeclaro-vs-allinvestview-modelo-720/ · https://nz.trustpilot.com/review/autodeclaro.es?page=2 · https://www.rankia.com/foros/fiscalidad/temas/7112103-modelo-720-autodeclaro-opiniones · https://lightyear.com/en-es/blog/lightyear-autodeclaro · https://www.raisin.com/es-es/autodeclaro-web-es/

#### Lait (lait.finance)
- **Qué es / quién:** «Live Asset Intelligence», panel de patrimonio hecho en Barcelona: cripto, bolsa, bancos, inmuebles (valoración €/m²), coches, relojes y deudas. Datos AES-256 en Fráncfort.
- **Precio (blog 11-abr-2026, revisado sep-2026):** gratis sin tarjeta ni caducidad; **Premium 7,99 €/mes o 59,99 €/año**, 7 días de prueba.
- **Funciones:** CSV/Excel de 40 bancos; 15 plataformas/monederos cripto; **sync de brókers vía SnapTrade (Premium)**; **estimación de IRPF del ahorro e Impuesto sobre el Patrimonio (Premium)**; EUR/USD; Open Banking previsto 2027.
- **IA:** no mencionada. **Fiscalidad:** estimación, no informe; sin FIFO declarado, sin 720/721.
- Fuente: https://www.lait.finance/blog/es/best-portfolio-trackers-europe-2026

#### Renta Cartera (rentacartera.com)
- **Precio (web, 4-nov-2026):** Gratis (1 cartera, 10 compras/ventas); **Pro 4,99 €/mes o 49,99 €/año**, IVA incluido.
- **Funciones:** FIFO por valor entre todas las cuentas; **regla de 2 meses con fecha de liberación de la pérdida** (1 año para no cotizados; no a cripto); resumen anual de ganancias, pérdidas, retenciones y dividendos exportable CSV/imprimible; pérdidas no compensadas guardadas; divisas con tipo del extracto o BCE; simulador de venta; XIRR; historial de importaciones con deshacer; avisos de calidad de datos.
- **Datos:** IBKR (CSV y Flex Web Service), DEGIRO CSV, Quantfury PDF, plantilla CSV/XLSX genérica, previsualización antes de aplicar.
- **IA:** no. **No:** casillas, traspasos de fondos, 720/721, app móvil.
- Fuente: https://rentacartera.com/

#### Margen (getmargen.com), Moninvestrack, Dinerio
- **Margen** (Margen SL, «hecho en España», 9-may-2026): acciones, ETF, fondos UCITS (precios Frankfurt/Morningstar), cripto (CoinGecko), Yahoo Finance; P&L en euros; simulador de préstamos y gastos; gratis 5 posiciones / «30 movimientos al mes gratis»; Pro sin precio publicado; sin conexión a brókers, sin fiscalidad. https://getmargen.com/blog/tracking-inversiones-gratis-espana
- **Moninvestrack** (fundador «Juan», beta cerrada, 2026): fondos/ETF/acciones/cripto con cotizaciones automáticas, registro manual, PWA con push; Premium «pronto» (CAGR, Sharpe, MWRR, Monte Carlo, solapamiento de fondos, calendario de dividendos); sin fiscalidad, sin precio. https://moninvestrack.com/
- **Dinerio** (app española iOS/Android/web): finanzas personales + registro manual de fondos, ETF, acciones, cripto y planes de pensiones; **2,99 €/mes** tras 14 días (Split gratis); sin importación ni fiscalidad (14-sep-2026). https://dinerioapp.es/blog/mejores-apps-registrar-inversiones/

### C2. Portales: Finect, Rankia, Fintonic

#### Finect
- **Finect Plus** (lanzado 2-mar-2026): **11,99 €/mes o 99,99 €/año IVA incl.** Cartera centralizada de **fondos, ETF y planes de pensiones** (sin acciones ni cripto) con entrada manual por compra; «+Ray» (diversificación real, geografía, sectores); Supercomparador de 15 productos (rentabilidad, volatilidad, comisiones, Sharpe); Trends; favoritos ilimitados. Sin fiscalidad, sin IA, sin conexión bancaria descrita. Fuentes: https://www.finect.com/usuario/__Finect/articulos/llega-finect-plus-el-nuevo-espacio-personalizado-para-llevar-tu-inversion-al-siguiente-nivel · https://www.finect.com/usuario/__Finect/articulos/como-seguir-todas-tus-inversiones-en-fondos-etfs-y-planes-desde-un-solo-sitio-finect-plus
- **Finect «Tu Dinero»** (agregador bancario gratis, 2017; conexiones diarias automáticas, comparación con la comunidad, costes y rentabilidades a 3 años): la página sigue viva pero con fecha 2017; estado actual no confirmado. https://www.fundssociety.com/es/formate-a-fondo/una-nueva-herramienta-permite-agregar-todos-productos-financieros/
- **Usuarios de Finect** (pregunta «app para seguimiento y control de inversiones», ~2022): piden FIFO, primas de emisión y traspasos; Excel «no lo hace sin VBA»; Morningstar «ha cambiado y no funciona» (~2025). https://www.finect.com/preguntas/3013/app-para-seguimiento-y-control-de-inversiones

#### Rankia
- **MyPortfolio** (podcast 5-feb-2026, Desafío Rankia desde 2-mar-2026): crear/simular carteras de acciones, ETF y fondos; **backtesting**; concentración; X-Ray; TWR/MWR frente a benchmarks; volatilidad y Sharpe; carteras públicas y «Almas Gemelas» (usuarios con activos parecidos); torneo. Gratis (precio no indicado). Sin fiscalidad, sin importación de bróker, sin IA. https://www.rankia.com/blog/such/7181671-113-como-analizar-mejorar-tus-inversiones-myportfolio
- **Cartera Rankia / Mi Cartera** (2016–2018, apps iOS/Android gratis): buscador con filtros (VaR, volatilidad), comparador, **optimizador Markowitz**, score propio, informe PDF con diagnóstico automático, «Mis Objetivos» con ajuste por inflación e impuestos, comunidad. Comentarios de caída de la app (2021) y movimientos perdidos (2023). https://www.rankia.com/blog/rankia/3361539-cartera-rankia-haz-seguimiento-tus-inversiones-web-app-para-movil

#### Fintonic
- **Ya no es competidor en inversión.** Hoy: agregador bancario (BdE nº 6935) + bróker de préstamos («hasta 50.000 € desde 5,99 % TAE»), FinScore/CreditBuilder, seguros, cuentas remuneradas; **«agente de iA»** para dudas y simular préstamos; «más de 2 millones de usuarios»; gratis. Su cuenta y tarjeta cerraron el 31-ene-2023. Nada de fondos/brókers. Roams: 3/5 con 145 opiniones; quejas de verificación de identidad y soporte (19-jun-2026). https://www.fintonic.com/ · https://roams.es/finanzas/entidades-financieras/fintonic/opiniones/

### C3. Brókers y gestores españoles (apps que marcan el estándar y dan el informe fiscal)

| Entidad | Qué es / coste clave (fecha) | App e informe fiscal | IA | Críticas de usuarios |
|---|---|---|---|---|
| **MyInvestor** (Andbank) | Neobanco: 2.400+ fondos sin comisión, ETF/acciones 0,12 % (mín. 1 €/3 €, máx. 25 €), divisa 0,30 %; **Premium 7,99 €/mes** (ETF sin mínimo, cuenta en USD, divisa 0,25 %) (Finect, 3-nov-2026; myinvestor.es) | Informa a la AEAT (sin 720), posiciones en el borrador; traspasos de fondos; roboadvisor desde 150 €; alternativos; sin agregador, sin informe fiscal destacado | No | App Store 3,6/5 (4,6 k); reseñas escritas 2,7/5: apertura de cuenta de meses (3-sep y 4-oct-2026), soporte (12 menciones), app pide actualizar para firmar (15-sep-2026), «difícil de navegar al principio» (13-oct-2026). Elogios: comisiones y catálogo. https://mwm.ai/apps/myinvestor-banco-inversi-n/1587906669 |
| **Indexa Capital** | Roboadvisor: gestión 0,338 % + custodia 0,093 % + fondos 0,096 % = **0,527 %/año** medio; mínimo 1.000 € (500 € segunda cuenta), pensiones 50 €; **183.582 clientes, 6.450 M€** (web, ~2-nov-2026) | **Informe fiscal en el área privada**; retención 19 % en reembolsos; traspasos desde otras entidades; sin 720/D6 (custodia España); app para ver, aportar y retirar | No («gestor automatizado») | Margen: «solo muestra la cartera de Indexa, no consolida». https://indexacapital.com/es/esp |
| **Trade Republic** | 1 €/orden (+spread LS Exchange), planes gratis, IBAN español, cuenta remunerada (Rankia 3-nov-2026) | Envía **informe anual** que el usuario traslada a mano al Modelo 100; desde el IBAN ES retiene IRPF (un usuario vio retención retroactiva del 19 %, 7-ago-2025); **720: fuentes contradictorias** (Dinerio: «sin 720»; Jean Galea 30-oct-2026: «custodia extranjera, aplica 720/721») | No | Rankia (ago-2025): bizums sin llegar, cuentas bloqueadas, «chat no responde», límite de operativa tras migrar IBAN; Jean Galea: sin automatización fiscal, análisis mínimo, divisa escondida en el tipo de cambio. https://www.rankia.com/foros/bolsa/temas/5135420-seguimiento-opiniones-trade-republic?page=264 · https://jeangalea.com/trade-republic-review/ |
| **Revolut Invest / Robo** | Invest: 1 €/orden tras las gratis del plan (Estándar 0, Premium 5, Metal/Ultra 10); **Robo-Advisor 0,75 %/año**, desde 100 €, 5–8 ETF (revolut.com/es-ES/robo-advisor/) | Revolut Securities Europe UAB (Lituania): **los valores sí van al 720** aunque el IBAN sea ES (Autodeclaro en Rankia, 10-feb-2026); informe fiscal no mencionado | No | «No es un bróker tradicional, es una función de la app» (Finect). |
| **Bankinter Broker** | Bróker Cero 0 € nacional online; sin él 3,95 € (<2.000 €), 8 € (2.000–60.000), 0,07 %; custodia 0,04 %/trim. (Finect, 3-nov-2026) | Varias plataformas según perfil, formación | No encontrado | fondosindexados.net (23-oct-2026): «aplicaciones antiguas y con menos opciones». Web oficial no accesible. |
| **Openbank** (Santander) | 1 €/operación (desde 10-sep-2026), custodia gratis (1-oct-2026), divisa 0,70 %→1 % (10-nov-2026), dividendos 0,25 % (Finect) | Fondos con traspaso, roboadvisor; **IA: precios objetivo a 1, 3 y 6 meses para 1.000+ acciones** (Finect, 3-nov-2026) | **Sí** | Trustpilot 3,3/5: bloqueos de cuentas y demoras. Web oficial no accesible. |
| **Inversis / Andbank** | Inversis (Banca March) es plataforma B2B para entidades; Andbank es banca privada y dueño de MyInvestor. Web no accesible en esta sesión. | no encontrado | no encontrado | no encontrado |
| **Renta 4** | Nacional 4 € (<6.000 €)/9 €/0,10 %; divisa 0,30 % (mín. 10 €); custodia 0,0125 %/mes; mantenimiento 3 €/mes salvo actividad (Finect, Rankia) | Alertas email/SMS, órdenes condicionadas, streaming, terminal; fondos sin comisión de traspaso; asesores. Informe fiscal no destacado en r4.com/broker-online | No | Rankia: «no es la más barata; no encaja con el trading online de acciones». |
| **Self Bank / Singular Bank** | Self Bank sigue como marca online de Singular Bank («Self Bank by Singular Bank»): desde 6,95 € nacional, 15 € Europa/EEUU; custodia 4,99 €/mes/mercado si <3 operaciones; cuenta sin custodia desde 12 € (Finect) | Análisis técnico de expertos, Pro Real Time, banqueros; sin informe fiscal/IA en la web | No | fondosindexados.net: «muchas opciones que pueden confundir». https://www.selfbank.es/invertir/bolsa |
| **ING Broker Naranja** | 3 € + 0,10 % (1,5 € + 0,05 % con 15 op./trim.), máx. 20 €; 600+ ETF sin comisión de compra; custodia 4,84 €/trim. si no operas (Rankia, economiaresponsable 23-oct-2026) | Retiene IRPF; informe anual «sirve para la Renta» (usuario Rankia, 2021); selector de ETF, stop loss | No | «App no muy intuitiva» (Rankia); «web limitada» (Rankia 2021); reembolsos de ETF hasta un mes. |
| **Finizens** | Roboadvisor: mínimo 1.000 € (50 € pensiones/niños), «comisiones que bajan cada año», Premium >100.000 €; **25.947 clientes, 675 M€** (web 2026) | Traspasos desde otra entidad, rebalanceo diario, apps iOS/Android; «evita recopilar informes fiscales» sin detallar | No | no encontrado |
| **inbestMe** | Roboadvisor: desde 1.000 €; «70 % más barato que lo tradicional» (sin cifra en portada, 6-mar-2026) | Traspaso de fondos conectando la gestora, conexión al banco para transferir, varias cuentas por objetivo, Android/iOS | No | no encontrado |
| **Heytrade** | Bróker español (Beka Finance, CNMV), custodio en España; 2.000+ acciones/ETF; «ultra low fees» sin cifra en portada (29-jul-2026) | **Comunica a Hacienda beneficios y retenciones (evita el 720)**; traspaso de cartera; colecciones temáticas; watchlist | No | no encontrado |
| **Ninety Nine** | Web dice «zero commission… coming to Europe», «beta disponible», países: AT, BE, DE, ES, FR, NL, PT; academia; garantía 100.000 € | Nada fiscal | No | Estado operativo real no confirmado. https://www.ninetynine.com/ |
| **Micappital** | Asesor de fondos **sobre la cuenta de tu propio banco**: **2,5 €/mes por cada 1.000 €, máx. 25 €/mes, gratis si no ganas**; AUTOPILOT; 3.100 clientes / «25.000 usuarios» (web 2016–2026) | Sin agregador, sin informe fiscal | No | no encontrado |

Fuentes de la tabla: https://www.rankia.com/blog/mejores-brokers/5829952-mejores-brokers-online-espana (act. 3-nov-2026) · https://www.finect.com/usuario/AsunInfante/articulos/mejores-brokers-online-empezar-invertir (act. 3-nov-2026) · https://dinerioapp.es/blog/mejores-brokers-fondos-indexados-etf/ (14-sep-2026) · https://www.economiaresponsablefinanzas.com/brokers-de-inversion/mejores-brokers-de-inversion/ (23-oct-2026) · https://www.fondosindexados.net/mejores-brokers-de-bolsa-online/ (23-oct-2026) · webs oficiales citadas en cada fila.

---

## D. Tabla comparativa (lo que importa para Toisón)

Leyenda: ● sí · ◐ parcial · ○ no · ? no encontrado. «Toisón 0.8.1» según contexto-toison.md.

| Producto | País | Precio anual mín. de pago | Gratis | Acciones/ETF | Fondos (traspaso) | Cripto | Varios brókers | Importación | FIFO | Regla 2 meses | Casillas M100 | Informe renta PDF | 720 | 721 | IA | App Android | Nota usuarios |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Toisón 0.8.1** | ES | 24,99 € (previsto) | ● | ● | ● | ● | ● | capturas/PDF/CSV/Excel por IA; banco solo fundador | ● | ○ | ○ | ○ | ● | ● | ● Claude | ● | — |
| MiCartera | ES | 19 € (pase) / 99 € | ○ (demo) | ● | ◐ explica | ○ | ● 5 | API + CSV/PDF | ● lote a lote | ● | ● 6 casillas | ● | ◐ | ○ | ● fiscal | ○ | ? |
| Filios | ES | 132 € (11 €/mes) | ● ≤15.000 € | ● | ● registra | ● | ● 6 | informe del bróker | ● BCE | ○ | ◐ importes | ◐ | ● | ● | ○ | ○ PWA | 4,6 TP (67) |
| AllInvestView | ES? | 77,88 € | ● 10 pos. | ● | ○ | ◐ exports | ● 30+ | sync DEGIRO/IBKR + archivos | ● | ● | ◐ | ● + 99 € humano | ● BOE | ○ | ◐ | ● | ? |
| WealthMaia | ES | 35,88 € | ◐ prueba 7 d | ● | ● | ? | ● 12 | CSV/PDF/foto | ? | ○ | ○ | ○ | ○ | ○ | ● central | ○ | ? |
| Autodeclaro | ES | 45–55 € por modelo | ◐ 720 parcial | ● | ○ | ● | ● 20+ | PDF/CSV | ● | ? | ? | ◐ P&L | ● | ● | ○ | ○ | 4,9 TP (986) |
| Lait | ES | 59,99 € | ● | ● | ? | ● | ● SnapTrade | CSV/Excel + sync | ? | ○ | ○ | ○ | ○ | ○ | ○ | ? | ? |
| Renta Cartera | ES | 49,99 € | ● 10 op. | ● | ○ | ○ | ● | CSV/Flex/PDF | ● | ● | ○ | ◐ CSV | ○ | ○ | ○ | ○ | ? |
| Finect Plus | ES | 99,99 € | ◐ | ○ | ● (sin fiscal) | ○ | manual | manual | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ◐ web | ? |
| Rankia MyPortfolio | ES | gratis | ● | ● | ● | ○ | manual | manual | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ◐ | ? |
| Fintonic | ES | gratis | ● | ○ | ○ | ○ | bancos | PSD2 | ○ | ○ | ○ | ○ | ○ | ○ | ● préstamos | ● | 3/5 Roams |
| Waltio | FR | 39 € | ● 50 tx | ○ | ○ | ● | ● 900+ | API/CSV | ● | n/a | ● guía | ● certificado | ○ | ● | ◐ soporte | ○ | 4,1 TP (513) |
| Koinly | UK | 49 € | ● sin informe | ○ | ○ | ● | ● 700+ | API/CSV | ● | n/a | ○ | ● genérico ES | ○ | ○ | ○ | ● | 4,5 TP (2.383) |
| CoinTracking | DE | 39 € | ● sin informe | ○ | ○ | ● | ● 400+ | API/CSV | ● 14 métodos | n/a | ○ | ● ES | ○ | ◐ | ○ | ● | ? |
| Rotki | DE/EU | ~90 € | ● 1.000 ev. | ○ | ○ | ● | ● | API/CSV local | ● config. | n/a | ○ | ◐ P&L | ○ | ○ | ● MCP | ○ | 0 reseñas G2 |
| Divly | SE | 39 € | ● | ○ | ○ | ● | ● | API/CSV | ● | n/a | ● | ● | ○ | ● | ○ | ? | ? |
| TaxDown | ES | 35 € «desde» | ● resultado | ◐ vía AEAT/informe | ◐ | ◐ | ◐ sube informes | borrador AEAT + archivos | ○ propio | ○ | ● presenta | ● presenta | ○ | ○ | ● «TaxDown AI» | ● | 4,3 TP (9.921) |
| Taxfix (ex TaxScouts) | DE | 59,90 € | ○ | ● Avanzado | ● | ● Koinly | humano | AEAT + certificados | humano | humano | ● | ● | ? | ◐ Koinly | ○ | ● | ? |
| Sumio | CZ | 34,99 € | ● | ● manual | ● manual | ● | manual | XLSX | ○ | ○ | ○ | ○ | ○ | ○ | ● resúmenes | ○ iOS | ? |

Brókers/roboadvisors (MyInvestor, Indexa, TR, Revolut, Bankinter, Openbank, Renta 4, Self Bank, ING, Finizens, inbestMe, Heytrade, Micappital): ninguno consolida otros brókers; todos dan informe fiscal propio (TR lo manda en PDF, los españoles vuelcan al borrador); solo Openbank tiene IA visible (precios objetivo). Están en la tabla C3.

---

## E. Lo que hace cada uno que Toisón no tiene (una línea por idea, con origen)

1. **Informe de la renta en PDF con las casillas exactas del Modelo 100 (0328, 0424/0425, 0029, 0597, 0588, 0460) y la fuente de cada importe** — MiCartera, AllInvestView (micartera.app/renta-inversor; allinvestview.com/es/informe-renta-inversores/).
2. **Regla de los 2 meses automática** (y 12 meses para no cotizados), con fecha en que se libera la pérdida y aviso de que AutoInvest/DRIP la disparan — MiCartera, Renta Cartera, AllInvestView.
3. **Optimizador fiscal**: qué vender antes del 31-dic para compensar, con arrastre de 4 ejercicios y límite del 25 % — MiCartera (ojo CNMV: presentarlo como «lo que supondría», no como orden).
4. **Simulador de venta con impuesto estimado antes de vender** — MiCartera, Renta Cartera, WealthMaia.
5. **Modelo 720 generado con fichero BOE (listo para subir a la AEAT), PDF y Excel, con saldo medio del último trimestre** — AllInvestView, Autodeclaro; **semáforo gratis de los 50.000 €** — AllInvestView.
6. **Modelo 721 (cripto en el extranjero) generado** — Waltio, Divly, Filios, Autodeclaro.
7. **Calculadora de doble imposición de dividendos extranjeros (casilla 0588, límite del convenio 15 %, exceso a reclamar en origen)** — AllInvestView, MiCartera.
8. **Importadores oficiales por bróker** (DEGIRO, Trade Republic, IBKR Flex Query, Trading 212, ING, MyInvestor, Revolut, Renta 4, XTB, eToro, Scalable) con detección automática del formato y previsualización con «deshacer» — MiCartera, Filios, AllInvestView, Renta Cartera, Autodeclaro.
9. **Conexión API de solo lectura con DEGIRO/IBKR y sync de 30+ brókers (SnapTrade)** — MiCartera, AllInvestView, Lait, getquin.
10. **Pase de pago único de campaña (19 € / 90 días) además de la suscripción** — MiCartera. Encaja con el lanzamiento del 1 de abril.
11. **Servicio humano opcional: «te preparamos la renta de tus inversiones por 99 €»** o «Golden» con profesional que presenta (130 €) — AllInvestView, Autodeclaro. Resuelve la línea de Anthropic «revisión humana cualificada».
12. **Base general vs base del ahorro para cripto** (staking, airdrops, intereses de cuentas remuneradas tributan distinto) — Waltio, Filios (staking, cuentas remuneradas).
13. **Certificado fiscal / «documentos para inspección o repatriación bancaria»** (prueba de origen de fondos) — Waltio, CoinTracking Expert.
14. **Planes de pensiones, primas de emisión, splits, ampliaciones, spin-off, scrip dividend como movimientos propios** — Filios.
15. **Valoración a 31-dic de toda la cartera por bloque (cuentas / valores / cripto) para 720/721** — Filios, Autodeclaro.
16. **Avisos proactivos cuando una noticia o resultado afecta a una posición tuya (push/email), briefing diario de tu cartera** — WealthMaia, Delta.
17. **Importar la cartera por foto** (además de PDF/CSV) — WealthMaia (Toisón ya lee capturas; la diferencia es que lo venden como gancho de la prueba gratis).
18. **IA medida en mensajes/mes por plan (10/20/300) con packs de recarga (250 mensajes por 5 €)** — MiCartera, WealthMaia. Modelo de coste que encaja con el Worker con topes de Toisón.
19. **Servidor MCP para que el usuario conecte su propio Claude/ChatGPT a sus datos (solo lectura, modos de privacidad)** — Rotki.
20. **Patrimonio total con inmuebles (valoración €/m²), coches, relojes y deudas, y estimación del Impuesto sobre el Patrimonio** — Lait, Sumio.
21. **Tipos de cambio oficiales del BCE para cada operación en divisa** (lo que exige Hacienda) — Filios, MiCartera, Renta Cartera, Autodeclaro.
22. **Comparación de tu cartera con la media de la comunidad / «Almas Gemelas» (usuarios con activos parecidos) / carteras públicas y torneo** — Finect Tu Dinero, Rankia MyPortfolio y Cartera Rankia.
23. **Backtesting de una cartera y optimizador de pesos (Markowitz) con VaR y beneficio de diversificación** — Rankia MyPortfolio / Cartera Rankia.
24. **Supercomparador de hasta 15 fondos/ETF a la vez con comisiones, volatilidad y Sharpe, con comparativas guardadas** — Finect Plus.
25. **Precios objetivo a 1, 3 y 6 meses generados por IA para 1.000+ acciones** — Openbank (ojo Reglamento de Abuso de Mercado/CNMV).
26. **Cobertura explícita de sanciones por error del servicio y precio cerrado** — Taxfix (señal de confianza para la campaña).
27. **Descuentos por alianza con el bróker** (DEGIRO–TaxDown 30 %, Lightyear–Autodeclaro 20 %, Raisin–Autodeclaro, Bitvavo–Waltio) — canal de adquisición que Toisón no explota.
28. **Garantía de devolución de 30 días y cancelación desde el portal de Stripe** — WealthMaia; **devolución si no se puede preparar el informe** — AllInvestView.
29. **Modo anónimo: solo un email, sin cuenta** para un trámite puntual — Autodeclaro.
30. **Exportación CSV «para tu asesor»** de todo el histórico fiscal — Renta Cartera, Moninvestrack, Filios.

---

## F. Hallazgos que cambian el plan (resumen para el agente principal)

1. **Ya hay competencia directa española en 2026**, nacida en los últimos 12–18 meses: MiCartera, Filios, AllInvestView, WealthMaia, Lait, Renta Cartera (y Autodeclaro para los modelos). Toisón no llega a un hueco vacío sino a una ola; su ventaja es ser la única que junta cripto + fondos traspasables + acciones + Android + IA sobre toda la cartera, y su desventaja es no tener informe de la renta en PDF con casillas, que todos los rivales fiscales sí tienen.
2. **El informe PDF con casillas del Modelo 100 + regla de los 2 meses + 720 con fichero BOE es el estándar mínimo de la categoría «cartera + renta»** (MiCartera, AllInvestView, Filios). Sin eso, Toisón no puede venderse para la campaña del 1 de abril frente a un pase de 19 €.
3. **Precios de mercado:** trackers españoles cobran 2,99–7,99 €/mes (WealthMaia 35,88 €/año, Renta Cartera 49,99, Lait 59,99, AllInvestView 77,88, MiCartera 99, Finect Plus 99,99, Filios 132+). Los 24,99 €/año de Toisón quedan por debajo de todos salvo el pase de 19 € de MiCartera y el Básico de WealthMaia. Hay margen para 29,99–34,99 €/año si incluye el informe PDF; y un **pase de campaña de pago único (19–25 €)** es una fórmula probada.
4. **La IA ya no diferencia por sí sola**: WealthMaia la hace central (y roza la recomendación personalizada que CNMV/Anthropic prohíben a Toisón), MiCartera tiene asistente fiscal con cupos de mensajes, Rotki expone MCP, Openbank da precios objetivo con IA, Fintonic tiene agente de préstamos. Lo que diferencia es IA + datos fiscales correctos + «la misma idea para todos con el impacto en tu cartera».
5. **Los importadores por bróker son la puerta de entrada**: todos los rivales listan 5–30 brókers con formato detectado; MiCartera y AllInvestView ya tienen API con DEGIRO/IBKR/TR. Toisón importa «por IA» desde cualquier archivo, lo cual es más flexible pero menos fiable para FIFO lote a lote; conviene añadir plantillas oficiales para los 6–8 brókers españoles más usados (MyInvestor, TR, DEGIRO, IBKR, Revolut, ING, Indexa, Bitvavo) y vender la lista.
6. **Las quejas de los usuarios españoles son siempre las mismas** (Trustpilot Koinly/Waltio/TaxDown, Rankia TR): soporte que no responde o es un bot, renovaciones cobradas sin avisar, informes que no cuadran con lo que pide la AEAT, «no me da el cálculo, solo el certificado». Toisón puede ganar con: mostrar el cálculo lote a lote, aviso 7 días antes de renovar, soporte humano del fundador.
7. **Canal:** las alianzas bróker–herramienta fiscal (DEGIRO–TaxDown hasta 1-abr-2027, Lightyear y Raisin con Autodeclaro, Bitvavo con Waltio) son el canal de adquisición de la categoría. Un acuerdo con un bróker pequeño español (Heytrade, MyInvestor) o un exchange (Bitvavo ya usa Waltio) sería más barato que la Play Store.
8. **Confusiones legales que Toisón puede aclarar mejor que nadie:** Trade Republic y Revolut con IBAN español siguen siendo custodia extranjera a efectos del 720 (fuentes contradictorias en Dinerio vs Jean Galea/Autodeclaro); MyInvestor, Indexa, Heytrade, ING informan a la AEAT y no requieren 720. Una tabla «¿tu bróker te obliga al 720?» es contenido que trae tráfico.
9. **Fintonic ya no cuenta**, Sumio no es española, Ninety Nine está en «beta/coming» y TaxScouts es Taxfix: cuatro nombres de la lista original que se pueden tachar del mapa competitivo.
