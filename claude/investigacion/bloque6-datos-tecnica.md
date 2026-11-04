# Bloque 6 — Datos y técnica (Toisón, 4 nov 2026)

Cómo se hizo: búsquedas web (modo extended donde hacía falta) y lectura de las páginas oficiales de precios/documentación con fecha de hoy (4 nov 2026) salvo que se indique otra. A media investigación se agotó el cupo de búsquedas web compartido entre agentes, así que los puntos 4–8 se cubrieron abriendo páginas oficiales conocidas y clonando el repo de Portfolio Performance; lo que no pude verificar lo marco como **[sin verificar hoy]**. Precios en la moneda original; la conversión a euros es aproximada (≈ ×0,9 €/US$, sin comprobar el cambio de hoy) y va marcada con «≈».

Resumen en una frase: **ningún proveedor por debajo de 50 €/mes vende licencia para mostrar precios a usuarios finales con fondos europeos por ISIN**; el dato bueno es que EODHD tiene ~70.000 fondos europeos por ISIN (incluidos los españoles) a 19,99 $/mes para uso personal y licencia comercial «a presupuesto», y que casi todo lo demás (cripto, divisas, dividendos, push, auth, hosting) sale gratis o por céntimos.

---

## 1. Proveedores de precios con licencia

### 1.1 Tabla comparativa

| Proveedor | Plan y precio | Cobertura | Fondos UE por ISIN | ETF UCITS (Xetra/Euronext/BME) | Retraso | Llamadas | Licencia comercial / mostrar a usuarios | Fuente (fecha) |
|---|---|---|---|---|---|---|---|---|
| **EODHD** | Sandbox 0 $ (20 llamadas/día, 1 año). **Historian (EOD All-World) 19,99 $/mes** (16,58 $/mes anual, ≈15–18 €). Active trader 29,99 $. Fundamentals 59,99 $. All-in-one 99,99 $ | 70 bolsas, «150.000+ tickers». Bolsa virtual **EUFUND**: 69.327–73.881 fondos europeos en EUR | **Sí**: ticker = ISIN.EUFUND. Comprobado hoy Bestinfond (ES0114673033) y varios Caixabank; Allspring LU1963832719; dato «as of 2 nov 2026» | Sí (XETRA, LSE, PA, F listados; MC no aparece en la página de bolsas que leí pero sí en su web **[sin verificar hoy]**) | Fin de día; «live» con 15 min de retraso. Precios agregados VWAP de 100+ fuentes, **no feeds de bolsa** | 100.000/día, 1.000/min en pago (fondos cuestan 1 llamada; fundamentales 10) | **Planes de la web = solo uso personal.** «Selling, reselling, retransmitting, redistributing, displaying…» prohibido al no profesional. Comercial = planes B2B a presupuesto (formulario), reportan usuarios comerciales a las bolsas, alta en ~3 días | [pricing](https://eodhd.com/pricing), [personal vs comercial](https://eodhd.com/financial-apis/commercial-vs-personal-license-use), [T&C](https://eodhd.com/financial-apis/terms-conditions), [EUFUND pág. 620](https://eodhd.com/exchange/EUFUND?page=620), [Bestinfond](https://eodhd.com/financial-summary/ES0114673033.EUFUND), [bolsas](https://eodhd.com/financial-apis/exchanges-api-list-of-tickers-and-trading-hours) (4 nov 2026) |
| **Financial Modeling Prep** | Basic 0 $ (250/día, 5 años). Starter 19 $/mes anual (29 mensual) **solo EE. UU.** Premium 49 $ (69) añade UK/Canadá. **Ultimate 99 $ (139) = global** + holdings de ETF/fondos | Global solo en Ultimate | No confirmado (hay «mutual fund holdings», no VL por ISIN de UCITS) | Solo en Ultimate | EOD; intradía en planes altos | 300–3.000/min | «Displaying or redistributing data sourced from FMP requires a specific Data Display and Licensing Agreement» (precio no publicado) | [pricing](https://site.financialmodelingprep.com/pricing-plans) (4 nov 2026) |
| **Twelve Data** | Individual (solo personas, no comercial): Basic 0 $ (8 créditos/min, 800/día); Grow 29/49/79 $; **Pro 99 $** (añade VL de fondos y tiempo real UE). **Business: Venture desde 149 $/mes** (≈135 €; 610 créditos/min, «external display access»); Enterprise 1.099 $. En la página business aparece también Venture a 499 $: confirmar con ellos. Startups −20 % el primer año | 70+ mercados en Pro/Venture; «200.000+ fondos en 50+ países» | VL diario de fondos sí, pero con símbolos propios (0P0001LCQ3…); **búsqueda por ISIN no confirmada** | Sí | Tiempo real UE desde Pro/Venture | Sin tope diario en pago | **Sí, desde Venture** (149 $/mes). Usar plan individual para un negocio viola los TOS | [pricing.md](https://twelvedata.com/pricing.md), [pricing-business](https://twelvedata.com/pricing-business), [blog fondos](https://twelvedata.com/blog/introducing-mutual-funds-apis) (4 nov 2026) |
| **Alpha Vantage** | Gratis 25/día. Premium 49,99 $/mes (75/min) a 249,99 $ (1.200/min) | Centrado en EE. UU. | No | No descrito | 15 min / tiempo real US | Sin tope diario en pago | No dicen nada de redistribución | [premium](https://www.alphavantage.co/premium/) (4 nov 2026) |
| **Marketstack (apilayer)** | Free 100/mes (no comercial). **Basic 9,99 $/mes** (10.000 peticiones). Professional 49,99 $ (100.000). Business 149,99 $ | 70 bolsas, «2.700+ exchange info» | **No** (sin fondos) | Probable (XMAD/XETR) **[sin verificar hoy]** | EOD; intradía solo IEX (US) | 10.000/mes en Basic | Planes de pago «commercial use allowed»; no detallan «display». Sin fondos no sirve para Toisón | [product](https://marketstack.com/product) (4 nov 2026) |
| **Tiingo** | Power 30 $/mes (individual, interno). Commercial 50 $/mes (interno). **Redistribución EOD+IEX 250 $/mes startups** / 500 $ empresas | 110.432 valores; 60.805 ETF y fondos, sobre todo EE. UU. | No confirmado para UCITS | Parcial | EOD | 10.000/h, 100.000/día | Solo con el plan de redistribución (250 $/mes ≈ 225 €) | [pricing](https://www.tiingo.com/about/pricing), [iex-api](https://www.tiingo.com/products/iex-api) (4 nov 2026) |
| **Finnhub** | Free 60/min (personal). **All-In-One 3.500 $/mes** pagado anual. Sin plan intermedio | Global | No | Sí | — | — | Apps monetizadas → plan de pago | [apicostcalc, verificado 11 oct 2026](https://apicostcalc.com/finnhub.html) |
| **Polygon → Massive** | 29 / 79 / 199 $ por clase de activo. Business Stocks 2.499 $/mes | **Solo acciones de EE. UU.** (forex/cripto global) | No | No | — | — | Business plans | [apicostcalc 12 sep 2026](https://apicostcalc.com/blog/polygon-massive-rebrand-api-pricing.html), [massive vs yfinance oct 2026](https://massive.com/compare/massive-vs-yfinance) |
| **Morningstar Direct Web Services** | Contrato anual empresa, sin precio público; «display» y redistribución se licencian aparte | Global, el mejor en fondos | Sí | Sí | — | — | Sí, pero cinco cifras al año y ciclo de ventas | [comparativa FundFacts 13 oct 2026](https://fundfactsapi.com/blog/fund-data-providers-for-developers-2026) |
| **FundFacts API** | Free 5 peticiones/mes; Starter 9,99 $ (60); **Pro 49 $ (1.000, uso comercial)**; Scale 249 $ | Fichas de fondos UCITS/ETF por ISIN de los emisores que conocen | Sí (ficha + VL del día, no histórico) | Sí (fichas) | Dato con `dataAsOf`, caché 24 h | 1.000/mes en Pro | Sí desde Pro, pero cobertura limitada a emisores conocidos | [misma fuente](https://fundfactsapi.com/blog/fund-data-providers-for-developers-2026) |
| **Yahoo Finance (yfinance, yahoo-finance2, RapidAPI, Apify)** | 0 $ | La mejor cobertura gratuita de valores no-US y fondos | Sí (por ticker, no por ISIN directo) | Sí | 15 min | Límites no publicados; 429 frecuentes | **No hay API oficial.** Los términos de Yahoo prohíben usar sus APIs para ganar dinero sin permiso escrito; el README de yfinance dice «uso personal». Roturas: ene-2023, jul-2023, may-2025; en 2026 funciona pero a merced de Yahoo. Los wrappers de RapidAPI/Apify son scraping con el mismo problema legal | [massive vs yfinance (24 oct 2026)](https://massive.com/compare/massive-vs-yfinance), [Medium 2025](https://medium.com/@trading.dude/why-yfinance-keeps-getting-blocked-and-what-to-use-instead-92d84bb2cc01), [issue #2422](https://github.com/ranaroussi/yfinance/issues/2422) |
| **Stooq** | 0 $ (CSV) | Amplia, EOD | No | Parcial | EOD | — | Términos no leídos (se agotó la búsqueda) **[sin verificar hoy]** | — |
| **Investing.com (investpy/investiny)** | 0 $ | — | — | — | — | — | investpy muerto desde 2022 («use investiny»), no oficial, bloqueos Cloudflare. Descartar | [discusión 612](https://github.com/alvarobartt/investpy/discussions/612) |
| **BME Market Data (oficial)** | Anexo 4 (1 jul 2025, sin IVA, +IPC anual): licencia de uso y distribución SIB N1 **11.113 €/año**; dataset «diferido» N1 5.557 €/año; **usuario activo N1 4,20 €/mes**; usuario no profesional N1+ 3,50 €/mes + 0,01 €/cotización. La información diferida es pública gratis en la web de BME «en formato procesable», pero usarla comercialmente vía vendor exige contrato | Solo BME | No (fondos no cotizan) | Sí (ETF en BME) | 15 min | — | Sí, pero fuera de presupuesto | [Anexo 4 tarifas](https://www.bolsasymercados.es/dam/descargas/servicios-de-datos/anexo-4-tarifas-es.pdf) (doc. 1 jul 2025, leído hoy) |

Nota sobre dividendos/splits de EODHD: incluidos en Historian y superiores; cubren acciones y fondos/ETF de EE. UU., Europa, Asia…; fechas de declaración/registro/pago «sparse» en Europa (record date de LSE casi siempre nulo). 1 llamada por petición. [Fuente](https://eodhd.com/financial-apis/api-splits-dividends) (4 nov 2026).

### 1.2 Respuesta a la pregunta clave

- **¿Quién da VL diarios de fondos europeos por ISIN por menos de 50 €/mes?** Solo **EODHD** (EUFUND, ~70.000 fondos, incluidas gestoras españolas; 19,99 $/mes) y, con límites, **FundFacts** (49 $/mes, solo fondos de los emisores que tienen). Twelve Data los tiene desde 99 $ (personal) / 149 $ (negocio) pero con símbolos propios. FMP solo en Ultimate (99 $) y sin confirmar VL por ISIN. Los demás no tienen fondos UCITS.
- **¿Y ETF UCITS en Xetra/Euronext/BME?** EODHD, Twelve Data, FMP Ultimate, Marketstack y Yahoo los tienen; Polygon/Massive y Alpha Vantage no.
- **¿Con licencia para mostrarlos a usuarios de pago?** Ninguno de los baratos. Las opciones reales son: EODHD B2B (precio a pedir), Twelve Data Venture (149 $/mes ≈ 135 €), Tiingo Redistribution (250 $/mes, pero sin fondos UE). Marketstack Basic (9,99 $) permite uso comercial pero no tiene fondos.

### 1.3 Recomendación

1. **Ya**: alta en EODHD Historian (19,99 $/mes, o 199 $/año ≈ 180 €) para desarrollo y para la cartera de Carlos y amigos (uso personal: encaja mientras Toisón no cobre). Montar el feed de fondos por ISIN.EUFUND y el de ETF/acciones europeas con él; dejar Yahoo solo como respaldo.
2. **Esta misma semana**: pedir presupuesto B2B a EODHD explicando «app de seguimiento, <1.000 usuarios, EOD y 15 min, sin tiempo real, sin redistribución en bruto». Si sale ≤ 100 €/mes, es la opción. Argumento: sus precios no vienen de feeds de bolsa (lo dicen en sus T&C), así que no hay tasas de bolsa que repercutir.
3. **Plan B**: Twelve Data Venture con el 20 % de startup (≈ 119 $/mes ≈ 107 € el primer año), que incluye «external display». Confirmar búsqueda por ISIN antes.
4. **Antes de cobrar (1.0, abril 2027)** hay que tener firmada una licencia o Toisón estaría mostrando datos sin derecho. Esto obliga a meter 100–150 €/mes de datos en el modelo: con 2,99 €/mes hacen falta ~40–50 suscriptores solo para pagar los datos.
5. Divisas, cripto y dividendos: ver punto 2, salen gratis.

---

## 2. Cripto, divisas, splits y dividendos

| Servicio | Qué da | Precio | Límites | Licencia | Fuente (fecha) |
|---|---|---|---|---|---|
| **Bitvavo API** (ya en uso) | Precios y mercados públicos sin clave; cartera con clave | 0 € | **1.000 puntos de peso/min** por IP (público) o por clave; bloqueo de 15 min por IP si se pasa, 1 min por clave; 429 código 105 | Developer Agreement no leído hoy | [rate limits](https://docs.bitvavo.com/docs/rate-limits/) (4 nov 2026) |
| **CoinGecko** | 17.000+ monedas, histórico | **Demo 0 $**: 10.000 créditos/mes, 100/min, **atribución obligatoria**. Basic 35 $/mes (29 anual), 100.000 créditos, «Commercial». Analyst 129 $/mes (103 anual), 500.000 | — | Demo: la columna de licencia está en blanco (no dicen que permita uso comercial); de Basic en adelante «Commercial» | [pricing](https://www.coingecko.com/en/api/pricing) (4 nov 2026) |
| **CoinMarketCap** | Similar | **Basic 0 $**: 15.000 créditos/mes, 50/min, **«Basic through Professional all include commercial use rights»** (1 producto, ≤100.000 usuarios, sin reventa). Builder 29 $, Startup 79 $ | — | Sí, en el gratis | [pricing](https://coinmarketcap.com/api/pricing/) (4 nov 2026) |
| **Binance API pública** | Precios spot | 0 € | — | **[sin verificar hoy]** | — |
| **BCE tipos de referencia** | ~29–30 divisas frente al euro, publicación ≈16:00 CET cada día TARGET; XML, CSV, SDMX | 0 € | Ninguno | «Solo informativo», desaconsejan usarlos para transacciones; para valorar una cartera sirven | [BCE](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html) (4 nov 2026) |
| **Frankfurter** | Tipos del BCE + 106 fuentes oficiales, 228 divisas, histórico | 0 €, sin clave, **sin cuotas** (solo anti-abuso), uso comercial permitido en los tipos «blended»; se puede autoalojar con Docker | — | Open source | [frankfurter.dev](https://frankfurter.dev/) (4 nov 2026) |
| **exchangerate.host (apilayer)** | Tipos de bancos y BCE | Free 100 peticiones/mes **no comercial**; Basic 14,99 $/mes (10.000, cada hora) | — | Comercial desde Basic | [pricing](https://exchangerate.host/pricing) (4 nov 2026) |
| **Splits y dividendos** | EODHD (ver 1.1): bueno en EE. UU., aceptable en Europa, fechas extra incompletas. FMP: en planes de pago. Yahoo: lo que usa Toisón ahora (sin licencia) | Incluido en EODHD Historian | 1 llamada por petición | La de EODHD | [EODHD splits-dividends](https://eodhd.com/financial-apis/api-splits-dividends) |

**Recomendación**: Bitvavo (ya) + CoinMarketCap Basic gratis con derechos comerciales como segunda fuente de cripto (en vez de CoinGecko Demo, que exige atribución y no garantiza uso comercial). Divisas: BCE directo (o Frankfurter como API cómoda) — 0 €. Dividendos y splits: los de EODHD, en el mismo plan. Coste del bloque: 0 € extra.

---

## 3. Agregación bancaria y de brókers en Europa

| Proveedor | Qué hace | Precio para una app pequeña | Licencia necesaria | Bancos españoles | Brókers (MyInvestor, TR, Revolut, IBKR, DEGIRO) | Fuente (fecha) |
|---|---|---|---|---|---|---|
| **Enable Banking** (lo usa Carlos) | PSD2 AIS (cuentas y movimientos) | **Desde abril 2026 ya no hay lista de precios pública**: formulario «Get a Quote». Sandbox gratis | Enable Banking Oy es AISP registrado en Finlandia (FIN-FSA). Si el cliente puede ir «bajo su licencia» no lo dice la web pública: **preguntar** | Sí (en el changelog aparecen ING ES y Openbank ES/DE/PT) | **No**: PSD2 solo cubre cuentas de pago. Revolut aparece como banco, no como bróker | [changelog marzo 2026 (8 abr 2026)](https://enablebanking.com/blog/2026/04/08/enable-banking-changelogmarch-2026), [openbankingtracker](https://openbankingtracker.com/api-aggregators/enablebanking), [dev.to 16 ago 2026](https://dev.to/johnfrandsen/the-cheapest-open-banking-apis-for-small-businesses-and-indie-builders-in-2026-5cab) |
| **GoCardless Bank Account Data** (ex Nordigen) | PSD2 AIS | **Altas nuevas deshabilitadas** («new signups disabled»); el plan gratis desapareció. Los clientes existentes siguen | — | — | No | [dev.to jul 2026](https://dev.to/johnfrandsen/gocardless-bank-account-data-alternatives-what-to-use-when-signups-are-disabled-326d) (la página oficial `bankaccountdata.gocardless.com/new-signups-disabled` bloquea robots; no pude leerla) |
| **Tink (Visa)** | PSD2 AIS/PIS | Enterprise, «difícil bajar de cuatro cifras al mes» | — | Sí | No | dev.to 16 ago 2026 (misma fuente; autor con interés en open-banking.io) |
| **Salt Edge** | PSD2 + scraping | Precio a medida, mercado medio | — | Sí | Algunos **[sin verificar hoy]** | misma fuente |
| **Plaid (UE)** | Bancos UE (≈2.000). «Investments» **no aparece** en la doc europea; único mercado listado: GB | ≈0,30–1 $/cuenta/mes con **mínimos de 500–2.000 $/mes** | — | Vía UE | Finary lo usa para Revolut/N26/Wise como **bancos**; para brókers, nada | [plaid.com/docs/institutions/europe](https://plaid.com/docs/institutions/europe/), dev.to 16 ago 2026 |
| **SnapTrade** | API unificada de brókers (lectura y trading) | **Launch 100 $/mes + 1 $/usuario/mes (datos diarios) o 2 $ (tiempo real)**; usuarios OAuth a 0 $ (introductorio); sandbox gratis | Ninguna (son ellos quienes conectan) | No | **DEGIRO sí (solo lectura, con credenciales)**; eToro sí; IBKR aparece en su catálogo **[sin verificar hoy]**; Trade Republic, MyInvestor, Revolut: no encontrados | [brokerage-api](https://snaptrade.com/brokerage-api), [degiro](https://snaptrade.com/brokerage-integrations/degiro-api) (4 nov 2026) |
| **Flanks** (Barcelona) | Agregación de carteras de inversión (custodios, bancos privados, brókers); es la capa de datos de **getquin** y de Finary (banca privada) | **Sin precio público**; Serie A de 7,4 M€; orientado a empresas | Credenciales del usuario en interfaz de Flanks; método (API/scraping) no declarado; actualización ~1 vez/día | Sí: CaixaBank, Bankinter, Unicaja, **MyInvestor**… | **MyInvestor, DEGIRO, IBKR, XTB, Trading212, Trade Republic (mencionado)**; 50+ custodios en Europa | [Flanks × getquin (29 oct 2026)](https://www.flanks.io/articles/multi-custodian-aggregation-across-europe-the-case-of-getquin), [Finary help (23 jun 2025)](https://help.finary.com/en/articles/11641205-how-does-synchronization-via-flanks-work) |
| **Wealth Reader** (Madrid) | API de posiciones de inversión con **ISIN y códigos DGS de planes de pensiones**, 250+ entidades, autorización del Banco de España, ISO 27001 | Sin precio público; «talk to an expert» | Van bajo su autorización | Sí (clientes: Fintonic, Singular Bank, Cobas, ABANCA) | No listan entidades en la web | [wealthreader.com](https://wealthreader.com/), [blog 27 jul 2026](https://blog.wealthreader.com/2026/07/27/api-para-reporting-de-carteras-de-inversion-como-extraer-codigos-isin-en-2026/) |
| **Powens** (Francia) | Agregador de Finary para bancos franceses y Trade Republic | Enterprise | — | — | **Trade Republic inestable desde oct-2025 hasta al menos jun-2026** (rate limits, SMS 2FA sin sitio donde meterlo) | [hilo Finary](https://community.finary.com/t/trade-republic-synchronisation-de-comptes-defaillantes/33483?page=34), [Finary 3 jun 2026](https://community.finary.com/t/strategie-dependance-a-powens-agregateurs-et-reliabilite-des-synchros/37162) |
| **Wealthica** | Agregador canadiense | — | — | No | No aplica a Europa | — |
| **open-banking.io** | PSD2 AIS solo lectura | 3 €/mes la primera cuenta, 1 €/mes cada cuenta extra; ellos tienen el eIDAS | Ninguna | Cobertura no publicada | No | dev.to 16 ago 2026 (es el producto del autor) |

**Respuesta a la pregunta clave**: hoy **no hay forma barata y legal de leer la cartera de MyInvestor, Trade Republic, Revolut, IBKR o DEGIRO sin que el usuario haga algo**. PSD2 no cubre valores. Lo que existe:
- **IBKR**: la única oficial. El usuario activa el **Flex Web Service** en Client Portal, genera un token y Toisón descarga el CSV/XML automáticamente cada día ([guía IBKR](https://www.ibkrguides.com/clientportal/performanceandstatements/flex-web-service.htm), 4 nov 2026). Coste 0.
- **DEGIRO / eToro**: SnapTrade, 100 $/mes + 1 $/usuario; o libs no oficiales ([degiro-connector](https://github.com/Chavithra/degiro-connector), BSD-3, con TOTP) que violan TOS.
- **Trade Republic**: solo scraping ([pytr](https://github.com/pytr-org/pytr), MIT, usa la API privada con 2FA y token AWS WAF) o agregadores grandes que están sufriendo (Finary/Powens llevan meses rotos).
- **MyInvestor**: solo Flanks o Wealth Reader (sin precio público, enterprise).
- **Revolut**: por PSD2 ves la cuenta, no las acciones.

**Recomendación**: para la 1.0, **importación por archivo + IBKR Flex automático**; no meter agregadores de pago. Pedir precio a Wealth Reader y Flanks solo para saber el orden de magnitud de cara a un plan «Pro» futuro (si cobran >1 €/usuario/mes no cabe en 2,99 €). La conexión Enable Banking se queda en modo fundador hasta tener contrato y saber si Toisón puede operar como agente bajo su licencia. Coste del bloque ahora: 0 €.

---

## 4. Importación por archivo: qué exporta cada bróker y quién lo parsea ya

Evidencia principal: repo de **Portfolio Performance** (EPL-1.0, Java), clonado hoy, último commit 3 nov 2026. Tiene **141 extractores PDF** en `name.abuchen.portfolio/src/name/abuchen/portfolio/datatransfer/pdf/` y módulos aparte `traderepublic/` (CSV), `xtb/` (CSV), `ibflex/` (XML) y `csv/` (importador genérico configurable). [Repo](https://github.com/portfolio-performance/portfolio), [CONTRIBUTING](https://github.com/portfolio-performance/portfolio/blob/master/CONTRIBUTING.md).

| Bróker | Qué exporta en 2026 | Parser abierto disponible | Notas |
|---|---|---|---|
| **Trade Republic** | **CSV de transacciones** (confirmado por el fixture de PP `TransactionExport01.csv`): columnas `datetime;date;account_type;category;type;asset_class;name;symbol(=ISIN);shares;price;amount;fee;tax;currency;original_amount;original_currency;fx_rate;description;transaction_id;value_date;…`. Además PDF por operación y informe fiscal anual PDF | PP `TradeRepublicCSVExtractor` + `TradeRepublicPDFExtractor` (5.299 líneas: cubre compras, ventas, dividendos, intereses, ajustes); getquin tiene artículo «Trade Republic CSV Import»; pytr exporta CSV para PP | Es el formato más fácil: una sola tabla con ISIN |
| **MyInvestor** | Excel/PDF de posiciones y movimientos desde la web **[sin verificar hoy]** | **Ninguno** en PP (no hay extractor MyInvestor) | Hay que hacerlo propio; la IA de Toisón ya lee Excel/PDF |
| **Interactive Brokers** | **Flex Query** en CSV o XML (activity statement), descargable a mano o por token (Flex Web Service) | PP `IBFlexStatementExtractor` (XML) con 4 fixtures | El único con automatización oficial |
| **DEGIRO** | CSV `Transactions.csv` y `Account.csv` desde la web (conocido; no pude abrir la ayuda de DEGIRO hoy) + PDF | PP `DegiroPDFExtractor` (3.117 líneas); degiro-connector exporta CSV/XLS/PDF | — |
| **Revolut** | Extractos PDF y CSV de la cuenta de acciones **[sin verificar hoy, la ayuda de Revolut no cargó]** | PP `RevolutLtdPDFExtractor` | — |
| **Scalable Capital** | CSV de transacciones y PDF | PP `ScalableCapitalPDFExtractor` + config CSV «Scalable Capital» en `csv-config.json` | — |
| **XTB** | CSV/XLSX «Cash Operations» (cabecera `Account number / Cash Operations / Date from (UTC)…`, columnas `Type;Instrument;Ticker;Category;Time;Amount;ID;Comment;Product;Position ID`) | PP `XTBCSVExtractor` con fixture `EUR_account_sample.csv` | La divisa va en el nombre del archivo |
| **eToro** | Extracto de cuenta en Excel/PDF **[sin verificar hoy]** | No en PP | — |
| **Bitvavo** | CSV de historial de transacciones **[sin verificar hoy]** | No en PP | Toisón ya lee Bitvavo por API con clave |
| **Portfolio Performance** | CSV (transacciones, posiciones, precios) y XML propio (`.xml` del cliente) | Formato documentado por el propio proyecto | Importarlo abre la puerta a los usuarios alemanes/suizos |
| **getquin / Parqet** | getquin: importa CSV/«File import» y Open Banking, no encontré export; Parqet: ayuda bloqueada a robots **[sin verificar hoy]** | — | — |
| **Otros ya en PP** | Trading212, N26, Saxo, Comdirect, Consorsbank, ING-DiBa, Keytrade, Openbank (103 líneas), Santander Consumer, Tradegate, UBS… | Sí | Útil como referencia de formatos |

Otros proyectos abiertos: **Ghostfolio** (AGPL-3, importa actividades por JSON/CSV, precios de Yahoo y CoinGecko, [repo](https://github.com/ghostfolio/ghostfolio)); **pytr** (MIT, [repo](https://github.com/pytr-org/pytr)); **degiro-connector** (BSD-3). Ojo con las licencias: PP es EPL-1.0 (se pueden portar las expresiones regulares reescribiéndolas; copiar código obliga a publicar cambios de ese módulo), Ghostfolio es AGPL (no copiar código a una app cerrada).

**Recomendación**: importadores oficiales en este orden: **Trade Republic CSV** (más fácil, muchos usuarios jóvenes), **IBKR Flex** (CSV/XML + automático por token), **DEGIRO CSV**, **MyInvestor Excel** (hay que pedir muestras a amigos; es el bróker español más usado del público objetivo), **XTB CSV**, **Revolut CSV**, **Scalable CSV**, **Bitvavo CSV**, **Portfolio Performance CSV**. Los PDF se dejan a la IA (ya funciona) porque parsear 141 formatos como PP es inviable para una persona. Coste: 0 €.

---

## 5. Cuentas con Google y Apple (web + WebView Android + iOS)

| Tema | Hecho | Fuente (fecha) |
|---|---|---|
| Google OAuth en WebView | **Google bloquea OAuth en WebViews embebidos desde el 20 abr 2017** («we will no longer allow OAuth requests to Google in embedded browsers known as web-views»); error típico `disallowed_useragent`. Alternativas: navegador del sistema, Chrome Custom Tabs, o nativo | [Google Developers Blog](https://developers.googleblog.com/en/modernizing-oauth-interactions-in-native-apps-for-better-usability-and-security/) |
| Lo correcto en Android | **Credential Manager + Sign in with Google** (Android 4.4+): la app nativa pide `GetGoogleIdOption` con el **client ID de tipo Web** («Your server's client ID, not your Android client ID»), recibe un ID token y lo pasa a Firebase `signInWithCredential`. El Google Sign-In antiguo está en «Legacy APIs» con guía de migración | [Firebase Android Google sign-in](https://firebase.google.com/docs/auth/android/google-signin), [Credential Manager](https://developer.android.com/identity/sign-in/credential-manager-siwg) (4 nov 2026) |
| Qué implica para Toisón | El WebView necesita un puente JS→Kotlin: la web llama a `Android.signInGoogle()`, Kotlin hace Credential Manager y devuelve el ID token a la web, que llama a `signInWithCredential(GoogleAuthProvider.credential(idToken))`. ~100 líneas de Kotlin + SHA-1 en Firebase | deducido de las dos fuentes anteriores |
| Web (Safari, Firefox, Chrome 115+) | `signInWithRedirect` falla si el `authDomain` no es el dominio propio (bloqueo de almacenamiento de terceros). Opciones: usar dominio propio como authDomain (Firebase Hosting), `signInWithPopup`, proxy inverso de `/__/auth/`, autoalojar el helper | [redirect best practices](https://firebase.google.com/docs/auth/web/redirect-best-practices) (4 nov 2026) |
| Sign in with Apple | **App Store 4.8**: si la app usa un login social (Google) para la cuenta principal, debe ofrecer otro login que limite datos a nombre y correo, permita ocultar el correo y no rastree para publicidad. En la práctica = Sign in with Apple, aunque la guía ya no lo nombra. **Excepción: si solo usas tu propio sistema de cuentas** (correo y contraseña), no hace falta. Requiere Apple Developer Program | [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (4 nov 2026) |
| Apple Developer Program | **99 US$/año** «o en moneda local» (en España se cobra en euros; no pude leer la cifra en euros hoy, ≈ 99 €). Incluye App Store Connect, TestFlight, Xcode Cloud 25 h/mes | [whats-included](https://developer.apple.com/programs/whats-included/) (4 nov 2026) |
| Firebase Spark vs Blaze (precios leídos hoy) | **Auth**: 50.000 MAU gratis en ambos; teléfono solo en Blaze. **Firestore**: 1 GiB, 50.000 lecturas/día, 20.000 escrituras/día, 20.000 borrados/día, 10 GiB egreso/mes gratis en ambos. **Functions: solo Blaze**; gratis 2 M invocaciones/mes, 400.000 GB-s, 200.000 CPU-s, 5 GB salida/mes; luego 0,40 $/M y 0,12 $/GB. **Hosting**: 10 GB almacenamiento y 360 MB/día (~10 GB/mes) gratis; Blaze 0,15 $/GB extra. **FCM**: gratis. **Storage**: 5 GB gratis (buckets nuevos solo en regiones US). No hay anuncio de retirada de Spark; cambio notable: Remote Config cobra por encima de 100.000 fetch/día desde 1 sep 2026 | [firebase.google.com/pricing](https://firebase.google.com/pricing) (4 nov 2026) |

**Recomendación**: pasar a **Blaze con presupuesto y alerta a 5 €** (es gratis hasta los mismos límites y desbloquea Functions). En Android, Google con Credential Manager vía puente nativo; en web, `signInWithPopup` o dominio propio como `authDomain`. **Apple ID: solo cuando haya app iOS**, y como la app ya tiene correo+contraseña propio, se puede cumplir 4.8 incluso sin Sign in with Apple si Google se oculta en iOS; más sencillo es añadir Apple (Firebase lo soporta) cuando se pague el programa. Coste: 0 €/mes ahora; 99 US$/año cuando toque iOS.

---

## 6. iOS sin Mac ni iPhone

| Vía | Qué hay en 2026 | Coste | Fuente (fecha) |
|---|---|---|---|
| **PWA en Safari** | iOS/iPadOS 26: **toda web añadida a la pantalla de inicio se abre como web app**, sin manifest obligatorio ni requisitos de instalabilidad (el usuario puede desmarcar «Open as Web App»). Web Push y badge desde 16.4 (feb 2023) solo para apps en pantalla de inicio, con gesto del usuario; **no hace falta cuenta de desarrollador**; hay que permitir `*.push.apple.com`. Almacenamiento: ITP borra el storage de scripts tras **7 días sin interacción, pero las apps de pantalla de inicio llevan su propio contador que se reinicia al usarlas** (WebKit dice que borrar datos ahí sería «a serious bug»). **No hay widgets** ni acceso a Face ID nativo | 0 € | [WebKit Safari 26 (15 sep 2025)](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/), [Web Push iOS 16.4](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [ITP 7 días (2020)](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/) |
| **Capacitor + CI macOS** | Capacitor exige **Xcode 26+** e iOS 15+; Xcode solo existe en macOS, así que hace falta un runner Mac. **GitHub Actions: runners estándar (incluido macOS) gratis en repos públicos**; en privados, macOS 3–4 núcleos a **0,062 $/min** (el saldo incluido de GitHub Free son 12 $/mes ≈ 190 min de macOS). **Codemagic: 500 min/mes gratis en Mac mini M2**, luego 0,095 $/min. Firma y subida sin Mac: certificados y perfiles se generan por API (fastlane match / App Store Connect API con clave `.p8`); el `.ipa` se compila en el runner y se sube a TestFlight desde el CI | 0 € (repo público o Codemagic) + 99 US$/año Apple | [Capacitor iOS](https://capacitorjs.com/docs/ios), [GitHub Actions billing](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions), [Codemagic pricing](https://codemagic.io/pricing/), [ASC API](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api) (4 nov 2026) |
| **PWABuilder iOS** | El repo `pwabuilder-ios` fue **archivado el 11 sep 2025** (solo lectura, «community-driven»); genera un proyecto Xcode con WKWebView que igualmente hay que compilar en Mac | — | [pwabuilder-ios](https://github.com/pwa-builder/pwabuilder-ios) (4 nov 2026) |
| **Bitrise / otros** | Precio no revisado hoy **[sin verificar]** | — | — |
| **TestFlight sin Mac** | Posible: el CI sube el build con la App Store Connect API; los testers (los amigos con iPhone) instalan TestFlight. Carlos no podrá probar en un dispositivo propio | 99 US$/año | ASC API (arriba) |
| **Políticas de App Store** | **4.2**: «features, content, and UI that elevate it beyond a repackaged website»; 4.2.2 prohíbe apps que sean «web clippings, content aggregators, or a collection of links». **3.2.1(viii)**: apps de «financial trading, investing, or money management should be submitted by the financial institution performing such services». **5.1.1(ix)**: apps en campos regulados (banca y servicios financieros…) «o que requieran información sensible» deben enviarlas **una entidad legal, no un desarrollador individual** | — | [Guidelines](https://developer.apple.com/app-store/review/guidelines/) (4 nov 2026) |

**Qué camino es realista**: 
1. **Ahora (0 €)**: PWA bien hecha para iOS 26 — manifest, service worker, `setAppBadge`, Web Push (punto 7). Cubre a los amigos con iPhone sin cuenta Apple ni Mac. Perderán widget y Face ID, nada más.
2. **Después de Google Play**: Capacitor en un repo **público** (o Codemagic gratis) que compile y suba a TestFlight. Antes de pagar los 99 $: **resolver 5.1.1(ix)** — una app que guarda carteras es «información sensible» y la guía pide entidad legal; conviene darse de alta como autónomo/SL antes (coincide con lo que hace falta para cobrar) y revisar 3.2.1(viii) con el abogado (Toisón no ejecuta operaciones, pero «money management» es ambiguo; otras apps de seguimiento están en la App Store, así que es defendible).
3. **Nunca**: envolver la web tal cual (PWABuilder archivado y riesgo 4.2). Capacitor con plugins nativos (widget, biometría, notificaciones) sí pasa.

---

## 7. Notificaciones push desde servidor (web y Android)

| Opción | Qué da | Coste y límites | Fuente (fecha) |
|---|---|---|---|
| **FCM (Firebase Cloud Messaging)** | Push a Android nativo y a web (Chrome, Firefox, Edge; también Safari/iOS 16.4+ en apps de pantalla de inicio vía Web Push estándar, aunque la doc de FCM no lo nombra). Requiere HTTPS, `firebase-messaging-sw.js` en la raíz y clave VAPID del proyecto. Envío desde servidor con la HTTP v1 API (cuenta de servicio) | **Gratis en Spark y Blaze** («no-cost»). Hay página aparte de cuotas; el envío necesita un servidor con credenciales (Worker, GitHub Actions o Function) | [FCM web client](https://firebase.google.com/docs/cloud-messaging/js/client), [pricing](https://firebase.google.com/pricing) (4 nov 2026) |
| **Web Push VAPID directo** (sin FCM) | Librería `web-push` desde un Worker/Function/GitHub Actions envía a los endpoints de Google/Apple/Mozilla. Funciona en Android Chrome y en iOS pantalla de inicio | 0 €. Los bloqueos de LaLiga afectan a las peticiones que **entran** al Worker desde España, no a las que **salen** hacia `push.apple.com`/`fcm.googleapis.com`, así que el envío programado seguiría funcionando aunque la API del Worker esté caída | WebKit 16.4 (arriba) + razonamiento |
| **Avisos locales** (lo que hay) | Solo cuando la app está abierta/en segundo plano Android | 0 € | — |

Qué hace falta para avisos «de verdad»:
1. **Tokens**: guardar la suscripción push (endpoint + claves) de cada dispositivo en Firestore (cifrada o no: no es dato financiero), con el UID.
2. **Disparador**: el workflow de GitHub Actions que ya actualiza precios compara, tras cada actualización, los umbrales que cada usuario haya guardado **en claro** (precio objetivo por ISIN, fecha ex-dividendo, versión nueva). Problema: la cartera está cifrada con la contraseña del usuario, así que el servidor **no puede saber** qué posiciones tiene. Solución: el cliente sube una lista mínima no cifrada de «alertas» (ISIN + umbral) que el usuario acepta compartir; o la comprobación se hace en el dispositivo (Android: WorkManager cada hora leyendo el JSON de precios; iOS PWA: imposible en segundo plano).
3. **Envío**: Function (Blaze, gratis a este volumen) o un paso del workflow con `web-push` + FCM HTTP v1. Volumen esperado <10.000 envíos/mes = 0 €.
4. **Versión nueva**: trivial, un push a todos al publicar.

**Recomendación**: Web Push estándar (VAPID) para web/PWA/iOS + FCM para la app Android, enviados desde una **Firebase Function programada** (no desde el Worker) con las alertas en claro que el usuario elija. Coste: 0 €/mes.

---

## 8. Hosting alternativo a GitHub Pages para los datos (y servidor para la IA)

Contexto de los bloqueos: LaLiga, con orden judicial, hace que los operadores españoles bloqueen **IPs compartidas de Cloudflare durante los partidos** («proportional, targeted, and time-limited, being enforced only during matches» según LaLiga); Cloudflare lo ha denunciado ante el Gobierno de EE. UU. como «overbroad court orders» que afectan a decenas de miles de webs legítimas; en junio-oct 2025 el Congreso rechazó (6 a favor, 17 en contra) limitar los bloqueos a dominios/DNS; en feb-may 2026 los tribunales han ido contra VPN (Proton, Nord) y LaLiga sigue con la campaña (sep 2026). No he encontrado hoy informes de bloqueo de IPs de Google, Amazon o Fastly (GitHub Pages); de Vercel hubo quejas en 2025 **[sin verificar hoy]**. Fuentes: [TorrentFreak 25 oct 2025](https://torrentfreak.com/proposal-to-prevent-laliga-site-blocking-hurting-innocent-sites-rejected-in-spain-251025/), [TorrentFreak 3 dic 2025](https://torrentfreak.com/ddos-guard-laligas-piracy-blocks-test-whether-anyone-will-protect-the-internet-251203/), [tag LaLiga](https://torrentfreak.com/tag/laliga/).

| Hosting | Red / IPs | Gratis | Precio al pasar | Uso comercial | Fuente (fecha) |
|---|---|---|---|---|---|
| **GitHub Pages** (actual) | Fastly | 100 GB/mes «soft», 1 GB de sitio, 10 builds/h | — | **«not intended for or allowed to be used as a free web-hosting service to run your online business»**; prohíbe SaaS comercial y manejar contraseñas/pagos en el sitio | [limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) (4 nov 2026) |
| **Firebase Hosting** | CDN de Google (IPs de Google, no reportadas bloqueadas) | 10 GB almacenamiento, **360 MB/día ≈ 10 GB/mes**, dominio propio y SSL | 0,15 $/GB (≈0,14 €) | Sí | [pricing](https://firebase.google.com/pricing) |
| **Cloud Storage (bucket público)** | Google | 5 GB; 100 GB/mes de descarga gratis en buckets nuevos **solo en regiones de EE. UU.** | — | Sí | misma fuente |
| **Bunny CDN** | Red propia (Eslovenia), no es Cloudflare | Prueba 14 días | **0,01 $/GB** Europa, **mínimo 1 $/mes**; storage aparte | Sí | [bunny.net/pricing](https://bunny.net/pricing/) (4 nov 2026) |
| **Netlify** | Propia + AWS | 300 créditos/mes (ancho de banda a 20 créditos/GB → ~15 GB; deploy 15 créditos); se pausa al agotar | Personal 9–15 $/mes, Pro 20–25 $ | No lo aclaran en la página | [pricing](https://www.netlify.com/pricing/) (4 nov 2026) |
| **Vercel Hobby** | Propia + AWS | 100 GB transferencia, 1 M invocaciones | Pro 20 $/usuario/mes | **No: «non-commercial, personal use only»** | [docs Hobby (14 sep 2026)](https://vercel.com/docs/plans/hobby) |
| **Fastly** | — | **[sin verificar hoy]** | — | — | — |
| **Cloudflare Pages/R2** | Cloudflare | Generoso | — | — | Descartado por los bloqueos |

Consumo de Toisón: ~1.000 KB al abrir + JSON de precios; con 500 usuarios activos y 5 aperturas/día ≈ 75 GB/mes. Firebase Hosting gratis se queda corto; Bunny serían ≈ 0,75 $/mes (mínimo 1 $); GitHub Pages aguanta pero su política no permite negocio.

**Firebase Functions como servidor de la IA en vez del Worker**: sí sirve. Functions 2.ª gen corre en Cloud Run (IPs de Google), región `europe-west1`, gratis hasta 2 M invocaciones, 400.000 GB-s y 5 GB de salida al mes (una llamada a Anthropic mueve pocos KB; 100.000 preguntas/mes caben); exige Blaze (tarjeta) y tiene arranque en frío de 1–3 s salvo que se pague `minInstances` (~5–8 $/mes por instancia). Los topes por usuario y la clave de Anthropic pasan igual a variables de entorno/Secret Manager. Alternativa sin Google: Deno Deploy o AWS Lambda **[precios sin verificar hoy]**.

**Recomendación**: 
1. **Web y datos a Firebase Hosting con dominio propio** (toison.app o similar, ~10–15 €/año): resuelve a la vez la política anti-negocio de GitHub Pages, el `authDomain` propio para el login con Google (punto 5), y sale de la red de Cloudflare. GitHub Actions sigue generando los JSON y hace `firebase deploy --only hosting` (o escribe en un bucket). Si el tráfico pasa de 10 GB/mes, Bunny delante de los JSON a 0,01 $/GB.
2. **IA: mover el Worker a una Firebase Function (europe-west1)** con el mismo código (es JS); dejar el Worker como respaldo si Google diera problemas. Coste 0–1 €/mes.
3. Presupuesto del bloque: dominio ≈ 1 €/mes + Firebase ≈ 0–3 €/mes + Bunny ≈ 1 $/mes.

---

## Coste mensual propuesto (todo junto)

| Partida | Ahora (modo fundador) | Al cobrar (1.0) |
|---|---|---|
| Precios acciones/ETF/fondos | EODHD Historian 19,99 $ ≈ 18 € | EODHD B2B (a pedir; estimar 80–150 €) o Twelve Data Venture 149 $ (−20 % startup) ≈ 107–135 € |
| Cripto, divisas, dividendos | 0 € | 0 € |
| Agregación | 0 € | 0 € (solo IBKR Flex + archivos) |
| Auth, Firestore, Functions, FCM | 0 € (Blaze con alerta) | 0–5 € |
| Hosting + dominio | ≈ 2 € | ≈ 3–5 € |
| iOS | 0 € (PWA) | 99 US$/año ≈ 8 €/mes |
| IA (ya medido) | según uso | según uso |
| **Total sin IA** | **≈ 20 €/mes** | **≈ 120–160 €/mes** → con 2,99 €/mes hacen falta 40–55 suscriptores para cubrir solo datos y plataforma |

---

## Los 5 hallazgos que más cambian el plan

1. **No existe licencia de datos por debajo de 50 €/mes**; la más barata con «display» a usuarios es Twelve Data Venture (149 $/mes) y EODHD solo a presupuesto. Toisón de pago necesita 40–55 suscriptores solo para pagar los datos: hay que pedir ya el presupuesto B2B a EODHD y meterlo en el precio.
2. **EODHD cubre ~70.000 fondos europeos por ISIN, incluidos los españoles (Bestinfond, Caixabank…), a 19,99 $/mes**: resuelve el mayor hueco de datos de Toisón hoy mismo para el modo fundador.
3. **Agregar brókers sin archivo es inviable en 2026 para una app de 2,99 €**: PSD2 no cubre valores; Flanks/Wealth Reader son enterprise sin precio; SnapTrade cuesta 100 $/mes + 1 $/usuario y no tiene TR ni MyInvestor; Finary lleva meses con Trade Republic roto. Lo único oficial y gratis es **IBKR Flex Web Service**. La 1.0 va de importadores: Trade Republic CSV (formato confirmado con ISIN), IBKR Flex, DEGIRO, MyInvestor Excel, XTB.
4. **GitHub Pages prohíbe alojar un negocio** y Vercel Hobby es solo personal; Firebase Hosting con dominio propio (≈1–3 €/mes) arregla eso, el `authDomain` del login con Google y la salida de Cloudflare; una Firebase Function (gratis a este volumen) puede sustituir al Worker para la IA.
5. **iOS**: en iOS 26 cualquier web se instala como app y tiene Web Push, así que la PWA cubre a los amigos con iPhone a 0 €. Para la App Store, además de Capacitor + runner macOS gratis (repo público o Codemagic 500 min) y 99 US$/año, la guía **5.1.1(ix) pide que apps con datos financieros sensibles las publique una entidad legal, no un particular**: darse de alta como autónomo/SL antes de iOS, no después. Y Google OAuth no funciona dentro del WebView: hace falta Credential Manager nativo (puente JS).
