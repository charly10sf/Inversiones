# Inversiones

Web para ver mi cartera (MyInvestor, Trade Republic y Bitvavo) con precios en directo. Seis apartados:

- **Cartera**: patrimonio, evolución hasta 8 años (con comparación con el S&P 500), posiciones con una señal para cada una, reparto, próximas fechas y avisos. Cada posición abre una ficha con gráfico, analistas, noticias y botones para comprar, vender o editarla.
- **Expertos**: consenso y precio objetivo de los analistas de tus acciones, titulares de prensa con opiniones de analistas e ideas de compra entre ~100 grandes empresas de España, Europa y EEUU.
- **Mercados**: índices, petróleo, oro, euro/dólar, bono a 10 años y VIX, con noticias de mercado.
- **Análisis**: rentabilidad (hasta 10 años y año a año), riesgo, costes y dividendos, qué empresas hay dentro de los fondos, apuestas frente al índice e impuestos.
- **Futuro**: cuánto podrías tener a 5, 10, 15, 20, 25 y 30 años si sigues aportando, con 2.000 escenarios de mercado simulados (si va mal, lo probable y si va bien), cuándo llegarías a 100.000 €, 250.000 €, 500.000 € y un millón, y los supuestos a la vista.
- **Plan**: aportaciones periódicas, compras y ventas, efectivo y posiciones, todo editable desde la web.

**Web:** https://charly10sf.github.io/Inversiones/

## Cómo funciona

| Archivo | Qué es | ¿Público? |
|---|---|---|
| `instrumentos.json` | Lista de fondos, acciones y cripto que sigo (ISIN, ticker, gastos, región). Sin cantidades. | Sí |
| rama `datos` → `precios.json` | Precios, analistas, fundamentales, noticias, mercados e ideas. Lo genera la GitHub Action. | Sí |
| rama `datos` → `historico.json` | Cierres de 10 años de cada instrumento (diarios los 2 últimos, semanales antes) y de 1 año de cada mercado. | Sí |
| `cartera.enc.json` | Cantidades, costes, notas y aportaciones, **cifrado** con AES-GCM. La clave sale de mi contraseña (PBKDF2-SHA256, 600.000 iteraciones). | Cifrado |
| `index.html`, `sw.js`, `manifest.webmanifest` | La web (instalable en el móvil). | Sí |

- La contraseña no se guarda en ningún sitio. Si marco "Recordar en este dispositivo", el navegador guarda la clave derivada (no exportable) en IndexedDB.
- Precios en directo, sin recargar: la web abre dos WebSockets públicos.
  - Yahoo Finance para acciones, oro y divisas. Madrid llega con 15 minutos de retraso y Londres con 20 (es lo que da Yahoo gratis); las divisas, al instante.
  - Bitvavo para Bitcoin, al instante.
- Los fondos tienen un único valor liquidativo al día. Ese valor, el histórico, los analistas y los sectores los descarga `scripts/precios.py` (Yahoo Finance con `yfinance`) cada 20 minutos de lunes a viernes y una vez al día el fin de semana; la web vuelve a leer `precios.json` sola cada 2 minutos. Analistas y noticias (Google Noticias) se renuevan como mucho cada 2 horas y la lista de ideas una vez al día.
- Los fondos más jóvenes se completan hacia atrás con un ETF del mismo índice (`proxy` en `instrumentos.json`).

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
