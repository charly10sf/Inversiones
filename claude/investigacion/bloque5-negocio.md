# Bloque 5 — Negocio (Toisón, 4 nov 2026)

Qué hay aquí: precios de la competencia, cifras de conversión y retención de apps de suscripción, Stripe frente a Google Play, cómo han crecido apps parecidas sin dinero, lo legal de cobrar en España empezando como particular, costes fijos de 2026 y un modelo de ingresos a 100/500/2.000/5.000 usuarios.

Aviso de método: el presupuesto de búsquedas web compartido entre agentes se agotó a mitad del bloque 4. Todo lo que hay a partir de ahí sale de abrir páginas oficiales directamente (AEAT, Hacienda, Google Play, Stripe, Firebase, Cloudflare, Apple, Dondominio, Indexa, Finect, Bogleheads.es). Lo que no pude comprobar está marcado como **no verificado**. No he inventado cifras. Las conversiones $→€ son aproximadas (1 $ ≈ 0,86 €) y están marcadas con «≈».

---

## 1. Precios de la competencia

Precios mirados el 4 nov 2026 en las páginas de precios oficiales salvo que se indique otra cosa. «IAP» = compras dentro de la app en la App Store de España (precios en euros con IVA).

| App | País / moneda | Gratis (límites) | Pro: mensual | Pro: anual | Descuento anual | Prueba | Plan de por vida |
|---|---|---|---|---|---|---|---|
| **getquin** | DE / € | Conexiones ilimitadas, datos en tiempo real, patrimonio, análisis básico | No hay opción mensual en la web (en IAP aparecen 6,99 € y 4,89 € sin mapa claro) | Premium **89,99 €**; Wealth **149,99 €** (IA, planificación, jubilación) | n/a (solo anual) | 7 días, una vez; **convierte automáticamente en anual** si no cancelas 24 h antes | No |
| **Parqet** | DE / € | 1 cartera, 1 lista, 2 integraciones, 1 widget, análisis básico | Plus **11,99 €**; Investor **29,99 €** | Plus «3 meses gratis» ≈ **107,91 €** (≈ 8,99 €/mes); Investor «1 mes gratis» ≈ 329,89 € | 25 % (Plus), 8 % (Investor) | 14 días | No |
| **Finary** | FR / € | 2 cuentas conectadas, 2 metas; sin presupuesto, sin dividendos, sin informe mensual | Plus **24,99 €** (IAP; web lo muestra por semana: 2,88 €/sem) | Lite **54,99 €**; Plus **149,99 €**; Pro **349,99 €** | ≈ 50 % en Plus (149,99 frente a 299,88) | 14 días (Lite 3 días) | No. Black Friday 2025: Plus a 99,99 €/año |
| **Snowball Analytics** | FR / **solo USD** | 1 cartera, 10 posiciones, 1 lista | Starter **7,99 $** (≈ 6,9 €); Investor 14,99 $; Expert 24,99 $ | Starter **79,99 $** (≈ 69 €); Investor 149,99 $; Expert 249,99 $ | ≈ 17 % | 14 días, sin tarjeta | No |
| **Sharesight** | NZ-AU / USD | 1 cartera, 10 posiciones | Starter **9,33 $**; Standard 24 $; Premium 31 $ | Starter **7 $/mes** (84 $/año ≈ 72 €); Standard 18 $/mes; Premium 23,25 $/mes | «≈ 25 %» (FAQ oficial) | No se indica | No |
| **Delta (eToro)** | NL / USD, IAP € | **Desde ene 2026: 10 activos y 1 cartera** (antes ilimitado) | PRO **6,99 €**; PRO+ 13,99 € (IAP ES) | PRO **61,99 €**; PRO+ 107,99 € (IAP ES). Blog: 4,49 $/mes anual, 6,99 $/mes mensual | ≈ 36 % | No se indica | No |
| **Kubera** | US / USD | No hay gratis | No hay mensual | **249 $/año** (≈ 214 €); Black 2.499 $/año | n/a | 14 días | No |
| **Copilot Money** | US / USD | No hay gratis | **9 $** | **109 $** (≈ 94 €) «en vez de 119 $» | ≈ 0 % real (109 frente a 108) | 1 mes | No |
| **Monarch** | US / USD | No hay gratis | **14,99 $** | **99,99 $** (≈ 86 €) | 44 % | «Tu primera semana la pagamos nosotros»; código WELCOME −30 % el primer año | No |
| **YNAB** | US / USD | No hay gratis | **14,99 $** | **109 $** (≈ 94 €) | 39 % | **34 días**, sin tarjeta | No (10 % de descuento «de por vida» a antiguos de YNAB 4) |
| **Fintonic** | ES / € | Todo gratis | — | — | — | — | — (gana cobrando a bancos/aseguradoras por los préstamos y seguros que contrata el usuario; 4,3★ con 26.000 valoraciones en la App Store ES) |
| Capitally | PL / € | Sin gratis | precios ocultos en la web | Sailor/Navigator/Captain, con opción de **5 años** | — | 14 días, sin tarjeta | No, pero sí pago por 5 años |
| AllInvestView | US / USD | — | — | — | — | — | **497 $ de por vida** (plan Advanced). Se vende como «el único tracker grande con opción de por vida» |

Lo que se ve:
- **Nadie serio vende «de por vida»** entre los trackers de inversión; la única excepción es un tracker pequeño (AllInvestView, 497 $). Delta lo tuvo («Early Backer») y lo dejó. Parqet y Finary solo descuentan en Black Friday. Capitally vende 5 años por adelantado, que es lo más parecido a un lifetime sin regalar el futuro.
- **El suelo del mercado europeo es ~55–90 €/año** (Finary Lite 54,99; Delta PRO 61,99; getquin 89,99; Parqet Plus ≈ 108). Toisón a 24,99 €/año queda a **menos de la mitad** del más barato. Eso es un argumento de venta, pero también significa que cada pagador vale la mitad y hacen falta el doble para los mismos ingresos.
- **El mensual típico en Europa es 7–12 €** (Delta 6,99; Parqet 11,99; Finary 24,99). A 2,99 €/mes Toisón sería la más barata con diferencia. Conviene pensar si subir el mensual a 3,99–4,99 € (sigue siendo la más barata) y dejar el anual en 24,99 € para empujar al anual.
- **Descuento anual típico: 25–50 %** (Parqet 25, Sharesight 25, Delta 36, YNAB 39, Monarch 44, Finary 50). Toisón: 24,99 frente a 35,88 = **30 %**, en la zona normal.
- **Prueba gratis: 7–14 días lo normal** (getquin 7, Finary/Parqet/Snowball/Kubera 14), con dos excepciones largas (YNAB 34 días, Copilot 1 mes). getquin y Finary convierten la prueba en **anual** automáticamente: eso sube la caja pero genera quejas en reseñas.
- **El gratis de los europeos se está cerrando**: Delta pasó de ilimitado a 10 activos en enero 2026; Snowball y Sharesight limitan a 10 posiciones; Parqet a 1 cartera y 2 integraciones. getquin es el más generoso en gratis (lo compensa con 15 M$ de inversores). Para Toisón, el modelo «todo gratis y Pro solo para IA y Hacienda» encaja con lo que hace getquin, no con Delta.
- Fintonic demuestra que en España la vía «gratis y comisión de productos financieros» existe, pero exige volumen y acuerdos con bancos; no es para una persona sola.

Fuentes (vistas 4 nov 2026): [getquin pricing](https://www.getquin.com/pricing) · [getquin trial](https://help.getquin.com/en/articles/7983928-free-trial-for-getquin-premium) · [getquin App Store ES](https://apps.apple.com/es/app/getquin-portfolio-tracker/id1513629447) · [Parqet pricing](https://www.parqet.com/pricing) · [Finary pricing](https://finary.com/en/pricing) · [Finary App Store ES](https://apps.apple.com/es/app/finary-investment-tracker/id1569413444) · [Finary precios 2026 (parrainduweb, act. 14 ago 2026)](https://parrainduweb.fr/blog/abonnement-finary) · [Snowball pricing](https://snowball-analytics.com/pricing) (sin cifras; cifras de [euinvestinghub, 11 oct 2026](https://www.euinvestinghub.com/articles/snowball-analytics-review/)) · [Sharesight pricing](https://www.sharesight.com/pricing/) · [Delta PRO/PRO+ (blog oficial, 21 nov 2025)](https://delta.app/academy/post/introducing-delta-pro-pro-more-power-more-choice) · [Delta App Store ES](https://apps.apple.com/es/app/delta-by-etoro/id1288676542) · [Kubera (wallethacks, act. 9 jul 2026; la web de Kubera no cargó)](https://wallethacks.com/kubera-review/) · [Copilot pricing](https://copilot.money/pricing) · [Monarch pricing](https://www.monarch.com/pricing) · [YNAB pricing](https://www.ynab.com/pricing) · [Fintonic App Store ES](https://apps.apple.com/es/app/fintonic-ahorra-y-fin%C3%A1nciate/id672220319) · [Fintonic (Roams, 16 feb 2026)](https://roams.es/finanzas/entidades-financieras/fintonic) · [Capitally pricing](https://www.mycapitally.com/pricing) · [AllInvestView lifetime](https://www.allinvestview.com/lifetime-deal-portfolio-tracker/).

---

## 2. Conversión y retención típicas (apps de suscripción)

No existe una categoría «Finanzas» separada en los informes grandes: RevenueCat la mete dentro de «Utilities» (junto a tiempo, referencia, herramientas) y Adapty no la tiene. Las cifras son de todas las categorías salvo que se diga lo contrario.

| Métrica | Cifra | Fuente |
|---|---|---|
| **Descarga → pago (día 35), mediana global** | **2,0 %** (top 10 % > 9,1 %). Europa occidental 2,0 %; Norteamérica 2,6–2,8 % | RevenueCat SOSA 2026 (datos 2025; 115.000 apps, 16.000 M$) |
| Descarga → pago según acceso | **Freemium 2,1 %** (cuartil alto 4,5 %); muro de pago duro 10,7 % | RevenueCat 2026 |
| Descarga → pago según precio | Precio bajo 1,4 % (cuartil alto 3,7 %); medio 2,0 %; alto 2,8 % | RevenueCat 2026 |
| Descarga → pago, categoría Business (la más parecida con dato) | 2,6 % mediana; cuartil alto > 5 % | RevenueCat 2026 Business |
| Descarga → prueba (día 30) | Utilities 6,5 %; Business 9,1 %; Europa occidental 5,0 % | RevenueCat 2026 |
| Instalación → prueba / prueba → pago (Adapty) | 11,2 % / **27,8 %**; instalación → pago con paywall con prueba **1,78 %** | Adapty SOIS 2026 (16.000 apps, 3.000 M$, casi todo iOS) |
| Prueba → pago según duración | 4 días o menos **25,5 %**; 5–9 días 37,4 %; **17–32 días 42,5 %** (cuartil alto 59,4 %) | RevenueCat 2026 |
| Prueba → pago, Europa occidental | 29,7 % | RevenueCat 2026 |
| Cancelación de la prueba el día 0 | 3 días: 55,4 %; 7 días: 39,8 %; 14 días: 35,7 %; 30 días: 31,1 % | RevenueCat SOSA 2026 insights pt. 2 |
| **Retención a 1 año, anual** | 44,1 % (SOSA 2025, datos 2024; bajando desde 47,1 %). En otra medición de RC: 31 % → 28 % (2023→2024) | RevenueCat 2025 / insights 2026 |
| **Retención a 1 año, mensual** | **17,0 %** (SOSA 2025; antes 18,8 %); otra medición 10 % → 8 % | RevenueCat 2025 / insights 2026 |
| Retención a 1 año, semanal | 3,4 % | RevenueCat 2025 |
| Retención anual a día 380, Europa | 21,3 % | Adapty 2026 |
| Primera renovación anual | 61,7 % (2025); segunda 53,4 %; tercera > 77 % | RevenueCat 2025 |
| Primera renovación mensual (Adapty) | 59,2 % tras prueba; 2.ª 45,1 %; 3.ª 37,1 % | Adapty 2026 |
| **Churn mensual implícito (plan mensual)** | Churn en 1.ª renovación 15–40 %; después ~3–7 %/mes. Con 17 % a los 12 meses, el churn medio compuesto es ≈ **14 %/mes** | RevenueCat 2025 (cálculo propio del compuesto) |
| Cancelaciones del anual en el 1.er mes | ~30 % (2025); 35 % (2026, rango 23–50 % por categoría) | RevenueCat 2025 / 2026 |
| Anuales que cancelan y vuelven en un año | **5 %** (mensuales: 20 %, Europa occ. 21,7 %) | RevenueCat insights 2026 |
| Churn involuntario (fallo de cobro) | **Google Play 31 %** de las cancelaciones; App Store 14 % | RevenueCat 2026 |
| **Mezcla de planes vendidos** | Mensual ≈ 42 %, anual ≈ 34 % (anual bajó de 41,4 % a 33,6 %); semanal el resto | RevenueCat 2026 |
| Mezcla por ingresos (Adapty) | Semanal 55,6 %, anual 22,5 %, mensual 11,7 % (muy sesgado por iOS) | Adapty 2026 |
| **Precio medio** | Mensual **8–10 $** (mediana 8 $, moda 10 $); anual mediana **34,80 $** (moda 30 $); semanal 5,99 $. Europa: mensual mediano 15,25 $ frente a 10,95 $ en EE. UU. | RevenueCat 2026 / Adapty 2026 |
| Anual ≈ 3× mensual | «el anual mediano cuesta ~3× el mensual» | Adapty 2026 |
| Ingreso por instalación a 60 días | 0,34 $ mediana; App Store 0,38 $ frente a **Google Play 0,14 $** | RevenueCat 2026 / 2025 |
| LTV por pagador a 1 año | 23 $ mediana global; Business 35,48 $ | RevenueCat 2026 |
| Apps que llegan a 1.000 $/mes | **17,3 %** en dos años (mediana 58 días para las que llegan); a 10.000 $/mes solo 4,6 % | RevenueCat 2026 |
| iOS frente a Android | iOS ~85 % de los ingresos de suscripción; convierte ~3× mejor; Android ≈ 15 % | Adapty 2026 |
| Crecimiento MRR mediano | 5,3 %/mes | RevenueCat 2026 (vía SaaStr) |

Cómo leerlo para Toisón:
- **2 % es la mediana de freemium**, no un suelo. Con 60 % de anual (más de lo normal, que es ~34 %) habría que empujar el anual con precio y con la prueba.
- El anual retiene **el triple** que el mensual al año (44 % frente a 17 %). Cada mensual que no pasa a anual se pierde en ~6 meses de media.
- Una prueba de **14 días o más** convierte un 70 % mejor que una de 3 días (42,5 % frente a 25,5 %). getquin usa 7, Finary 14.
- En **Google Play, 1 de cada 3 bajas es por fallo de cobro**: hay que activar el periodo de gracia y la recuperación de cuenta en Play Console.
- Las cifras son de iOS mayoritariamente; en Android todo (conversión, ingreso por instalación) es **2–3 veces peor**. Toisón sale primero en Android y web: hay que contar con la mitad de la conversión de la tabla.

Fuentes: [RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps) · [SOSA 2026 — Utilities](https://www.revenuecat.com/state-of-subscription-apps-2026-utilities) · [SOSA 2026 — Business](https://www.revenuecat.com/state-of-subscription-apps-2026-business) · [SOSA 2026 insights part 2 (mayo 2026)](https://www.revenuecat.com/sosa-2026-insights-part-2) · [RevenueCat State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025) · [Resumen SaaStr](https://saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth) · [Resumen Arpu Brothers, 11 mar 2026](https://arpubrothers.com/blog/revenuecat-subscription-app-report-2026/) · [Adapty State of In-App Subscriptions 2026](https://adapty.io/state-of-in-app-subscriptions-report/) · [Adapty, resumen 12 mar 2026](https://adapty.io/blog/mobile-app-monetization-2026/).

---

## 3. Stripe frente a Google Play Billing (suscripción vendida en España)

### 3.1 Comisiones

| Concepto | Stripe (cuenta en España) | Google Play (EEE, desde 30 jun 2026) |
|---|---|---|
| Tarjeta estándar del EEE | **1,5 % + 0,25 €** | — |
| Tarjeta prémium del EEE / Reino Unido / internacional | 2,8 % + 0,25 € / 2,5 % + 0,25 € / 3,15 % + 0,25 € (+2 % si hay conversión de divisa) | — |
| Adeudo SEPA | 0,35 € | — |
| Stripe Billing (suscripciones, pago por uso) | **+0,7 %** del volumen | — |
| Stripe Tax (cálculo de IVA en Checkout/Billing) | **+0,5 %** por transacción (opcional) | Google calcula, cobra e ingresa el IVA de la UE él mismo |
| Disputa / contracargo | 20 € por disputa (reembolsable si se gana) | Lo gestiona Google |
| Transferencias a tu banco | Gratis (estándar) | Gratis |
| **Comisión por suscripción** | 0 | **10 % service fee + 5 % billing fee = 15 %** (igual que el 15 % que cobraba desde 2022). Se aplica sobre el precio sin IVA. Sin tope de 1 M$: el 10 % es para toda suscripción autorrenovable, a cualquier volumen |
| Compras únicas (no suscripción) | 0 | Primer 1 M$/año: 10 % + 5 %; por encima: 20 % + 5 % (instalaciones nuevas) o 25 % + 5 % (antiguas) |
| Facturación alternativa en la app (tu propio Stripe dentro de la app, EEE/UK/US) | tus comisiones Stripe | **10 %** (sin el 5 % de billing fee) + tus comisiones de pasarela |
| Enlace externo a tu web desde la app (programa de ofertas externas EEE) | tus comisiones Stripe | **10 %** en suscripciones si la compra ocurre en las 24 h siguientes a pulsar el enlace; 0 % de «initial acquisition fee» desde 4 jun 2026 |
| Alta de desarrollador | 0 | 25 $ una vez |
| Alternativa «merchant of record» (Paddle, Lemon Squeezy) | **5 % + 0,50 $** por transacción, ellos son el vendedor: calculan, cobran e ingresan el IVA de cada país, emiten las facturas al cliente, gestionan reembolsos y disputas. Tú les facturas a ellos (B2B). Paddle pide precio a medida para productos de menos de 10 $ | — |

Lo que le queda a Toisón de cada cobro (precio con IVA del 21 %, cliente en España):

| Canal | 2,99 €/mes | 24,99 €/año | Por pagador y mes (60 % anual) |
|---|---|---|---|
| Sin IVA (lo que hay que repartir) | 2,471 € | 20,653 € | — |
| **Google Play Billing (15 %)** | **2,10 €** | **17,55 €** | **1,72 €** |
| Stripe en web (1,5 % + 0,25 € + 0,7 % Billing + 0,5 % Tax) | **2,14 €** | **19,73 €** | **1,84 €** |
| Stripe desde la app con enlace externo o facturación alternativa (+10 % Google) | 1,89 € | 17,66 € | 1,64 € |
| Merchant of record 5 % + 0,46 € | 1,86 € | 18,94 € | 1,69 € |

Conclusión numérica: **a 2,99 € el 0,25 € fijo de Stripe pesa tanto como el 15 % de Google**; solo en el anual gana Stripe de forma clara (+2,18 € por cobro, un 12 %). El enlace externo desde la app no compensa a estos precios: pagas 10 % a Google más Stripe y acabas por debajo de Play Billing en el mensual.

### 3.2 Reglas de Google Play (política de pagos, 2025–2026)

- **Regla general**: si la app vende bienes o servicios digitales (suscripciones, funciones), tiene que usar el sistema de facturación de Google Play. Excepciones: bienes físicos, servicios regulados (**«stock trades, investment consulting, tax preparation»** están excluidos, pero Toisón no hace nada de eso: es software), contenido consumido solo fuera de la app, etc.
- **Apps «solo consumo»** (no venden nada dentro): pueden dejar que el usuario entre con una cuenta pagada en la web y pueden **mencionar** la compra sin enlace («Ve a nuestra web para pasar a Premium»), pero **no** enlazar ni poner lenguaje que empuje a pagar fuera. Se puede comunicar la oferta fuera de la app (correo). Esto es exactamente el caso «se compra en la web y la app solo la reconoce» → **permitido con 0 % de comisión de Google**, siempre que la app no tenga ningún flujo de compra dentro ni enlace a la página de pago.
- **Desde 30 jun 2026 (EEE, UK, EE. UU.)**: Google separó el «service fee» del «billing fee» y abrió a todos los desarrolladores que sirvan al EEE/UK la posibilidad de ofrecer, **al lado de Google Play Billing**, su propio sistema de pago dentro de la app o un enlace a su web, con pantalla de elección propia siguiendo las guías de Google. Service fee del 10 % en suscripciones en todos los casos; billing fee del 5 % solo si cobra Google.
- **Programa de ofertas externas (EEE)**: hay que **estar registrado como empresa** («The developer must be registered as a business»), integrar las APIs de ofertas externas (pantalla informativa), **reportar a Google cada transacción en 24 h**, dar soporte y reembolsos, y no mencionar la compra externa en la ficha de Play. Las apps inscritas usan solo facturación alternativa (no pueden mezclar con Play Billing ni con «user choice billing»). Los fees nuevos rigen desde 4 jun 2026: 0 % de adquisición, 10 % suscripciones, 20 % otros ítems (15 % en los programas Apps & Games), 1,20 € por instalación si enlazas a descargar apps.
- **Facturación alternativa con elección del usuario (user choice billing)** sigue existiendo en la UE; el fee que figura en la ayuda de Google es «service fee menos 4 %» solo para Corea e India; para el EEE la página no da cifra y la lectura de terceros (Adapty, PricePush) es que se cae el 5 % de billing fee y queda el 10 %.
- **IVA**: cuando cobra Google en la UE, **Google determina, cobra e ingresa el IVA**; «you don't need to calculate and send VAT separately». Un desarrollador en un país de la UE distinto de Irlanda no repercute IVA a Google. Si usas facturación alternativa, **el IVA es tu problema**.
- **Hacienda y el plan**: con Play Billing no emites facturas a consumidores (Google es quien vende al usuario); con Stripe en web sí, y tendrías que resolver IVA, facturas y Verifactu (sección 5).
- **Datos públicos**: en Play, una cuenta personal con compras muestra tu nombre y datos de contacto; el programa de ofertas externas exige cuenta de empresa.
- **Política de servicios financieros**: toda app con «funciones financieras» (gestión o inversión de dinero y criptos, incluidos consejos personalizados) tiene que rellenar la **Financial features declaration** en Play Console; Google puede pedir licencias o documentación si cree que ofreces productos financieros. Un tracker sin trading ni préstamos no necesita licencia, pero la declaración es obligatoria y conviene dejar claro en la ficha que no se asesora.

Recomendación práctica: **primer año, Google Play Billing en la app y Stripe en la web, sin enlaces de la app a la web** (modelo «solo consumo» en Android no es posible si la app vende con Play; se puede hacer al revés: la app vende con Play y la web vende con Stripe, y ambas reconocen la misma cuenta). El enlace externo con registro de empresa, API de reporte y soporte propio no compensa hasta tener volumen y una SL.

Fuentes: [Stripe precios España](https://stripe.com/es/pricing) · [Stripe Billing precios](https://stripe.com/es/billing/pricing) · [Stripe Tax precios](https://stripe.com/es/tax/pricing) · [Stripe SSA (uso solo profesional; admite «sole proprietor»)](https://stripe.com/es/legal/ssa) · [Google Play service fees (ayuda oficial)](https://support.google.com/googleplay/android-developer/answer/112622) · [Blog oficial Android Developers, 24 jun 2026: «Expanded billing choice and lower fees»](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html) · [Política de pagos de Google Play](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en) · [Programa de ofertas externas EEE](https://support.google.com/googleplay/android-developer/answer/14372887?hl=en) · [IVA en Google Play](https://support.google.com/googleplay/android-developer/answer/138000) · [Política de servicios financieros](https://support.google.com/googleplay/android-developer/answer/9876821) · [Alta de desarrollador, 25 $](https://support.google.com/googleplay/android-developer/answer/6112435) · [The Register, 20 ago 2025 (cambios UE)](https://www.theregister.com/2025/08/20/google_play_eu_changes/) · [Adapty, 25 jun 2026](https://adapty.io/blog/google-play-billing-changes-subscriptions-fees/) · [PricePush, act. 29 oct 2026](https://pricepush.app/blog/google-play-subscription-fees-2026-real-math) · [Paddle pricing](https://www.paddle.com/pricing) · [Lemon Squeezy pricing](https://www.lemonsqueezy.com/pricing).

---

## 4. Cómo crecen estas apps sin presupuesto

### 4.1 Casos concretos

| Caso | Qué hicieron | Cifras | Fuente |
|---|---|---|---|
| **Parqet** (DE, antes Tresor One) | Un solo fundador (Sumit Kumar, ingeniero en Stripe) construyendo de noche dos años; **sin anuncios de pago**; boca a boca; **compartir la cartera** como función para que la gente la enseñe en la comunidad alemana de inversores; **programa de afiliados** para que otros capten; un solo bróker, un idioma y una moneda al principio; directo semanal «Friday Fireside» para pedir feedback; «Parqet Wrapped» a fin de año; panel fiscal | Primeros pagadores a los 3 meses; 1.000 $ MRR a los 6; 10.000 $ MRR a los 10; ~100.000 registrados y > 17.000 € MRR en 2021; **~150.000 usuarios (feb 2023)** y objetivo de 1 M€ de ingresos en 2023; **~12.000 pagadores (feb 2024)** → **≈ 8 % de conversión**; ~108.000 $ MRR autodeclarados (ago 2024); 17 empleados; sin inversores | [startupfounderstories](https://startupfounderstories.com/stories/sumit-kumar-parqet-15k-mrr) · [FinanceFWD, 22 feb 2023](https://financefwd.com/de/parqet-sumit-kumar-ffwd/) · [Happy Bootstrapping, 22 feb 2024](https://happy-bootstrapping.de/podcast/von-der-one-man-show-zum-17-kopfigen-team-parqets-wachstumsstory-mit-sumit-kumar/) |
| **getquin** (DE) | Red social de inversores + tracker; levantó 15 M$ (2022) y 12 M€ más; Product Hunt en 2023 | Product Hunt: **166 votos, n.º 6 del día, 300 seguidores, 3,8★ (8 reseñas)**: poco efecto para una app de consumo europea | [Product Hunt getquin](https://www.producthunt.com/products/getquin) · [Tech Funding News](https://techfundingnews.com/social-network-for-investors-this-german-fintech-scoops-15m-to-let-people-discuss-stocks-cryptocurrencies-and-more/) |
| **Indexa Capital** (ES) | Transparencia radical (página pública de estadísticas), **plan amigo**: el que invita y el invitado se ahorran la comisión de gestión sobre **15.000 € durante un año**, invitaciones ilimitadas; contenido educativo y presencia en foros | **183.866 clientes y 6.452 M€** (2 nov 2026); +56 % activos en un año; ARR 15,9 M€ | [Indexa stats](https://www.indexacapital.com/es/esp/stats) · [Plan amigo](https://support.indexacapital.com/es/esp/info-invita-a-un-amigo) |
| **Finect** (ES) | Comunidad + comparadores + periodistas; lanzó Finect Plus (de pago) en 2026 | **500.000 visitantes/mes**, > 100.000 comparaciones/mes; 20 personas | [Finect, sobre nosotros](https://www.finect.com/sobre-finect) |
| **Bogleheads.es** (ES) | Foro de inversión indexada | **4.813 miembros, 22.329 mensajes, 1.607 temas** (3 nov 2026); 150 personas conectadas a la vez | [Foro Bogleheads.es](https://bogleheads.es/foro) |
| Finanzfluss (DE), Rankia (ES), Reddit r/SpainFIRE | No pude obtener cifras: YouTube no devuelve suscriptores sin JS, Rankia «sobre nosotros» dio error y Reddit está bloqueado para el agente. **No verificado** | — | — |

### 4.2 Canales en España con cifras (secundarias, 2026)

Cifras tal y como las publican dos artículos de 2026; **no comprobadas en YouTube** (el agente no puede leer el contador).

| Canal (YouTube) | Suscriptores | Tema | Fuente |
|---|---|---|---|
| El Arte de Invertir (Alejandro Estebaranz) | > 1 M | Value, bolsa | Rankia, act. 9 jun 2026 |
| Juan Ramón Rallo | ~900.000–1 M | Economía | Rankia / marketinsider |
| Finanzas para Todos | 861.000 | Finanzas personales | Rankia |
| Memorias de Tiburón | 816.000 | Bolsa | Rankia |
| El Club de Inversión | 520.000+ | Acciones y dividendos | marketinsider, act. may 2026 |
| Value School (Cobas) | 450.000+ | Largo plazo | marketinsider |
| Pablo Gil Trader | 404.000 | Trading/macro | Rankia |
| **Inversión Racional** | **380.000+** | **Fondos indexados** (el más afín a Toisón) | marketinsider |
| Rankia | 180.000–185.000 | Mercados | ambos |
| Camino Financiero | 179.000 | Finanzas personales | Rankia |
| El Psicólogo del Trading | ~173.000 | Trading | Rankia |
| Héctor Chamizo | 162.000+ | Bolsa | Rankia |
| **Dinero y Felicidad** | **120.000+** | **FIRE en España** (muy afín) | marketinsider |
| Bolsa General (David Galán) | 85.000+ | Bolsa | Rankia |
| Finect | ~7.000 (dato antiguo, 2021) | — | inversionpasiva.es |

No pude sacar cifras de TikTok/Instagram de finanzas en España ni de Carlos Galán, Opinatron (Marc Frau), Víctor Morales o Adrián Sáenz: **no verificado** (presupuesto de búsqueda agotado). Fuentes: [Rankia, 12 canales (act. 9 jun 2026)](https://www.rankia.com/blog/bolsa-desde-cero/6054335-12-mejores-canales-youtube-finanzas-bolsa-economia) · [marketinsider.es (act. may 2026)](https://marketinsider.es/mejores-canales-youtube-finanzas) · [inversionpasiva.es (2021)](https://inversionpasiva.es/canales-youtube-finanzas-inversion-ahorro).

### 4.3 SEO fiscal (abril–junio)

No tengo volúmenes de búsqueda verificados para «calculadora plusvalías», «casilla 588» o «modelo 721» (Google Trends bloquea al agente y no quedaron búsquedas). Lo que sí es seguro y sirve para planificar:
- La **campaña de la renta** va de **principios de abril al 30 de junio** cada año (la de la Renta 2026 se presentará en 2027, que es la ventana objetivo del lanzamiento 1.0 antes del 1 de abril).
- El **modelo 721** (criptos en el extranjero, > 50.000 €) y el **720** se presentan del **1 de enero al 31 de marzo**: hay un pico de búsquedas en marzo, antes de la renta.
- Toisón ya tiene la guía de la renta y el cálculo FIFO/traspasos: convertir cada apartado en una **página pública indexable** (sin login) con una calculadora embebida es el único canal que trabaja solo y no cuesta dinero. Cada guía debe acabar en «mira cuánto te saldría con tu cartera» → registro.
- Prioridad de páginas (sin volumen, por lógica del calendario): calculadora de plusvalías de acciones/ETF con FIFO y regla de los 2 meses; compensación de pérdidas; traspasos de fondos; cripto (casillas y 721); dividendos extranjeros y doble imposición; «cómo declarar Trade Republic / MyInvestor / Revolut / Bitvavo / IBKR» (una por bróker: esa es la búsqueda real del usuario).
- Pedir volúmenes reales: Google Keyword Planner (cuenta de Google Ads gratuita) o Ahrefs/Semrush gratis limitados. Queda pendiente.

### 4.4 Lo que se puede copiar ya (coste 0)

1. **Plan amigo** tipo Indexa pero con meses de Pro: quien invita y el invitado reciben 1–3 meses. Parqet lo hizo con afiliados; Indexa lo hace con las comisiones. Es lo que más se repite en los casos de éxito.
2. **Compartir la cartera** (porcentajes, sin importes) como imagen o enlace: la función que Parqet señala como su mejor canal.
3. **Una ficha pública por bróker** («cómo declarar Trade Republic en la renta 2026») y una calculadora pública de plusvalías: SEO en la ventana de abril–junio.
4. **Hilos en Bogleheads.es (4.800 miembros muy afines), Rankia y Finect** contando el producto honestamente y pidiendo feedback; Reddit r/SpainFIRE y r/eupersonalfinance con el mismo tono. Comunidades pequeñas, pero exactamente el público.
5. **Directo o vídeo corto mensual** con novedades (lo que Parqet hace los viernes): cuesta tiempo, no dinero.
6. **Prensa**: Xataka, El Confidencial y Expansión publican sobre fintech española cuando hay un ángulo (cifra, precio rompedor, «hecho por un técnico de 24 años con IA»). No pude comprobar casos concretos en esta sesión.
7. **Product Hunt**: por el caso getquin (166 votos, n.º 6 del día), poco retorno para una app europea de consumo. Hacerlo si no cuesta nada, sin esperar usuarios.

---

## 5. Lo legal de cobrar en España empezando como particular

Resumen de las normas con fuente primaria donde pude abrirla; **lo que no pude abrir está marcado**. Nada de esto sustituye al asesor que revisará los textos.

### 5.1 Hacienda: alta censal e IAE

- **Antes del primer cobro hay que presentar el modelo 036** (declaración censal de alta en el censo de empresarios, profesionales y retenedores). Es gratis y es independiente de hacerse autónomo en la Seguridad Social. La AEAT tiene un «servicio de ayuda a emprendedores que inician por primera vez una actividad» para el 036. [AEAT, modelo 036 (act. 9 oct 2026)](https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G322.shtml)
- **El modelo 037 (simplificado) ya no existe**: la Orden HAC/1526/2024 (BOE 9 ene 2025) reformó el 036 y suprimió el 037 desde febrero de 2025. La página de la AEAT cita la orden como la última vigente; **no pude abrir el BOE para confirmar la fecha exacta de supresión** (no verificado al detalle).
- **Epígrafe IAE**: en el 036 hay que marcar la actividad. Para vender suscripciones de una app propia, las gestorías suelen usar el **845 «Explotación electrónica por cuenta de terceros»** (sección 1.ª, empresarial) o, si se considera servicio profesional, el **763 «Programadores y analistas de informática»** (sección 2.ª). Las personas físicas están **exentas de pagar el IAE** (art. 82.1.c TRLHL), pero el epígrafe hay que declararlo igual. **Epígrafe: no verificado con fuente primaria en esta sesión**; que lo confirme el asesor.
- **IRPF**: los ingresos tributan como rendimientos de actividad económica (estimación directa simplificada) en la renta; pagos fraccionados trimestrales con el **modelo 130** (20 % del rendimiento neto acumulado) porque los clientes no retienen.

### 5.2 IVA

- Una suscripción a una app es un **servicio prestado por vía electrónica**. A consumidores españoles: **IVA del 21 %**, se declara en el **modelo 303** trimestral y el resumen anual 390.
- A consumidores de otros países de la UE: el IVA se debe en el país del cliente, **salvo que las ventas transfronterizas B2C de servicios electrónicos (y ventas a distancia) no superen 10.000 € (sin IVA) en el año en curso ni en el anterior**: por debajo se aplica el IVA español (y el 303 normal); «as soon as the threshold is exceeded, the general rule applies without exception». Se puede renunciar al umbral (vinculante 2 años). [Comisión Europea, OSS](https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en)
- Al superar los 10.000 € (o si se renuncia): alta en la **ventanilla única, Régimen de la Unión**, con el **formulario 035** y declaración **trimestral con el modelo 369** (Orden HAC/610/2021 y HAC/611/2021); desde el 1 jul 2021 cubre todos los servicios a consumidores finales de otros Estados miembros. [AEAT, IVA y comercio electrónico (act. 3 nov 2026)](https://sede.agenciatributaria.gob.es/Sede/iva/iva-comercio-electronico.html) · [AEAT, regímenes de ventanilla única](https://sede.agenciatributaria.gob.es/Sede/iva/iva-comercio-electronico/regimenes-especiales-ventanilla-unica.html)
- **Si cobra Google Play**: Google ingresa el IVA de la UE; tú no facturas al consumidor y Google no te cobra IVA español en su «compra» del servicio (operación con Google Commerce Ltd, Irlanda → declaración recapitulativa **modelo 349**). [Google, IVA](https://support.google.com/googleplay/android-developer/answer/138000)
- **Si cobras con Stripe**: eres tú el vendedor: IVA, factura y OSS son tuyos. Stripe Tax (0,5 %) calcula el tipo por país pero no presenta el 369 por ti (eso es «Tax Complete», desde 80 €/mes).
- **Si usas un merchant of record** (Paddle, Lemon Squeezy): ellos venden al consumidor, cobran e ingresan el IVA en toda la UE y emiten las facturas; tú les emites una factura B2B. Es la vía que quita el 303/369 B2C y el problema de las facturas a particulares, a cambio de 5 % + 0,50 $.

### 5.3 Facturación y Verifactu

- Obligación de facturar: cada venta B2C requiere **factura (completa o simplificada)**; el reglamento de los sistemas informáticos de facturación (RD 1007/2023 y RD 254/2025) se aplica a quien expide facturas «completas o simplificadas, tanto a otros empresarios como a consumidores finales». [AEAT, FAQ Verifactu (act. 21 oct 2026)](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes.html)
- **Fechas vigentes (RDL 15/2025, de 2 de diciembre)**: sociedades (IS) **antes del 1 de enero de 2027**; «el resto de obligados tributarios», que incluye a autónomos personas físicas, **antes del 1 de julio de 2027**. Hasta entonces es periodo de pruebas y se puede seguir facturando con cualquier sistema. [AEAT, nota informativa ampliación de plazo](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/nota-informativa-ampliacion-plazo-adaptacion-facturacion.html)
- **Novedad del 5 oct 2026**: el Ministerio de Hacienda comunicó la **previsión** de aplazar las obligaciones pendientes del RD 1007/2023 **hasta octubre de 2028**, para hacerlas coincidir con la factura electrónica obligatoria entre empresas (facturación hasta 8 M€). Es una previsión, no una norma aprobada todavía (la AEAT lo describe así en su web, act. 13 oct 2026). [Hacienda, nota 5 oct 2026 (PDF)](https://www.hacienda.gob.es/sgt/gabsehacienda/nota-informativa-verifactu.pdf) · [AEAT, SIF y VERI*FACTU](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html)
- **¿Afecta a un particular con pocos ingresos?** No hay umbral de volumen en la norma: si expides facturas, te afecta. Pero la AEAT ofrece una **aplicación de facturación gratuita** compatible con VERI*FACTU, y los recibos de Stripe no son facturas españolas. En la práctica: con **Google Play Billing** solo emites una factura al mes a Google (B2B) y el tema es trivial; con **Stripe B2C** necesitas que cada cobro genere una factura simplificada con un sistema compatible (Stripe Invoicing 0,4 % o un programa de facturación con Verifactu). Con un merchant of record, la factura al consumidor la emite él.

### 5.4 Seguridad Social: autónomo, habitualidad y tarifa plana

- **Criterio**: hay que darse de alta en el RETA si la actividad es **habitual, personal y directa** (art. 305 LGSS). La ley no fija umbral de ingresos.
- **Jurisprudencia del SMI**: el Tribunal Supremo (sentencia de 29 de octubre de 1997, reiterada después, p. ej. 20 de marzo de 2007) consideró que **ingresos por debajo del SMI son un indicio de no habitualidad**. La TGSS y la Inspección **no lo aplican como regla general**: lo valoran caso por caso y una actividad con cobros recurrentes todos los meses (una suscripción) tiene pinta de habitual aunque sean pocos euros. Riesgo: alta de oficio con cuotas atrasadas y recargo. **No pude abrir las sentencias ni un criterio escrito de la TGSS en esta sesión: no verificado con fuente primaria.**
- **SMI 2025: 1.184 €/mes × 14 = 16.576 €/año** (RD 87/2025). Para 2026 se aprobó una subida (≈ 1.221 €/mes) que **no he podido verificar** aquí.
- **Tarifa plana (cuota reducida, art. 38 ter Ley 20/2007 introducido por el RDL 13/2022)**: **80 €/mes durante los 12 primeros meses**, prorrogable **otros 12 meses si los rendimientos netos anuales están por debajo del SMI**; condición de no haber sido autónomo en los 2 años anteriores (3 si se disfrutó antes). El RDL 13/2022 dice literalmente en su preámbulo que entre 2023 y 2025 «será de 80 euros mensuales, siendo fijada a partir del año 2026 por la Ley de Presupuestos Generales del Estado». **Para 2026, con presupuestos prorrogados, el importe se ha mantenido en 80 € según la Seguridad Social; no pude abrir su página (requiere JavaScript) ni el artículo en el BOE: no verificado con fuente primaria.** Tras la tarifa plana, la cuota mínima del tramo 1 de la tabla reducida (rendimientos ≤ 670 €/mes) fue de 200 €/mes en 2025. [RDL 13/2022 (BOE)](https://www.boe.es/eli/es/rdl/2022/07/26/13/con) · [Ley 20/2007 consolidada](https://www.boe.es/buscar/act.php?id=BOE-A-2007-13409)
- **Pluriactividad** (dato del perfil: Carlos trabaja a jornada completa por cuenta ajena): el alta en RETA sería en pluriactividad. Puede elegir tarifa plana (80 €) **o** las reducciones de pluriactividad (base reducida), no ambas; y si en el año cotiza en total por encima de un tope, la TGSS devuelve el 50 % del exceso. Lo bueno: la cobertura sanitaria y la pensión ya las tiene por el empleo; lo malo: la cuota es un coste puro de 80 €/mes que a 1,72–1,84 € netos por pagador exige **44–47 pagadores solo para pagar la cuota**.
- **Alternativas**:
  - *No darse de alta en RETA mientras los ingresos sean esporádicos y muy por debajo del SMI* (sí 036, sí IVA, sí renta): es la opción con la que empiezan muchos; aguanta mientras no haya habitualidad clara. Con una suscripción mensual que cobra cada mes es difícil defender «esporádico». Decidir con el asesor y con un tope (p. ej., alta en RETA cuando el neto mensual pase de 80–100 € de forma estable, que es cuando la tarifa plana se paga sola).
  - *Sociedad limitada*: desde la Ley 18/2022 el capital mínimo es 1 €; notaría + registro ≈ 300–500 € (**no verificado**); pero el administrador que trabaja tiene que ser **autónomo societario** (sin la tarifa plana en las mismas condiciones, cuota mínima más alta), contabilidad mercantil, IS, cuentas anuales. Solo tiene sentido con ingresos de miles de euros o para el programa de ofertas externas de Google (exige cuenta de empresa).
  - *Cooperativa de facturación* (tipo Factoo, Smart Ibérica): facturas a través de la cooperativa y te dan de alta por horas. La Inspección de Trabajo las ha perseguido (Factoo fue descalificada en 2017) y para una suscripción B2C recurrente no encajan. **No verificado en esta sesión**; no recomendable.
  - *Merchant of record* (Paddle/Lemon Squeezy) no evita el RETA ni el 036: solo quita el IVA/facturación B2C.

---

## 6. Costes fijos reales (2026)

| Concepto | Coste | Equivalente mensual | Fuente |
|---|---|---|---|
| **Google Play Console** | **25 $ una vez** (≈ 23 €). Cuenta personal: +18 años, verificación de identidad (DNI y tarjeta a tu nombre), verificar un dispositivo Android con la app Play Console. **Prueba cerrada obligatoria sigue vigente**: **12 probadores inscritos 14 días seguidos** antes de poder pedir producción (cuentas personales creadas desde el 13 nov 2023); artículo de jul 2026 confirma que «still apply» | ~0 | [Google, alta](https://support.google.com/googleplay/android-developer/answer/6112435) · [Google, requisitos de prueba](https://support.google.com/googleplay/android-developer/answer/14151465) · [TesterBee, 5 jul 2026](https://testerbee.com/blog/google-play-developer-verification-2026) |
| **Apple Developer Program** | **99 $/año** «en moneda local donde esté disponible» (en España se cobra **99 €/año**, **no verificado** en la página). Nombre legal como vendedor; D-U-N-S solo para empresas. Hace falta un Mac o un servicio de build en la nube | ≈ 8,25 € | [Apple, enrollment](https://developer.apple.com/support/enrollment/) |
| **Dominio .es** | **6,95 €/año + IVA = 8,41 €** (registro y renovación, Dondominio) | 0,70 € | [Dondominio .es](https://www.dondominio.com/es/products/domains/es/) |
| **Dominio .app** | 11,95 € + IVA el primer año (promo), **renovación 16,95 € + IVA = 20,51 €** | 1,71 € | [Dondominio .app](https://www.dondominio.com/es/products/domains/app/) |
| **Firebase Blaze** (pagas solo por encima del gratis) | Gratis: Firestore 50.000 lecturas, 20.000 escrituras y 20.000 borrados **al día**, 1 GiB; Auth 50.000 MAU gratis, después **0,0055 $/MAU**; Functions 2 M invocaciones/mes gratis, después 0,40 $/millón; Hosting 10 GB y 360 MB/día de transferencia (después 0,15 $/GB). Precios Firestore Standard por encima del gratis: **0,03 $/100k lecturas, 0,09 $/100k escrituras, 0,01 $/100k borrados, ≈ 0,075 $/GiB-mes** (ubicación por defecto; Europa algo más caro). SMS de verificación en España 0,04 $ | **0–5 €** hasta varios miles de usuarios con la cartera cifrada en un documento | [Firebase pricing](https://firebase.google.com/pricing) · [Firestore pricing](https://cloud.google.com/firestore/pricing) · [Identity Platform pricing](https://cloud.google.com/identity-platform/pricing) |
| **Cloudflare Workers** | Gratis: 100.000 peticiones/día, 10 ms CPU. **Pago: 5 $/mes** con 10 M peticiones y 30 M ms de CPU; extra 0,30 $/M peticiones y 0,02 $/M ms CPU. KV gratis 100k lecturas/día; D1 gratis 5 M filas leídas/día | 0 hasta ~3.000 peticiones/hora de media; después ≈ 4,3 € | [Cloudflare Workers pricing (act. 2 oct 2026)](https://developers.cloudflare.com/workers/platform/pricing/) |
| **Stripe** | Sin fijos. Dominio propio para Checkout 10 $/mes (opcional) | 0 | [Stripe](https://stripe.com/es/pricing) |
| **API de Claude** (variable) | Del contexto: pregunta con Sonnet ≈ 0,10 $, con Haiku ≈ 0,005 $; revisión de cartera con Haiku 0,04–0,115 $ | **≈ 0,30–0,60 € por pagador y mes** si usa 3–5 preguntas Sonnet y 2 revisiones; es el coste variable que decide el margen (ver modelo) | contexto-toison.md |
| **Textos legales** | Generador (iubenda Advanced: privacidad + T&C + cookies, todos los idiomas) **19,99 €/mes anual** o Essentials 4,99 €/mes sin T&C. **Abogado/asesor fintech para revisar textos**: no pude buscar tarifas publicadas; orden de magnitud habitual en despachos pequeños **500–2.000 € + IVA por una revisión de T&C, privacidad y avisos CNMV** (**no verificado**) | 5–20 € (generador) + un pago único | [iubenda precios (act. 29 oct 2026)](https://www.iubenda.com/es/pricing) |
| **Gestor/asesor fiscal para autónomo** | Habitual **30–60 €/mes** (trimestrales 303/130, renta, 036) — **no verificado** en esta sesión | 30–60 € | — |
| **Autónomo (RETA)** | **80 €/mes** tarifa plana 12(+12) meses; después ≥ 200 €/mes | 80 € | sección 5.4 |
| **Seguro de responsabilidad civil profesional** | Para software/servicios digitales, pólizas desde ~150–300 €/año en Hiscox y similares (**no verificado**: la web no cargó). No es obligatorio para un tracker sin asesoramiento; conviene cuando haya miles de usuarios y antes de cualquier función que roce el asesoramiento | 12–25 € | — |

Totales orientativos:
- **Mínimo técnico** (Play 25 $ una vez + .es + Firebase/Cloudflare gratis + Stripe): **≈ 25 € el primer año**, luego ≈ 1 €/mes. Está dentro de los 100 € del plan.
- **Con .app, Workers de pago y generador de textos**: ≈ 25–30 €/mes.
- **Con autónomo + gestor**: +110–140 €/mes. Esta es la decisión que cambia el modelo.
- **Con iOS**: +8,25 €/mes y un Mac o build en la nube.

---

## 7. Modelo sencillo

Supuestos: precio con IVA 2,99 €/mes y 24,99 €/año; **60 % de los pagadores en anual**; IVA 21 % fuera; comisiones de la sección 3. «Neto» = tras IVA y comisiones, **antes** de IRPF, cuota de autónomo e IA. Dos canales: Google Play Billing (15 %) y Stripe en web (1,5 % + 0,25 € + 0,7 % + 0,5 %). No se cuenta churn: son «pagadores activos» en ese mes.

**Neto por pagador y mes**: Play **1,72 €** · Stripe web **1,84 €** · (bruto con IVA 2,45 €).

| Usuarios activos | Conversión | Pagadores | Neto/mes Play | Neto/mes Stripe | Play − 30 € fijos | Play − 60 € | Play − 100 € |
|---|---|---|---|---|---|---|---|
| 100 | 2 % | 2 | 3 € | 4 € | −27 € | −57 € | −97 € |
| 100 | 4 % | 4 | 7 € | 7 € | −23 € | −53 € | −93 € |
| 100 | 6 % | 6 | 10 € | 11 € | −20 € | −50 € | −90 € |
| 500 | 2 % | 10 | 17 € | 18 € | −13 € | −43 € | −83 € |
| 500 | 4 % | 20 | 34 € | 37 € | +4 € | −26 € | −66 € |
| 500 | 6 % | 30 | 52 € | 55 € | +22 € | −8 € | −48 € |
| 2.000 | 2 % | 40 | 69 € | 74 € | +39 € | +9 € | −31 € |
| 2.000 | 4 % | 80 | 137 € | 147 € | +107 € | +77 € | +37 € |
| 2.000 | 6 % | 120 | 206 € | 221 € | +176 € | +146 € | +106 € |
| 5.000 | 2 % | 100 | 172 € | 184 € | +142 € | +112 € | +72 € |
| 5.000 | 4 % | 200 | 344 € | 369 € | +314 € | +284 € | +244 € |
| 5.000 | 6 % | 300 | 515 € | 553 € | +485 € | +455 € | +415 € |

**Pagadores necesarios** (mezcla 60/40):

| Objetivo | Vía Play (1,72 €) | Vía Stripe web (1,84 €) |
|---|---|---|
| Cubrir 30 € fijos | **18** | 17 |
| Cubrir 60 € fijos | **35** | 33 |
| Cubrir 100 € fijos | **59** | 55 |
| 200 € netos al mes (fijos 0) | **117** | 109 |
| 200 € netos con 60 € fijos | 152 | 142 |
| 200 € netos con 100 € fijos | 175 | 163 |
| 200 € netos con 100 € fijos + 80 € de autónomo | **222** | 207 |

Qué significa con la conversión mediana (2 %): para 200 € netos hacen falta **~6.000–9.000 usuarios activos** (Android convierte peor que la mediana, que es casi toda iOS). Con 4–6 % (lo que consiguió Parqet, ~8 %, con una comunidad ya hecha) bastan **2.000–3.000**.

**La IA come el margen**: si cada pagador gasta 0,40 € al mes en Claude (3–4 preguntas Sonnet + 2 revisiones Haiku), el neto por pagador baja de 1,72 € a **1,32 €** (−23 %) y los 200 € pasan a necesitar **152 pagadores en vez de 117**. Si los usuarios gratis también usan IA sin tope, el modelo no cierra: **la IA tiene que ser Pro o tener un tope duro en gratis**, y en Pro conviene un cupo (p. ej., 20 preguntas Sonnet/mes ≈ 2 $ en el peor caso, más de lo que paga el usuario). Haiku para todo lo automático.

Sensibilidad al precio: con mensual a **3,99 €** y anual a **24,99 €** (60 % anual), el neto por pagador sube a ≈ 1,99 € (Play) y los 200 € bajan a **101 pagadores**. Con anual a **29,99 €** y mensual 2,99 €: ≈ 1,89 € → 106 pagadores. Subir el anual duele menos que subir el mensual a efectos de conversión y mantiene el mensaje «la más barata».

---

## 8. Lo que no he podido verificar (para una sesión con búsquedas)

- Volúmenes de búsqueda de «calculadora plusvalías», «casilla 588», «modelo 721» (Keyword Planner o Ahrefs).
- Seguidores 2026 en YouTube/TikTok/Instagram de Carlos Galán, Opinatron, Víctor Morales, Adrián Sáenz; cifras de Finanzfluss y Rankia; tamaño de r/SpainFIRE.
- Tarifas publicadas de abogados/asesores fintech y de seguro RC para apps.
- Tarifa plana 2026 y SMI 2026 en fuente primaria (Seguridad Social, BOE); texto literal del art. 38 ter; criterio escrito de la TGSS sobre habitualidad; fecha exacta de supresión del 037.
- Precio en euros del Apple Developer Program en España.
- Precio de Snowball y Kubera en sus webs (solo reseñas de 2026).
