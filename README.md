# GrowFolio

Web para ver mi cartera (MyInvestor, Trade Republic y Bitvavo) con precios en directo, recomendaciones que se recalculan con cada precio y un asesor con IA (Gemini, gratis). Seis apartados y el asesor:

- **Cartera**: patrimonio, lo que más mueve el día, lo que toca hacer ahora (sacado del paso a paso), evolución hasta 8 años (con comparación con el S&P 500), posiciones con una señal para cada una, avisos, reparto y próximas fechas. Cada posición abre una ficha con gráfico, analistas, noticias y botones para comprar, vender, editarla o preguntarle al asesor.
- **Expertos**, en tres pestañas:
  - *Resumen*: lo último que ha leído Gemini en la prensa, qué vender y adónde mover el dinero (con lo que se lleva Hacienda), tus posiciones de un vistazo y lo que viene.
  - *Tus posiciones*: la señal de la web y la de la IA para cada una (y si no coinciden), lo que dice su prensa, los analistas y su precio objetivo.
  - *Ideas de compra*: las mejores ahora, juntando las tres mejor contrastadas por la web, las que elige Gemini tras leer la prensa de todo el radar y las de tu análisis (si coinciden, salen primero), y el radar entero: cientos de empresas de España, Europa y EEUU, cada una contrastada con siete señales.
- **Mercados**: índices, petróleo, oro, euro/dólar, bono a 10 años y VIX, con noticias de mercado.
- **Análisis**: paso a paso qué hacer este mes, en 6 meses, en un año y de 1 a 5 años (cada paso con su porqué, cómo hacerlo y lo que paga a Hacienda); el análisis de la IA, rentabilidad, riesgo, costes y dividendos, qué empresas hay dentro de los fondos, apuestas frente al índice y fiscalidad (la renta del año, lo que cuesta cada recomendación y lo que te queda de cada dividendo).
- **Futuro**: cuánto podrías tener a 5, 10, 15, 20, 25 y 30 años si sigues aportando, con 2.000 escenarios de mercado simulados.
- **Plan**: aportaciones periódicas, compras y ventas, efectivo y posiciones, todo editable desde la web.
- **Asesor** (botón de arriba a la derecha): Gemini con toda la cartera delante. Calcula ventas con FIFO e IRPF, compras con su tasa, proyecciones e históricos con el motor de la web, y busca en internet para contrastar.

**Web:** https://charly10sf.github.io/GrowFolio/

## Cómo funciona

| Archivo | Qué es | ¿Público? |
|---|---|---|
| `instrumentos.json` | Lista de fondos, acciones y cripto que sigo (ISIN, ticker, gastos, región). Sin cantidades. | Sí |
| rama `datos` → `precios.json` | Precios, analistas, fundamentales, noticias y mercados. Lo genera la GitHub Action. | Sí |
| rama `datos` → `radar.json` | Empresas para buscar ideas: unas 400 fijas más hasta 550 que el buscador de Yahoo encuentra cada día en EEUU y Europa con recomendación de compra. Analistas y sus cambios, rango de objetivos, valoración, beneficio esperado, deuda y tendencia. | Sí |
| rama `datos` → `historico.json` | Cierres de 10 años de cada instrumento (diarios los 2 últimos, semanales antes) y de 1 año de cada mercado. | Sí |
| Firestore `usuarios/{uid}` | La cartera de cada cuenta (cantidades, costes, notas, aportaciones y datos fiscales), **cifrada en el dispositivo** antes de subirla, con AES-GCM. Desde la 0.5, con una clave de datos al azar que se abre con la contraseña de la cartera (PBKDF2-SHA256, 600.000 iteraciones) o con su código de recuperación. | Cifrado; solo su cuenta |
| rama `datos` → `informe.json` | El informe de prensa de Gemini de tu cartera y del mercado, contrastado y con enlaces. Sin cantidades. | Sí |
| rama `datos` → `escaneo.json` | Lo que ha leído Gemini de la prensa de cada empresa del radar y las que ha elegido (o evitaría). | Sí |
| rama `datos` → `noticias-cache.json` | Las noticias recientes de cada empresa del radar (no la lee la web). | Sí |
| `index.html`, `sw.js`, `manifest.webmanifest` | La web (instalable en el móvil). | Sí |

- La contraseña no se guarda en ningún sitio. Si marco "Recordar en este dispositivo", el navegador guarda la clave derivada (no exportable) en IndexedDB.
- Precios en directo, sin recargar: la web abre dos WebSockets públicos.
  - Yahoo Finance para acciones, oro, divisas y las empresas del radar que se ven en pantalla. Madrid llega con 15 minutos de retraso y Londres con 20 (es lo que da Yahoo gratis); las divisas, al instante.
  - Bitvavo para Bitcoin, al instante.
- Con cada precio se recalculan las señales, los planes de venta y las mejores ideas. Si cambia una recomendación, la página se repinta sola y avisa.
- `scripts/precios.py` (Yahoo Finance con `yfinance`) corre cada 20 minutos de lunes a viernes y una vez al día el fin de semana; la web vuelve a leer `precios.json` sola cada 2 minutos. Analistas y noticias se renuevan como mucho cada 2 horas; las fichas del radar cada 3 horas y sus precios en cada ejecución.
- Los fondos más jóvenes se completan hacia atrás con un ETF del mismo índice (`proxy` en `instrumentos.json`).

## La IA: Gemini, gratis

Toda la IA de la web es **Gemini 3.8 Flash**, el más potente de los modelos gratuitos de Google, con el razonamiento al máximo. Funciona con una clave gratuita de Google AI Studio (aistudio.google.com/apikey), sin tarjeta. Desde la UE, según las condiciones de Google, lo enviado con la clave gratuita no se usa para mejorar sus productos.

Trabaja en dos sitios:

- **En la GitHub Action, aunque la web esté cerrada** (`scripts/informe.py`). Necesita el secreto `GEMINI_API_KEY` en el repositorio (Settings → Secrets and variables → Actions).
  - En cada pasada (cada 20 minutos entre semana, cada 4 horas el fin de semana) baja noticias de un lote de empresas del radar, las que más tiempo llevan sin mirar (Yahoo Finance con su resumen y Google Noticias en español), y Gemini lee la prensa de unas 70: qué ha pasado, si es bueno o malo, cuánto importa y si hay un catalizador. Así recorre las ~840 empresas varias veces al día (`escaneo.json` y `noticias-cache.json`, rama `datos`).
  - Cada 2 horas escribe el informe de tu cartera y del mercado (`informe.json`) y decide entre todas las empresas con buenos números y buena prensa cuáles merecen dinero nuevo y cuáles evitar, contrastando números y noticias.
  - Todo sin cantidades: la cartera cifrada no se toca.
- **En el navegador, con tus cifras**: el asesor (botón de arriba) y la revisión de la cartera, que se rehace cada día, cuando cambia una señal y cuando llega un informe de prensa nuevo. Usa herramientas que calculan con la web (`simular_venta`, `simular_compra`, `buscar_empresa`, `proyectar`, `historico`). La clave se guarda cifrada y las preguntas van directamente del navegador a Google.

Sin clave, el botón *Copiar mi cartera* copia los datos y la pregunta para pegarlos en un chat de Gemini.

## Guardar cambios desde la web

La web guarda en este repositorio con un *fine-grained personal access token*:

1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.
2. Repository access: **Only select repositories** → `GrowFolio`.
3. Permissions → Repository permissions → **Contents: Read and write**.
4. Pegarlo en la web (Ajustes). Para el móvil: Ajustes → *Vincular el móvil* y escanear el QR.

Sin token la web descarga `cartera.enc.json` y hay que subirlo a mano.

## Añadir un instrumento

Desde la web (Editar → Instrumento → *Nuevo instrumento…*) o editando `instrumentos.json`. Con el ISIN basta: la Action busca el ticker de Yahoo. Al guardar se lanza la Action y en un par de minutos aparece el precio.

## Base de datos común de fondos

`catalogo.json` lista fondos indexados, fondos españoles, monetarios, ETF, ETC de oro y cripto por ISIN (o símbolo de Yahoo), con sus tickers habituales (`VWCE`, `IWDA`…) para el buscador. La Action *Catálogo* (`scripts/catalogo.py`) les pone cada noche precio en euros e histórico de hasta 10 años y lo publica en la rama `catalogo`; la web solo baja el histórico de lo que tienes. Para añadir uno, una línea con su ISIN, nombre y tipo.

## Opiniones de los usuarios

El botón "¿Algo se ve mal o tienes una idea?" (al final de cada pestaña y en Ajustes) manda la opinión a un formulario de Google si `opinion.json` lo tiene puesto: la dirección `.../formResponse` y el `entry.NNN` de cada campo (tipo, sección, mensaje, nombre y detalles). Las respuestas acaban en la hoja de cálculo del formulario. Sin formulario, se manda por WhatsApp.

## Versiones

La web va por la `0.x` mientras esté en alfa: el número del medio sube con cada tanda de mejoras (0.9 → 0.10) y el último con los arreglos (0.9.0 → 0.9.1). Se cambia en `const VERSION` de `index.html`, y lo nuevo se apunta arriba de `NOVEDADES`, con un dibujo por cambio: la primera vez que alguien abre la web tras una versión nueva le sale *¿Qué se ha mejorado?*. La app de Android toma el mismo número al compilarse y, cuando hay una nueva, la web le ofrece descargarla e instalarla encima.

## Si los precios dejan de actualizarse

GitHub pausa las tareas programadas de un repositorio público tras 60 días sin actividad. Pestaña **Actions** → *Precios* → *Enable workflow* (o *Run workflow* para lanzarla a mano).


## Otra persona en la misma web, sin GitHub

Un amigo puede usar esta misma web con su propia cartera: que abra `https://charly10sf.github.io/GrowFolio/#mia` (o, en la pantalla de la contraseña, "Crea tu propia cartera en este dispositivo"). Elige su contraseña y su cartera se guarda cifrada solo en su navegador o en la app: no pasa por GitHub y el dueño de la web no la ve. Comparte con todos los precios, el radar, las noticias y las ideas; no ve el análisis ni las reglas del dueño, y el asesor funciona con su propia clave gratuita de Google.

- Salen con precio las acciones del radar (unas 800), todo lo de `instrumentos.json` y los fondos, ETF, oro y cripto de `catalogo.json` (unos 110, con su clase e ISIN exactos). Un fondo que no esté en ninguno se puede dar de alta, pero sin precio diario hasta que se añada su ISIN a `catalogo.json`: la Action *Catálogo* le busca precio e histórico esa misma noche, para todos.
- Para meter lo que ya tiene: Añadir posición, o Importar desde capturas (lee capturas o PDF del bróker con su clave de Gemini).
- La cartera vive en ese dispositivo: para tener copia o pasarla a otro móvil, Ajustes, Copias.

## Usarla con tus propios datos en tu propia web

Cada persona necesita su propia copia: los datos van cifrados con su contraseña en su repositorio, y la Action descarga los precios de lo que tiene cada uno.

1. Crea una cuenta en GitHub y haz un *fork* de este repositorio (deja marcado "Copy the main branch only").
2. (Desde la 0.5 el repositorio ya no lleva ninguna cartera: cada una va en su cuenta.)
3. *Settings → Pages*: publica desde la rama `main`, carpeta raíz.
4. Pestaña *Actions*: pulsa el botón para activar los workflows (en los forks vienen apagados).
5. Opcional, para que Gemini lea la prensa aunque no abras la web: crea tu clave gratis en aistudio.google.com/apikey y guárdala en *Settings → Secrets and variables → Actions* como `GEMINI_API_KEY`.
6. Crea un token en *Settings → Developer settings → Fine-grained tokens*, solo para tu repositorio, con permiso de lectura y escritura en *Contents*.
7. Abre `https://TU-USUARIO.github.io/GrowFolio/`, pulsa "Empezar de cero", elige tu contraseña, pega el token y añade tus posiciones. Lo que añadas entra en `instrumentos.json` y la Action empieza a descargar sus precios en unos minutos.
