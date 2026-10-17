# Inversiones

Web para ver mi cartera (MyInvestor, Trade Republic y Bitvavo) con precios actualizados, repartos por tipo de activo, región, sector, plataforma y riesgo, opinión de analistas y avisos.

**Web:** https://charly10sf.github.io/Inversiones/

## Cómo funciona

| Archivo | Qué es | ¿Público? |
|---|---|---|
| `instrumentos.json` | Lista de fondos, acciones y cripto que sigo (ISIN, ticker, gastos, región). Sin cantidades. | Sí |
| rama `datos` → `precios.json` | Precios, histórico de un año, analistas y sectores. Lo genera la GitHub Action. | Sí |
| `cartera.enc.json` | Cantidades, costes, notas y aportaciones, **cifrado** con AES-GCM. La clave sale de mi contraseña (PBKDF2-SHA256, 600.000 iteraciones). | Cifrado |
| `index.html`, `sw.js`, `manifest.webmanifest` | La web (instalable en el móvil). | Sí |

- La contraseña no se guarda en ningún sitio. Si marco "Recordar en este dispositivo", el navegador guarda la clave derivada (no exportable) en IndexedDB.
- Precios en directo, sin recargar: la web abre dos WebSockets públicos.
  - Yahoo Finance para acciones, oro y divisas. Madrid llega con 15 minutos de retraso y Londres con 20 (es lo que da Yahoo gratis); las divisas, al instante.
  - Bitvavo para Bitcoin, al instante.
- Los fondos tienen un único valor liquidativo al día. Ese valor, el histórico de un año, los analistas y los sectores los descarga `scripts/precios.py` (Yahoo Finance con `yfinance`) cada 20 minutos de lunes a viernes y una vez al día el fin de semana; la web vuelve a leerlos sola cada 2 minutos.

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
