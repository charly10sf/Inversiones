# Inversiones

Web para ver mi cartera (MyInvestor, Trade Republic y Bitvavo) con precios en directo, recomendaciones que se recalculan con cada precio y un asesor con IA (Gemini, gratis). Seis apartados y el asesor:

- **Cartera**: patrimonio, lo que más mueve el día, evolución hasta 8 años (con comparación con el S&P 500), posiciones con una señal para cada una, avisos, reparto y próximas fechas. Cada posición abre una ficha con gráfico, analistas, noticias y botones para comprar, vender, editarla o preguntarle al asesor.
- **Expertos**: qué vender y adónde mover el dinero (con lo que se lleva Hacienda), la señal de la web y la de la IA para cada posición (y si no coinciden), analistas en prensa, lo que viene, y las ideas de compra entre cientos de empresas de España, Europa y EEUU (unas 400 fijas más las que cada día recomiendan comprar los analistas en toda la bolsa), cada una contrastada con siete señales.
- **Mercados**: índices, petróleo, oro, euro/dólar, bono a 10 años y VIX, con noticias de mercado.
- **Análisis**: paso a paso qué hacer este mes, en 6 meses, en un año y de 1 a 5 años; el análisis de la IA (al día si el asesor está conectado), rentabilidad, riesgo, costes y dividendos, qué empresas hay dentro de los fondos, apuestas frente al índice e impuestos.
- **Futuro**: cuánto podrías tener a 5, 10, 15, 20, 25 y 30 años si sigues aportando, con 2.000 escenarios de mercado simulados.
- **Plan**: aportaciones periódicas, compras y ventas, efectivo y posiciones, todo editable desde la web.
- **Asesor** (botón de arriba a la derecha): Gemini con toda la cartera delante. Calcula ventas con FIFO e IRPF, compras con su tasa, proyecciones e históricos con el motor de la web, y busca en internet para contrastar.

**Web:** https://charly10sf.github.io/Inversiones/

## Cómo funciona

| Archivo | Qué es | ¿Público? |
|---|---|---|
| `instrumentos.json` | Lista de fondos, acciones y cripto que sigo (ISIN, ticker, gastos, región). Sin cantidades. | Sí |
| rama `datos` → `precios.json` | Precios, analistas, fundamentales, noticias y mercados. Lo genera la GitHub Action. | Sí |
| rama `datos` → `radar.json` | Empresas para buscar ideas: unas 400 fijas más hasta 550 que el buscador de Yahoo encuentra cada día en EEUU y Europa con recomendación de compra. Analistas y sus cambios, rango de objetivos, valoración, beneficio esperado, deuda y tendencia. | Sí |
| rama `datos` → `historico.json` | Cierres de 10 años de cada instrumento (diarios los 2 últimos, semanales antes) y de 1 año de cada mercado. | Sí |
| `cartera.enc.json` | Cantidades, costes, notas, aportaciones y datos fiscales, **cifrado** con AES-GCM. La clave sale de mi contraseña (PBKDF2-SHA256, 600.000 iteraciones). | Cifrado |
| `analisis.enc.json` | El último análisis que ha escrito la IA con mis cifras, cifrado igual. | Cifrado |
| `analisis-ia.json` | Un análisis sin cantidades y mis reglas de inversión. Se usa si no hay uno cifrado más reciente. | Sí |
| `index.html`, `sw.js`, `manifest.webmanifest` | La web (instalable en el móvil). | Sí |

- La contraseña no se guarda en ningún sitio. Si marco "Recordar en este dispositivo", el navegador guarda la clave derivada (no exportable) en IndexedDB.
- Precios en directo, sin recargar: la web abre dos WebSockets públicos.
  - Yahoo Finance para acciones, oro, divisas y las empresas del radar que se ven en pantalla. Madrid llega con 15 minutos de retraso y Londres con 20 (es lo que da Yahoo gratis); las divisas, al instante.
  - Bitvavo para Bitcoin, al instante.
- Con cada precio se recalculan las señales, los planes de venta y las mejores ideas. Si cambia una recomendación, la página se repinta sola y avisa.
- `scripts/precios.py` (Yahoo Finance con `yfinance`) corre cada 20 minutos de lunes a viernes y una vez al día el fin de semana; la web vuelve a leer `precios.json` sola cada 2 minutos. Analistas y noticias se renuevan como mucho cada 2 horas; las fichas del radar cada 3 horas y sus precios en cada ejecución.
- Los fondos más jóvenes se completan hacia atrás con un ETF del mismo índice (`proxy` en `instrumentos.json`).

## El asesor

Usa por defecto **Gemini 3.8 Flash**, el más potente de los modelos gratuitos de Google, con el razonamiento al máximo. Solo hace falta una clave gratuita de Google AI Studio (aistudio.google.com/apikey); sin tarjeta y sin activar la facturación. El plan gratuito tiene un tope de peticiones por minuto y por día: si se pasa, el asesor espera o avisa. Desde la UE, según las condiciones de Google, lo enviado con la clave gratuita no se usa para mejorar sus productos.

- En los ajustes se puede cambiar a Gemini 4 Argon (el más potente de Google, de pago) o a Claude (de pago, con clave de Anthropic).
- La clave se guarda cifrada con la clave de la cartera y las preguntas van directamente del navegador a Google.
- Lee una foto de la cartera al empezar cada conversación y tiene herramientas que calculan con la web: `simular_venta`, `simular_compra`, `buscar_empresa`, `proyectar` e `historico`. Si el plan lo permite, busca en internet; si no, contrasta con los titulares que baja la Action (de tus posiciones, del mercado y de las mejores ideas del radar).
- Con la clave puesta, revisa la cartera cada día, o cuando cambia una señal, y deja su análisis en Análisis, su veredicto en Expertos y sus pasos en Análisis → Paso a paso. Se puede pasar a semanal o a manual en los ajustes del asesor.
- Sin clave, el botón *Copiar mi cartera* copia los datos y la pregunta para pegarlos en un chat de Gemini.

## Guardar cambios desde la web

La web guarda en este repositorio con un *fine-grained personal access token*:

1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.
2. Repository access: **Only select repositories** → `Inversiones`.
3. Permissions → Repository permissions → **Contents: Read and write**.
4. Pegarlo en la web (Ajustes). Para el móvil: Ajustes → *Vincular el móvil* y escanear el QR.

Sin token la web descarga `cartera.enc.json` y hay que subirlo a mano.

## Añadir un instrumento

Desde la web (Editar → Instrumento → *Nuevo instrumento…*) o editando `instrumentos.json`. Con el ISIN basta: la Action busca el ticker de Yahoo. Al guardar se lanza la Action y en un par de minutos aparece el precio.

## Si los precios dejan de actualizarse

GitHub pausa las tareas programadas de un repositorio público tras 60 días sin actividad. Pestaña **Actions** → *Precios* → *Enable workflow* (o *Run workflow* para lanzarla a mano).
